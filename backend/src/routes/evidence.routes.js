import { Router } from 'express'

import { viewEvidence } from '../controllers/evidence.controller.js'

const router = Router()

router.get('/', viewEvidence)

export default router
