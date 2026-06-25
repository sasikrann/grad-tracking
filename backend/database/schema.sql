-- ไฟล์นี้เป็น schema ข้อมูลเริ่มต้นของฐานข้อมูล PostgreSQL
-- ใช้สร้างตารางและชนิดข้อมูลที่จำเป็นสำหรับระบบ Thesis Progress Tracking 
CREATE TYPE user_role AS ENUM (
  'student',
  'advisor',
  'admin'
);

CREATE TYPE degree_level AS ENUM (
  'Master',
  'Doctoral'
);

CREATE TYPE milestone_status AS ENUM (
  'In Progress',
  'Completed',
  'Approved',
  'Missing'
);

CREATE TYPE target_audience AS ENUM (
  'All Students',
  'Master Students',
  'Doctoral Students'
);

CREATE TYPE import_type AS ENUM (
  'student',
  'advisor'
);

CREATE TABLE users (
  user_id UUID PRIMARY KEY,
  email VARCHAR UNIQUE NOT NULL,
  full_name VARCHAR NOT NULL,
  role user_role NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE advisors (
  advisor_id VARCHAR PRIMARY KEY,
  user_id UUID UNIQUE REFERENCES users(user_id),
  full_name VARCHAR NOT NULL,
  email VARCHAR UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE students (
  student_id VARCHAR PRIMARY KEY,
  user_id UUID UNIQUE REFERENCES users(user_id),
  full_name VARCHAR NOT NULL,
  program VARCHAR NOT NULL,
  degree_level degree_level NOT NULL,
  enrollment_academic_year INT NOT NULL,
  semester VARCHAR NOT NULL,
  expected_graduation_year INT NOT NULL,
  advisor_id VARCHAR REFERENCES advisors(advisor_id),
  advisor_evidence_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE milestone_templates (
  milestone_id UUID PRIMARY KEY,
  degree_level degree_level NOT NULL,
  title VARCHAR NOT NULL,
  description TEXT,
  sequence_order INT NOT NULL,
  open_date DATE NOT NULL,
  deadline DATE NOT NULL,
  first_reminder_date DATE,
  second_reminder_date DATE,
  is_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE student_milestones (
  student_milestone_id UUID PRIMARY KEY,
  student_id VARCHAR REFERENCES students(student_id),
  milestone_id UUID REFERENCES milestone_templates(milestone_id),
  status milestone_status NOT NULL,
  evidence_url TEXT,
  advisor_comment TEXT,
  submitted_at TIMESTAMP,
  reviewed_at TIMESTAMP,
  reviewed_by VARCHAR REFERENCES advisors(advisor_id),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE notifications (
  notification_id UUID PRIMARY KEY,
  title VARCHAR NOT NULL,
  message TEXT NOT NULL,
  attachment_url TEXT,
  target_audience target_audience NOT NULL,
  created_by UUID REFERENCES users(user_id),
  created_at TIMESTAMP DEFAULT NOW(),
  sent_at TIMESTAMP
);

CREATE TABLE import_logs (
  import_id UUID PRIMARY KEY,
  imported_by UUID REFERENCES users(user_id),
  import_type import_type NOT NULL,
  file_name VARCHAR NOT NULL,
  total_records INT DEFAULT 0,
  success_records INT DEFAULT 0,
  failed_records INT DEFAULT 0,
  error_message TEXT,
  imported_at TIMESTAMP DEFAULT NOW()
);