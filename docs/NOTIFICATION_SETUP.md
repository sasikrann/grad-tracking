# คู่มือตั้งค่า Notification และ Email

Notification ของระบบมีสองส่วน:

1. ข้อความที่นักศึกษาเปิดอ่านภายในเว็บไซต์
2. สำเนาที่ส่งไปทาง Email เมื่อผู้ส่งเลือก **ส่ง Email**

การสร้าง Notification ในเว็บไซต์ทำได้แม้ยังไม่ตั้งค่า Email แต่หากเลือกส่ง Email ระบบต้องเชื่อมต่อ SMTP Server ได้ก่อน

## SMTP คืออะไร

SMTP เป็นช่องทางมาตรฐานสำหรับส่ง Email โปรเจกต์นี้เชื่อมต่อ SMTP โดยตรง ไม่ได้ใช้ Email API หรือบริการส่งข้อความอื่น

ตัวอย่างในโปรเจกต์ใช้ Gmail SMTP แต่สามารถเปลี่ยนเป็น SMTP Server ของหน่วยงานได้ หากทราบ Host, Port, วิธีเข้ารหัส และข้อมูลบัญชีที่ Server นั้นกำหนด

## ค่าที่ระบบใช้

| ตัวแปร | ความหมาย |
|---|---|
| `SMTP_HOST` | ที่อยู่ SMTP Server เช่น `smtp.gmail.com` |
| `SMTP_PORT` | Port ที่ใช้เชื่อมต่อ เช่น `465` หรือ `587` |
| `SMTP_SECURE` | `true` เมื่อเชื่อมต่อ TLS ตั้งแต่เริ่ม มักใช้กับ Port 465 |
| `SMTP_STARTTLS` | `true` เมื่อเริ่มแบบปกติแล้วเปลี่ยนเป็น TLS มักใช้กับ Port 587 |
| `SMTP_USER` | บัญชี Email ผู้ส่ง |
| `SMTP_PASS` | รหัสผ่านสำหรับ Application ไม่ควรใช้รหัสผ่านบัญชีหลัก |
| `SMTP_FROM` | ชื่อและ Email ที่แสดงเป็นผู้ส่ง |
| `EMAIL_TEST_MODE` | เมื่อเป็น `true` จะไม่ส่งหาผู้รับจริง |
| `EMAIL_TEST_RECIPIENT` | Email เพียงบัญชีเดียวที่รับข้อความทั้งหมดระหว่างทดสอบ |

## วิธีที่แนะนำ: Gmail พร้อม App Password

Google กำหนดให้บัญชีต้องเปิด 2-Step Verification ก่อนจึงจะสร้าง App Password ได้ บางบัญชีขององค์กรอาจไม่มีเมนูนี้ หากผู้ดูแล Google Workspace ปิดการใช้งานไว้ ในกรณีนั้นต้องขอข้อมูล SMTP ที่หน่วยงานอนุญาตให้ใช้

