import assert from 'node:assert/strict'
import test from 'node:test'
import ExcelJS from 'exceljs'

import {
  createStudentExportBuffer,
  normalizeEducationPlan,
  parseStudentId,
  readStudentImportFile,
} from '../src/services/student-files.service.js'

function csvFile(contents) {
  return {
    originalname: 'students.csv',
    buffer: Buffer.from(contents),
  }
}

const headers = [
  'Student ID',
  'Email',
  'Full Name',
  'Program',
  'Degree Level',
  'Enrollment Academic Year',
  'Semester',
  'Year',
  'Advisor Email',
  'Advisor Name',
].join(',')

test('parses a valid student CSV file using the current import flow', async () => {
  const students = await readStudentImportFile(
    csvFile(
      `${headers}\n6551303009,student@lamduan.mfu.ac.th,Test Student,,,,,2025,advisor@lamduan.mfu.ac.th,Dr. Advisor`,
    ),
  )

  assert.equal(students.length, 1)
  assert.deepEqual(students[0], {
    studentId: '6551303009',
    email: 'student@lamduan.mfu.ac.th',
    fullName: 'Test Student',
    program: 'DTT',
    educationPlan: null,
    degreeLevel: 'Master',
    enrollmentAcademicYear: 2022,
    semester: '1',
    expectedGraduationYear: 2025,
    advisorId: null,
    advisorEmail: 'advisor@lamduan.mfu.ac.th',
    advisorName: 'Dr. Advisor',
  })
})

test('allows a missing name through parsing so an existing student can be partially updated', async () => {
  const students = await readStudentImportFile(
    csvFile('Student ID,Plan\n6551303009,A2'),
  )

  assert.equal(students[0].fullName, null)
  assert.equal(students[0].educationPlan, 'A2')
})

test('extracts email text from spreadsheet hyperlink values', async () => {
  const students = await readStudentImportFile(
    csvFile(
      `${headers}\n6751501001,mailto:student@lamduan.mfu.ac.th,Test Student,,,,,2028,,`,
    ),
  )

  assert.equal(students[0].email, 'student@lamduan.mfu.ac.th')
})

test('derives student data from the 10-digit student ID convention', () => {
  assert.deepEqual(parseStudentId('6551303009'), {
    studentId: '6551303009',
    enrollmentAcademicYear: 2022,
    degreeLevel: 'Master',
    program: 'DTT',
    semester: '1',
    parsedMajorCode: '1303',
  })

  assert.deepEqual(parseStudentId('6771501501'), {
    studentId: '6771501501',
    enrollmentAcademicYear: 2024,
    degreeLevel: 'Doctoral',
    program: 'CE',
    semester: '2',
    parsedMajorCode: '1501',
  })
})

test('handles unsupported program or semester codes gracefully', () => {
  const parsedUnknownProgram = parseStudentId('6559999001')
  assert.equal(parsedUnknownProgram.program, null)
  assert.equal(parsedUnknownProgram.parsedMajorCode, '9999')

  const parsedUnknownSemester = parseStudentId('6551303901')
  assert.equal(parsedUnknownSemester.semester, null)
})

test('accepts flexible Thai student import headers', async () => {
  const students = await readStudentImportFile(
    csvFile(
      'รหัสประจำตัวนักศึกษา,อีเมล์นักศึกษา,ชื่อและนามสกุล,ปีการศึกษาที่คาดว่าจะจบ\n6551303009,student@lamduan.mfu.ac.th,นางสาวทดสอบ ระบบ,2025',
    ),
  )

  assert.equal(students[0].studentId, '6551303009')
  assert.equal(students[0].fullName, 'นางสาวทดสอบ ระบบ')
  assert.equal(students[0].expectedGraduationYear, 2025)
})

test('imports only students with a normal status when a Thai status column is present', async () => {
  const students = await readStudentImportFile(
    csvFile(
      'รหัสนักศึกษา,ชื่อ-สกุล,สถานภาพนักศึกษา\n6551303009,นักศึกษา ปกติ,ปกติ\n6551303010,นักศึกษา ไม่รายงานตัว,ไม่รายงานตัวขึ้นทะเบียนเป็นนักศึกษา (ณ วันที่ 1/7/69)\n6551303011,นักศึกษา ลาออก,อนุมัติให้ลาออก (ณ วันที่ 2/7/69)',
    ),
  )

  assert.deepEqual(students.map((student) => student.studentId), ['6551303009'])
})

