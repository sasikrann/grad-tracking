import { apiRequest } from '@/services/api-client'
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
    studentNameThai: string | null
    graduationSemester: string | null
    graduationAcademicYear: number | null
  }
  milestones: StudentMilestone[]
}

const request = <T>(path: string, options?: RequestInit) =>
  apiRequest<T>(path, { ...options, errorMessage: 'Advisor milestone request failed' })

// Loads milestone submissions awaiting or containing advisor review.
export function getAdvisorMilestoneSubmissions() {
  return request<AdvisorMilestoneSubmission[]>('/api/advisors/milestone-submissions')
}

// Loads milestone progress for one student assigned to the advisor.
export function getAdvisorStudentMilestones(studentId: string) {
  return request<AdvisorStudentMilestones>(
    `/api/advisors/students/${encodeURIComponent(studentId)}/milestones`,
  )
}

// Approves or rejects a student's milestone submission.
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
// Calls advisor endpoints for student milestone details, reviews, and submission summaries.
