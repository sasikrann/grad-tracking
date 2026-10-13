# Project Structure and Handover Guide

**โครงการ:** Graduate Tracking System  
**ปรับปรุงล่าสุด:** 13 ตุลาคม 2026  
**วัตถุประสงค์:** อธิบายโครงสร้างโปรเจกต์ เส้นทางข้อมูล และความรับผิดชอบของแต่ละส่วน เพื่อให้ผู้พัฒนาคนถัดไปรับช่วงงานได้อย่างปลอดภัย

> ขอบเขตของรายการโฟลเดอร์ในเอกสารนี้ครอบคลุม source code, configuration, deployment, tests, uploads และเอกสารที่อยู่ใน repository โดยไม่นับ `.git`, `node_modules` และไฟล์ build ใน `frontend/dist` เพราะเป็นข้อมูลที่สร้างขึ้นอัตโนมัติ

## 1. ภาพรวมสถาปัตยกรรม

ระบบเป็น web application แบบแยก frontend และ backend:

```text
Browser
  -> Vue View / Component
  -> Frontend Service
  -> HTTP /api/...
  -> Express Route
  -> Middleware
  -> Controller
  -> Backend Service
  -> PostgreSQL / Upload Storage / Email
```

- **Frontend:** Vue 3, TypeScript, Vue Router, Vite และ Tailwind CSS
- **Backend:** Node.js, Express และ PostgreSQL
- **Authentication:** Google credential หรือ development login แล้วเก็บ session ใน HTTP-only cookie
- **Authorization:** ตรวจ role ที่ router และตรวจ ownership/สิทธิ์เฉพาะรายการใน controller หรือ service
- **Storage:** PostgreSQL เก็บข้อมูลธุรกิจ; `backend/uploads` เก็บหลักฐาน milestone และไฟล์แนบ notification
- **Background work:** scheduler แจ้งเตือน milestone และ scheduler เปลี่ยนสถานะหลังหมดสิทธิ์ขยายเวลา
- **Deployment:** Docker Compose, Nginx gateway และ container แยก frontend/backend/database

## 2. โครงสร้างโฟลเดอร์ทั้งหมด

