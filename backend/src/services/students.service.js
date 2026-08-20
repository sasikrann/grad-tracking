import { randomUUID } from 'node:crypto'

import pool from '../config/database.js'
import { resolveAdvisorReference } from './advisors.service.js'
import { ensureAcademicYearMilestoneTemplates } from './academic-year-milestones.service.js'
import { ensureMilestoneSchema } from './milestones.service.js'

let studentSchemaReady
async function ensureStudentSchema() {
  studentSchemaReady ??= pool.query(`
    ALTER TABLE students ADD COLUMN IF NOT EXISTS education_plan VARCHAR;
    ALTER TABLE students ADD COLUMN IF NOT EXISTS school_name VARCHAR;
    ALTER TABLE students ADD COLUMN IF NOT EXISTS graduation_semester VARCHAR;
    ALTER TABLE students ADD COLUMN IF NOT EXISTS graduation_academic_year INT;
    ALTER TABLE students ADD COLUMN IF NOT EXISTS student_status VARCHAR NOT NULL DEFAULT 'Normal';
    ALTER TABLE students ADD COLUMN IF NOT EXISTS study_extension_granted BOOLEAN NOT NULL DEFAULT FALSE;
    UPDATE students
    SET student_status = 'Graduate'
    WHERE graduation_semester IS NOT NULL
      AND graduation_academic_year IS NOT NULL;
    ALTER TABLE students DROP CONSTRAINT IF EXISTS students_student_status_check;
    ALTER TABLE students ADD CONSTRAINT students_student_status_check
      CHECK (student_status IN ('Normal', 'Graduate'));
    ALTER TABLE students DROP CONSTRAINT IF EXISTS students_graduation_semester_check;
    ALTER TABLE students ADD CONSTRAINT students_graduation_semester_check
      CHECK (graduation_semester IN ('1', '2'));
    CREATE TABLE IF NOT EXISTS student_co_advisors (
      student_id VARCHAR NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
      advisor_id VARCHAR NOT NULL REFERENCES advisors(advisor_id) ON DELETE CASCADE,
      position SMALLINT NOT NULL CHECK (position BETWEEN 1 AND 2),
      PRIMARY KEY (student_id, position),
      UNIQUE (student_id, advisor_id)
    );
  `)
  await studentSchemaReady
}

const studentDetailColumns = `
  s.student_id AS "studentId",
  s.user_id AS "userId",
  u.email,
  s.full_name AS "fullName",
  s.school_name AS "schoolName",
  s.program,
  s.education_plan AS "educationPlan",
  s.degree_level AS "degreeLevel",
  s.enrollment_academic_year AS "enrollmentAcademicYear",
  s.semester,
  s.expected_graduation_year AS "expectedGraduationYear",
  s.graduation_semester AS "graduationSemester",
  s.graduation_academic_year AS "graduationAcademicYear",
  s.student_status AS "studentStatus",
  s.study_extension_granted AS "studyExtensionGranted",
  CASE
    WHEN s.student_status = 'Graduate' THEN 'Graduate'
    WHEN s.study_extension_granted THEN 'Extended'
    WHEN EXTRACT(YEAR FROM CURRENT_DATE)::INT > s.enrollment_academic_year + 2 THEN 'Overdue'
    ELSE 'On-track'
  END AS "academicStatus",
  s.advisor_id AS "advisorId",
  a.full_name AS "advisorName",
  a.email AS "advisorEmail",
  COALESCE((
    SELECT json_agg(json_build_object(
      'advisorId', ca.advisor_id,
      'fullName', ca.full_name,
      'email', ca.email
    ) ORDER BY sca.position)
    FROM student_co_advisors sca
    JOIN advisors ca ON ca.advisor_id = sca.advisor_id
    WHERE sca.student_id = s.student_id
  ), '[]'::json) AS "coAdvisors",
  s.advisor_evidence_url AS "advisorEvidenceUrl",
  s.created_at AS "createdAt",
  s.updated_at AS "updatedAt"
`
function normalizeComparableValue(value) {
  return value === null || value === undefined
    ? ''
    : String(value).normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase()
}