test('supports an English student status header and active status', async () => {
  const students = await readStudentImportFile(
    csvFile(
      'Student ID,Full Name,Student Status\n6551303009,Active Student,Active\n6551303010,Withdrawn Student,Withdrawn',
    ),
  )

  assert.deepEqual(students.map((student) => student.studentId), ['6551303009'])
})

test('imports a minimal Thai file and derives degree and program from student ID', async () => {
  const students = await readStudentImportFile(
    csvFile('รหัสนักศึกษา,ชื่อ-สกุล\n6551303009,ปิยวัฒน์ ทดสอบ'),
  )

  assert.deepEqual(
    {
      studentId: students[0].studentId,
      fullName: students[0].fullName,
      degreeLevel: students[0].degreeLevel,
      program: students[0].program,
    },
    {
      studentId: '6551303009',
      fullName: 'ปิยวัฒน์ ทดสอบ',
      degreeLevel: 'Master',
      program: 'DTT',
    },
  )
})

test('derives email and expected graduation year when they are omitted', async () => {
  const students = await readStudentImportFile(
    csvFile('Student ID,Full Name\n6551303009,Test Student'),
  )

  assert.equal(students[0].email, '6551303009@lamduan.mfu.ac.th')
  assert.equal(students[0].expectedGraduationYear, 2025)
})

test('maps flexible Thai study-plan headers and values to Plan', async () => {
  const students = await readStudentImportFile(
    csvFile('รหัสนักศึกษา,ชื่อ-สกุล,แผนการเรียน\n6551303009,นักศึกษา ปริญญาโท,ก1'),
  )

  assert.equal(students[0].educationPlan, 'A1')
  assert.equal(normalizeEducationPlan('ก2', 'Master'), 'A2')
  assert.equal(normalizeEducationPlan('ข', 'Master'), 'B')
  assert.equal(normalizeEducationPlan('2.2', 'Doctoral'), '2.2')
})

test('accepts English Plan headers with English or Thai plan values', async () => {
  const englishPlan = await readStudentImportFile(
    csvFile('Student ID,Full Name,Plan\n6551303009,Master Student,A2'),
  )
  const thaiPlan = await readStudentImportFile(
    csvFile('Student ID,Full Name,Plan\n6551303010,Master Student,ข'),
  )

  assert.equal(englishPlan[0].educationPlan, 'A2')
  assert.equal(thaiPlan[0].educationPlan, 'B')
})

test('rejects study plans that do not match the degree level', () => {
  assert.throws(() => normalizeEducationPlan('2.1', 'Master'), /Master education plan/)
  assert.throws(() => normalizeEducationPlan('A1', 'Doctoral'), /Doctoral education plan/)
})

test('reports corrupted question-mark CSV encoding clearly', async () => {
  await assert.rejects(
    readStudentImportFile(csvFile('????????????,????-????\n6551303009,??? ????????')),
    /Thai characters were replaced with \?/,
  )
})

test('exports advisor name without advisor email and localizes milestone status header', async () => {
  const buffer = await createStudentExportBuffer(
    [
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
        milestoneReport: [
          {
            title: 'Attend ethics training',
            status: 'Approved',
            submittedAt: '2026-09-02T00:00:00.000Z',
            reviewedAt: '2026-09-02T00:00:00.000Z',
          },
          {
            title: 'Pass the Qualifying Exam',
            status: 'In Progress',
            submittedAt: null,
            reviewedAt: null,
          },
        ],
      },
    ],
    { language: 'th' },
  )
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  const worksheet = workbook.worksheets[0]
  const headers = worksheet.getRow(1).values.slice(1)

  assert.equal(headers.includes('Advisor Email'), false)
  assert.equal(headers.filter((header) => header === 'Advisor Name').length, 1)
  assert.equal(headers.includes('รายงานภาพรวม'), true)
  const reportCell = worksheet.getRow(2).getCell(headers.indexOf('รายงานภาพรวม') + 1)
  assert.match(String(reportCell.value), /1\. Attend ethics training \(สำเร็จเมื่อ 2\/9\/69\)/)
  assert.match(String(reportCell.value), /2\. Pass the Qualifying Exam \(กำลังดำเนินการ\)/)
  assert.equal(reportCell.alignment.wrapText, true)
})
