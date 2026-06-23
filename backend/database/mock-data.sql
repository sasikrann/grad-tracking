BEGIN;

INSERT INTO users (user_id, email, full_name, role)
VALUES (
  '164f4d20-69a3-4c13-b9cd-1b05c94b9d00',
  'johndoe@lamduan.mfu.ac.th',
  'Dr. John Doe',
  'advisor'
)
ON CONFLICT (email) DO UPDATE
SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role;

INSERT INTO advisors (advisor_id, user_id, full_name, email)
SELECT
  'ADV001',
  user_id,
  full_name,
  email
FROM users
WHERE email = 'johndoe@lamduan.mfu.ac.th'
ON CONFLICT (advisor_id) DO UPDATE
SET
  user_id = EXCLUDED.user_id,
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email;

INSERT INTO students (
  student_id,
  full_name,
  program,
  degree_level,
  enrollment_academic_year,
  semester,
  expected_graduation_year,
  advisor_id
)
VALUES
  ('6631500001', 'Emily Chen',       'CE', 'Doctoral', 2023, '2', 2026, 'ADV001'),
  ('6631500002', 'James Anderson',   'CE', 'Doctoral', 2023, '2', 2026, 'ADV001'),
  ('6631500003', 'Michael Thompson', 'CE', 'Doctoral', 2023, '2', 2026, 'ADV001'),
  ('6631500004', 'Olivia Wilson',    'CE', 'Doctoral', 2023, '2', 2026, 'ADV001'),
  ('6631500005', 'Daniel Harris',    'CE', 'Doctoral', 2023, '2', 2026, 'ADV001'),
  ('6631500006', 'Sophia Martinez',  'CE', 'Doctoral', 2023, '1', 2026, 'ADV001'),
  ('6631500007', 'William Brown',    'CE', 'Doctoral', 2023, '1', 2026, 'ADV001'),
  ('6631500008', 'Charlotte Evans',  'CE', 'Doctoral', 2023, '1', 2026, 'ADV001')
ON CONFLICT (student_id) DO UPDATE
SET
  full_name = EXCLUDED.full_name,
  program = EXCLUDED.program,
  degree_level = EXCLUDED.degree_level,
  enrollment_academic_year = EXCLUDED.enrollment_academic_year,
  semester = EXCLUDED.semester,
  expected_graduation_year = EXCLUDED.expected_graduation_year,
  advisor_id = EXCLUDED.advisor_id,
  updated_at = NOW();

COMMIT;
