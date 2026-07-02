import { randomUUID } from 'node:crypto'

import pool from '../config/database.js'
import { resolveAdvisorReference } from './advisors.service.js'

const studentDetailColumns = `
  s.student_id AS "studentId",
  s.user_id AS "userId",
  u.email,
  s.full_name AS "fullName",
  s.program,
  s.degree_level AS "degreeLevel",
  s.enrollment_academic_year AS "enrollmentAcademicYear",
  s.semester,
  s.expected_graduation_year AS "expectedGraduationYear",
  s.advisor_id AS "advisorId",
  a.full_name AS "advisorName",
  a.email AS "advisorEmail",
  s.advisor_evidence_url AS "advisorEvidenceUrl",
  s.created_at AS "createdAt",
  s.updated_at AS "updatedAt"
`
const duplicateStudentIdMessage =
  'Some student IDs already exist. Please choose which student record to keep before importing.'
const unresolvedStudentConflictMessage =
  'Please choose one student record for each duplicated student ID.'

function studentConflictKey({ studentId }) {
  return String(studentId ?? '').trim()
}

function studentConflictOption(record, { optionId, source, rowNumber } = {}) {
  return {
    optionId,
    source,
    rowNumber,
    studentId: record.studentId,
    fullName: record.fullName,
    email: record.email || null,
    program: record.program,
    degreeLevel: record.degreeLevel,
    enrollmentAcademicYear: record.enrollmentAcademicYear,
    semester: record.semester,
    expectedGraduationYear: record.expectedGraduationYear,
    advisorId: record.advisorId || null,
    advisorName: record.advisorName || null,
    advisorEmail: record.advisorEmail || null,
  }
}

async function findStudentImportConflicts(client, records) {
  const groups = new Map()

  records.forEach((record, index) => {
    const key = studentConflictKey(record)
    const group = groups.get(key) ?? {
      key,
      studentId: record.studentId,
      fileRecords: [],
      existingStudents: [],
    }
    group.fileRecords.push(
      studentConflictOption(record, {
        optionId: `file:${index}`,
        source: 'file',
        rowNumber: index + 2,
      }),
    )
    groups.set(key, group)
  })

  for (const group of groups.values()) {
    const existing = await client.query(
      `
        SELECT ${studentDetailColumns}
        FROM students s
        LEFT JOIN users u ON u.user_id = s.user_id
        LEFT JOIN advisors a ON a.advisor_id = s.advisor_id
        WHERE s.student_id = $1
      `,
      [group.studentId],
    )
    group.existingStudents = existing.rows.map((student) =>
      studentConflictOption(student, {
        optionId: `existing:${student.studentId}`,
        source: 'existing',
      }),
    )
  }

  return Array.from(groups.values())
    .filter((group) => group.fileRecords.length > 1 || group.existingStudents.length > 0)
    .map((group) => ({
      key: group.key,
      studentId: group.studentId,
      options: [...group.existingStudents, ...group.fileRecords],
    }))
}

function applyStudentImportResolutions(records, conflicts, resolutions = {}) {
  const conflictByKey = new Map(conflicts.map((conflict) => [conflict.key, conflict]))
  const selectedFileRows = new Set()
  const skippedKeys = new Set()

  for (const conflict of conflicts) {
    const selectedOptionId = resolutions[conflict.key]
    const selectedOption = conflict.options.find((option) => option.optionId === selectedOptionId)

    if (!selectedOption) {
      const error = new Error(unresolvedStudentConflictMessage)
      error.statusCode = 409
      error.conflicts = conflicts
      throw error
    }

    if (selectedOption.source === 'file') {
      selectedFileRows.add(selectedOption.rowNumber)
    } else {
      skippedKeys.add(conflict.key)
    }
  }

  return records.filter((record, index) => {
    const key = studentConflictKey(record)
    if (!conflictByKey.has(key)) return true
    if (skippedKeys.has(key)) return false
    return selectedFileRows.has(index + 2)
  })
}

