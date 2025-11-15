import { uploadFile } from '@/lib/s3'
import { authMiddleware } from '@/middlewares/auth.middleware'
import { goalCreateSchema } from '@/schemas/goal-create.schema'
import { goalCreateFromTemplateSchema } from '@/schemas/goal-create-from-template.schema'
import { goalUpdateSchema } from '@/schemas/goal-update.schema'
import { goalService } from '@/services/goal.service'
import { tokenService } from '@/services/token.service'
import { aiService } from '@/services/ai.service'
import { ApiError } from '@/utils/api-error'
import { User } from '@prisma/client'
import { type NextFunction, type Request, type Response, Router } from 'express'
import multer from 'multer'
import sharp from 'sharp'
import heicConvert from 'heic-convert'

const router = Router()

const storage = multer.memoryStorage()
const upload = multer({
	storage: storage,
	limits: {
		fileSize: 15 * 1024 * 1024 // 15MB limit
	}
})

// Вспомогательная функция для обработки изображений
async function processImageBuffer(fileBuffer: Buffer, mimetype?: string): Promise<Buffer> {
	let imageBuffer = fileBuffer;
	
	console.log('Processing image, mimetype:', mimetype, 'size:', fileBuffer.length);
	
	// Пробуем определить формат через Sharp
	try {
		const metadata = await sharp(fileBuffer).metadata();
		console.log('Sharp metadata:', { format: metadata.format, width: metadata.width, height: metadata.height });
		
		// Если формат HEIF/HEIC, конвертируем в JPG
		if (metadata.format === 'heif') {
			console.log('Detected HEIF format, converting to JPEG');
			const converted = await heicConvert({
				buffer: fileBuffer,
				format: 'JPEG',
				quality: 0.9
			});
			imageBuffer = Buffer.from(converted);
			console.log('HEIC conversion successful, new size:', imageBuffer.length);
		}
	} catch (metadataError: any) {
		console.log('Sharp metadata failed:', metadataError.message);
		
		// Если mimetype указывает на HEIC или Sharp не смог распознать, пробуем HEIC конвертацию
		if (mimetype?.includes('heic') || mimetype?.includes('heif') || metadataError.message?.includes('unsupported')) {
			try {
				console.log('Attempting HEIC conversion as fallback');
				const converted = await heicConvert({
					buffer: fileBuffer,
					format: 'JPEG',
					quality: 0.9
				});
				imageBuffer = Buffer.from(converted);
				console.log('Fallback HEIC conversion successful, new size:', imageBuffer.length);
			} catch (heicError: any) {
				console.log('HEIC conversion also failed:', heicError.message);
				// Если и HEIC конвертация не помогла, оставляем оригинальный buffer
			}
		}
	}

	// Финальная обработка через Sharp
	try {
		const processedBuffer = await sharp(imageBuffer)
			.rotate() // Автоповорот по EXIF
			.jpeg({ quality: 90, mozjpeg: true })
			.toBuffer();
		
		console.log('Sharp processing successful, final size:', processedBuffer.length);
		return processedBuffer;
	} catch (sharpError: any) {
		console.error('Sharp final processing failed:', sharpError);
		throw new ApiError(400, `Не удалось обработать изображение: ${sharpError.message}`);
	}
}

router.post(
	'/create',
	authMiddleware,
	upload.single('image'),
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			if (!req.file) {
				console.log('No file uploaded')
			}

			const { info } = req.body

			const parsed = JSON.parse(info)
			const isFromTemplate = parsed?.source === 'template'
			const schema = isFromTemplate ? goalCreateFromTemplateSchema : goalCreateSchema
			const { value: data, error } = schema.validate(
				parsed,
				{
					abortEarly: false
				}
			)

			if (error) throw new ApiError(400, error.message)

			// Если есть shortDescription и это создание по шаблону, генерируем описание через AI
			if (isFromTemplate && data.shortDescription && !data.description) {
				try {
					const aiResult = await aiService.generateGoalFromTemplate({
						template: data.title,
						shortDescription: data.shortDescription,
						deadline: data.deadline,
						context: data.shortDescription
					})
					data.description = aiResult.description
				} catch (aiError) {
					console.error('AI generation failed:', aiError)
					// Если AI не сработал, используем shortDescription как описание
					data.description = data.shortDescription
				}
			}

			const token = req.headers.authorization?.split(' ')[1]
			const user: User = tokenService.validateAccess(token) as User

			if (req.file) {
				const fileBuffer = await processImageBuffer(req.file.buffer, req.file.mimetype)
				const imageUrl = await uploadFile(fileBuffer, `goal-${Date.now()}.jpg`)
				data.imageUrl = imageUrl
			} else if (!data.imageUrl) {
				// Если файл не загружен и не указан URL изображения, используем изображение по умолчанию
				data.imageUrl = 'https://celiscope.ru/placeholder-image.jpg'
			}

			const goal = await goalService.createGoal(user.id, data)

			res.status(200).json(goal)
		} catch (err) {
			next(err)
		}
	}
)

