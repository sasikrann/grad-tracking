import { authenticatedFetch } from '@/services/auth'
import { resolveEvidenceUrl } from '@/services/student-milestones.api'
import type { StudentMilestoneStatus } from '@/types/milestone'

const apiBaseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

interface ApiResponse<T> {
  data: T
}

export interface AdvisorMilestoneSubmission {
  studentId: string
  studentName: string
  milestoneId: string
  title: string
  description: string | null
  deadline: string
  status: StudentMilestoneStatus
  evidenceUrl: string
  advisorComment: string | null
  submittedAt: string | null
  reviewedAt: string | null
}

async function request<T>(path: string, options?: RequestInit) {
  const response = await authenticatedFetch(`${apiBaseUrl}${path}`, {
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })

  if (!response.ok) {
    const result = await response.json().catch(() => null)
    throw new Error(result?.message ?? `Advisor milestone request failed (${response.status})`)
  }

  const result = (await response.json()) as ApiResponse<T>
  return result.data
}

export function getAdvisorMilestoneSubmissions() {
  return request<AdvisorMilestoneSubmission[]>('/api/advisors/milestone-submissions')
}

export function reviewAdvisorMilestone(
  studentId: string,
  milestoneId: string,
  decision: 'approve' | 'reject',
  comment = '',
) {
  return request<{ status: StudentMilestoneStatus }>(
    `/api/advisors/students/${studentId}/milestones/${milestoneId}/review`,
    {
      method: 'PATCH',
      body: JSON.stringify({ decision, comment }),
    },
  )
}

export function getEvidenceHref(evidenceUrl: string) {
  return resolveEvidenceUrl(evidenceUrl)
}
