const fs = require('fs');
const path = require('path');
const os = require('os');

function format(bytes) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Byte';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
}

module.exports = async ({ sock, msg, from, command, PREFIX = '.', BOT_NAME = 'Bot' }) => {
  if (command !== 'menu') return;

  await sock.sendMessage(from, { text: '✅ Preparing your ALONE MD menu...' }, { quoted: msg });

  // Read plugin commands from plugin folder
  const pluginsDir = path.join(__dirname, 'The100Md_plugins');
  let commandMap = {};

  if (fs.existsSync(pluginsDir)) {
    const files = fs.readdirSync(pluginsDir).filter(f => f.endsWith('.js'));

    for (const file of files) {
      // Use file name (without extension) as command and categorize by folder or default
      const cmdName = file.replace('.js', '');
      const category = 'general'; // Or infer category from filename or metadata if you want

      if (!commandMap[category]) commandMap[category] = [];
      commandMap[category].push(cmdName);
    }
  }

  const now = new Date();
  const date = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' });
  const time = now.toLocaleTimeString('en-US', { hour12: false });
  const ramUsed = format(os.totalmem() - os.freemem());
  const ramTotal = format(os.totalmem());
  const osPlatform = os.platform();

  const infoMsg = `
╭─❖「 *📊 ${BOT_NAME} SYSTEM INFO* 」❖─╮
│🗓️ Date       : ${date}
│🕒 Time       : ${time}
│🔤 Prefix     : [ ${PREFIX} ]
│💾 RAM        : ${ramUsed} / ${ramTotal}
│💻 Platform   : ${osPlatform}
╰────────────────────────────╯`;

  let menuMsg = `📖 *${BOT_NAME} Command Menu*\n`;

  for (const category in commandMap) {
    menuMsg += `\n🔹 *${category.toUpperCase()}*\n`;
    for (const cmd of commandMap[category]) {
      menuMsg += `  ┗ ${PREFIX}${cmd}\n`;
    }
  }

  menuMsg += `\n⚙️ *Powered by Topu Tech*\n📢 Support: https://whatsapp.com/channel/0029VaeRrcnADTOKzivM0S1r`;

  try {
    await sock.sendMessage(from, { text: infoMsg }, { quoted: msg });
    await sock.sendMessage(from, { text: menuMsg }, { quoted: msg });
  } catch (err) {
    console.error('❌ Menu send error:', err);
    await sock.sendMessage(from, { text: `⚠️ Failed to send full menu.\nError: ${err.message}` }, { quoted: msg });
  }
};
