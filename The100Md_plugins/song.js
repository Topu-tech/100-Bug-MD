const axios = require("axios");
const ytSearch = require("yt-search");

module.exports = async ({ sock, msg, from, command, args }) => {
  const aliases = ["play", "song", "ytmp3", "audio", "mp3"];
  if (!aliases.includes(command)) return;

  const externalContext = {
    forwardingScore: 999,
    isForwarded: true,
    externalAdReply: {
      title: "♻️ Bug MD Audio Downloader ♻️",
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

  if (!args.length) return reply("❗ Please provide a song name.");

  const query = args.join(" ");

  try {
    const results = await ytSearch(query);
    if (!results || !results.videos.length) return reply("❌ No audio found for the query.");

    const video = results.videos[0];
    const videoUrl = video.url;
    const title = video.title;
    const [artist, songTitle] = title.includes(" - ") ? title.split(" - ", 2) : ["Unknown Artist", title];

    await sock.sendMessage(from, { text: "```Downloading...```" }, { quoted: msg });

    const tryApi = async (url) => {
      try {
        const res = await axios.get(url);
        return res.data;
      } catch {
        return null;
      }
    };

    const apis = [
      `https://apis.davidcyriltech.my.id/download/ytmp3?url=${encodeURIComponent(videoUrl)}&apikey=gifted-md`,
      `https://www.dark-yasiya-api.site/download/ytmp3?url=${encodeURIComponent(videoUrl)}`,
      `https://api.dreaded.site/api/ytdl/audio?query=${encodeURIComponent(videoUrl)}`
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
      audio: { url: downloadUrl },
      mimetype: "audio/mp4",
      fileName: `${title}.mp3`,
      contextInfo: {
        externalAdReply: {
          title: "♻️ Bug MD Audio Downloader ♻️",
          body: `🎵 ${artist} - ${songTitle}`,
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
