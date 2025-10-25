import { prisma } from 'prisma/prisma-client'

class WeeklyReportStorageService {
  async saveWeeklyReport(userId: string, text: string, weekStart: Date) {
    return await prisma.weeklyReport.upsert({
      where: {
        userId_weekStart: {
          userId,
          weekStart
        }
      },
      update: {
        text,
        updatedAt: new Date()
      },
      create: {
        userId,
        text,
        weekStart
      }
    })
  }

  async getLatestWeeklyReport(userId: string) {
    return await prisma.weeklyReport.findFirst({
      where: { userId },
      orderBy: { weekStart: 'desc' }
    })
  }

  async getAllWeeklyReports(userId: string) {
    return await prisma.weeklyReport.findMany({
      where: { userId },
      orderBy: { weekStart: 'desc' }
    })
  }
}

export const weeklyReportStorageService = new WeeklyReportStorageService()