function studentRecordsMatch(left, right) {
  return [
    'studentId',
    'fullName',
    'schoolName',
    'email',
    'program',
    'educationPlan',
    'degreeLevel',
    'enrollmentAcademicYear',
    'semester',
    'expectedGraduationYear',
    'studentStatus',
    'graduationSemester',
    'graduationAcademicYear',
  ].every((field) => normalizeComparableValue(left[field]) === normalizeComparableValue(right[field]))
}

async function findStudents({ advisorId, viewerAdvisorId, pagination } = {}) {
  await ensureStudentSchema()
  await ensureMilestoneSchema()
  const values = []
  let advisorFilter = ''
  if (advisorId) {
    values.push(advisorId)
    advisorFilter = `WHERE s.advisor_id = $${values.length}`
  }
  if (viewerAdvisorId) values.push(viewerAdvisorId)
  const viewerAdvisorParameter = viewerAdvisorId ? `$${values.length}` : 'NULL'

  const outerFilters = []
  if (pagination?.search) {
    values.push(`%${pagination.search}%`)
    outerFilters.push(`(LOWER("fullName") LIKE LOWER($${values.length}) OR "studentId" LIKE $${values.length})`)
  }
  const filterMappings = [
    ['semester', 'semester'],
    ['year', 'year'],
    ['degree', 'degreeLevel'],
    ['plan', 'educationPlan'],
    ['status', 'status'],
  ]
  for (const [inputKey, column] of filterMappings) {
    const value = pagination?.[inputKey]
    if (value && value !== 'all') {
      values.push(value)
      outerFilters.push(`"${column}"::text = $${values.length}`)
    }
  }
  const outerWhere = outerFilters.length ? `WHERE ${outerFilters.join(' AND ')}` : ''
  const page = Math.max(1, Number(pagination?.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(pagination?.limit) || 10))
  if (pagination) {
    values.push(limit, (page - 1) * limit)
  }
  const paginationClause = pagination
    ? `LIMIT $${values.length - 1} OFFSET $${values.length}`
    : ''
  const paginationSelect = pagination
    ? `*,
        COUNT(*) OVER ()::INT AS "totalRecords",
        COUNT(*) FILTER (WHERE status = 'On-track') OVER ()::INT AS "onTrackCount",
        COUNT(*) FILTER (WHERE status = 'Overdue') OVER ()::INT AS "overdueCount",
        COUNT(*) FILTER (WHERE status = 'Graduate') OVER ()::INT AS "graduateCount",
        (SELECT json_build_object(
          'semesters', ARRAY_AGG(DISTINCT semester),
          'years', ARRAY_AGG(DISTINCT year),
          'degrees', ARRAY_AGG(DISTINCT "degreeLevel"),
          'plans', ARRAY_AGG(DISTINCT "educationPlan") FILTER (WHERE "educationPlan" IS NOT NULL),
          'statuses', ARRAY_AGG(DISTINCT status)
        ) FROM students_with_status) AS "filterOptions"`
    : '*'

  const result = await pool.query(
    `
      WITH students_with_status AS (
      SELECT
        s.student_id AS "studentId",
        s.full_name AS "fullName",
        s.school_name AS "schoolName",
        s.program,
        s.education_plan AS "educationPlan",
        s.degree_level AS "degreeLevel",
        s.enrollment_academic_year AS "enrollmentAcademicYear",
        s.semester,
        s.enrollment_academic_year AS "year",
        s.expected_graduation_year AS "expectedGraduationYear",
        s.study_extension_granted AS "studyExtensionGranted",
        s.advisor_id AS "advisorId",
        a.full_name AS "advisorName",
        EXISTS (
          SELECT 1
          FROM student_co_advisors sca
          WHERE sca.student_id = s.student_id
            AND sca.advisor_id = ${viewerAdvisorParameter}
        ) AS "isCoAdvised",
        CASE
          WHEN s.student_status = 'Graduate' THEN 100
          ELSE COALESCE(
            ROUND(
              100.0 * COUNT(sm.student_milestone_id)
                FILTER (WHERE sm.status IN ('Completed', 'Approved'))
              / NULLIF(COUNT(mt.milestone_id), 0)
            ),
            0
          )::INT
        END AS progress,
        CASE
          WHEN s.student_status = 'Graduate'
            OR (s.graduation_semester IS NOT NULL
              AND s.graduation_academic_year IS NOT NULL) THEN 'Graduate'
          WHEN s.study_extension_granted THEN 'Extended'
          WHEN EXTRACT(YEAR FROM CURRENT_DATE)::INT >
            s.enrollment_academic_year + CASE
              WHEN s.study_extension_granted AND s.degree_level = 'Master' THEN 4
              WHEN s.study_extension_granted AND s.degree_level = 'Doctoral' THEN 5
              ELSE 2
            END THEN 'Overdue'
          ELSE 'On-track'
        END AS status
      FROM students s
      LEFT JOIN advisors a ON a.advisor_id = s.advisor_id
      LEFT JOIN milestone_templates mt
        ON (mt.degree_level = s.degree_level::text OR mt.degree_level = 'All')
        AND mt.academic_year = s.enrollment_academic_year
        AND (mt.plans @> ARRAY['All']::VARCHAR[] OR (s.education_plan IS NOT NULL AND s.education_plan = ANY(mt.plans)))
        AND mt.is_enabled = TRUE
      LEFT JOIN student_milestones sm
        ON sm.student_id = s.student_id
        AND sm.milestone_id = mt.milestone_id
      ${advisorFilter}
      GROUP BY
        s.student_id,
        s.full_name,
        s.school_name,
        s.program,
        s.education_plan,
        s.degree_level,
        s.enrollment_academic_year,
        s.semester,
        s.expected_graduation_year,
        s.graduation_semester,
        s.graduation_academic_year,
        s.student_status,
        s.study_extension_granted,
        s.advisor_id,
        a.full_name
      )
      SELECT ${paginationSelect}
      FROM students_with_status
      ${outerWhere}
      ORDER BY year DESC, "studentId"
      ${paginationClause}
    `,
    values,
  )

  if (!pagination) return result.rows

  const summary = result.rows[0] ?? {}
  const totalRecords = Number(summary.totalRecords ?? 0)
  return {
    students: result.rows.map(({ totalRecords: _total, onTrackCount: _onTrack, overdueCount: _overdue, graduateCount: _graduate, filterOptions: _filters, ...student }) => student),
    pagination: { page, limit, totalRecords, totalPages: Math.ceil(totalRecords / limit) },
    statistics: {
      total: totalRecords,
      onTrack: Number(summary.onTrackCount ?? 0),
      overdue: Number(summary.overdueCount ?? 0),
      graduate: Number(summary.graduateCount ?? 0),
    },
    filterOptions: summary.filterOptions ?? { semesters: [], years: [], degrees: [], plans: [], statuses: [] },
  }
}

