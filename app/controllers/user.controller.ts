import { authMiddleware } from '@/middlewares/auth.middleware'
import { userEditSchema } from '@/schemas/user-edit.schema'
import { userService } from '@/services/user.service'
import { ApiError } from '@/utils/api-error'
import { processImageBuffer } from '@/utils/process-image'
import { NextFunction, Request, Response, Router } from 'express'
import multer from 'multer'

const router = Router()

const storage = multer.memoryStorage()
const upload = multer({ storage: storage })

router.put(
	`/edit/:id`,
	authMiddleware,
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { body } = req

			const { value: data, error } = userEditSchema.validate(body, {
				abortEarly: false
			})

			if (error) throw new ApiError(400, error.message)

			const userId = req.params.id
			const userData = await userService.editUser(userId, data)

			res.status(200).json(userData)
		} catch (err) {
			next(err)
		}
	}
)

router.put(
	`/edit-photo/:id`,
	authMiddleware,
	upload.single('image'),
	async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			const userId = req.params.id

			if (!req.file) {
				res.status(400).json({ message: 'No image file uploaded' })
				return
			}

			const fileBuffer = await processImageBuffer(req.file.buffer, req.file.mimetype)
			const userData = await userService.editUserPhoto(userId, fileBuffer)

			res.status(200).json(userData)
		} catch (err) {
			next(err)
		}
	}
)

router.get(`/:id`, async (req: Request, res: Response, next: NextFunction) => {
	try {
		const userId = req.params.id
		const userData = await userService.getUserById(userId)

		res.status(200).json(userData)
	} catch (err) {
		next(err)
	}
})

router.get(
	`/by-invite/:inviteCode`,
	authMiddleware,
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const inviteCode = req.params.inviteCode
			const userData = await userService.getUserByInviteCode(inviteCode)

			res.status(200).json(userData)
		} catch (err) {
			next(err)
		}
	}
)

export const userController = router
