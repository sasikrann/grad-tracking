// ไฟล์นี้เป็น controller สำหรับจัดการข้อมูลฝั่ง Advisor
// ใช้รับ request จาก frontend แล้วส่งต่อไปเรียก service เช่น ดึงรายชื่ออาจารย์ ดึงรายชื่อนักศึกษาของ advisor
// และดึง summary ความคืบหน้า milestone ของนักศึกษา
import { ApiError } from '../errors/api-error.js'
import { findAdvisorIdByUserId } from '../services/auth.service.js'
import { findAllAdvisors } from '../services/advisors.service.js'
import { findStudentsByAdvisorId } from '../services/students.service.js'
import { findAdvisorMilestoneSummary } from '../services/milestone-summary.service.js'

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
