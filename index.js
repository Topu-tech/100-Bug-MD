const {
  default: makeWASocket,
  useSingleFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const fs = require('fs');
const path = require('path');
const P = require('pino');

// ⚠️ Replace this with your actual base64 session
const SESSION_ID = 'PASTE_YOUR_BASE64_SESSION_HERE' || '';

const BOT_NAME = 'The100-MD';
const OWNER_NUMBER = '255673750170';
const PREFIX = '.';
const AUTO_REPLY = true;
const AUTO_REPLY_MSG = '👋 Hello! I’m The100-MD. Use .menu to start.';
const AUTO_STATUS_VIEW = true;

const authDir = path.join(__dirname, 'auth');
const authFile = path.join(authDir, 'creds.json');

if (!fs.existsSync(authDir)) fs.mkdirSync(authDir);

try {
  if (!fs.existsSync(authFile) && SESSION_ID) {
    fs.writeFileSync(authFile, Buffer.from(SESSION_ID, 'base64').toString('utf-8'), 'utf-8');
    console.log('✅ Session written to auth/creds.json');
  }
} catch (e) {
  console.error('❌ Invalid base64 session:', e);
  process.exit(1);
}

const { state, saveState } = useSingleFileAuthState(authFile);

// 🔌 Load plugins
const plugins = [];
const pluginsDir = path.join(__dirname, 'The100Md_plugins');
if (fs.existsSync(pluginsDir)) {
  fs.readdirSync(pluginsDir).forEach(file => {
    if (file.endsWith('.js')) {
      try {
        const plugin = require(path.join(pluginsDir, file));
        if (typeof plugin === 'function') plugins.push(plugin);
      } catch (e) {
        console.error(`❌ Plugin load error (${file}):`, e);
      }
    }
  });
} else {
  console.warn('⚠️ Plugins folder not found:', pluginsDir);
}

async function startBot() {
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger: P({ level: 'silent' }),
    printQRInTerminal: false,
    auth: state,
    browser: [BOT_NAME, 'Chrome', '1.0.0']
  });

  sock.ev.on('creds.update', saveState);

  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'close') {
      const reason = new Boom(lastDisconnect?.error).output?.statusCode;
      const shouldReconnect = reason !== DisconnectReason.loggedOut;
      console.log('❌ Disconnected. Reconnecting?', shouldReconnect);
      if (shouldReconnect) startBot();
    } else if (connection === 'open') {
      console.log(`✅ Bot connected as ${BOT_NAME}`);
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg?.message || msg.key.fromMe) return;

    const from = msg.key.remoteJid;

    if (AUTO_STATUS_VIEW && from === 'status@broadcast') {
      try {
        await sock.readMessages([msg.key]);
        console.log('👀 Auto-viewed status from', msg.pushName || msg.key.participant || 'Unknown');
      } catch (e) {
        console.error('⚠️ Failed to view status:', e);
      }
      return;
    }

    if (AUTO_REPLY) {
      try {
        await sock.sendMessage(from, { text: AUTO_REPLY_MSG }, { quoted: msg });
        console.log('💬 Auto-replied to', msg.pushName || from);
      } catch (e) {
        console.error('⚠️ Auto-reply failed:', e);
      }
    }

    const body = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
    if (!body.startsWith(PREFIX)) return;

    const command = body.slice(PREFIX.length).trim().split(/\s+/)[0].toLowerCase();
    const args = body.slice(PREFIX.length + command.length).trim();

    for (const plugin of plugins) {
      try {
        await plugin({ sock, msg, from, body, command, args, PREFIX, OWNER_NUMBER });
      } catch (e) {
        console.error('⚠️ Plugin error:', e);
      }
    }
  });
}

startBot();
