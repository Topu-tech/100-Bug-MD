
██████╗░░█████╗░██████╗░
██╔══██╗██╔══██╗██╔══██╗
██║░░██║██║░░██║██████╔╝   𝙱𝚄𝙶 𝙼𝙳
██║░░██║██║░░██║██╔═══╝░
██████╔╝╚█████╔╝██║░░░░░   🐞💀 [100] 
╚═════╝░░╚════╝░╚═╝░░░░░

[ DECRYPTING... █▓▒░ ]



module.exports = async ({ sock, msg, from, command, config = {} }) => {
  if (command !== 'owner') return;

  const ownerName = config.OWNER_NAME || "Unknown";
  const ownerNumber = config.OWNER_NUMBER || "1234567890"; // International format
  const supportChannel = "https://whatsapp.com/channel/0029VaeRrcnADTOKzivM0S1r";

  // vCard (contact card)
  const vcard = `BEGIN:VCARD
VERSION:3.0
FN:${ownerName}
TEL;type=CELL;type=VOICE;waid=${ownerNumber}:${ownerNumber}
END:VCARD`;

  const caption = `
╭━━❰ *👑 Owner Info* ❱━━⬣
┃👤 *Owner:* ${ownerName}
┃🧠 *Developer: Toputech 
┃📢 *Support:* ${supportChannel}
╰━━━───────⬣
  `;

  try {
    // Send contact
    await sock.sendMessage(from, {
      contacts: {
        displayName: ownerName,
        contacts: [{ vcard }]
      }
    }, { quoted: msg });

    // Send info text
    await sock.sendMessage(from, {
      text: caption
    }, { quoted: msg });

  } catch (err) {
    console.error("❌ Error in owner command:", err);
    await sock.sendMessage(from, {
      text: `⚠️ Failed to send owner info.\n\nError: ${err.message || err}`
    }, { quoted: msg });
  }
};
