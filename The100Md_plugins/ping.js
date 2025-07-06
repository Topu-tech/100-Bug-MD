const os = require('os');

module.exports = async ({ sock, msg, from, command }) => {
  try {
    if (command !== 'ping' || !msg?.key) return;

    // Step 1: Send quick Pong reply
    const reply = await sock.sendMessage(from, { text: '🏓 Pong!' }, { quoted: msg });

    // Wait 1 second (simulate processing time)
    await new Promise(r => setTimeout(r, 1000));

    // Gather system info
    const start = Date.now();
    const uptime = process.uptime();
    const cpu = os.cpus()[0].model;
    const platform = os.platform();
    const speed = os.cpus()[0].speed;
    const ramUsed = (os.totalmem() - os.freemem()) / (1024 * 1024);
    const ramTotal = os.totalmem() / (1024 * 1024);
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
    } catch (e) {
      // Ignore battery errors silently
    }

    const stats = `
🏓 *PONG UPDATED!*
━━━━━━━━━━━━━━━
⏱️ *Speed:* ${(Date.now() - start)} ms
🕰️ *Uptime:* ${Math.floor(uptime)} seconds
🔋 *Battery:* ${battery}
💻 *CPU:* ${cpu}
⚙️ *Platform:* ${platform}
🚀 *CPU Speed:* ${speed} MHz
📦 *RAM:* ${ramUsed.toFixed(2)} MB / ${ramTotal.toFixed(2)} MB
━━━━━━━━━━━━━━━
`.trim();

    // Step 2: Send detailed stats as a new message (quoted)
    await sock.sendMessage(from, { text: stats }, { quoted: msg });

    // Step 3: Delete original Pong message to reduce clutter
    await sock.sendMessage(from, { delete: reply.key });

  } catch (err) {
    console.error('🔴 ping error:', err);
  }
};
