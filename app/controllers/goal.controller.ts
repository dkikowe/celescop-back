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
			console.log('[create-from-template] Начало обработки запроса')
			console.log('[create-from-template] File uploaded:', !!req.file)
			console.log('[create-from-template] Body keys:', Object.keys(req.body || {}))

			if (!req.file) {
				console.log('[create-from-template] No file uploaded')
			}

			const { info } = req.body
			console.log('[create-from-template] Info received:', info ? 'yes' : 'no', info?.substring(0, 200))

			if (!info) {
				console.error('[create-from-template] ERROR: info отсутствует в body')
				throw new ApiError(400, 'Поле info обязательно')
			}

			let parsed
			try {
				parsed = JSON.parse(info)
				console.log('[create-from-template] JSON parsed successfully')
				console.log('[create-from-template] Parsed data keys:', Object.keys(parsed || {}))
				console.log('[create-from-template] Title:', parsed?.title)
				console.log('[create-from-template] Has description:', !!parsed?.description)
				console.log('[create-from-template] Has shortDescription:', !!parsed?.shortDescription)
				console.log('[create-from-template] Has subGoals:', Array.isArray(parsed?.subGoals), parsed?.subGoals?.length)
			} catch (parseError: any) {
				console.error('[create-from-template] ERROR: JSON parse failed:', parseError.message)
				console.error('[create-from-template] Info content:', info)
				throw new ApiError(400, `Ошибка парсинга JSON: ${parseError.message}`)
			}

			console.log('[create-from-template] Начало валидации схемы')
			const { value: data, error } = goalCreateFromTemplateSchema.validate(parsed, {
				abortEarly: false,
				allowUnknown: true,
				stripUnknown: true
			})

			if (error) {
				console.error('[create-from-template] ERROR: Валидация не прошла:', error.message)
				console.error('[create-from-template] Validation details:', JSON.stringify(error.details, null, 2))
				throw new ApiError(400, error.message)
			}
			console.log('[create-from-template] Валидация прошла успешно')

			// Если есть shortDescription и нет description, генерируем описание через AI
			if (data.shortDescription && !data.description) {
				console.log('[create-from-template] Генерация описания через AI')
				try {
					const aiResult = await aiService.generateGoalFromTemplate({
						template: data.title,
						shortDescription: data.shortDescription,
						deadline: data.deadline,
						context: data.shortDescription
					})
					data.description = aiResult.description
					console.log('[create-from-template] AI описание сгенерировано, длина:', data.description?.length)
				} catch (aiError: any) {
					console.error('[create-from-template] AI generation failed:', aiError.message)
					console.error('[create-from-template] AI error stack:', aiError.stack)
					// Если AI не сработал, используем shortDescription как описание
					data.description = data.shortDescription
					console.log('[create-from-template] Используем shortDescription как описание')
				}
			}

			// Проверяем, что description обязательно есть перед созданием
			if (!data.description) {
				console.error('[create-from-template] ERROR: description отсутствует после всех обработок')
				throw new ApiError(400, 'Описание цели обязательно. Укажите description или shortDescription')
			}
			console.log('[create-from-template] Description готово, длина:', data.description.length)

			// Заполняем обязательные поля Prisma дефолтами, если не пришли
			data.urgencyLevel = data.urgencyLevel || 'LOW'
			data.privacy = data.privacy || 'PRIVATE'
			data.specific = data.specific || '-' 
			data.measurable = data.measurable || '-'
			data.attainable = data.attainable || '-'
			data.relevant = data.relevant || '-'
			data.award = data.award || '-'
			console.log('[create-from-template] Обязательные поля заполнены')

			// Преобразуем подцели, если есть, чтобы deadline был Date
			if (Array.isArray(data.subGoals)) {
				console.log('[create-from-template] Обработка подцелей, количество:', data.subGoals.length)
				data.subGoals = data.subGoals.map((sg: any) => ({
					description: sg.description,
					deadline: new Date(sg.deadline)
				}))
				console.log('[create-from-template] Подцели обработаны')
			}

			console.log('[create-from-template] Проверка токена')
			const token = req.headers.authorization?.split(' ')[1]
			if (!token) {
				console.error('[create-from-template] ERROR: Токен отсутствует')
				throw new ApiError(401, 'Токен не предоставлен')
			}

			const user: User = tokenService.validateAccess(token) as User
			console.log('[create-from-template] Пользователь авторизован, ID:', user.id)

			if (req.file) {
				console.log('[create-from-template] Обработка изображения')
				try {
					const fileBuffer = await processImageBuffer(req.file.buffer, req.file.mimetype)
					const imageUrl = await uploadFile(fileBuffer, `goal-${Date.now()}.jpg`)
					data.imageUrl = imageUrl
					console.log('[create-from-template] Изображение загружено, URL:', imageUrl)
				} catch (imageError: any) {
					console.error('[create-from-template] ERROR: Ошибка обработки изображения:', imageError.message)
					console.error('[create-from-template] Image error stack:', imageError.stack)
					throw imageError
				}
			} else if (!data.imageUrl) {
				data.imageUrl = 'https://celiscope.ru/placeholder-image.jpg'
				console.log('[create-from-template] Используется изображение по умолчанию')
			}

			console.log('[create-from-template] Создание цели в БД')
			console.log('[create-from-template] Данные для создания:', {
				userId: user.id,
				title: data.title,
				hasDescription: !!data.description,
				descriptionLength: data.description?.length,
				deadline: data.deadline,
				hasSubGoals: Array.isArray(data.subGoals),
				subGoalsCount: data.subGoals?.length || 0
			})

			const goal = await goalService.createGoal(user.id, data)
			console.log('[create-from-template] Цель создана успешно, ID:', goal.id)

			res.status(200).json(goal)
		} catch (err: any) {
			console.error('[create-from-template] ERROR: Исключение в обработчике')
			console.error('[create-from-template] Error message:', err.message)
			console.error('[create-from-template] Error stack:', err.stack)
			if (err instanceof ApiError) {
				console.error('[create-from-template] ApiError status:', err.status)
			}
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
