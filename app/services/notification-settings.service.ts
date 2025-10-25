import { NotificationSettings } from '@prisma/client'
import { prisma } from 'prisma/prisma-client'

class NotificationSettingsService {
	async getSettings(userId: string): Promise<NotificationSettings> {
		const notificationSettings = await prisma.notificationSettings.findUnique({
			where: { userId },
		})

		if (!notificationSettings) {
			return await this.createDefaultSettings(userId)
		}

		return notificationSettings
	}

	async updateSettings(userId: string, data: {
		todaySubGoalsNotifications?: boolean
		tomorrowSubGoalNotifications?: boolean
		monthlyGoalDeadlineNotifications?: boolean
		customNotifications?: boolean
		todaySubGoalsNotificationsTime?: string
		tomorrowSubGoalNotificationsTime?: string
		monthlyGoalDeadlineNotificationsTime?: string
		customNotificationsTime?: string
	}) {
		const settings = await this.getSettings(userId)
		if (!settings) {
			await this.createDefaultSettings(userId)
		}

		return await prisma.notificationSettings.update({
			where: {
				userId
			},
			data
		})
	}

	private async createDefaultSettings(
		userId: string
	): Promise<NotificationSettings> {
		return await prisma.notificationSettings.create({
			data: {
				userId,
				todaySubGoalsNotifications: true,
				tomorrowSubGoalNotifications: true,
				monthlyGoalDeadlineNotifications: true,
				customNotifications: true
			}
		})
	}

	async shouldSendTodaySubGoalsNotification(userId: string): Promise<boolean> {
		const settings = await this.getSettings(userId)
		return settings.todaySubGoalsNotifications
	}

	async shouldSendTomorrowSubGoalNotification(
		userId: string
	): Promise<boolean> {
		const settings = await this.getSettings(userId)
		return settings.tomorrowSubGoalNotifications
	}

	async shouldSendMonthlyDeadlineNotification(
		userId: string
	): Promise<boolean> {
		const settings = await this.getSettings(userId)
		return settings.monthlyGoalDeadlineNotifications
	}

	async shouldSendCustomNotification(userId: string): Promise<boolean> {
		const settings = await this.getSettings(userId)
		return settings.customNotifications
	}
}

export const notificationSettingsService = new NotificationSettingsService()
