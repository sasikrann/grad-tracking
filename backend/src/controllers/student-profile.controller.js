// Controller สำหรับ Student Profile
// เอาไว้ให้ student ดูข้อมูลของตัวเอง และเลือก/อัปเดต advisor พร้อมหลักฐาน
import { ApiError } from '../errors/api-error.js'
import {
  findStudentByUserId,
  updateStudentAdvisorByUserId,
} from '../services/students.service.js'

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
    advisorEvidenceUrl: request.body.advisorEvidenceUrl,
  })

  if (!student) {
    throw new ApiError(404, 'Student profile not found')
  }

  response.json({ data: student })
}
