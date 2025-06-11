const axios = require('axios');

module.exports = async ({ sock, msg, from, command, args }) => {
  if (command !== 'video') return;

  const contextInfo = {
    forwardingScore: 999,
    isForwarded: true,
    externalAdReply: {
      title: '🎥 ALONE MD YouTube Downloader',
      body: 'Powered by TopuTech • WhatsApp Bot',
      thumbnailUrl: 'https://telegra.ph/file/1a1a85815eb6a3c145802.jpg',
      mediaType: 1,
      sourceUrl: 'https://whatsapp.com/channel/0029VaeRrcnADTOKzivM0S1r',
      showAdAttribution: true,
      renderLargerThumbnail: true
    }
  };

  if (!args.length) {
    return await sock.sendMessage(from, {
      text: '❗ Please provide a video name.\n\nExample: .video despacito',
      contextInfo
    }, { quoted: msg });
  }

  const query = args.join(' ');
  const apiUrl = `https://api.akuari.my.id/downloader/youtube?link=${encodeURIComponent(query)}`;

  try {
    const res = await axios.get(apiUrl);
    const data = res.data?.hasil;

    if (!data?.link?.[0]) {
      return await sock.sendMessage(from, {
        text: `❌ No video found for "${query}"`,
        contextInfo
      }, { quoted: msg });
    }

    const video = data.link.find(v => v.includes('.mp4'));
    const thumb = data.thumb;
    const title = data.title;
    const filesize = data.size;

    // Send video info first
    await sock.sendMessage(from, {
      image: { url: thumb },
      caption: `🎬 *${title}*\n💾 *Size:* ${filesize}`,
      contextInfo
    }, { quoted: msg });

    // Send video file
    await sock.sendMessage(from, {
      video: { url: video },
      mimetype: 'video/mp4',
      fileName: `${title}.mp4`,
      caption: '✅ Video downloaded successfully.',
      contextInfo
    }, { quoted: msg });

  } catch (err) {
    console.error('❌ Video command error:', err);
    await sock.sendMessage(from, {
      text: `⚠️ Failed to fetch video.\n${err.message}`,
      contextInfo
    }, { quoted: msg });
  }
};
