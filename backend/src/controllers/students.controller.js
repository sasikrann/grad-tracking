// Controller for student CRUD, import/export, and milestone overview.
import { ApiError } from '../errors/api-error.js'
import {
  createStudentExportBuffer,
  createStudentTemplateBuffer,
  normalizeStudent,
  readStudentImportFile,
} from '../services/student-files.service.js'
import { findStudentMilestonesByStudentId } from '../services/milestones.service.js'
import {
  findAllStudents,
  findStudentById,
  grantStudentStudyExtension,
  findStudentsForExport,
  findStudentsPage,
  importStudents,
  insertStudent,
  removeStudent,
  replaceStudent,
} from '../services/students.service.js'

export async function getStudents(request, response) {
  if (!request.query.page) {
    response.json({ data: await findAllStudents() })
    return
  }

  const result = await findStudentsPage({
    page: request.query.page,
    limit: request.query.limit,
    search: String(request.query.search ?? '').trim(),
    semester: request.query.semester,
    year: request.query.year,
    degree: request.query.degree === 'Ph. D.' ? 'Doctoral' : request.query.degree,
    plan: request.query.plan,
    status: request.query.status,
  })
  response.json({ data: result.students, pagination: result.pagination, statistics: result.statistics, filterOptions: result.filterOptions })
}

export async function getStudent(request, response) {
  const student = await findStudentById(request.params.studentId)
  if (!student) throw new ApiError(404, 'Student not found')
  response.json({ data: student })
}

export async function extendStudentStudyPeriod(request, response) {
  const student = await grantStudentStudyExtension(request.params.studentId)
  if (!student) {
    const existingStudent = await findStudentById(request.params.studentId)
    if (!existingStudent) throw new ApiError(404, 'Student not found')
    throw new ApiError(409, 'Study extension is available only for overdue students who have not been extended')
  }
  response.json({ data: student })
}

export async function getStudentMilestones(request, response) {
  const result = await findStudentMilestonesByStudentId(request.params.studentId)
  if (!result) throw new ApiError(404, 'Student not found')
  response.json({ data: result })
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
  const records = await readStudentImportFile(request.file)
  const result = await importStudents(records, {
    fileName: request.file.originalname,
    importedBy: request.user.userId,
  })

  response.status(201).json({ data: result })
}

export async function exportStudents(request, response) {
  const studentIds = Array.isArray(request.body.studentIds)
    ? request.body.studentIds.map((value) => String(value).trim()).filter(Boolean)
    : []
  if (!studentIds.length) throw new ApiError(400, 'At least one displayed student is required')

  const language = request.body.language === 'th' ? 'th' : 'en'
  const buffer = await createStudentExportBuffer(
    await findStudentsForExport({ studentIds }),
    { language },
  )

  response.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  response.setHeader(
    'Content-Disposition',
    'attachment; filename="students-visible-table.xlsx"',
  )
  response.send(buffer)
}

export async function downloadStudentTemplate(_request, response) {
  const buffer = await createStudentTemplateBuffer()

  response.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  response.setHeader('Content-Disposition', 'attachment; filename="student_import_template.xlsx"')
  response.send(buffer)
}
