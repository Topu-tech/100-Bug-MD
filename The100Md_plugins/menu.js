const fs = require('fs');
const path = require('path');
const os = require('os');

function format(bytes) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Byte';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
}

// Recursively find all .js files in plugins folder
function findAllPluginCommands(dir, commandSet = new Set()) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findAllPluginCommands(fullPath, commandSet);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      try {
        const plugin = require(fullPath);
        if (typeof plugin === 'function') {
          commandSet.add(entry.name.replace('.js', ''));
        } else if (plugin?.commands && Array.isArray(plugin.commands)) {
          plugin.commands.forEach(cmd => commandSet.add(cmd));
        } else {
          commandSet.add(entry.name.replace('.js', ''));
        }
      } catch (e) {
        console.warn(`⚠️ Failed to load plugin: ${entry.name}`);
      }
    }
  }

  return [...commandSet].sort();
}

module.exports = async ({ sock, msg, from, command, PREFIX = '.', BOT_NAME = 'Bot' }) => {
  if (command !== 'menu') return;

  await sock.sendMessage(from, { text: '✅ Preparing your ALONE MD menu...' }, { quoted: msg });

  const pluginPath = path.join(__dirname, 'The100Md_plugins');
  const commands = fs.existsSync(pluginPath) ? findAllPluginCommands(pluginPath) : [];

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

  let menuMsg = `📖 *${BOT_NAME} Command Menu*\n\n`;
  for (const cmd of commands) {
    menuMsg += `  ┗ ${PREFIX}${cmd}\n`;
  }

  menuMsg += `\n⚙️ *Powered by Topu Tech*\n📢 Support: https://whatsapp.com/channel/0029VaeRrcnADTOKzivM0S1r`;

  try {
    await sock.sendMessage(from, { text: infoMsg }, { quoted: msg });
    await sock.sendMessage(from, { text: menuMsg }, { quoted: msg });
  } catch (err) {
    console.error('❌ Menu send error:', err);
    await sock.sendMessage(from, { text: `⚠️ Failed to send menu.\nError: ${err.message}` }, { quoted: msg });
  }
};
