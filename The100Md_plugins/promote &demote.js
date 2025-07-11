module.exports = async ({ sock, msg, from, command, args }) => {
  const aliases = ["promote", "demote"];
  if (!aliases.includes(command)) return;

  if (!msg.key.remoteJid.endsWith("@g.us")) {
    return await sock.sendMessage(from, { text: "❗ This command only works in groups." }, { quoted: msg });
  }

  if (!msg.mentionedJid?.length) {
    return await sock.sendMessage(from, { text: `❗ Mention a user to ${command}.` }, { quoted: msg });
  }

  const user = msg.mentionedJid[0];
  if (command === "promote") {
    await sock.groupParticipantsUpdate(from, [user], "promote");
    await sock.sendMessage(from, { text: `✅ Promoted @${user.split("@")[0]}`, mentions: [user] }, { quoted: msg });
  } else {
    await sock.groupParticipantsUpdate(from, [user], "demote");
    await sock.sendMessage(from, { text: `✅ Demoted @${user.split("@")[0]}`, mentions: [user] }, { quoted: msg });
  }
};
