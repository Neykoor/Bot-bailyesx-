import { Jimp, ResizeStrategy } from 'jimp'

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
const isGroupJid = jid => typeof jid === 'string' && jid.endsWith('@g.us')

export const handleMessage = async (sock, msg) => {
	if (!msg.message || msg.key.fromMe) return

	const jid = msg.key.remoteJid
	const text = extractText(msg.message).trim()

	if (text === '.ping') {
		await sock.sendMessage(jid, { text: 'pong' })
		return
	}

	if (text === '.menu') {
		try {
			const thumbImg = await Jimp.read('./src/media/menu.jpg')
			const thumb = await thumbImg.resize({ w: 320, mode: ResizeStrategy.BILINEAR }).getBuffer('image/jpeg', { quality: 90 })
			const fakeQuoted = {
				key: {
					fromMe: false,
					participant: '0@s.whatsapp.net',
					remoteJid: 'status@broadcast',
					id: 'FAKE-MENU-PREVIEW'
				},
				message: {
					orderMessage: {
						orderTitle: 'Pedido de Carlos_2take1-interative ✓',
						itemCount: 12,
						thumbnail: thumb,
						surface: 1,
						status: 2
					}
				}
			}

			await sock.sendMessage(
				jid,
				{
					image: { url: './src/media/menu.jpg' },
					title: 'Test BaileysX',
					caption: [
						'🏷️ bot-Menú',
						'',
						'🏷️ *Bot-Premium | Devs*',
						'',
						'▢ hola soy 2take1-Interative en que te podemos ayudar',
						'',
						'↝ seleciona una opcion para ser atendidos ↝'
					].join('\n'),
					footer: 'BaileysX · Test',
					templateButtons: [
						{ text: '☰ ATTAÇKE🕷️', id: '.attack' },
						{ text: '☰ 📋 Menú', id: '.menu' }
					]
				},
				{ quoted: fakeQuoted }
			)
		} catch (err) {
			console.error('[.menu] fallo el envio:', err)
			await sock.sendMessage(jid, { text: `error en .menu: ${err.message}` })
		}
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

			if (lidMentions.length && isGroupJid(jid)) {
				try {
					await sock.groupMetadata(jid)
				} catch (metaErr) {
					sock.logger?.warn?.(`no se pudo refrescar groupMetadata: ${metaErr.message}`)
				}
			}

			const resolved = pnInputs.length ? await sock.onWhatsApp(...pnInputs) : []
			const lidResults = await Promise.all(
				lidMentions.map(async lidJid => {
					const pn = await sock.signalRepository.lidMapping.getPNForLID(lidJid)
					return { jid: lidJid, pn: pn || null, exists: true, source: 'mention@lid' }
				})
			)
			const result = [...(resolved || []), ...lidResults]

			const reply = result.length ? JSON.stringify(result, null, 2) : 'sin resultado'
			await sock.sendMessage(jid, { text: reply })
		} catch (err) {
			await sock.sendMessage(jid, { text: `error: ${err.message}` })
		}
	}
}
