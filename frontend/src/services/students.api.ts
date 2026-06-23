import type { Student, StudentStatus } from '@/types/student'

const apiBaseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

interface StudentApiResponse {
  studentId: string
  fullName: string
  program: string
  degreeLevel: 'Master' | 'Doctoral'
  semester: string
  expectedGraduationYear: number
  advisorId: string | null
  advisorName: string | null
  progress: number
  status: StudentStatus
}

interface StudentsApiResponse {
  data?: StudentApiResponse[]
}

function toStudent(student: StudentApiResponse, currentAdvisorId?: string): Student {
  return {
    studentId: student.studentId,
    name: student.fullName,
    degree: student.degreeLevel === 'Doctoral' ? 'Ph. D.' : 'Master',
    program: student.program,
    semester: Number(student.semester),
    year: String(student.expectedGraduationYear),
    progress: Number(student.progress),
    status: student.status,
    advisor: student.advisorName ?? 'Unassigned',
    isAdvised: currentAdvisorId ? student.advisorId === currentAdvisorId : false,
  }
}

async function requestStudents(path: string, currentAdvisorId?: string) {
  const response = await fetch(`${apiBaseUrl}${path}`)

  if (response.status === 404 || response.status === 204) {
    return []
  }

  if (!response.ok) {
    throw new Error(`Unable to load students (${response.status})`)
  }

  const result = (await response.json()) as StudentsApiResponse
  const students = Array.isArray(result.data) ? result.data : []

  return students.map((student) => toStudent(student, currentAdvisorId))
}

export function getStudents() {
  return requestStudents('/api/students')
}

export function getAdvisorStudents(advisorId: string) {
  return requestStudents(`/api/advisors/${advisorId}/students`, advisorId)
}
