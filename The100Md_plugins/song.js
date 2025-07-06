const axios = require("axios");
const { YoutubeSearchApi } = require('youtube-search-api');

const aliases = ["song", "mp3", "getsong"]; // support multiple aliases

module.exports = async ({ sock, msg, from, command, args }) => {
  if (!aliases.includes(command)) return;

  const externalContext = {
    mentionedJid: [msg.sender],
    forwardingScore: 999,
    isForwarded: true,
    externalAdReply: {
      title: "🎵 Song Downloader",
      body: "100bug-MD WhatsApp Bot",
      thumbnailUrl: "https://files.catbox.moe/qhv6dt.jpg",
      mediaType: 1,
      renderLargerThumbnail: true,
      showAdAttribution: true,
      sourceUrl: "https://whatsapp.com/channel/0029VaeRrcnADTOKzivM0S1r"
    }
  };

  if (!args.length) {
    return await sock.sendMessage(from, {
      text: '❗️ Please provide a song name.\n\nExample: .mp3 Despacito',
      contextInfo: externalContext
    }, { quoted: msg });
  }

  const query = args.join(" ");

  let firstResult;
  try {
    const searchResults = await YoutubeSearchApi.GetListByKeyword(query, false, 1);
    firstResult = searchResults?.items?.[0];
    if (!firstResult) throw new Error('No video found');
  } catch (e) {
    console.error("❌ YouTube search error:", e.message);
    return await sock.sendMessage(from, {
      text: `❌ Could not find any song for *${query}*.\nTry again with a different name.`,
      contextInfo: externalContext
    }, { quoted: msg });
  }

  const videoUrl = `https://www.youtube.com/watch?v=${firstResult.id}`;

  const apiUrls = [
    `https://apis.davidcyriltech.my.id/download/ytmp3?url=${encodeURIComponent(videoUrl)}&apikey=gifted-md`,
    `https://www.dark-yasiya-api.site/download/ytmp3?url=${encodeURIComponent(videoUrl)}`,
    `https://api.dreaded.site/api/ytdl/audio?query=${encodeURIComponent(videoUrl)}`,
    `https://youtube-download-api.matheusishiyama.repl.co/mp3/?url=${encodeURIComponent(videoUrl)}`
  ];

  let success = false;

  for (const api of apiUrls) {
    try {
      const res = await axios.get(api);
      const data = res.data;
      console.log("API Response from", api, data); // Debug log

      const downloadLink =
        data.result?.url ||
        data.result?.download ||
        data.result?.audio_url ||
        data.download_url;

      const title = data.result?.title || data.title || query;
      const thumbnail =
        data.result?.thumbnail || data.thumbnail || "https://telegra.ph/file/fe6e7d401b0e08d6937f4.jpg";

      if (!downloadLink || downloadLink.length < 5) {
        console.warn(`⚠️ Invalid or empty download link from: ${api}`);
        continue;
      }

      await sock.sendMessage(from, {
        image: { url: thumbnail },
        caption: `🎶 *${title}*\n\n🔗 ${videoUrl}`,
        contextInfo: externalContext
      }, { quoted: msg });

      await sock.sendMessage(from, {
        audio: { url: downloadLink },
        mimetype: "audio/mpeg",
        fileName: `${title}.mp3`,
        ptt: false,
        contextInfo: externalContext
      }, { quoted: msg });

      success = true;
      break;
    } catch (err) {
      console.warn(`❌ API failed (${api}): ${err.message}`);
      continue;
    }
  }

  if (!success) {
    await sock.sendMessage(from, {
      text: `❌ All servers failed to download MP3 for *${query}*.\nPlease try again later.`,
      contextInfo: externalContext
    }, { quoted: msg });
  }
};
