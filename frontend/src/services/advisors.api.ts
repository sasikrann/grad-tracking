import { apiRequest, downloadApiFile, readJson, apiUrl } from '@/services/api-client'
import { authenticatedFetch } from '@/services/auth'
import type { Advisor } from '@/types/advisor'

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

export async function getAdvisors() {
  const result = await apiRequest<Advisor[]>('/api/advisors', {
    errorMessage: 'Unable to load advisors',
  })
  return Array.isArray(result) ? result : []
}

export async function updateAdvisorStatus(advisorId: string, status: Advisor['status']) {
  return apiRequest<Advisor>(`/api/advisors/${encodeURIComponent(advisorId)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
    errorMessage: 'Unable to update advisor status',
  })
}

export async function deleteAdvisor(advisorId: string) {
  await apiRequest<void>(`/api/advisors/${encodeURIComponent(advisorId)}`, {
    method: 'DELETE',
    errorMessage: 'Unable to delete advisor',
  })
}

export function exportAdvisors() {
  return downloadApiFile('/api/advisors/export', 'advisors.xlsx')
}

export function downloadAdvisorTemplate() {
  return downloadApiFile('/api/advisors/template', 'advisor_import_template.xlsx')
}

export async function importAdvisors(file: File, resolutions?: Record<string, string>) {
  const formData = new FormData()
  formData.append('file', file)
  if (resolutions) {
    formData.append('resolutions', JSON.stringify(resolutions))
  }
  const response = await authenticatedFetch(apiUrl('/api/advisors/import'), {
    method: 'POST',
    body: formData,
  })
  const result = await readJson<{
    data?: AdvisorImportResult
    message?: string
    conflicts?: AdvisorImportConflict[]
  }>(response)
  if (!response.ok) {
    if (response.status === 409 && Array.isArray(result?.conflicts)) {
      throw new AdvisorImportConflictError(
        result?.message ?? duplicateAdvisorEmailMessage,
        result?.conflicts ?? [],
      )
    }
    throw new Error(result?.message ?? `Unable to import advisors (${response.status})`)
  }
  if (!result?.data) throw new Error('Unable to import advisors: invalid server response')
  return result.data
}
