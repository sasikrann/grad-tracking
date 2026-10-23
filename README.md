# Graduate Tracking System

Graduate Tracking System เป็นเว็บสำหรับติดตามความก้าวหน้าของนักศึกษาระดับบัณฑิตศึกษา ช่วยรวบรวมข้อมูลนักศึกษา อาจารย์ที่ปรึกษา Milestone หลักฐาน และการแจ้งเตือนไว้ในระบบเดียว

ผู้ดูแลระบบสามารถจัดการรายชื่อและกำหนด Milestone อาจารย์สามารถติดตามและตรวจหลักฐานของนักศึกษาในความดูแล ส่วนนักศึกษาสามารถดูความคืบหน้า ส่งหลักฐาน และอ่านประกาศที่เกี่ยวข้องได้

## ความสามารถหลัก

- เข้าสู่ระบบด้วยบัญชี Google ของมหาวิทยาลัย (`@lamduan.mfu.ac.th`)
- นำเข้า ค้นหา และส่งออกข้อมูลนักศึกษากับอาจารย์
- กำหนดและติดตาม Milestone ตามปีเข้า ระดับการศึกษา และแผนการศึกษา
- ส่งหลักฐานให้อาจารย์ตรวจ พร้อมบันทึกผลอนุมัติหรือส่งกลับให้แก้ไข
- จัดการการขยายระยะเวลาศึกษาและสถานะของนักศึกษา
- ส่งประกาศในระบบและส่งสำเนาทาง Email ผ่าน SMTP
- รองรับภาษาไทยและอังกฤษ

โครงสร้างโฟลเดอร์และคำอธิบายไฟล์อยู่ใน [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)

## เทคโนโลยีที่ใช้

| ส่วนของระบบ | เทคโนโลยี | ใช้ทำอะไร |
|---|---|---|
| Frontend | Vue 3, TypeScript, Vite, Tailwind CSS | สร้างหน้าจอที่เปิดในเว็บเบราว์เซอร์ |
| Backend | Node.js, Express | รับคำขอ ตรวจสิทธิ์ และประมวลผลข้อมูล |
| Database | PostgreSQL | เก็บข้อมูลผู้ใช้ นักศึกษา อาจารย์ Milestone และ Notification |
| Authentication | Google Identity Services, JWT Cookie | ยืนยันบัญชีมหาวิทยาลัยและรักษาสถานะการเข้าสู่ระบบ |
| Notification | SMTP | ส่งสำเนาการแจ้งเตือนไปทาง Email |
| Deployment | Docker Compose, Nginx | ประกอบและเปิดระบบสำหรับใช้งานจริง |
| Testing | Node Test Runner, Vitest, Playwright | ตรวจ Backend, Frontend และการใช้งานผ่าน Browser |

## เลือกวิธีติดตั้ง

ระบบเปิดได้สองวิธี:

1. **Docker - แนะนำสำหรับการทดลองใช้และนำขึ้น Server**

   ต้องติดตั้ง Git และ Docker เท่านั้น ไม่ต้องติดตั้ง Node.js หรือ PostgreSQL แยกในเครื่อง

2. **Development - สำหรับเปิด Frontend และ Backend แยกกัน**

   ต้องติดตั้ง Node.js และมี PostgreSQL ที่พร้อมใช้งาน

หากยังไม่แน่ใจ ให้เริ่มด้วย Docker

## สิ่งที่ต้องติดตั้งก่อน

### เมื่อติดตั้งด้วย Docker

