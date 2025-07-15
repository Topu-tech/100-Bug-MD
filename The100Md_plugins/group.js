const fs = require('fs');
const path = require('path');

const antilinkDBPath = path.join(__dirname, 'antilink.json');
const antilinkDB = fs.existsSync(antilinkDBPath) ? JSON.parse(fs.readFileSync(antilinkDBPath)) : {};

function saveAntilinkDB() {
  fs.writeFileSync(antilinkDBPath, JSON.stringify(antilinkDB, null, 2));
}

// Your contextInfo with newsletter forwarding info
const defaultContextInfo = {
  forwardingScore: 999,
  isForwarded: true,
  forwardedNewsletterMessageInfo: {
    newsletterJid: '120363295141350550@newsletter',
    newsletterName: 'ALONE Queen MD V²',
    serverMessageId: 143
  }
};

// Button to view the channel
const viewChannelButton = {
  urlButton: {
    displayText: 'View Channel',
    url: 'https://whatsapp.com/channel/0029VaeRrcnADTOKzivM0S1r'
  }
};

// Reaction emoji map per command
const commandReactions = {
  antilink: '🚫',
  promote: '👑',
  demote: '⚠️',
  kick: '🦵',
  group: '🔓',
  tagall: '📢',
  grouplink: '🔗',
  setname: '✏️',
  setdesc: '📝',
  admins: '👥',
  info: 'ℹ️',
  default: '✅'
};

// Helper: react then reply with button and context info
async function reactAndReply(sock, from, msg, text, command) {
  const reactEmoji = commandReactions[command] || commandReactions.default;
  try {
    // Send reaction emoji to user's message
    await sock.sendMessage(from, {
      react: {
        text: reactEmoji,
        key: msg.key
      }
    });

    // Then send reply with button and contextInfo
    await sock.sendMessage(from, {
      text,
      footer: '✅ ALONE Queen MD V²',
      templateButtons: [viewChannelButton],
      contextInfo: defaultContextInfo
    }, { quoted: msg });
  } catch (e) {
    console.error('Reaction or reply failed:', e);
  }
}

