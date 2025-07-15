const axios = require('axios');
const moment = require('moment-timezone');

// 👑 Your newsletter JID
const newsletterJid = '120363295141350550@newsletter';

const sources = [
  async () => {
    const { data } = await axios.get('https://api.quotable.io/random');
    return { type: 'quote', content: data.content, author: data.author };
  },
  async () => {
    const { data } = await axios.get('https://zenquotes.io/api/random');
    return { type: 'quote', content: data[0].q, author: data[0].a };
  },
  async () => {
    const { data } = await axios.get('https://api.adviceslip.com/advice');
    return { type: 'advice', content: data.slip.advice };
  },
  async () => {
    const { data } = await axios.get('https://uselessfacts.jsph.pl/random.json?language=en');
    return { type: 'fact', content: data.text };
  }
];

// 🔁 Function to send daily post
async function sendDailyNewsletter(sock) {
  try {
    const result = await sources[Math.floor(Math.random() * sources.length)]();

    const now = moment().tz('Africa/Arusha');
    const date = now.format('dddd, MMM D, YYYY');
    const time = now.format('HH:mm:ss');

    let header = '';
    let body = '';

    switch (result.type) {
      case 'quote':
        header = '🧠 *Enjoy today\'s quote!*';
        body = `“${result.content}”\n— *${result.author}*`;
        break;
      case 'advice':
        header = '💡 *Lemme advice you bro...*';
        body = `_${result.content}_`;
        break;
      case 'fact':
        header = '🤔 *Did you know?*';
        body = result.content;
        break;
    }

    const finalText = `${header}
━━━━━━━━━━━━━━━━━━━━
${body}

🕒 *Time:* ${time}
📅 *Date:* ${date}
📍 *Type:* ${result.type.toUpperCase()}
`;

    const contextInfo = {
      forwardingScore: 999,
      isForwarded: true,
      forwardedNewsletterMessageInfo: {
        newsletterJid,
        newsletterName: 'THE100BUG-MD Official Channel',
        serverMessageId: 143
      },
      externalAdReply: {
        title: '✅ Topu Tech Verified',
        body: 'Official WhatsApp Bot by Topu Tech',
        thumbnailUrl: 'https://files.catbox.moe/qhv6dt.jpg',
        mediaType: 1,
        sourceUrl: 'https://whatsapp.com/channel/0029VaeRrcnADTOKzivM0S1r',
        showAdAttribution: true,
        renderLargerThumbnail: true
      }
    };

    await sock.sendMessage(newsletterJid, {
      text: finalText,
      contextInfo
    });

    console.log(`[✅] Posted daily content to ${newsletterJid}`);
  } catch (err) {
    console.error('❌ Failed to post newsletter:', err.message || err);
  }
}

module.exports = sendDailyNewsletter;
