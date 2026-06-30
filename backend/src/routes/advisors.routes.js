import { Router } from 'express'
import multer from 'multer'

import { requireRole } from '../middleware/auth.middleware.js'
import {
  createAdvisor,
  deleteAdvisor,
  downloadAdvisorTemplate,
  exportAdvisors,
  getAdvisor,
  getAdvisorStudentMilestones,
  getAdvisorMilestoneSubmissions,
  getAdvisorStudents,
  getAdvisors,
  importAdvisorFile,
  reviewAdvisorStudentMilestone,
  updateAdvisor,
} from '../controllers/advisors.controller.js'

const router = Router()
const adminOnly = requireRole('admin')
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_request, file, callback) => {
    const supported = /\.(csv|xlsx)$/i.test(file.originalname)
    if (supported) {
      callback(null, true)
      return
    }
    const error = new Error('Only CSV and XLSX files are supported')
    error.statusCode = 400
    callback(error)
  },
})

router.get('/', getAdvisors)
router.get('/export', adminOnly, exportAdvisors)
router.get('/template', adminOnly, downloadAdvisorTemplate)
router.get('/milestone-submissions', getAdvisorMilestoneSubmissions)
router.get('/students/:studentId/milestones', getAdvisorStudentMilestones)
router.post('/import', adminOnly, upload.single('file'), importAdvisorFile)
router.post('/', adminOnly, createAdvisor)
router.get('/:advisorId/milestone-summary', getAdvisorMilestoneSummaryReport)
router.get('/:advisorId', getAdvisor)
router.put('/:advisorId', adminOnly, updateAdvisor)
router.delete('/:advisorId', adminOnly, deleteAdvisor)
router.get('/:advisorId/students', getAdvisorStudents)
router.patch('/students/:studentId/milestones/:milestoneId/review', reviewAdvisorStudentMilestone)

export default router