async function findStudents({ advisorId } = {}) {
  const values = advisorId ? [advisorId] : []
  const advisorFilter = advisorId ? 'WHERE s.advisor_id = $1' : ''

  const result = await pool.query(
    `
      SELECT
        s.student_id AS "studentId",
        s.full_name AS "fullName",
        s.program,
        s.degree_level AS "degreeLevel",
        s.enrollment_academic_year AS "enrollmentAcademicYear",
        s.semester,
        s.enrollment_academic_year AS "year",
        s.expected_graduation_year AS "expectedGraduationYear",
        s.advisor_id AS "advisorId",
        a.full_name AS "advisorName",
        COALESCE(
          ROUND(
            100.0 * COUNT(sm.student_milestone_id)
              FILTER (WHERE sm.status IN ('Completed', 'Approved'))
            / NULLIF(COUNT(mt.milestone_id), 0)
          ),
          0
        )::INT AS progress,
        CASE
          WHEN COUNT(mt.milestone_id) FILTER (
            WHERE mt.deadline < CURRENT_DATE
              AND COALESCE(sm.status, 'Missing') NOT IN ('Completed', 'Approved')
          ) > 0 THEN 'Overdue'
          WHEN EXTRACT(YEAR FROM CURRENT_DATE)::INT > s.expected_graduation_year
            AND COALESCE(
              ROUND(
                100.0 * COUNT(sm.student_milestone_id)
                  FILTER (WHERE sm.status IN ('Completed', 'Approved'))
                / NULLIF(COUNT(mt.milestone_id), 0)
              ),
              0
            )::INT < 100 THEN 'Overdue'
          ELSE 'On-track'
        END AS status
      FROM students s
      LEFT JOIN advisors a ON a.advisor_id = s.advisor_id
      LEFT JOIN milestone_templates mt
        ON mt.degree_level = s.degree_level
        AND mt.is_enabled = TRUE
      LEFT JOIN student_milestones sm
        ON sm.student_id = s.student_id
        AND sm.milestone_id = mt.milestone_id
      ${advisorFilter}
      GROUP BY
        s.student_id,
        s.full_name,
        s.program,
        s.degree_level,
        s.enrollment_academic_year,
        s.semester,
        s.expected_graduation_year,
        s.advisor_id,
        a.full_name
      ORDER BY s.student_id
    `,
    values,
  )

  return result.rows
}

export function findAllStudents() {
  return findStudents()
}

export function findStudentsByAdvisorId(advisorId) {
  return findStudents({ advisorId })
}

export async function findStudentById(studentId) {
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
          student_id, user_id, full_name, program, degree_level,
          enrollment_academic_year, semester, expected_graduation_year, advisor_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (student_id) DO UPDATE SET
          user_id = COALESCE(EXCLUDED.user_id, students.user_id),
          full_name = EXCLUDED.full_name,
          program = EXCLUDED.program,
          degree_level = EXCLUDED.degree_level,
          enrollment_academic_year = EXCLUDED.enrollment_academic_year,
          semester = EXCLUDED.semester,
          expected_graduation_year = EXCLUDED.expected_graduation_year,
          advisor_id = EXCLUDED.advisor_id,
          updated_at = NOW()
      `,
      [
        input.studentId,
        userId,
        input.fullName,
        input.program,
        input.degreeLevel,
        input.enrollmentAcademicYear,
        input.semester,
        input.expectedGraduationYear,
        advisorId,
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

export async function findStudentByUserId(userId) {
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

export async function findStudentsForExport({ enrollmentYear } = {}) {
  const values = enrollmentYear ? [enrollmentYear] : []
  const yearFilter = enrollmentYear ? 'WHERE s.enrollment_academic_year = $1' : ''

  const result = await pool.query(`
    SELECT ${studentDetailColumns}
    FROM students s
    LEFT JOIN users u ON u.user_id = s.user_id
    LEFT JOIN advisors a ON a.advisor_id = s.advisor_id
    ${yearFilter}
    ORDER BY s.student_id
  `, values)
  return result.rows
}

export async function importStudents(records, { fileName, importedBy, resolutions } = {}) {
  const client = await pool.connect()
  const importId = randomUUID()
  let successRecords = 0
  const errors = []

  try {
    await client.query('BEGIN')
    const conflicts = await findStudentImportConflicts(client, records)

    if (conflicts.length && !resolutions) {
      const error = new Error(duplicateStudentIdMessage)
      error.statusCode = 409
      error.conflicts = conflicts
      throw error
    }

    const recordsToImport = conflicts.length
      ? applyStudentImportResolutions(records, conflicts, resolutions)
      : records

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
        await upsertStudentWithClient(client, record)
        successRecords += 1
        await client.query(`RELEASE SAVEPOINT ${savepoint}`)
      } catch (error) {
        await client.query(`ROLLBACK TO SAVEPOINT ${savepoint}`)
        errors.push(`Row ${index + 2}: ${error.message}`)
      }
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
