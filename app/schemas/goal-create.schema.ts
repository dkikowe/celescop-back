import Joi from 'joi'

export const goalCreateSchema = Joi.object({
	title: Joi.string().required().min(1).max(100).messages({
		'string.empty': 'Название цели не может быть пустым',
		'string.min': 'Название цели не может быть пустым',
		'string.max': 'Название цели должно содержать не более 100 символов'
	}),
	urgencyLevel: Joi.string()
		.required()
		.valid('LOW', 'AVERAGE', 'HIGH')
		.messages({
			'string.empty': 'Уровень важности не может быть пустым',
			'any.only': 'Уровень важности должен быть LOW, AVERAGE или HIGH'
		}),
	specific: Joi.string().required().min(1).max(250).messages({
		'string.empty': 'Конкретность цели не может быть пустым',
		'string.min': 'Конкретность цели не может быть пустым',
		'string.max': 'Конкретность цели должно содержать не более 250 символов'
	}),
	measurable: Joi.string().required().min(1).max(250).messages({
		'string.empty': 'Измеримость цели не может быть пустым',
		'string.min': 'Измеримость цели не может быть пустым',
		'string.max': 'Измеримость цели должно содержать не более 250 символов'
	}),
	attainable: Joi.string().required().min(1).max(250).messages({
		'string.empty': 'Достижимость цели не может быть пустым',
		'string.min': 'Достижимость цели не может быть пустым',
		'string.max': 'Достижимость цели должно содержать не более 250 символов'
	}),
	relevant: Joi.string().required().min(1).max(250).messages({
		'string.empty': 'Актуальность цели не может быть пустым',
		'string.min': 'Актуальность цели не может быть пустым',
		'string.max': 'Актуальность цели должно содержать не более 250 символов'
	}),
	description: Joi.string().required().min(1).max(1000).messages({
		'string.empty': 'Описание цели не может быть пустым',
		'string.min': 'Описание цели не может быть пустым',
		'string.max': 'Описание цели должно содержать не более 1000 символов'
	}),
	subGoals: Joi.array().items(
		Joi.object({
			description: Joi.string().required().min(1).max(200).messages({
				'string.empty': 'Описание подцели не может быть пустым',
				'string.min': 'Описание подцели не может быть пустым',
				'string.max': 'Описание подцели должно содержать не более 200 символов'
			}),
			deadline: Joi.date().required().messages({
				'date.empty': 'Срок подцели не может быть пустым',
				'date.base': 'Срок подцели должен быть датой',
				'date.iso': 'Срок подцели должен быть датой в формате ISO'
			})
		})
	),
	deadline: Joi.string().required().valid('3_MONTHS', '6_MONTHS', '1_YEAR').messages({
		'string.empty': 'Срок не может быть пустым',
		'any.only': 'Срок должен быть 3_MONTHS, 6_MONTHS или 1_YEAR'
	}),
	award: Joi.string().required().min(1).max(250).messages({
		'string.empty': 'Награда не может быть пустой',
		'string.min': 'Награда не может быть пустой',
		'string.max': 'Награда должна содержать не более 250 символов'
	}),
	privacy: Joi.string().required().valid('PRIVATE', 'PUBLIC').messages({
		'string.empty': 'Приватность не может быть пустой',
		'any.only': 'Приватность должна быть PRIVATE или PUBLIC'
	}),
	imageUrl: Joi.string().optional().uri().messages({
		'string.uri': 'URL изображения должен быть валидным'
	})
})
