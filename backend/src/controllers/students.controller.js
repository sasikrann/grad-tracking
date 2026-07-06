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
  findStudentsForExport,
  importStudents,
  insertStudent,
  removeStudent,
  replaceStudent,
} from '../services/students.service.js'

export async function getStudents(_request, response) {
  response.json({ data: await findAllStudents() })
}

export async function getStudent(request, response) {
  const student = await findStudentById(request.params.studentId)
  if (!student) throw new ApiError(404, 'Student not found')
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
  let resolutions

  try {
    resolutions = request.body.resolutions ? JSON.parse(request.body.resolutions) : undefined
  } catch (_error) {
    throw new ApiError(400, 'Invalid student import resolutions')
  }

  try {
    const result = await importStudents(records, {
      fileName: request.file.originalname,
      importedBy: request.user.userId,
      resolutions,
    })

    response.status(201).json({ data: result })
  } catch (error) {
    if (error.statusCode === 409 && Array.isArray(error.conflicts)) {
      response.status(409).json({
        status: 'error',
        message: error.message,
        conflicts: error.conflicts,
      })
      return
    }

    throw error
  }
}

export async function exportStudents(request, response) {
  const enrollmentYear = String(request.query.enrollmentYear ?? '').trim()
  const buffer = await createStudentExportBuffer(
    await findStudentsForExport({ enrollmentYear: enrollmentYear || null }),
  )

  response.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  response.setHeader(
    'Content-Disposition',
    `attachment; filename="students${enrollmentYear ? `-enrollment-${enrollmentYear}` : ''}.xlsx"`,
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
