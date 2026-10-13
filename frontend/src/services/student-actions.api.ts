import { apiRequest, apiUrl, readJson } from '@/services/api-client'
import { authenticatedFetch } from '@/services/auth'
import type { ApiErrorResponse, ApiResponse, StudentDetail } from './student-api.types'

// Grants the next study-extension period to an eligible student.
export async function extendStudentStudyPeriod(studentId: string) {
  const response = await authenticatedFetch(
    apiUrl(`/api/students/${encodeURIComponent(studentId)}/study-extension`),
    { method: 'PATCH' },
  )
  const result = await readJson<ApiResponse<{
    extensionNumber: number
    academicYear: number
    semester: '1' | '2'
    startsOn: string
    endsOn: string
    studyExtensionCount: number
  }> & ApiErrorResponse>(response)
  if (!response.ok || !result?.data) {
    throw new Error(result?.message ?? `Unable to extend study period (${response.status})`)
  }
  return result.data
}

// Updates a student's resignation or dismissal status.
export function updateStudentExitStatus(studentId: string, status: 'Resigned' | 'Dismissed') {
  return apiRequest<StudentDetail>(`/api/students/${encodeURIComponent(studentId)}/exit-status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
    errorMessage: 'Unable to update student status',
  })
}

// Cancels the student's latest active study extension.
export async function cancelStudentStudyExtension(studentId: string) {
  const response = await authenticatedFetch(
    apiUrl(`/api/students/${encodeURIComponent(studentId)}/study-extension`),
    { method: 'DELETE' },
  )
  const result = await readJson<ApiResponse<{ extensionNumber: number }> & ApiErrorResponse>(response)
  if (!response.ok || !result?.data) {
    throw new Error(result?.message ?? `Unable to cancel study extension (${response.status})`)
  }
  return result.data
}
