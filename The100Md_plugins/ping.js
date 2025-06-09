module.exports = async ({ sock, msg, from, command }) => {
  if (command !== 'ping') return; // 🔁 Only respond to .ping

  await sock.sendMessage(from, { text: '🏓 Pong!' }, { quoted: msg });
};
