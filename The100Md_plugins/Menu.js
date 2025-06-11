const os = require('os');

function format(bytes) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Byte';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
}

module.exports = async ({ sock, msg, from, command, config, coms }) => {
  if (command !== 'menu') return;

  // ✅ Confirm it's firing
  await sock.sendMessage(from, {
    text: '✅ Menu command received. Preparing full menu...',
  }, { quoted: msg });

  // System info
  const now = new Date();
  const date = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' });
  const time = now.toLocaleTimeString('en-US', { hour12: false });

  const prefix = config.PREFIX || '!';
  const mode = config.MODE || (config.PUBLIC_MODE === 'true' ? 'Public' : 'Private');
  const owner = config.OWNER_NAME || 'Unknown';
  const botName = config.BOT_NAME || 'Bot';
  const timezone = config.TZ || 'UTC';

  const pluginCount = Object.values(coms).flat().length;
  const ramUsed = format(os.totalmem() - os.freemem());
  const ramTotal = format(os.totalmem());
  const osPlatform = os.platform();

  // Stylized info header
  const infoMsg = `
╭─❖「 *📊 ${botName} SYSTEM INFO* 」❖─╮
│🗓️ Date       : ${date}
│🕒 Time       : ${time}
│🔤 Prefix     : [ ${prefix} ]
│🧭 Mode       : ${mode} mode
│📦 Plugins    : ${pluginCount}
│💾 RAM        : ${ramUsed} / ${ramTotal}
│💻 Platform   : ${osPlatform}
│👑 Owner      : ${owner}
│👨‍💻 Developer : Topu Tech
│🌐 Timezone   : ${timezone}
╰────────────────────────────╯`;

  // Stylized command categories
  let menuMsg = `\n📖 *${botName} Command Menu*\n`;

  for (const category in coms) {
    menuMsg += `\n┌─✦ ${category.toUpperCase()} ✦\n`;
    for (const cmd of coms[category]) {
      menuMsg += `│ ➤ ${prefix}${cmd}\n`;
    }
    menuMsg += `└─────────────⭓\n`;
  }

  menuMsg += `\n🛠️ Powered by *TOPU TECH*\n🔗 Support: https://whatsapp.com/channel/0029VaeRrcnADTOKzivM0S1r`;

  // Final send
  try {
    await sock.sendMessage(from, {
      text: infoMsg + '\n' + menuMsg
    }, { quoted: msg });
  } catch (err) {
    console.error('❌ Menu send error:', err);
    await sock.sendMessage(from, {
      text: `⚠️ Failed to send menu.\n\nError: ${err.message}`
    }, { quoted: msg });
  }
};
