const {
  default: makeWASocket,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeInMemoryStore,
  useSingleFileAuthState
} = require('@whiskeysockets/baileys');

const { Boom } = require('@hapi/boom');
const fs = require('fs');
const path = require('path');
const pino = require('pino');
const config = require('./config');

// === Auth Path & Session Decoding ===
const authFile = path.join(__dirname, 'auth', 'creds.json');

if (!fs.existsSync(authFile) && config.SESSION_ID) {
  try {
    const base64 = config.SESSION_ID.replace(/^ALONE-MD;;;=>/, '');
    const decoded = Buffer.from(base64, 'base64').toString('utf8');
    fs.mkdirSync(path.dirname(authFile), { recursive: true });
    fs.writeFileSync(authFile, decoded, 'utf8');
    console.log("✅ Session loaded from SESSION_ID");
  } catch (err) {
    console.error("❌ Failed to decode SESSION_ID:", err);
  }
}

const { state, saveState } = useSingleFileAuthState(authFile);

// === Plugin Loader ===
const plugins = [];
const pluginsDir = path.join(__dirname, 'The100Md_plugins');
if (fs.existsSync(pluginsDir)) {
  fs.readdirSync(pluginsDir).forEach(file => {
    if (file.endsWith('.js')) {
      try {
        const plugin = require(path.join(pluginsDir, file));
        if (typeof plugin === 'function') plugins.push(plugin);
      } catch (e) {
        console.error(`⚠️ Failed to load plugin ${file}:`, e);
      }
    }
  });
}

// === Bot Start ===
async function startBot() {
  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: !config.SESSION_ID,
    auth: state,
    browser: [config.BOT_NAME, 'Chrome', '1.0.0']
  });

  sock.ev.on('creds.update', saveState);

  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'close') {
      const err = lastDisconnect?.error instanceof Boom ? lastDisconnect.error : new Boom(lastDisconnect?.error);
      const shouldReconnect = err.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('🔌 Disconnected. Reconnecting in 5s?', shouldReconnect);
      if (shouldReconnect) {
        setTimeout(() => startBot(), 5000);
      }
    } else if (connection === 'open') {
      console.log(`🤖 Bot connected as ${config.BOT_NAME}`);
    }
  });

  // === Message Handler ===
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg?.message || msg.key.fromMe) return;

    const from = msg.key.remoteJid;

    // ✅ Auto-read all messages
    if (config.AUTO_READ_MESSAGES !== false) {
      try {
        await sock.readMessages([msg.key]);
        console.log('📖 Auto-read message from', msg.pushName || from);
      } catch (err) {
        console.error('❌ Auto-read failed:', err);
      }
    }

    // ✅ Auto-view status
    if (config.AUTO_STATUS_VIEW && from === 'status@broadcast') {
      try {
        await sock.readMessages([msg.key]);
        console.log('👀 Auto-viewed status from', msg.pushName || msg.key.participant || 'Unknown');
      } catch (e) {
        console.error('⚠️ Failed to auto-view status:', e);
      }
      return;
    }

    // ✅ Auto-reply
    if (config.AUTO_REPLY) {
      try {
        await sock.sendMessage(from, { text: config.AUTO_REPLY_MSG }, { quoted: msg });
        console.log('💬 Auto-replied to', msg.pushName || from);
      } catch (err) {
        console.error('⚠️ Auto-reply failed:', err);
      }
    }

    // ✅ Handle Commands via Plugins
    const body = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
    if (!body.startsWith(config.PREFIX)) return;

    const command = body.slice(config.PREFIX.length).trim().split(/\s+/)[0].toLowerCase();
    const args = body.slice(config.PREFIX.length + command.length).trim();

    for (const plugin of plugins) {
      try {
        await plugin({
          sock,
          msg,
          from,
          body,
          command,
          args,
          PREFIX: config.PREFIX,
          OWNER_NUMBER: config.OWNER_NUMBER
        });
      } catch (err) {
        console.error('⚠️ Plugin error:', err);
      }
    }
  });
}

startBot();