| โฟลเดอร์ | หน้าที่ |
|---|---|
| `.vscode/` | การตั้งค่า editor สำหรับผู้พัฒนาใน repository |
| `backend/` | Express API, business logic, database access, migrations, tests และไฟล์อัปโหลด |
| `backend/database/` | schema เริ่มต้นและ SQL migration |
| `backend/src/` | source code หลักของ backend |
| `backend/src/config/` | การเชื่อมต่อฐานข้อมูลและค่าความปลอดภัย เช่น allowed origins |
| `backend/src/controllers/` | รับ request, ตรวจ input ระดับ HTTP, เรียก service และจัด response |
| `backend/src/data/` | ข้อมูลตั้งต้น เช่น default milestone templates |
| `backend/src/errors/` | error class กลางของ API |
| `backend/src/middleware/` | authentication, authorization, trusted-origin และ error handling |
| `backend/src/routes/` | ประกาศ method/path และผูก middleware กับ controller |
| `backend/src/scripts/` | งาน command line เช่น bootstrap admin, migration และ audit ฐานข้อมูล |
| `backend/src/services/` | business rules, query ฐานข้อมูล, import/export, scheduler, email และไฟล์ |
| `backend/test/` | integration-oriented tests ของ import, bootstrap และ entrypoint |
| `backend/test/e2e/` | seed data สำหรับ end-to-end tests |
| `backend/uploads/` | root ของไฟล์ที่ผู้ใช้อัปโหลด ห้ามลบโดยไม่ตรวจ reference ในฐานข้อมูล |
| `backend/uploads/evidence/` | หลักฐาน milestone ของนักศึกษา |
| `backend/uploads/notifications/` | ไฟล์แนบ notification |
| `deploy/` | image และ configuration สำหรับ gateway/deployment |
| `deploy/gateway/` | Dockerfile สำหรับ gateway/frontend production image |
| `deploy/nginx/` | Nginx reverse proxy และ protected-media configuration |
| `frontend/` | Vue single-page application, tests และ browser E2E tests |
| `frontend/e2e/` | Playwright tests และ test-only Docker image |
| `frontend/e2e/auth/` | E2E สำหรับ login |
| `frontend/e2e/fixtures/` | ข้อมูลทดสอบที่ใช้โดย Playwright |
| `frontend/e2e/fixtures/imports/` | CSV/XLSX fixtures สำหรับ import |
| `frontend/e2e/import/` | E2E สำหรับ student/advisor import |
| `frontend/e2e/management/` | E2E สำหรับงานจัดการ เช่น disable แทน delete |
| `frontend/e2e/notifications/` | E2E สำหรับ notification จาก admin ถึง student |
| `frontend/e2e/smoke/` | smoke tests ของหน้าหลัก |
| `frontend/e2e/support/` | mock และ helper สำหรับ E2E |
| `frontend/public/` | static assets ที่ Vite copy ตรงไปยัง build output |
| `frontend/src/` | source code หลักของ frontend |
| `frontend/src/assets/` | CSS, fonts และรูปภาพที่ import ผ่าน Vite |
| `frontend/src/components/` | reusable Vue components |
| `frontend/src/components/__tests__/` | unit tests ของ component |
| `frontend/src/components/admin/` | component สำหรับ dashboard, import/export และ advisor table |
| `frontend/src/components/common/` | component กลาง เช่น pagination |
| `frontend/src/components/milestone/` | form และ table สำหรับจัดการ milestone template |
| `frontend/src/components/milestone/form/` | input/dropdown ย่อยของ milestone form |
| `frontend/src/components/navigation/` | Navbar และ language switch |
| `frontend/src/components/student/` | student table, filter, overview และข้อมูล profile |
| `frontend/src/components/student-milestone/` | card, progress, status และ evidence upload ของ milestone |
| `frontend/src/composables/` | stateful Vue logic ที่ใช้ซ้ำ เช่น language, auto-refresh และ student overview |
| `frontend/src/composables/__tests__/` | unit tests ของ composable |
| `frontend/src/lang/` | dictionary ภาษาไทยและอังกฤษ |
| `frontend/src/router/` | route ของ SPA และ role guard |
| `frontend/src/services/` | HTTP client และ API wrappers ของ frontend |
| `frontend/src/services/__tests__/` | unit tests ของ frontend services |
| `frontend/src/types/` | TypeScript types ของ domain objects |
| `frontend/src/utils/` | pure utilities สำหรับชื่ออาจารย์ สถานะ milestone และ notification |
| `frontend/src/utils/__tests__/` | unit tests ของ utilities |
| `frontend/src/views/` | page-level components ที่ผูกกับ Vue Router |
| `frontend/src/views/admin/` | หน้าสำหรับ administrator |
| `frontend/src/views/advisor/` | หน้าสำหรับ advisor |
| `frontend/src/views/student/` | หน้าสำหรับ student |
| `output/` | artifacts ที่สร้างเพื่อส่งมอบ |
| `output/pdf/` | PDF ฉบับส่งมอบ |

## 3. ไฟล์ระดับ root และ deployment ที่สำคัญ

| ไฟล์ | หน้าที่ |
|---|---|
| `README.md` | วิธีเริ่มต้นใช้งานและภาพรวม repository |
| `DEPLOYMENT.md` | ขั้นตอน deploy และ environment ที่เกี่ยวข้อง |
| `.env.docker.example` | ตัวอย่าง environment variables สำหรับ Docker Compose |
| `docker-compose.yml` | stack หลักสำหรับ development/deployment |
| `docker-compose.e2e.yml` | stack แยกสำหรับ Playwright E2E |
| `package.json` | metadata ระดับ root; package จริงอยู่ใน frontend/backend |
| `deploy/nginx/default.conf` | reverse proxy `/api`, SPA fallback และ protected uploads |
| `backend/docker-entrypoint.sh` | รอฐานข้อมูล, migrate/bootstrap และเริ่ม API container |
| `backend/database/schema.sql` | schema สำหรับ provision ฐานข้อมูลใหม่ |
| `backend/database/protective-foreign-keys.sql` | migration เพิ่มข้อจำกัดและป้องกัน orphan records |
| `backend/database/recalculate-study-extension-end-dates.sql` | migration ปรับรอบขยายเดิมเป็นวันเริ่ม + 4 เดือนปฏิทิน |

## 4. Frontend structure

### 4.1 Entry point และ navigation

| ไฟล์ | หน้าที่ |
|---|---|
| `frontend/src/main.ts` | สร้าง Vue app, ติดตั้ง router และโหลด global CSS |
| `frontend/src/App.vue` | application shell และ Navbar |
| `frontend/src/router/index.ts` | URL-to-view mapping, authentication initialization และ role guard |
| `frontend/src/services/auth.ts` | session state, login/logout, `/api/auth/me` และ authenticated fetch |
| `frontend/src/services/api-client.ts` | สร้าง API URL, JSON request, file download และ error handling กลาง |

