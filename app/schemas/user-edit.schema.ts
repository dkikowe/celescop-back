import Joi from 'joi'

export const userEditSchema = Joi.object({
	username: Joi.string().optional(),
	firstName: Joi.string().optional(),
	lastName: Joi.string().optional()
})
