import { Router } from 'express'
import multer from 'multer'

import {
  createStudent,
  deleteStudent,
  downloadStudentTemplate,
  exportStudents,
  getStudent,
  getStudentMilestones,
  getStudents,
  importStudentFile,
  updateStudent,
} from '../controllers/students.controller.js'

// 5 MB limit
const router = Router()
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

router.get('/', getStudents)
router.get('/export', exportStudents)
router.get('/template', downloadStudentTemplate)
router.post('/import', upload.single('file'), importStudentFile)
router.get('/:studentId/milestones', getStudentMilestones)
router.get('/:studentId', getStudent)
router.post('/', createStudent)
router.put('/:studentId', updateStudent)
router.delete('/:studentId', deleteStudent)

export default router