### 4.2 หน้าที่ของ Vue views

| View | Route | หน้าที่หลัก |
|---|---|---|
| `Login.vue` | `/login` | Google login และ development login |
| `AccessUnavailableView.vue` | `/unavailable` | แจ้งเมื่อบัญชีไม่มีพื้นที่ใช้งานที่เหมาะสม |
| `admin/StudentDashboardView.vue` | `/admin/student-dashboard` | รายการนักศึกษา, filter, สถิติ, import/export และเปลี่ยนสถานะออกจากระบบ |
| `admin/AdminStudentMilestoneView.vue` | `/admin/students/:studentId/milestones` | ดู milestone รายคนและจัดการรอบขยายเวลา |
| `admin/AdvisorDashboardView.vue` | `/admin/advisor-dashboard` | รายการอาจารย์, import/export และเปิด/ปิดสถานะ |
| `admin/MilestoneManagementView.vue` | `/milestones` | สร้าง แก้ เปิด/ปิด เรียง และคัดลอก milestone template |
| `admin/NotificationManagementView.vue` | `/admin/notifications` | สร้าง notification, แนบไฟล์, ส่ง email และดูประวัติ |
| `advisor/AdvisorStudentOverallView.vue` | `/advisor/student-overall` | ภาพรวมนักศึกษาในความดูแลและ filter |
| `advisor/AdvisorMilestoneSummaryView.vue` | `/advisor/summary` | สรุป milestone ตามระดับ แผน และปีเข้า |
| `advisor/AdvisorStudentMilestoneView.vue` | `/advisor/students/:studentId/milestones` | ดู อนุมัติ หรือปฏิเสธ milestone ของนักศึกษา |
| `student/StudentInformationView.vue` | `/student/information` | profile, แผนการศึกษา และทีมอาจารย์ที่ปรึกษา |
| `student/StudentMilestoneView.vue` | `/student/milestones` | milestone workflow, แต่งตั้ง advisor, upload หลักฐาน และบันทึกจบ |
| `student/StudentNotificationView.vue` | `/notifications` | notification inbox, read state และไฟล์แนบ |

### 4.3 View -> frontend service

| View | Frontend service/function ที่เรียก |
|---|---|
| `Login.vue` | `auth.loginWithGoogleCredential`, `auth.loginForDevelopment` |
| `StudentDashboardView.vue` | `students.getStudentsPage`, `importStudents`, `exportStudents`, `downloadStudentTemplate`, `updateStudentExitStatus` |
| `AdminStudentMilestoneView.vue` | `students.getStudent`, `getStudentMilestones`, `extendStudentStudyPeriod`, `cancelStudentStudyExtension` |
| `AdvisorDashboardView.vue` | `advisors.getAdvisorsPage`, `importAdvisors`, `exportAdvisors`, `downloadAdvisorTemplate`, `updateAdvisorStatus` |
| `MilestoneManagementView.vue` | `milestones.getMilestones`, `createMilestone`, `updateMilestone`, `setMilestoneEnabled`, `moveMilestone`; ใช้ `students.getStudents` เพื่อสร้างตัวเลือกปี/ระดับ/แผน |
| `NotificationManagementView.vue` | `notifications.getNotifications`, `createNotification`, `uploadNotificationAttachment`, `resolveNotificationAttachmentUrl`; ใช้ `students.getStudents` เพื่อ preview กลุ่มเป้าหมาย |
| `AdvisorStudentOverallView.vue` | `students.getAdvisorStudentOverview`; อ่าน `auth.currentUser` |
| `AdvisorMilestoneSummaryView.vue` | `advisor-milestone-summary.getAdvisorMilestoneSummary`; อ่าน `auth.currentUser` |
| `AdvisorStudentMilestoneView.vue` | `advisor-milestones.getAdvisorStudentMilestones`, `reviewAdvisorMilestone` |
| `StudentInformationView.vue` | `student-profile.getMyStudentProfile` |
| `StudentMilestoneView.vue` | `student-milestones.getMyStudentMilestones`, `uploadMyMilestoneEvidence`, `removeMyMilestoneEvidence`, `createEvidencePreviewUrl`; `student-profile.getMyStudentProfile`, `appointMyStudentAdvisors`, `submitMyGraduation`; `advisors.getAdvisors` |
| `StudentNotificationView.vue` | `notifications.getMyNotifications`, `getUnreadNotificationCount`, `markNotificationAsRead`, `markAllNotificationsAsRead`, `resolveNotificationAttachmentUrl` |
| `AccessUnavailableView.vue` | ไม่มี API call โดยตรง |

