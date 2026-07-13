import ExcelJS from 'exceljs'
import { Readable } from 'node:stream'

import { ApiError } from '../errors/api-error.js'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const degreeLevels = new Set(['Master', 'Doctoral'])
const importRequiredFields = [
  'studentId',
  'email',
  'fullName',
  'program',
  'degreeLevel',
  'expectedGraduationYear',
]

const headerAliases = {
  studentId: ['studentid', 'student id', 'student code', 'รหัสนักศึกษา', 'รหัส นศ.'],
  email: ['email', 'e-mail', 'อีเมล', 'อีเมล์'],
  fullName: ['fullname', 'full name', 'name', 'student name', 'ชื่อ-นามสกุล', 'ชื่อนามสกุล'],
  program: ['program', 'programme', 'major', 'สาขาวิชา', 'หลักสูตร'],
  educationPlan: ['plan', 'education plan', 'study plan', 'แผนการศึกษา', 'แผน'],
  degreeLevel: ['degreelevel', 'degree level', 'degree', 'ระดับการศึกษา', 'ระดับปริญญา'],
  enrollmentAcademicYear: ['enrollmentacademicyear', 'enrollment academic year', 'admission year', 'entry year', 'ปีเข้าศึกษา', 'ปีการศึกษา'],
  semester: ['semester', 'term', 'ภาคการศึกษา', 'เทอม'],
  expectedGraduationYear: ['expectedgraduationyear', 'expected graduation year', 'graduation year', 'year', 'ปีที่คาดว่าจะจบ'],
  advisorId: ['advisorid', 'advisor id', 'รหัสอาจารย์ที่ปรึกษา'],
  advisorEmail: ['advisoremail', 'advisor email', 'อีเมลอาจารย์ที่ปรึกษา'],
  advisorName: ['advisorname', 'advisor name', 'advisor', 'อาจารย์ที่ปรึกษา'],
}

const studentTemplateColumns = [
  { header: 'Student ID', key: 'studentId', width: 16 },
  { header: 'Email', key: 'email', width: 32 },
  { header: 'Full Name', key: 'fullName', width: 28 },
  { header: 'Program', key: 'program', width: 18 },
  { header: 'Degree Level', key: 'degreeLevel', width: 16 },
  { header: 'Enrollment Academic Year', key: 'enrollmentAcademicYear', width: 25 },
  { header: 'Semester', key: 'semester', width: 12 },
  { header: 'Year', key: 'expectedGraduationYear', width: 12 },
]

const studentExportColumns = [
  ...studentTemplateColumns,
  { header: 'Plan', key: 'educationPlan', width: 18 },
  { header: 'Advisor Email', key: 'advisorEmail', width: 32 },
  { header: 'Advisor Name', key: 'advisorName', width: 28 },
]

function requiredText(value, field) {
  const result = String(value ?? '').trim()
  if (!result) throw new ApiError(400, `${field} is required`)
  return result
}

function requiredYear(value, field) {
  const result = Number(value)
  if (!Number.isInteger(result) || result < 2000 || result > 2200) {
    throw new ApiError(400, `${field} must be a valid year`)
  }
  return result
}

function optionalEmail(value) {
  const email = normalizeEmailText(value)
    .trim()
    .toLowerCase()
  if (!email) return null
  if (!emailPattern.test(email)) throw new ApiError(400, 'A valid email is required')
  return email
}

export function normalizeStudent(body, { studentId, requireEmail = true } = {}) {
  const email = requireEmail
    ? requiredText(normalizeEmailText(body.email), 'email').toLowerCase()
    : optionalEmail(body.email)
  const degreeLevel = requiredText(body.degreeLevel, 'degreeLevel')
  if (email && !emailPattern.test(email)) throw new ApiError(400, 'A valid email is required')
  if (!degreeLevels.has(degreeLevel)) {
    throw new ApiError(400, 'degreeLevel must be Master or Doctoral')
  }

  return {
    studentId: studentId || requiredText(body.studentId, 'studentId'),
    email,
    fullName: requiredText(body.fullName, 'fullName'),
    program: requiredText(body.program, 'program'),
    educationPlan: String(body.educationPlan ?? '').trim() || null,
    degreeLevel,
    enrollmentAcademicYear: requiredYear(body.enrollmentAcademicYear, 'enrollmentAcademicYear'),
    semester: requiredText(body.semester, 'semester'),
    expectedGraduationYear: requiredYear(
      body.expectedGraduationYear ?? body.year,
      'expectedGraduationYear',
    ),
    advisorId: String(body.advisorId ?? '').trim() || null,
    advisorEmail: optionalEmail(body.advisorEmail),
    advisorName: String(body.advisorName ?? '').trim() || null,
  }
}

function formatImportValidationError(error) {
  if (error.message === 'email is required') {
    return 'Email is missing. Please enter an email address.'
  }

  return error.message
}

function missingFieldMessage(field) {
  const messages = {
    studentId: 'Student ID is missing.',
    email: 'Email is missing.',
    fullName: 'Full Name is missing.',
    program: 'Program is missing.',
    degreeLevel: 'Degree Level is missing.',
    enrollmentAcademicYear: 'Enrollment Academic Year is missing.',
    semester: 'Semester is missing.',
    expectedGraduationYear: 'Expected Graduation Year is missing.',
  }

  return messages[field] ?? `${field} is missing.`
}

function missingFieldLabel(message) {
  return message.replace(/\s+is missing\.$/i, '')
}

