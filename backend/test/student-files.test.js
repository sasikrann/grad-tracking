import assert from 'node:assert/strict'
import test from 'node:test'

import { readStudentImportFile } from '../src/services/student-files.service.js'

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
      `${headers}\n6631500999,student@lamduan.mfu.ac.th,Test Student,CE,Doctoral,2023,2,2026,advisor@lamduan.mfu.ac.th,Dr. Advisor`,
    ),
  )

  assert.equal(students.length, 1)
  assert.deepEqual(students[0], {
    studentId: '6631500999',
    email: 'student@lamduan.mfu.ac.th',
    fullName: 'Test Student',
    program: 'CE',
    degreeLevel: 'Doctoral',
    enrollmentAcademicYear: 2023,
    semester: '2',
    expectedGraduationYear: 2026,
    advisorId: null,
    advisorEmail: 'advisor@lamduan.mfu.ac.th',
    advisorName: 'Dr. Advisor',
  })
})

test('groups repeated missing student import fields into one readable message', async () => {
  await assert.rejects(
    readStudentImportFile(
      csvFile(
        `${headers}\n6631500999,,Test Student,CE,Doctoral,2023,2,2026,,\n6631501000,,,CE,Doctoral,2023,2,2026,,`,
      ),
    ),
    (error) =>
      error.statusCode === 400 &&
      error.message.includes('Email and Full Name are missing.') &&
      !error.message.includes('Email is missing.; Email is missing.'),
  )
})

test('extracts email text from spreadsheet hyperlink values', async () => {
  const students = await readStudentImportFile(
    csvFile(
      `${headers}\n6631500999,mailto:student@lamduan.mfu.ac.th,Test Student,CE,Doctoral,2023,2,2026,,`,
    ),
  )

  assert.equal(students[0].email, 'student@lamduan.mfu.ac.th')
})
