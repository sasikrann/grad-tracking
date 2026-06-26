import { Router } from 'express'

import {
  addMilestone,
  copyMilestoneSet,
  deleteMilestone,
  editMilestone,
  getMilestone,
  getMilestones,
  getNextMilestoneOrder,
  reorderMilestone,
  toggleMilestone,
} from '../controllers/milestones.controller.js'

const router = Router()

router.get('/', getMilestones)
router.get('/next-order', getNextMilestoneOrder)
router.post('/', addMilestone)
router.post('/copy', copyMilestoneSet)
router.get('/:milestoneId', getMilestone)
router.put('/:milestoneId', editMilestone)
router.delete('/:milestoneId', deleteMilestone)
router.patch('/:milestoneId/enabled', toggleMilestone)
router.patch('/:milestoneId/order', reorderMilestone)

export default router
