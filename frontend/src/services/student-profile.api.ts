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
  academicStatus: 'On-track' | 'Overdue' | 'Extended' | 'Graduate' | 'Resigned' | 'Dismissed'
  studyExtensionGranted: boolean
  advisorId: string | null
  advisorName: string | null
  advisorNameThai?: string | null
  advisorEmail: string | null
  advisorEvidenceUrl: string | null
  coAdvisors: Array<{ advisorId: string; fullName: string; fullNameThai?: string | null; email: string }>
  createdAt: string
  updatedAt: string
}

export async function appointMyStudentAdvisors(input: {
  milestoneId: string
  advisorId: string
  coAdvisorIds: string[]
  evidenceFile?: File
}) {
  const body = new FormData()
  body.append('advisorId', input.advisorId)
  body.append('coAdvisorIds', JSON.stringify(input.coAdvisorIds))
  if (input.evidenceFile) body.append('file', input.evidenceFile)

  return apiRequest<StudentProfile>(
    `/api/student-profile/me/milestones/${encodeURIComponent(input.milestoneId)}/advisors`,
    {
      method: 'PUT',
      body,
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
