const os = require('os');

module.exports = async ({ sock, msg, from, command }) => {
  try {
    if (command !== 'ping' || !msg?.key) return;

    // Step 1: Quick Ping Response
    const reply = await sock.sendMessage(from, { text: '🏓 Pong!' }, { quoted: msg });

    // Step 2: Delay & Calculate Stats
    const start = Date.now();
    const uptime = process.uptime();
    const cpu = os.cpus()[0].model;
    const platform = os.platform();
    const speed = os.cpus()[0].speed;
    const ram = (os.totalmem() - os.freemem()) / (1024 * 1024);
    const totalRam = os.totalmem() / (1024 * 1024);
    let battery = 'Unknown';

    try {
      const batteryStatus = await sock.query({
        tag: 'iq',
        attrs: { to: 'status@broadcast', type: 'get', xmlns: 'status' },
        content: [{ tag: 'battery', attrs: {}, content: [] }]
      });

      if (batteryStatus?.content?.[0]?.attrs?.value) {
        battery = batteryStatus.content[0].attrs.value + '%';
      }
    } catch (e) {}

    const stats = `
🏓 *PONG UPDATED!*
━━━━━━━━━━━━━━━
⏱️ *Speed:* ${(Date.now() - start)} ms
🕰️ *Uptime:* ${Math.floor(uptime)} seconds
🔋 *Battery:* ${battery}
💻 *CPU:* ${cpu}
⚙️ *Platform:* ${platform}
🚀 *CPU Speed:* ${speed} MHz
📦 *RAM:* ${ram.toFixed(2)} MB / ${totalRam.toFixed(2)} MB
━━━━━━━━━━━━━━━
`.trim();

    // Step 3: Edit Reply (simulate by deleting & resending)
    await sock.sendMessage(from, { text: stats }, { quoted: msg, edit: reply.key });

  } catch (err) {
    console.error('🔴 ping error:', err);
  }
};