module.exports = async ({ sock, msg, from, command, args }) => {
  const groupCommands = [
    "group", "tagall", "promote", "demote", "kick",
    "grouplink", "setname", "setdesc", "admins", "info", "antilink"
  ];
  if (!groupCommands.includes(command)) return;

  if (!from.endsWith("@g.us")) {
    return await reactAndReply(sock, from, msg, "❗ This command only works in groups.", command);
  }

  const metadata = await sock.groupMetadata(from);
  const admins = metadata.participants.filter(p => p.admin).map(p => p.id);
  const sender = msg.key.participant || msg.key.remoteJid;
  const isAdmin = admins.includes(sender);

  const botJid = sock.user?.id?.split(':')[0] + '@s.whatsapp.net';

  // Antilink Command Handler
  if (command === "antilink") {
    if (!isAdmin) return reactAndReply(sock, from, msg, "⛔ Admins only can change antilink settings.", command);

    const subCmd = args[0]?.toLowerCase();
    if (!subCmd) {
      return reactAndReply(sock, from, msg,
`⚙️ *Antilink Settings*:
• .antilink on - Enable Antilink
• .antilink off - Disable Antilink
• .antilink remove - Auto-kick users on link
• .antilink warn - Only warn users on link`, command);
    }

    if (["on", "off"].includes(subCmd)) {
      antilinkDB[from] = antilinkDB[from] || {};
      antilinkDB[from].enabled = subCmd === "on";
      saveAntilinkDB();
      return reactAndReply(sock, from, msg, `✅ Antilink has been ${subCmd === "on" ? "enabled" : "disabled"}.`, command);
    }

    if (["remove", "warn"].includes(subCmd)) {
      antilinkDB[from] = antilinkDB[from] || { enabled: false };
      if (!antilinkDB[from].enabled) {
        return reactAndReply(sock, from, msg, "❗ Enable Antilink first using `.antilink on`.", command);
      }
      antilinkDB[from].action = subCmd;
      saveAntilinkDB();
      return reactAndReply(sock, from, msg, `✅ Antilink action set to *${subCmd}*.`, command);
    }

    return reactAndReply(sock, from, msg, "❗ Invalid option. Use `.antilink` to see available settings.", command);
  }

  // Antilink Auto-detection
  const anti = antilinkDB[from];
  if (anti?.enabled && msg.message) {
    const body =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      msg.message.imageMessage?.caption ||
      msg.message.videoMessage?.caption || "";

    const linkPattern = /((https?:\/\/|www\.)[^\s]+|[^\s]+\.(com|net|org|xyz|info|link|shop|io|co|uk|ru|app|me))/gi;

    if (linkPattern.test(body)) {
      if (!admins.includes(sender) && sender !== botJid) {
        try {
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
              mentions: [sender],
              contextInfo: defaultContextInfo
            });
            await sock.groupParticipantsUpdate(from, [sender], "remove");
          } else if (anti.action === "warn") {
            await sock.sendMessage(from, {
              text: `⚠️ *Link Detected!*\n@${sender.split("@")[0]} has been warned.`,
              mentions: [sender],
              contextInfo: defaultContextInfo
            });
          }
        } catch (e) {
          console.error("❌ Antilink Error:", e);
        }
      }
    }
  }

  if (!isAdmin) return reactAndReply(sock, from, msg, "⛔ *Admin Only Command!*", command);

  switch (command) {
    case "group":
      if (!args[0] || !["open", "close"].includes(args[0])) {
        return reactAndReply(sock, from, msg, "Usage:\n.group open → open group\n.group close → close group", command);
      }
      await sock.groupSettingUpdate(from, args[0] === "open" ? "not_announcement" : "announcement");
      return reactAndReply(sock, from, msg, `✅ Group successfully ${args[0] === "open" ? "opened" : "closed"}.`, command);

    case "tagall": {
      const mentions = metadata.participants.map(p => p.id);
      const tagText = mentions.map(p => `@${p.split("@")[0]}`).join(" ");
      return sock.sendMessage(from, {
        text: tagText,
        mentions,
        footer: '✅ ALONE Queen MD V²',
        templateButtons: [viewChannelButton],
        contextInfo: defaultContextInfo
      }, { quoted: msg });
    }

    case "promote":
    case "demote":
      if (!msg.mentionedJid?.length) return reactAndReply(sock, from, msg, "❗ Mention a user.", command);
      await sock.groupParticipantsUpdate(from, [msg.mentionedJid[0]], command);
      return reactAndReply(sock, from, msg, `✅ ${command === "promote" ? "Promoted" : "Demoted"} @${msg.mentionedJid[0].split("@")[0]}`, command);

    case "kick":
      if (!msg.mentionedJid?.length) return reactAndReply(sock, from, msg, "❗ Mention a user to kick.", command);
      await sock.groupParticipantsUpdate(from, [msg.mentionedJid[0]], "remove");
      return reactAndReply(sock, from, msg, `✅ Kicked @${msg.mentionedJid[0].split("@")[0]}`, command);

    case "grouplink":
      try {
        const inviteCode = await sock.groupInviteCode(from);
        return reactAndReply(sock, from, msg, `🔗 *Group Link:*\nhttps://chat.whatsapp.com/${inviteCode}`, command);
      } catch {
        return reactAndReply(sock, from, msg, "❗ Failed to get group invite link. Make sure the bot has permissions.", command);
      }

    case "setname":
      if (!args.length) return reactAndReply(sock, from, msg, "❗ Provide a new group name.", command);
      await sock.groupUpdateSubject(from, args.join(" "));
      return reactAndReply(sock, from, msg, `✅ Group name changed to: ${args.join(" ")}`, command);

    case "setdesc":
      if (!args.length) return reactAndReply(sock, from, msg, "❗ Provide a new group description.", command);
      await sock.groupUpdateDescription(from, args.join(" "));
      return reactAndReply(sock, from, msg, `✅ Group description updated.`, command);

    case "admins": {
      const adminList = admins.map(id => `@${id.split("@")[0]}`).join("\n");
      return sock.sendMessage(from, {
        text: `👑 *Admins List:*\n\n${adminList}`,
        mentions: admins,
        footer: '✅ ALONE Queen MD V²',
        templateButtons: [viewChannelButton],
        contextInfo: defaultContextInfo
      }, { quoted: msg });
    }

    case "info": {
      const info = `
👥 *Group Info*
• Name: ${metadata.subject}
• Members: ${metadata.participants.length}
• Description: ${metadata.desc || "No Description"}
• Owner: ${metadata.owner || "Unknown"}
`;
      return reactAndReply(sock, from, msg, info, command);
    }
  }
};
