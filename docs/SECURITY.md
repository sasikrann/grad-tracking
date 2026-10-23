# ผลตรวจและแนวทางตั้งค่าความปลอดภัย

**ตรวจสอบล่าสุด:** 22 ตุลาคม 2026

เอกสารนี้สรุปผลตรวจการเชื่อมต่อ PostgreSQL และการจัดเก็บ Secret ของโปรเจกต์ โดยเน้นสิ่งที่ควรทำก่อนนำระบบไปใช้กับข้อมูลจริง

## สรุปสำหรับผู้ดูแลระบบ

- ไฟล์ Environment ที่มีค่าจริงถูก `.gitignore` และไม่ถูก Track ใน Git
- Repository เก็บเฉพาะไฟล์ `.env.example` ที่ใช้ค่าตัวอย่าง
- Docker Compose ไม่เปิด Port `5432` ของ PostgreSQL ออกมาที่เครื่อง Host
- Password, Google Client ID, JWT Secret และ SMTP App Password ต้องเก็บในไฟล์ Environment จริงเท่านั้น
- Docker ชุดปัจจุบันใช้ `POSTGRES_USER` เป็นทั้งผู้สร้างฐานข้อมูลและบัญชีที่ Backend ใช้
- `POSTGRES_USER` ของ PostgreSQL Docker Image เป็น Superuser จึงยังไม่ใช่รูปแบบ Least Privilege สำหรับ Production
- Backend ปัจจุบันยังมีคำสั่งตรวจและปรับ Schema ระหว่างทำงาน จึงไม่ควรเปลี่ยนเป็นบัญชีที่มีเฉพาะสิทธิ์อ่านและเขียนข้อมูลทันที เพราะบางหน้าของระบบอาจทำงานไม่สำเร็จ

## Database Connection อยู่ที่ไหน

### Docker

ค่าตั้งต้นอยู่ใน `.env.docker`:

```dotenv
POSTGRES_DB=grad_tracking
POSTGRES_USER=grad_tracking
POSTGRES_PASSWORD=ใส่รหัสผ่านจริงที่คาดเดายาก
```

`docker-compose.yml` นำค่าเหล่านี้มาสร้าง Connection String ให้ Backend:

```text
postgresql://POSTGRES_USER:POSTGRES_PASSWORD@db:5432/POSTGRES_DB
```

Host ชื่อ `db` ใช้ได้เฉพาะภายใน Docker network ของโปรเจกต์ PostgreSQL ไม่มีส่วน `ports:` จึงไม่รับการเชื่อมต่อจากภายนอก Host โดยตรง

### Development

Backend อ่าน `DATABASE_URL` จาก `backend/.env`:

```dotenv
DATABASE_URL=postgresql://ชื่อผู้ใช้:รหัสผ่าน@localhost:5432/ชื่อฐานข้อมูล
```

Source Code ที่นำค่านี้ไปสร้าง PostgreSQL Connection Pool คือ `backend/src/config/database.js`

## ข้อจำกัดของ Docker ชุดปัจจุบัน

PostgreSQL Docker Image กำหนดให้บัญชีใน `POSTGRES_USER` เป็น Superuser ตอนสร้าง Database ครั้งแรก ขณะเดียวกัน Backend ของโปรเจกต์ก็นำบัญชีนี้มาใช้ผ่าน `DATABASE_URL`

