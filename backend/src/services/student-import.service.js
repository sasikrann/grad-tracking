import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { parse } from 'csv-parse/sync'
import readXlsxFile from 'read-excel-file/node'

import pool from '../config/database.js'
import { ApiError } from '../errors/api-error.js'

const MAX_IMPORT_ROWS = 1000

const columnDefinitions = [
  {
    key: 'studentId',
    label: 'Student ID',
    aliases: ['studentid', 'studentnumber', 'id'],
    required: true,
  },
  {
    key: 'fullName',
    label: 'Full Name',
    aliases: ['fullname', 'name', 'studentname'],
    required: true,
  },
  {
    key: 'program',
    label: 'Program',
    aliases: ['program', 'programme'],
    required: true,
  },
  {
    key: 'degreeLevel',
    label: 'Degree Level',
    aliases: ['degreelevel', 'degree'],
    required: true,
  },
  {
    key: 'enrollmentAcademicYear',
    label: 'Enrollment Academic Year',
    aliases: ['enrollmentacademicyear', 'enrollmentyear', 'academicyear'],
    required: true,
  },
  {
    key: 'semester',
    label: 'Semester',
    aliases: ['semester', 'term'],
    required: true,
  },
  {
    key: 'expectedGraduationYear',
    label: 'Expected Graduation Year',
    aliases: ['expectedgraduationyear', 'graduationyear', 'expectedyear'],
    required: true,
  },
  {
    key: 'advisorId',
    label: 'Advisor ID',
    aliases: ['advisorid', 'advisor'],
    required: false,
  },
]

