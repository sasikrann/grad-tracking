import { authenticatedFetch } from '@/services/auth'
import type { Advisor } from '@/types/advisor'

const apiBaseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

interface AdvisorsApiResponse {
  data?: Advisor[]
}

async function downloadAdvisorFile(path: string, fallbackName: string) {
  const response = await authenticatedFetch(`${apiBaseUrl}${path}`)
  if (!response.ok) throw new Error(`Unable to download file (${response.status})`)

  const blob = await response.blob()
  const disposition = response.headers.get('content-disposition') ?? ''
  const fileName = disposition.match(/filename="?([^";]+)"?/i)?.[1] ?? fallbackName
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

export async function getAdvisors() {
  const response = await authenticatedFetch(`${apiBaseUrl}/api/advisors`)
  if (!response.ok) throw new Error(`Unable to load advisors (${response.status})`)

  const result = (await response.json()) as AdvisorsApiResponse
  return Array.isArray(result.data) ? result.data : []
}

export function exportAdvisors() {
  return downloadAdvisorFile('/api/advisors/export', 'advisors.xlsx')
}

export function downloadAdvisorTemplate() {
  return downloadAdvisorFile('/api/advisors/template', 'advisor_import_template.xlsx')
}

export async function importAdvisors(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  const response = await authenticatedFetch(`${apiBaseUrl}/api/advisors/import`, {
    method: 'POST',
    body: formData,
  })
  const result = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(result?.message ?? `Unable to import advisors (${response.status})`)
  }
  return result.data as {
    totalRecords: number
    successRecords: number
    failedRecords: number
    errors: string[]
  }
}
