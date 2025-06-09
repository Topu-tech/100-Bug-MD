module.exports = async ({ sock, msg, from, command, config }) => {
  if (command !== 'menu') return;

  const botName = config.BOT_NAME || 'Bot';

  const menuText = `
═══════════════════════════════
        🤖✨ *${botName} Commands* ✨🤖
═══════════════════════════════

🔊  *alive*   — Check if bot is alive with random audio 🎧
📋  *menu*    — Display this command menu 🗒️

═══════════════════════════════
💡 Type commands using: *!commandname*
═══════════════════════════════
  `;

  await sock.sendMessage(from, { text: menuText.trim() }, { quoted: msg });
};
