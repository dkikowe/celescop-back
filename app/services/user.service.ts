import { deleteFile, uploadFile } from '@/lib/s3'
import { prisma } from 'prisma/prisma-client'

class UserService {
	async getUserById(userId: string) {
		return await prisma.user.findUnique({ where: { id: userId } })
	}

	async editUser(userId: string, data: any) {
		return await prisma.user.update({
			where: { id: userId },
			data
		})
	}

	async editUserPhoto(userId: string, fileBuffer: Buffer) {
		const user = await prisma.user.findUnique({ where: { id: userId } })

		if (!user) {
			throw new Error('User not found')
		}

		const oldPhotoUrl = user.photoUrl
		if (oldPhotoUrl) {
			const oldFileName = oldPhotoUrl.split('/').pop()
			if (oldFileName) {
				await deleteFile(oldFileName)
			}
		}

		const fileName = `user-${userId}-${Date.now()}.jpg`
		const fileUrl = await uploadFile(fileBuffer, fileName)

		return await prisma.user.update({
			where: { id: userId },
			data: { photoUrl: fileUrl }
		})
	}
}

export const userService = new UserService()
