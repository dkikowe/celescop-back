class TelegramService {
	async sendMessage(chatId: string, message: string) {
		if (!process.env.TELEGRAM_BOT_TOKEN) {
			console.error('TELEGRAM_BOT_TOKEN не установлен в переменных окружения')
			return null
		}

		if (!chatId) {
			console.error('chatId не указан для отправки сообщения')
			return null
		}

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
				const errorData = await response.json()
				console.error(`Ошибка отправки сообщения в Telegram (${response.status}):`, errorData)
				throw new Error(`Error sending message: ${response.statusText} - ${JSON.stringify(errorData)}`)
			}

			const result = await response.json()
			console.log(`Сообщение успешно отправлено в чат ${chatId}`)
			return result
		} catch (error) {
			console.error('Ошибка при отправке сообщения в Telegram:', error)
			return null
		}
	}
}

export const telegramService = new TelegramService()
