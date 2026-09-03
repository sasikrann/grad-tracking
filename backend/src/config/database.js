// ไฟล์นี้ใช้ตั้งค่าการเชื่อมต่อฐานข้อมูล PostgreSQL
// ถ้าจะเปลี่ยน database หรือแก้ DATABASE_URL ให้ไปแก้ในไฟล์ backend/.env
import 'dotenv/config'
import pg from 'pg'

const { Pool } = pg

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined in backend/.env')
}

const databaseUrl = new URL(process.env.DATABASE_URL)
if (process.env.DATABASE_HOST_OVERRIDE) {
  databaseUrl.hostname = process.env.DATABASE_HOST_OVERRIDE
}

const pool = new Pool({
  connectionString: databaseUrl.toString(),
})

export default pool
