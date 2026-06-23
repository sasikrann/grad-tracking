export type StudentStatus = 'On-track' | 'Overdue'

export interface Student {
  id: string
  studentId: string
  name: string
  program: string
  department: string
  semester: number
  progress: number
  status: StudentStatus
  advisor: string
}
