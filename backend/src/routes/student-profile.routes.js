import { Router } from 'express'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import multer from 'multer'

import { findStudentMilestoneEvidenceFileDetails } from '../services/milestone-evidence.service.js'

import {
  appointMyAdvisors,
  getMyStudentProfile,
  getMyStudentMilestones,
  removeMyMilestoneEvidence,
  submitMyGraduation,
  updateMyAdvisor,
  uploadMyMilestoneEvidence,
} from '../controllers/student-profile.controller.js'

const router = Router()
const evidenceDirectory = path.resolve('uploads/evidence')
const milestoneEvidenceMaxFileSize = 2 * 1024 * 1024
const evidenceExtensionByMimeType = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'application/pdf': '.pdf',
}

function currentBangkokTimestamp() {
  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const value = Object.fromEntries(parts.map(({ type, value: partValue }) => [type, partValue]))
  const milliseconds = String(now.getMilliseconds()).padStart(3, '0')
  return `${value.year}${value.month}${value.day}-${value.hour}${value.minute}${value.second}${milliseconds}`
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_request, _file, callback) => {
      mkdirSync(evidenceDirectory, { recursive: true })
      callback(null, evidenceDirectory)
    },
    filename: (request, file, callback) => {
      findStudentMilestoneEvidenceFileDetails(request.user.userId, request.params.milestoneId)
        .then((details) => {
          if (!details) {
            const error = new Error('Milestone not found')
            error.statusCode = 404
            callback(error)
            return
          }
          const extension = evidenceExtensionByMimeType[file.mimetype]
          callback(null, `${details.evidenceCode}-${details.studentId}-${currentBangkokTimestamp()}${extension}`)
        })
        .catch(callback)
    },
  }),
  limits: { fileSize: milestoneEvidenceMaxFileSize },
  fileFilter: (_request, file, callback) => {
    if (/^image\/(png|jpeg)$/.test(file.mimetype) || file.mimetype === 'application/pdf') {
      callback(null, true)
      return
    }

    const error = new Error('Unsupported evidence file type')
    error.statusCode = 400
    callback(error)
  },
})

function uploadMilestoneEvidence(request, response, next) {
  upload.single('file')(request, response, (error) => {
    if (error?.code === 'LIMIT_FILE_SIZE') {
      error.clientMessage = 'Milestone evidence must not exceed 2 MB'
    }
    next(error)
  })
}

router.get('/me', getMyStudentProfile)
router.get('/me/milestones', getMyStudentMilestones)
router.put('/me/advisor', updateMyAdvisor)
router.put('/me/milestones/:milestoneId/advisors', appointMyAdvisors)
router.put('/me/milestones/:milestoneId/graduation', submitMyGraduation)
router.put('/me/milestones/:milestoneId/evidence', uploadMilestoneEvidence, uploadMyMilestoneEvidence)
router.delete('/me/milestones/:milestoneId/evidence', removeMyMilestoneEvidence)

export default router