> `frontend/src/services/students.api.ts` เป็น facade ที่ re-export query/action/transfer functions จาก `student-query.api.ts`, `student-actions.api.ts` และ `student-transfer.api.ts` เพื่อให้ views ใช้ import เดียว

## 5. Backend layers ต่างกันอย่างไร

| Layer | คำถามที่ layer นี้ตอบ | สิ่งที่ควรอยู่ | สิ่งที่ไม่ควรอยู่ |
|---|---|---|---|
| **Route** | Request นี้เข้าฟังก์ชันไหน และผ่าน middleware ใด | HTTP method, path, upload middleware, role middleware | SQL และ business rules |
| **Middleware** | Request ผ่านเงื่อนไขร่วมไหม | authentication, role, origin, error normalization | feature-specific database workflow |
| **Controller** | แปลง HTTP request/response อย่างไร | อ่าน params/query/body, HTTP validation, status code, response shape | query ซับซ้อนหรือ transaction ยาว |
| **Service** | กฎธุรกิจและข้อมูลทำงานอย่างไร | business rules, transaction, SQL, file/email generation, scheduler | Express response object และ UI state |

ตัวอย่างการขยายเวลาศึกษา:

```text
PATCH /api/students/:studentId/study-extension
  -> students.routes.js
  -> requireAuth + requireRole('admin') in app.js
  -> students.controller.extendStudentStudyPeriod
  -> students.service.grantStudentStudyExtension
  -> study-extension-policy.js
  -> students + milestone_templates + student_milestones + student_study_extensions
```

## 6. Backend files ที่สำคัญ

### 6.1 Application, configuration และ middleware

| ไฟล์ | หน้าที่ |
|---|---|
| `backend/src/index.js` | เริ่ม HTTP server, ตั้ง timezone, เปิด/ปิด schedulers และ graceful shutdown |
| `backend/src/app.js` | ประกอบ Express middleware, mount routers และ health endpoint |
| `backend/src/config/database.js` | PostgreSQL connection pool |
| `backend/src/config/allowed-origins.js` | origin allowlist สำหรับ CORS/trusted-origin |
| `backend/src/errors/api-error.js` | error ที่มี HTTP status และ client message |
| `backend/src/middleware/auth.middleware.js` | อ่าน session token, โหลด user ปัจจุบัน และตรวจ role |
| `backend/src/middleware/origin.middleware.js` | ป้องกัน state-changing request จาก origin ที่ไม่เชื่อถือ |
| `backend/src/middleware/error.middleware.js` | แปลง error เป็น JSON response และจัดการ 404 |

### 6.2 Controllers

| Controller | หน้าที่ |
|---|---|
| `auth.controller.js` | Google/dev login, logout และ current user |
| `students.controller.js` | student list/detail/CRUD, import/export, milestone overview, extension และ exit status |
| `advisors.controller.js` | advisor CRUD/status/import/export, advised students และ milestone review/summary |
| `milestones.controller.js` | validate และจัดการ milestone templates |
| `student-profile.controller.js` | self-service ของนักศึกษา: profile, advisor, evidence และ graduation |
| `notifications.controller.js` | notification CRUD-like workflow, attachments และ read state |
| `evidence.controller.js` | authorize และ stream หลักฐาน milestone |
| `users.controller.js` | admin user management |

### 6.3 Services

