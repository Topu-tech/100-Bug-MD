// ping.js
module.exports = async ({ sock, msg, from, command }) => {
  try {
    if (command === 'ping') {
      const text = '🏓 Pong!';
      if (!msg || !msg.key) return;
      await sock.sendMessage(from, { text }, { quoted: msg });
    }
  } catch (err) {
    console.error('🔴 ping error:', err);
  }
};
