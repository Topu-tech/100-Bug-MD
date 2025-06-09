const {
  default: makeWASocket,
  useSingleFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const fs = require('fs');
const path = require('path');
const P = require('pino');

// 🔐 Config with base64 session
const conf = require('./config'); // Your conf.js with session & prefixe
const session = conf.session.replace(/ALONE-MD;;;=>/g, '');
const prefix = conf.PREFIX || '.';

// Write base64 session to auth file
const authDir = path.join(__dirname, 'auth');
const authFile = path.join(authDir, 'creds.json');

if (!fs.existsSync(authDir)) fs.mkdirSync(authDir);

try {
  if (!fs.existsSync(authFile) || session !== 'zokk') {
    fs.writeFileSync(authFile, Buffer.from(session, 'base64').toString('utf8'), 'utf8');
    console.log('✅ Session restored successfully.');
  }
} catch (e) {
  console.error('❌ Failed to write session file:', e);
  process.exit(1);
}

const { state, saveState } = useSingleFileAuthState(authFile);

// Load plugins
const plugins = [];
const pluginsDir = path.join(__dirname, 'The100Md_plugins');
if (fs.existsSync(pluginsDir)) {
  fs.readdirSync(pluginsDir).forEach(file => {
    if (file.endsWith('.js')) {
      try {
        const plugin = require(path.join(pluginsDir, file));
        if (typeof plugin === 'function') plugins.push(plugin);
      } catch (e) {
        console.error(`⚠️ Failed loading plugin ${file}:`, e);
      }
    }
  });
} else {
  console.warn('⚠️ Plugins directory not found:', pluginsDir);
}

async function startBot() {
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger: P({ level: 'silent' }),
    printQRInTerminal: false,
    auth: state,
    browser: ['The100-MD', 'Chrome', '1.0.0'],
  });

  sock.ev.on('creds.update', saveState);

  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'close') {
      const err = lastDisconnect?.error instanceof Boom ? lastDisconnect.error : new Boom(lastDisconnect?.error);
      const shouldReconnect = err.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('❌ Disconnected. Reconnecting?', shouldReconnect);
      if (shouldReconnect) startBot();
    } else if (connection === 'open') {
      console.log('✅ Bot connected successfully!');
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
      '';

    if (!body.startsWith(prefix)) return;

    const command = body.slice(prefix.length).trim().split(/\s+/)[0].toLowerCase();
    const args = body.slice(prefix.length + command.length).trim();

    for (const plugin of plugins) {
      try {
        await plugin({ sock, msg, from, body, command, args, PREFIX: prefix });
      } catch (err) {
        console.error('⚠️ Plugin error:', err);
      }
    }
  });
}

startBot();
