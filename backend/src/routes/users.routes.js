import { Router } from 'express'

import {
  createUser,
  deleteUser,
  getUserById,
  getUsers,
  updateUser,
} from '../controllers/users.controller.js'

const router = Router()

router.get('/', getUsers)
router.get('/:userId', getUserById)
router.post('/', createUser)
router.put('/:userId', updateUser)
router.delete('/:userId', deleteUser)

export default router
