import { Router } from 'express'
import multer from 'multer'

import { requireRole } from '../middleware/auth.middleware.js'
import {
  createAdvisor,
  deleteAdvisor,
  downloadAdvisorTemplate,
  exportAdvisors,
  getAdvisor,
  getAdvisorMilestoneSummary,
  getAdvisorStudents,
  getAdvisors,
  importAdvisorFile,
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
router.post('/import', adminOnly, upload.single('file'), importAdvisorFile)
router.post('/', adminOnly, createAdvisor)
router.get('/:advisorId', getAdvisor)
router.put('/:advisorId', adminOnly, updateAdvisor)
router.delete('/:advisorId', adminOnly, deleteAdvisor)
router.get('/:advisorId/students', getAdvisorStudents)
router.get('/:advisorId/milestone-summary', getAdvisorMilestoneSummary)

export default router
