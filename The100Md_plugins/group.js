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
  const sender = msg.key.participant || msg.key.remoteJid;
  const botJid = sock.user?.id?.split(':')[0] + '@s.whatsapp.net';
  const isAdmin = admins.includes(sender);
  const reply = (text) => sock.sendMessage(from, { text }, { quoted: msg });

  if (!isAdmin) return reply("⛔ *Admin Only Command!*");

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

  // Antilink Link Auto Detection (Outside command switch)
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
        if (anti.action === "remove") {
          try {
            await sock.sendMessage(from, {
              text: `🚫 *Link Detected!*\nUser removed: @${sender.split("@")[0]}`,
              mentions: [sender]
            });
            await sock.groupParticipantsUpdate(from, [sender], "remove");
          } catch (e) {
            console.error("❌ Kick Error:", e);
          }
        } else if (anti.action === "warn") {
          await sock.sendMessage(from, {
            text: `⚠️ *Link Detected!*\n@${sender.split("@")[0]} has been warned.`,
            mentions: [sender]
          });
        }
      }
    }
  }
};
