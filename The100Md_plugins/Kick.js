module.exports = async ({ sock, msg, from, command, config }) => {
  if (command !== 'kick') return;

  if (!from.endsWith('@g.us')) {
    return sock.sendMessage(from, { text: '❌ This command is only for group use.' }, { quoted: msg });
  }

  const metadata = await sock.groupMetadata(from);
  const participants = metadata.participants;
  const sender = msg.key.participant || msg.key.remoteJid;
  const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';

  const isAdmin = participants.find(p => p.id === sender)?.admin !== undefined;
  const isBotAdmin = participants.find(p => p.id === botId)?.admin !== undefined;

  if (!isAdmin) {
    return sock.sendMessage(from, { text: '❌ You must be an admin to use this command.' }, { quoted: msg });
  }

  if (!isBotAdmin) {
    return sock.sendMessage(from, { text: '❌ I need to be an admin to kick members.' }, { quoted: msg });
  }

  const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;

  if (!mentions || mentions.length === 0) {
    return sock.sendMessage(from, { text: '❌ Please mention one or more users to kick.' }, { quoted: msg });
  }

  try {
    for (let jid of mentions) {
      if (jid === botId || jid === sender) continue; // Prevent kicking self or sender
      await sock.groupParticipantsUpdate(from, [jid], 'remove');
    }

    await sock.sendMessage(from, {
      text: `✅ Removed:\n${mentions.map(j => `@${j.split('@')[0]}`).join('\n')}`,
      mentions
    }, { quoted: msg });

  } catch (err) {
    console.error('❌ Kick error:', err);
    return sock.sendMessage(from, {
      text: `⚠️ Failed to remove some members.\nError: ${err.message}`
    }, { quoted: msg });
  }
};
