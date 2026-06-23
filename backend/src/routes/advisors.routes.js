import { Router } from 'express'
import { getAdvisorStudents } from '../controllers/advisors.controller.js'

const router = Router()

router.get('/:advisorId/students', getAdvisorStudents)

export default router
