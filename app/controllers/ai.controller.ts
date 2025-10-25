import { Router, Request, Response, NextFunction } from 'express'
import { aiService } from '@/services/ai.service'
import { prisma } from 'prisma/prisma-client'
import { authMiddleware } from '@/middlewares/auth.middleware'
import { tokenService } from '@/services/token.service'
import { buildWeeklyDataForUser } from '@/services/weekly-report.service'
import { telegramService } from '@/services/telegram.service'

const router = Router()

router.post('/goal/description', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, context } = req.body || {}
    const text = await aiService.generateGoalDescription({ title, context })
    res.status(200).json({ text })
  } catch (err) {
    next(err)
  }
})

router.post('/goal/tasks', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, context, maxItems, deadline } = req.body || {}
    const tasks = await aiService.generateTasks({ title, context, maxItems, deadline })
    res.status(200).json({ tasks })
  } catch (err) {
    next(err)
  }
})

router.post('/goal/motivation', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { completed, total } = req.body || {}
    const text = await aiService.generateMotivation({ completed, total })
    res.status(200).json({ text })
  } catch (err) {
    next(err)
  }
})

router.post('/goal/weekly-report', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userName, goalsSummary, completedGoals } = req.body || {}
    const text = await aiService.generateWeeklyReport({ userName, goalsSummary, completedGoals })
    res.status(200).json({ text })
  } catch (err) {
    next(err)
  }
})

// Сбор данных из БД и возврат отчёта для текущего пользователя
router.get('/goal/weekly-report/from-db', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    const user: any = tokenService.validateAccess(token)
    const data = await buildWeeklyDataForUser(user.id)
    const text = await aiService.generateWeeklyReport({ userName: user.firstName, goalsSummary: data.goalsSummary, completedGoals: data.completedGoals })
    res.status(200).json({ text, goalsSummary: data.goalsSummary, completedGoals: data.completedGoals })
  } catch (err) {
    next(err)
  }
})

// Генерация недельного отчёта для текущего пользователя
router.get('/goal/weekly-report', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    const user: any = tokenService.validateAccess(token)
    
    // Если уже есть сохранённый отчёт — вернуть его
    const existing: any = await prisma.user.findUnique({ where: { id: user.id } })
    if (existing?.weekReport) {
      res.status(200).json({ text: existing.weekReport })
      return
    }

    // Иначе собрать данные и сгенерировать
    const data = await buildWeeklyDataForUser(user.id)
    const text = await aiService.generateWeeklyReport({ userName: user.firstName || 'Пользователь', goalsSummary: data.goalsSummary, completedGoals: data.completedGoals })

    // Сохранить в user.weekReport
    await prisma.user.update({ where: { id: user.id }, data: { weekReport: text } as any })
    
    // Возвращаем только текст
    res.status(200).json({ text })
  } catch (err) {
    next(err)
  }
})

router.get('/goal/templates', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const templates = await aiService.generateTemplates()
    res.status(200).json({ templates })
  } catch (err) {
    next(err)
  }
})

router.post('/goal/from-template', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { template, deadline, maxItems, context, shortDescription } = req.body || {}
    const result = await aiService.generateGoalFromTemplate({ template, deadline, maxItems, context, shortDescription })
    res.status(200).json(result)
  } catch (err) {
    next(err)
  }
})

router.post('/goal/chat', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { question, context, history, focus } = req.body || {}
    const result = await aiService.chatAboutGoals({ question, context, history, focus })
    res.status(200).json(result)
  } catch (err) {
    next(err)
  }
})

// Мотивационные сообщения по триггерам (для конкретного пользователя)
router.post('/goal/trigger-message', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    const user: any = tokenService.validateAccess(token)
    const { type, goalTitle, taskTitle, totalTasks, completedTasks } = req.body || {}
    const text = await aiService.generateTriggerMessage({
      type,
      goalTitle,
      taskTitle,
      totalTasks,
      completedTasks,
      userName: user?.firstName
    })
    let sent = false
    if (user?.chatId) {
      await telegramService.sendMessage(user.chatId, text)
      sent = true
    }
    res.status(200).json({ text, sent })
  } catch (err) {
    next(err)
  }
})

export const aiController = router


