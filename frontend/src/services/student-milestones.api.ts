import { authenticatedFetch } from '@/services/auth'
import type { StudentMilestone } from '@/types/milestone'

const apiBaseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

interface ApiResponse<T> {
  data: T
}

async function request<T>(path: string, options?: RequestInit) {
  const response = await authenticatedFetch(`${apiBaseUrl}${path}`, {
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })

  if (!response.ok) {
    const result = await response.json().catch(() => null)
    throw new Error(result?.message ?? `Student milestone request failed (${response.status})`)
  }

  const result = (await response.json()) as ApiResponse<T>
  return result.data
}

export function getMyStudentMilestones() {
  return request<StudentMilestone[]>('/api/student-profile/me/milestones')
}

export async function uploadMyMilestoneEvidence(milestoneId: string, file: File) {
  const body = new FormData()
  body.append('file', file)

  const response = await authenticatedFetch(
    `${apiBaseUrl}/api/student-profile/me/milestones/${milestoneId}/evidence`,
    {
      method: 'PUT',
      body,
    },
  )

  if (!response.ok) {
    const result = await response.json().catch(() => null)
    throw new Error(result?.message ?? `Student milestone request failed (${response.status})`)
  }

  const result = (await response.json()) as ApiResponse<StudentMilestone[]>
  return result.data
}

export function removeMyMilestoneEvidence(milestoneId: string) {
  return request<StudentMilestone[]>(`/api/student-profile/me/milestones/${milestoneId}/evidence`, {
    method: 'DELETE',
  })
}

export function resolveEvidenceUrl(evidenceUrl: string) {
  if (evidenceUrl.startsWith('http://') || evidenceUrl.startsWith('https://')) return evidenceUrl
  return `${apiBaseUrl}${evidenceUrl}`
}
