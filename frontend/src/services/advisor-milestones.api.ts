import { apiRequest } from '@/services/api-client'
import { resolveEvidenceUrl } from '@/services/student-milestones.api'
import type { StudentMilestone, StudentMilestoneStatus } from '@/types/milestone'


export interface AdvisorMilestoneSubmission {
  studentId: string
  studentName: string
  milestoneId: string
  title: string
  description: string | null
  deadline: string | null
  status: StudentMilestoneStatus
  evidenceUrl: string
  advisorComment: string | null
  submittedAt: string | null
  reviewedAt: string | null
}

export interface AdvisorStudentMilestones {
  canReview: boolean
  student: {
    studentId: string
    studentName: string
  }
  milestones: StudentMilestone[]
}

const request = <T>(path: string, options?: RequestInit) =>
  apiRequest<T>(path, { ...options, errorMessage: 'Advisor milestone request failed' })

export function getAdvisorMilestoneSubmissions() {
  return request<AdvisorMilestoneSubmission[]>('/api/advisors/milestone-submissions')
}

export function getAdvisorStudentMilestones(studentId: string) {
  return request<AdvisorStudentMilestones>(
    `/api/advisors/students/${encodeURIComponent(studentId)}/milestones`,
  )
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