function formatMissingFieldsMessage(messages) {
  const labels = messages.map(missingFieldLabel)

  if (labels.length === 0) return ''
  if (labels.length === 1) return `${labels[0]} is missing.`
  if (labels.length === 2) return `${labels[0]} and ${labels[1]} are missing.`

  return `${labels.slice(0, -1).join(', ')} and ${labels.at(-1)} are missing.`
}

function normalizeCellText(value) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') {
    if ('text' in value) return normalizeCellText(value.text)
    if ('hyperlink' in value) return normalizeCellText(value.hyperlink)
    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => normalizeCellText(part.text)).join('')
    }
    if ('result' in value) return normalizeCellText(value.result)
  }
  return String(value).trim()
}

function normalizeEmailText(value) {
  const text = [
    value && typeof value === 'object' && 'hyperlink' in value ? value.hyperlink : '',
    normalizeCellText(value),
  ]
    .join(' ')
    .replace(/^mailto:/i, '')
    .replace(/\bmailto:/gi, ' ')
    .split('?')[0]
    .trim()

  const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)
  return match?.[0] ?? text
}

function normalizeHeader(value) {
  return normalizeCellText(value).toLowerCase().replace(/[\s_.\-/()]+/g, '')
}

function normalizeImportStudent(rawStudent) {
  const rowErrors = []

  for (const field of importRequiredFields) {
    if (String(rawStudent[field] ?? '').trim() === '') rowErrors.push(missingFieldMessage(field))
  }

  if (rowErrors.length) {
    throw new ApiError(400, rowErrors.join('; '))
  }

  return normalizeStudent(rawStudent)
}

function cellValue(row, headerMap, names) {
  const key = names.find((name) => headerMap.has(normalizeHeader(name)))
  if (!key) return ''
  const value = row.getCell(headerMap.get(normalizeHeader(key))).value
  return normalizeCellText(value)
}

function addHeaders(worksheet, columns = studentExportColumns) {
  worksheet.columns = columns
  worksheet.getRow(1).font = { bold: true }
}

export async function readStudentImportFile(file) {
  const workbook = new ExcelJS.Workbook()
  if (file.originalname.toLowerCase().endsWith('.csv')) {
    await workbook.csv.read(Readable.from(file.buffer))
  } else {
    await workbook.xlsx.load(file.buffer)
  }

  const sheet = workbook.worksheets[0]
  if (!sheet || sheet.rowCount < 2) throw new ApiError(400, 'The import file has no student rows')

  const headerMap = new Map()
  sheet.getRow(1).eachCell((cell, column) => {
    headerMap.set(normalizeHeader(cell.value), column)
  })

  const records = []
  const validationErrors = []
  const missingFieldErrors = new Set()
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1 || !row.hasValues) return
    try {
      records.push(
        normalizeImportStudent({
          studentId: cellValue(row, headerMap, headerAliases.studentId),
          email: cellValue(row, headerMap, headerAliases.email),
          fullName: cellValue(row, headerMap, headerAliases.fullName),
          program: cellValue(row, headerMap, headerAliases.program),
          educationPlan: cellValue(row, headerMap, headerAliases.educationPlan),
          degreeLevel: cellValue(row, headerMap, headerAliases.degreeLevel),
          enrollmentAcademicYear: cellValue(row, headerMap, headerAliases.enrollmentAcademicYear),
          semester: cellValue(row, headerMap, headerAliases.semester),
          expectedGraduationYear: cellValue(row, headerMap, headerAliases.expectedGraduationYear),
          advisorId: cellValue(row, headerMap, headerAliases.advisorId),
          advisorEmail: cellValue(row, headerMap, headerAliases.advisorEmail),
          advisorName: cellValue(row, headerMap, headerAliases.advisorName),
        }),
      )
    } catch (error) {
      const message = formatImportValidationError(error)
      const missingMessages = message
        .split(';')
        .map((item) => item.trim())
        .filter((item) => importRequiredFields.some((field) => item === missingFieldMessage(field)))

      if (missingMessages.length) {
        missingMessages.forEach((item) => missingFieldErrors.add(item))
        const otherMessages = message
          .split(';')
          .map((item) => item.trim())
          .filter((item) => !missingMessages.includes(item))
        validationErrors.push(...otherMessages.map((item) => `Row ${rowNumber}: ${item}`))
      } else {
        validationErrors.push(`Row ${rowNumber}: ${message}`)
      }
    }
  })

  const allValidationErrors = [
    formatMissingFieldsMessage([...missingFieldErrors]),
    ...validationErrors,
  ].filter(Boolean)
  if (allValidationErrors.length) {
    throw new ApiError(400, allValidationErrors.join('; '))
  }
  const duplicateIds = [...new Set(records.map((record) => record.studentId).filter((id, index, ids) => ids.indexOf(id) !== index))]
  if (duplicateIds.length) {
    throw new ApiError(400, `Duplicate Student ID in file: ${duplicateIds.join(', ')}. Please correct the registration file and import it again.`)
  }
  return records
}

export async function createStudentExportBuffer(students) {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Students')
  addHeaders(worksheet)
  worksheet.addRows(students)

  return Buffer.from(await workbook.xlsx.writeBuffer())
}

export async function createStudentTemplateBuffer() {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Students')
  addHeaders(worksheet, studentTemplateColumns)
  worksheet.addRow({
    studentId: '6631500001',
    email: 'student@lamduan.mfu.ac.th',
    fullName: 'Example Student',
    program: 'CE',
    degreeLevel: 'Doctoral',
    enrollmentAcademicYear: 2023,
    semester: '2',
    expectedGraduationYear: 2026,
  })

  return Buffer.from(await workbook.xlsx.writeBuffer())
}
