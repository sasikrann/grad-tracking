import cors from 'cors'
import express from 'express'

import pool from './config/database.js'
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js'
import usersRouter from './routes/users.routes.js'

const app = express()

app.use(cors())
app.use(express.json())

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

app.use('/api/users', usersRouter)

app.use(notFoundHandler)
app.use(errorHandler)

export default app
