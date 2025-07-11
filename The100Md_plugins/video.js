const axios = require("axios");
const ytSearch = require("yt-search");

module.exports = async ({ sock, msg, from, command, args }) => {
  const aliases = ["video", "ytmp4", "vid", "mp4"];
  if (!aliases.includes(command)) return;

  const externalContext = {
    forwardingScore: 999,
    isForwarded: true,
    externalAdReply: {
      title: "📥 Bug MD Video Downloader",
      body: "Powered by 100bug-MD",
      thumbnailUrl: "https://telegra.ph/file/94f5c37a2b1d6c93a97ae.jpg",
      sourceUrl: "https://github.com/Topu-tech/Backup-md",
      mediaType: 1,
      renderLargerThumbnail: false,
      showAdAttribution: false,
    },
  };

  const reply = async (text) => {
    await sock.sendMessage(from, { text, contextInfo: externalContext }, { quoted: msg });
  };

  if (!args.length) return reply("❗ Please provide a video name.");

  const query = args.join(" ");

  try {
    const results = await ytSearch(query);
    if (!results || !results.videos.length) return reply("❌ No video found for the query.");

    const video = results.videos[0];
    const videoUrl = video.url;
    const title = video.title;

    await sock.sendMessage(from, { text: "```Downloading video...```" }, { quoted: msg });

    const tryApi = async (url) => {
      try {
        const res = await axios.get(url);
        return res.data;
      } catch {
        return null;
      }
    };

    const apis = [
      `https://apis.davidcyriltech.my.id/download/ytmp4?url=${encodeURIComponent(videoUrl)}&apikey=gifted-md`,
      `https://www.dark-yasiya-api.site/download/ytmp4?url=${encodeURIComponent(videoUrl)}`,
      `https://api.dreaded.site/api/ytdl/video?query=${encodeURIComponent(videoUrl)}`
    ];

    let response = null;
    for (const api of apis) {
      response = await tryApi(api);
      if (response?.result?.download_url || response?.result?.url) break;
    }

    if (!response) return reply("❌ All sources failed. Try again later.");

    const downloadUrl = response.result.download_url || response.result.url;
    const thumbnail = response.result.thumbnail || video.thumbnail;

    await sock.sendMessage(from, {
      video: { url: downloadUrl },
      caption: `🎥 *${title}*\n\n🔗 ${videoUrl}`,
      mimetype: "video/mp4",
      contextInfo: {
        externalAdReply: {
          title: "📥 Bug MD Video Downloader",
          body: `🎬 ${title}`,
          thumbnailUrl: thumbnail,
          sourceUrl: videoUrl,
          mediaType: 1,
          renderLargerThumbnail: false,
          showAdAttribution: false,
          forwardingScore: 999,
          isForwarded: true,
        },
      },
    }, { quoted: msg });

  } catch (err) {
    console.error("Download Error:", err);
    return reply("❌ Download failed: " + (err.message || err));
  }
};
