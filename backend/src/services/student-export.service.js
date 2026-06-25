const headers = [
  'Student ID',
  'Full Name',
  'Program',
  'Degree Level',
  'Enrollment Academic Year',
  'Semester',
  'Year',
  'Advisor ID',
  'Advisor Name',
  'Progress (%)',
  'Status',
]

function safeSpreadsheetValue(value) {
  const text = value === null || value === undefined ? '' : String(value)
  return /^[=+\-@]/.test(text) ? `'${text}` : text
}

function csvCell(value) {
  return `"${safeSpreadsheetValue(value).replaceAll('"', '""')}"`
}

export function buildStudentExportCsv(students) {
  const rows = students.map((student) => [
    student.studentId,
    student.fullName,
    student.program,
    student.degreeLevel,
    student.enrollmentAcademicYear,
    student.semester,
    student.expectedGraduationYear,
    student.advisorId,
    student.advisorName,
    student.progress,
    student.status,
  ])

  return `\uFEFF${[headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')}`
}
