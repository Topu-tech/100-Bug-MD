require('dotenv').config();
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

// Load environment variables
const SESSION_ID = process.env.SESSION_ID || '';
const PREFIX = process.env.PREFIX || '.';
const OWNER_NUMBER = (process.env.OWNER_NUMBER || '') + '@s.whatsapp.net';
const BOT_NAME = process.env.BOT_NAME || 'The100-MD';
const AUTO_STATUS_VIEW = process.env.AUTO_STATUS_VIEW === 'true';
const AUTO_REPLY = process.env.AUTO_REPLY === 'true';
const AUTO_REPLY_MSG = process.env.AUTO_REPLY_MSG || "👋 Hello! I'm a bot.";

// Simulate auth
const authFile = './auth_info.json';
fs.writeFileSync(authFile, JSON.stringify({ session: SESSION_ID }));
const { state, saveState } = useSingleFileAuthState(authFile);

// Load plugins
const plugins = [];
const pluginsDir = path.join(__dirname, 'The100Md_plugins');
fs.readdirSync(pluginsDir).forEach(file => {
  if (file.endsWith('.js')) {
    const plugin = require(path.join(pluginsDir, file));
    if (typeof plugin === 'function') plugins.push(plugin);
  }
});

async function startBot() {
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger: P({ level: 'silent' }),
    printQRInTerminal: true,
    auth: state,
    browser: [BOT_NAME, 'Chrome', '1.0.0']
  });

  sock.ev.on('creds.update', saveState);

  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error = new Boom(lastDisconnect?.error))?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('❌ Disconnected. Reconnecting...', shouldReconnect);
      if (shouldReconnect) startBot();
    } else if (connection === 'open') {
      console.log('✅ Bot connected as', BOT_NAME);
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg?.message || msg.key.fromMe) return;

    const from = msg.key.remoteJid;

    // ✅ Auto Status View
    if (AUTO_STATUS_VIEW && from === 'status@broadcast') {
      try {
        await sock.readMessages([msg.key]);
        console.log('👀 Auto-viewed status from', msg.pushName || msg.key.participant || 'Unknown');
      } catch (e) {
        console.error('⚠️ Failed to auto-view status:', e);
      }
      return;
    }

    // ✅ Auto Reply
    if (AUTO_REPLY) {
      try {
        await sock.sendMessage(from, { text: AUTO_REPLY_MSG }, { quoted: msg });
        console.log('💬 Auto-replied to', msg.pushName || from);
      } catch (err) {
        console.error('⚠️ Auto-reply failed:', err);
      }
    }

    // ✅ Command Handling
    const body = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
    if (!body.startsWith(PREFIX)) return;

    const command = body.slice(PREFIX.length).trim().split(/\s+/)[0].toLowerCase();
    const args = body.slice(PREFIX.length + command.length).trim();

    for (const plugin of plugins) {
      try {
        await plugin({ sock, msg, from, body, command, args, PREFIX, OWNER_NUMBER });
      } catch (err) {
        console.error('⚠️ Plugin error:', err);
      }
    }
  });
}

startBot();
