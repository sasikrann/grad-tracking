// ไฟล์สำหรับเริ่มรัน backend server
// ใช้ดึง app จาก app.js แล้วสั่งให้ server ทำงานที่ port ที่กำหนด
import app from './app.js'

const port = process.env.PORT || 3000

app.listen(port, () => {
  console.log(`Backend is running on http://localhost:${port}`)
})
