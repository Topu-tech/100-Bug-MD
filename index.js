const {
  default: makeWASocket,
  useSingleFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeInMemoryStore
} = require('@whiskeysockets/baileys');

const { Boom } = require('@hapi/boom');
const fs = require('fs');
const path = require('path');
const P = require('pino');
const config = require('./config');

const authDir = path.join(__dirname, 'auth');
const authFile = path.join(authDir, 'creds.json');

if (!fs.existsSync(authDir)) fs.mkdirSync(authDir);

// Decode and write session if provided
if (config.session && config.session !== 'skip') {
  const base64 = config.session.replace(/ALONE-MD;;;=>/g, '');
  try {
    fs.writeFileSync(authFile, Buffer.from(base64, 'base64').toString('utf8'), 'utf8');
    console.log('✅ Session written from config');
  } catch (e) {
    console.error('❌ Invalid session:', e.message);
  }
}

const { state, saveState } = useSingleFileAuthState(authFile);

async function startBot() {
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger: P({ level: 'silent' }),
    printQRInTerminal: false,
    auth: state,
    browser: [config.BOT_NAME, 'Chrome', '1.0.0']
  });

  sock.ev.on('creds.update', saveState);

  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('❌ Disconnected. Reconnecting?', shouldReconnect);
      if (shouldReconnect) startBot();
    } else if (connection === 'open') {
      console.log(`✅ Bot connected as ${config.BOT_NAME}`);
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg?.message || msg.key.fromMe) return;

    const from = msg.key.remoteJid;

    if (config.AUTO_STATUS_VIEW && from === 'status@broadcast') {
      try {
        await sock.readMessages([msg.key]);
        console.log('👀 Viewed status from', msg.pushName || msg.key.participant || 'Unknown');
      } catch (e) {
        console.error('⚠️ Failed to auto-view status:', e);
      }
      return;
    }

    if (config.AUTO_REPLY) {
      try {
        await sock.sendMessage(from, { text: config.AUTO_REPLY_MSG }, { quoted: msg });
        console.log('💬 Auto-replied to', msg.pushName || from);
      } catch (err) {
        console.error('⚠️ Auto-reply failed:', err);
      }
    }

    const body = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
    if (!body.startsWith(config.PREFIXE)) return;

    const command = body.slice(config.PREFIXE.length).trim().split(/\s+/)[0].toLowerCase();
    const args = body.slice(config.PREFIXE.length + command.length).trim();

    // You can insert plugin loading logic here
  });
}

startBot();
