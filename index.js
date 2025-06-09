const { default: makeWASocket, makeInMemoryStore, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const fs = require('fs');
const path = require('path');
const pino = require('pino');
const config = require('./config');

// Step 1: Decode base64 session from config
const sessionRaw = config.SESSION_ID.replace(/ALONE-MD;;;=>/g, '');
const authPath = path.join(__dirname, 'auth');

// Step 2: Write creds.json if not exist or session is updated
if (!fs.existsSync(`${authPath}/creds.json`) || sessionRaw !== 'skip') {
    try {
        fs.mkdirSync(authPath, { recursive: true });
        fs.writeFileSync(`${authPath}/creds.json`, Buffer.from(sessionRaw, 'base64').toString('utf-8'), 'utf8');
        console.log('✅ Session file written successfully.');
    } catch (e) {
        console.error('❌ Failed to write session:', e);
        process.exit(1);
    }
}

const store = makeInMemoryStore({ logger: pino().child({ level: 'silent' }) });

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState(authPath);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: state,
        browser: [config.BOT_NAME, 'Chrome', '1.0.0']
    });

    store.bind(sock.ev);

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error instanceof Boom)
                ? lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut
                : true;

            console.log('🔁 Connection closed. Reconnecting?', shouldReconnect);
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            console.log(`✅ Bot connected as ${config.BOT_NAME}`);
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg?.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;

        if (config.AUTO_REPLY) {
            try {
                await sock.sendMessage(from, { text: config.AUTO_REPLY_MSG }, { quoted: msg });
                console.log('💬 Auto-replied to', from);
            } catch (err) {
                console.error('⚠️ Auto-reply failed:', err);
            }
        }
    });
}

startBot();
