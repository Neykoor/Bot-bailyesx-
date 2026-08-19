const extractText = message => {
	if (!message) return ''
	return message.conversation || message.extendedTextMessage?.text || message.imageMessage?.caption || ''
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
		const input = text.replace('.checkjid', '').trim()

		if (!input) {
			await sock.sendMessage(jid, { text: 'uso: .checkjid <numero|@username|jid@lid>' })
			return
		}

		try {
			const result = await sock.onWhatsApp(input)
			const reply = result && result.length ? JSON.stringify(result, null, 2) : 'sin resultado'
			await sock.sendMessage(jid, { text: reply })
		} catch (err) {
			await sock.sendMessage(jid, { text: `error: ${err.message}` })
		}
	}
}