| Service | หน้าที่หลัก | ตาราง/ระบบที่เกี่ยวข้อง |
|---|---|---|
| `students.service.js` | student query/CRUD/import, advisor assignment, graduation, extension workflow | `students`, `users`, `advisors`, `student_co_advisors`, `student_study_extensions`, `milestone_templates`, `student_milestones`, `import_logs` |
| `student-files.service.js` | อ่าน/ตรวจ CSV/XLSX, normalize แผน, สร้าง template/export | ExcelJS, student data |
| `advisors.service.js` | advisor CRUD/import, pagination และ milestone summary | `advisors`, `users`, `students`, `student_co_advisors`, milestone tables, `import_logs` |
| `advisor-files.service.js` | parse/validate/import template/export ของ advisor | ExcelJS |
| `milestones.service.js` | schema upkeep และ CRUD/order/copy ของ template | `milestone_templates`, `student_milestones`, `students` |
| `academic-year-milestones.service.js` | คัดลอก milestone set ล่าสุดไปปีใหม่โดยรักษาแผนและ prerequisite | `milestone_templates` |
| `milestone-copy.service.js` | คัดลอก milestone ข้ามปีตาม degree/plan ที่ผู้ดูแลเลือก | `milestone_templates` |
| `milestone-student.service.js` | milestone list, lock และ prerequisite สำหรับ student/admin | `students`, `milestone_templates`, `student_milestones` |
| `milestone-advisor.service.js` | submission queue, student milestone detail และ review | `advisors`, `students`, `milestone_templates`, `student_milestones` |
| `milestone-evidence.service.js` | upload/remove evidence state และ revision limit | `students`, `milestone_templates`, `student_milestones` |
| `evidence.service.js` | ตรวจสิทธิ์ผู้เปิดไฟล์หลักฐาน | student/advisor ownership และ upload path |
| `evidence-code.js` | normalize/generate evidence code สั้น ๆ | pure utility |
| `study-extension-policy.js` | ระยะปกติ, boundary date และ 4 เดือนปฏิทิน | pure domain policy |
| `study-extension-scheduler.service.js` | เปลี่ยน `Normal` เป็น `Dismissed` หลังรอบ 2 สิ้นสุด | `students`, `student_study_extensions` |
| `notifications.service.js` | notification list/create/read/attachment authorization | `notifications`, `notification_reads`, `students`, `users` |
| `notification-recipient.service.js` | เลือก recipients ตาม target audience | `students`, `users` |
| `milestone-notification.service.js` | สร้าง notification เมื่อ milestone เปลี่ยน | `notifications`, milestone data |
| `milestone-reminder.service.js` | หา milestone ที่ถึง reminder date และสร้างข้อความ | `milestone_templates`, `notifications` |
| `milestone-reminder-scheduler.service.js` | เรียก reminder check เป็นช่วงเวลา | reminder service |
| `email.service.js` | ส่ง email notification/attachment ตาม configuration | SMTP/API configuration |
| `auth.service.js` | verify Google identity, session token และ user/advisor lookup | `users`, `advisors` |
| `users.service.js` | user CRUD และ sync advisor profile | `users`, `advisors` |
| `bootstrap-admin.service.js` | สร้างหรืออัปเดต admin เริ่มต้นอย่าง idempotent | `users` |

## 7. Frontend service -> route -> controller -> backend service

### 7.1 Authentication

| Frontend call | HTTP route | Controller | Backend service | Tables |
|---|---|---|---|---|
| `loginWithGoogleCredential` | `POST /api/auth/google` | `loginWithGoogle` | `auth.service` | `users`, `advisors` |
| `loginForDevelopment` | `POST /api/auth/dev-login` | `loginForDevelopment` | `auth.service` | `users`, `advisors` |
| `initializeAuth` / `refreshCurrentUser` | `GET /api/auth/me` | `getCurrentUser` | auth middleware/service | `users`, `advisors` |
| `logout` | `POST /api/auth/logout` | `logout` | cookie/session handling | - |

### 7.2 Students and study extensions

| Frontend call | HTTP route | Controller | Backend service | Tables |
|---|---|---|---|---|
| `getStudents`, `getStudentsPage` | `GET /api/students` | `getStudents` | `findAllStudents` / `findStudentsPage` | student, advisor, milestone และ extension tables |
| `getStudent` | `GET /api/students/:studentId` | `getStudent` | `findStudentById` | `students`, `users`, `advisors`, `student_co_advisors`, `student_study_extensions` |
| `getStudentMilestones` | `GET /api/students/:studentId/milestones` | `getStudentMilestones` | `findStudentMilestonesByStudentId` | `students`, `milestone_templates`, `student_milestones` |
| `importStudents` | `POST /api/students/import` | `importStudentFile` | file service + `importStudents` | `students`, `users`, `advisors`, `import_logs`, milestone tables |
| `exportStudents` | `POST /api/students/export` | `exportStudents` | `findStudentsForExport` + file service | student/advisor/milestone tables |
| `downloadStudentTemplate` | `GET /api/students/template` | `downloadStudentTemplate` | file service | - |
| `extendStudentStudyPeriod` | `PATCH /api/students/:studentId/study-extension` | `extendStudentStudyPeriod` | `grantStudentStudyExtension` + extension policy | `students`, `student_study_extensions`, milestone tables |
| `cancelStudentStudyExtension` | `DELETE /api/students/:studentId/study-extension` | `cancelStudentStudyExtension` | `cancelLatestStudentStudyExtension` | `students`, `student_study_extensions` |
| `updateStudentExitStatus` | `PATCH /api/students/:studentId/exit-status` | `updateStudentExitStatus` | `setStudentExitStatus` | `students` |

### 7.3 Advisors and reviews

