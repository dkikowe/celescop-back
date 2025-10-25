import { User } from '@prisma/client'
import jwt from 'jsonwebtoken'
import { prisma } from 'prisma/prisma-client'

class TokenService {
	generateTokens(payload: any) {
		const accessToken = jwt.sign(payload, process.env.ACCESS_SECRET, {
			expiresIn: '30m'
		})
		const refreshToken = jwt.sign(payload, process.env.REFRESH_SECRET, {
			expiresIn: '30d'
		})

		return { accessToken, refreshToken }
	}

	async saveRefresh(token: string, userId: string) {
		const candidate = await prisma.refreshToken.findUnique({
			where: { userId }
		})

		if (candidate) {
			await prisma.refreshToken.update({
				where: { userId },
				data: { token }
			})
		} else {
			await prisma.refreshToken.create({ data: { token, userId } })
		}
	}

	async removeRefresh(refreshToken: string) {
		await prisma.refreshToken.delete({ where: { token: refreshToken } })
	}

	async findRefresh(refreshToken: string) {
		return await prisma.refreshToken.findUnique({ where: { token: refreshToken } })
	}

	validateRefresh(refreshToken: string) {
		try {
			return jwt.verify(refreshToken, process.env.REFRESH_SECRET)
		} catch {
			return null
		}
	}

	validateAccess(accessToken: string): User {
		try {
			return jwt.verify(accessToken, process.env.ACCESS_SECRET) as User
		} catch {
			return null
		}
	}
}

export const tokenService = new TokenService()
