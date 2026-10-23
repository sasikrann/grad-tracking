# โครงสร้างโปรเจกต์ Graduate Tracking System

**ตรวจสอบกับ Source Code ล่าสุด:** 22 ตุลาคม 2026

เอกสารนี้อธิบายว่าโฟลเดอร์และไฟล์ในโปรเจกต์มีไว้ทำอะไร เพื่อให้ผู้อ่านเห็นภาพรวมของระบบและค้นหาส่วนที่ต้องการได้โดยไม่จำเป็นต้องรู้โครงสร้างโค้ดมาก่อน

เอกสารนี้กล่าวถึงเฉพาะโครงสร้างของโปรเจกต์ ส่วนวิธีติดตั้ง การตั้งค่า และคำสั่งรันระบบจะอธิบายใน `README.md`

## 1. ภาพรวมแบบสั้น

Graduate Tracking System เป็นเว็บสำหรับติดตามความก้าวหน้าของนักศึกษาระดับบัณฑิตศึกษา ระบบแบ่งออกเป็นส่วนหลักดังนี้

- `frontend/` คือหน้าจอที่เปิดผ่านเว็บเบราว์เซอร์
- `backend/` คือส่วนที่รับคำขอจากหน้าจอ ตรวจสิทธิ์ ประมวลผล และติดต่อฐานข้อมูล
- PostgreSQL เก็บข้อมูลผู้ใช้ นักศึกษา อาจารย์ Milestone และการแจ้งเตือน โดยโครงสร้างฐานข้อมูลอยู่ใน `backend/database/`
- `deploy/` เก็บไฟล์สำหรับนำระบบขึ้นใช้งานผ่าน Docker และ Nginx
- `docker-compose.yml` นำ Database, Backend และ Gateway มาทำงานร่วมกัน

ภาพรวมการเดินทางของข้อมูล:

```text
ผู้ใช้เปิดเว็บไซต์
    │
    ▼
Frontend (Vue) - แสดงหน้าจอและส่งคำขอ
    │
    ▼
Backend (Express) - ตรวจผู้ใช้และประมวลผล
    │
    ├── PostgreSQL       เก็บข้อมูลของระบบ
    ├── Upload Storage   เก็บหลักฐานและไฟล์แนบ
    └── SMTP Server      ส่งอีเมลแจ้งเตือน
```

## 2. Tree Structure ที่ตรวจสอบแล้ว

Tree ด้านล่างแสดงโฟลเดอร์และไฟล์ที่เป็นส่วนหนึ่งของโปรเจกต์จริง โดยย่อรายการไฟล์ทดสอบและไฟล์รูปภาพบางส่วนเพื่อให้อ่านง่าย รายละเอียดของแต่ละส่วนอยู่ในหัวข้อถัดไป

