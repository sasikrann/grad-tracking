// ใช้สร้างและตรวจสอบ JWT token รวมถึงเช็คสิทธิ์ของ user ตาม role เช่น student, advisor, admin
import jwt from 'jsonwebtoken'

import { ApiError } from '../errors/api-error.js'

const tokenIssuer = 'grad-tracking'
const tokenAudience = 'grad-tracking-web'

// ดึง JWT_SECRET จาก .env ถ้าไม่มีจะ error เพราะระบบ auth ยังไม่ได้ตั้งค่า
function getJwtSecret() {
  const secret = process.env.JWT_SECRET

  if (!secret) {
    throw new ApiError(503, 'Authentication is not configured')
  }

  return secret
}

// ดึง JWT_SECRET จาก .env ถ้าไม่มีจะ error เพราะระบบ auth ยังไม่ได้ตั้งค่า
export function createAccessToken(user) {
  return jwt.sign(
    {
      email: user.email,
      role: user.role,
    },
    getJwtSecret(),
    {
      subject: user.userId,
      issuer: tokenIssuer,
      audience: tokenAudience,
      expiresIn: '8h',
    },
  )
}

export function requireAuth(request, _response, next) {
  const authorization = request.get('authorization') ?? ''
  const [scheme, token] = authorization.split(' ')

  if (scheme !== 'Bearer' || !token) {
    throw new ApiError(401, 'Authentication is required')
  }
  
// ตรวจสอบ token ว่าถูกต้อง หมดอายุ หรือถูกแก้ไขไหม
  try {
    const payload = jwt.verify(token, getJwtSecret(), {
      issuer: tokenIssuer,
      audience: tokenAudience,
    })

    if (
      typeof payload === 'string' ||
      typeof payload.sub !== 'string' ||
      typeof payload.email !== 'string' ||
      typeof payload.role !== 'string'
    ) {
      throw new Error('Invalid token payload')
    }

    request.user = {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
    }
    next()
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError(401, 'Invalid or expired session')
  }
}

export function requireRole(...allowedRoles) {
  return function authorizeRole(request, _response, next) {
    if (!request.user || !allowedRoles.includes(request.user.role)) {
      throw new ApiError(403, 'You do not have permission to access this resource')
    }

    next()
  }
}