export function findAllStudents({ viewerAdvisorId } = {}) {
  return findStudents({ viewerAdvisorId })
}

export function findStudentsPage(pagination) {
  return findStudents({ pagination })
}

export function findStudentsByAdvisorId(advisorId) {
  return findStudents({ advisorId })
}

export async function grantStudentStudyExtension(studentId) {
  await ensureStudentSchema()
  const result = await pool.query(
    `
      UPDATE students
      SET study_extension_granted = TRUE, updated_at = NOW()
      WHERE student_id = $1
        AND study_extension_granted = FALSE
        AND graduation_semester IS NULL
        AND graduation_academic_year IS NULL
        AND EXTRACT(YEAR FROM CURRENT_DATE)::INT > enrollment_academic_year + 2
        AND EXTRACT(YEAR FROM CURRENT_DATE)::INT <= enrollment_academic_year + CASE
          WHEN degree_level = 'Master' THEN 4
          WHEN degree_level = 'Doctoral' THEN 5
        END
      RETURNING student_id AS "studentId", study_extension_granted AS "studyExtensionGranted"
    `,
    [studentId],
  )
  return result.rows[0] || null
}

export async function findStudentById(studentId) {
  await ensureStudentSchema()
  const result = await pool.query(
    `
      SELECT ${studentDetailColumns}
      FROM students s
      LEFT JOIN users u ON u.user_id = s.user_id
      LEFT JOIN advisors a ON a.advisor_id = s.advisor_id
      WHERE s.student_id = $1
    `,
    [studentId],
  )

  return result.rows[0] || null
}