```text
senior/
├── .vscode/                         การตั้งค่าแนะนำสำหรับ VS Code
├── backend/                         API และการประมวลผลของระบบ
│   ├── database/                    โครงสร้างและไฟล์ปรับปรุงฐานข้อมูล
│   │   ├── schema.sql
│   │   ├── protective-foreign-keys.sql
│   │   └── recalculate-study-extension-end-dates.sql
│   ├── src/
│   │   ├── config/                  การเชื่อมต่อฐานข้อมูลและรายการเว็บไซต์ที่อนุญาต
│   │   ├── controllers/             รับข้อมูลจาก API และส่งผลลัพธ์กลับ
│   │   ├── data/                    ข้อมูลตั้งต้นของระบบ
│   │   ├── errors/                  รูปแบบ Error กลาง
│   │   ├── middleware/              ตรวจผู้ใช้ ต้นทาง และจัดการ Error
│   │   ├── routes/                  กำหนด URL ของ Backend API
│   │   ├── scripts/                 คำสั่งดูแลฐานข้อมูลและบัญชีเริ่มต้น
│   │   ├── services/                การประมวลผลหลักและการอ่านเขียนข้อมูล
│   │   ├── app.js                   ประกอบส่วนต่าง ๆ ของ Express
│   │   └── index.js                 เริ่มทำงาน Backend
│   ├── test/                        การทดสอบ Backend เพิ่มเติม
│   │   └── e2e/                     เตรียมข้อมูลสำหรับทดสอบทั้งระบบ
│   ├── uploads/                     ไฟล์ที่ผู้ใช้อัปโหลดขณะระบบทำงาน
│   │   ├── evidence/                หลักฐานประกอบ Milestone
│   │   └── notifications/           ไฟล์แนบของการแจ้งเตือน
│   ├── .env.example                 ตัวอย่างค่าตั้งค่า Backend
│   ├── Dockerfile                   สร้าง Backend สำหรับใช้งานจริง
│   ├── Dockerfile.dev               สร้าง Backend สำหรับสภาพแวดล้อมทดสอบ
│   ├── docker-entrypoint.sh          เตรียมระบบก่อนเปิด Backend ใน Container
│   └── package.json                 Dependencies และคำสั่งของ Backend
├── deploy/                          ไฟล์ประกอบการนำระบบขึ้นใช้งาน
│   ├── gateway/Dockerfile           Build Frontend และบรรจุไว้ใน Nginx
│   └── nginx/default.conf           ส่งหน้าเว็บและส่งต่อคำขอไป Backend
├── docs/                            คู่มือตั้งค่าบริการที่ระบบต้องใช้
│   ├── AUTHENTICATION_SETUP.md      ตั้งค่า Google Sign-In
│   ├── DATABASE_SETUP.md            เตรียมและตรวจ PostgreSQL
│   ├── NOTIFICATION_SETUP.md        ตั้งค่าการส่ง Email ผ่าน SMTP
│   └── SECURITY.md                  ผลตรวจ Secret และความปลอดภัยฐานข้อมูล
├── frontend/                        หน้าเว็บของระบบ
│   ├── e2e/                         การทดสอบระบบผ่านเว็บเบราว์เซอร์
│   │   ├── auth/
│   │   ├── fixtures/imports/
│   │   ├── import/
│   │   ├── management/
│   │   ├── notifications/
│   │   ├── smoke/
│   │   └── support/
│   ├── public/                      ไฟล์สาธารณะที่คัดลอกไปกับหน้าเว็บ
│   ├── src/
│   │   ├── assets/                  รูปภาพและ CSS
│   │   ├── components/              ส่วนย่อยของหน้าจอที่นำกลับมาใช้ได้
│   │   │   ├── __tests__/
│   │   │   ├── admin/
│   │   │   ├── common/
│   │   │   ├── milestone/form/
│   │   │   ├── navigation/
│   │   │   ├── student/
│   │   │   └── student-milestone/
│   │   ├── composables/             ชุดการทำงานของ Vue ที่เรียกใช้ซ้ำ
│   │   │   └── __tests__/
│   │   ├── lang/                    ข้อความภาษาไทยและอังกฤษ
│   │   ├── router/                  เส้นทางของแต่ละหน้าและการตรวจสิทธิ์
│   │   ├── services/                ติดต่อ Backend API
│   │   │   └── __tests__/
│   │   ├── types/                   รูปแบบข้อมูลที่ Frontend ใช้
│   │   ├── utils/                   ฟังก์ชันช่วยแปลงและแสดงผลข้อมูล
│   │   │   └── __tests__/
│   │   ├── views/                   หน้าหลักที่ผู้ใช้เปิดผ่าน URL
│   │   │   ├── admin/
│   │   │   ├── advisor/
│   │   │   └── student/
│   │   ├── App.vue                  โครงหน้าหลักของเว็บไซต์
│   │   └── main.ts                  จุดเริ่มต้นของ Frontend
│   ├── .env.example                 ตัวอย่างค่าตั้งค่า Frontend
│   ├── index.html                   หน้า HTML ตั้งต้น
│   ├── package.json                 Dependencies และคำสั่งของ Frontend
│   ├── playwright.config.ts         ตั้งค่าการทดสอบผ่านเบราว์เซอร์
│   ├── vite.config.ts               ตั้งค่าการ Build และ Development Server
│   └── vitest.config.ts             ตั้งค่าการทดสอบระดับ Unit
├── .env.docker.example              ตัวอย่างค่าตั้งค่าสำหรับ Docker Compose
├── DEPLOYMENT.md                    คู่มือนำระบบขึ้นใช้งาน
├── docker-compose.yml               ระบบหลักสำหรับใช้งานจริง
├── docker-compose.e2e.yml           ระบบแยกสำหรับการทดสอบ E2E
├── package.json                     รวมคำสั่งที่เรียก Frontend และ Backend
├── PROJECT_STRUCTURE.md             เอกสารฉบับนี้
└── README.md                         ภาพรวมและคู่มือเริ่มต้นใช้งาน
```

### โฟลเดอร์ที่ไม่แสดงใน Tree

- `.git/` เป็นข้อมูลประวัติของ Git ไม่ใช่ Source Code ของระบบ
- `.agents/` เป็นข้อมูลของเครื่องมือช่วยทำงานในเครื่องนี้ ไม่ใช่ส่วนของระบบ
- `node_modules/` เป็น Dependencies ที่ติดตั้งใหม่ได้จาก `package-lock.json`
- `frontend/dist/`, `playwright-report/` และ `test-results/` เป็นผลลัพธ์ที่เครื่องมือสร้างขึ้นใหม่ได้

โฟลเดอร์ `backend/uploads/` มีอยู่จริง แต่ไฟล์ภายในเป็นข้อมูลที่เกิดจากการใช้งาน จึงไม่ถูกเก็บไว้ใน Git ส่วน Production จะเก็บข้อมูลนี้ใน Docker volume แทนโฟลเดอร์บนเครื่องโดยตรง

## 3. ไฟล์ระดับบนสุดของโปรเจกต์

