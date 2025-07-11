module.exports = async ({ sock, msg, from, command, args }) => {
  const aliases = ["tagall"];
  if (!aliases.includes(command)) return;

  if (!msg.key.remoteJid.endsWith("@g.us")) {
    return await sock.sendMessage(from, { text: "❗ This command only works in groups." }, { quoted: msg });
  }

  const metadata = await sock.groupMetadata(from);
  const participants = metadata.participants.map((p) => p.id);
  const mentions = participants;

  await sock.sendMessage(from, {
    text: `👥 Tagging all ${participants.length} members:\n\n` + participants.map((p) => `@${p.split("@")[0]}`).join(" "),
    mentions,
  }, { quoted: msg });
};
