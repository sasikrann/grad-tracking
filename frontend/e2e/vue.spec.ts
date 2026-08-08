// import { test, expect } from '@playwright/test'

// test('หน้าเว็บเปิดได้', async ({ page }) => {
//   // Arrange + Act: เปิดหน้าแรกของเว็บไซต์
//   await page.goto('/')

//   // Assert: ตรวจว่าชื่อบนแท็บ Browser ตรงกับชื่อที่กำหนดใน index.html
//   await expect(page).toHaveTitle('Vite App')
// })

import { test, expect } from '@playwright/test'

test('Admin สามารถ Development Login ได้', async ({ page }) => {
  // Arrange: เปิดหน้า Login
  await page.goto('/login')

  // Act: กรอกอีเมล
  await page
    .getByLabel('Registered user email')
    // Playwright ต้องมีคำสั่งสำหรับ 2 เรื่อง 
    // 1. หา Element ให้เจอ  เช่น หาช่องกรอกจาก Label <label for="dev-email">Registered user email</label>
    .fill('6631501108@lamduan.mfu.ac.th')
    // 2. สั่งให้ Element ทำอะไร

  // Act: กดปุ่ม Login
  await page
  // <button>Continue for development</button> 
    .getByRole('button', { name: 'Continue for development' })
    .click()

  // Assert: ตรวจว่าเข้าสู่หน้า Admin
  await expect(page).toHaveURL(
  'http://localhost:5173/admin/student-dashboard',
  )
})

// getByRole() — หาเหมือนที่ผู้ใช้และโปรแกรมอ่านหน้าจอมองเห็น เช่น ปุ่ม, ช่องกรอก, ลิงก์, แท็บ, เมนู, รายการ, ตาราง
// getByLabel() — เหมาะกับช่องกรอก เช่น อีเมล, รหัสผ่าน, ชื่อผู้ใช้
// getByPlaceholder() — ใช้เมื่อไม่มี Label ที่ดี เช่น ช่องกรอกที่มี Placeholder
// getByText() — เหมาะกับข้อความทั่วไป เช่น ลิงก์, ปุ่ม, ข้อความในหน้าเว็บ
// getByTestId() — ใช้เมื่อ Element หาแบบอื่นได้ยาก เช่น ปุ่มที่มี Icon หรือ Element ที่ซ่อนอยู่
// locator() — ใช้เมื่อจำเป็นต้องเจาะด้วย CSS เช่น .class, #id, [attribute=value] หรือใช้ XPath