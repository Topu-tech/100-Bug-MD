module.exports = async ({ sock, msg, from, command, args }) => {
  const aliases = ["group"];
  if (!aliases.includes(command)) return;

  if (!msg.key.remoteJid.endsWith("@g.us")) {
    return await sock.sendMessage(from, { text: "❗ This command only works in groups." }, { quoted: msg });
  }

  if (!args[0] || !["open", "close"].includes(args[0])) {
    return await sock.sendMessage(from, { text: "Usage:\n.group open — open group\n.group close — close group" }, { quoted: msg });
  }

  const action = args[0] === "open" ? "not_announcement" : "announcement";
  await sock.groupSettingUpdate(from, action);
  await sock.sendMessage(from, { text: `✅ Group successfully ${args[0] === "open" ? "opened" : "closed"}.` }, { quoted: msg });
};
