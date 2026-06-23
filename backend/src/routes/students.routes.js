import { Router } from 'express'
import { getStudents } from '../controllers/students.controller.js'

const router = Router()

router.get('/', getStudents)

export default router
