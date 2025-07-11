const os = require('os');

function format(bytes) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Byte';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
}

const contextInfo = {
  forwardingScore: 999,
  isForwarded: true,
  externalAdReply: {
    title: '🧠 THE100BUG-MD • Commands',
    body: 'Powered by Topu Tech • WhatsApp Bot',
    thumbnailUrl: 'https://files.catbox.moe/qhv6dt.jpg',
    mediaType: 1,
    sourceUrl: 'https://whatsapp.com/channel/0029VaeRrcnADTOKzivM0S1r',
    showAdAttribution: false,
    renderLargerThumbnail: true
  }
};

module.exports = async ({ sock, msg, from, command, PREFIX = '.', BOT_NAME = 'THE100BUG-MD' }) => {
  if (command !== 'menu') return;

  try {
    const pluginList = global.loadedPlugins || [];
    const commandNames = pluginList.map(p => p.name?.replace('.js', '')).filter(Boolean);

    const now = new Date();
    const date = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' });
    const time = now.toLocaleTimeString('en-US', { hour12: false });
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

    const categories = {
      "Group": ["group", "tagall", "promote", "demote", "kick", "grouplink", "setname", "setdesc", "admins", "info"],
      "Downloader": ["song", "video"],
      "System": ["ping", "menu", "alive", "owner", "quote"]
    };

    let categorizedMenu = "🛠 *Command Menu:*\n\n";

    for (const [category, cmds] of Object.entries(categories)) {
      const listed = cmds
        .filter(cmd => commandNames.includes(cmd))
        .map(cmd => `▪️ ${PREFIX}${cmd}`)
        .join('\n');
      if (listed) {
        categorizedMenu += `📂 *${category}*\n${listed}\n\n`;
      }
    }

    const footer = `🌐 *Topu Tech™ | Bug Bot 2025*\n📢`;

    const finalText = systemInfo + '\n' + categorizedMenu + footer;

    await sock.sendMessage(from, { text: finalText, contextInfo }, { quoted: msg });
  } catch (err) {
    console.error('❌ Menu error:', err);
    await sock.sendMessage(from, {
      text: `⚠️ Failed to show menu.\nError: ${err.message}`,
      contextInfo
    }, { quoted: msg });
  }
};
