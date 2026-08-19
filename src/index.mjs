import makeWASocket, { useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } from '@neykoor/baileys'
import qrcode from 'qrcode-terminal'
import { logger } from './logger.mjs'
import { handleMessage } from './commands.mjs'

const start = async () => {
	const { state, saveCreds } = await useMultiFileAuthState('./auth')
	const { version } = await fetchLatestBaileysVersion()

	const sock = makeWASocket({
		auth: state,
		version,
		logger,
		printQRInTerminal: false
	})

	sock.ev.on('creds.update', saveCreds)

	sock.ev.on('connection.update', update => {
		const { connection, lastDisconnect, qr } = update

		if (qr) {
			qrcode.generate(qr, { small: true })
		}

		if (connection === 'close') {
			const statusCode = lastDisconnect?.error?.output?.statusCode
			const shouldReconnect = statusCode !== DisconnectReason.loggedOut
			console.log('conexion cerrada, reconectar:', shouldReconnect, 'motivo:', statusCode)
			if (shouldReconnect) start()
		} else if (connection === 'open') {
			console.log('bot de test conectado')
		}
	})

	sock.ev.on('messages.upsert', async ({ messages, type }) => {
		if (type !== 'notify') return
		for (const msg of messages) {
			await handleMessage(sock, msg)
		}
	})
}

start()