| ไฟล์ | เกี่ยวกับอะไร |
|---|---|
| `README.md` | หน้าหลักของโปรเจกต์ ใช้อธิบายภาพรวม วิธีติดตั้ง ตั้งค่า และเปิดระบบ |
| `PROJECT_STRUCTURE.md` | อธิบายตำแหน่งและหน้าที่ของโฟลเดอร์กับไฟล์ในโปรเจกต์ |
| `DEPLOYMENT.md` | ขั้นตอนตรวจสอบและนำระบบขึ้นใช้งานด้วย Docker |
| `docs/AUTHENTICATION_SETUP.md` | ขั้นตอนสร้าง Google OAuth Client และนำ Client ID มาใช้กับระบบ |
| `docs/DATABASE_SETUP.md` | ขั้นตอนเตรียม PostgreSQL นำเข้า Schema และตรวจการเชื่อมต่อ |
| `docs/NOTIFICATION_SETUP.md` | ขั้นตอนตั้งค่า SMTP ทดสอบ และเปิดการส่ง Email จริง |
| `docs/SECURITY.md` | ผลตรวจ Secret ข้อจำกัดปัจจุบัน และแนวทางตั้งค่า PostgreSQL ที่ปลอดภัยขึ้น |
| `package.json` | รวมคำสั่งกลาง เช่น Build, Test และเริ่ม Frontend หรือ Backend โดยส่งคำสั่งต่อไปยังแต่ละโฟลเดอร์ |
| `.env.docker.example` | ตัวอย่างค่าที่ Docker Compose ต้องใช้ เช่น Database, Google Sign-In และ Email ห้ามใส่รหัสลับจริงในไฟล์ตัวอย่าง |
| `docker-compose.yml` | เปิดระบบหลัก 3 ส่วน ได้แก่ PostgreSQL, Backend และ Gateway |
| `docker-compose.e2e.yml` | เปิดระบบทดสอบที่แยกจากข้อมูลจริงสำหรับ Playwright |
| `.dockerignore` | ระบุไฟล์ที่ไม่ต้องส่งเข้า Docker build context |
| `.editorconfig` | กำหนดรูปแบบพื้นฐานของไฟล์ให้ Editor ต่าง ๆ ใช้ตรงกัน |
| `.gitattributes` | กำหนดวิธีที่ Git จัดการไฟล์ใน repository |
| `.gitignore` | ระบุ Secret, Dependencies, Upload และผลลัพธ์ที่ไม่ควรบันทึกลง Git |

## 4. Frontend - หน้าจอของระบบ

Frontend พัฒนาด้วย Vue และ TypeScript ทำหน้าที่แสดงข้อมูล รับการกระทำจากผู้ใช้ และติดต่อ Backend ผ่าน HTTP API

### 4.1 จุดเริ่มต้นและการเปิดแต่ละหน้า

| ไฟล์ | เกี่ยวกับอะไร |
|---|---|
| `frontend/index.html` | HTML ตั้งต้นที่ Vite ใช้วาง Vue application |
| `frontend/src/main.ts` | สร้าง Vue application เชื่อม Router และโหลด CSS หลัก |
| `frontend/src/App.vue` | โครงหน้ากลางของเว็บไซต์ แสดง Navbar เมื่อผู้ใช้เข้าสู่ระบบแล้ว และแสดงหน้าที่ Router เลือก |
| `frontend/src/router/index.ts` | จับคู่ URL กับหน้า Vue ตรวจว่าผู้ใช้เข้าสู่ระบบหรือยัง และป้องกันการเปิดหน้าที่ไม่ตรงกับสิทธิ์ |
| `frontend/src/views/Login.vue` | แสดงปุ่ม Google Sign-In รับผลการยืนยันตัวตนจาก Google และมีทางเข้าสำหรับ Development เมื่อเปิดใช้งานไว้ |
| `frontend/src/views/AccessUnavailableView.vue` | แจ้งว่าบัญชีเข้าสู่ระบบได้ แต่ยังไม่มีหน้าที่ระบบอนุญาตให้ใช้งาน |

### 4.2 หน้าสำหรับจัดการข้อมูลระบบ

| ไฟล์ | เกี่ยวกับอะไร |
|---|---|
| `views/admin/StudentDashboardView.vue` | แสดงรายชื่อนักศึกษา ค้นหา กรอง นำเข้า ส่งออก และเปลี่ยนสถานะการออกจากการศึกษา |
| `views/admin/AdminStudentMilestoneView.vue` | แสดง Milestone ของนักศึกษารายคน และจัดการการขยายระยะเวลาศึกษา |
| `views/admin/AdvisorDashboardView.vue` | แสดงรายชื่ออาจารย์ นำเข้า ส่งออก และเปิดหรือปิดสถานะบัญชีอาจารย์ |
| `views/admin/MilestoneManagementView.vue` | สร้าง แก้ไข เปิด ปิด เรียงลำดับ และคัดลอกแบบแผน Milestone |
| `views/admin/NotificationManagementView.vue` | สร้างการแจ้งเตือน เลือกกลุ่มผู้รับ แนบไฟล์ ส่งอีเมล และดูรายการที่เคยส่ง |

### 4.3 หน้าสำหรับอาจารย์

| ไฟล์ | เกี่ยวกับอะไร |
|---|---|
| `views/advisor/AdvisorStudentOverallView.vue` | แสดงภาพรวมและค้นหานักศึกษาในความดูแล |
| `views/advisor/AdvisorMilestoneSummaryView.vue` | สรุปสถานะ Milestone ของนักศึกษา แยกตามระดับการศึกษา แผน และปีที่เข้าเรียน |
| `views/advisor/AdvisorStudentMilestoneView.vue` | เปิด Milestone ของนักศึกษารายคน เพื่อดูหลักฐาน อนุมัติ หรือส่งกลับให้แก้ไข |

### 4.4 หน้าสำหรับนักศึกษา

