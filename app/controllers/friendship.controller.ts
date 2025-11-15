import { authMiddleware } from '@/middlewares/auth.middleware'
import { friendshipService } from '@/services/friendship.service'
import { tokenService } from '@/services/token.service'
import { ApiError } from '@/utils/api-error'
import { NextFunction, Request, Response, Router } from 'express'

const router = Router()

router.post(
	'/add',
	authMiddleware,
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const authHeader = req.headers.authorization
			if (!authHeader) throw new ApiError(401, 'Не авторизован')
			
			const accessToken = authHeader.split(' ')[1]
			const { id: userId } = tokenService.validateAccess(accessToken)
			const { friendId } = req.body

			if (!friendId || !userId)
				throw new ApiError(400, 'Friend ID and user ID are required')

			const friendship = await friendshipService.createFriendship(
				userId,
				friendId
			)

			res.status(200).json(friendship)
		} catch (error) {
			next(error)
		}
	}
)

router.delete(
	'/remove',
	authMiddleware,
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const authHeader = req.headers.authorization
			if (!authHeader) throw new ApiError(401, 'Не авторизован')
			
			const accessToken = authHeader.split(' ')[1]
			const { id: userId } = tokenService.validateAccess(accessToken)
			const { friendId } = req.body

			if (!friendId || !userId)
				throw new ApiError(400, 'Friend ID and user ID are required')

			await friendshipService.removeFriendship(userId, friendId)

			res.status(200).json({})
		} catch (error) {
			next(error)
		}
	}
)

router.get(
	'/',
	authMiddleware,
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const authHeader = req.headers.authorization
			if (!authHeader) throw new ApiError(401, 'Не авторизован')
			
			const accessToken = authHeader.split(' ')[1]
			const { id: userId } = tokenService.validateAccess(accessToken)

			const friends = await friendshipService.getFriends(userId)

			res.status(200).json(friends)
		} catch (err) {
			console.log('Error:', err)
			next(err)
		}
	}
)

export const friendshipController = router
