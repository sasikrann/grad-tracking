import { Router } from 'express'
import {
  getAdvisorMilestoneSummary,
  getAdvisorStudents,
} from '../controllers/advisors.controller.js'

const router = Router()

router.get('/:advisorId/students', getAdvisorStudents)
router.get('/:advisorId/milestone-summary', getAdvisorMilestoneSummary)

export default router
