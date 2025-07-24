const fs = require('fs'); const path = require('path'); const { extractUrls, isAdmin, repondre, pickRandom } = require('../lib');

const warnDBPath = path.join(__dirname, '../lib/warn.json'); let warnDB = fs.existsSync(warnDBPath) ? JSON.parse(fs.readFileSync(warnDBPath)) : {};

const saveWarnDB = () => fs.writeFileSync(warnDBPath, JSON.stringify(warnDB, null, 2));

const antilinkPath = path.join(__dirname, '../lib/antilink.json'); let antilinkDB = fs.existsSync(antilinkPath) ? JSON.parse(fs.readFileSync(antilinkPath)) : {};

const saveAntilinkDB = () => fs.writeFileSync(antilinkPath, JSON.stringify(antilinkDB, null, 2));

const contextInfo = { forwardingScore: 999, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: '120363295141350550@newsletter', newsletterName: '100 BUG MD Official Channel', serverMessageId: 143 } };

module.exports = { run: async ({ sock, msg, from, command, args }) => { const sender = msg.key.participant || msg.key.remoteJid; const groupMetadata = msg.isGroup ? await sock.groupMetadata(from) : {}; const participants = groupMetadata.participants || []; const isBotAdmin = participants.find(p => p.id === sock.user.id)?.admin; const isSenderAdmin = isAdmin(participants, sender);

const reply = async (text) => {
  await sock.sendMessage(from, { text, contextInfo }, { quoted: msg });
};

const react = async (emoji) => {
  await sock.sendMessage(from, { react: { text: emoji, key: msg.key } });
};

switch (command) {
  case 'promote': {
    if (!isSenderAdmin) return reply('🚫 You must be admin.');
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    if (!mentioned.length) return reply('❗ Mention a user.');
    await sock.groupParticipantsUpdate(from, mentioned, 'promote');
    react('🆙');
    reply('👑 User promoted.');
    break;
  }
  case 'demote': {
    if (!isSenderAdmin) return reply('🚫 You must be admin.');
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    if (!mentioned.length) return reply('❗ Mention a user.');
    await sock.groupParticipantsUpdate(from, mentioned, 'demote');
    react('📤');
    reply('🙃 User demoted.');
    break;
  }
  case 'tagall': {
    if (!isSenderAdmin) return reply('🚫 You must be admin.');
    const text = args.join(' ') || '📢 Attention everyone!';
    const mentions = participants.map(p => p.id);
    await sock.sendMessage(from, {
      text,
      mentions
    }, { quoted: msg });
    react('🔔');
    break;
  }
  case 'mute': {
    if (!isSenderAdmin || !isBotAdmin) return reply('🚫 Bot or you must be admin.');
    await sock.groupSettingUpdate(from, 'announcement');
    react('🔇');
    reply('🔕 Group muted.');
    break;
  }
  case 'unmute': {
    if (!isSenderAdmin || !isBotAdmin) return reply('🚫 Bot or you must be admin.');
    await sock.groupSettingUpdate(from, 'not_announcement');
    react('🔊');
    reply('🔔 Group unmuted.');
    break;
  }
  case 'leave': {
    if (!isSenderAdmin) return reply('❌ You need to be admin.');
    react('👋');
    await sock.sendMessage(from, { text: '👋 Bye bye!' });
    await sock.groupLeave(from);
    break;
  }
  case 'resetwarn': {
    warnDB[from] = {};
    saveWarnDB();
    reply('✅ All warnings reset.');
    break;
  }
  case 'welcome': {
    if (!isSenderAdmin) return reply('❌ You need to be admin.');
    const set = args[0];
    if (!['on', 'off'].includes(set)) return reply('💡 Usage: welcome on/off');
    const filePath = path.join(__dirname, '../lib/welcome.json');
    const welcomeDB = fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath)) : {};
    if (set === 'on') welcomeDB[from] = true;
    else delete welcomeDB[from];
    fs.writeFileSync(filePath, JSON.stringify(welcomeDB, null, 2));
    reply(`✅ Welcome turned ${set}`);
    break;
  }
  case 'antilink': {
    if (!isSenderAdmin) return reply('🚫 Admin only.');
    const mode = args[0];
    if (!['on', 'off', 'warn', 'remove'].includes(mode)) return reply('⚙️ Use: antilink [on|off|warn|remove]');
    if (mode === 'off') delete antilinkDB[from];
    else antilinkDB[from] = mode;
    saveAntilinkDB();
    reply(`🔗 Antilink set to *${mode}*`);
    break;
  }
}

// Antilink auto action
if (msg.isGroup && msg.message?.conversation && antilinkDB[from]) {
  const text = msg.message.conversation;
  const urls = extractUrls(text);
  if (urls.length > 0 && !isSenderAdmin) {
    const mode = antilinkDB[from];
    await sock.sendMessage(from, { delete: msg.key });

    if (mode === 'warn') {
      const warns = (warnDB[from]?.[sender] || 0) + 1;
      warnDB[from] = warnDB[from] || {};
      warnDB[from][sender] = warns;
      saveWarnDB();

      reply(`⚠️ Link detected. Warn ${warns}/3`);

      if (warns >= 3) {
        await sock.groupParticipantsUpdate(from, [sender], 'remove');
        delete warnDB[from][sender];
        saveWarnDB();
        reply('🚫 User removed after 3 warnings.');
      }
    } else if (mode === 'remove') {
      await sock.groupParticipantsUpdate(from, [sender], 'remove');
      reply('🚫 Link sent. User removed.');
    } else if (mode === 'on') {
      reply(pickRandom([
        'Hey admins🥱...do you like these links? 😂',
        'Give me admin 😤 I miss deleting links 😭',
        'I wish I had admin rights 🤖'
      ]));
    }
  }
}

}, name: 'group', commands: ['promote', 'demote', 'tagall', 'mute', 'unmute', 'leave', 'resetwarn', 'welcome', 'antilink'] };

