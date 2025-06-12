const axios = require('axios');

const aliases = ['video', 'download', 'getvid', 'movie'];

module.exports = async ({ sock, msg, from, command, args }) => {
  if (!aliases.includes(command)) return;

  const externalContext = {
    mentionedJid: [msg.sender],
    forwardingScore: 999,
    isForwarded: true,
    externalAdReply: {
      title: "🎬 Video Downloader",
      body: "100bug-MD WhatsApp Bot",
      thumbnailUrl: "https://telegra.ph/file/fe6e7d401b0e08d6937f4.jpg",
      mediaType: 1,
      renderLargerThumbnail: true,
      showAdAttribution: true,
      sourceUrl: "https://whatsapp.com/channel/0029VaeRrcnADTOKzivM0S1r"
    }
  };

  if (!args.length) {
    await sock.sendMessage(from, {
      text: '❗️ Please provide a video name.\n\nExample: .video Alan Walker Faded',
      contextInfo: externalContext
    }, { quoted: msg });
    return;
  }

  const query = args.join(' ');

  // Step 1: Search YouTube
  let ytSearchUrl = `https://youtube-search-api3.p.rapidapi.com/youtube-search/?q=${encodeURIComponent(query)}`;
  let videoUrl;
  try {
    const ytRes = await axios.get(ytSearchUrl, {
      headers: {
        'X-RapidAPI-Key': 'YOUR_API_KEY', // optional: remove if you use another public API
        'X-RapidAPI-Host': 'youtube-search-api3.p.rapidapi.com'
      }
    });

    const firstVideo = ytRes.data.results?.find(v => v.type === 'video');
    if (!firstVideo) throw new Error('No video found on YouTube.');

    videoUrl = `https://youtu.be/${firstVideo.id}`;
  } catch (e) {
    console.error('❌ YouTube search failed:', e.message);
    return await sock.sendMessage(from, {
      text: `❌ Failed to search YouTube for "${query}".`,
      contextInfo: externalContext
    }, { quoted: msg });
  }

  // Step 2: Try to download using your APIs
  const apiUrls = [
    `https://apis.davidcyriltech.my.id/download/ytmp4?url=${encodeURIComponent(videoUrl)}&apikey=gifted-md`,
    `https://www.dark-yasiya-api.site/download/ytmp4?url=${encodeURIComponent(videoUrl)}`,
    `https://api.dreaded.site/api/ytdl/video?query=${encodeURIComponent(videoUrl)}`,
    `https://youtube-download-api.matheusishiyama.repl.co/mp4/?url=${encodeURIComponent(videoUrl)}`
  ];

  let success = false;

  for (const api of apiUrls) {
    try {
      const res = await axios.get(api);
      const data = res.data;

      const downloadLink = data.result?.url || data.result?.download || data.result?.video_url || data?.download_url;
      const title = data.result?.title || data?.title || query;
      const thumbnail = data.result?.thumbnail || data.thumbnail || "https://telegra.ph/file/fe6e7d401b0e08d6937f4.jpg";

      if (downloadLink) {
        await sock.sendMessage(from, {
          image: { url: thumbnail },
          caption: `🎬 *${title}*\n\n📥 Downloading video...`,
          contextInfo: externalContext
        }, { quoted: msg });

        await sock.sendMessage(from, {
          video: { url: downloadLink },
          mimetype: "video/mp4",
          caption: title,
          contextInfo: externalContext
        }, { quoted: msg });

        success = true;
        break;
      }
    } catch (err) {
      console.warn(`❌ API failed (${api}):`, err.message);
    }
  }

  if (!success) {
    await sock.sendMessage(from, {
      text: `⚠️ All servers failed to fetch video for "${query}".`,
      contextInfo: externalContext
    }, { quoted: msg });
  }
};
