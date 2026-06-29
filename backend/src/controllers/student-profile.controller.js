// Controller สำหรับ Student Profile
// เอาไว้ให้ student ดูข้อมูลของตัวเอง และเลือก/อัปเดต advisor พร้อมหลักฐาน
import { ApiError } from '../errors/api-error.js'
import {
  findStudentByUserId,
  updateStudentAdvisorByUserId,
} from '../services/students.service.js'

const maxAdvisorEvidenceFileSize = 2 * 1024 * 1024
const advisorEvidencePattern = /^data:(image\/png|image\/jpeg);base64,([A-Za-z0-9+/]+={0,2})$/

function normalizeAdvisorEvidenceUrl(value) {
  if (value === null || value === undefined || value === '') return value
  if (typeof value !== 'string') {
    throw new ApiError(400, 'Supporting document must be a PNG or JPG file')
  }

  const match = value.match(advisorEvidencePattern)
  if (!match) {
    throw new ApiError(400, 'Supporting document must be a PNG or JPG file')
  }

  const fileSize = Buffer.byteLength(match[2], 'base64')
  if (fileSize > maxAdvisorEvidenceFileSize) {
    throw new ApiError(413, 'Supporting document must not exceed 2 MB')
  }

  return value
}

export async function getMyStudentProfile(request, response) {
  const student = await findStudentByUserId(request.user.userId)

  if (!student) {
    throw new ApiError(404, 'Student profile not found')
  }

  response.json({ data: student })
}

export async function updateMyAdvisor(request, response) {
  const student = await updateStudentAdvisorByUserId(request.user.userId, {
    advisorId: request.body.advisorId,
    advisorEmail: request.body.advisorEmail,
    advisorName: request.body.advisorName,
    advisorEvidenceUrl: normalizeAdvisorEvidenceUrl(request.body.advisorEvidenceUrl),
  })

  if (!student) {
    throw new ApiError(404, 'Student profile not found')
  }

  response.json({ data: student })
}
