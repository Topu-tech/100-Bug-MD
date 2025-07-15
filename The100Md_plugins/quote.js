const axios = require('axios');
const moment = require('moment-timezone');

// ✨ Add your newsletter JID here
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

const aliases = ['quote', 'fact', 'advice', 'wisdom', 'inspire'];

module.exports = {
  name: 'quote',
  description: 'Get a random quote, fact, or advice — auto-posts to newsletter too!',
  type: 'fun',
  async run({ sock, msg, from, command }) {
    if (!aliases.includes(command)) return;

    try {
      const result = await sources[Math.floor(Math.random() * sources.length)]();

      const now = moment().tz('Africa/Arusha');
      const date = now.format('dddd, MMM D, YYYY');
      const time = now.format('HH:mm:ss');
      const sender = msg.pushName || from.split('@')[0];

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
👤 *User:* ${sender}
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

      // 1️⃣ Send to the user who invoked the command
      await sock.sendMessage(from, {
        text: finalText,
        contextInfo
      }, { quoted: msg });

      // 2️⃣ Auto-post to newsletter if not already triggered from it
      if (from !== newsletterJid) {
        try {
          await sock.sendMessage(newsletterJid, {
            text: finalText,
            contextInfo
          });
          console.log(`[✅] Sent quote to newsletter: ${newsletterJid}`);
        } catch (e) {
          console.warn('⚠️ Failed to send to newsletter:', e.message || e);
        }
      }

    } catch (err) {
      console.error('❌ Quote command error:', err.message || err);
      await sock.sendMessage(from, {
        text: `⚠️ Could not fetch anything right now. Please try again later.`
      }, { quoted: msg });
    }
  }
};
