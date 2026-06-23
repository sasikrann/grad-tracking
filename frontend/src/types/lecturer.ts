export type StudentStatus = 'On-track' | 'Overdue'

export interface LecturerStudent {
  name: string
  studentId: string
  degree: string
  program: string
  semester: number
  year: string
  progress: number
  status: StudentStatus
  isAdvised: boolean
}

export interface StudentFiltersState {
  semester: string
  year: string
  degree: string
  status: string
  advisor: string
}

export type StudentFilterKey = keyof StudentFiltersState
