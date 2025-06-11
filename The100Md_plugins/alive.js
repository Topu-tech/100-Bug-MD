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
  const fileExt = randomUrl.split('.').pop().toLowerCase();
  const isAudio = fileExt === 'mp3';
  const isVideo = fileExt === 'mp4';

  const botName = config.BOT_NAME || "The100Bug-MD";
  const ownerName = config.OWNER_NAME || "Unknown";
  const uptime = getUptime();

  const aliveText = `
╭━━❰ *🤖 Alive Status* ❱━━⬣
┃✅ *Status:* Bot is active
┃🎶 *Now Playing:* Random ${isAudio ? 'audio' : 'video'}
┃🤖 *Bot:* ${botName}
┃👤 *Owner:* ${ownerName}
┃⏱ *Uptime:* ${uptime}
╰━━━───────⬣`;

  try {
    // Send alive text first
    await sock.sendMessage(from, { text: aliveText }, { quoted: msg });

    // Then send the media (audio or video)
    if (isAudio) {
      await sock.sendMessage(from, {
        audio: { url: randomUrl },
        mimetype: 'audio/mpeg',
        ptt: false
      }, { quoted: msg });
    } else if (isVideo) {
      await sock.sendMessage(from, {
        video: { url: randomUrl },
        caption: `${botName} is alive! 🔥`
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

// Helper to format uptime
function getUptime() {
  const sec = Math.floor(process.uptime());
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h}h ${m}m ${s}s`;
}
