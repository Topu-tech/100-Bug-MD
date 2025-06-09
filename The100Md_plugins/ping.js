module.exports = async ({ sock, msg, command, from }) => {
  if (command === 'ping') {
    await sock.sendMessage(from, { text: '🏓 Pong!' }, { quoted: msg });
  }
};
