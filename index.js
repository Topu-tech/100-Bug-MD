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

// ✅ Superusers
const SUPERUSERS = [config.OWNER_NUMBER, '1234567890@s.whatsapp.net', '9876543210@s.whatsapp.net'];

// ✅ Auth folder
const authFolder = path.join(__dirname, 'auth');

// ✅ Decode SESSION_ID
if (config.SESSION_ID) {
  try {
    const sessionData = config.SESSION_ID.replace(/^ALONE-MD;;;=>/, '');
    const decoded = Buffer.from(sessionData, 'base64').toString('utf-8');
    JSON.parse(decoded); // Ensure it's valid JSON
    fs.mkdirSync(authFolder, { recursive: true });
    fs.writeFileSync(path.join(authFolder, 'creds.json'), decoded, 'utf-8');
    console.log('✅ Session decoded and written.');
  } catch (err) {
    console.error('❌ SESSION_ID decode error:', err);
    process.exit(1);
  }
}

// ✅ Load plugins
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
  console.warn(`⚠️ Plugin folder missing: ${pluginsDir}`);
}

// ✅ Start bot
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

  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'close') {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const reconnect = reason !== DisconnectReason.loggedOut;
      console.log(`🔌 Disconnected (${reason}). ${reconnect ? 'Reconnecting...' : 'Logged out.'}`);
      if (reconnect) setTimeout(startBot, 3000);
    } else if (connection === 'open') {
      console.log(`✅ Bot connected as ${config.BOT_NAME}`);
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg?.message || msg.key.fromMe) return;

    const from = msg.key.remoteJid;
    const senderJid = msg.key.participant || msg.key.remoteJid;
    const botJid = sock.user?.id?.split(':')[0] + '@s.whatsapp.net';
    const isSuperuser = SUPERUSERS.includes(senderJid) || senderJid === botJid;

    const body =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      msg.message.imageMessage?.caption ||
      msg.message.videoMessage?.caption ||
      msg.message.buttonsResponseMessage?.selectedButtonId || '';

    // ✅ Auto view status
    if (config.AUTO_STATUS_VIEW && from === 'status@broadcast') {
      try {
        await sock.readMessages([msg.key]);
        console.log('👀 Auto-viewed status:', msg.pushName || senderJid);
      } catch (e) {
        console.error('⚠️ Status view error:', e);
      }
      return;
    }

    // ✅ Auto reply
    if (config.AUTO_REPLY) {
      try {
        await sock.sendMessage(from, { text: config.AUTO_REPLY_MSG }, { quoted: msg });
        console.log('💬 Replied to', msg.pushName || from);
      } catch (e) {
        console.error('⚠️ Auto-reply failed:', e);
      }
    }

    // ✅ Handle command
    if (!body.startsWith(config.PREFIX)) return;
    if (!config.PUBLIC_MODE && !isSuperuser) {
      console.log(`⛔ Command blocked from ${senderJid} (private mode)`);
      return;
    }

    const command = body.slice(config.PREFIX.length).trim().split(/\s+/)[0].toLowerCase();
    const args = body.slice(config.PREFIX.length + command.length).trim();

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

startBot().catch((err) => {
  console.error('❌ Fatal error during bot startup:', err);
});

// ✅ Dummy HTTP server for Render/Heroku
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('🤖 The100-Bug-MD bot is alive.\n');
}).listen(process.env.PORT || 3000, () => {
  console.log('🌐 HTTP server running to keep dyno alive');
});
