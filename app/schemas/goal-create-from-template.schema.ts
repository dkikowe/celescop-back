import Joi from 'joi'

export const goalCreateFromTemplateSchema = Joi.object({
  source: Joi.string().optional().valid('template', 'manual').messages({
    'any.only': 'Источник должен быть template или manual'
  }),
  title: Joi.string().required().min(1).max(100).messages({
    'string.empty': 'Название цели не может быть пустым',
    'string.min': 'Название цели не может быть пустым',
    'string.max': 'Название цели должно содержать не более 100 символов'
  }),
  shortDescription: Joi.string().optional().min(1).max(200).messages({
    'string.min': 'Краткое описание не может быть пустым',
    'string.max': 'Краткое описание должно содержать не более 200 символов'
  }),
  description: Joi.string().required().min(1).max(2000).messages({
    'string.empty': 'Описание цели не может быть пустым',
    'string.min': 'Описание цели не может быть пустым',
    'string.max': 'Описание цели должно содержать не более 2000 символов'
  }),
  // По умолчанию допускаем отсутствие, но можно переопределить
  urgencyLevel: Joi.string().valid('LOW', 'AVERAGE', 'HIGH').optional(),
  privacy: Joi.string().valid('PRIVATE', 'PUBLIC').optional(),
  // Обязательный срок цели (как и в обычном создании)
  deadline: Joi.string().valid('3_MONTHS', '6_MONTHS', '1_YEAR').required(),
  imageUrl: Joi.string().uri().optional(),
  subGoals: Joi.array()
    .items(
      Joi.object({
        description: Joi.string().required().min(1).max(250),
        deadline: Joi.date().iso().required()
      })
    )
    .optional()
})


