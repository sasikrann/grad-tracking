import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import pg from 'pg'

dotenv.config()

const { Pool } = pg

const app = express()
const port = process.env.PORT || 3000

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

app.use(cors())
app.use(express.json())

app.get('/health', async (_request, response) => {
  try {
    const result = await pool.query('SELECT NOW() AS database_time')

    response.json({
      status: 'ok',
      database: 'connected',
      databaseTime: result.rows[0].database_time,
    })
  } catch (error) {
    response.status(500).json({
      status: 'error',
      database: 'disconnected',
      message: error.message,
    })
  }
})

app.listen(port, () => {
  console.log(`Backend is running on http://localhost:${port}`)
})
