import { prisma } from 'prisma/prisma-client'

function humanizeDays(days: number): string {
  if (days <= 0) return '0 дней'
  const weeks = Math.floor(days / 7)
  const rest = days % 7
  const parts: string[] = []
  if (weeks > 0) parts.push(`${weeks} нед${weeks === 1 ? 'еля' : 'ели'}`)
  if (rest > 0) parts.push(`${rest} дн`)
  return parts.join(' ')
}

export async function buildWeeklyDataForUser(userId: string) {
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const goals = await prisma.goal.findMany({
    where: { userId },
    include: {
      subGoals: { orderBy: { deadline: 'asc' } }
    }
  })

  const activeGoals = goals.filter(g => !g.isCompleted)
  const completedGoals = goals
    .filter(g => g.isCompleted && g.completedAt && g.completedAt >= sevenDaysAgo)
    .map(g => ({
      title: g.title,
      completedAt: g.completedAt?.toISOString(),
      createdAt: g.createdAt.toISOString()
    }))

  const goalsSummary = activeGoals.map(g => {
    const createdAt = g.createdAt.toISOString().slice(0, 10)
    const deadlineAt = g.deadline.toISOString().slice(0, 10)
    const timeLeftDays = Math.max(0, Math.ceil((g.deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    const completed = g.subGoals.filter(sg => sg.isCompleted).length
    const total = g.subGoals.length

    const completedTasks = g.subGoals
      .filter(sg => sg.isCompleted && sg.completedAt && sg.completedAt >= sevenDaysAgo)
      .slice(0, 10)
      .map(sg => ({ description: sg.description, dateCompleted: sg.completedAt!.toISOString().slice(0, 10) }))

    const pendingTasks = g.subGoals
      .filter(sg => !sg.isCompleted && sg.deadline)
      .slice(0, 10)
      .map(sg => ({ description: sg.description, deadline: sg.deadline.toISOString().slice(0, 10) }))

    return {
      title: g.title,
      createdAt,
      deadlineAt,
      timeLeftDays,
      timeLeftHuman: humanizeDays(timeLeftDays),
      completed,
      total,
      completedTasks,
      pendingTasks
    }
  })

  return { goalsSummary, completedGoals }
}