| ไฟล์ | เกี่ยวกับอะไร |
|---|---|
| `views/student/StudentInformationView.vue` | แสดงข้อมูลนักศึกษา แผนการศึกษา และรายชื่ออาจารย์ที่ปรึกษา |
| `views/student/StudentMilestoneView.vue` | แสดงความคืบหน้า Milestone แต่งตั้งอาจารย์ที่ปรึกษา อัปโหลดหลักฐาน และส่งข้อมูลการสำเร็จการศึกษา |
| `views/student/StudentNotificationView.vue` | แสดงกล่องข้อความแจ้งเตือน เปิดไฟล์แนบ และบันทึกสถานะว่าอ่านแล้ว |

### 4.5 Components - ส่วนประกอบย่อยของหน้าจอ

Component คือส่วนของหน้าจอที่แยกออกมาเพื่ออ่านง่ายและนำกลับมาใช้ได้ ไม่ใช่หน้า URL โดยตรง

| โฟลเดอร์หรือไฟล์ | เกี่ยวกับอะไร |
|---|---|
| `components/admin/AdvisorTable.vue` | ตารางแสดงข้อมูลอาจารย์และปุ่มจัดการแต่ละรายการ |
| `components/admin/DashboardActionCard.vue` | การ์ดปุ่มลัดสำหรับงานบน Dashboard |
| `components/admin/ExportConfirmModal.vue` | หน้าต่างยืนยันก่อนส่งออกข้อมูล |
| `components/admin/ImportFileModal.vue` | หน้าต่างเลือกไฟล์และแสดงผลการนำเข้าข้อมูล |
| `components/common/PaginationControls.vue` | ปุ่มเปลี่ยนหน้าและเลือกจำนวนรายการต่อหน้า |
| `components/milestone/MilestoneFormModal.vue` | แบบฟอร์มเพิ่มหรือแก้ไข Milestone |
| `components/milestone/MilestoneTable.vue` | ตารางแสดงและจัดลำดับแบบแผน Milestone |
| `components/milestone/form/` | ช่องวันที่และ Dropdown ที่ใช้ภายในแบบฟอร์ม Milestone |
| `components/navigation/Navbar.vue` | แถบนำทางหลัก ชื่อผู้ใช้ เมนู และปุ่มออกจากระบบ |
| `components/navigation/LanguageSwitch.vue` | ปุ่มสลับข้อความภาษาไทยและอังกฤษ |
| `components/student/StudentExitStatusModal.vue` | หน้าต่างเปลี่ยนสถานะจบ ลาออก หรือพ้นสภาพของนักศึกษา |
| `components/student/StudentFilters.vue` | ตัวกรองรายชื่อนักศึกษา |
| `components/student/StudentInformationAdvisor.vue` | แสดงอาจารย์ที่ปรึกษาหลัก |
| `components/student/StudentInformationCoAdvisor.vue` | แสดงอาจารย์ที่ปรึกษาร่วม |
| `components/student/StudentInformationStudyPlan.vue` | แสดงรายละเอียดแผนและสถานะการศึกษา |
| `components/student/StudentOverview.vue` | รวมข้อมูลภาพรวมของนักศึกษา |
| `components/student/StudentTable.vue` | ตารางรายชื่อนักศึกษาและการเลือกเปิดรายละเอียด |
| `components/student/SummaryCard.vue` | การ์ดตัวเลขสรุปบน Dashboard |
| `components/student-milestone/EvidenceUploadControl.vue` | เลือก อัปโหลด เปิดดู และนำไฟล์หลักฐานออก |
| `components/student-milestone/MilestoneStatusOverview.vue` | สรุปจำนวน Milestone ตามสถานะ |
| `components/student-milestone/StudentMilestoneCard.vue` | การ์ดรายละเอียด Milestone แต่ละรายการ |
| `components/student-milestone/StudentMilestoneProgress.vue` | แสดงภาพรวมความคืบหน้าของ Milestone |

### 4.6 Services - การติดต่อ Backend

ไฟล์กลุ่มนี้รวม URL, ข้อมูลที่ต้องส่ง และรูปแบบผลลัพธ์จาก Backend เพื่อไม่ให้หน้า Vue ต้องจัดการรายละเอียดการเชื่อมต่อเอง

| ไฟล์ | เกี่ยวกับอะไร |
|---|---|
| `services/api-client.ts` | ฟังก์ชันกลางสำหรับสร้าง URL ส่งคำขอ รับ JSON ดาวน์โหลดไฟล์ และแปลง Error ให้อยู่ในรูปเดียวกัน |
| `services/auth.ts` | เก็บสถานะผู้ใช้ปัจจุบัน ส่งข้อมูล Google Sign-In ตรวจ Session และออกจากระบบ |
| `services/students.api.ts` | จุดรวมสำหรับเรียกใช้ฟังก์ชันเกี่ยวกับนักศึกษาจากไฟล์ย่อย |
| `services/student-query.api.ts` | อ่านรายการ รายละเอียด และภาพรวมนักศึกษา |
| `services/student-actions.api.ts` | เปลี่ยนสถานะนักศึกษาและจัดการการขยายเวลาศึกษา |
| `services/student-transfer.api.ts` | นำเข้า ส่งออก และดาวน์โหลดไฟล์ตัวอย่างของนักศึกษา |
| `services/student-api.types.ts` | รูปแบบข้อมูลที่ใช้เฉพาะการติดต่อ API นักศึกษา |
| `services/student-mapper.ts` | แปลงข้อมูลนักศึกษาจาก Backend ให้อยู่ในรูปที่หน้าจอใช้สะดวก |
| `services/advisors.api.ts` | อ่าน นำเข้า ส่งออก และเปลี่ยนสถานะอาจารย์ |
| `services/advisor-import-messages.ts` | แปลงรหัสผลการนำเข้ารายชื่ออาจารย์เป็นข้อความที่แสดงต่อผู้ใช้ |
| `services/advisor-milestones.api.ts` | อ่าน Milestone ของนักศึกษาในความดูแลและส่งผลการตรวจ |
| `services/advisor-milestone-summary.api.ts` | อ่านข้อมูลสรุป Milestone สำหรับอาจารย์ |
| `services/milestones.api.ts` | อ่านและจัดการแบบแผน Milestone |
| `services/student-profile.api.ts` | อ่านข้อมูลของนักศึกษาที่เข้าสู่ระบบ แต่งตั้งอาจารย์ และส่งข้อมูลจบการศึกษา |
| `services/student-milestones.api.ts` | อ่าน Milestone ของนักศึกษาที่เข้าสู่ระบบและจัดการหลักฐาน |
| `services/notifications.api.ts` | อ่าน สร้าง และเปลี่ยนสถานะการแจ้งเตือน รวมถึงไฟล์แนบ |

