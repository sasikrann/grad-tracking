import { ApiError } from '../errors/api-error.js'
import {
  countUnreadNotificationsForStudent,
  createNotification,
  findNotificationByIdForUser,
  findNotificationsForAdmin,
  findNotificationsForStudent,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '../services/notifications.service.js'

const targetAudiences = new Set(['All Students', 'Master Students', 'Doctoral Students'])

function requiredText(value, field) {
  const result = String(value ?? '').trim()
  if (!result) throw new ApiError(400, `${field} is required`)
  return result
}

function optionalText(value) {
  return String(value ?? '').trim() || null
}

function normalizeTargetAudience(value) {
  const targetAudience = requiredText(value, 'targetAudience')
  if (!targetAudiences.has(targetAudience)) {
    throw new ApiError(
      400,
      'targetAudience must be All Students, Master Students, or Doctoral Students',
    )
  }
  return targetAudience
}

function normalizeNotification(body) {
  return {
    title: requiredText(body.title, 'title'),
    message: requiredText(body.message, 'message'),
    attachmentUrl: optionalText(body.attachmentUrl),
    targetAudience: normalizeTargetAudience(body.targetAudience),
    sendEmail: Boolean(body.sendEmail),
  }
}

function requireStudent(request) {
  if (request.user.role !== 'student') {
    throw new ApiError(403, 'Only students can access student notifications')
  }
}

export async function getNotifications(request, response) {
  if (request.user.role === 'admin') {
    const targetAudience = optionalText(request.query.targetAudience)
    if (targetAudience && !targetAudiences.has(targetAudience)) {
      throw new ApiError(
        400,
        'targetAudience must be All Students, Master Students, or Doctoral Students',
      )
    }
    response.json({ data: await findNotificationsForAdmin({ targetAudience }) })
    return
  }

  requireStudent(request)
  response.json({ data: await findNotificationsForStudent(request.user.userId) })
}

export async function getNotification(request, response) {
  const notification = await findNotificationByIdForUser(request.params.notificationId, request.user)
  if (!notification) throw new ApiError(404, 'Notification not found')
  response.json({ data: notification })
}

export async function addNotification(request, response) {
  if (request.user.role !== 'admin') {
    throw new ApiError(403, 'Only admins can create notifications')
  }

  const notification = await createNotification(
    normalizeNotification(request.body),
    request.user.userId,
  )
  response.status(201).json({ data: notification })
}

export async function uploadNotificationAttachment(request, response) {
  if (request.user.role !== 'admin') {
    throw new ApiError(403, 'Only admins can upload notification attachments')
  }

  if (!request.file) {
    throw new ApiError(400, 'Attachment file is required')
  }

  response.status(201).json({
    data: {
      fileName: request.file.originalname,
      url: `/uploads/notifications/${request.file.filename}`,
    },
  })
}

export async function getUnreadNotificationCount(request, response) {
  requireStudent(request)
  response.json({
    data: {
      count: await countUnreadNotificationsForStudent(request.user.userId),
    },
  })
}

export async function readNotification(request, response) {
  requireStudent(request)
  const readRecord = await markNotificationAsRead(request.params.notificationId, request.user.userId)
  if (!readRecord) throw new ApiError(404, 'Notification not found')
  response.json({ data: readRecord })
}

export async function readAllNotifications(request, response) {
  requireStudent(request)
  response.json({
    data: {
      updatedRecords: await markAllNotificationsAsRead(request.user.userId),
    },
  })
}
