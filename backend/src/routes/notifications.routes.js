import { Router } from 'express'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import multer from 'multer'

import {
  addNotification,
  getNotification,
  getNotifications,
  getUnreadNotificationCount,
  readAllNotifications,
  readNotification,
  uploadNotificationAttachment,
} from '../controllers/notifications.controller.js'

const router = Router()
const notificationAttachmentDirectory = path.resolve('uploads/notifications')
const notificationAttachmentMaxFileSize = 10 * 1024 * 1024
const upload = multer({
  storage: multer.diskStorage({
    destination: (_request, _file, callback) => {
      mkdirSync(notificationAttachmentDirectory, { recursive: true })
      callback(null, notificationAttachmentDirectory)
    },
    filename: (_request, file, callback) => {
      const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')
      callback(null, `${Date.now()}-${safeName}`)
    },
  }),
  limits: { fileSize: notificationAttachmentMaxFileSize },
})

function uploadNotificationFile(request, response, next) {
  upload.single('file')(request, response, (error) => {
    if (error?.code === 'LIMIT_FILE_SIZE') {
      error.clientMessage = 'Notification attachment must not exceed 10 MB'
    }
    next(error)
  })
}

router.get('/', getNotifications)
router.get('/unread-count', getUnreadNotificationCount)
router.patch('/read-all', readAllNotifications)
router.post('/attachments', uploadNotificationFile, uploadNotificationAttachment)
router.post('/', addNotification)
router.get('/:notificationId', getNotification)
router.patch('/:notificationId/read', readNotification)

export default router