อ้างอิง: [Postgres Official Docker Image - Environment Variables](https://hub.docker.com/_/postgres) และ [PostgreSQL - Role Attributes](https://www.postgresql.org/docs/current/role-attributes.html)

รูปแบบนี้ติดตั้งง่ายและเหมาะกับการพัฒนา การสาธิต และ UAT ที่อยู่ในสภาพแวดล้อมปิด แต่ไม่ใช่รูปแบบที่แนะนำสำหรับ Production ระยะยาว

โปรเจกต์ยังไม่แยกบัญชีสำหรับ Migration ออกจากบัญชีที่ Backend ใช้ เนื่องจาก Service บางส่วนยังเรียก `ALTER TABLE` หรือ `CREATE TABLE IF NOT EXISTS` ระหว่างทำงาน การลดสิทธิ์เหลือเพียง `SELECT`, `INSERT`, `UPDATE` และ `DELETE` โดยไม่ปรับ Source Code ก่อนอาจทำให้ระบบหยุดทำงานบางส่วน

## แนวทาง Production ที่ไม่ใช้ Superuser

หากใช้ PostgreSQL Server ที่จัดการแยกจาก Docker Compose สามารถสร้างบัญชีสำหรับ Application ที่ไม่ใช่ Superuser แต่ให้เป็นเจ้าของ Database ของโปรเจกต์เพียง Database เดียวได้ วิธีนี้ยังรองรับ Runtime Schema checks ของ Source Code ปัจจุบัน และลดผลกระทบไม่ให้บัญชี Application ควบคุม PostgreSQL ทั้ง Server

เปิด `psql` ด้วย Database Administrator แล้วรัน โดยเปลี่ยนรหัสผ่านก่อนใช้จริง:

```sql
CREATE ROLE grad_tracking_app
  WITH LOGIN
  PASSWORD 'CHANGE_TO_A_LONG_RANDOM_PASSWORD'
  NOSUPERUSER
  NOCREATEDB
  NOCREATEROLE
  NOREPLICATION;

CREATE DATABASE grad_tracking OWNER grad_tracking_app;

REVOKE ALL ON DATABASE grad_tracking FROM PUBLIC;
GRANT CONNECT ON DATABASE grad_tracking TO grad_tracking_app;
```

เชื่อมต่อ Database ที่เพิ่งสร้าง แล้วกำหนด Schema:

```sql
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
ALTER SCHEMA public OWNER TO grad_tracking_app;
GRANT USAGE, CREATE ON SCHEMA public TO grad_tracking_app;
```

จากนั้นนำ `backend/database/schema.sql` เข้า Database โดยเชื่อมต่อเป็น `grad_tracking_app` เพื่อให้ตารางเป็นของบัญชีนี้:

```bash
psql -U grad_tracking_app -d grad_tracking -f backend/database/schema.sql
```

ตั้งค่า Backend:

```dotenv
DATABASE_URL=postgresql://grad_tracking_app:รหัสผ่านจริง@ชื่อเครื่องฐานข้อมูล:5432/grad_tracking
```

ตรวจว่าบัญชีไม่มีสิทธิ์ระดับ Server:

```sql
SELECT
  rolname,
  rolsuper,
  rolcreatedb,
  rolcreaterole,
  rolreplication
FROM pg_roles
WHERE rolname = 'grad_tracking_app';
```

ค่าตั้งแต่ `rolsuper` ถึง `rolreplication` ควรเป็น `false` ทั้งหมด

> สำหรับ Database เดิมที่มีข้อมูลอยู่แล้ว อย่าเปลี่ยน Owner หรือสิทธิ์ทันทีบน Production ควรสำรองข้อมูลและทดลองกับสำเนาฐานข้อมูลก่อน เพราะตารางเดิมอาจเป็นของบัญชีอื่น

## การตั้งรหัสผ่านและ Secret

- ใช้รหัสผ่าน Database และ `JWT_SECRET` ที่ยาว สุ่ม และไม่ซ้ำกับระบบอื่น
- ใช้ Google Client ID จาก Project ที่ถูกต้อง แต่ห้ามนำ Client Secret มาใส่ เพราะ Source Code นี้ไม่ได้ใช้
- ใช้ SMTP App Password แทนรหัสผ่าน Email หลัก
- แยกค่าของ Development, UAT และ Production
- จำกัดผู้ที่อ่านไฟล์ Environment และ Secret ของระบบ Deploy ได้
- ไม่ส่ง Secret ผ่าน Screenshot, เอกสาร, Chat หรือ Issue tracker
- เปลี่ยน Secret เมื่อสมาชิกที่เคยเข้าถึงออกจากโครงการหรือเมื่อสงสัยว่าค่ารั่วไหล

ไฟล์จริงที่ห้าม Commit:

```text
.env
.env.docker
backend/.env
frontend/.env
```

## ผลตรวจ Repository

ผลตรวจ ณ วันที่ระบุด้านบน:

- Git Track เฉพาะ `.env.docker.example`, `backend/.env.example` และ `frontend/.env.example`
- `.gitignore` ครอบคลุมไฟล์ Environment จริง
- ไม่พบไฟล์ Private key หรือ Credential file ที่มีชื่อชัดเจนในรายการที่ Git Track
- ไม่พบ Secret จริงที่มีรูปแบบมาตรฐานจากการตรวจไฟล์ปัจจุบันและประวัติ Git แบบ Pattern matching
- Password ใน `docker-compose.e2e.yml` เป็นค่าคงที่สำหรับ Test stack ที่แยกจากระบบหลัก ห้ามนำค่านี้ไปใช้กับ UAT หรือ Production

การตรวจด้วย Pattern ช่วยค้นหาค่าที่มีรูปแบบทั่วไป แต่ไม่สามารถรับประกันได้ทุกกรณี หาก GitHub repository รองรับ Secret scanning ควรเปิดใช้งานและตรวจผลบน GitHub เพิ่มเติม

## หากเคย Commit Secret จริง

การลบ Secret ออกจากไฟล์ล่าสุดไม่เพียงพอ เพราะค่ายังอยู่ใน Git history ให้ทำตามลำดับนี้:

1. เพิกถอนหรือเปลี่ยน Secret ที่บริการต้นทางทันที
2. เปลี่ยน Password ของ Database, JWT Secret, SMTP App Password หรือ API key ที่เกี่ยวข้อง
3. อัปเดตค่าบน Server หรือระบบ Deploy
4. ตรวจ Log หาการใช้งานผิดปกติ
5. พิจารณาล้างค่าออกจาก Git history หากนโยบายของโครงการกำหนด
6. แจ้งสมาชิกให้ดึง Repository ใหม่หลังมีการ Rewrite history

การ Rewrite history ไม่ทำให้ Secret เดิมปลอดภัยขึ้นหากยังไม่เพิกถอน ดังนั้นต้องเปลี่ยน Secret ก่อนเสมอ

## Checklist ก่อนขึ้น Production

- [ ] `.env` และไฟล์ Secret จริงไม่อยู่ใน `git ls-files`
- [ ] เปลี่ยน Password และ Placeholder ทุกค่าแล้ว
- [ ] PostgreSQL ไม่เปิด Port สู่ Internet
- [ ] ใช้ TLS เมื่อ Database อยู่คนละเครื่องกับ Backend
- [ ] สำรอง Database และทดลอง Restore แล้ว
- [ ] ตรวจว่า Application User ไม่เป็น Superuser หากใช้ PostgreSQL ภายนอก
- [ ] เปิด Email Test Mode จนกว่าจะพร้อมส่งหาผู้รับจริง
- [ ] เปิด GitHub Secret scanning หาก Repository รองรับ
- [ ] มีแผนเปลี่ยน Secret และผู้รับผิดชอบเมื่อเกิดเหตุ

## งานปรับปรุงในอนาคต

หากระบบถูกนำไปใช้ระยะยาว ควรแยกบัญชี Database เป็นสองบัญชี:

- Migration Owner สำหรับสร้างและแก้ Schema
- Runtime User สำหรับอ่านและเขียนข้อมูลที่จำเป็นเท่านั้น

งานนี้ต้องย้าย Runtime DDL ออกจาก Service ไปไว้ใน Migration ก่อน จึงควรทำเป็นงานปรับโครงสร้างแยกต่างหากและทดสอบครบทั้งระบบ ไม่ควรเปลี่ยนสิทธิ์บน Production โดยตรง