### 4.7 โฟลเดอร์สนับสนุน Frontend

| โฟลเดอร์ | เกี่ยวกับอะไร |
|---|---|
| `src/assets/` | CSS หลัก โลโก้มหาวิทยาลัย และรูปไอคอนของเว็บไซต์ |
| `src/composables/` | การทำงานที่หลายหน้าต้องใช้ร่วมกัน ได้แก่ภาษา การ Refresh อัตโนมัติ และข้อมูลภาพรวมนักศึกษา |
| `src/lang/` | ข้อความของหน้าจอภาษาไทยและอังกฤษ พร้อมฟังก์ชันเลือกภาษา |
| `src/types/` | รูปแบบข้อมูลของอาจารย์ นักศึกษา ผู้ใช้ Milestone และ Notification |
| `src/utils/` | ฟังก์ชันขนาดเล็กสำหรับจัดรูปชื่ออาจารย์ สถานะ Milestone และข้อความ Notification |
| `src/**/__tests__/` | Unit tests ของ Component, Composable, Service และ Utility ที่อยู่ใกล้กัน |
| `public/` | ไฟล์ที่ Vite คัดลอกไปยังเว็บไซต์โดยไม่แก้ไข ปัจจุบันมี Favicon |

### 4.8 ไฟล์ตั้งค่า Frontend

| ไฟล์ | เกี่ยวกับอะไร |
|---|---|
| `frontend/.env.example` | ตัวอย่าง Backend URL, Google Client ID และสวิตช์ Development Login |
| `frontend/package.json` | รายชื่อ Dependencies และคำสั่ง Dev, Build, Test, Lint และ Format |
| `frontend/vite.config.ts` | ตั้งค่า Vue, Path alias, Tailwind CSS และ Development Server |
| `frontend/vitest.config.ts` | ตั้งค่าสภาพแวดล้อมสำหรับ Unit tests |
| `frontend/playwright.config.ts` | ตั้งค่า Browser, Base URL, Report และวิธีเปิดระบบก่อน E2E tests |
| `frontend/tsconfig*.json` | กฎการตรวจ TypeScript สำหรับ Application, Node และ Tests |
| `frontend/eslint.config.ts` | กฎตรวจรูปแบบและข้อผิดพลาดใน Source Code |
| `frontend/env.d.ts` | ประกาศ Type ที่ Frontend และ Vite เพิ่มให้กับ TypeScript |

## 5. Backend - การประมวลผลและข้อมูล

Backend พัฒนาด้วย Node.js และ Express รับคำขอจาก Frontend ตรวจสิทธิ์ ทำงานตามคำขอ และอ่านหรือบันทึกข้อมูลใน PostgreSQL

### 5.1 จุดเริ่มต้นและการตั้งค่า

| ไฟล์ | เกี่ยวกับอะไร |
|---|---|
| `backend/src/index.js` | โหลดค่าจาก `.env` เปิด HTTP server เริ่มงานตามเวลา และปิดการเชื่อมต่ออย่างเรียบร้อยเมื่อระบบหยุด |
| `backend/src/app.js` | สร้าง Express application เปิด CORS อ่าน Cookie และ JSON เชื่อม Route ทุกกลุ่ม และมี `/health` สำหรับตรวจสถานะ |
| `backend/src/config/database.js` | สร้าง Connection Pool ของ PostgreSQL จาก `DATABASE_URL` |
| `backend/src/config/allowed-origins.js` | รวมรายการเว็บไซต์ที่อนุญาตให้เรียก Backend |
| `backend/src/errors/api-error.js` | รูปแบบ Error ที่ระบุ HTTP status และข้อความที่ส่งกลับไปยัง Frontend ได้ |

### 5.2 Middleware - จุดตรวจร่วมก่อนถึงงานหลัก

