import { authenticatedFetch } from '@/services/auth'

export const apiBaseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

interface ApiEnvelope<T> {
  data?: T
  message?: string
}

export interface ApiRequestOptions extends RequestInit {
  errorMessage?: string
}

export function apiUrl(path: string) {
  return `${apiBaseUrl}${path}`
}

export async function readJson<T>(response: Response) {
  return (await response.json().catch(() => null)) as T | null
}

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

export function resolveApiUrl(path: string) {
  return /^https?:\/\//.test(path) ? path : apiUrl(path)
}
