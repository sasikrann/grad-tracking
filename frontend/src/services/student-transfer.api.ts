import { apiUrl, downloadApiFile, readJson } from '@/services/api-client'
import { authenticatedFetch } from '@/services/auth'
import type { ApiErrorResponse, StudentImportResult } from './student-api.types'

// Downloads an export workbook for the selected students and language.
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

// Downloads the blank student-import workbook.
export function downloadStudentTemplate() {
  return downloadApiFile('/api/students/template', 'student_import_template.xlsx')
}

// Uploads a student import file and returns its processing summary.
export async function importStudents(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  const response = await authenticatedFetch(apiUrl('/api/students/import'), {
    method: 'POST',
    body: formData,
  })
  const result = await readJson<ApiErrorResponse & { data?: StudentImportResult }>(response)
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