| ไฟล์ | เกี่ยวกับอะไร |
|---|---|
| `middleware/auth.middleware.js` | อ่าน JWT จาก Cookie ตรวจความถูกต้อง โหลดข้อมูลผู้ใช้ และตรวจว่าบัญชีมีสิทธิ์ตามบทบาทที่ Route ต้องการ |
| `middleware/origin.middleware.js` | ป้องกันคำขอที่เปลี่ยนข้อมูลหากส่งมาจากเว็บไซต์ที่ระบบไม่ได้อนุญาต |
| `middleware/error.middleware.js` | เปลี่ยน Error เป็น JSON รูปแบบกลาง และตอบ 404 เมื่อไม่มี API ตาม URL ที่เรียก |

### 5.3 Routes - รายการทางเข้าของ Backend

Route ระบุ URL และ HTTP method แล้วส่งคำขอไปยัง Controller ที่เกี่ยวข้อง การตรวจว่าผู้ใช้เป็นผู้ดูแล อาจารย์ หรือนักศึกษาจะทำก่อนเข้าถึงบาง Route

| ไฟล์ | เกี่ยวกับอะไร |
|---|---|
| `routes/auth.routes.js` | ทางเข้า Google Sign-In, Development Login, ตรวจผู้ใช้ปัจจุบัน และออกจากระบบ |
| `routes/students.routes.js` | ทางเข้าอ่านและจัดการนักศึกษา การนำเข้า ส่งออก สถานะ และการขยายเวลาศึกษา |
| `routes/advisors.routes.js` | ทางเข้าอ่านและจัดการอาจารย์ รวมถึงข้อมูลนักศึกษาและ Milestone ในความดูแล |
| `routes/milestones.routes.js` | ทางเข้าอ่าน สร้าง แก้ไข เปิดปิด เรียง และคัดลอกแบบแผน Milestone |
| `routes/student-profile.routes.js` | ทางเข้าสำหรับนักศึกษาที่ต้องการดูหรือแก้ข้อมูลของตนเอง |
| `routes/evidence.routes.js` | ทางเข้าเปิดไฟล์หลักฐานหลังตรวจสิทธิ์ผู้ขอ |
| `routes/notifications.routes.js` | ทางเข้าอ่าน สร้าง และเปลี่ยนสถานะ Notification รวมถึงไฟล์แนบ |
| `routes/users.routes.js` | ทางเข้าอ่านและจัดการบัญชีผู้ใช้ |

### 5.4 Controllers - รับคำขอและเตรียมคำตอบ

Controller อ่านข้อมูลจาก URL, Query, Body หรือไฟล์อัปโหลด ตรวจรูปแบบเบื้องต้น เรียก Service ที่เกี่ยวข้อง แล้วกำหนด HTTP status และข้อมูลตอบกลับ

| ไฟล์ | เกี่ยวกับอะไร |
|---|---|
| `controllers/auth.controller.js` | รับ Google credential ตรวจว่าเป็นบัญชี `lamduan.mfu.ac.th` ตรวจว่ามีผู้ใช้อยู่ในระบบ แล้วสร้าง Login Cookie นอกจากนี้ยังดูแล Development Login และ Logout |
| `controllers/students.controller.js` | รับคำขอเกี่ยวกับรายชื่อ รายละเอียด การนำเข้า ส่งออก สถานะการศึกษา Milestone และการขยายเวลา |
| `controllers/advisors.controller.js` | รับคำขอเกี่ยวกับรายชื่อ สถานะ การนำเข้า ส่งออก นักศึกษาในความดูแล และผลสรุป Milestone |
| `controllers/milestones.controller.js` | ตรวจข้อมูลที่ส่งมาและรับคำขอจัดการแบบแผน Milestone |
| `controllers/student-profile.controller.js` | รับคำขอที่นักศึกษาทำกับข้อมูลของตนเอง เช่น ดู Profile แต่งตั้งอาจารย์ ส่งหลักฐาน และแจ้งสำเร็จการศึกษา |
| `controllers/evidence.controller.js` | ตรวจสิทธิ์ก่อนเปิดไฟล์หลักฐาน และส่งไฟล์โดยตรงหรือส่งต่อให้งาน Nginx |
| `controllers/notifications.controller.js` | รับคำขอสร้างและอ่าน Notification อัปโหลดหรือเปิดไฟล์แนบ และบันทึกสถานะการอ่าน |
| `controllers/users.controller.js` | รับคำขอจัดการบัญชีผู้ใช้จากผู้ดูแลระบบ |

### 5.5 Services - งานหลักของระบบ

Service เป็นส่วนที่ประมวลผลข้อมูล ติดต่อ PostgreSQL จัดการไฟล์ หรือส่งอีเมล Controller จะเรียก Service แทนการทำงานเหล่านี้โดยตรง

#### ผู้ใช้ นักศึกษา และอาจารย์

| ไฟล์ | เกี่ยวกับอะไร |
|---|---|
| `services/auth.service.js` | ค้นหาผู้ใช้ที่ได้รับอนุญาตจาก Email หรือ User ID และรวมข้อมูลชื่อกับบทบาทจากตารางที่เกี่ยวข้อง |
| `services/users.service.js` | อ่าน สร้าง แก้ไข และลบบัญชีผู้ใช้ พร้อมปรับข้อมูลอาจารย์ที่ผูกกับบัญชีเมื่อจำเป็น |
| `services/students.service.js` | อ่านและปรับข้อมูลนักศึกษา จัดการสถานะ ที่ปรึกษา การขยายเวลา และข้อมูลที่ใช้ใน Dashboard |
| `services/student-files.service.js` | อ่านและตรวจไฟล์ CSV/XLSX ของนักศึกษา รวมทั้งสร้างไฟล์ตัวอย่างและไฟล์ส่งออก |
| `services/advisors.service.js` | อ่านและปรับข้อมูลอาจารย์ นำเข้ารายชื่อ และสร้างข้อมูลนักศึกษาในความดูแลกับรายงานสรุป |
| `services/advisor-files.service.js` | อ่านและตรวจไฟล์รายชื่ออาจารย์ รวมทั้งสร้างไฟล์ตัวอย่างและไฟล์ส่งออก |
| `services/bootstrap-admin.service.js` | สร้างหรือปรับบัญชีผู้ดูแลระบบเริ่มต้นโดยไม่สร้างข้อมูลซ้ำ |