1. เปิด [Google Account Security](https://myaccount.google.com/security)
2. เปิด **2-Step Verification** ให้เรียบร้อย
3. เปิดหน้า [App passwords](https://myaccount.google.com/apppasswords)
4. สร้าง App Password สำหรับระบบนี้
5. คัดลอกรหัสที่ Google แสดงไปใส่ใน `SMTP_PASS`

App Password เป็นข้อมูลลับ แม้จะไม่ใช่รหัสผ่านบัญชีหลัก ห้ามใส่ในไฟล์ `.example`, Screenshot, เอกสาร หรือ Git

เอกสารทางการ: [Sign in with app passwords](https://support.google.com/accounts/answer/185833)

## ตั้งค่า Gmail Port 465

ค่านี้เชื่อมต่อแบบเข้ารหัสตั้งแต่เริ่ม:

```dotenv
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_STARTTLS=false
SMTP_USER=your_sender@gmail.com
SMTP_PASS=YOUR_16_CHARACTER_APP_PASSWORD
SMTP_FROM="Graduate Tracking <your_sender@gmail.com>"
```

## ทางเลือก: Gmail Port 587

ค่านี้เริ่มเชื่อมต่อก่อนแล้วเปลี่ยนเป็น TLS:

```dotenv
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_STARTTLS=true
SMTP_USER=your_sender@gmail.com
SMTP_PASS=YOUR_16_CHARACTER_APP_PASSWORD
SMTP_FROM="Graduate Tracking <your_sender@gmail.com>"
```

เลือกใช้เพียงชุดเดียว หากหน่วยงานกำหนด SMTP Server เอง ให้ใช้ค่าที่ผู้ดูแลระบบแจ้งแทนตัวอย่าง Gmail

## ใส่ค่าไว้ที่ไหน

- Docker: ใส่ใน `.env.docker`
- Development: ใส่ใน `backend/.env`

หลังแก้ค่าให้ Restart Backend:

```bash
# Docker
docker compose --env-file .env.docker up -d

# Development: หยุด Backend ด้วย Ctrl+C แล้วเปิดใหม่
npm --prefix backend run dev
```

## เปิด Email Test Mode ก่อนเสมอ

ระหว่างตั้งค่า ให้เปิดโหมดทดสอบ:

```dotenv
EMAIL_TEST_MODE=true
EMAIL_TEST_RECIPIENT=your_test_recipient@gmail.com
```

เมื่อเปิดโหมดนี้ ระบบยังคำนวณกลุ่มผู้รับตามจริง แต่จะเปลี่ยนปลายทางทั้งหมดไปยัง `EMAIL_TEST_RECIPIENT` เพียงบัญชีเดียว ช่วยป้องกันการส่งข้อความทดสอบให้นักศึกษาจริงโดยไม่ตั้งใจ

## วิธีทดสอบ

1. เข้าระบบด้วยบัญชี Admin
2. เปิดหน้าจัดการ Notification
3. สร้างข้อความที่ระบุชัดว่าเป็นการทดสอบ
4. เลือกกลุ่มผู้รับ
5. ติ๊ก **ส่ง Email**
6. ส่ง Notification
7. ตรวจ Inbox และ Spam ของ `EMAIL_TEST_RECIPIENT`

หาก Email ส่งไม่สำเร็จ ระบบจะยกเลิกการสร้าง Notification รายการนั้นด้วย เพื่อไม่ให้หน้าเว็บแสดงว่าส่งสำเร็จทั้งที่ Email ล้มเหลว

ดู Backend Log ระหว่างทดสอบ:

```bash
# Docker
docker compose --env-file .env.docker logs -f --tail=200 backend

# Development
# ดูข้อความใน Terminal ที่กำลังรัน Backend
```

## ก่อนส่งหาผู้รับจริง

ทำรายการต่อไปนี้ให้ครบ:

- ส่งทดสอบสำเร็จทั้งข้อความธรรมดาและข้อความที่มีไฟล์แนบ
- ตรวจชื่อผู้ส่งและรูปแบบ Email
- ตรวจว่า Email นักศึกษาใน Database ถูกต้อง
- ตรวจกลุ่มเป้าหมายก่อนกดส่ง
- สำรองข้อมูลหากกำลังทดสอบบน Production

เมื่อพร้อมแล้วจึงเปลี่ยน:

```dotenv
EMAIL_TEST_MODE=false
```

Restart Backend หลังเปลี่ยนค่า การปิด Test Mode ทำให้ระบบส่งไปยัง Email จริงของนักศึกษาในกลุ่มที่เลือกทันที

## ข้อจำกัดของไฟล์แนบ

ระบบรองรับไฟล์แนบใน Email ขนาดไม่เกิน 10 MB หากไฟล์ใหญ่กว่านี้การส่งจะล้มเหลว ควรทดสอบชนิดไฟล์ที่ใช้งานจริงก่อนเปิดระบบ

## แก้ปัญหาเบื้องต้น

### แจ้งว่าขาด `SMTP_HOST`

ตรวจว่าแก้ไฟล์ Environment ของ Backend ถูกชุดและ Restart Backend แล้ว

### Gmail แจ้งว่าชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง

- ตรวจ `SMTP_USER`
- ใช้ App Password ไม่ใช่รหัสผ่าน Google Account
- ตรวจว่าเปิด 2-Step Verification แล้ว
- หากเพิ่งเปลี่ยนรหัสผ่าน Google ให้สร้าง App Password ใหม่

### เชื่อมต่อหมดเวลา

- ตรวจว่า Network หรือ Firewall อนุญาต Port 465 หรือ 587
- ลองใช้ชุด Port/TLS อีกแบบตามนโยบายของ Server
- หาก Server ตอบช้า สามารถเพิ่ม `SMTP_TIMEOUT_MS` ใน `backend/.env`

### เปิด Test Mode แล้วส่งไม่ได้

ต้องกำหนด `EMAIL_TEST_RECIPIENT` ด้วย หากเว้นว่าง ระบบจะหยุดการส่งเพื่อป้องกัน Email ออกไปผิดบัญชี

### ส่งสำเร็จแต่ไม่พบ Email

- ตรวจ Spam หรือ Junk
- ตรวจ `SMTP_FROM` ว่าตรงกับบัญชีที่ SMTP Server อนุญาต
- ตรวจ Backend Log
- ตรวจข้อจำกัดของ Google Workspace หรือ SMTP Server ของหน่วยงาน
