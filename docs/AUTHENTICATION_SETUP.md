# คู่มือตั้งค่า Google Sign-In

ระบบนี้ไม่มีหน้าสมัครสมาชิกและไม่ได้เก็บรหัสผ่านของผู้ใช้ ผู้ใช้กดปุ่ม Google Sign-In แล้ว Google ส่งข้อมูลยืนยันตัวตนกลับมาให้ระบบตรวจสอบ

ผู้ที่จะเข้าสู่ระบบได้ต้องผ่านทั้งสองเงื่อนไข:

1. ใช้ Email ที่ลงท้ายด้วย `@lamduan.mfu.ac.th`
2. Email นั้นมีอยู่ใน Database ของระบบแล้ว

ดังนั้น การตั้งค่า Google สำเร็จไม่ได้หมายความว่าบัญชี Google ทุกบัญชีจะเข้าใช้งานได้

## สิ่งที่ต้องเตรียม

- บัญชีที่มีสิทธิ์สร้างหรือแก้ Google Cloud Project
- URL ที่จะใช้เปิดเว็บไซต์ เช่น `http://localhost:5173` หรือ `https://grad.example.ac.th`
- Email `@lamduan.mfu.ac.th` สำหรับผู้ดูแลระบบคนแรก

## 1. สร้างหรือเลือก Google Cloud Project

