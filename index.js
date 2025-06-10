// index.js const { default: makeWASocket, DisconnectReason, fetchLatestBaileysVersion, useMultiFileAuthState, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');

const { Boom } = require('@hapi/boom'); const fs = require('fs'); const path = require('path'); const pino = require('pino'); const http = require('http'); const config = require('./config');

const authFolder = path.join(__dirname, 'auth');

// Write base64 session if not already written if (config.SESSION_ID) { try { const sessionData = config.SESSION_ID.replace(/^ALONE-MD;;;=>/, ''); const decoded = Buffer.from(sessionData, 'base64').toString('utf-8'); fs.mkdirSync(authFolder, { recursive: true }); fs.writeFileSync(path.join(authFolder, 'creds.json'), decoded, 'utf-8'); console.log('✅ Session decoded and written.'); } catch (err) { console.error('❌ Failed to decode SESSION_ID:', err); process.exit(1); } }

// Plugin loader const plugins = []; const pluginsDir = path.join(__dirname, 'The100Md_plugins');

if (fs.existsSync(pluginsDir)) { const pluginFiles = fs.readdirSync(pluginsDir).filter(f => f.endsWith('.js'));

for (const file of pluginFiles) { const pluginPath = path.join(pluginsDir, file); try { const plugin = require(pluginPath); if (typeof plugin === 'function') { plugins.push({ run: plugin, name: file }); console.log(✅ Plugin loaded: ${file}); } else { console.warn(⚠️ Skipped ${file}: Not a function export.); } } catch (err) { console.error(❌ Failed to load plugin ${file}:, err); } } } else { console.warn(⚠️ Plugin folder not found: ${pluginsDir}); }

// SuperUsers List const superUsers = [ '255673750170', '255614206170' ];

async function startBot() { const { state, saveCreds } = await useMultiFileAuthState(authFolder); const { version } = await fetchLatestBaileysVersion();

const sock = makeWASocket({ version, logger: pino({ level: 'silent' }), printQRInTerminal: !config.SESSION_ID, auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })) }, browser: [config.BOT_NAME, 'Chrome', '1.0.0'] });

sock.ev.on('creds.update', saveCreds);

sock.ev.on('connection.update', ({ connection, lastDisconnect }) => { if (connection === 'close') { const reason = lastDisconnect?.error instanceof Boom ? lastDisconnect.error : new Boom(lastDisconnect?.error); const shouldReconnect = reason.output?.statusCode !== DisconnectReason.loggedOut; console.log('🔌 Disconnected.', shouldReconnect ? 'Reconnecting...' : 'Logged out.'); if (shouldReconnect) startBot(); } else if (connection === 'open') { console.log(🤖 Bot connected as ${config.BOT_NAME}); } });

sock.ev.on('messages.upsert', async ({ messages }) => { const msg = messages[0]; if (!msg?.message || msg.key.fromMe) return;

const from = msg.key.remoteJid;
const isGroup = from.endsWith('@g.us');
const sender = isGroup ? msg.key.participant : msg.key.remoteJid;
const cleanSender = sender.replace(/[^0-9]/g, '');
const botNumber = sock.user.id.split(':')[0].replace(/[^0-9]/g, '');

const isSuperUser = cleanSender === botNumber ||
  cleanSender === config.OWNER_NUMBER.replace(/[^0-9]/g, '') ||
  superUsers.includes(cleanSender);

const body = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
console.log(`📥 Message from ${from}:`, body);

// Auto-view status
if (config.AUTO_STATUS_VIEW && from === 'status@broadcast') {
  try {
    await sock.readMessages([msg.key]);
    console.log('👀 Auto-viewed status from', msg.pushName || msg.key.participant || 'Unknown');
  } catch (e) {
    console.error('⚠️ Failed to auto-view status:', e);
  }
  return;
}

// Auto-reply
if (config.AUTO_REPLY) {
  try {
    await sock.sendMessage(from, { text: config.AUTO_REPLY_MSG }, { quoted: msg });
    console.log('💬 Auto-replied to', msg.pushName || from);
  } catch (err) {
    console.error('⚠️ Auto-reply failed:', err);
  }
}

if (!body.startsWith(config.PREFIX)) return;

const command = body.slice(config.PREFIX.length).trim().split(/\s+/)[0].toLowerCase();
const args = body.slice(config.PREFIX.length + command.length).trim();

if (config.PUBLIC_MODE === 'yes') {
  for (const { run, name } of plugins) {
    try {
      await run({ sock, msg, from, body, command, args, PREFIX: config.PREFIX, OWNER_NUMBER: config.OWNER_NUMBER });
      console.log(`📦 Plugin executed: ${name} -> ${command}`);
    } catch (err) {
      console.error(`⚠️ Error in plugin ${name}:`, err);
    }
  }
} else {
  if (isSuperUser) {
    for (const { run, name } of plugins) {
      try {
        await run({ sock, msg, from, body, command, args, PREFIX: config.PREFIX, OWNER_NUMBER: config.OWNER_NUMBER });
        console.log(`📦 Plugin executed (private mode): ${name} -> ${command}`);
      } catch (err) {
        console.error(`⚠️ Error in plugin ${name}:`, err);
      }
    }
  } else {
    console.log(`🔒 PRIVATE MODE: Ignored command from ${sender}`);
  }
}

}); }

startBot();

http.createServer((req, res) => { res.writeHead(200, { 'Content-Type': 'text/plain' }); res.end('🤖 WhatsApp bot is running.\n'); }).listen(process.env.PORT || 3000, () => { console.log('🌐 HTTP server listening to keep Render alive'); });