function normalizeHeader(value) {
  return String(value ?? '')
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

function textValue(value) {
  return value === null || value === undefined ? '' : String(value).trim()
}

function integerValue(value) {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isInteger(number) ? number : null
}

function normalizeDegree(value) {
  const degree = textValue(value)
    .toLowerCase()
    .replace(/[^a-z]/g, '')

  if (degree === 'master' || degree === 'masters') return 'Master'
  if (degree === 'doctoral' || degree === 'doctorate' || degree === 'phd') return 'Doctoral'
  return null
}

async function readRows(file) {
  const extension = path.extname(file.originalname).toLowerCase()

  try {
    if (extension === '.csv') {
      return parse(file.buffer, {
        bom: true,
        relax_column_count: true,
        skip_empty_lines: true,
        trim: true,
      })
    }

    if (extension === '.xlsx') {
      return await readXlsxFile(file.buffer)
    }
  } catch (_error) {
    throw new ApiError(400, 'Unable to read the import file. Please use a valid CSV or XLSX file')
  }

  throw new ApiError(400, 'Only CSV and XLSX files are supported')
}

function addError(errors, row, field, message) {
  errors.push({ row, field, message })
}

export async function parseStudentImportFile(file) {
  const rows = await readRows(file)

  if (!Array.isArray(rows) || rows.length === 0) {
    throw new ApiError(400, 'The import file is empty')
  }

  const headers = rows[0].map(normalizeHeader)
  const columnIndexes = {}
  const missingColumns = []

  for (const definition of columnDefinitions) {
    const index = headers.findIndex((header) => definition.aliases.includes(header))
    columnIndexes[definition.key] = index

    if (definition.required && index === -1) {
      missingColumns.push(definition.label)
    }
  }

  if (missingColumns.length > 0) {
    throw new ApiError(422, `Missing required columns: ${missingColumns.join(', ')}`)
  }

  const dataRows = rows
    .slice(1)
    .map((values, index) => ({ values, rowNumber: index + 2 }))
    .filter(({ values }) => values.some((value) => textValue(value) !== ''))

  if (dataRows.length === 0) {
    throw new ApiError(422, 'The import file does not contain any student rows')
  }

  if (dataRows.length > MAX_IMPORT_ROWS) {
    throw new ApiError(422, `A single import can contain at most ${MAX_IMPORT_ROWS} students`)
  }

  const errors = []
  const seenStudentIds = new Map()
  const students = dataRows.map(({ values, rowNumber }) => {
    const valueFor = (key) => {
      const index = columnIndexes[key]
      return index === -1 ? '' : values[index]
    }

    const student = {
      rowNumber,
      studentId: textValue(valueFor('studentId')),
      fullName: textValue(valueFor('fullName')),
      program: textValue(valueFor('program')),
      degreeLevel: normalizeDegree(valueFor('degreeLevel')),
      enrollmentAcademicYear: integerValue(valueFor('enrollmentAcademicYear')),
      semester: textValue(valueFor('semester')),
      expectedGraduationYear: integerValue(valueFor('expectedGraduationYear')),
      advisorId: textValue(valueFor('advisorId')) || null,
    }

    if (!student.studentId) {
      addError(errors, rowNumber, 'studentId', 'Student ID is required')
    } else if (student.studentId.length > 50) {
      addError(errors, rowNumber, 'studentId', 'Student ID must not exceed 50 characters')
    } else if (seenStudentIds.has(student.studentId)) {
      addError(
        errors,
        rowNumber,
        'studentId',
        `Student ID is duplicated from row ${seenStudentIds.get(student.studentId)}`,
      )
    } else {
      seenStudentIds.set(student.studentId, rowNumber)
    }

    if (!student.fullName) addError(errors, rowNumber, 'fullName', 'Full Name is required')
    if (!student.program) addError(errors, rowNumber, 'program', 'Program is required')
    if (!student.degreeLevel) {
      addError(errors, rowNumber, 'degreeLevel', 'Degree Level must be Master or Doctoral')
    }

    if (
      student.enrollmentAcademicYear === null ||
      student.enrollmentAcademicYear < 2000 ||
      student.enrollmentAcademicYear > 3000
    ) {
      addError(
        errors,
        rowNumber,
        'enrollmentAcademicYear',
        'Enrollment Academic Year must be a four-digit year',
      )
    }

    if (!['1', '2'].includes(student.semester)) {
      addError(errors, rowNumber, 'semester', 'Semester must be 1 or 2')
    }

    if (
      student.expectedGraduationYear === null ||
      student.expectedGraduationYear < 2000 ||
      student.expectedGraduationYear > 3000
    ) {
      addError(
        errors,
        rowNumber,
        'expectedGraduationYear',
        'Expected Graduation Year must be a four-digit year',
      )
    } else if (
      student.enrollmentAcademicYear !== null &&
      student.expectedGraduationYear < student.enrollmentAcademicYear
    ) {
      addError(
        errors,
        rowNumber,
        'expectedGraduationYear',
        'Expected Graduation Year cannot be earlier than Enrollment Academic Year',
      )
    }

    return student
  })

  if (errors.length > 0) {
    throw new ApiError(422, 'Import file contains invalid student data', errors)
  }

  return students
}

export async function importStudentsFromFile(file) {
  const students = await parseStudentImportFile(file)
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const advisorIds = [...new Set(students.map((student) => student.advisorId).filter(Boolean))]

    if (advisorIds.length > 0) {
      const advisorResult = await client.query(
        'SELECT advisor_id FROM advisors WHERE advisor_id = ANY($1::varchar[])',
        [advisorIds],
      )
      const existingAdvisorIds = new Set(advisorResult.rows.map((row) => row.advisor_id))
      const advisorErrors = students
        .filter((student) => student.advisorId && !existingAdvisorIds.has(student.advisorId))
        .map((student) => ({
          row: student.rowNumber,
          field: 'advisorId',
          message: `Advisor ${student.advisorId} does not exist`,
        }))

      if (advisorErrors.length > 0) {
        throw new ApiError(422, 'Import file contains unknown advisors', advisorErrors)
      }
    }

    const studentIds = students.map((student) => student.studentId)
    const existingResult = await client.query(
      'SELECT student_id FROM students WHERE student_id = ANY($1::varchar[])',
      [studentIds],
    )
    const existingStudentIds = new Set(existingResult.rows.map((row) => row.student_id))

    for (const student of students) {
      await client.query(
        `
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
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (student_id) DO UPDATE SET
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
          student.studentId,
          student.fullName,
          student.program,
          student.degreeLevel,
          student.enrollmentAcademicYear,
          student.semester,
          student.expectedGraduationYear,
          student.advisorId,
        ],
      )
    }

    const created = students.filter((student) => !existingStudentIds.has(student.studentId)).length
    const updated = students.length - created

    await client.query(
      `
        INSERT INTO import_logs (
          import_id,
          import_type,
          file_name,
          total_records,
          success_records,
          failed_records
        )
        VALUES ($1, 'student', $2, $3, $3, 0)
      `,
      [randomUUID(), file.originalname, students.length],
    )

    await client.query('COMMIT')

    return {
      imported: students.length,
      created,
      updated,
    }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
