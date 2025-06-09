const axios = require('axios');

module.exports = async ({ sock, msg, from, command, config }) => {
  if (command !== 'alive') return;

  const audioSources = [
    "https://files.catbox.moe/ofpmo1.mp3",
    "https://files.catbox.moe/b3u14w.mp3",
    "https://files.catbox.moe/2fq0gi.mp4",
    "https://files.catbox.moe/eckl98.mp4",
    "https://files.catbox.moe/6359fd.mp4"
  ];

  try {
    const randomUrl = audioSources[Math.floor(Math.random() * audioSources.length)];

    const isAudio = randomUrl.endsWith('.mp3') || randomUrl.endsWith('.mp4');

    const caption = `✅ *I'm alive and running!*\n\n🎧 Playing random audio\n🤖 Bot: ${config.BOT_NAME || 'Bot'}\n👤 Owner: ${config.OWNER_NAME || 'Unknown'}\n🕒 Uptime: ${getUptime()}`;

    // Get thumbnail as buffer
    let thumbnail;
    try {
      thumbnail = await getBuffer("https://telegra.ph/file/0a2fae9f74579c6c93a37.jpg");
    } catch {
      thumbnail = null;
    }

    const contextInfo = thumbnail ? {
      externalAdReply: {
        title: config.BOT_NAME || "The100Bug-MD",
        body: "Alive Check ✔️",
        mediaUrl: randomUrl,
        sourceUrl: randomUrl,
        thumbnail,
        showAdAttribution: true
      }
    } : {};

    if (isAudio) {
      await sock.sendMessage(from, {
        audio: { url: randomUrl },
        mimetype: randomUrl.endsWith('.mp3') ? 'audio/mpeg' : 'audio/mp4',
        ptt: false,
        contextInfo,
        caption
      }, { quoted: msg });
    } else {
      await sock.sendMessage(from, { text: '❌ Unsupported media format.' }, { quoted: msg });
    }

  } catch (err) {
    console.error('❌ Error in alive command:', err);
    await sock.sendMessage(from, { text: `⚠️ Failed to send alive media.\n\nError: ${err.message || err}` }, { quoted: msg });
  }
};

// Helper for uptime
function getUptime() {
  const sec = Math.floor(process.uptime());
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h}h ${m}m ${s}s`;
}

// Helper to fetch image as buffer
async function getBuffer(url) {
  const res = await axios.get(url, { responseType: 'arraybuffer' });
  return Buffer.from(res.data, 'binary');
}