| Frontend call | HTTP route | Controller | Backend service | Tables |
|---|---|---|---|---|
| `getAdvisors`, `getAdvisorsPage` | `GET /api/advisors` | `getAdvisors` | advisor query services | `advisors`, `users` |
| `importAdvisors` | `POST /api/advisors/import` | `importAdvisorFile` | advisor file service + `importAdvisors` | `advisors`, `users`, `import_logs` |
| `exportAdvisors` | `GET /api/advisors/export` | `exportAdvisors` | advisor file service | `advisors` |
| `downloadAdvisorTemplate` | `GET /api/advisors/template` | `downloadAdvisorTemplate` | advisor file service | - |
| `updateAdvisorStatus` | `PATCH /api/advisors/:advisorId/status` | `patchAdvisorStatus` | `updateAdvisorStatus` | `advisors` |
| `getAdvisorStudentOverview` | `GET /api/advisors/:advisorId/students` | `getAdvisorStudents` | `findStudentsByAdvisorId` | student/advisor/milestone tables |
| `getAdvisorMilestoneSummary` | `GET /api/advisors/:advisorId/milestone-summary` | `getAdvisorMilestoneSummaryReport` | `getAdvisorMilestoneSummary` | student/advisor/milestone tables |
| `getAdvisorStudentMilestones` | `GET /api/advisors/students/:studentId/milestones` | `getAdvisorStudentMilestones` | `findAdvisorStudentMilestones` | advisor/student/milestone tables |
| `reviewAdvisorMilestone` | `PATCH /api/advisors/students/:studentId/milestones/:milestoneId/review` | `reviewAdvisorStudentMilestone` | `reviewStudentMilestone` | `student_milestones`, `advisors` |

### 7.4 Milestone template management

| Frontend call | HTTP route | Controller | Backend service | Tables |
|---|---|---|---|---|
| `getMilestones` | `GET /api/milestones` | `getMilestones` | `findMilestones` | `milestone_templates` |
| `createMilestone` | `POST /api/milestones` | `addMilestone` | `createMilestone` | `milestone_templates`, `notifications` |
| `updateMilestone` | `PUT /api/milestones/:milestoneId` | `editMilestone` | `updateMilestone` / `updateMilestoneForPlan` | `milestone_templates`, `student_milestones` |
| `setMilestoneEnabled` | `PATCH /api/milestones/:milestoneId/enabled` | `toggleMilestone` | `setMilestoneEnabled` | `milestone_templates` |
| `moveMilestone` | `PATCH /api/milestones/:milestoneId/order` | `reorderMilestone` | `moveMilestone` | `milestone_templates` |
| `copyMilestones` | `POST /api/milestones/copy` | `copyMilestoneSet` | `milestone-copy.copyMilestones` | `milestone_templates` |

### 7.5 Student self-service and evidence

| Frontend call | HTTP route | Controller | Backend service | Tables/files |
|---|---|---|---|---|
| `getMyStudentProfile` | `GET /api/student-profile/me` | `getMyStudentProfile` | `findStudentByUserId` | student/advisor/extension tables |
| `getMyStudentMilestones` | `GET /api/student-profile/me/milestones` | `getMyStudentMilestones` | `findStudentMilestonesByUserId` | milestone tables |
| `appointMyStudentAdvisors` | `PUT /api/student-profile/me/milestones/:id/advisors` | `appointMyAdvisors` | prerequisite check + `appointStudentAdvisorsByUserId` | `students`, `student_co_advisors`, milestone tables, evidence file |
| `submitMyGraduation` | `PUT /api/student-profile/me/milestones/:id/graduation` | `submitMyGraduation` | prerequisite check + `submitStudentGraduationByUserId` | `students`, `student_milestones` |
| `uploadMyMilestoneEvidence` | `PUT /api/student-profile/me/milestones/:id/evidence` | `uploadMyMilestoneEvidence` | submission access + evidence service | `student_milestones`, evidence file |
| `removeMyMilestoneEvidence` | `DELETE /api/student-profile/me/milestones/:id/evidence` | `removeMyMilestoneEvidence` | `clearStudentMilestoneEvidence` | `student_milestones`, evidence file |
| `createEvidencePreviewUrl` | `GET /api/evidence?path=...` | `viewEvidence` | evidence authorization service | upload file + ownership tables |

### 7.6 Notifications

