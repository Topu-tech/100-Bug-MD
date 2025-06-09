module.exports = {
  name: 'ping',
  description: 'Replies with pong!',
  command: async ({ sock, m }) => {
    await sock.sendMessage(m.chat, { text: '♻️pong!' }, { quoted: m });
  }
};
