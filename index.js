const {
  default: makeWASocket,
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
  makeCacheableSignalKeyStore
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const fs = require('fs');
const path = require('path');
const pino = require('pino');
const http = require('http');
const config = require('./config');

// ✅ Superusers - owner + example numbers
const SUPERUSERS = [
  config.OWNER_NUMBER,
  '1234567890@s.whatsapp.net',
  '9876543210@s.whatsapp.net',
];

// Auth folder for session
const authFolder = path.join(__dirname, 'auth');

// Decode SESSION_ID if present
if (config.SESSION_ID) {
  try {
    const sessionData = config.SESSION_ID.replace(/^ALONE-MD;;;=>/, '');
    const decoded = Buffer.from(sessionData, 'base64').toString('utf-8');
    JSON.parse(decoded); // Validate JSON
    fs.mkdirSync(authFolder, { recursive: true });
    fs.writeFileSync(path.join(authFolder, 'creds.json'), decoded, 'utf-8');
    console.log('✅ Session decoded and saved.');
  } catch (err) {
    console.error('❌ SESSION_ID decode error:', err);
    process.exit(1);
  }
}

// Load plugins from folder
const plugins = [];
const pluginsDir = path.join(__dirname, 'The100Md_plugins');

if (fs.existsSync(pluginsDir)) {
  for (const file of fs.readdirSync(pluginsDir).filter(f => f.endsWith('.js'))) {
    try {
      const plugin = require(path.join(pluginsDir, file));
      if (typeof plugin === 'function') {
        plugins.push({ run: plugin, name: file });
      } else if (plugin?.run && typeof plugin.run === 'function') {
        plugins.push({ run: plugin.run, name: file });
      } else {
        console.warn(`⚠️ Invalid plugin format: ${file}`);
      }
      console.log(`✅ Loaded plugin: ${file}`);
    } catch (err) {
      console.error(`❌ Error loading plugin ${file}:`, err.message);
    }
  }
} else {
  console.warn(`⚠️ Plugins folder missing: ${pluginsDir}`);
}

// Start the bot
async function startBot() {
  console.log('🟡 Starting bot...');
  const { state, saveCreds } = await useMultiFileAuthState(authFolder);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: !config.SESSION_ID,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
    },
    browser: [config.BOT_NAME, 'Chrome', '1.0.0']
  });

  sock.ev.on('creds.update', saveCreds);

  // Add bot JID to superusers on connection open
  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'close') {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const reconnect = reason !== DisconnectReason.loggedOut;
      console.log(`🔌 Disconnected (${reason}). ${reconnect ? 'Reconnecting...' : 'Logged out.'}`);
      if (reconnect) setTimeout(startBot, 3000);
    } else if (connection === 'open') {
      const botJid = sock.user?.id?.split(':')[0] + '@s.whatsapp.net';
      if (!SUPERUSERS.includes(botJid)) {
        SUPERUSERS.push(botJid);
        console.log('✅ Bot JID added to superusers:', botJid);
      }
      console.log(`✅ Bot connected as ${config.BOT_NAME}`);
    }
  });

  // Message handler
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg?.message) return;

    const from = msg.key.remoteJid;
    const senderJid = msg.key.participant || msg.key.remoteJid;
    const botJid = sock.user?.id?.split(':')[0] + '@s.whatsapp.net';
    const isSuperuser = SUPERUSERS.includes(senderJid) || senderJid === botJid;

    // Get message body text
    const body =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      msg.message.imageMessage?.caption ||
      msg.message.videoMessage?.caption ||
      msg.message.buttonsResponseMessage?.selectedButtonId || '';

    // Auto view status if enabled
    if (config.AUTO_STATUS_VIEW && from === 'status@broadcast') {
      try {
        await sock.readMessages([msg.key]);
        console.log('👀 Auto-viewed status:', msg.pushName || senderJid);
      } catch (e) {
        console.error('⚠️ Status view error:', e);
      }
      return;
    }

    // Auto reply if enabled
    if (config.AUTO_REPLY) {
      try {
        await sock.sendMessage(from, { text: config.AUTO_REPLY_MSG }, { quoted: msg });
        console.log('💬 Auto replied to', msg.pushName || from);
      } catch (e) {
        console.error('⚠️ Auto-reply failed:', e);
      }
    }

    // Ignore if not command
    if (!body.startsWith(config.PREFIX)) return;

    // Block command if private mode and not superuser
    if (!config.PUBLIC_MODE && !isSuperuser) {
      console.log(`⛔ Command blocked from ${senderJid} (private mode)`);
      return;
    }

    // === FIXED COMMAND PARSING ===
    const parts = body.slice(config.PREFIX.length).trim().split(/\s+/);
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    // Run plugins
    for (const { run, name } of plugins) {
      try {
        await run({ sock, msg, from, body, command, args, PREFIX: config.PREFIX, OWNER_NUMBER: config.OWNER_NUMBER });
        console.log(`📦 Executed: ${name} → ${command}`);
      } catch (err) {
        console.error(`⚠️ Plugin error (${name}):`, err);
      }
    }
  });
}

// Launch bot
startBot().catch((err) => {
  console.error('❌ Fatal error during bot startup:', err);
});

// Dummy HTTP server to keep bot alive
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('🤖 The100-Bug-MD bot is alive.\n');
}).listen(process.env.PORT || 3000, () => {
  console.log('🌐 HTTP server running to keep dyno alive');
});
