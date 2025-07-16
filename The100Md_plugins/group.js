// ✅ group.js — Full Pro Group Management for 100 BUG MD

const fs = require('fs');
const path = require('path');

const antilinkDBPath = path.join(__dirname, 'antilink.json');
const warnDBPath = path.join(__dirname, 'warnings.json');

const antilinkDB = fs.existsSync(antilinkDBPath) ? JSON.parse(fs.readFileSync(antilinkDBPath)) : {};
const warningsDB = fs.existsSync(warnDBPath) ? JSON.parse(fs.readFileSync(warnDBPath)) : {};

function saveJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// Your newsletter contextInfo for "View Channel" button
const newsletterContextInfo = {
  forwardingScore: 999,
  isForwarded: true,
  forwardedNewsletterMessageInfo: {
    newsletterJid: '120363295141350550@newsletter',
    newsletterName: '100 BUG MD Official Channel',
    serverMessageId: 143
  }
};

module.exports = async function ({ sock, msg, from, command, args, isGroup, isBotAdmin, isAdmin, sender, participants }) {
  if (!isGroup) return;

  // Helper: reply with newsletter context and quoted message
  const reply = async (text, mentions = []) => {
    await sock.sendMessage(from, {
      text,
      mentions,
      contextInfo: newsletterContextInfo
    }, { quoted: msg });
  };

  // Helper: send reaction emoji
  const react = async (emoji) => {
    await sock.sendMessage(from, {
      react: { text: emoji, key: msg.key }
    });
  };

  // Get mentioned user or null
  const mention = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || null;
  const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';

  // ----- AntiLink Monitoring for links in messages -----
  if (antilinkDB[from]) {
    const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || '') || '';
    const linkPattern = /(https?:\/\/[^\s]+)/i;
    if (linkPattern.test(text)) {
      if (!isAdmin) {
        warningsDB[from] = warningsDB[from] || {};
        warningsDB[from][sender] = (warningsDB[from][sender] || 0) + 1;
        saveJSON(warnDBPath, warningsDB);

        const warnCount = warningsDB[from][sender];

        if (warnCount >= 3) {
          await react('❌');
          await reply(`❌ @${sender.split('@')[0]} has reached 3/3 warnings and is removed from the group!`, [sender]);
          await sock.groupParticipantsUpdate(from, [sender], 'remove');
          delete warningsDB[from][sender];
          saveJSON(warnDBPath, warningsDB);
          return;
        } else {
          await react('⚠️');
          await reply(`⚠️ [Antilink Warning]\n\n@${sender.split('@')[0]}, links are not allowed here!\n\n🔁 Warning ${warnCount}/3\n🚫 3 warnings = Auto-Kick`, [sender]);
          return;
        }
      } else {
        // If sender is admin, tease admins if antilink is off
        if (!antilinkDB[from]) {
          await reply(`😏 Hey admins 🥱... do you like these links? 😂\n\nOr give me admin so I can do my job of Antilink! 🙂`);
        }
      }
    }
  }

  // ----- Command Handling -----
  if (!command) return;

  switch (command.toLowerCase()) {
    case 'promote':
      if (!isAdmin || !isBotAdmin) return reply('❌ You need to be admin and bot must be admin to promote.');
      if (!mention) return reply('❗ Please mention a user to promote.');
      await sock.groupParticipantsUpdate(from, [mention], 'promote');
      await react('🆙');
      return reply(`👑 @${mention.split('@')[0]} has been promoted!`, [mention]);

    case 'demote':
      if (!isAdmin || !isBotAdmin) return reply('❌ You need to be admin and bot must be admin to demote.');
      if (!mention) return reply('❗ Please mention a user to demote.');
      await sock.groupParticipantsUpdate(from, [mention], 'demote');
      await react('🔻');
      return reply(`⚠️ @${mention.split('@')[0]} has been demoted.`, [mention]);

    case 'antilink':
      if (!isAdmin) return reply('🚫 Only admins can toggle antilink.');
      if (!args[0]) return reply(`🔗 Antilink is currently *${antilinkDB[from] ? 'ON' : 'OFF'}*\nUse *.antilink on* or *.antilink off*`);
      const on = args[0].toLowerCase() === 'on';
      if (on) {
        antilinkDB[from] = true;
        saveJSON(antilinkDBPath, antilinkDB);
        return reply('✅ Antilink is now *ENABLED*.');
      } else {
        delete antilinkDB[from];
        saveJSON(antilinkDBPath, antilinkDB);
        return reply('❌ Antilink is now *DISABLED*.');
      }

    case 'resetwarn':
      if (!isAdmin) return reply('🚫 Only admins can reset warnings.');
      warningsDB[from] = {};
      saveJSON(warnDBPath, warningsDB);
      return reply('🧹 All warnings have been reset for this group.');

    case 'tagall':
      if (!isAdmin) return reply('🚫 Only admins can tag all.');
      const tagText = participants.map(p => `➤ @${p.id.split('@')[0]}`).join('\n');
      return sock.sendMessage(from, {
        text: `🔊 *Tagging all members:*\n\n${tagText}`,
        mentions: participants.map(p => p.id),
        contextInfo: newsletterContextInfo
      });

    case 'mute':
      if (!isAdmin || !isBotAdmin) return reply('🚫 You and bot must be admins to mute.');
      await sock.groupSettingUpdate(from, 'announcement');
      await react('🔇');
      return reply('🔇 Group is now muted (only admins can send messages).');

    case 'unmute':
      if (!isAdmin || !isBotAdmin) return reply('🚫 You and bot must be admins to unmute.');
      await sock.groupSettingUpdate(from, 'not_announcement');
      await react('🔊');
      return reply('🔊 Group is now unmuted (everyone can send messages).');

    case 'welcome':
      if (!isAdmin) return reply('🚫 Only admins can toggle welcome messages.');
      if (!args[0]) return reply(`👋 Welcome messages are *${antilinkDB['welcome_' + from] ? 'ON' : 'OFF'}*\nUse *.welcome on* or *.welcome off*`);
      if (args[0].toLowerCase() === 'on') {
        antilinkDB['welcome_' + from] = true;
        saveJSON(antilinkDBPath, antilinkDB);
        return reply('📥 Welcome messages *ENABLED*.');
      } else {
        delete antilinkDB['welcome_' + from];
        saveJSON(antilinkDBPath, antilinkDB);
        return reply('📤 Welcome messages *DISABLED*.');
      }

    case 'leave':
      if (!isAdmin) return reply('🚫 Only admins can order me to leave.');
      await reply('👋 Bye bye! Leaving this group as ordered by admin.');
      return sock.groupLeave(from);

    default:
      return; // Ignore other commands here
  }
};
