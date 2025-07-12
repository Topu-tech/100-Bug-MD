const os = require('os');

// ✅ Define verified JIDs here
const VERIFIED_JIDS = [
  "255673750170@s.whatsapp.net" // Your real number
];

function format(bytes) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Byte';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
}

function isValidTimezone(tz) {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

module.exports = async ({ sock, msg, from, command, PREFIX = '.', BOT_NAME = 'THE100BUG-MD', TIME_ZONE }) => {
  if (command !== 'menu') return;

  try {
    const timezoneToUse = isValidTimezone(TIME_ZONE) ? TIME_ZONE : 'Africa/Arusha';

    const now = new Date();

    const date = new Intl.DateTimeFormat('en-US', {
      timeZone: timezoneToUse,
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(now);

    const time = new Intl.DateTimeFormat('en-US', {
      timeZone: timezoneToUse,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(now);

    const pluginList = global.loadedPlugins || [];
    const commandNames = pluginList.map(p => p.name?.replace('.js', '')).filter(Boolean);

    const ramUsed = format(os.totalmem() - os.freemem());
    const ramTotal = format(os.totalmem());
    const osPlatform = os.platform();

    const systemInfo = `
╭───「 *BOT SYSTEM INFO* 」───╮
│ 📆 Date     : ${date}
│ 🕒 Time     : ${time}
│ ⚙️ Prefix   : ${PREFIX}
│ 🧠 Memory   : ${ramUsed} / ${ramTotal}
│ 💻 Platform : ${osPlatform}
╰────────────────────────────╯
`;

    const commandList = commandNames.length
      ? `🛠 *Command List* (${commandNames.length} total):\n\n` +
        commandNames.sort().map(cmd => `▪️ ${PREFIX}${cmd}`).join('\n')
      : '⚠️ No commands found.';

    const footer = `\n\n🌐 *Topu Tech™ | Bug Bot 2025*\n📢 Join: https://whatsapp.com/channel/0029VaeRrcnADTOKzivM0S1r`;

    const finalText = systemInfo + '\n' + commandList + footer;

    // ✅ Check if sender is in verified list
    const isVerified = VERIFIED_JIDS.includes(msg.sender);

    const contextInfo = {
      forwardingScore: 999,
      isForwarded: true,
      externalAdReply: {
        title: isVerified ? '✅ Topu Tech Verified' : '🧠 THE100BUG-MD • Commands',
        body: isVerified
          ? 'Official WhatsApp Bot by Topu Tech'
          : 'Powered by Topu Tech • WhatsApp Bot',
        thumbnailUrl: 'https://files.catbox.moe/qhv6dt.jpg',
        mediaType: 1,
        sourceUrl: 'https://whatsapp.com/channel/0029VaeRrcnADTOKzivM0S1r',
        showAdAttribution: isVerified, // ✅ shows verified badge
        renderLargerThumbnail: true
      }
    };

    await sock.sendMessage(from, { text: finalText, contextInfo }, { quoted: msg });

  } catch (err) {
    console.error('❌ Menu error:', err);
    await sock.sendMessage(from, {
      text: `⚠️ Failed to show menu.\nError: ${err.message}`,
      contextInfo: {
        externalAdReply: {
          title: '❌ Menu Error',
          body: 'Something went wrong',
          thumbnailUrl: 'https://files.catbox.moe/qhv6dt.jpg',
          mediaType: 1,
          sourceUrl: 'https://whatsapp.com/channel/0029VaeRrcnADTOKzivM0S1r',
          showAdAttribution: false,
          renderLargerThumbnail: true
        }
      }
    }, { quoted: msg });
  }
};
