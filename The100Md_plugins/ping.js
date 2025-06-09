// The100Md_plugins/ping.js
global.commands.set('ping', async ({ sock, msg, from }) => {
  await sock.sendMessage(from, { text: '🏓 Pong!' }, { quoted: msg });
});
