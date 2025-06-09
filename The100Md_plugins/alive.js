const axios = require('axios');

module.exports = async ({ sock, msg, from, command, config }) => {
  const audioSources = [
    "https://files.catbox.moe/ofpmo1.mp3",
    "https://files.catbox.moe/b3u14w.mp3",
    "https://files.catbox.moe/2fq0gi.mp4",
    "https://files.catbox.moe/eckl98.mp4",
    "https://files.catbox.moe/6359fd.mp4"
  ];

  if (command === 'alive') {
    try {
      const randomUrl = audioSources[Math.floor(Math.random() * audioSources.length)];
      const isAudio = randomUrl.endsWith('.mp3');
      const isVideo = randomUrl.endsWith('.mp4');

      const caption = `✅ *I'm alive and running!*\n\n🎧 Playing random media\n🤖 Bot: ${config.BOT_NAME || 'Bot'}\n👤 Owner: ${config.OWNER_NAME || 'Unknown'}\n🕒 Uptime: ${getUptime()}`;

      // Download thumbnail as buffer
      const thumb = await getBuffer("https://telegra.ph/file/0a2fae9f74579c6c93a37.jpg");

      const contextInfo = {
        externalAdReply: {
          title: config.BOT_NAME || "Bot",
          body: "Alive Check ✔️",
          mediaUrl: randomUrl,
          mediaType: 2,
          thumbnail: thumb,
          showAdAttribution: true,
          sourceUrl: randomUrl
        }
      };

      if (isAudio) {
        await sock.sendMessage(from, {
          audio: { url: randomUrl },
          mimetype: 'audio/mpeg',
          ptt: false,
          contextInfo
        }, { quoted: msg });
      } else if (isVideo) {
        await sock.sendMessage(from, {
          video: { url: randomUrl },
          caption,
          mimetype: 'video/mp4',
          contextInfo
        }, { quoted: msg });
      } else {
        await sock.sendMessage(from, { text: '❌ Unsupported media format.' }, { quoted: msg });
      }

    } catch (err) {
      console.error('❌ Error in alive command:', err);
      await sock.sendMessage(from, { text: '⚠️ Failed to send alive media.' }, { quoted: msg });
    }
  }
};

// Helper to format uptime nicely
function getUptime() {
  const sec = Math.floor(process.uptime());
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h}h ${m}m ${s}s`;
}

// Helper to fetch image buffer
async function getBuffer(url) {
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  return Buffer.from(response.data, 'binary');
}