| Frontend call | HTTP route | Controller | Backend service | Tables/files |
|---|---|---|---|---|
| `getNotifications` / `getMyNotifications` | `GET /api/notifications` | `getNotifications` | admin/student notification queries | `notifications`, `notification_reads`, `students`, `users` |
| `createNotification` | `POST /api/notifications` | `addNotification` | `createNotification` + email/recipient services | `notifications`, recipient tables |
| `uploadNotificationAttachment` | `POST /api/notifications/attachments` | `uploadNotificationAttachment` | upload middleware | notification file |
| `resolveNotificationAttachmentUrl` | `GET /api/notifications/attachments/:fileName` | `getNotificationAttachment` | attachment authorization | `notifications` + file |
| `getUnreadNotificationCount` | `GET /api/notifications/unread-count` | `getUnreadNotificationCount` | unread count service | `notifications`, `notification_reads` |
| `markNotificationAsRead` | `PATCH /api/notifications/:id/read` | `readNotification` | `markNotificationAsRead` | `notification_reads` |
| `markAllNotificationsAsRead` | `PATCH /api/notifications/read-all` | `readAllNotifications` | `markAllNotificationsAsRead` | `notification_reads` |

## 8. Database tables by feature

| Feature | ตารางหลัก | ความสัมพันธ์สำคัญ |
|---|---|---|
| Authentication/roles | `users`, `advisors`, `students` | `advisors.user_id` และ `students.user_id` ผูกกับ identity |
| Student management | `students`, `users`, `advisors`, `student_co_advisors`, `import_logs` | student มี primary advisor หนึ่งคนและ co-advisor สูงสุดสองคน |
| Advisor management | `advisors`, `users`, `students`, `student_co_advisors`, `import_logs` | ห้ามลบ profile ที่ยังถูกอ้างอิง; ใช้ inactive แทน |
| Milestone templates | `milestone_templates` | scope ด้วยปีเข้า ระดับปริญญา และชื่อแผนตรงตัว |
| Student progress | `student_milestones`, `milestone_templates`, `students` | unique ต่อ `(student_id, milestone_id)` |
| Evidence/review | `student_milestones`, `advisors` | เก็บ URL, comment, reviewer, timestamps และ rejection count |
| Study extension | `student_study_extensions`, `students`, milestone tables | สูงสุดสองรอบ; eligibility ต้องมี milestone ที่ยังไม่เสร็จ |
| Notifications | `notifications`, `notification_reads`, `users`, `students`, `milestone_templates` | reminder อ้าง milestone; read receipt ต่อ user |
| Import audit | `import_logs`, `users` | บันทึกชนิดไฟล์ จำนวนสำเร็จ/ล้มเหลว และผู้ import |

### ตารางแต่ละตัว

- **`users`** - identity, email, display name และ role กลาง
- **`advisors`** - profile อาจารย์และสถานะ active/inactive
- **`students`** - profile การศึกษา แผน ปีเข้า สถานะจบ/ลาออก/พ้นสภาพ และ advisor หลัก
- **`student_co_advisors`** - co-advisor ลำดับ 1-2
- **`milestone_templates`** - คำนิยาม milestone ต่อปี/ระดับ/แผน พร้อม prerequisite และกำหนดเวลา
- **`student_milestones`** - progress ของนักศึกษาแต่ละคนต่อ template
- **`student_study_extensions`** - รอบขยาย 1-2 วันเริ่ม/สิ้นสุด ผู้อนุมัติ และการยกเลิก
- **`notifications`** - ข้อความ กลุ่มเป้าหมาย ไฟล์แนบ และ automatic reminder metadata
- **`notification_reads`** - read receipt ของผู้ใช้
- **`import_logs`** - audit ของ student/advisor import

## 9. Business rules ที่ต้องระวังเมื่อรับช่วง

### 9.1 ชื่อแผนเก่าและใหม่

- ข้อมูลปริญญาโทเก่าใช้ `A1`, `A2`, `B`; ข้อมูลใหม่อาจใช้ `1.1`, `1.2`, `2`
- เก็บและแสดงค่าที่บันทึกจริง ห้าม migrate ชื่อแผนเก่าย้อนหลัง
- filter สามารถรวมกลุ่ม `A1/1.1`, `A2/1.2`, `B/2`
- milestone matching ต้องใช้ชื่อแผนตรงตัว ห้ามดึง milestone ของ `A1` มาใช้กับ `1.1` อัตโนมัติ
- เมื่อเริ่มใช้แผนใหม่ Admin ต้องสร้าง milestone set ของแผนใหม่นั้นก่อน ปีถัดไปจึงคัดลอกต่อจาก set ชื่อเดียวกัน

### 9.2 ระยะเวลาศึกษาและการขยาย

