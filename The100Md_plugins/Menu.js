const os = require('os');

function format(bytes) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Byte';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
}

module.exports = async ({ sock, msg, from, command, config, coms }) => {
  if (command !== 'menu') return;

  // ✅ Acknowledge menu command
  await sock.sendMessage(from, {
    text: '✅ Preparing your ALONE MD menu...'
  }, { quoted: msg });

  // System and config info
  const now = new Date();
  const date = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' });
  const time = now.toLocaleTimeString('en-US', { hour12: false });
  const prefix = config.PREFIX || '.';
  const owner = config.OWNER_NAME || 'Unknown';
  const botName = config.BOT_NAME || 'Bot';
  const timezone = config.TZ || 'UTC';
  const pluginCount = Object.values(coms).flat().length;
  const ramUsed = format(os.totalmem() - os.freemem());
  const ramTotal = format(os.totalmem());
  const osPlatform = os.platform();

  // 🧠 Info message (PUBLIC_MODE removed)
  const infoMsg = `
╭─❖「 *📊 ${botName} SYSTEM INFO* 」❖─╮
│🗓️ Date       : ${date}
│🕒 Time       : ${time}
│🔤 Prefix     : [ ${prefix} ]
│📦 Plugins    : ${pluginCount}
│💾 RAM        : ${ramUsed} / ${ramTotal}
│💻 Platform   : ${osPlatform}
│👑 Owner      : ${owner}
│👨‍💻 Developer : Topu Tech
│🌐 Timezone   : ${timezone}
╰────────────────────────────╯`;

  // 📖 Command list
  let menuMsg = `📖 *${botName} Command Menu*\n`;

  for (const category in coms) {
    menuMsg += `\n🔹 *${category.toUpperCase()}*\n`;
    for (const cmd of coms[category]) {
      menuMsg += `  ┗ ${prefix}${cmd}\n`;
    }
  }

  menuMsg += `\n⚙️ *Powered by Topu Tech*\n📢 Support: https://whatsapp.com/channel/0029VaeRrcnADTOKzivM0S1r`;

  // 📨 Send both messages
  try {
    await sock.sendMessage(from, { text: infoMsg }, { quoted: msg });
    await sock.sendMessage(from, { text: menuMsg }, { quoted: msg });
  } catch (err) {
    console.error('❌ Menu send error:', err);
    await sock.sendMessage(from, {
      text: `⚠️ Failed to send full menu.\nError: ${err.message}`
    }, { quoted: msg });
  }
};
