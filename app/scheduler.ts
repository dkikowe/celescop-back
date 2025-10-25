import cron from 'node-cron'
import { prisma } from 'prisma/prisma-client'
import { notificationService } from './services/notification.service'
import { aiService } from './services/ai.service'
import { buildWeeklyDataForUser } from './services/weekly-report.service'

// Schedule all notifications daily at midnight
function scheduleNotifications() {
	// Schedule a cron job to run at midnight every day
	cron.schedule('0 0 * * *', async () => {
		console.log('Running daily notification scheduler at midnight')
		try {
			const users = await prisma.user.findMany({
				include: { notificationSettings: true }
			})

			// Process each user's notifications based on their preferences
			for (const user of users) {
				await processUserNotifications(user)
			}
		} catch (error) {
			console.error('Error in midnight notification scheduler:', error)
		}
	})
}

// Process notifications for each user according to their settings
async function processUserNotifications(user: any) {
	try {
		// Check for today's sub-goals notifications
		if (user.notificationSettings?.todaySubGoalsNotificationsTime) {
			const [hours, minutes] =
				user.notificationSettings.todaySubGoalsNotificationsTime
					.split(':')
					.map(Number)
			scheduleTimeSpecificNotification(user, hours, minutes, 'today')
		}

		// Check for tomorrow's sub-goals notifications
		if (user.notificationSettings?.tomorrowSubGoalNotificationsTime) {
			const [hours, minutes] =
				user.notificationSettings.tomorrowSubGoalNotificationsTime
					.split(':')
					.map(Number)
			scheduleTimeSpecificNotification(user, hours, minutes, 'tomorrow')
		}

		// Check for monthly goal deadlines notifications
		if (user.notificationSettings?.monthlyGoalDeadlineNotificationsTime) {
			const [hours, minutes] =
				user.notificationSettings.monthlyGoalDeadlineNotificationsTime
					.split(':')
					.map(Number)
			scheduleTimeSpecificNotification(user, hours, minutes, 'monthly')
		}
	} catch (error) {
		console.error(`Error processing notifications for user ${user.id}:`, error)
	}
}

// Schedule a notification for a specific time today
function scheduleTimeSpecificNotification(
	user: any,
	hours: number,
	minutes: number,
	type: 'today' | 'tomorrow' | 'monthly'
) {
	const now = new Date()
	const notificationTime = new Date()
	notificationTime.setHours(hours, minutes, 0, 0)

	// If the time has already passed today, skip (it will be scheduled tomorrow at midnight)
	if (notificationTime <= now) {
		return
	}

	const delay = notificationTime.getTime() - now.getTime()

	setTimeout(async () => {
		try {
			if (type === 'today') {
				await notificationService.checkTodaySubGoals(user)
			} else if (type === 'tomorrow') {
				await notificationService.checkTomorrowSubGoals(user)
			} else if (type === 'monthly') {
				await notificationService.checkMonthlyDeadlines(user)
			}
		} catch (error) {
			console.error(`Error in notification for ${type}:`, error)
		}
	}, delay)
}

function scheduleWeeklyReports() {
  // Каждое воскресенье в 09:00 серверного времени
  cron.schedule('0 9 * * SUN', async () => {
    console.log('Running weekly reports save job (SUN 09:00)')
    try {
      const users = await prisma.user.findMany({})
      for (const user of users) {
        const data = await buildWeeklyDataForUser(user.id)
        const text = await aiService.generateWeeklyReport({
          userName: user.firstName || 'Пользователь',
          goalsSummary: data.goalsSummary,
          completedGoals: data.completedGoals
        })
        await prisma.user.update({ where: { id: user.id }, data: { weekReport: text } as any })
      }
    } catch (error) {
      console.error('Error in weekly reports save job:', error)
    }
  })
}

async function runWeeklyReportsOnceNow() {
  try {
    console.log('Running one-off weekly report generation on startup')
    const users = await prisma.user.findMany({})
    for (const user of users) {
      const data = await buildWeeklyDataForUser(user.id)
      const text = await aiService.generateWeeklyReport({
        userName: user.firstName || 'Пользователь',
        goalsSummary: data.goalsSummary,
        completedGoals: data.completedGoals
      })
      await prisma.user.update({ where: { id: user.id }, data: { weekReport: text } as any })
    }
  } catch (error) {
    console.error('Error in one-off weekly report generation:', error)
  }
}

// Start the scheduler
scheduleNotifications()
scheduleWeeklyReports()
runWeeklyReportsOnceNow()