- [Git](https://git-scm.com/downloads)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) หรือ Docker Engine ที่มี Docker Compose
- บัญชี Google Cloud ที่สามารถสร้าง OAuth Client ID ได้
- บัญชี Email สำหรับส่ง Notification หากต้องการทดสอบการส่ง Email

### เมื่อติดตั้งแบบ Development

- Git
- Node.js 22 แนะนำ หรือเวอร์ชันที่ Frontend รองรับ (`20.19+` หรือ `22.12+`)
- npm ซึ่งติดมากับ Node.js
- PostgreSQL 17 แนะนำ หรือ PostgreSQL รุ่นที่รองรับคำสั่งใน `backend/database/schema.sql`

## ดาวน์โหลด Source Code

เปิด Terminal หรือ PowerShell แล้วรัน:

```bash
git clone https://github.com/sasikrann/grad-tracking.git
cd grad-tracking
```

คำสั่งแรกดาวน์โหลดโปรเจกต์ ส่วนคำสั่งที่สองย้าย Terminal เข้าไปในโฟลเดอร์โปรเจกต์ คำสั่งทั้งหมดด้านล่างต้องรันจากโฟลเดอร์นี้ เว้นแต่จะระบุไว้ต่างหาก

## วิธีที่ 1: ติดตั้งด้วย Docker

Docker จะเปิดระบบ 3 ส่วนให้พร้อมกัน:

```text
gateway   หน้าเว็บและ Nginx
backend   Node.js API
db        PostgreSQL
```

### 1. สร้างไฟล์ตั้งค่า

Windows PowerShell:

```powershell
Copy-Item .env.docker.example .env.docker
```

macOS หรือ Linux:

```bash
cp .env.docker.example .env.docker
```

เปิด `.env.docker` แล้วเปลี่ยนค่าตัวอย่างอย่างน้อยรายการต่อไปนี้:

- `POSTGRES_PASSWORD` รหัสผ่านฐานข้อมูล
- `GOOGLE_CLIENT_ID` Client ID จาก Google Cloud
- `JWT_SECRET` ข้อความสุ่มยาวอย่างน้อย 32 ตัวอักษร
- `BOOTSTRAP_ADMIN_EMAIL` บัญชี `@lamduan.mfu.ac.th` ที่จะเป็นผู้ดูแลคนแรก
- `SMTP_USER` และ `SMTP_PASS` เมื่อต้องการส่ง Email
- `EMAIL_TEST_RECIPIENT` บัญชีที่ใช้รับ Email ระหว่างทดสอบ

อ่านรายละเอียดเพิ่มเติมได้ที่:

- [คู่มือตั้งค่า Google Sign-In](docs/AUTHENTICATION_SETUP.md)
- [คู่มือตั้งค่าการส่ง Email](docs/NOTIFICATION_SETUP.md)
- [คู่มือฐานข้อมูล PostgreSQL](docs/DATABASE_SETUP.md)

### 2. ตรวจค่าก่อนเปิดระบบ

```bash
docker compose --env-file .env.docker config
```

หากคำสั่งนี้ไม่แสดง Error แปลว่า Docker อ่านไฟล์ตั้งค่าได้ แต่ยังไม่ได้หมายความว่า Google, Email หรือรหัสผ่านทุกค่าถูกต้อง

### 3. Build และเปิดระบบ

```bash
docker compose --env-file .env.docker up -d --build
```

ครั้งแรกอาจใช้เวลาหลายนาที เพราะ Docker ต้องดาวน์โหลด Image และ Build Frontend กับ Backend

### 4. ตรวจสถานะ

```bash
docker compose --env-file .env.docker ps
```

รอจน `db`, `backend` และ `gateway` แสดงสถานะ `healthy` แล้วเปิด:

```text
http://localhost
```

หากหน้า Login เปิดได้ แสดงว่า Gateway และ Frontend ทำงานแล้ว จากนั้นทดลองเข้าสู่ระบบด้วย Email เดียวกับ `BOOTSTRAP_ADMIN_EMAIL`

### 5. ดู Log เมื่อระบบเปิดไม่สำเร็จ

```bash
docker compose --env-file .env.docker logs --tail=200 backend
docker compose --env-file .env.docker logs --tail=200 gateway
docker compose --env-file .env.docker logs --tail=200 db
```

### 6. ปิดระบบ

```bash
docker compose --env-file .env.docker down
```

คำสั่งนี้ไม่ลบข้อมูลใน Database และไฟล์ Upload อย่าเพิ่ม `--volumes` หากต้องการเก็บข้อมูลเดิมไว้

ขั้นตอน Deploy และการดูแลระบบเพิ่มเติมอยู่ใน [DEPLOYMENT.md](DEPLOYMENT.md)

## วิธีที่ 2: ติดตั้งแบบ Development

วิธีนี้เปิด Frontend ที่ `http://localhost:5173` และ Backend ที่ `http://localhost:3000`

### 1. ติดตั้ง Dependencies

```bash
npm --prefix backend ci
npm --prefix frontend ci
```

`npm ci` จะติดตั้ง Dependencies ตามเวอร์ชันที่บันทึกไว้ใน `package-lock.json`

### 2. สร้างไฟล์ตั้งค่า

Windows PowerShell:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

macOS หรือ Linux:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

จากนั้นแก้ค่าต่อไปนี้:

- `backend/.env`: `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `JWT_SECRET` และ `BOOTSTRAP_ADMIN_EMAIL`
- `frontend/.env`: `VITE_GOOGLE_CLIENT_ID`

`GOOGLE_CLIENT_ID` และ `VITE_GOOGLE_CLIENT_ID` ต้องเป็น Client ID ตัวเดียวกัน

### 3. เตรียม PostgreSQL

สร้าง Database ใหม่และนำ Schema เข้าไปก่อนเปิด Backend ดูคำสั่งสำหรับ Windows, macOS, Linux และ Docker ได้ใน [คู่มือฐานข้อมูล PostgreSQL](docs/DATABASE_SETUP.md)

เมื่อฐานข้อมูลพร้อมแล้ว ให้รัน:

```bash
npm --prefix backend run db:migrate
npm --prefix backend run bootstrap:admin
npm --prefix backend run db:audit
```

ผลที่ควรได้คือ Migration ทำงานสำเร็จ บัญชี Admin ถูกสร้างหรือพบว่ามีอยู่แล้ว และ Database Audit แสดง `PASS`

### 4. เปิด Backend

เปิด Terminal แรก:

```bash
npm --prefix backend run dev
```

ตรวจการเชื่อมต่อ Database โดยเปิด:

```text
http://localhost:3000/health
```

ควรได้รับข้อมูลที่มี `status: "ok"` และ `database: "connected"`

### 5. เปิด Frontend

เปิด Terminal อีกหน้าหนึ่ง:

```bash
npm --prefix frontend run dev
```

จากนั้นเปิด:

```text
http://localhost:5173
```

## Environment Variables อยู่ที่ไหน

| ไฟล์ | ใช้เมื่อใด |
|---|---|
| `.env.docker.example` | ตัวอย่างสำหรับ Docker Compose ให้นำไปสร้าง `.env.docker` |
| `backend/.env.example` | ตัวอย่างสำหรับ Backend ที่รันในเครื่อง ให้นำไปสร้าง `backend/.env` |
| `frontend/.env.example` | ตัวอย่างสำหรับ Frontend ที่รันในเครื่อง ให้นำไปสร้าง `frontend/.env` |

ไฟล์ที่ลงท้ายด้วย `.example` เก็บใน Git ได้เพราะไม่มี Secret ส่วน `.env.docker`, `backend/.env` และ `frontend/.env` ต้องเก็บไว้ในเครื่องและห้าม Commit

## Build และตรวจสอบ Source Code

คำสั่งต่อไปนี้ไม่เปิดระบบ แต่ใช้ตรวจว่า Source Code ยัง Build และผ่าน Tests:

```bash
npm --prefix frontend run type-check
npm --prefix frontend run test:unit -- --run
npm --prefix frontend run build
npm --prefix backend test
```

การทดสอบ E2E จะเปิด Docker stack สำหรับทดสอบแยกจากระบบหลัก:

```bash
npm run test:e2e
npm run test:e2e:down
```

## คู่มือการตั้งค่า

- [Google Sign-In และ Authentication](docs/AUTHENTICATION_SETUP.md)
- [Notification และการส่ง Email ผ่าน SMTP](docs/NOTIFICATION_SETUP.md)
- [PostgreSQL และการนำเข้า Schema](docs/DATABASE_SETUP.md)
- [ผลตรวจและแนวทางตั้งค่าความปลอดภัย](docs/SECURITY.md)
- [โครงสร้างโฟลเดอร์และไฟล์](PROJECT_STRUCTURE.md)
- [การ Deploy และดูแล Docker](DEPLOYMENT.md)

## ปัญหาที่พบบ่อย

### หน้า Login แจ้งว่า Google SSO ยังไม่ได้ตั้งค่า

ตรวจว่าใส่ Client ID แล้ว และไม่ได้เหลือคำว่า `YOUR_GOOGLE_CLIENT_ID` ในไฟล์ Environment จากนั้น Build หรือเปิด Frontend ใหม่

### กด Google Sign-In แล้ว Origin ไม่ได้รับอนุญาต

เพิ่ม URL ที่เปิดหน้าเว็บจริงใน **Authorized JavaScript origins** ของ Google Cloud เช่น `http://localhost`, `http://localhost:5173` หรือ Domain ของ Production โดยต้องใส่ Protocol และ Port ให้ตรง

### เข้าด้วยบัญชี Google ได้ แต่ระบบไม่อนุญาต

ระบบรับเฉพาะ Email `@lamduan.mfu.ac.th` ที่มีอยู่ใน Database แล้ว สำหรับ Admin คนแรกให้ตรวจ `BOOTSTRAP_ADMIN_EMAIL` และรัน Bootstrap Admin

### Backend เปิดไม่ได้เพราะ `DATABASE_URL is not defined`

ตรวจว่ามี `backend/.env` และรันคำสั่งจาก Root ผ่าน `npm --prefix backend ...` หรือรันจากภายในโฟลเดอร์ `backend`

### ส่ง Email ไม่สำเร็จ

เปิด [คู่มือ Notification](docs/NOTIFICATION_SETUP.md) แล้วตรวจ App Password, Port, การตั้งค่า TLS และ Log ของ Backend ระหว่างทดสอบ

### แก้ `schema.sql` แล้ว Docker ไม่สร้างตารางใหม่

`schema.sql` ทำงานอัตโนมัติเฉพาะตอนสร้าง Database volume ครั้งแรก ฐานข้อมูลที่มีอยู่แล้วต้องใช้ Migration ห้ามลบ Volume ของระบบจริงเพียงเพื่อให้ Schema ทำงานใหม่