#### Milestone และหลักฐาน

| ไฟล์ | เกี่ยวกับอะไร |
|---|---|
| `services/milestones.service.js` | อ่าน สร้าง แก้ไข เปิดปิด และเรียงลำดับแบบแผน Milestone |
| `services/academic-year-milestones.service.js` | เตรียมชุด Milestone ของปีการศึกษาใหม่จากชุดล่าสุดที่ตรงกัน |
| `services/milestone-copy.service.js` | คัดลอกชุด Milestone ตามปี ระดับการศึกษา และแผนที่เลือก |
| `services/milestone-student.service.js` | สร้างรายการ Milestone ที่นักศึกษาแต่ละคนควรเห็น พร้อมสถานะและเงื่อนไขการเปิดใช้งาน |
| `services/milestone-advisor.service.js` | เตรียมรายการสำหรับอาจารย์ ตรวจหลักฐาน และบันทึกผลอนุมัติหรือส่งกลับ |
| `services/milestone-evidence.service.js` | บันทึกหรือนำหลักฐานออก และควบคุมสถานะของการส่งหลักฐาน |
| `services/evidence.service.js` | ตรวจว่าผู้ขอมีความเกี่ยวข้องกับหลักฐานก่อนอนุญาตให้เปิดไฟล์ |
| `services/evidence-code.js` | สร้างและจัดรูปแบบรหัสสั้นที่ใช้ระบุหลักฐาน |
| `services/milestone.constants.js` | รวมชื่อสถานะและค่าคงที่ของ Milestone ที่หลาย Service ใช้ร่วมกัน |

#### การขยายเวลา การแจ้งเตือน และงานตามเวลา

| ไฟล์ | เกี่ยวกับอะไร |
|---|---|
| `services/study-extension-policy.js` | คำนวณช่วงเวลาศึกษาปกติ วันที่เริ่มขยาย และวันสิ้นสุดของแต่ละรอบ |
| `services/study-extension-scheduler.service.js` | ตรวจนักศึกษาที่หมดระยะขยายและปรับสถานะเมื่อถึงเวลา |
| `services/notifications.service.js` | อ่านและสร้าง Notification บันทึกการอ่าน และตรวจสิทธิ์เปิดไฟล์แนบ |
| `services/notification-recipient.service.js` | คัดเลือกรายชื่อผู้รับจากกลุ่มเป้าหมายที่ผู้ส่งเลือก |
| `services/milestone-notification.service.js` | สร้าง Notification ที่เกิดจากการเปลี่ยนแปลงของ Milestone |
| `services/milestone-reminder.service.js` | ค้นหา Milestone ที่ถึงกำหนดเตือนและเตรียมข้อความแจ้งเตือน |
| `services/milestone-reminder-scheduler.service.js` | เรียกตรวจ Reminder ตามช่วงเวลาที่กำหนด |
| `services/email.service.js` | สร้างเนื้อหา Email และไฟล์แนบ แล้วส่งตรงผ่าน SMTP |

### 5.6 ข้อมูลตั้งต้น Script และการทดสอบ

| โฟลเดอร์หรือไฟล์ | เกี่ยวกับอะไร |
|---|---|
| `src/data/default-milestone-templates.js` | ชุด Milestone ตั้งต้นที่ Migration สามารถนำไปใช้เมื่อยังไม่มีข้อมูล |
| `src/scripts/migrate-database.js` | ตรวจและปรับโครงสร้างฐานข้อมูลเดิมให้รองรับ Source Code ปัจจุบัน |
| `src/scripts/audit-database.js` | ตรวจว่าตาราง คอลัมน์ Index และ Constraint สำคัญมีอยู่ครบ |
| `src/scripts/bootstrap-admin.js` | เรียก Service เพื่อสร้างหรือปรับบัญชีผู้ดูแลเริ่มต้นจาก Environment Variables |
| `src/**/*.test.js` | Unit tests ที่วางใกล้ไฟล์ Source Code ที่กำลังทดสอบ |
| `test/*.test.js` | การทดสอบการนำเข้าไฟล์ การเตรียม Container และการทำงานที่เชื่อมหลายส่วน |
| `test/e2e/seed-e2e.js` | ล้างและสร้างข้อมูลเฉพาะสำหรับ E2E test โดยต้องเปิดอนุญาตอย่างชัดเจนก่อน |

### 5.7 ไฟล์ตั้งค่า Backend

