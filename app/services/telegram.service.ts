class TelegramService {
	async sendMessage(chatId: string, message: string) {
		try {
			const response = await fetch(
				`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						chat_id: chatId,
						text: message,
						parse_mode: 'HTML'
					})
				}
			)

			if (!response.ok) {
				throw new Error(`Error sending message: ${response.statusText}`)
			}

			return await response.json()
		} catch (error) {
			console.error('Error sending message to Telegram:', error)
		}
	}
}

export const telegramService = new TelegramService()
