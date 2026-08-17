import { apiRequest, apiUrl, readJson } from '@/services/api-client'
import { authenticatedFetch } from '@/services/auth'
import type { StudentMilestone } from '@/types/milestone'

const request = <T>(path: string, options?: RequestInit) =>
  apiRequest<T>(path, { ...options, errorMessage: 'Student milestone request failed' })

export function getMyStudentMilestones() {
  return request<StudentMilestone[]>('/api/student-profile/me/milestones')
}

export function uploadMyMilestoneEvidence(milestoneId: string, file: File) {
  const body = new FormData()
  body.append('file', file)

  return request<StudentMilestone[]>(
    `/api/student-profile/me/milestones/${encodeURIComponent(milestoneId)}/evidence`,
    {
      method: 'PUT',
      body,
    },
  )
}

export function removeMyMilestoneEvidence(milestoneId: string) {
  return request<StudentMilestone[]>(`/api/student-profile/me/milestones/${milestoneId}/evidence`, {
    method: 'DELETE',
  })
}

export async function createEvidencePreviewUrl(evidenceUrl: string) {
  const response = await authenticatedFetch(
    apiUrl(`/api/evidence?path=${encodeURIComponent(evidenceUrl)}`),
    { cache: 'no-store' },
  )
  if (!response.ok) {
    const result = await readJson<{ message?: string }>(response)
    throw new Error(result?.message ?? `Unable to open evidence (${response.status})`)
  }
  return URL.createObjectURL(await response.blob())
}
