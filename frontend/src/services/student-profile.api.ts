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
  advisorId: string | null
  advisorName: string | null
  advisorEmail: string | null
  advisorEvidenceUrl: string | null
  createdAt: string
  updatedAt: string
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
