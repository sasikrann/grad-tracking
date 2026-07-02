import type { Student, StudentStatus } from '@/types/student'
import { authenticatedFetch } from '@/services/auth'
import type { StudentMilestone } from '@/types/milestone'

const apiBaseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

interface StudentApiResponse {
  studentId: string
  fullName: string
  program: string
  degreeLevel: 'Master' | 'Doctoral'
  enrollmentAcademicYear: number
  semester: string
  year?: number | string
  expectedGraduationYear: number
  advisorId: string | null
  advisorName: string | null
  progress: number
  status: StudentStatus
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
  conflicts?: StudentImportConflict[]
}

export interface StudentImportConflictOption {
  optionId: string
  source: 'existing' | 'file'
  rowNumber?: number
  studentId: string
  fullName: string
  email: string | null
  program: string
  degreeLevel: 'Master' | 'Doctoral'
  enrollmentAcademicYear: number
  semester: string
  expectedGraduationYear: number
  advisorId: string | null
  advisorName: string | null
  advisorEmail: string | null
}

export interface StudentImportConflict {
  key: string
  studentId: string
  options: StudentImportConflictOption[]
}

export interface StudentImportResult {
  totalRecords: number
  successRecords: number
  failedRecords: number
  errors: string[]
}

export class StudentImportConflictError extends Error {
  conflicts: StudentImportConflict[]

  constructor(message: string, conflicts: StudentImportConflict[]) {
    super(message)
    this.name = 'StudentImportConflictError'
    this.conflicts = conflicts
  }
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
    enrollmentAcademicYear: String(student.enrollmentAcademicYear),
    expectedGraduationYear: String(student.expectedGraduationYear),
    semester: Number(student.semester),
    year: String(student.year ?? student.enrollmentAcademicYear),
    progress: Number(student.progress),
    status: student.status,
    advisor: student.advisorName ?? 'Unassigned',
    isAdvised: currentAdvisorId ? student.advisorId === currentAdvisorId : false,
  }
}

async function requestStudents(path: string, currentAdvisorId?: string) {
  const response = await authenticatedFetch(`${apiBaseUrl}${path}`)

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

export function getAdvisorStudentOverview(advisorId: string) {
  return requestStudents(`/api/advisors/${advisorId}/students?scope=all`, advisorId)
}

export async function getStudentMilestones(studentId: string) {
  const response = await authenticatedFetch(
    `${apiBaseUrl}/api/students/${encodeURIComponent(studentId)}/milestones`,
    { cache: 'no-store' },
  )

  if (!response.ok) {
    const result = await response.json().catch(() => null)
    throw new Error(result?.message ?? `Unable to load student milestones (${response.status})`)
  }

  const result = (await response.json()) as ApiResponse<AdminStudentMilestones>
  return result.data
}

async function downloadStudentFile(path: string, fallbackName: string) {
  const response = await authenticatedFetch(`${apiBaseUrl}${path}`)
  if (!response.ok) throw new Error(`Unable to download file (${response.status})`)

  const blob = await response.blob()
  const disposition = response.headers.get('content-disposition') ?? ''
  const fileName = disposition.match(/filename="?([^";]+)"?/i)?.[1] ?? fallbackName
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

export function exportStudents(enrollmentYear = 'all') {
  const query =
    enrollmentYear === 'all' ? '' : `?enrollmentYear=${encodeURIComponent(enrollmentYear)}`
  return downloadStudentFile(`/api/students/export${query}`, 'students.xlsx')
}

export function downloadStudentTemplate() {
  return downloadStudentFile('/api/students/template', 'student_import_template.xlsx')
}

export async function importStudents(file: File, resolutions?: Record<string, string>) {
  const formData = new FormData()
  formData.append('file', file)
  if (resolutions) {
    formData.append('resolutions', JSON.stringify(resolutions))
  }
  const response = await authenticatedFetch(`${apiBaseUrl}/api/students/import`, {
    method: 'POST',
    body: formData,
  })
  const result = (await response.json().catch(() => null)) as
    | (ApiErrorResponse & {
        data?: {
          totalRecords: number
          successRecords: number
          failedRecords: number
          errors: string[]
        }
      })
    | null
  if (!response.ok) {
    if (response.status === 409 && Array.isArray(result?.conflicts)) {
      throw new StudentImportConflictError(
        result?.message ??
          'Some student IDs already exist. Please choose which student record to keep before importing.',
        result.conflicts,
      )
    }

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
