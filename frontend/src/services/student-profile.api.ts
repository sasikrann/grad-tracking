import { apiRequest } from '@/services/api-client'

export interface StudentProfile {
  studentId: string
  userId: string
  email: string
  fullName: string
  schoolName: string | null
  program: string
  educationPlan: string | null
  degreeLevel: 'Master' | 'Doctoral'
  enrollmentAcademicYear: number
  semester: string
  expectedGraduationYear: number
  graduationSemester: string | null
  graduationAcademicYear: number | null
  academicStatus: 'On-track' | 'Overdue' | 'Extended' | 'Graduate'
  studyExtensionGranted: boolean
  advisorId: string | null
  advisorName: string | null
  advisorEmail: string | null
  advisorEvidenceUrl: string | null
  coAdvisors: Array<{ advisorId: string; fullName: string; email: string }>
  createdAt: string
  updatedAt: string
}

export async function appointMyStudentAdvisors(input: {
  milestoneId: string
  advisorId: string
  coAdvisorIds: string[]
}) {
  return apiRequest<StudentProfile>(
    `/api/student-profile/me/milestones/${encodeURIComponent(input.milestoneId)}/advisors`,
    {
      method: 'PUT',
      body: JSON.stringify({ advisorId: input.advisorId, coAdvisorIds: input.coAdvisorIds }),
      errorMessage: 'Unable to save advisor appointment',
    },
  )
}

export async function submitMyGraduation(input: {
  milestoneId: string
  semester: string
  academicYear: number
}) {
  return apiRequest<StudentProfile>(
    `/api/student-profile/me/milestones/${encodeURIComponent(input.milestoneId)}/graduation`,
    {
      method: 'PUT',
      body: JSON.stringify({ semester: input.semester, academicYear: input.academicYear }),
      errorMessage: 'Unable to save graduation information',
    },
  )
}

export async function getMyStudentProfile() {
  return apiRequest<StudentProfile>('/api/student-profile/me', {
    errorMessage: 'Unable to load student profile',
  })
}

export async function updateMyStudentAdvisor(input: {
  advisorId: string
  advisorEvidenceUrl?: string | null
}) {
  return apiRequest<StudentProfile>('/api/student-profile/me/advisor', {
    method: 'PUT',
    body: JSON.stringify(input),
    errorMessage: 'Unable to update advisor',
  })
}
