import { getDeadline } from '@/utils/get-deadline'
import { prisma } from 'prisma/prisma-client'
import { uploadFile } from '@/lib/s3'
import { ApiError } from '@/utils/api-error'
import { SubGoal } from '@prisma/client'

class GoalService {
	async createGoal(
		userId: string,
		data: {
			title: string
			urgencyLevel: 'LOW' | 'AVERAGE' | 'HIGH'
			specific: string
			measurable: string
			attainable: string
			award: string
			description: string
			relevant: string
			privacy: 'PRIVATE' | 'PUBLIC'
			deadline: '3_MONTHS' | '6_MONTHS' | '1_YEAR'
			imageUrl?: string
			subGoals?: { description: string; deadline: Date }[]
			source?: string // Добавляем поле source для валидации
			shortDescription?: string // Добавляем для валидации
		}
	) {
		const deadline = getDeadline(data.deadline)
		const { subGoals, source, shortDescription, ...dataWithoutSubGoals } = data

		delete dataWithoutSubGoals.deadline
		// Явно удаляем shortDescription и source, если они вдруг попали (TypeScript не видит их в типе, но они могут быть в runtime)
		if ('shortDescription' in dataWithoutSubGoals) {
			delete (dataWithoutSubGoals as any).shortDescription
		}
		if ('source' in dataWithoutSubGoals) {
			delete (dataWithoutSubGoals as any).source
		}

		console.log('[GoalService.createGoal] Данные для Prisma:', {
			userId,
			deadline,
			keys: Object.keys(dataWithoutSubGoals),
			hasShortDescription: 'shortDescription' in dataWithoutSubGoals,
			hasSource: 'source' in dataWithoutSubGoals
		})

		const goal = await prisma.goal.create({
			data: { userId, deadline, ...dataWithoutSubGoals }
		})

		if (subGoals) {
			await Promise.all(
				subGoals.map(subGoal =>
					prisma.subGoal.create({
						data: { goalId: goal.id, ...subGoal }
					})
				)
			)
		}

		return { ...goal, subGoals: subGoals || [] }
	}

	async getGoals(userId: string) {
		return await prisma.goal.findMany({
			where: { userId },
			include: { 
				subGoals: {
					orderBy: {
						deadline: 'asc'
					}
				}
			}
		})
	}

	async getFriendGoals(userId: string) {
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

		const goals = await prisma.goal.findMany({
			where: { userId: { in: friendsIds }, privacy: 'PUBLIC' },
			include: { 
				subGoals: {
					orderBy: {
						deadline: 'asc'
					}
				}
			}
		})

		return goals
	}

	async completeGoal(userId: string, goalId: number, fileBuffer: Buffer) {
		const completedImageUrl = await uploadFile(
			fileBuffer,
			`goal-${goalId}-${Date.now()}.jpg`
		)
		const goal = await prisma.goal.update({
			where: { id: goalId, userId },
			data: { isCompleted: true, completedAt: new Date(), imageUrl: completedImageUrl },
			include: {
				user: true
			}
		})

		return goal
	}

	async completeSubGoal(userId: string, subGoalId: number): Promise<SubGoal> {
		const subGoal = await prisma.subGoal.findUnique({
			where: { id: subGoalId },
			include: { goal: true }
		})

		if (!subGoal) {
			throw new ApiError(404, 'Sub-goal not found')
		}

		if (subGoal.goal.userId !== userId) {
			throw new ApiError(403, 'Not authorized to complete this sub-goal')
		}

		return await prisma.subGoal.update({
			where: { id: subGoalId },
			data: {
				isCompleted: true,
				completedAt: new Date()
			}
		})
	}

	async uncompleteSubGoal(userId: string, subGoalId: number) {
		const subGoal = await prisma.subGoal.findUnique({
			where: { id: subGoalId },
			include: { goal: true }
		})

		if (!subGoal) {
			throw new ApiError(404, 'Sub-goal not found')
		}

		if (subGoal.goal.userId !== userId) {
			throw new ApiError(403, 'Not authorized to uncomplete this sub-goal')
		}

		return await prisma.subGoal.update({
			where: { id: subGoalId },
			data: {
				isCompleted: false,
				completedAt: null
			}
		})
	}

	async getGoal(userId: string, goalId: number) {
		const goal = await prisma.goal.findFirst({
			where: {
				id: goalId,
				userId
			},
			include: {
				subGoals: {
					orderBy: {
						deadline: 'asc'
					}
				}
			}
		})

		if (!goal) {
			throw new ApiError(404, 'Цель не найдена')
		}

		return goal
	}

	async updateGoal(userId: string, goalId: number, data: any) {
		const goal = await prisma.goal.findUnique({
			where: { id: goalId },
			include: { subGoals: true }
		})

		if (!goal) {
			throw new ApiError(404, 'Goal not found')
		}

		if (goal.userId !== userId) {
			throw new ApiError(403, 'Not authorized to update this goal')
		}

		// Преобразуем строковый дедлайн в дату
		if (data.deadline) {
			data.deadline = getDeadline(data.deadline)
		}

		// Сохраняем текущее значение privacy, если оно не указано в данных
		if (!data.privacy) {
			data.privacy = goal.privacy
		}

		// Если есть подцели, обновляем их
		if (data.subGoals) {
			// Создаем Map существующих подцелей для быстрого поиска
			const existingSubGoalsMap = new Map(
				goal.subGoals.map(subGoal => [subGoal.description, subGoal])
			)

			// Обновляем или создаем подцели
			await Promise.all(
				data.subGoals.map(async (subGoal: any) => {
					const existingSubGoal = existingSubGoalsMap.get(subGoal.description)
					
					if (existingSubGoal) {
						// Если подцель существует, обновляем только описание и дедлайн
						// Сохраняем статус выполнения
						return prisma.subGoal.update({
							where: { id: existingSubGoal.id },
							data: {
								description: subGoal.description,
								deadline: subGoal.deadline
							}
						})
					} else {
						// Если это новая подцель, создаем её
						return prisma.subGoal.create({
							data: {
								...subGoal,
								goalId
							}
						})
					}
				})
			)

			// Удаляем подцели, которых нет в новом списке
			const newSubGoalDescriptions = new Set(data.subGoals.map((sg: any) => sg.description))
			await prisma.subGoal.deleteMany({
				where: {
					goalId,
					description: {
						notIn: Array.from(newSubGoalDescriptions) as string[]
					}
				}
			})

			// Удаляем subGoals из data, так как мы их уже обработали
			delete data.subGoals
		}

		return await prisma.goal.update({
			where: { id: goalId },
			data,
			include: {
				subGoals: true
			}
		})
	}
}

export const goalService = new GoalService()
