require('dotenv').config();

const toBool = (x) => x === 'true' || x === 'yes';

module.exports = {
  // Session
  SESSION_ID: process.env.SESSION_ID || '',

  // Bot Identity
  BOT_NAME: process.env.BOT_NAME || 'The100Bug-MD',
  OWNER_NAME: process.env.OWNER_NAME || 'Toputech',
  OWNER_NUMBER: process.env.OWNER_NUMBER || '255673750170',

  // Behavior Toggles
  PREFIX: process.env.PREFIX || '.',
  AUTO_REPLY: toBool(process.env.AUTO_REPLY),
  AUTO_REPLY_MSG: process.env.AUTO_REPLY_MSG || '👋 Hello! I’m The100-MD. Use .menu to start.',
  AUTO_STATUS_VIEW: toBool(process.env.AUTO_STATUS_VIEW),
  AUTO_READ_MESSAGES: toBool(process.env.AUTO_READ_MESSAGES),
  AUTO_READ_STATUS: toBool(process.env.AUTO_READ_STATUS),
  AUTO_LIKE_STATUS: toBool(process.env.AUTO_LIKE_STATUS),
  AUTO_DOWNLOAD_STATUS: toBool(process.env.AUTO_DOWNLOAD_STATUS),
  AUTO_REACTION: toBool(process.env.AUTO_REACTION),
  AUTOBIO: toBool(process.env.AUTOBIO),

  // Permissions and Features
  PM_PERMIT: toBool(process.env.PM_PERMIT),
  CHATBOT: toBool(process.env.CHATBOT),
  PUBLIC_MODE: toBool(process.env.PUBLIC_MODE),
  ANTI_DELETE_MESSAGE: toBool(process.env.ANTI_DELETE_MESSAGE),
  ANTICALL: toBool(process.env.ANTICALL),
  ANTICALL_MSG: process.env.ANTICALL_MSG || '📵 Please don’t call the bot!',

  // PRESENCE setting: available | composing | recording | unavailable
  PRESENCE: process.env.PRESENCE || '',

  // Admin Tools
  WARN_COUNT: parseInt(process.env.WARN_COUNT || '3'),

  // Deployment Info
  HEROKU_API_KEY: process.env.HEROKU_API_KEY || '',
  HEROKU_APP_NAME: process.env.HEROKU_APP_NAME || '',
};
