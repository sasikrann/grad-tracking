import { authenticatedFetch } from '@/services/auth'

const apiBaseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export interface StudentProfile {
  studentId: string
  userId: string
  email: string
  fullName: string
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

interface StudentProfileResponse {
  data?: StudentProfile
  message?: string
}

export async function getMyStudentProfile() {
  const response = await authenticatedFetch(`${apiBaseUrl}/api/student-profile/me`)
  const result = (await response.json().catch(() => null)) as StudentProfileResponse | null

  if (!response.ok || !result?.data) {
    throw new Error(result?.message ?? `Unable to load student profile (${response.status})`)
  }

  return result.data
}

export async function updateMyStudentAdvisor(input: {
  advisorId: string
  advisorEvidenceUrl?: string | null
}) {
  const response = await authenticatedFetch(`${apiBaseUrl}/api/student-profile/me/advisor`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const result = (await response.json().catch(() => null)) as StudentProfileResponse | null

  if (!response.ok || !result?.data) {
    throw new Error(result?.message ?? `Unable to update advisor (${response.status})`)
  }

  return result.data
}
