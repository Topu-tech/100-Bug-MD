const os = require('os');
const axios = require('axios');

const VERIFIED_JIDS = [
  "255673750170@s.whatsapp.net"
];

function format(bytes) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Byte';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
}

function isValidTimezone(tz) {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

async function getRandomEnrichment() {
  const types = ['fact', 'advice', 'quote'];
  const selected = types[Math.floor(Math.random() * types.length)];

  try {
    switch (selected) {
      case 'fact': {
        const res = await axios.get('https://uselessfacts.jsph.pl/api/v2/facts/random');
        return `💡 *Did you know?* ${res.data.text}`;
      }
      case 'advice': {
        const res = await axios.get('https://api.adviceslip.com/advice');
        return `🧠 *Lemme advice you bro:* ${res.data.slip.advice}`;
      }
      case 'quote': {
        const res = await axios.get('https://zenquotes.io/api/random');
        const quote = res.data[0];
        return `📝 *Enjoy today's quote:* "${quote.q}" — ${quote.a}`;
      }
      default:
        return "🌟 Keep shining!";
    }
  } catch (err) {
    return "💬 Life is like code — keep debugging and moving forward.";
  }
}

module.exports = async ({ sock, msg, from, command, PREFIX = '.', BOT_NAME = 'THE100BUG-MD', TIME_ZONE }) => {
  if (command !== 'menu') return;

  try {
    const timezoneToUse = isValidTimezone(TIME_ZONE) ? TIME_ZONE : 'Africa/Arusha';

    const now = new Date();

    const date = new Intl.DateTimeFormat('en-US', {
      timeZone: timezoneToUse,
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(now);

    const time = new Intl.DateTimeFormat('en-US', {
      timeZone: timezoneToUse,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(now);

    const pluginList = global.loadedPlugins || [];
    const commandNames = pluginList.map(p => p.name?.replace('.js', '')).filter(Boolean);

    const ramUsed = format(os.totalmem() - os.freemem());
    const ramTotal = format(os.totalmem());
    const osPlatform = os.platform();

    const systemInfo = `
╭───「 *BOT SYSTEM INFO* 」───╮
│ 📆 Date     : ${date}
│ 🕒 Time     : ${time}
│ ⚙️ Prefix   : ${PREFIX}
│ 🧠 Memory   : ${ramUsed} / ${ramTotal}
│ 💻 Platform : ${osPlatform}
╰────────────────────────────╯
`;

    const commandList = commandNames.length
      ? `🛠 *Command List* (${commandNames.length} total):\n\n` +
        commandNames.sort().map(cmd => `▪️ ${PREFIX}${cmd}`).join('\n')
      : '⚠️ No commands found.';

    // 🔁 Fetch enrichment message
    const enrichment = await getRandomEnrichment();

    const finalText = `
✨ *『 𝑾𝑬𝑳𝑪𝑶𝑴𝑬 𝑻𝑶 𝑻𝑯𝑬 𝑴𝑨𝑱𝑬𝑺𝑻𝑰𝑪 𝑨𝑳𝑶𝑵𝑬 𝑩𝑶𝑻 』* ✨
👋🏽 *Greetings, Royal User!*
Here's your personalized system overview & command portal:

${systemInfo}

${commandList}

${enrichment}

━━━━━━━━━━━━━━━
🌐 *𝑻𝒐𝒑𝒖 𝑻𝒆𝒄𝒉™ | 𝑩𝒖𝒈 𝑩𝒐𝒕 𝟐𝟎𝟐𝟓*
📢 Join our Kingdom: https://whatsapp.com/channel/0029VaeRrcnADTOKzivM0S1r
👑 *Powerfully crafted with purpose.*
`;

    const isVerified = VERIFIED_JIDS.includes(msg.sender);

    const contextInfo = {
      forwardingScore: 999,
      isForwarded: true,
      forwardedNewsletterMessageInfo: {
        newsletterJid: '120363295141350550@newsletter',
        newsletterName: 'ALONE Queen MD V²',
        serverMessageId: 143
      },
      externalAdReply: {
        title: isVerified ? '✅ Topu Tech Verified' : '🧠 THE100BUG-MD • Commands',
        body: isVerified
          ? 'Official WhatsApp Bot by Topu Tech'
          : 'Powered by Topu Tech • WhatsApp Bot',
        thumbnailUrl: 'https://files.catbox.moe/qhv6dt.jpg',
        mediaType: 1,
        sourceUrl: 'https://whatsapp.com/channel/0029VaeRrcnADTOKzivM0S1r',
        showAdAttribution: true,
        renderLargerThumbnail: true
      }
    };

    await sock.sendMessage(from, { text: finalText, contextInfo }, { quoted: msg });

  } catch (err) {
    console.error('❌ Menu error:', err);
    await sock.sendMessage(from, {
      text: `⚠️ Failed to show menu.\nError: ${err.message}`,
      contextInfo: {
        forwardingScore: 999,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
          newsletterJid: '120363295141350550@newsletter',
          newsletterName: 'ALONE Queen MD V²',
          serverMessageId: 143
        },
        externalAdReply: {
          title: '❌ Menu Error',
          body: 'Something went wrong',
          thumbnailUrl: 'https://files.catbox.moe/qhv6dt.jpg',
          mediaType: 1,
          sourceUrl: 'https://whatsapp.com/channel/0029VaeRrcnADTOKzivM0S1r',
          showAdAttribution: true,
          renderLargerThumbnail: true
        }
      }
    }, { quoted: msg });
  }
};
