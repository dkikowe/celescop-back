import express from 'express'
import dotenv from 'dotenv'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'

import { authController } from './controllers/auth.controller'
import { userController } from './controllers/user.controller'
import { goalController } from './controllers/goal.controller'
import { friendshipController } from './controllers/friendship.controller'
import { settingsController } from './controllers/settings.controller'
import { errorMiddleware } from './middlewares/error.middleware'
import { aiController } from './controllers/ai.controller'
import './scheduler'

dotenv.config()
const app = express()
const port = process.env.PORT || 4000

// Безопасность
app.use(helmet())

// Увеличиваем лимит для больших JSON-запросов
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// Парсер cookies
app.use(cookieParser())

// Доверяем прокси (нужно для корректной работы secure cookies за Nginx/Proxy)
app.set('trust proxy', 1)

// CORS с поддержкой credentials и preflight
app.use(
  cors({
    origin: [
      'https://celiscope.ru',
      'https://www.celiscope.ru',
      'https://api.celiscope.ru',
      'http://localhost:5173'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
)
app.options('*', cors())


// Контроллеры
app.use('/api/auth', authController)
app.use('/api/user', userController)
app.use('/api/goal', goalController)
app.use('/api/friendship', friendshipController)
app.use('/api/settings', settingsController)
app.use('/api/ai', aiController)

// Обработка ошибок
app.use(errorMiddleware)

// Запуск сервера
app.listen(port, () => {
  console.log(`Tseleskop Server listening on port ${port}`)
})
