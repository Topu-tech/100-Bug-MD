const os = require('os');

module.exports = async ({ sock, msg, from, command }) => {
  try {
    if (command !== 'ping' || !msg?.key) return;

    // Step 1: Send quick Pong reply
    await sock.sendMessage(from, { text: '🏓 Pong!' }, { quoted: msg });

    // Simulate delay
    await new Promise(r => setTimeout(r, 1000));

    // Gather system info
    const uptime = process.uptime();
    const cpu = os.cpus()[0].model;
    const platform = os.platform();
    const speed = os.cpus()[0].speed;
    const ramUsed = (os.totalmem() - os.freemem()) / (1024 * 1024);
    const ramTotal = os.totalmem() / (1024 * 1024);
    let battery = 'Unknown';

    // Try to fetch battery status (optional)
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
      // Ignore battery fetch errors
    }

    // Simulate a fake ping value (1000ms - 1999ms)
    const simulatedPing = Math.floor(Math.random() * 1000) + 1000;

    const stats = `
🏓 *PONG UPDATED!*
━━━━━━━━━━━━━━━
⏱️ *Speed:* ${simulatedPing} ms
🕰️ *Uptime:* ${Math.floor(uptime)} seconds
🔋 *Battery:* ${battery}
💻 *CPU:* ${cpu}
⚙️ *Platform:* ${platform}
🚀 *CPU Speed:* ${speed} MHz
📦 *RAM:* ${ramUsed.toFixed(2)} MB / ${ramTotal.toFixed(2)} MB
━━━━━━━━━━━━━━━
`.trim();

    // Step 2: Send detailed stats
    await sock.sendMessage(from, { text: stats }, { quoted: msg });

    // ❌ Step 3: Do NOT delete initial message anymore

  } catch (err) {
    console.error('🔴 ping error:', err);
  }
};
