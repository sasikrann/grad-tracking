import { Router } from 'express'

import {
  getMyStudentProfile,
  updateMyAdvisor,
} from '../controllers/student-profile.controller.js'

const router = Router()

router.get('/me', getMyStudentProfile)
router.put('/me/advisor', updateMyAdvisor)

export default router
