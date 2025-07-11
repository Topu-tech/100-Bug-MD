module.exports = async ({ sock, msg, from, command, args }) => {
  const groupCommands = [
    "group", "tagall", "promote", "demote", "kick", 
    "grouplink", "setname", "setdesc", "admins", "info"
  ];
  if (!groupCommands.includes(command)) return;

  if (!from.endsWith("@g.us")) {
    return await sock.sendMessage(from, { text: "❗ This command works only in groups." }, { quoted: msg });
  }

  const metadata = await sock.groupMetadata(from);
  const admins = metadata.participants.filter(p => p.admin).map(p => p.id);
  const isAdmin = admins.includes(msg.key.participant || msg.key.remoteJid);
  const reply = (text) => sock.sendMessage(from, { text }, { quoted: msg });

  if (!isAdmin) return reply("⛔ *Admin Only Command!*");

  switch (command) {
    case "group":
      if (!args[0] || !["open", "close"].includes(args[0])) {
        return reply("Usage:\n.group open → open group\n.group close → close group");
      }
      await sock.groupSettingUpdate(from, args[0] === "open" ? "not_announcement" : "announcement");
      return reply(`✅ Group successfully ${args[0] === "open" ? "opened" : "closed"}.`);
    
    case "tagall":
      const mentions = metadata.participants.map(p => p.id);
      const tagText = mentions.map(p => `@${p.split("@")[0]}`).join(" ");
      return sock.sendMessage(from, { text: tagText, mentions }, { quoted: msg });

    case "promote":
    case "demote":
      if (!msg.mentionedJid?.length) return reply("❗ Mention a user.");
      await sock.groupParticipantsUpdate(from, [msg.mentionedJid[0]], command);
      return reply(`✅ ${command === "promote" ? "Promoted" : "Demoted"} @${msg.mentionedJid[0].split("@")[0]}`);
    
    case "kick":
      if (!msg.mentionedJid?.length) return reply("❗ Mention a user to kick.");
      await sock.groupParticipantsUpdate(from, [msg.mentionedJid[0]], "remove");
      return reply(`✅ Kicked @${msg.mentionedJid[0].split("@")[0]}`);
    
    case "grouplink":
      const inviteCode = await sock.groupInviteCode(from);
      return reply(`🔗 *Group Link:*\nhttps://chat.whatsapp.com/${inviteCode}`);
    
    case "setname":
      if (!args.length) return reply("❗ Provide a new group name.");
      await sock.groupUpdateSubject(from, args.join(" "));
      return reply(`✅ Group name changed to: ${args.join(" ")}`);
    
    case "setdesc":
      if (!args.length) return reply("❗ Provide a new group description.");
      await sock.groupUpdateDescription(from, args.join(" "));
      return reply(`✅ Group description updated.`);
    
    case "admins":
      const adminList = admins.map(id => `@${id.split("@")[0]}`).join("\n");
      return sock.sendMessage(from, { text: `👑 *Admins List:*\n\n${adminList}`, mentions: admins }, { quoted: msg });

    case "info":
      const info = `
👥 *Group Info*
• Name: ${metadata.subject}
• Members: ${metadata.participants.length}
• Description: ${metadata.desc || "No Description"}
• Owner: ${metadata.owner || "Unknown"}
`;
      return reply(info);
  }
};
