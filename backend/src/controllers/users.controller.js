import { ApiError } from '../errors/api-error.js'
import {
  findAllUsers,
  findUserById,
  insertUser,
  removeUser,
  replaceUser,
} from '../services/users.service.js'

const validRoles = new Set(['student', 'advisor', 'admin'])
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validateUserId(userId) {
  if (!uuidPattern.test(userId)) {
    throw new ApiError(400, 'userId must be a valid UUID')
  }
}

function validateUserBody(body) {
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : ''
  const role = body.role

  if (!email || !emailPattern.test(email)) {
    throw new ApiError(400, 'A valid email is required')
  }

  if (!fullName) {
    throw new ApiError(400, 'fullName is required')
  }

  if (!validRoles.has(role)) {
    throw new ApiError(400, 'role must be student, advisor, or admin')
  }

  return { email, fullName, role }
}

export async function getUsers(_request, response) {
  const users = await findAllUsers()
  response.json({ data: users })
}

export async function getUserById(request, response) {
  validateUserId(request.params.userId)
  const user = await findUserById(request.params.userId)

  if (!user) {
    throw new ApiError(404, 'User not found')
  }

  response.json({ data: user })
}

export async function createUser(request, response) {
  const input = validateUserBody(request.body)
  const user = await insertUser(input)
  response.status(201).json({ data: user })
}

export async function updateUser(request, response) {
  validateUserId(request.params.userId)
  const input = validateUserBody(request.body)
  const user = await replaceUser(request.params.userId, input)

  if (!user) {
    throw new ApiError(404, 'User not found')
  }

  response.json({ data: user })
}

export async function deleteUser(request, response) {
  validateUserId(request.params.userId)
  const deleted = await removeUser(request.params.userId)

  if (!deleted) {
    throw new ApiError(404, 'User not found')
  }

  response.status(204).send()
}
