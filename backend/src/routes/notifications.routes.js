import { Router } from 'express'

import {
  addNotification,
  getNotification,
  getNotifications,
  getUnreadNotificationCount,
  readAllNotifications,
  readNotification,
} from '../controllers/notifications.controller.js'

const router = Router()

router.get('/', getNotifications)
router.get('/unread-count', getUnreadNotificationCount)
router.patch('/read-all', readAllNotifications)
router.post('/', addNotification)
router.get('/:notificationId', getNotification)
router.patch('/:notificationId/read', readNotification)

export default router
