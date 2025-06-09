require('dotenv').config();

module.exports = {
  prefix: process.env.PREFIX || '.',
  botName: process.env.BOT_NAME || 'The100-MD',
  sessionId: process.env.SESSION_ID || '',
  ownerNumber: process.env.NUMERO_OWNER || '',

  autoReply: process.env.AUTO_REPLY === 'true',
  autoReplyMsg: process.env.AUTO_REPLY_MSG || '👋 Hello! I’m The100-MD. Use .menu to start.',

  autoStatusView: process.env.AUTO_STATUS_VIEW === 'true'
};