async function upsertStudentWithClient(client, input) {
  await ensureStudentSchema()
  const advisorId = await resolveAdvisorReference(client, input)

  const existingStudent = await client.query(
    'SELECT user_id FROM students WHERE student_id = $1',
    [input.studentId],
  )
  const existingUser = input.email
    ? await client.query('SELECT user_id, role FROM users WHERE email = $1', [input.email])
    : { rows: [] }
  const studentUserId = existingStudent.rows[0]?.user_id
  const emailUserId = existingUser.rows[0]?.user_id

  if (existingUser.rows[0] && existingUser.rows[0].role !== 'student') {
    const error = new Error(`Email ${input.email} belongs to a ${existingUser.rows[0].role} account`)
    error.statusCode = 409
    throw error
  }

  if (studentUserId && emailUserId && studentUserId !== emailUserId) {
    const error = new Error(`Email ${input.email} belongs to another user`)
    error.statusCode = 409
    throw error
  }

  const userId = input.email ? studentUserId || emailUserId || randomUUID() : studentUserId || null

  if (userId) {
    const linkedStudent = await client.query(
      'SELECT student_id FROM students WHERE user_id = $1 AND student_id <> $2',
      [userId, input.studentId],
    )

    if (linkedStudent.rowCount) {
      const error = new Error(
        input.email
          ? `Email ${input.email} is already assigned to student ${linkedStudent.rows[0].student_id}`
          : `User account is already assigned to student ${linkedStudent.rows[0].student_id}`,
      )
      error.statusCode = 409
      throw error
    }
  }

  if (input.email) {
    await client.query(
      `
        INSERT INTO users (user_id, email, full_name, role)
        VALUES ($1, $2, $3, 'student')
        ON CONFLICT (user_id) DO UPDATE
        SET email = EXCLUDED.email, full_name = EXCLUDED.full_name, role = 'student'
      `,
      [userId, input.email, input.fullName],
    )
  }

  try {
    await client.query(
      `
        INSERT INTO students (
          student_id, user_id, full_name, school_name, program, degree_level,
          enrollment_academic_year, semester, expected_graduation_year, advisor_id, education_plan,
          student_status, graduation_semester, graduation_academic_year
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (student_id) DO UPDATE SET
          user_id = COALESCE(EXCLUDED.user_id, students.user_id),
          full_name = EXCLUDED.full_name,
          school_name = EXCLUDED.school_name,
          program = EXCLUDED.program,
          degree_level = EXCLUDED.degree_level,
          enrollment_academic_year = EXCLUDED.enrollment_academic_year,
          semester = EXCLUDED.semester,
          expected_graduation_year = EXCLUDED.expected_graduation_year,
          advisor_id = EXCLUDED.advisor_id,
          education_plan = EXCLUDED.education_plan,
          student_status = CASE
            WHEN students.student_status = 'Graduate' THEN 'Graduate'
            ELSE EXCLUDED.student_status
          END,
          graduation_semester = CASE
            WHEN students.student_status = 'Graduate' THEN students.graduation_semester
            ELSE EXCLUDED.graduation_semester
          END,
          graduation_academic_year = CASE
            WHEN students.student_status = 'Graduate' THEN students.graduation_academic_year
            ELSE EXCLUDED.graduation_academic_year
          END,
          updated_at = NOW()
      `,
      [
        input.studentId,
        userId,
        input.fullName,
        input.schoolName,
        input.program,
        input.degreeLevel,
        input.enrollmentAcademicYear,
        input.semester,
        input.expectedGraduationYear,
        advisorId,
        input.educationPlan,
        input.studentStatus,
        input.graduationSemester,
        input.graduationAcademicYear,
      ],
    )
  } catch (error) {
    if (error.code === '23505' && error.constraint === 'students_user_id_key') {
      const conflict = new Error(
        input.email
          ? `Email ${input.email} is already assigned to another student`
          : 'This user account is already assigned to another student',
      )
      conflict.statusCode = 409
      throw conflict
    }
    throw error
  }

  return input.studentId
}

