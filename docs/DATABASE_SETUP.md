# คู่มือตั้งค่า PostgreSQL

PostgreSQL เก็บข้อมูลหลักทั้งหมดของระบบ เช่น บัญชีผู้ใช้ นักศึกษา อาจารย์ Milestone หลักฐานที่อ้างอิง และ Notification

เลือกวิธีเตรียมฐานข้อมูลตามวิธีเปิดระบบ:

- ใช้ Docker: PostgreSQL ถูกสร้างให้อัตโนมัติ
- รัน Backend ในเครื่อง: ต้องเตรียม PostgreSQL และนำ `schema.sql` เข้า Database ก่อน

## วิธีที่ 1: PostgreSQL ผ่าน Docker

วิธีนี้ไม่ต้องติดตั้ง PostgreSQL ในเครื่อง Docker จะสร้าง Service ชื่อ `db` จาก `postgres:17-alpine`

### 1. ตั้งค่าฐานข้อมูล

เปิด `.env.docker` แล้วเปลี่ยน:

```dotenv
POSTGRES_DB=grad_tracking
POSTGRES_USER=grad_tracking
POSTGRES_PASSWORD=CHANGE_TO_A_LONG_DATABASE_PASSWORD
```

ใช้รหัสผ่านยาวและคาดเดายาก ห้าม Commit `.env.docker`

### 2. เปิดระบบ

```bash
docker compose --env-file .env.docker up -d --build
```

เมื่อสร้าง Database volume ครั้งแรก Docker จะนำ `backend/database/schema.sql` เข้าไปสร้างตารางโดยอัตโนมัติ จากนั้น Backend จะรัน Migration และสร้าง Admin เริ่มต้นก่อนเปิด API

### 3. ตรวจสถานะ

```bash
docker compose --env-file .env.docker ps
```

Service `db` ควรแสดง `healthy`

ตรวจ Backend ซึ่งเชื่อมต่อ Database อยู่:

```bash
docker compose --env-file .env.docker exec backend npm run db:audit
```

รายการตรวจที่กำหนดว่าต้องเป็นศูนย์ควรแสดง `PASS`

### 4. เปิด PostgreSQL Command Line

หากใช้ค่า Database และ User ตามตัวอย่าง:

```bash
docker compose --env-file .env.docker exec db psql -U grad_tracking -d grad_tracking
```

ออกจาก `psql` ด้วย:

```text
\q
```

### เรื่องสำคัญเกี่ยวกับ Database volume

`schema.sql` ทำงานอัตโนมัติเฉพาะตอน Volume ยังว่าง การแก้ `schema.sql` ภายหลังจะไม่ทำให้ฐานข้อมูลเดิมเปลี่ยนทันที ต้องใช้ Migration สำหรับฐานข้อมูลที่มีอยู่

คำสั่งนี้ปิด Container แต่ยังเก็บข้อมูล:

```bash
docker compose --env-file .env.docker down
```

อย่าใช้ `down --volumes` กับข้อมูลจริง เพราะจะลบ Database volume และ Upload volume

## วิธีที่ 2: PostgreSQL ที่ติดตั้งในเครื่อง

ตัวอย่างนี้สมมติว่า PostgreSQL ทำงานที่ `localhost:5432` และมี User ชื่อ `postgres`

