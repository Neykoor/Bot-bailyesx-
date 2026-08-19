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

const isLidJid = jid => typeof jid === 'string' && jid.endsWith('@lid')

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
			const lidMentions = mentioned.filter(isLidJid)
			const pnInputs = mentioned.length ? mentioned.filter(m => !isLidJid(m)) : [rawInput]

			const resolved = pnInputs.length ? await sock.onWhatsApp(...pnInputs) : []
			const lidResults = lidMentions.map(lidJid => ({ jid: lidJid, exists: true, source: 'mention@lid' }))
			const result = [...(resolved || []), ...lidResults]

			const reply = result.length ? JSON.stringify(result, null, 2) : 'sin resultado'
			await sock.sendMessage(jid, { text: reply })
		} catch (err) {
			await sock.sendMessage(jid, { text: `error: ${err.message}` })
		}
	}
}
