import { Router } from 'express'

import { viewEvidence } from '../controllers/evidence.controller.js'

const router = Router()

router.get('/', viewEvidence)

export default router
// Maps protected evidence download paths to the evidence authorization controller.