ตัวอย่างนี้เหมาะสำหรับ Development ที่อยู่ในเครื่อง หากเป็น Production ควรสร้างบัญชีเฉพาะที่ไม่ใช่ Superuser ตามหัวข้อ [แนวทาง Production ที่ไม่ใช้ Superuser](SECURITY.md#แนวทาง-production-ที่ไม่ใช้-superuser)

### 1. สร้าง Database

```bash
createdb -U postgres grad_tracking
```

หากเครื่องไม่รู้จักคำสั่ง `createdb` ให้เปิด SQL Shell (`psql`) ที่ติดมากับ PostgreSQL หรือเพิ่มโฟลเดอร์ `bin` ของ PostgreSQL ลงใน PATH

สร้างผ่าน `psql` ได้เช่นกัน:

```sql
CREATE DATABASE grad_tracking;
```

### 2. นำ Schema เข้า Database ใหม่

รันจากโฟลเดอร์ Root ของโปรเจกต์:

```bash
psql -U postgres -d grad_tracking -f backend/database/schema.sql
```

ไฟล์นี้สร้างตาราง Type, Index และความสัมพันธ์ที่ระบบต้องใช้ ควรใช้กับ Database ใหม่ที่ยังไม่มี Schema ของโปรเจกต์

### 3. ตั้งค่าการเชื่อมต่อ Backend

สร้าง `backend/.env` จากไฟล์ตัวอย่าง แล้วแก้:

```dotenv
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/grad_tracking
```

ความหมายของ URL:

```text
postgresql://ชื่อผู้ใช้:รหัสผ่าน@ชื่อเครื่อง:port/ชื่อฐานข้อมูล
```

หากรหัสผ่านมีอักขระพิเศษ เช่น `@`, `:`, `/` หรือ `#` ต้องแปลงเป็น URL encoding ก่อน มิฉะนั้น Backend อาจอ่าน URL ผิด

### 4. รัน Migration

Migration ใช้ปรับ Database ที่มีอยู่ให้ตรงกับ Source Code ปัจจุบัน และบันทึกว่าไฟล์ใดทำไปแล้ว จึงสามารถเรียกซ้ำได้

```bash
npm --prefix backend run db:migrate
```

### 5. สร้าง Admin คนแรก

ใส่ข้อมูลใน `backend/.env`:

```dotenv
BOOTSTRAP_ADMIN_EMAIL=your_admin@lamduan.mfu.ac.th
BOOTSTRAP_ADMIN_NAME=System Administrator
```

จากนั้นรัน:

```bash
npm --prefix backend run bootstrap:admin
```

คำสั่งนี้สร้างบัญชีใหม่หากยังไม่มี หรือปรับบัญชี Email เดิมให้เป็น Admin จึงเรียกซ้ำได้โดยไม่สร้างรายการซ้ำ

### 6. ตรวจฐานข้อมูล

```bash
npm --prefix backend run db:audit
```

หาก Database พร้อม รายการสำคัญจะแสดง `PASS`

เปิด Backend แล้วตรวจ Health endpoint:

```bash
npm --prefix backend run dev
```

จากนั้นเปิด:

```text
http://localhost:3000/health
```

ผลลัพธ์ควรมีข้อมูลลักษณะนี้:

```json
{
  "status": "ok",
  "database": "connected"
}
```

## นำไฟล์ SQL ที่ Export ไว้กลับมาใช้

ก่อน Import ให้ทราบก่อนว่าไฟล์เป็นรูปแบบใด

### Plain SQL (`.sql`)

สร้าง Database ว่าง แล้วใช้ `psql`:

```bash
createdb -U postgres grad_tracking
psql -U postgres -d grad_tracking -f path/to/backup.sql
```

### Custom dump (`.dump` หรือ `.backup`)

ใช้ `pg_restore` แทน `psql`:

```bash
createdb -U postgres grad_tracking
pg_restore -U postgres -d grad_tracking path/to/backup.dump
```

ไม่ควร Import `schema.sql` ก่อนนำ Full backup กลับมา เพราะ Backup อาจมีคำสั่งสร้างตารางอยู่แล้ว หลัง Restore ให้รัน Migration และ Audit:

```bash
npm --prefix backend run db:migrate
npm --prefix backend run db:audit
```

เอกสารทางการ: [PostgreSQL Backup and Restore](https://www.postgresql.org/docs/current/backup.html)

## สำรองฐานข้อมูล Docker

ตัวอย่างเมื่อใช้ User และ Database ชื่อตามไฟล์ตัวอย่าง:

Windows PowerShell:

```powershell
docker compose --env-file .env.docker exec -T db pg_dump -U grad_tracking grad_tracking | Set-Content -Encoding utf8 grad_tracking_backup.sql
```

macOS หรือ Linux:

```bash
docker compose --env-file .env.docker exec -T db pg_dump -U grad_tracking grad_tracking > grad_tracking_backup.sql
```

หากเปลี่ยน `POSTGRES_USER` หรือ `POSTGRES_DB` ต้องเปลี่ยนชื่อในคำสั่งด้วย

## แก้ปัญหาเบื้องต้น

### `DATABASE_URL is not defined`

ตรวจว่ามี `backend/.env` และชื่อไฟล์ถูกต้อง ไม่ใช่ `.env.example`

### `password authentication failed`

- ตรวจชื่อผู้ใช้และรหัสผ่านใน `DATABASE_URL`
- ตรวจว่ารหัสผ่านมีอักขระพิเศษที่ต้อง URL encode หรือไม่
- Docker ที่มี Volume เดิมจะยังใช้รหัสผ่านตอนสร้าง Volume ครั้งแรก การแก้ `.env.docker` อย่างเดียวไม่เปลี่ยนรหัสผ่านใน Database เดิม

### `connection refused`

- ตรวจว่า PostgreSQL เปิดอยู่
- ตรวจ Host และ Port
- ตรวจว่าไม่มี PostgreSQL อีกตัวใช้ Port เดียวกัน
- หาก Backend อยู่ใน Docker Host ต้องเป็น `db` ไม่ใช่ `localhost`; `docker-compose.yml` จัดค่านี้ให้อัตโนมัติแล้ว

### Import Schema แล้วแจ้งว่าตารางหรือ Type มีอยู่แล้ว

กำลัง Import `schema.sql` ลง Database ที่ไม่ว่าง ให้ใช้ Database ใหม่ หรือใช้ Migration สำหรับ Database เดิม ห้ามลบข้อมูลเดิมจนกว่าจะสำรองและยืนยันว่าไม่ต้องใช้แล้ว
