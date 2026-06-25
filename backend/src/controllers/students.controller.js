// Controller สำหรับ Student Management
// ใช้จัดการข้อมูลนักศึกษา และนำเข้า/ส่งออกไฟล์ Excel หรือ CSV
import ExcelJS from 'exceljs'
import { Readable } from 'node:stream'

import { ApiError } from '../errors/api-error.js'
import {
  findAllStudents,
  findStudentById,
  findStudentsForExport,
  importStudents,
  insertStudent,
  removeStudent,
  replaceStudent,
} from '../services/students.service.js'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const degreeLevels = new Set(['Master', 'Doctoral'])

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
  const email = String(value ?? '').trim().toLowerCase()
  if (!email) return null
  if (!emailPattern.test(email)) throw new ApiError(400, 'A valid email is required')
  return email
}

function normalizeStudent(body, { studentId, requireEmail = true } = {}) {
  const email = requireEmail ? requiredText(body.email, 'email').toLowerCase() : optionalEmail(body.email)
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

function cellValue(row, headerMap, names) {
  const key = names.find((name) => headerMap.has(name.toLowerCase()))
  if (!key) return ''
  const value = row.getCell(headerMap.get(key.toLowerCase())).value
  if (value && typeof value === 'object' && 'text' in value) return value.text
  return value ?? ''
}

async function readImportFile(file) {
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
    headerMap.set(String(cell.value ?? '').trim().toLowerCase(), column)
  })

  const records = []
  const validationErrors = []
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1 || !row.hasValues) return
    try {
      records.push(normalizeStudent({
        studentId: cellValue(row, headerMap, ['studentid', 'student id']),
        email: cellValue(row, headerMap, ['email']),
        fullName: cellValue(row, headerMap, ['fullname', 'full name', 'name']),
        program: cellValue(row, headerMap, ['program']),
        degreeLevel: cellValue(row, headerMap, ['degreelevel', 'degree level']),
        enrollmentAcademicYear: cellValue(row, headerMap, ['enrollmentacademicyear', 'enrollment academic year']),
        semester: cellValue(row, headerMap, ['semester']),
        expectedGraduationYear: cellValue(row, headerMap, ['expectedgraduationyear', 'expected graduation year', 'year']),
        advisorId: cellValue(row, headerMap, ['advisorid', 'advisor id']),
        advisorEmail: cellValue(row, headerMap, ['advisoremail', 'advisor email']),
        advisorName: cellValue(row, headerMap, ['advisorname', 'advisor name', 'advisor']),
      }, { requireEmail: false }))
    } catch (error) {
      validationErrors.push(`Row ${rowNumber}: ${error.message}`)
    }
  })

  if (validationErrors.length) {
    throw new ApiError(400, validationErrors.join('; '))
  }
  return records
}

export async function getStudents(_request, response) {
  response.json({ data: await findAllStudents() })
}

export async function getStudent(request, response) {
  const student = await findStudentById(request.params.studentId)
  if (!student) throw new ApiError(404, 'Student not found')
  response.json({ data: student })
}

export async function createStudent(request, response) {
  const student = await insertStudent(normalizeStudent(request.body))
  response.status(201).json({ data: student })
}

export async function updateStudent(request, response) {
  const student = await replaceStudent(
    request.params.studentId,
    normalizeStudent(request.body, { studentId: request.params.studentId }),
  )
  if (!student) throw new ApiError(404, 'Student not found')
  response.json({ data: student })
}

export async function deleteStudent(request, response) {
  if (!(await removeStudent(request.params.studentId))) {
    throw new ApiError(404, 'Student not found')
  }
  response.status(204).send()
}

export async function importStudentFile(request, response) {
  if (!request.file) throw new ApiError(400, 'A CSV or XLSX file is required')
  const records = await readImportFile(request.file)
  const result = await importStudents(records, {
    fileName: request.file.originalname,
    importedBy: request.user.userId,
  })
  response.status(201).json({ data: result })
}

function addHeaders(worksheet) {
  worksheet.columns = [
    { header: 'Student ID', key: 'studentId', width: 16 },
    { header: 'Email', key: 'email', width: 32 },
    { header: 'Full Name', key: 'fullName', width: 28 },
    { header: 'Program', key: 'program', width: 18 },
    { header: 'Degree Level', key: 'degreeLevel', width: 16 },
    { header: 'Enrollment Academic Year', key: 'enrollmentAcademicYear', width: 25 },
    { header: 'Semester', key: 'semester', width: 12 },
    { header: 'Year', key: 'expectedGraduationYear', width: 12 },
    { header: 'Advisor ID', key: 'advisorId', width: 16 },
    { header: 'Advisor Email', key: 'advisorEmail', width: 32 },
    { header: 'Advisor Name', key: 'advisorName', width: 28 },
  ]
  worksheet.getRow(1).font = { bold: true }
}

export async function exportStudents(request, response) {
  const enrollmentYear = String(request.query.enrollmentYear ?? '').trim()
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Students')
  addHeaders(worksheet)
  worksheet.addRows(await findStudentsForExport({ enrollmentYear: enrollmentYear || null }))
  const buffer = await workbook.xlsx.writeBuffer()

  response.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  response.setHeader(
    'Content-Disposition',
    `attachment; filename="students${enrollmentYear ? `-enrollment-${enrollmentYear}` : ''}.xlsx"`,
  )
  response.send(Buffer.from(buffer))
}

export async function downloadStudentTemplate(_request, response) {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Students')
  addHeaders(worksheet)
  worksheet.addRow({
    studentId: '6631500001',
    email: 'student@lamduan.mfu.ac.th',
    fullName: 'Example Student',
    program: 'CE',
    degreeLevel: 'Doctoral',
    enrollmentAcademicYear: 2023,
    semester: '2',
    expectedGraduationYear: 2026,
    advisorId: '',
    advisorEmail: 'advisor.dev@lamduan.mfu.ac.th',
    advisorName: 'Development Advisor',
  })
  const buffer = await workbook.xlsx.writeBuffer()
  response.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  response.setHeader('Content-Disposition', 'attachment; filename="student_import_template.xlsx"')
  response.send(Buffer.from(buffer))
}
