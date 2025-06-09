const {
  default: makeWASocket,
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  delay
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const fs = require('fs');
const path = require('path');
const pino = require('pino');
const http = require('http');
const config = require('./config');

// Global command map
global.commands = new Map();

// Auth folder
const authFolder = path.join(__dirname, 'auth');

// ✅ Write session if provided
if (config.SESSION_ID) {
  try {
    const sessionData = config.SESSION_ID.replace(/^ALONE-MD;;;=>/, '');
    const decoded = Buffer.from(sessionData, 'base64').toString('utf-8');
    fs.mkdirSync(authFolder, { recursive: true });
    fs.writeFileSync(path.join(authFolder, 'creds.json'), decoded, 'utf-8');
    console.log('✅ Session decoded and written.');
  } catch (err) {
    console.error('❌ Failed to decode SESSION_ID:', err);
    process.exit(1);
  }
}

// ✅ Start bot
async function startBot() {
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

  sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
    if (connection === 'close') {
      const reason = lastDisconnect?.error instanceof Boom ? lastDisconnect.error : new Boom(lastDisconnect?.error);
      const shouldReconnect = reason.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('🔌 Disconnected.', shouldReconnect ? 'Reconnecting...' : 'Logged out.');
      if (shouldReconnect) startBot();
    } else if (connection === 'open') {
      console.log(`✅ ${config.BOT_NAME} connected successfully!`);
      console.log('🔄 Loading commands...\n');

      const pluginDir = path.join(__dirname, 'The100Md_plugins');
      fs.readdirSync(pluginDir).forEach((file) => {
        if (file.endsWith('.js')) {
          try {
            require(path.join(pluginDir, file));
            console.log(`✅ Loaded: ${file}`);
          } catch (e) {
            console.log(`❌ Failed to load ${file}:`, e.message);
          }
        }
      });
    }
  });

  // ✅ Handle messages
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg?.message || msg.key.fromMe) return;

    const from = msg.key.remoteJid;
    const body =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      msg.message.imageMessage?.caption ||
      msg.message.videoMessage?.caption ||
      '';

    console.log(`📥 Message from ${from}:`, body);

    // ✅ Auto view status
    if (config.AUTO_STATUS_VIEW && from === 'status@broadcast') {
      try {
        await sock.readMessages([msg.key]);
        console.log('👀 Auto-viewed status from', msg.pushName || msg.key.participant || 'Unknown');
      } catch (e) {
        console.error('⚠️ Failed to auto-view status:', e);
      }
      return;
    }

    // ✅ Auto reply
    if (config.AUTO_REPLY) {
      try {
        await sock.sendMessage(from, { text: config.AUTO_REPLY_MSG }, { quoted: msg });
        console.log('💬 Auto-replied to', msg.pushName || from);
      } catch (err) {
        console.error('⚠️ Auto-reply failed:', err);
      }
    }

    // ✅ Command handling
    if (!body.startsWith(config.PREFIX)) return;

    const command = body.slice(config.PREFIX.length).trim().split(/\s+/)[0].toLowerCase();
    const args = body.slice(config.PREFIX.length + command.length).trim();

    if (global.commands.has(command)) {
      try {
        await global.commands.get(command)({
          sock,
          msg,
          from,
          body,
          command,
          args,
          PREFIX: config.PREFIX,
          OWNER_NUMBER: config.OWNER_NUMBER
        });
        console.log(`✅ Executed command: ${command}`);
      } catch (err) {
        console.error(`❌ Error in command '${command}':`, err);
      }
    } else {
      console.log(`❓ Unknown command: ${command}`);
    }
  });
}

startBot();

// ✅ Keep-alive HTTP server for platforms like Render
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('🤖 WhatsApp bot is running.\n');
}).listen(process.env.PORT || 3000, () => {
  console.log('🌐 HTTP server listening on port 3000');
});
