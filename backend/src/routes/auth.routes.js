import { Router } from 'express'

import { getCurrentUser, loginWithGoogle } from '../controllers/auth.controller.js'
import { requireAuth } from '../middleware/auth.middleware.js'

const router = Router()

router.post('/google', loginWithGoogle)
router.get('/me', requireAuth, getCurrentUser)

export default router
