import { tokenService } from '@/services/token.service'
import { ApiError } from '@/utils/api-error'
import { NextFunction, Request, Response } from 'express'

export function authMiddleware(
	req: Request,
	res: Response,
	next: NextFunction
): void {
	try {
		const authHeader = req.headers.authorization
		if (!authHeader) throw new ApiError(401, 'Не авторизован')

		const accessToken = authHeader.split(' ')[1]
		if (!accessToken) throw new ApiError(401, 'Не авторизован')

		const userData = tokenService.validateAccess(accessToken)
		if (!userData) throw new ApiError(401, 'Не авторизован')

		next()
	} catch (error) {
		console.log('Auth Middleware - Error:', error)
		return next(new ApiError(401, 'Не авторизован'))
	}
}
