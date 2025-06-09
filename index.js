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

const config = require('./config'); // <=== import config

// Write session id to auth file for Baileys
const authFile = './auth_info.json';
fs.writeFileSync(authFile, JSON.stringify({ session: config.SESSION_ID }));

const { state, saveState } = useSingleFileAuthState(authFile);

// Load plugins dynamically from plugins folder
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
  console.warn('Plugins directory not found:', pluginsDir);
}

async function startBot() {
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger: P({ level: 'silent' }),
    printQRInTerminal: true,
    auth: state,
    browser: [config.BOT_NAME, 'Chrome', '1.0.0']
  });

  sock.ev.on('creds.update', saveState);

  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error = new Boom(lastDisconnect?.error))?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('❌ Disconnected. Reconnecting...', shouldReconnect);
      if (shouldReconnect) startBot();
    } else if (connection === 'open') {
      console.log(`✅ Bot connected as ${config.BOT_NAME}`);
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg?.message || msg.key.fromMe) return;

    const from = msg.key.remoteJid;

    // Auto view statuses if enabled and message is from status broadcast
    if (config.AUTO_STATUS_VIEW && from === 'status@broadcast') {
      try {
        await sock.readMessages([msg.key]);
        console.log('👀 Auto-viewed status from', msg.pushName || msg.key.participant || 'Unknown');
      } catch (e) {
        console.error('⚠️ Failed to auto-view status:', e);
      }
      return; // no need to process further for status messages
    }

    // Auto reply if enabled
    if (config.AUTO_REPLY) {
      try {
        await sock.sendMessage(from, { text: config.AUTO_REPLY_MSG }, { quoted: msg });
        console.log('💬 Auto-replied to', msg.pushName || from);
      } catch (err) {
        console.error('⚠️ Auto-reply failed:', err);
      }
    }

    // Command handling
    const body = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
    if (!body.startsWith(config.PREFIX)) return;

    const command = body.slice(config.PREFIX.length).trim().split(/\s+/)[0].toLowerCase();
    const args = body.slice(config.PREFIX.length + command.length).trim();

    for (const plugin of plugins) {
      try {
        await plugin({ sock, msg, from, body, command, args, PREFIX: config.PREFIX, OWNER_NUMBER: config.OWNER_NUMBER });
      } catch (err) {
        console.error('⚠️ Plugin error:', err);
      }
    }
  });
}

startBot();
