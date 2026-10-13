import { apiUrl, readJson } from '@/services/api-client'
import { authenticatedFetch } from '@/services/auth'
import { toStudent } from './student-mapper'
import type {
  AdminStudentMilestones,
  ApiResponse,
  StudentApiResponse,
  StudentDetail,
  StudentPaginationResult,
} from './student-api.types'

interface StudentsApiResponse {
  data?: StudentApiResponse[]
}

async function requestStudents(path: string, currentAdvisorId?: string) {
  const response = await authenticatedFetch(apiUrl(path), { cache: 'no-store' })
  if (response.status === 404 || response.status === 204) return []
  if (!response.ok) throw new Error(`Unable to load students (${response.status})`)

  const result = (await response.json()) as StudentsApiResponse
  return (Array.isArray(result.data) ? result.data : []).map((student) =>
    toStudent(student, currentAdvisorId),
  )
}

// Loads all students using the non-paginated compatibility endpoint.
export function getStudents() {
  return requestStudents('/api/students')
}

// Loads a filtered student page together with statistics and filter options.
export async function getStudentsPage(input: {
  page: number
  limit?: number
  search?: string
  semester?: string
  year?: string
  degree?: string
  plan?: string
  status?: string
}): Promise<StudentPaginationResult> {
  const query = new URLSearchParams({ page: String(input.page), limit: String(input.limit ?? 10) })
  for (const key of ['search', 'semester', 'year', 'degree', 'plan', 'status'] as const) {
    const value = input[key]
    if (value && value !== 'all') query.set(key, value)
  }
  const response = await authenticatedFetch(apiUrl(`/api/students?${query}`), { cache: 'no-store' })
  if (!response.ok) throw new Error(`Unable to load students (${response.status})`)
  const result = (await response.json()) as Omit<StudentPaginationResult, 'students'> & {
    data?: StudentApiResponse[]
  }
  return {
    students: (result.data ?? []).map((student) => toStudent(student)),
    pagination: result.pagination,
    statistics: result.statistics,
    filterOptions: result.filterOptions,
  }
}

// Loads one student record by student identifier.
export async function getStudent(studentId: string) {
  const response = await authenticatedFetch(apiUrl(`/api/students/${encodeURIComponent(studentId)}`), {
    cache: 'no-store',
  })
  const result = await readJson<ApiResponse<StudentDetail>>(response)
  if (!response.ok || !result?.data) throw new Error(`Unable to load student (${response.status})`)
  return {
    ...result.data,
    studyExtensionCount: Number(result.data.studyExtensionCount ?? 0),
    latestStudyExtensionNumber:
      result.data.latestStudyExtensionNumber == null
        ? null
        : Number(result.data.latestStudyExtensionNumber),
    canExtendStudyPeriod: result.data.canExtendStudyPeriod,
  }
}

// Loads the students assigned to a specific advisor.
export function getAdvisorStudents(advisorId: string) {
  return requestStudents(`/api/advisors/${advisorId}/students`, advisorId)
}

// Loads students visible in the current advisor's overview.
export function getAdvisorStudentOverview(advisorId: string) {
  return requestStudents(`/api/advisors/${advisorId}/students?scope=all`, advisorId)
}

// Loads all milestone progress for one student.
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
