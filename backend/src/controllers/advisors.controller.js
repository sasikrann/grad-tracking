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
import { findAdvisorMilestoneSummary } from '../services/milestone-summary.service.js'
import { findStudentsByAdvisorId } from '../services/students.service.js'

export function parseMilestoneSummaryFilters(query = {}) {
  const semesterValue = query.semester === undefined ? 'all' : String(query.semester).trim()
  const yearValue = query.year === undefined ? 'all' : String(query.year).trim()

  if (!['all', '1', '2'].includes(semesterValue)) {
    throw new ApiError(400, 'semester must be all, 1, or 2')
  }

  if (yearValue !== 'all' && !/^\d{4}$/.test(yearValue)) {
    throw new ApiError(400, 'year must be all or a four-digit year')
  }

  const year = yearValue === 'all' ? null : Number(yearValue)

  if (year !== null && (year < 2000 || year > 3000)) {
    throw new ApiError(400, 'year must be between 2000 and 3000')
  }

  return {
    semester: semesterValue === 'all' ? null : semesterValue,
    year,
  }
}

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

export async function getAdvisorMilestoneSummary(request, response) {
  if (request.user.role === 'student') {
    throw new ApiError(403, 'Students cannot access advisor milestone summaries')
  }

  const filters = parseMilestoneSummaryFilters(request.query)
  const summary = await findAdvisorMilestoneSummary({
    advisorId: request.params.advisorId,
    ...filters,
  })

  response.json({ data: summary })
}
