import assert from 'node:assert/strict'
import test from 'node:test'

import { buildStudentExportCsv } from '../src/services/student-export.service.js'

test('builds an Excel-compatible UTF-8 student CSV', () => {
  const csv = buildStudentExportCsv([
    {
      studentId: '6631500999',
      fullName: 'สมชาย, ใจดี',
      program: 'CE',
      degreeLevel: 'Doctoral',
      enrollmentAcademicYear: 2023,
      semester: '2',
      expectedGraduationYear: 2026,
      advisorId: 'ADV001',
      advisorName: 'Dr. John Doe',
      progress: 40,
      status: 'On-track',
    },
  ])

  assert.equal(csv.charCodeAt(0), 0xfeff)
  assert.match(csv, /"Student ID","Full Name"/)
  assert.match(csv, /"สมชาย, ใจดี"/)
  assert.match(csv, /"40","On-track"/)
})

test('neutralizes spreadsheet formulas in exported text', () => {
  const csv = buildStudentExportCsv([
    {
      studentId: '=HYPERLINK("https://example.com")',
      fullName: '+Injected',
      program: '-Injected',
      degreeLevel: 'Master',
      enrollmentAcademicYear: 2023,
      semester: '1',
      expectedGraduationYear: 2025,
      advisorId: null,
      advisorName: '@Injected',
      progress: 0,
      status: 'On-track',
    },
  ])

  assert.match(csv, /"'=HYPERLINK\(""https:\/\/example.com""\)"/)
  assert.match(csv, /"'\+Injected"/)
  assert.match(csv, /"'-Injected"/)
  assert.match(csv, /"'@Injected"/)
})
