import { getAllowedOrigins } from '../config/allowed-origins.js'
import { ApiError } from '../errors/api-error.js'

const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS'])

function requestOrigin(request) {
  const origin = request.get('origin')
  if (origin) return origin

  const referer = request.get('referer')
  if (!referer) return null

  try {
    return new URL(referer).origin
  } catch {
    return null
  }
}

export function requireTrustedOrigin(request, _response, next) {
  if (safeMethods.has(request.method.toUpperCase())) {
    next()
    return
  }

  const origin = requestOrigin(request)
  if (!origin || !getAllowedOrigins().has(origin)) {
    throw new ApiError(403, 'Request origin is not allowed')
  }

  next()
}

