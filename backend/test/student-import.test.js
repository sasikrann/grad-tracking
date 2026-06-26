import assert from 'node:assert/strict'
import test from 'node:test'

import { parseStudentImportFile } from '../src/services/student-import.service.js'

function csvFile(contents) {
  return {
    originalname: 'students.csv',
    buffer: Buffer.from(contents),
  }
}

const headers = [
  'Student ID',
  'Full Name',
  'Program',
  'Degree Level',
  'Enrollment Academic Year',
  'Semester',
  'Expected Graduation Year',
  'Advisor ID',
].join(',')

test('parses a valid student CSV file', async () => {
  const students = await parseStudentImportFile(
    csvFile(`${headers}\n6631500999,Test Student,CE,Doctoral,2023,2,2026,ADV001`),
  )

  assert.equal(students.length, 1)
  assert.deepEqual(students[0], {
    rowNumber: 2,
    studentId: '6631500999',
    fullName: 'Test Student',
    program: 'CE',
    degreeLevel: 'Doctoral',
    enrollmentAcademicYear: 2023,
    semester: '2',
    expectedGraduationYear: 2026,
    advisorId: 'ADV001',
  })
})

test('rejects a file with missing required columns', async () => {
  await assert.rejects(
    parseStudentImportFile(csvFile('Student ID,Full Name\n1,Test Student')),
    (error) => error.statusCode === 422 && error.message.includes('Missing required columns'),
  )
})

test('reports row-level validation errors', async () => {
  await assert.rejects(
    parseStudentImportFile(
      csvFile(`${headers}\n6631500999,Test Student,CE,Unknown,2023,3,2022,ADV001`),
    ),
    (error) =>
      error.statusCode === 422 &&
      error.details.some((detail) => detail.field === 'degreeLevel') &&
      error.details.some((detail) => detail.field === 'semester') &&
      error.details.some((detail) => detail.field === 'expectedGraduationYear'),
  )
})

test('rejects duplicate student IDs in the same file', async () => {
  const row = '6631500999,Test Student,CE,Master,2023,1,2025,'

  await assert.rejects(
    parseStudentImportFile(csvFile(`${headers}\n${row}\n${row}`)),
    (error) =>
      error.statusCode === 422 &&
      error.details.some(
        (detail) => detail.field === 'studentId' && detail.message.includes('duplicated'),
      ),
  )
})

test('rejects a malformed XLSX file', async () => {
  await assert.rejects(
    parseStudentImportFile({
      originalname: 'students.xlsx',
      buffer: Buffer.from('not-an-xlsx-file'),
    }),
    (error) => error.statusCode === 400 && error.message.includes('Unable to read'),
  )
})
