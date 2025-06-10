const axios = require('axios');

module.exports = async ({ sock, msg, from, command, config = {} }) => {
  if (command !== 'alive') return;

  const mediaLinks = [
    "https://files.catbox.moe/ofpmo1.mp3",
    "https://files.catbox.moe/b3u14w.mp3",
    "https://files.catbox.moe/2fq0gi.mp4",
    "https://files.catbox.moe/eckl98.mp4",
    "https://files.catbox.moe/6359fd.mp4"
  ];

  const randomUrl = mediaLinks[Math.floor(Math.random() * mediaLinks.length)];
  const isAudio = randomUrl.endsWith('.mp3') || randomUrl.endsWith('.mp4');

  const botName = config.BOT_NAME || "The100Bug-MD";
  const ownerName = config.OWNER_NAME || "Unknown";
  const uptime = getUptime();

  const aliveText = `
╭━━❰ *🤖 Alive Status* ❱━━⬣
┃✅ *Status:* Bot is active
┃🎶 *Now Playing:* Random audio
┃🤖 *Bot:* ${botName}
┃👤 *Owner:* ${ownerName}
┃⏱ *Uptime:* ${uptime}
╰━━━───────⬣
  `;

  try {
    // 1. Send fancy alive text first
    await sock.sendMessage(from, {
      text: aliveText
    }, { quoted: msg });

    // 2. Then send the audio media
    if (isAudio) {
      await sock.sendMessage(from, {
        audio: { url: randomUrl },
        mimetype: randomUrl.endsWith('.mp3') ? 'audio/mpeg' : 'audio/mp4',
        ptt: false
      }, { quoted: msg });
    } else {
      await sock.sendMessage(from, {
        text: '❌ Unsupported media format.'
      }, { quoted: msg });
    }

  } catch (err) {
    console.error('❌ Error in alive command:', err);
    await sock.sendMessage(from, {
      text: `⚠️ Failed to send alive media.\n\nError: ${err.message || err}`
    }, { quoted: msg });
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