async function approveAllImportedGraduateMilestones(client, student) {
  const templates = await client.query(
    `
      SELECT mt.milestone_id AS "milestoneId"
      FROM milestone_templates mt
      WHERE mt.academic_year = $1
        AND (mt.degree_level = $2 OR mt.degree_level = 'All')
        AND (
          mt.plans @> ARRAY['All']::VARCHAR[]
          OR ($3::VARCHAR IS NOT NULL AND $3 = ANY(mt.plans))
        )
        AND mt.is_enabled = TRUE
    `,
    [student.enrollmentAcademicYear, student.degreeLevel, student.educationPlan],
  )

  for (const template of templates.rows) {
    await client.query(
      `
        INSERT INTO student_milestones (
          student_milestone_id, student_id, milestone_id, status,
          submitted_at, reviewed_at, reviewed_by, updated_at
        )
        VALUES ($1, $2, $3, 'Approved', NOW(), NOW(), NULL, NOW())
        ON CONFLICT (student_id, milestone_id) DO UPDATE SET
          status = 'Approved',
          submitted_at = COALESCE(student_milestones.submitted_at, NOW()),
          reviewed_at = NOW(),
          reviewed_by = NULL,
          updated_at = NOW()
      `,
      [randomUUID(), student.studentId, template.milestoneId],
    )
  }
}

export async function findStudentByUserId(userId) {
  await ensureStudentSchema()
  const result = await pool.query(
    `
      SELECT ${studentDetailColumns}
      FROM students s
      LEFT JOIN users u ON u.user_id = s.user_id
      LEFT JOIN advisors a ON a.advisor_id = s.advisor_id
      WHERE s.user_id = $1
    `,
    [userId],
  )

  return result.rows[0] || null
}

export async function canStudentSubmitMilestones(userId) {
  await ensureStudentSchema()
  const result = await pool.query(
    `
      SELECT (
        student_status <> 'Graduate'
        AND (
          study_extension_granted = TRUE
          OR EXTRACT(YEAR FROM CURRENT_DATE)::INT <= enrollment_academic_year + 2
        )
      ) AS "canSubmit"
      FROM students
      WHERE user_id = $1
    `,
    [userId],
  )
  return result.rows[0]?.canSubmit === true
}

