import cors from 'cors'
import express from 'express'

import pool from './config/database.js'
import { requireAuth, requireRole } from './middleware/auth.middleware.js'
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js'
import authRouter from './routes/auth.routes.js'
import advisorsRouter from './routes/advisors.routes.js'
import milestonesRouter from './routes/milestones.routes.js'
import studentProfileRouter from './routes/student-profile.routes.js'
import studentsRouter from './routes/students.routes.js'
import usersRouter from './routes/users.routes.js'

const app = express()

app.use(cors())
app.use(express.json())
app.use('/api/auth', authRouter)
app.use('/api/advisors', requireAuth, requireRole('advisor', 'admin', 'student'), advisorsRouter)
app.use('/api/milestones', requireAuth, requireRole('admin'), milestonesRouter)
app.use('/api/student-profile', requireAuth, requireRole('student'), studentProfileRouter)
app.use('/api/students', requireAuth, requireRole('admin'), studentsRouter)

app.get('/health', async (_request, response, next) => {
  try {
    const result = await pool.query('SELECT NOW() AS database_time')

    response.json({
      status: 'ok',
      database: 'connected',
      databaseTime: result.rows[0].database_time,
    })
  } catch (error) {
    next(error)
  }
})

app.use('/api/users', requireAuth, requireRole('admin'), usersRouter)

app.use(notFoundHandler)
app.use(errorHandler)

export default app
