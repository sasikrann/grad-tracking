import { Router } from 'express'

import {
  getCurrentUser,
  // loginForDevelopment, // Development login bypass (disabled; see auth.controller.js)
  loginWithGoogle,
} from '../controllers/auth.controller.js'
import { requireAuth } from '../middleware/auth.middleware.js'

const router = Router()

router.post('/google', loginWithGoogle)
// router.post('/dev-login', loginForDevelopment) // Development login bypass
router.get('/me', requireAuth, getCurrentUser)

export default router