export async function updateStudentAdvisorByUserId(
  userId,
  { advisorId, advisorEmail, advisorName, advisorEvidenceUrl },
) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const resolvedAdvisorId = await resolveAdvisorReference(client, {
      advisorId,
      advisorEmail,
      advisorName,
    })

    if (!resolvedAdvisorId) {
      const error = new Error('advisorId, advisorEmail, or advisorName is required')
      error.statusCode = 400
      throw error
    }

    const result = await client.query(
      `
        UPDATE students
        SET
          advisor_id = $2,
          advisor_evidence_url = COALESCE($3, advisor_evidence_url),
          updated_at = NOW()
        WHERE user_id = $1
        RETURNING student_id
      `,
      [userId, resolvedAdvisorId, advisorEvidenceUrl || null],
    )

    if (!result.rowCount) {
      await client.query('ROLLBACK')
      return null
    }

    await client.query('COMMIT')
    return findStudentByUserId(userId)
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function appointStudentAdvisorsByUserId(userId, milestoneId, advisorId, coAdvisorIds = []) {
  await ensureStudentSchema()
  await ensureMilestoneSchema()

  const normalizedCoAdvisorIds = coAdvisorIds.map((value) => String(value).trim()).filter(Boolean)
  if (!advisorId) {
    const error = new Error('Please select an advisor')
    error.statusCode = 400
    throw error
  }
  if (normalizedCoAdvisorIds.length > 2) {
    const error = new Error('You can select up to 2 co-advisors')
    error.statusCode = 400
    throw error
  }
  const selectedIds = [String(advisorId).trim(), ...normalizedCoAdvisorIds]
  if (new Set(selectedIds).size !== selectedIds.length) {
    const error = new Error('Advisor and co-advisors must be different')
    error.statusCode = 400
    throw error
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const advisors = await client.query(
      'SELECT advisor_id FROM advisors WHERE advisor_id = ANY($1::varchar[])',
      [selectedIds],
    )
    if (advisors.rowCount !== selectedIds.length) {
      const error = new Error('One or more selected advisors were not found')
      error.statusCode = 400
      throw error
    }

    const student = await client.query(
      `SELECT student_id FROM students WHERE user_id = $1 FOR UPDATE`,
      [userId],
    )
    if (!student.rowCount) {
      await client.query('ROLLBACK')
      return null
    }

    const eligibleMilestone = await client.query(
      `
        SELECT mt.milestone_id
        FROM students s
        JOIN milestone_templates mt
          ON mt.milestone_id = $2
          AND mt.academic_year = s.enrollment_academic_year
          AND mt.degree_level = s.degree_level::text
          AND s.education_plan = ANY(mt.plans)
          AND mt.is_enabled = TRUE
          AND mt.default_template_key LIKE '%advisor-appointment'
        WHERE s.user_id = $1
      `,
      [userId, milestoneId],
    )
    if (!eligibleMilestone.rowCount) {
      const error = new Error('Advisor appointment milestone not found')
      error.statusCode = 404
      throw error
    }

    const studentId = student.rows[0].student_id
    await client.query(
      'UPDATE students SET advisor_id = $2, advisor_evidence_url = NULL, updated_at = NOW() WHERE student_id = $1',
      [studentId, selectedIds[0]],
    )
    await client.query('DELETE FROM student_co_advisors WHERE student_id = $1', [studentId])
    for (const [index, coAdvisorId] of normalizedCoAdvisorIds.entries()) {
      await client.query(
        'INSERT INTO student_co_advisors (student_id, advisor_id, position) VALUES ($1, $2, $3)',
        [studentId, coAdvisorId, index + 1],
      )
    }
    await client.query(
      `
        INSERT INTO student_milestones (
          student_milestone_id, student_id, milestone_id, status, submitted_at, updated_at
        ) VALUES ($1, $2, $3, 'Completed', NOW(), NOW())
        ON CONFLICT (student_id, milestone_id) DO UPDATE SET
          status = 'Completed'::milestone_status,
          evidence_url = NULL,
          advisor_comment = NULL,
          submitted_at = NOW(),
          reviewed_at = NULL,
          reviewed_by = NULL,
          updated_at = NOW()
      `,
      [randomUUID(), studentId, milestoneId],
    )
    await client.query('COMMIT')
    return findStudentByUserId(userId)
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function submitStudentGraduationByUserId(userId, milestoneId, semester, academicYear) {
  await ensureStudentSchema()
  await ensureMilestoneSchema()
  const normalizedSemester = String(semester ?? '').trim()
  const normalizedYear = Number(academicYear)
  if (!['1', '2'].includes(normalizedSemester)) {
    const error = new Error('Semester must be 1 or 2')
    error.statusCode = 400
    throw error
  }
  if (!Number.isInteger(normalizedYear) || normalizedYear < 1900 || normalizedYear > 3000) {
    const error = new Error('Please enter a valid 4-digit academic year')
    error.statusCode = 400
    throw error
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await client.query(
      `
        SELECT s.student_id
        FROM students s
        JOIN milestone_templates mt
          ON mt.milestone_id = $2
          AND mt.academic_year = s.enrollment_academic_year
          AND mt.degree_level = s.degree_level::text
          AND s.education_plan = ANY(mt.plans)
          AND mt.is_enabled = TRUE
          AND mt.default_template_key LIKE '%graduation'
        WHERE s.user_id = $1
        FOR UPDATE OF s
      `,
      [userId, milestoneId],
    )
    if (!result.rowCount) {
      const error = new Error('Graduation milestone not found')
      error.statusCode = 404
      throw error
    }

    const studentId = result.rows[0].student_id
    await client.query(
      `UPDATE students
       SET graduation_semester = $2, graduation_academic_year = $3, updated_at = NOW()
       WHERE student_id = $1`,
      [studentId, normalizedSemester, normalizedYear],
    )
    await client.query(
      `
        INSERT INTO student_milestones (
          student_milestone_id, student_id, milestone_id, status, submitted_at, updated_at
        ) VALUES ($1, $2, $3, 'Completed', NOW(), NOW())
        ON CONFLICT (student_id, milestone_id) DO UPDATE SET
          status = 'Completed'::milestone_status,
          evidence_url = NULL,
          advisor_comment = NULL,
          submitted_at = NOW(),
          reviewed_at = NULL,
          reviewed_by = NULL,
          updated_at = NOW()
      `,
      [randomUUID(), studentId, milestoneId],
    )
    await client.query('COMMIT')
    return findStudentByUserId(userId)
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function insertStudent(input) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const existing = await client.query('SELECT 1 FROM students WHERE student_id = $1', [input.studentId])
    if (existing.rowCount) {
      const error = new Error('Student ID is already in use')
      error.statusCode = 409
      throw error
    }
    await upsertStudentWithClient(client, input)
    await client.query('COMMIT')
    return findStudentById(input.studentId)
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function replaceStudent(studentId, input) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const existing = await client.query('SELECT 1 FROM students WHERE student_id = $1', [studentId])
    if (!existing.rowCount) {
      await client.query('ROLLBACK')
      return null
    }
    await upsertStudentWithClient(client, { ...input, studentId })
    await client.query('COMMIT')
    return findStudentById(studentId)
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function removeStudent(studentId) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await client.query(
      'SELECT user_id FROM students WHERE student_id = $1 FOR UPDATE',
      [studentId],
    )
    if (!result.rowCount) {
      await client.query('ROLLBACK')
      return false
    }
    await client.query('DELETE FROM student_milestones WHERE student_id = $1', [studentId])
    await client.query('DELETE FROM students WHERE student_id = $1', [studentId])
    if (result.rows[0].user_id) {
      await client.query('DELETE FROM users WHERE user_id = $1', [result.rows[0].user_id])
    }
    await client.query('COMMIT')
    return true
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function findStudentsForExport({ studentIds } = {}) {
  await ensureStudentSchema()
  const ids = Array.isArray(studentIds) ? studentIds : []
  if (!ids.length) return []

  const result = await pool.query(`
    SELECT
      ${studentDetailColumns},
      COALESCE(
        (
          SELECT JSON_AGG(
            JSON_BUILD_OBJECT(
              'title', mt.title,
              'status', COALESCE(
                sm.status,
                CASE
                  WHEN mt.deadline < CURRENT_DATE THEN 'Missing'::milestone_status
                  ELSE 'In Progress'::milestone_status
                END
              ),
              'submittedAt', sm.submitted_at,
              'reviewedAt', sm.reviewed_at
            )
            ORDER BY
              CASE WHEN mt.semester = 'all' THEN 0 ELSE mt.semester::int END,
              mt.sequence_order,
              mt.created_at
          )
          FROM milestone_templates mt
          LEFT JOIN student_milestones sm
            ON sm.student_id = s.student_id
            AND sm.milestone_id = mt.milestone_id
          WHERE (mt.degree_level = s.degree_level::text OR mt.degree_level = 'All')
            AND mt.academic_year = s.enrollment_academic_year
            AND (mt.plans @> ARRAY['All']::VARCHAR[] OR (s.education_plan IS NOT NULL AND s.education_plan = ANY(mt.plans)))
            AND mt.is_enabled = TRUE
        ),
        '[]'::json
      ) AS "milestoneReport"
    FROM students s
    LEFT JOIN users u ON u.user_id = s.user_id
    LEFT JOIN advisors a ON a.advisor_id = s.advisor_id
    WHERE s.student_id = ANY($1::varchar[])
    ORDER BY array_position($1::varchar[], s.student_id)
  `, [ids])
  return result.rows
}

export async function importStudents(records, { fileName, importedBy } = {}) {
  await ensureStudentSchema()
  await ensureMilestoneSchema()
  const client = await pool.connect()
  const importId = randomUUID()
  let successRecords = 0
  let updatedRecords = 0
  let unchangedRecords = 0
  const errors = []
  const importedAcademicYears = new Set()
  const unchangedStudentIds = new Set()
  const successfullyImportedStudentIds = new Set()

  try {
    await client.query('BEGIN')
    const existingStudents = await client.query(
      `SELECT ${studentDetailColumns}
       FROM students s
       LEFT JOIN users u ON u.user_id = s.user_id
       LEFT JOIN advisors a ON a.advisor_id = s.advisor_id
       WHERE s.student_id = ANY($1::varchar[])`,
      [records.map((record) => record.studentId)],
    )
    const existingById = new Map(
      existingStudents.rows.map((student) => [student.studentId, student]),
    )
    const mergedRecords = records.map((record) => {
      const existing = existingById.get(record.studentId)
      if (!existing) return record

      return {
        ...record,
        fullName: record.fullName || existing.fullName,
        educationPlan: record.educationPlan ?? existing.educationPlan,
        advisorId: record.advisorId || existing.advisorId,
        advisorName: record.advisorName || existing.advisorName,
        advisorEmail: record.advisorEmail || existing.advisorEmail,
        studentStatus: existing.studentStatus === 'Graduate' ? 'Graduate' : record.studentStatus,
        graduationSemester:
          existing.studentStatus === 'Graduate'
            ? existing.graduationSemester
            : record.graduationSemester,
        graduationAcademicYear:
          existing.studentStatus === 'Graduate'
            ? existing.graduationAcademicYear
            : record.graduationAcademicYear,
      }
    })
    const recordsToImport = mergedRecords.filter((record) => {
      const existing = existingById.get(record.studentId)
      if (!existing || !studentRecordsMatch(existing, record)) return true
      unchangedRecords += 1
      unchangedStudentIds.add(record.studentId)
      return false
    })

    if (!recordsToImport.length) {
      for (const academicYear of new Set(records.map(({ enrollmentAcademicYear }) => enrollmentAcademicYear))) {
        await ensureAcademicYearMilestoneTemplates(client, academicYear)
      }
      for (const record of mergedRecords.filter(({ studentStatus }) => studentStatus === 'Graduate')) {
        await approveAllImportedGraduateMilestones(client, record)
      }
      await client.query('COMMIT')
      return {
        importId: null,
        totalRecords: 0,
        successRecords: 0,
        createdRecords: 0,
        updatedRecords: 0,
        unchangedRecords,
        failedRecords: 0,
        errors: [],
      }
    }

    await client.query(
      `INSERT INTO import_logs
        (import_id, imported_by, import_type, file_name, total_records)
       VALUES ($1, $2, 'student', $3, $4)`,
      [importId, importedBy, fileName, recordsToImport.length],
    )

    for (const [index, record] of recordsToImport.entries()) {
      const savepoint = `student_row_${index}`
      await client.query(`SAVEPOINT ${savepoint}`)
      try {
        if (!record.fullName) {
          throw new Error('fullName is required')
        }
        await upsertStudentWithClient(client, record)
        importedAcademicYears.add(record.enrollmentAcademicYear)
        successfullyImportedStudentIds.add(record.studentId)
        successRecords += 1
        if (existingById.has(record.studentId)) updatedRecords += 1
        await client.query(`RELEASE SAVEPOINT ${savepoint}`)
      } catch (error) {
        await client.query(`ROLLBACK TO SAVEPOINT ${savepoint}`)
        errors.push(`Row ${index + 2}: ${error.message}`)
      }
    }

    const graduateRecordsToApprove = mergedRecords.filter(
      (record) =>
        record.studentStatus === 'Graduate' &&
        (unchangedStudentIds.has(record.studentId) || successfullyImportedStudentIds.has(record.studentId)),
    )
    const academicYearsToPrepare = new Set([
      ...importedAcademicYears,
      ...graduateRecordsToApprove.map(({ enrollmentAcademicYear }) => enrollmentAcademicYear),
    ])
    for (const academicYear of academicYearsToPrepare) {
      await ensureAcademicYearMilestoneTemplates(client, academicYear)
    }

    for (const record of graduateRecordsToApprove) {
      await approveAllImportedGraduateMilestones(client, record)
    }

    await client.query(
      `UPDATE import_logs SET
        success_records = $2,
        failed_records = $3,
        error_message = $4
       WHERE import_id = $1`,
      [importId, successRecords, errors.length, errors.length ? errors.join('\n') : null],
    )
    await client.query('COMMIT')

    return {
      importId,
      totalRecords: recordsToImport.length,
      successRecords,
      createdRecords: successRecords - updatedRecords,
      updatedRecords,
      unchangedRecords,
      failedRecords: errors.length,
      errors,
    }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
