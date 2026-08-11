import type { Student, StudentStatus } from '@/types/student'
import { apiUrl, downloadApiFile, readJson } from '@/services/api-client'
import { authenticatedFetch } from '@/services/auth'
import type { StudentMilestone } from '@/types/milestone'

interface StudentApiResponse {
  studentId: string
  fullName: string
  schoolName: string | null
  program: string
  educationPlan?: string | null
  degreeLevel: 'Master' | 'Doctoral'
  enrollmentAcademicYear: number
  semester: string
  year?: number | string
  expectedGraduationYear: number
  advisorId: string | null
  advisorName: string | null
  isCoAdvised?: boolean
  progress: number
  status: StudentStatus
  studyExtensionGranted: boolean
}

interface StudentsApiResponse {
  data?: StudentApiResponse[]
}

interface ApiResponse<T> {
  data: T
}

interface ApiErrorResponse {
  message?: string
  errors?: Array<string | { row?: number; field?: string; message?: string }>
}

export interface StudentImportResult {
  totalRecords: number
  successRecords: number
  failedRecords: number
  errors: string[]
  createdRecords?: number
  updatedRecords?: number
  unchangedRecords?: number
}

export interface AdminStudentMilestones {
  student: {
    studentId: string
    studentName: string
  }
  milestones: StudentMilestone[]
}

function toStudent(student: StudentApiResponse, currentAdvisorId?: string): Student {
  return {
    studentId: student.studentId,
    name: student.fullName,
    degree: student.degreeLevel === 'Doctoral' ? 'Ph. D.' : 'Master',
    program: student.program,
    educationPlan: student.educationPlan ?? '-',
    enrollmentAcademicYear: String(student.enrollmentAcademicYear),
    expectedGraduationYear: String(student.expectedGraduationYear),
    semester: Number(student.semester),
    year: String(student.year ?? student.enrollmentAcademicYear),
    progress: Number(student.progress),
    status: student.status,
    studyExtensionGranted: Boolean(student.studyExtensionGranted),
    advisor: student.advisorName ?? 'Unassigned',
    isAdvised: currentAdvisorId ? student.advisorId === currentAdvisorId : false,
    isCoAdvised: Boolean(student.isCoAdvised),
  }
}

async function requestStudents(path: string, currentAdvisorId?: string) {
  const response = await authenticatedFetch(apiUrl(path), { cache: 'no-store' })

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

export interface StudentDetail {
  studentId: string
  fullName: string
  degreeLevel: 'Master' | 'Doctoral'
  enrollmentAcademicYear: number
  studyExtensionGranted: boolean
  graduationSemester: string | null
  graduationAcademicYear: number | null
}

export async function getStudent(studentId: string) {
  const response = await authenticatedFetch(apiUrl(`/api/students/${encodeURIComponent(studentId)}`), {
    cache: 'no-store',
  })
  const result = await readJson<ApiResponse<StudentDetail>>(response)
  if (!response.ok || !result?.data) {
    throw new Error(`Unable to load student (${response.status})`)
  }
  return result.data
}

export async function extendStudentStudyPeriod(studentId: string) {
  const response = await authenticatedFetch(
    apiUrl(`/api/students/${encodeURIComponent(studentId)}/study-extension`),
    { method: 'PATCH' },
  )
  const result = await readJson<ApiResponse<{ studyExtensionGranted: boolean }> & ApiErrorResponse>(response)
  if (!response.ok || !result?.data) {
    throw new Error(result?.message ?? `Unable to extend study period (${response.status})`)
  }
  return result.data
}

export function getAdvisorStudents(advisorId: string) {
  return requestStudents(`/api/advisors/${advisorId}/students`, advisorId)
}

export function getAdvisorStudentOverview(advisorId: string) {
  return requestStudents(`/api/advisors/${advisorId}/students?scope=all`, advisorId)
}

export async function getStudentMilestones(studentId: string) {
  const response = await authenticatedFetch(
    apiUrl(`/api/students/${encodeURIComponent(studentId)}/milestones`),
    { cache: 'no-store' },
  )

  if (!response.ok) {
    const result = await response.json().catch(() => null)
    throw new Error(result?.message ?? `Unable to load student milestones (${response.status})`)
  }

  const result = (await response.json()) as ApiResponse<AdminStudentMilestones>
  return result.data
}

export async function exportStudents(studentIds: string[], language: 'en' | 'th' = 'en') {
  const response = await authenticatedFetch(apiUrl('/api/students/export'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentIds, language }),
  })
  if (!response.ok) throw new Error(`Unable to export students (${response.status})`)

  const blob = await response.blob()
  const fileName = response.headers
    .get('content-disposition')
    ?.match(/filename="?([^";]+)"?/i)?.[1] ?? 'students.xlsx'
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  try {
    link.href = objectUrl
    link.download = fileName
    link.click()
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

export function downloadStudentTemplate() {
  return downloadApiFile('/api/students/template', 'student_import_template.xlsx')
}

export async function importStudents(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  const response = await authenticatedFetch(apiUrl('/api/students/import'), {
    method: 'POST',
    body: formData,
  })
  const result = await readJson<
    | (ApiErrorResponse & {
        data?: {
          totalRecords: number
          successRecords: number
          failedRecords: number
          errors: string[]
        }
      })
  >(response)
  if (!response.ok) {
    const details = Array.isArray(result?.errors)
      ? result.errors
          .map((error) =>
            typeof error === 'string'
              ? error
              : `Row ${error.row}: ${error.message ?? 'Invalid student data'}`,
          )
          .join('; ')
      : ''
    throw new Error(details || result?.message || `Unable to import students (${response.status})`)
  }
  return result?.data as StudentImportResult
}
