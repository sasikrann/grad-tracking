// Controller สำหรับ Student Profile
// เอาไว้ให้ student ดูข้อมูลของตัวเอง และเลือก/อัปเดต advisor พร้อมหลักฐาน
import { unlink } from 'node:fs/promises'

import { ApiError } from '../errors/api-error.js'
import {
  clearStudentMilestoneEvidence,
  findStudentMilestonesByUserId,
  hasReachedRejectedRevisionLimit,
  submitStudentMilestoneEvidence,
} from '../services/milestones.service.js'
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

function requiredText(value, field) {
  const result = String(value ?? '').trim()
  if (!result) throw new ApiError(400, `${field} is required`)
  return result
}

function removeUploadedFile(file) {
  if (!file?.path) return Promise.resolve()
  return unlink(file.path).catch(() => {})
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

export async function getMyStudentMilestones(request, response) {
  response.json({ data: await findStudentMilestonesByUserId(request.user.userId) })
}

export async function uploadMyMilestoneEvidence(request, response) {
  const evidenceUrl = request.file
    ? `/uploads/evidence/${request.file.filename}`
    : requiredText(request.body.evidenceUrl, 'evidenceUrl')
  const student = await findStudentByUserId(request.user.userId)

  if (!student?.advisorId) {
    await removeUploadedFile(request.file)
    throw new ApiError(409, 'Please select an advisor before uploading milestone evidence')
  }

  const updated = await submitStudentMilestoneEvidence(
    request.user.userId,
    request.params.milestoneId,
    evidenceUrl,
  )

  if (!updated) {
    await removeUploadedFile(request.file)

    if (await hasReachedRejectedRevisionLimit(request.user.userId, request.params.milestoneId)) {
      throw new ApiError(409, 'This milestone has reached the maximum of 3 rejected revision rounds')
    }

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
