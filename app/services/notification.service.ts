import { Goal, SubGoal, User } from '@prisma/client'
import { prisma } from 'prisma/prisma-client'
import { telegramService } from './telegram.service'

class NotificationService {
	async checkTodaySubGoals(user: User) {
		const today = new Date()
		today.setHours(0, 0, 0, 0)

		const subGoals = await prisma.subGoal.findMany({
			where: {
				deadline: {
					gte: today,
					lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
				},
				isCompleted: false,
				goal: {
					userId: user.id
				}
			},
			include: {
				goal: { 
					include: { 
						user: true 
					} 
				}
			}
		})

		for (const subGoal of subGoals) {
			if (subGoal.goal.user.chatId) {
				await this.sendSubGoalNotification(
					subGoal.goal.user,
					subGoal,
					subGoal.goal,
					'today'
				)
			}
		}
	}

	async checkTomorrowSubGoals(user: User) {
		const tomorrow = new Date()
		tomorrow.setDate(tomorrow.getDate() + 1)
		tomorrow.setHours(0, 0, 0, 0)

		const subGoals = await prisma.subGoal.findMany({
			where: {
				deadline: {
					gte: tomorrow,
					lt: new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000)
				},
				isCompleted: false,
				goal: {
					userId: user.id
				}
			},
			include: {
				goal: { 
					include: { 
						user: true 
					} 
				}
			}
		})

		for (const subGoal of subGoals) {
			if (subGoal.goal.user.chatId) {
				await this.sendSubGoalNotification(
					subGoal.goal.user,
					subGoal,
					subGoal.goal,
					'tomorrow'
				)
			}
		}
	}

	async checkMonthlyDeadlines(user: User) {
		const now = new Date()
		const oneMonthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

		const goals = await prisma.goal.findMany({
			where: {
				deadline: {
					gte: now,
					lte: oneMonthFromNow
				},
				isCompleted: false,
				userId: user.id
			},
			include: {
				user: true
			}
		})

		for (const goal of goals) {
			if (goal.user.chatId) {
				await this.sendMonthlyDeadlineNotification(goal.user, goal)
			}
		}
	}

	async checkSubGoalDeadlines() {
		const subGoals = await prisma.subGoal.findMany({
			where: {
				isCompleted: false,
				deadline: {
					lte: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 часа
				}
			},
			include: {
				goal: {
					include: {
						user: true
					}
				}
			}
		})

		for (const subGoal of subGoals) {
			if (subGoal.goal.user.chatId) {
				await telegramService.sendMessage(
					subGoal.goal.user.chatId,
					`Напоминание: подцель "${subGoal.description}" из цели "${subGoal.goal.title}" должна быть выполнена в течение 24 часов!`
				)
			}
		}
	}

	async checkSubGoalOverdue() {
		const subGoals = await prisma.subGoal.findMany({
			where: {
				isCompleted: false,
				deadline: {
					lt: new Date()
				}
			},
			include: {
				goal: {
					include: {
						user: true
					}
				}
			}
		})

		for (const subGoal of subGoals) {
			if (subGoal.goal.user.chatId) {
				await telegramService.sendMessage(
					subGoal.goal.user.chatId,
					`Внимание: подцель "${subGoal.description}" из цели "${subGoal.goal.title}" просрочена!`
				)
			}
		}
	}

	private async sendSubGoalNotification(
		user: User,
		subGoal: SubGoal,
		goal: Goal,
		when: 'today' | 'tomorrow'
	) {
		const message = `📝 <b>Напоминание о задаче</b>\n\n${
			when === 'today' ? 'Сегодня' : 'Завтра'
		} нужно выполнить задачу "${subGoal.description}" из цели "${goal.title}"!`

		await telegramService.sendMessage(user.chatId!, message)
	}

	private async sendMonthlyDeadlineNotification(user: User, goal: Goal) {
		const now = new Date()
		const daysLeft = Math.ceil(
			(goal.deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
		)

		const message = `⏰ <b>Напоминание о дедлайне</b>\n\nДо выполнения цели "${goal.title}" осталось ${daysLeft} дней!`

		await telegramService.sendMessage(user.chatId!, message)
	}
}

export const notificationService = new NotificationService()
