import { apiRequest, downloadApiFile, readJson, apiUrl } from '@/services/api-client'
import { authenticatedFetch } from '@/services/auth'
import type { Advisor } from '@/types/advisor'

interface AdvisorsApiResponse {
  data?: Advisor[]
}

export interface AdvisorImportResult {
  totalRecords: number
  successRecords: number
  createdRecords?: number
  updatedRecords?: number
  unchangedRecords?: number
  failedRecords: number
  errors: string[]
}

export async function getAdvisors() {
  const result = await apiRequest<Advisor[]>('/api/advisors', {
    errorMessage: 'Unable to load advisors',
  })
  return Array.isArray(result) ? result : []
}

export async function getAdvisorsPage(input: { page: number; limit?: number; search?: string }) {
  const query = new URLSearchParams({ page: String(input.page), limit: String(input.limit ?? 10) })
  if (input.search?.trim()) query.set('search', input.search.trim())
  const response = await authenticatedFetch(apiUrl(`/api/advisors?${query}`), { cache: 'no-store' })
  const result = await readJson<{
    data?: Advisor[]
    pagination?: { page: number; limit: number; totalRecords: number; totalPages: number }
    message?: string
  }>(response)
  if (!response.ok || !result?.pagination) {
    throw new Error(result?.message ?? `Unable to load advisors (${response.status})`)
  }
  return { advisors: result.data ?? [], pagination: result.pagination }
}

export async function updateAdvisorStatus(advisorId: string, status: Advisor['status']) {
  return apiRequest<Advisor>(`/api/advisors/${encodeURIComponent(advisorId)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
    errorMessage: 'Unable to update advisor status',
  })
}

export function exportAdvisors() {
  return downloadApiFile('/api/advisors/export', 'advisors.xlsx')
}

export function downloadAdvisorTemplate() {
  return downloadApiFile('/api/advisors/template', 'advisor_import_template.xlsx')
}

export async function importAdvisors(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  const response = await authenticatedFetch(apiUrl('/api/advisors/import'), {
    method: 'POST',
    body: formData,
  })
  const result = await readJson<{
    data?: AdvisorImportResult
    message?: string
    errors?: string[]
  }>(response)
  if (!response.ok) {
    throw new Error(result?.errors?.join('\n') || result?.message || `Unable to import advisors (${response.status})`)
  }
  if (!result?.data) throw new Error('Unable to import advisors: invalid server response')
  return result.data
}
