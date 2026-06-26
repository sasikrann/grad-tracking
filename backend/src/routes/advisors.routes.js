import { Router } from 'express'
import {
  getAdvisors,
  getAdvisorMilestoneSummary,
  getAdvisorStudents,
} from '../controllers/advisors.controller.js'

const router = Router()

router.get('/', getAdvisors)
router.get('/:advisorId/students', getAdvisorStudents)
router.get('/:advisorId/milestone-summary', getAdvisorMilestoneSummary)

export default router