router.post(
	'/create-from-template',
	authMiddleware,
	upload.single('image'),
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			if (!req.file) {
				console.log('No file uploaded')
			}

			const { info } = req.body

			const parsed = JSON.parse(info)
			const { value: data, error } = goalCreateFromTemplateSchema.validate(parsed, {
				abortEarly: false,
				allowUnknown: true,
				stripUnknown: true
			})

			if (error) throw new ApiError(400, error.message)

			// Заполняем обязательные поля Prisma дефолтами, если не пришли
			data.urgencyLevel = data.urgencyLevel || 'LOW'
			data.privacy = data.privacy || 'PRIVATE'
			data.specific = data.specific || '-' 
			data.measurable = data.measurable || '-'
			data.attainable = data.attainable || '-'
			data.relevant = data.relevant || '-'
			data.award = data.award || '-'

			// Преобразуем подцели, если есть, чтобы deadline был Date
			if (Array.isArray(data.subGoals)) {
				data.subGoals = data.subGoals.map((sg: any) => ({
					description: sg.description,
					deadline: new Date(sg.deadline)
				}))
			}

			const token = req.headers.authorization?.split(' ')[1]
			const user: User = tokenService.validateAccess(token) as User

			if (req.file) {
				const fileBuffer = await processImageBuffer(req.file.buffer, req.file.mimetype)
				const imageUrl = await uploadFile(fileBuffer, `goal-${Date.now()}.jpg`)
				data.imageUrl = imageUrl
			} else if (!data.imageUrl) {
				data.imageUrl = 'https://celiscope.ru/placeholder-image.jpg'
			}

			const goal = await goalService.createGoal(user.id, data)

    res.status(200).json(goal)
  } catch (err) {
    next(err)
  }
}
)


router.get(
	'/',
	authMiddleware,
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const token = req.headers.authorization?.split(' ')[1]
			const user: User = tokenService.validateAccess(token) as User

			const goal = await goalService.getGoals(user.id)

			res.status(200).json(goal)
		} catch (err) {
			next(err)
		}
	}
)
router.get(
	'/friends',
	authMiddleware,
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const token = req.headers.authorization?.split(' ')[1]
			const user: User = tokenService.validateAccess(token) as User

			const goal = await goalService.getFriendGoals(user.id)

			res.status(200).json(goal)
		} catch (err) {
			next(err)
		}
	}
)

router.post(
	'/:goalId/complete',
	authMiddleware,
	upload.single('image'),
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const token = req.headers.authorization?.split(' ')[1]
			const user: User = tokenService.validateAccess(token) as User
			const goalId = parseInt(req.params.goalId)

			if (isNaN(goalId)) {
				throw new ApiError(400, 'Invalid goal ID')
			}

			if (!req.file) {
				throw new ApiError(400, 'Необходимо загрузить изображение для закрытия цели')
			}

			const fileBuffer = await processImageBuffer(req.file.buffer, req.file.mimetype)
			const goal = await goalService.completeGoal(user.id, goalId, fileBuffer)

			res.status(200).json(goal)
		} catch (err) {
			next(err)
		}
	}
)

router.post(
	'/sub-goal/:subGoalId/complete',
	authMiddleware,
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const token = req.headers.authorization?.split(' ')[1]
			const user: User = tokenService.validateAccess(token) as User
			const subGoalId = parseInt(req.params.subGoalId)

			if (isNaN(subGoalId)) {
				throw new ApiError(400, 'Invalid sub-goal ID')
			}

			const subGoal = await goalService.completeSubGoal(user.id, subGoalId)
			res.status(200).json(subGoal)
		} catch (err) {
			next(err)
		}
	}
)

router.post(
	'/sub-goal/:subGoalId/uncomplete',
	authMiddleware,
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const token = req.headers.authorization?.split(' ')[1]
			const user: User = tokenService.validateAccess(token) as User
			const subGoalId = parseInt(req.params.subGoalId)

			if (isNaN(subGoalId)) {
				throw new ApiError(400, 'Invalid sub-goal ID')
			}

			const subGoal = await goalService.uncompleteSubGoal(user.id, subGoalId)
			res.status(200).json(subGoal)
		} catch (err) {
			next(err)
		}
	}
)

router.get(
	'/:goalId',
	authMiddleware,
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const token = req.headers.authorization?.split(' ')[1]
			const user: User = tokenService.validateAccess(token) as User
			const goalId = parseInt(req.params.goalId)

			if (isNaN(goalId)) {
				throw new ApiError(400, 'Invalid goal ID')
			}

			const goal = await goalService.getGoal(user.id, goalId)
			res.status(200).json(goal)
		} catch (err) {
			next(err)
		}
	}
)

router.put(
	'/:goalId',
	authMiddleware,
	upload.single('image'),
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const token = req.headers.authorization?.split(' ')[1]
			const user: User = tokenService.validateAccess(token) as User
			const goalId = parseInt(req.params.goalId)

			if (isNaN(goalId)) {
				throw new ApiError(400, 'Invalid goal ID')
			}

			const { info } = req.body
			const parsedInfo = JSON.parse(info)

			// Удаляем пустые значения
			Object.keys(parsedInfo).forEach(key => {
				if (parsedInfo[key] === '' || parsedInfo[key] === null) {
					delete parsedInfo[key]
				}
			})

			// Логируем значение deadline перед валидацией
			if (parsedInfo.deadline) {
				console.log('Полученное значение deadline:', parsedInfo.deadline)
			}

			const { value: data, error } = goalUpdateSchema.validate(
				parsedInfo,
				{
					abortEarly: false
				}
			)

			if (error) throw new ApiError(400, error.message)

			if (req.file) {
				const fileBuffer = await processImageBuffer(req.file.buffer, req.file.mimetype)
				const imageUrl = await uploadFile(fileBuffer, `goal-${Date.now()}.jpg`)
				data.imageUrl = imageUrl
			}

			const goal = await goalService.updateGoal(user.id, goalId, data)
			res.status(200).json(goal)
		} catch (err) {
			next(err)
		}
	}
)

export const goalController = router
