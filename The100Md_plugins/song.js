const axios = require('axios');

module.exports = async ({ sock, msg, from, command, args, config }) => {
  if (command !== 'song') return;

  const externalContext = {
    mentionedJid: [msg.sender],
    forwardingScore: 999,
    isForwarded: true,
    externalAdReply: {
      title: "🎶 Song Finder",
      body: "Alone MD WhatsApp Bot",
      thumbnailUrl: "https://telegra.ph/file/fe6e7d401b0e08d6937f4.jpg", // or use your bot image
      mediaType: 1,
      renderLargerThumbnail: true,
      showAdAttribution: true,
      sourceUrl: "https://whatsapp.com/channel/0029VaeRrcnADTOKzivM0S1r" // your bot's channel or promo link
    }
  };

  if (!args.length) {
    await sock.sendMessage(from, {
      text: '❗️ Please provide a song name.\n\nExample: .song despacito',
      contextInfo: externalContext
    }, { quoted: msg });
    return;
  }

  const query = args.join(' ');
  const apiUrl = `https://saavn.me/search?query=${encodeURIComponent(query)}`;

  try {
    const res = await axios.get(apiUrl);
    const track = res.data.data?.[0];
    if (!track) {
      await sock.sendMessage(from, {
        text: `❌ No song found for "${query}"`,
        contextInfo: externalContext
      }, { quoted: msg });
      return;
    }

    const { title, primary_artists, image, url: audioUrl } = track;

    await sock.sendMessage(from, {
      image: { url: image },
      caption: `🎵 *${title}*\n👤 *Artist:* ${primary_artists}`,
      contextInfo: externalContext
    }, { quoted: msg });

    await sock.sendMessage(from, {
      audio: { url: audioUrl },
      mimetype: 'audio/mpeg',
      fileName: `${title}.mp3`,
      ptt: false,
      contextInfo: externalContext
    }, { quoted: msg });

  } catch (err) {
    console.error('❌ Song command error:', err);
    await sock.sendMessage(from, {
      text: `⚠️ Failed to fetch song.\n${err.message}`,
      contextInfo: externalContext
    }, { quoted: msg });
  }
};
