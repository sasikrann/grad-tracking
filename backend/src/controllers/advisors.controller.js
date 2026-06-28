// Controller for advisor CRUD, import/export, and advised student lists.
import { ApiError } from '../errors/api-error.js'
import {
  createAdvisorExportBuffer,
  createAdvisorTemplateBuffer,
  normalizeAdvisor,
  readAdvisorImportFile,
} from '../services/advisor-files.service.js'
import {
  findAdvisorById,
  findAllAdvisors,
  importAdvisors,
  insertAdvisor,
  removeAdvisor,
  replaceAdvisor,
} from '../services/advisors.service.js'
import { findAdvisorIdByUserId } from '../services/auth.service.js'
import { findStudentsByAdvisorId } from '../services/students.service.js'

export async function getAdvisors(_request, response) {
  response.json({ data: await findAllAdvisors() })
}

export async function getAdvisor(request, response) {
  const advisor = await findAdvisorById(request.params.advisorId)
  if (!advisor) throw new ApiError(404, 'Advisor not found')
  response.json({ data: advisor })
}

export async function createAdvisor(request, response) {
  const advisor = await insertAdvisor(normalizeAdvisor(request.body))
  response.status(201).json({ data: advisor })
}

export async function updateAdvisor(request, response) {
  const advisor = await replaceAdvisor(
    request.params.advisorId,
    normalizeAdvisor(request.body, { advisorId: request.params.advisorId }),
  )
  if (!advisor) throw new ApiError(404, 'Advisor not found')
  response.json({ data: advisor })
}

export async function deleteAdvisor(request, response) {
  if (!(await removeAdvisor(request.params.advisorId))) {
    throw new ApiError(404, 'Advisor not found')
  }
  response.status(204).send()
}

export async function importAdvisorFile(request, response) {
  if (!request.file) throw new ApiError(400, 'A CSV or XLSX file is required')
  const records = await readAdvisorImportFile(request.file)
  const result = await importAdvisors(records, {
    fileName: request.file.originalname,
    importedBy: request.user.userId,
  })
  response.status(201).json({ data: result })
}

export async function exportAdvisors(_request, response) {
  const buffer = await createAdvisorExportBuffer(await findAllAdvisors())

  response.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  response.setHeader('Content-Disposition', 'attachment; filename="advisors.xlsx"')
  response.send(buffer)
}

export async function downloadAdvisorTemplate(_request, response) {
  const buffer = await createAdvisorTemplateBuffer()

  response.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  response.setHeader('Content-Disposition', 'attachment; filename="advisor_import_template.xlsx"')
  response.send(buffer)
}

export async function getAdvisorStudents(request, response) {
  const requestedAdvisorId = request.params.advisorId

  if (request.user.role === 'student') {
    throw new ApiError(403, 'Students cannot access advisor student lists')
  }

  if (request.user.role === 'advisor') {
    const advisorId = await findAdvisorIdByUserId(request.user.userId)

    if (!advisorId || advisorId !== requestedAdvisorId) {
      throw new ApiError(403, 'You can only access your own advised students')
    }
  }

  const students = await findStudentsByAdvisorId(requestedAdvisorId)

  response.json({
    data: students,
  })
}
