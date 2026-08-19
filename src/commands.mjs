const extractText = message => {
	if (!message) return ''
	return message.conversation || message.extendedTextMessage?.text || message.imageMessage?.caption || ''
}

const extractMentionedJids = message => {
	if (!message) return []
	return (
		message.extendedTextMessage?.contextInfo?.mentionedJid ||
		message.imageMessage?.contextInfo?.mentionedJid ||
		message.videoMessage?.contextInfo?.mentionedJid ||
		[]
	)
}

export const handleMessage = async (sock, msg) => {
	if (!msg.message || msg.key.fromMe) return

	const jid = msg.key.remoteJid
	const text = extractText(msg.message).trim()

	if (text === '.ping') {
		await sock.sendMessage(jid, { text: 'pong' })
		return
	}

	if (text.startsWith('.checkjid')) {
		const mentioned = extractMentionedJids(msg.message)
		const rawInput = text.replace('.checkjid', '').trim()

		if (!rawInput && mentioned.length === 0) {
			await sock.sendMessage(jid, { text: 'uso: .checkjid <numero|@username|jid@lid> (o menciona a alguien)' })
			return
		}

		try {
			const inputs = mentioned.length ? mentioned : [rawInput]
			const result = await sock.onWhatsApp(...inputs)
			const reply = result && result.length ? JSON.stringify(result, null, 2) : 'sin resultado'
			await sock.sendMessage(jid, { text: reply })
		} catch (err) {
			await sock.sendMessage(jid, { text: `error: ${err.message}` })
		}
	}
}
