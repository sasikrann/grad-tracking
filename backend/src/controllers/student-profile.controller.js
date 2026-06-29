// Controller สำหรับ Student Profile
// เอาไว้ให้ student ดูข้อมูลของตัวเอง และเลือก/อัปเดต advisor พร้อมหลักฐาน
import { ApiError } from '../errors/api-error.js'
import {
  clearStudentMilestoneEvidence,
  findStudentMilestonesByUserId,
  submitStudentMilestoneEvidence,
} from '../services/milestones.service.js'
import {
  findStudentByUserId,
  updateStudentAdvisorByUserId,
} from '../services/students.service.js'

function requiredText(value, field) {
  const result = String(value ?? '').trim()
  if (!result) throw new ApiError(400, `${field} is required`)
  return result
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
    advisorEvidenceUrl: request.body.advisorEvidenceUrl,
  })

  if (!student) {
    throw new ApiError(404, 'Student profile not found')
  }

  response.json({ data: student })
}

export async function getMyStudentMilestones(request, response) {
  response.json({ data: await findStudentMilestonesByUserId(request.user.userId) })
}

export async function uploadMyMilestoneEvidence(request, response) {
  const evidenceUrl = request.file
    ? `/uploads/evidence/${request.file.filename}`
    : requiredText(request.body.evidenceUrl, 'evidenceUrl')
  const updated = await submitStudentMilestoneEvidence(
    request.user.userId,
    request.params.milestoneId,
    evidenceUrl,
  )

  if (!updated) {
    throw new ApiError(404, 'Milestone not found')
  }

  response.json({ data: await findStudentMilestonesByUserId(request.user.userId) })
}

export async function removeMyMilestoneEvidence(request, response) {
  const updated = await clearStudentMilestoneEvidence(
    request.user.userId,
    request.params.milestoneId,
  )

  if (!updated) {
    throw new ApiError(404, 'Milestone evidence not found')
  }

  response.json({ data: await findStudentMilestonesByUserId(request.user.userId) })
}
