import assert from 'node:assert/strict'
import test from 'node:test'
import ExcelJS from 'exceljs'

import {
  createStudentExportBuffer,
  createStudentTemplateBuffer,
  normalizeEducationPlan,
  parseStudentId,
  readStudentImportFile,
} from '../src/services/student-files.service.js'

function csvFile(contents) {
  return { originalname: 'students.csv', buffer: Buffer.from(contents) }
}

const productionHeaders = 'Student ID,Full Name,School,Program,Plan,Status'

test('parses the six-column production import and derives data from the student ID', async () => {
  const [student] = await readStudentImportFile(
    csvFile(`${productionHeaders}\n6551303009,Test Student,School of IT,DTT,A1,Active`),
  )

  assert.deepEqual(student, {
    studentId: '6551303009',
    email: '6551303009@lamduan.mfu.ac.th',
    fullName: 'Test Student',
    schoolName: 'School of IT',
    program: 'DTT',
    educationPlan: 'A1',
    degreeLevel: 'Master',
    enrollmentAcademicYear: 2022,
    semester: '1',
    expectedGraduationYear: 2025,
    advisorId: null,
    advisorEmail: null,
    advisorName: null,
  })
})

test('creates an import template with exactly the six production columns', async () => {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(await createStudentTemplateBuffer())
  const headers = workbook.worksheets[0].getRow(1).values.slice(1)

  assert.deepEqual(headers, ['Student ID', 'Full Name', 'School', 'Program', 'Plan', 'Status'])
})

test('accepts the six real Thai column names', async () => {
  const [student] = await readStudentImportFile(
    csvFile(
      'รหัสนักศึกษา,ชื่อ-สกุล,สำนักวิชา,สาขาวิชา,แผนการเรียน,สถานะ\n6551303009,นักศึกษา ทดสอบ,สำนักวิชาเทคโนโลยีสารสนเทศ,DTT,ก1,ปกติ',
    ),
  )

  assert.equal(student.fullName, 'นักศึกษา ทดสอบ')
  assert.equal(student.schoolName, 'สำนักวิชาเทคโนโลยีสารสนเทศ')
  assert.equal(student.educationPlan, 'A1')
})

test('rejects the whole file with one generic message when a required cell is empty', async () => {
  await assert.rejects(
    readStudentImportFile(
      csvFile(
        `${productionHeaders}\n6551303009,Complete Student,School of IT,DTT,A1,Active\n6551303010,,School of IT,DTT,A1,Active`,
      ),
    ),
    (error) => {
      assert.equal(error.statusCode, 400)
      assert.equal(error.message, 'Please complete all required fields and import the file again.')
      assert.doesNotMatch(error.message, /Row|Full Name/)
      return true
    },
  )
})

test('imports only active students when the status column contains other statuses', async () => {
  const students = await readStudentImportFile(
    csvFile(
      `${productionHeaders}\n6551303009,Active Student,School of IT,DTT,A1,Active\n6551303010,Withdrawn Student,School of IT,DTT,A1,Withdrawn`,
    ),
  )

  assert.deepEqual(students.map((student) => student.studentId), ['6551303009'])
})

test('derives program from the student ID instead of trusting the imported label', async () => {
  const [student] = await readStudentImportFile(
    csvFile(
      `${productionHeaders}\n6551303009,Test Student,School of IT,Digital Technology Transformation,A1,Active`,
    ),
  )

  assert.equal(student.program, 'DTT')
})

test('derives degree, program and semester from the student ID convention', () => {
  assert.deepEqual(parseStudentId('6871501001'), {
    studentId: '6871501001',
    enrollmentAcademicYear: 2025,
    degreeLevel: 'Doctoral',
    program: 'CE',
    semester: '1',
    parsedMajorCode: '1501',
  })
})

test('normalizes supported Master and Doctoral study plans', () => {
  assert.equal(normalizeEducationPlan('ก2', 'Master'), 'A2')
  assert.equal(normalizeEducationPlan('ข', 'Master'), 'B')
  assert.equal(normalizeEducationPlan('2.2', 'Doctoral'), '2.2')
  assert.throws(() => normalizeEducationPlan('2.1', 'Master'), /Master education plan/)
})

test('reports corrupted question-mark CSV encoding clearly', async () => {
  await assert.rejects(
    readStudentImportFile(csvFile('????????????,????-????\n6551303009,??? ????????')),
    /Thai characters were replaced with \?/,
  )
})

test('exports advisor name without advisor email and includes milestone status', async () => {
  const buffer = await createStudentExportBuffer([
    {
      studentId: '6551303009',
      email: 'student@lamduan.mfu.ac.th',
      fullName: 'Test Student',
      educationPlan: 'A1',
      program: 'DTT',
      degreeLevel: 'Master',
      enrollmentAcademicYear: 2022,
      semester: '1',
      expectedGraduationYear: 2025,
      advisorName: 'Dr. Advisor',
      advisorEmail: 'advisor@lamduan.mfu.ac.th',
      milestoneReport: [],
    },
  ])
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  const headers = workbook.worksheets[0].getRow(1).values.slice(1)

  assert.equal(headers.includes('Advisor Email'), false)
  assert.equal(headers.filter((header) => header === 'Advisor Name').length, 1)
  assert.equal(headers.includes('Milestone Status'), true)
})
