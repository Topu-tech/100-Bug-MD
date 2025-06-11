const {
  default: makeWASocket,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} = require('@whiskeysockets/baileys');

const { Boom } = require('@hapi/boom');
const pino = require('pino');
const http = require('http');
const config = require('./config');
const fs = require('fs');
const path = require('path');

// Superusers
const SUPERUSERS = [
  config.OWNER_NUMBER,
  '1234567890@s.whatsapp.net',
  '9876543210@s.whatsapp.net'
];

// Optional auth folder path (only used outside Heroku)
const authFolder = path.join(__dirname, 'auth');

// Determine platform
const IS_HEROKU = process.env.HEROKU === 'true' || process.env.DYNO;

// Credentials (in-memory or from file)
let credsJson = null;

if (config.SESSION_ID) {
  try {
    const raw = config.SESSION_ID.replace(/^ALONE-MD;;;=>/, '');
    const decoded = Buffer.from(raw, 'base64').toString('utf-8');
    credsJson = JSON.parse(decoded);
    console.log('✅ SESSION_ID loaded in memory.');
  } catch (err) {
    console.error('❌ Invalid SESSION_ID:', err);
    process.exit(1);
  }
} else {
  console.log('📸 No SESSION_ID found — QR required.');
}

// Load plugins
const plugins = [];
const pluginsDir = path.join(__dirname, 'The100Md_plugins');

if (fs.existsSync(pluginsDir)) {
  const files = fs.readdirSync(pluginsDir).filter(f => f.endsWith('.js'));
  for (const file of files) {
    try {
      const plugin = require(path.join(pluginsDir, file));
      const pluginFn = typeof plugin === 'function' ? plugin : plugin.run;
      if (typeof pluginFn === 'function') {
        plugins.push({ run: pluginFn, name: file });
        console.log(`✅ Plugin loaded: ${file}`);
      } else {
        console.warn(`⚠️ Skipped invalid plugin: ${file}`);
      }
    } catch (err) {
      console.error(`❌ Error loading plugin ${file}:`, err);
    }
  }
} else {
  console.warn(`⚠️ Plugin folder not found: ${pluginsDir}`);
}

// Start bot
async function startBot() {
  const { version } = await fetchLatestBaileysVersion();

  let authConfig;

  if (credsJson) {
    // In-memory creds from SESSION_ID
    authConfig = {
      creds: credsJson.creds,
      keys: makeCacheableSignalKeyStore(credsJson.keys, pino({ level: 'silent' }))
    };
  } else {
    // Local/Render fallback auth using file storage
    const { state, saveCreds } = await require('@whiskeysockets/baileys').useMultiFileAuthState(authFolder);
    authConfig = {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
    };
    startBot.saveCreds = saveCreds;
  }

  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: !credsJson,
    auth: authConfig,
    browser: [config.BOT_NAME, 'Chrome', '1.0.0']
  });

  if (startBot.saveCreds) sock.ev.on('creds.update', startBot.saveCreds);

  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'close') {
      const reason = lastDisconnect?.error instanceof Boom ? lastDisconnect.error : new Boom(lastDisconnect?.error);
      const shouldReconnect = reason.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('🔌 Disconnected.', shouldReconnect ? 'Reconnecting...' : 'Logged out.');
      if (shouldReconnect) setTimeout(startBot, 3000);
    } else if (connection === 'open') {
      console.log(`🤖 Bot connected as ${config.BOT_NAME}`);
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg?.message || msg.key.fromMe) return;

    const from = msg.key.remoteJid;
    const body =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      msg.message.imageMessage?.caption ||
      msg.message.videoMessage?.caption ||
      msg.message.buttonsResponseMessage?.selectedButtonId ||
      '';

    const senderJid = msg.key.participant || msg.key.remoteJid;
    const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
    const isSuperuser = SUPERUSERS.includes(senderJid) || senderJid === botJid;

    // Auto status view
    if (config.AUTO_STATUS_VIEW && from === 'status@broadcast') {
      try {
        await sock.readMessages([msg.key]);
        console.log('👀 Viewed status from', msg.pushName || senderJid);
      } catch (err) {
        console.error('⚠️ Failed to view status:', err);
      }
      return;
    }

    // Auto reply
    if (config.AUTO_REPLY) {
      try {
        await sock.sendMessage(from, { text: config.AUTO_REPLY_MSG }, { quoted: msg });
        console.log('💬 Replied to', msg.pushName || from);
      } catch (err) {
        console.error('⚠️ Auto-reply failed:', err);
      }
    }

    // Command check
    if (!body.startsWith(config.PREFIX)) return;
    if (!config.PUBLIC_MODE && !isSuperuser) {
      console.log(`⛔ Ignored ${senderJid} (private mode)`);
      return;
    }

    const command = body.slice(config.PREFIX.length).trim().split(/\s+/)[0].toLowerCase();
    const args = body.slice(config.PREFIX.length + command.length).trim();

    for (const { run, name } of plugins) {
      try {
        await run({
          sock,
          msg,
          from,
          body,
          command,
          args,
          PREFIX: config.PREFIX,
          OWNER_NUMBER: config.OWNER_NUMBER
        });
        console.log(`📦 Plugin ran: ${name} -> ${command}`);
      } catch (err) {
        console.error(`⚠️ Plugin error (${name}):`, err);
      }
    }
  });
}

startBot();

// Dummy HTTP server
http
  .createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('🤖 WhatsApp bot running\n');
  })
  .listen(process.env.PORT || 3000, () => {
    console.log('🌐 HTTP server active (Render/Heroku uptime)');
  });
