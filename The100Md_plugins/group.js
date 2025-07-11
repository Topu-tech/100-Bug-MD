const fs = require('fs');
const path = require('path');

const antilinkDBPath = path.join(__dirname, 'antilink.json');
const antilinkDB = fs.existsSync(antilinkDBPath) ? JSON.parse(fs.readFileSync(antilinkDBPath)) : {};

function saveAntilinkDB() {
  fs.writeFileSync(antilinkDBPath, JSON.stringify(antilinkDB, null, 2));
}

module.exports = async ({ sock, msg, from, command, args }) => {
  const groupCommands = [
    "group", "tagall", "promote", "demote", "kick",
    "grouplink", "setname", "setdesc", "admins", "info", "antilink"
  ];
  if (!groupCommands.includes(command)) return;

  if (!from.endsWith("@g.us")) {
    return await sock.sendMessage(from, { text: "❗ This command works only in groups." }, { quoted: msg });
  }

  const metadata = await sock.groupMetadata(from);
  const admins = metadata.participants.filter(p => p.admin).map(p => p.id);
  const isAdmin = admins.includes(msg.key.participant || msg.key.remoteJid);
  const reply = (text) => sock.sendMessage(from, { text }, { quoted: msg });

  const botJid = sock.user?.id?.split(':')[0] + '@s.whatsapp.net';

  // Antilink Command Handler
  if (command === "antilink") {
    const subCmd = args[0]?.toLowerCase();

    if (!subCmd) {
      return reply(
`⚙️ *Antilink Settings*:
• .antilink on - Enable Antilink
• .antilink off - Disable Antilink
• .antilink remove - Auto-kick users on link
• .antilink warn - Only warn users on link`
      );
    }

    if (subCmd === "on" || subCmd === "off") {
      antilinkDB[from] = antilinkDB[from] || {};
      antilinkDB[from].enabled = subCmd === "on";
      saveAntilinkDB();
      return reply(`✅ Antilink has been ${subCmd === "on" ? "enabled" : "disabled"}.`);
    }

    if (subCmd === "remove" || subCmd === "warn") {
      antilinkDB[from] = antilinkDB[from] || { enabled: false };
      if (!antilinkDB[from].enabled) {
        return reply("❗ Enable Antilink first using `.antilink on`.");
      }
      antilinkDB[from].action = subCmd;
      saveAntilinkDB();
      return reply(`✅ Antilink action set to *${subCmd}*.`);
    }

    return reply("❗ Invalid option. Use .antilink to see available settings.");
  }

  // Antilink Message Checker (Auto Detection)
  const anti = antilinkDB[from];
  if (anti?.enabled && msg.message) {
    const body =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      msg.message.imageMessage?.caption ||
      msg.message.videoMessage?.caption || "";

    const linkPattern = /((https?:\/\/|www\.)[^\s]+|[^\s]+\.(com|net|org|xyz|info|link|shop|io|co|uk|ru|app|me))/gi;

    if (linkPattern.test(body)) {
      const sender = msg.key.participant || msg.key.remoteJid;
      if (!admins.includes(sender) && sender !== botJid) {
        try {
          // Delete the link message first
          await sock.sendMessage(from, {
            delete: {
              remoteJid: from,
              fromMe: false,
              id: msg.key.id,
              participant: sender
            }
          });

          if (anti.action === "remove") {
            await sock.sendMessage(from, {
              text: `🚫 *Link Detected!*\nUser removed: @${sender.split("@")[0]}`,
              mentions: [sender]
            });
            await sock.groupParticipantsUpdate(from, [sender], "remove");
          } else if (anti.action === "warn") {
            await sock.sendMessage(from, {
              text: `⚠️ *Link Detected!*\n@${sender.split("@")[0]} has been warned.`,
              mentions: [sender]
            });
          }
        } catch (e) {
          console.error("❌ Antilink Error:", e);
        }
      }
    }
  }

  // Group Commands Switch
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