- ปริญญาโททุกแผน: 4 ปี
- ปริญญาเอก `1.1`/`2.1`: 5 ปี; `2.2`: 7 ปี
- วันสิ้นสุดระยะปกติยังไม่อนุญาตให้ขยาย; เริ่มได้วันถัดไป
- ขยายได้สูงสุดสองรอบ รอบละ 4 เดือนปฏิทิน
- วันสิ้นสุดรอบยังอยู่ในรอบเดิม; รอบต่อไปเริ่มได้วันถัดไป
- `Completed` และ `Approved` ถือว่า milestone เสร็จ; สถานะอื่นหรือไม่มี progress record ถือว่ายังไม่เสร็จ
- ถ้าไม่มี milestone template ที่ตรงกับปีเข้า/ระดับ/แผน ให้ห้ามขยายและแจ้งว่าไม่ได้ตั้งค่า milestone
- scheduler ทำงานหลังเที่ยงคืนเวลาไทยเพื่อเปลี่ยนเป็น `Dismissed` เมื่อรอบ 2 สิ้นสุดและยังไม่จบ
- graduation workflow ต้องตั้ง `student_status = 'Graduate'` เพื่อไม่ให้ scheduler เปลี่ยนเป็นพ้นสภาพ

## 10. การเพิ่ม feature ใหม่ควรเริ่มตรงไหน

1. เพิ่มหรือแก้ type ใน `frontend/src/types` หาก response shape เปลี่ยน
2. เพิ่ม frontend API wrapper ใน `frontend/src/services` ไม่เรียก `fetch` ตรงจาก view เว้นแต่เป็น auth bootstrap ที่ออกแบบไว้แล้ว
3. ผูก UI ใน view/component และเพิ่ม translation ทั้ง `lang/th.ts` กับ `lang/en.ts`
4. เพิ่ม route ที่ `backend/src/routes`
5. ทำ HTTP validation/response ที่ controller
6. ทำ business rule, transaction และ SQL ที่ service
7. หาก schema เปลี่ยน ให้แก้ทั้ง `database/schema.sql` สำหรับฐานใหม่และเพิ่ม migration สำหรับฐานเดิม
8. เพิ่ม unit/integration/E2E test ตามระดับความเสี่ยง
9. รัน backend tests, frontend type-check, build, lint และ migration ใน environment ทดสอบ

## 11. Commands สำหรับพัฒนาและตรวจสอบ

```bash
# Backend
cd backend
npm run dev
npm test
npm run db:migrate
npm run db:audit

# Frontend
cd frontend
npm run dev
npm run type-check
npm run test:unit
npm run build
npm run lint
npm run test:e2e

# Full stack
docker compose up --build
```

## 12. Checklist ก่อนส่งมอบหรือ deploy

- ตรวจ `.env` และ origin/domain โดยไม่ commit secret
- รัน migrations ก่อนเปิด backend เวอร์ชันใหม่
- ตรวจว่า Nginx protected upload routes ตรงกับ URL ที่บันทึกในฐานข้อมูล
- ตรวจ role guard ทั้ง frontend และ backend; frontend guard ไม่ใช่ security boundary
- ทดสอบ import ด้วยไฟล์จริงทั้งชื่อแผนเก่าและใหม่
- ทดสอบ milestone set ของทุกปีเข้า/ระดับ/แผนที่มีนักศึกษา
- ทดสอบวันก่อน/ตรง/หลัง boundary ของระยะปกติและรอบขยาย
- ตรวจ scheduler log หลัง restart/deploy
- สำรองฐานข้อมูลและ upload directories ก่อน migration ที่แก้ข้อมูลย้อนหลัง
- ห้ามลบ advisor, milestone หรือ upload ที่ยังถูก foreign key/record อ้างอิง

## 13. จุดเริ่มอ่านโค้ดสำหรับผู้รับช่วง

ลำดับที่แนะนำ:

1. `README.md` และ `DEPLOYMENT.md`
2. `frontend/src/router/index.ts` เพื่อเข้าใจหน้าทั้งหมด
3. view ที่ต้องแก้ แล้วตาม import ไป frontend service
4. route ชื่อเดียวกันใน `backend/src/routes`
5. controller ที่ route ผูกไว้
6. service functions ที่ controller import
7. `backend/database/schema.sql` และ migration ที่เกี่ยวข้อง
8. tests ของ feature นั้นก่อนแก้ behavior

เอกสารนี้อ้างอิงโครงสร้างจริง ณ วันที่ระบุด้านบน หากเพิ่ม route, service, table หรือเปลี่ยน workflow ควรปรับทั้งตาราง mapping และ checklist ในเอกสารนี้พร้อมกับ pull request เดียวกัน