1. เปิด [Google Cloud Console](https://console.cloud.google.com/)
2. เลือก Project เดิม หรือสร้าง Project ใหม่สำหรับระบบนี้
3. เปิดส่วน **Google Auth Platform** หรือหน้า **APIs & Services > Credentials** ชื่อเมนูอาจต่างกันเล็กน้อยตามหน้าตา Console ในขณะนั้น

ควรใช้ Project สำหรับงานทดสอบและ Production แยกกันเมื่อระบบนำไปใช้งานจริง เพื่อไม่ให้ URL และผู้ทดสอบปะปนกัน

## 2. ตั้งค่าหน้าขอความยินยอม

ก่อนสร้าง Client ID ให้กรอกข้อมูลที่ Google ใช้แสดงกับผู้ใช้:

- ชื่อ Application
- Email สำหรับติดต่อหรือให้ความช่วยเหลือ
- ข้อมูลผู้พัฒนาที่ Google ขอให้ระบุ
- Audience ตามนโยบายของ Google Workspace ของมหาวิทยาลัย

หากตั้ง Application เป็นโหมดทดสอบและ Google ขอรายชื่อ Test users ให้เพิ่มบัญชีที่จะใช้ทดสอบก่อน

ระบบนี้ใช้ Google เพื่อยืนยันตัวตนเท่านั้น ไม่ได้ขอสิทธิ์อ่าน Gmail, Google Drive หรือข้อมูลบริการอื่น

## 3. สร้าง OAuth Client ID

1. ไปที่หน้า **Clients** หรือ **Credentials**
2. เลือกสร้าง Client ใหม่หรือ **OAuth client ID**
3. เลือก Application type เป็น **Web application**
4. ตั้งชื่อที่บอกสภาพแวดล้อมได้ เช่น `Graduate Tracking - Local` หรือ `Graduate Tracking - Production`
5. เพิ่ม URL ใน **Authorized JavaScript origins**

ตัวอย่าง Origin ที่ใช้กับโปรเจกต์นี้:

| วิธีเปิดระบบ | Authorized JavaScript origin |
|---|---|
| Docker ที่ Port 80 | `http://localhost` |
| Docker ที่ Port อื่น เช่น 8080 | `http://localhost:8080` |
| Development ด้วย Vite | `http://localhost:5173` |
| Production | `https://ชื่อโดเมนจริง` |

Origin ต้องมี Protocol และ Port ตรงกับ URL ที่เปิดจริง และไม่ใส่ Path ต่อท้าย เช่น `/login`

ระบบใช้ JavaScript callback รับข้อมูลจาก Google จึงไม่ต้องใส่ **Authorized redirect URI** หากไม่ได้แก้ Source Code ไปใช้ Redirect flow

6. สร้าง Client แล้วคัดลอกค่า **Client ID** ซึ่งมีหน้าตาประมาณนี้:

```text
1234567890-abcdef.apps.googleusercontent.com
```

โปรเจกต์นี้ไม่ใช้ Client Secret จึงไม่ต้องนำ Client Secret มาใส่ในไฟล์ Environment

เอกสารทางการ: [Get your Google API client ID](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid)

## 4. ใส่ Client ID ในโปรเจกต์

### เมื่อติดตั้งด้วย Docker

เปิด `.env.docker` แล้วใส่:

```dotenv
GOOGLE_CLIENT_ID=1234567890-abcdef.apps.googleusercontent.com
```

Docker จะส่งค่านี้ให้ทั้ง Frontend และ Backend โดยอัตโนมัติ จากนั้นต้อง Build Gateway ใหม่ เพราะ Client ID ของ Frontend ถูกใส่ตอน Build:

```bash
docker compose --env-file .env.docker up -d --build
```

### เมื่อติดตั้งแบบ Development

ใส่ Client ID ตัวเดียวกันในสองไฟล์

`backend/.env`:

```dotenv
GOOGLE_CLIENT_ID=1234567890-abcdef.apps.googleusercontent.com
```

`frontend/.env`:

```dotenv
VITE_GOOGLE_CLIENT_ID=1234567890-abcdef.apps.googleusercontent.com
```

หลังเปลี่ยนค่าให้หยุดและเปิด Frontend กับ Backend ใหม่

## 5. ตั้งค่า Session Secret

Backend ใช้ `JWT_SECRET` ลงลายเซ็นข้อมูลการเข้าสู่ระบบ ค่านี้ต้องเป็นข้อความสุ่มที่ยาวและคาดเดายาก ไม่ใช่ Google Client Secret

ตัวอย่างตำแหน่งที่ต้องใส่:

```dotenv
JWT_SECRET=ใส่ข้อความสุ่มยาวอย่างน้อย_32_ตัวอักษร
AUTH_COOKIE_SAME_SITE=lax
```

- Docker: ใส่ใน `.env.docker`
- Development: ใส่ใน `backend/.env`

ห้าม Commit ค่าจริงลง Git และไม่ควรใช้ค่าเดียวกันระหว่างเครื่องทดสอบกับ Production

## 6. สร้างผู้ดูแลระบบคนแรก

Google ยืนยันได้เพียงว่า Email เป็นของใคร แต่ระบบยังต้องพบ Email นั้นใน Database ด้วย

Docker ให้ตั้งค่าใน `.env.docker`:

```dotenv
BOOTSTRAP_ADMIN_EMAIL=your_admin@lamduan.mfu.ac.th
BOOTSTRAP_ADMIN_NAME=System Administrator
```

เมื่อ Backend Container เริ่มทำงาน ระบบจะสร้างบัญชีนี้หรือปรับบัญชีเดิมให้เป็น Admin โดยอัตโนมัติ

Development ให้ใส่ค่าเดียวกันใน `backend/.env` แล้วรัน:

```bash
npm --prefix backend run bootstrap:admin
```

## 7. ทดสอบการเข้าสู่ระบบ

1. เปิดหน้า Login
2. กดปุ่ม Google Sign-In
3. เลือกบัญชีเดียวกับ `BOOTSTRAP_ADMIN_EMAIL`
4. เมื่อสำเร็จ ระบบควรเปิดหน้า Admin Dashboard
5. กด Logout แล้วลองเข้าใหม่เพื่อยืนยันว่า Session ทำงานตามปกติ

Backend ตรวจ Google ID token อีกครั้ง ไม่ได้เชื่อผลจาก Browser โดยตรง จากนั้นจึงสร้าง Cookie ที่ JavaScript บนหน้าเว็บอ่านไม่ได้ และมีอายุ 8 ชั่วโมง

## Development Login

Development Login มีไว้ช่วยทดสอบหน้าเว็บในเครื่องโดยไม่เรียก Google ห้ามเปิดบน Production

`backend/.env`:

```dotenv
ENABLE_DEV_LOGIN=true
```

`frontend/.env`:

```dotenv
VITE_ENABLE_DEV_LOGIN=true
```

จากนั้นเปิด Frontend และ Backend ใหม่ Backend อนุญาตวิธีนี้เฉพาะเมื่อไม่ได้รันด้วย `NODE_ENV=production` และคำขอมาจากเครื่อง Local เท่านั้น

Docker production บังคับปิด Development Login อยู่แล้ว

## แก้ปัญหาเบื้องต้น

### หน้าเว็บแจ้ง `Google SSO is not configured`

- ตรวจว่า Client ID ไม่ว่างและไม่ได้ขึ้นต้นด้วย `YOUR_`
- ตรวจว่าแก้ไฟล์ Environment ถูกชุด
- หากใช้ Docker ให้ Build Gateway ใหม่
- หากใช้ Development ให้ Restart Vite

### Google แจ้งว่า Origin ไม่ได้รับอนุญาต

- ดู URL ใน Address bar แล้วเพิ่ม Origin นั้นใน Google Cloud
- ตรวจ `http` กับ `https`
- ตรวจ Port เช่น `5173` หรือ `8080`
- อย่าใส่ Path เช่น `/login`

### Google ผ่าน แต่ระบบแจ้งว่า Account ไม่ได้ลงทะเบียน

- ต้องเป็นบัญชี `@lamduan.mfu.ac.th`
- Email ต้องตรงกับข้อมูลในตาราง `users`
- สำหรับ Admin คนแรก ให้ตรวจ `BOOTSTRAP_ADMIN_EMAIL` และรัน Bootstrap Admin อีกครั้ง
- อาจารย์ที่มีสถานะ `inactive` จะเข้าใช้งานไม่ได้

### Login สำเร็จแต่กลับมาหน้า Login อีก

- ตรวจว่า Frontend และ Backend ใช้ Origin ที่ตั้งไว้
- ตรวจ `FRONTEND_ORIGIN` และ `AUTH_COOKIE_SAME_SITE`
- Production ควรเปิดผ่าน HTTPS และใช้ Domain เดียวกับค่าที่กำหนด
- ดู Log ของ Backend เพื่อหา Error เกี่ยวกับ JWT หรือ Cookie
