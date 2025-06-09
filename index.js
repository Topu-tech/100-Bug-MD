const fs = require('fs');
const path = require('path');
const P = require('pino');
const { Boom } = require('@hapi/boom');
const {
  default: makeWASocket,
  useSingleFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');

// Import session/config
const conf = require('./conf');

// Validate and clean session
if (!conf || !conf.session || typeof conf.session !== 'string') {
  console.error('❌ Error: session is missing or invalid in conf.js');
  process.exit(1);
}
const session = conf.session.replace(/ALONE-MD;;;=>/g, '');
const prefix = conf.PREFIXE || '.';

// Ensure /auth directory exists
const authDir = path.join(__dirname, 'auth');
const authFile = path.join(authDir, 'creds.json');
if (!fs.existsSync(authDir)) fs.mkdirSync(authDir);

// Write decoded session to creds.json
try {
  fs.writeFileSync(authFile, Buffer.from(session, 'base64').toString('utf8'), 'utf8');
  console.log('✅ Session restored successfully.');
} catch (e) {
  console.error('❌ Failed to write session file:', e);
  process.exit(1);
}

// Baileys auth state
const { state, saveState } = useSingleFileAuthState(authFile);

// Plugins loading
const plugins = [];
const pluginsDir = path.join(__dirname, 'The100Md_plugins');
if (fs.existsSync(pluginsDir)) {
  fs.readdirSync(pluginsDir).forEach(file => {
    if (file.endsWith('.js')) {
      try {
        const plugin = require(path.join(pluginsDir, file));
        if (typeof plugin === 'function') plugins.push(plugin);
      } catch (e) {
        console.error(`Failed loading plugin ${file}`, e);
      }
    }
  });
} else {
  console.warn('⚠️ Plugins directory not found:', pluginsDir);
}

// Start bot
async function startBot() {
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger: P({ level: 'silent' }),
    printQRInTerminal: false,
    auth: state,
    browser: [conf.BOT_NAME, 'Chrome', '1.0.0']
  });

  sock.ev.on('creds.update', saveState);

  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'close') {
      const err = lastDisconnect?.error instanceof Boom ? lastDisconnect.error : new Boom(lastDisconnect?.error);
      const shouldReconnect = err.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('❌ Disconnected. Reconnecting...', shouldReconnect);
      if (shouldReconnect) startBot();
    } else if (connection === 'open') {
      console.log(`✅ Bot connected as ${conf.BOT_NAME}`);
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg?.message || msg.key.fromMe) return;

    const from = msg.key.remoteJid;

    if (conf.AUTO_STATUS_VIEW && from === 'status@broadcast') {
      try {
        await sock.readMessages([msg.key]);
        console.log('👀 Auto-viewed status from', msg.pushName || msg.key.participant || 'Unknown');
      } catch (e) {
        console.error('⚠️ Failed to auto-view status:', e);
      }
      return;
    }

    if (conf.AUTO_REPLY) {
      try {
        await sock.sendMessage(from, { text: conf.AUTO_REPLY_MSG }, { quoted: msg });
        console.log('💬 Auto-replied to', msg.pushName || from);
      } catch (err) {
        console.error('⚠️ Auto-reply failed:', err);
      }
    }

    const body = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
    if (!body.startsWith(prefix)) return;

    const command = body.slice(prefix.length).trim().split(/\s+/)[0].toLowerCase();
    const args = body.slice(prefix.length + command.length).trim();

    for (const plugin of plugins) {
      try {
        await plugin({ sock, msg, from, body, command, args, PREFIX: prefix, OWNER_NUMBER: conf.OWNER_NUMBER });
      } catch (err) {
        console.error('⚠️ Plugin error:', err);
      }
    }
  });
}

startBot();
