import { ApiError } from '@/utils/api-error'
import { NextFunction, Request, Response } from 'express'

export function errorMiddleware(
	err: unknown,
	req: Request,
	res: Response,
	next: NextFunction
): void {
	try {
		if (res.headersSent) {
			return next(err)
		}

		if (err instanceof ApiError) {
			console.error('[ErrorMiddleware] ApiError:', err.status, err.message)
			res.status(err.status).json({ 
				error: err.message,
				status: err.status
			})
			return
		}

		// Логируем полную ошибку для отладки
		console.error('[ErrorMiddleware] Unexpected error:', err)
		if (err instanceof Error) {
			console.error('[ErrorMiddleware] Error stack:', err.stack)
		}

		res.status(500).json({ 
			error: 'Случилась непредвиденная ошибка',
			message: err instanceof Error ? err.message : 'Unknown error',
			status: 500
		})
	} catch (error) {
		console.error('[ErrorMiddleware] Error in error handler:', error)
		return next()
	}
}