| ไฟล์ | เกี่ยวกับอะไร |
|---|---|
| `backend/.env.example` | ตัวอย่างค่าการเชื่อมต่อ Database, Authentication, Frontend origin, Email และบัญชีผู้ดูแลเริ่มต้น |
| `backend/package.json` | Dependencies และคำสั่ง Start, Dev, Test, Migration, Audit และ Bootstrap Admin |
| `backend/Dockerfile` | สร้าง Image ขนาดเล็กสำหรับ Backend ที่ใช้งานจริง |
| `backend/Dockerfile.dev` | สร้าง Image สำหรับ Backend ในระบบ E2E test |
| `backend/docker-entrypoint.sh` | รอ PostgreSQL เรียก Migration สร้าง Admin เริ่มต้น แล้วจึงเปิด Backend |

## 6. Database - โครงสร้างข้อมูล

| ไฟล์ | เกี่ยวกับอะไร |
|---|---|
| `backend/database/schema.sql` | สร้างตาราง ความสัมพันธ์ Index และข้อมูลตั้งต้นสำหรับฐานข้อมูลใหม่ |
| `backend/database/protective-foreign-keys.sql` | เพิ่ม Foreign Key และข้อจำกัดเพื่อป้องกันข้อมูลที่อ้างถึงรายการซึ่งไม่มีอยู่แล้ว |
| `backend/database/recalculate-study-extension-end-dates.sql` | ปรับวันสิ้นสุดการขยายเวลาของข้อมูลเดิมให้คำนวณเป็นสี่เดือนปฏิทิน |

ไฟล์ SQL อยู่ใน `backend/database/` เพราะ Backend เป็นส่วนที่อ่านและแก้ไขข้อมูลใน PostgreSQL โดยตรง เมื่อเปิดระบบใหม่ผ่าน Docker ไฟล์ `schema.sql` จะถูกใช้สร้างฐานข้อมูลครั้งแรก ส่วนฐานข้อมูลเดิมจะได้รับการตรวจและปรับเพิ่มเติมจาก Migration script ของ Backend

## 7. Deploy - การประกอบระบบสำหรับใช้งานจริง

โฟลเดอร์ `deploy/` อยู่ที่ระดับบนสุดของโปรเจกต์ ซึ่งเป็นตำแหน่งที่ถูกต้อง เพราะ Docker Compose ต้องใช้ไฟล์ในโฟลเดอร์นี้ร่วมกับทั้ง Frontend และ Backend

| ไฟล์ | เกี่ยวกับอะไร |
|---|---|
| `deploy/gateway/Dockerfile` | ใช้ Node.js Build Vue ให้เป็นไฟล์หน้าเว็บ แล้วคัดลอกผลลัพธ์ไปไว้ใน Nginx Image เดียวกัน |
| `deploy/nginx/default.conf` | ส่งหน้าเว็บจาก Nginx ส่งคำขอ `/api` ต่อไปยัง Backend และส่งไฟล์ Upload หลัง Backend ตรวจสิทธิ์ |
| `docker-compose.yml` | ประกอบ `db`, `backend` และ `gateway` เข้าด้วยกัน พร้อม Volume สำหรับ Database และ Upload |
| `docker-compose.e2e.yml` | ประกอบระบบทดสอบที่ใช้ Database และข้อมูลแยกจากระบบหลัก |

Production มี Container หลัก 3 ตัว:

```text
gateway   = Nginx + ไฟล์ Frontend ที่ Build แล้ว
backend   = Node.js API
db        = PostgreSQL
```

ดังนั้น Production ไม่มี Frontend Container แยกอีกหนึ่งตัว เพราะ Frontend ที่ Build แล้วอยู่ใน `gateway`

## 8. End-to-End Tests - การทดสอบผ่านเบราว์เซอร์

| โฟลเดอร์หรือไฟล์ | เกี่ยวกับอะไร |
|---|---|
| `frontend/e2e/auth/` | ทดสอบหน้าล็อกอิน ทั้ง Development Login และหน้าปุ่ม Google Sign-In |
| `frontend/e2e/import/` | ทดสอบการนำเข้ารายชื่อนักศึกษาและอาจารย์ |
| `frontend/e2e/management/` | ทดสอบงานจัดการข้อมูล เช่น การปิดสถานะแทนการลบ |
| `frontend/e2e/notifications/` | ทดสอบการสร้าง Notification และการมองเห็นจากบัญชีนักศึกษา |
| `frontend/e2e/smoke/` | ทดสอบอย่างรวดเร็วว่าหน้าหลักเปิดได้ |
| `frontend/e2e/fixtures/imports/` | ไฟล์ตัวอย่างที่ใช้เป็นข้อมูลนำเข้าระหว่างทดสอบ |
| `frontend/e2e/support/` | เครื่องมือช่วยจำลอง Google Identity ในสภาพแวดล้อมทดสอบ |
| `frontend/e2e/Dockerfile` | สร้าง Frontend Development Server ที่ระบบ E2E เปิดใช้ใน Container |
| `frontend/e2e/README.md` | คำอธิบายวิธีใช้ชุดทดสอบ E2E |

---

เอกสารนี้ตรวจชื่อและตำแหน่งของโฟลเดอร์กับไฟล์จาก Source Code ที่มีอยู่จริง ณ วันที่ระบุด้านบน หากโครงสร้างโปรเจกต์เปลี่ยน ควรแก้ Markdown ฉบับนี้ก่อน แล้วสร้าง PDF ใหม่จากเนื้อหาเดียวกันเพื่อให้ทั้งสองฉบับตรงกัน
