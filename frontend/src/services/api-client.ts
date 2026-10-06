import { authenticatedFetch } from '@/services/auth'

export const apiBaseUrl = import.meta.env.VITE_API_URL || ''

interface ApiEnvelope<T> {
  data?: T
  message?: string
}

export interface ApiRequestOptions extends RequestInit {
  errorMessage?: string
}

// Combines a relative API path with the configured API base URL.
export function apiUrl(path: string) {
  return `${apiBaseUrl}${path}`
}

// Reads a response body as JSON while safely handling empty responses.
export async function readJson<T>(response: Response) {
  return (await response.json().catch(() => null)) as T | null
}

// Sends an authenticated API request and normalizes successful and error responses.
export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}) {
  const { errorMessage = 'Request failed', headers: customHeaders, ...init } = options
  const headers = new Headers(customHeaders)

  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await authenticatedFetch(apiUrl(path), {
    cache: 'no-store',
    ...init,
    headers,
  })

  if (response.status === 204) return null as T

  const result = await readJson<ApiEnvelope<T>>(response)
  if (!response.ok) {
    throw new Error(result?.message ?? `${errorMessage} (${response.status})`)
  }

  if (!result || !('data' in result)) {
    throw new Error(`${errorMessage}: invalid server response`)
  }

  return result.data as T
}

// Downloads a protected API file and derives a safe browser filename.
export async function downloadApiFile(path: string, fallbackName: string) {
  const response = await authenticatedFetch(apiUrl(path))
  if (!response.ok) throw new Error(`Unable to download file (${response.status})`)

  const blob = await response.blob()
  const disposition = response.headers.get('content-disposition') ?? ''
  const fileName = disposition.match(/filename="?([^";]+)"?/i)?.[1] ?? fallbackName
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')

  try {
    link.href = objectUrl
    link.download = fileName
    link.click()
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

// Resolves a relative API or media path into a complete request URL.
export function resolveApiUrl(path: string) {
  return /^https?:\/\//.test(path) ? path : apiUrl(path)
}
// Wraps fetch with the API base URL, authentication cookies, JSON parsing, and normalized errors.
