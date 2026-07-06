import { Router } from 'express'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import multer from 'multer'

import {
  getMyStudentProfile,
  getMyStudentMilestones,
  removeMyMilestoneEvidence,
  updateMyAdvisor,
  uploadMyMilestoneEvidence,
} from '../controllers/student-profile.controller.js'

const router = Router()
const evidenceDirectory = path.resolve('uploads/evidence')
const milestoneEvidenceMaxFileSize = 2 * 1024 * 1024
const upload = multer({
  storage: multer.diskStorage({
    destination: (_request, _file, callback) => {
      mkdirSync(evidenceDirectory, { recursive: true })
      callback(null, evidenceDirectory)
    },
    filename: (_request, file, callback) => {
      const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')
      callback(null, `${Date.now()}-${safeName}`)
    },
  }),
  limits: { fileSize: milestoneEvidenceMaxFileSize },
  fileFilter: (_request, file, callback) => {
    if (/^image\/(png|jpeg)$/.test(file.mimetype)) {
      callback(null, true)
      return
    }

    const error = new Error('Evidence must be a PNG or JPG file')
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
router.put('/me/milestones/:milestoneId/evidence', uploadMilestoneEvidence, uploadMyMilestoneEvidence)
router.delete('/me/milestones/:milestoneId/evidence', removeMyMilestoneEvidence)

export default router
