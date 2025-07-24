// group.js — Pro Edition for 100 BUG MD 🚀

const fs = require("fs"); const path = require("path"); const antilinkDBPath = path.join(__dirname, "antilink.json"); const warnsDBPath = path.join(__dirname, "warns.json");

let antilinkDB = fs.existsSync(antilinkDBPath) ? JSON.parse(fs.readFileSync(antilinkDBPath)) : {}; let warnsDB = fs.existsSync(warnsDBPath) ? JSON.parse(fs.readFileSync(warnsDBPath)) : {};

const contextInfo = { forwardingScore: 999, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363295141350550@newsletter", newsletterName: "100 BUG MD Official Channel", serverMessageId: 143 } };

const fancyReply = async (sock, from, msg, text) => { await sock.sendMessage(from, { react: { text: "📢", key: msg.key } }); await sock.sendMessage(from, { text: `✨ 100 BUG MD

${text}`, contextInfo }, { quoted: msg }); };

const saveAntilinkDB = () => fs.writeFileSync(antilinkDBPath, JSON.stringify(antilinkDB, null, 2)); const saveWarnsDB = () => fs.writeFileSync(warnsDBPath, JSON.stringify(warnsDB, null, 2));

module.exports = async ({ sock, msg, from, command, args, isGroup, groupMetadata, isAdmin, isBotAdmin, sender }) => { if (!isGroup || !command) return; const senderNum = sender.split("@")[0]; const metadata = groupMetadata; const groupId = from;

// Initialize group data if (!antilinkDB[groupId]) antilinkDB[groupId] = { enabled: false, warn: false, remove: false }; if (!warnsDB[groupId]) warnsDB[groupId] = {};

const groupAntilink = antilinkDB[groupId]; const groupWarns = warnsDB[groupId];

// Admin-only if (!isAdmin) return fancyReply(sock, from, msg, "🚫 Admin-only command.");

switch (command) { case "antilink": { const option = (args[0] || '').toLowerCase(); if (!['on', 'off', 'warn', 'remove'].includes(option)) { return fancyReply(sock, from, msg, `🔧 Antilink Settings:

`antilink on` - Delete links from non-admins

`antilink warn` - Delete + warn (3x then remove)

`antilink remove` - Instantly remove on link

`antilink off` - Disable protection` ); }

groupAntilink.enabled = option === 'on' || option === 'warn' || option === 'remove';
groupAntilink.warn = option === 'warn';
groupAntilink.remove = option === 'remove';
saveAntilinkDB();

return fancyReply(sock, from, msg, `✅ Antilink set to *${option.toUpperCase()}*.`);

}

case "tagall": { const members = metadata.participants.map(p => @${p.id.split("@")[0]}).join(" "); return sock.sendMessage(from, { text: `📢 TAG ALL:


${args.join(" ") || 'Hello everyone!'}

${members}`, mentions: metadata.participants.map(p => p.id), contextInfo }, { quoted: msg }); }

case "mute": {
  if (!isBotAdmin) return fancyReply(sock, from, msg, "🤖 I'm not admin!");
  await sock.groupSettingUpdate(from, 'announcement');
  return fancyReply(sock, from, msg, "🔇 Group is now *Muted*.");
}

case "unmute": {
  if (!isBotAdmin) return fancyReply(sock, from, msg, "🤖 I'm not admin!");
  await sock.groupSettingUpdate(from, 'not_announcement');
  return fancyReply(sock, from, msg, "🔊 Group is now *Unmuted*.");
}

case "resetwarn": {
  warnsDB[groupId] = {};
  saveWarnsDB();
  return fancyReply(sock, from, msg, `✅ All warnings cleared.`);
}

case "leave": {
  await fancyReply(sock, from, msg, `👋 Bye! Leaving group...`);
  return sock.groupLeave(from);
}

} };

// Link Monitor module.exports.linkMonitor = async ({ sock, msg, from, isGroup, sender, isBotAdmin, isAdmin }) => { if (!isGroup || !msg.message || !antilinkDB[from] || !antilinkDB[from].enabled) return; const urls = msg.message?.conversation?.match(/https?://\S+/g) || []; if (urls.length === 0) return;

const groupAntilink = antilinkDB[from]; const senderNum = sender.split("@")[0];

if (isAdmin) return; await sock.sendMessage(from, { delete: msg.key });

if (groupAntilink.remove) { await sock.sendMessage(from, { text: ⛔️ *LINK DETECTED!* @${senderNum} removed instantly by *ANTILINK REMOVE*, mentions: [sender], contextInfo }); return sock.groupParticipantsUpdate(from, [sender], 'remove'); }

if (groupAntilink.warn) { warnsDB[from][sender] = (warnsDB[from][sender] || 0) + 1; saveWarnsDB(); const strikes = warnsDB[from][sender];

if (strikes >= 3) {
  await sock.sendMessage(from, {
    text: `🚫 *@${senderNum}* warned 3x. Removed.`,
    mentions: [sender],
    contextInfo
  });
  delete warnsDB[from][sender];
  saveWarnsDB();
  return sock.groupParticipantsUpdate(from, [sender], 'remove');
} else {
  await sock.sendMessage(from, {
    text: `⚠️ *Warning ${strikes}/3* for @${senderNum} - Sending links is prohibited!`,
    mentions: [sender],
    contextInfo
  });
}
return;

}

// Only 'on' mode — no warn/remove await sock.sendMessage(from, { text: 😒 Hey admins... Do you like these links? 😂 Maybe give me admin to protect this group better 🤖, contextInfo }); };

