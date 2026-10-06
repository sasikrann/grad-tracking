const defaultDevelopmentOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]

function normalizeOrigin(value) {
  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

// Returns every browser origin that is allowed to call the API.
export function getAllowedOrigins() {
  const configuredOrigins = [
    ...(process.env.FRONTEND_ORIGINS ?? '').split(','),
    process.env.FRONTEND_ORIGIN,
  ]

  if (process.env.NODE_ENV !== 'production') {
    configuredOrigins.push(...defaultDevelopmentOrigins)
  }

  return new Set(
    configuredOrigins
      .map((origin) => String(origin ?? '').trim())
      .filter(Boolean)
      .map(normalizeOrigin)
      .filter(Boolean),
  )
}
// Builds the allowlist used by CORS and state-changing request origin checks.
