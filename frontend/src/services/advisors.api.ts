import { authenticatedFetch } from '@/services/auth'
import type { Advisor } from '@/types/advisor'

const apiBaseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
const duplicateAdvisorEmailMessage =
  'Some advisor emails already exist. Please choose which advisor record to keep before importing.'

interface AdvisorsApiResponse {
  data?: Advisor[]
}

export interface AdvisorImportConflictOption {
  optionId: string
  source: 'existing' | 'file'
  advisorId?: string | null
  rowNumber?: number
  fullName: string
  email: string
}

export interface AdvisorImportConflict {
  key: string
  fullName: string
  email: string
  options: AdvisorImportConflictOption[]
}

export interface AdvisorImportResult {
  totalRecords: number
  successRecords: number
  failedRecords: number
  errors: string[]
}

export class AdvisorImportConflictError extends Error {
  conflicts: AdvisorImportConflict[]

  constructor(message: string, conflicts: AdvisorImportConflict[]) {
    super(message)
    this.name = 'AdvisorImportConflictError'
    this.conflicts = conflicts
  }
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

export async function updateAdvisorStatus(advisorId: string, status: Advisor['status']) {
  const response = await authenticatedFetch(`${apiBaseUrl}/api/advisors/${encodeURIComponent(advisorId)}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  })
  const result = await response.json().catch(() => null)
  if (!response.ok) throw new Error(result?.message ?? 'Unable to update advisor status')
  return result.data as Advisor
}

export function exportAdvisors() {
  return downloadAdvisorFile('/api/advisors/export', 'advisors.xlsx')
}

export function downloadAdvisorTemplate() {
  return downloadAdvisorFile('/api/advisors/template', 'advisor_import_template.xlsx')
}

export async function importAdvisors(file: File, resolutions?: Record<string, string>) {
  const formData = new FormData()
  formData.append('file', file)
  if (resolutions) {
    formData.append('resolutions', JSON.stringify(resolutions))
  }
  const response = await authenticatedFetch(`${apiBaseUrl}/api/advisors/import`, {
    method: 'POST',
    body: formData,
  })
  const result = await response.json().catch(() => null)
  if (!response.ok) {
    if (response.status === 409 && Array.isArray(result?.conflicts)) {
      throw new AdvisorImportConflictError(
        result?.message ?? duplicateAdvisorEmailMessage,
        result.conflicts,
      )
    }
    throw new Error(result?.message ?? `Unable to import advisors (${response.status})`)
  }
  return result.data as AdvisorImportResult
}
