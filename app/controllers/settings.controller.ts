import { notificationSettingsService } from '@/services/notification-settings.service'
import { authMiddleware } from '@/middlewares/auth.middleware'
import { tokenService } from '@/services/token.service'
import { User } from '@prisma/client'
import { Router, Request, Response, NextFunction } from 'express'
import Joi from 'joi'

const router = Router()

const settingsSchema = Joi.object({
	todaySubGoalsNotifications: Joi.boolean(),
	tomorrowSubGoalNotifications: Joi.boolean(),
	monthlyGoalDeadlineNotifications: Joi.boolean(),
	customNotifications: Joi.boolean(),
	todaySubGoalsNotificationsTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
	tomorrowSubGoalNotificationsTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
	monthlyGoalDeadlineNotificationsTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
	customNotificationsTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
}).unknown(true)

router.get(
	'/',
	authMiddleware,
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const token = req.headers.authorization?.split(' ')[1]
			const user: User = tokenService.validateAccess(token) as User

			const settings = await notificationSettingsService.getSettings(user.id)
			res.status(200).json(settings)
		} catch (err) {
			next(err)
		}
	}
)

router.put(
	'/edit',
	authMiddleware,
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const token = req.headers.authorization?.split(' ')[1]
			const user: User = tokenService.validateAccess(token) as User

			const { error, value } = settingsSchema.validate(req.body)
			if (error) {
				throw new Error(error.message)
			}

			const settings = await notificationSettingsService.updateSettings(
				user.id,
				value
			)

			res.status(200).json(settings)
		} catch (err) {
			next(err)
		}
	}
)

export const settingsController = router
