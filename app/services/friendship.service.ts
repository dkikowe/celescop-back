import { UserDto } from '@/dtos/user.dto'
import { ApiError } from '@/utils/api-error'
import { prisma } from 'prisma/prisma-client'

class FriendshipService {
	async createFriendship(userId: string, friendId: string) {
		if (userId === friendId)
			throw new ApiError(400, 'Нельзя добавить самого себя в друзья')

		const candidate = await prisma.friendship.findFirst({
			where: {
				OR: [
					{ firstUserId: userId, secondUserId: friendId },
					{ firstUserId: friendId, secondUserId: userId }
				]
			}
		})

		if (candidate) {
			throw new ApiError(400, 'Дружба уже существует')
		}

		const friendship = await prisma.friendship.create({
			data: { firstUserId: userId, secondUserId: friendId }
		})

		return friendship
	}

	async removeFriendship(userId: string, friendId: string) {
		// Сначала найдем дружбу, так как она может быть в любом направлении
		const friendship = await prisma.friendship.findFirst({
			where: {
				OR: [
					{ firstUserId: userId, secondUserId: friendId },
					{ firstUserId: friendId, secondUserId: userId }
				]
			}
		})

		if (!friendship) {
			throw new ApiError(404, 'Дружба не найдена')
		}

		// Удаляем найденную дружбу
		await prisma.friendship.delete({
			where: {
				firstUserId_secondUserId: {
					firstUserId: friendship.firstUserId,
					secondUserId: friendship.secondUserId
				}
			}
		})

		return friendship
	}

	async getFriends(userId: string) {
		const friendShips = await prisma.friendship.findMany({
			where: {
				OR: [{ firstUserId: userId }, { secondUserId: userId }]
			}
		})

		const friendsIds = friendShips.map(friendship => {
			return friendship.firstUserId === userId
				? friendship.secondUserId
				: friendship.firstUserId
		})

		const friends = await prisma.user.findMany({
			where: {
				id: { in: friendsIds }
			}
		})

		const friendsDto = friends.map(friend => new UserDto(friend))

		return friendsDto
	}
}

export const friendshipService = new FriendshipService()
