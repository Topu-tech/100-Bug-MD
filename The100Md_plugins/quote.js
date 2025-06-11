const axios = require('axios');

module.exports = async ({ sock, msg, from, command }) => {
  if (command !== 'quote') return;

  try {
    const { data } = await axios.get('https://api.quotable.io/random');

    const quoteText = `
📝 *Quote of the Moment*
----------------------------------
“${data.content}”
— *${data.author}*
`;

    await sock.sendMessage(from, { text: quoteText }, { quoted: msg });
  } catch (err) {
    console.error('❌ Quote fetch error:', err);
    await sock.sendMessage(from, {
      text: `⚠️ Could not fetch a quote right now. Please try again later.`
    }, { quoted: msg });
  }
};
