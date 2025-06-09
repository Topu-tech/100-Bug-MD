const {
  default: makeWASocket,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  makeInMemoryStore,
  useMultiFileAuthState,
  Browsers,
} = require('@whiskeysockets/baileys');

const fs = require('fs');
const path = require('path');
const P = require('pino');
const { Boom } = require('@hapi/boom');
const config = require('./config');

const sessionData = config.SESSION_ID.replace(/ALONE-MD;;;=>/g, '');
const authPath = path.join(__dirname, 'auth');
const credsPath = path.join(authPath, 'creds.json');

if (!fs.existsSync(authPath)) fs.mkdirSync(authPath);

try {
  if (!fs.existsSync(credsPath) && sessionData !== 'skip') {
    fs.writeFileSync(credsPath, Buffer.from(sessionData, 'base64').toString('utf-8'), 'utf-8');
    console.log('✅ Session restored from base64');
  } else if (sessionData !== 'skip') {
    fs.writeFileSync(credsPath, Buffer.from(sessionData, 'base64').toString('utf-8'), 'utf-8');
    console.log('✅ Session updated from base64');
  }
} catch (e) {
  console.log('❌ Invalid session data:', e);
  process.exit(1);
}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(authPath);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'silent' })),
    },
    printQRInTerminal: false,
    browser: Browsers.macOS('Chrome'),
    logger: P({ level: 'silent' }),
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'close') {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const shouldReconnect = reason !== DisconnectReason.loggedOut;
      console.log('❌ Disconnected. Reconnecting...', shouldReconnect);
      if (shouldReconnect) startBot();
    } else if (connection === 'open') {
      console.log(`✅ Bot connected as ${config.BOT_NAME}`);
    }
  });

  // Example message handler
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg?.message || msg.key.fromMe) return;

    const from = msg.key.remoteJid;
    const body = msg.message.conversation || msg.message.extendedTextMessage?.text || '';

    if (body.startsWith(config.PREFIX)) {
      const command = body.slice(config.PREFIX.length).trim().split(/\s+/)[0].toLowerCase();
      const args = body.slice(config.PREFIX.length + command.length).trim();
      console.log(`📥 Command received: ${command}`);
      // Add command handlers here
    }
  });
}

startBot();
