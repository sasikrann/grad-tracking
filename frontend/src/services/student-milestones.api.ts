import { apiRequest, resolveApiUrl } from '@/services/api-client'
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

export function resolveEvidenceUrl(evidenceUrl: string) {
  return resolveApiUrl(evidenceUrl)
}
