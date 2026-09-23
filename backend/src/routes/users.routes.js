import { Router } from 'express'

import {
  createUser,
  getUserById,
  getUsers,
  updateUser,
} from '../controllers/users.controller.js'

const router = Router()

router.get('/', getUsers)
router.get('/:userId', getUserById)
router.post('/', createUser)
router.put('/:userId', updateUser)

export default router
