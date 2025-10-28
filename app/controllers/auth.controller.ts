import { authService } from '@/services/auth.service'
import { NextFunction, Request, Response, Router } from 'express'

const router = Router()
router.post(
	'/telegram',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { body } = req

			const userData = await authService.auth(body)

            res
				.status(200)
				.cookie('refreshToken', userData.refreshToken, {
					expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
					httpOnly: true,
                    sameSite: 'none',
                    secure: process.env.NODE_ENV === 'production',
                    domain: process.env.NODE_ENV === 'production' ? '.celiscope.ru' : undefined
				})
				.json(userData)
		} catch (err) {
			next(err)
		}
	}
)

router.post(
	'/refresh',
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { refreshToken } = req.cookies

			const userData = await authService.refresh(refreshToken)

            res
				.status(200)
				.cookie('refreshToken', userData.refreshToken, {
					expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
					httpOnly: true,
                    sameSite: 'none',
                    secure: process.env.NODE_ENV === 'production',
                    domain: process.env.NODE_ENV === 'production' ? '.celiscope.ru' : undefined
				})
				.json(userData)
		} catch (err) {
			next(err)
		}
	}
)

export const authController = router
