const {
  default: makeWASocket,
  useSingleFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Boom } = require('@hapi/boom');
const { decode } = require('base64-arraybuffer');
const config = require('./config');

// ————— Session decoding (base64) —————
try {
  const raw = config.SESSION_ID.split(';;;=>')[1];
  const creds = Buffer.from(decode(raw));
  fs.mkdirSync('auth', { recursive: true });
  fs.writeFileSync('auth/creds.json', creds);
} catch (e) {
  console.error('❌ SESSION decode failed:', e);
  process.exit(1);
}

const { state, saveState } = useSingleFileAuthState('auth/creds.json');

// ————— Load plugins —————
const PLUGIN_DIR = path.join(__dirname, 'The100Md_plugins');
const plugins = fs.readdirSync(PLUGIN_DIR).filter(f => f.endsWith('.js')).map(file => {
  try {
    const p = require(path.join(PLUGIN_DIR, file));
    console.log(`✅ Plugin loaded: ${file}`);
    return p;
  } catch (err) {
    console.error(`❌ Plugin load error (${file})`, err);
    return null;
  }
}).filter(Boolean);

async function startBot() {
  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: true,
    logger: pino({ level: 'silent' }),
    browser: [config.BOT_NAME, 'Chrome', '1.0.0'],
    defaultQueryTimeoutMs: undefined
  });

  // ——— Presence logic based on WA_PRESENCE setting ———
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg?.message || msg.key.fromMe) return;
    const jid = msg.key.remoteJid;

    if (config.WA_PRESENCE && config.WA_PRESENCE !== 'unavailable') {
      try {
        await sock.sendPresenceUpdate(config.WA_PRESENCE, jid);
      } catch (err) {
        console.error('❌ Presence update failed:', err);
      }
    }
  });

  // ——— Auto‑view status updates ———
  if (config.AUTO_STATUS_VIEW === true) {
    sock.ev.on('messages.upsert', async ({ messages }) => {
      for (const m of messages) {
        if (m.key.remoteJid?.startsWith('status@broadcast')) {
          try {
            await sock.readMessages([m.key]);
          } catch (err) {
            console.error('❌ Auto view status error', err);
          }
        }
      }
    });
  }

  // ——— Reconnection and session logic ———
  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'close') {
      const status = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const loggedOut = status === DisconnectReason.loggedOut;
      console.log('🔌 Disconnected. reconnecting...', loggedOut ? '(logged out)' : '');
      if (!loggedOut) startBot();
    } else if (connection === 'open') {
      console.log('✅ Bot is up and running!');
    }
  });
  sock.ev.on('creds.update', saveState);

  // ——— Core message command handler ———
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg?.message || msg.key.fromMe) return;

    const from = msg.key.remoteJid;
    const sender = msg.key.participant || from;
    const text = msg.message.conversation ||
      msg.message.extendedTextMessage?.text || '';
    const raw = text.trim().split(/\s+/);
    const command = raw[0]?.startsWith(config.PREFIX)
      ? raw[0].slice(config.PREFIX.length).toLowerCase()
      : null;
    if (!command) return;

    // — Channel admin-only restriction ——
    if (from.endsWith('@newsletter')) {
      const admins = Array.isArray(config.OWNER_NUMBER)
        ? config.OWNER_NUMBER
        : [config.OWNER_NUMBER];
      const userId = sender.split('@')[0];
      if (!admins.includes(userId)) {
        await sock.sendMessage(from, {
          text: '🚫 Sorry! Only channel admins can run commands here.',
          quoted: msg
        });
        return;
      }
    }

    // — Execute plugin command ——
    const plug = plugins.find(p => p.pattern?.toLowerCase() === command);
    if (!plug) {
      await sock.sendMessage(from, {
        text: `❓ Unknown command "${command}". Send ${config.PREFIX}menu to see commands.`,
        quoted: msg
      });
      return;
    }

    try {
      await plug.run({ sock, msg, from, command, config, coms: plugins });
      console.log(`📦 Executed: ${command}`);
    } catch (err) {
      console.error('💥 Plugin error', err);
      await sock.sendMessage(from, {
        text: '⚠️ Error executing command, try again later.',
        quoted: msg
      });
    }
  });
}

// Keep alive server for uptime
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('🔥 100BUG‑MD is alive.');
}).listen(process.env.PORT || 8080, () => console.log('🌍 Server running'));

startBot().catch(err => console.error('❌ Bot failed to start:', err));
