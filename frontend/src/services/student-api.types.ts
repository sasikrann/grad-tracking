import type { StudentMilestone } from '@/types/milestone'
import type { Student, StudentStatus } from '@/types/student'

export interface StudentApiResponse {
  studentId: string
  fullName: string
  fullNameThai?: string | null
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
  advisorNameThai?: string | null
  isCoAdvised?: boolean
  progress: number
  status: StudentStatus
  studyExtensionGranted: boolean
}

export interface StudentPaginationResult {
  students: Student[]
  pagination: { page: number; limit: number; totalRecords: number; totalPages: number }
  statistics: { total: number; onTrack: number; overdue: number; graduate: number }
  filterOptions: {
    semesters: Array<string | number>
    years: Array<string | number>
    degrees: string[]
    plans: string[]
    statuses: StudentStatus[]
  }
}

export interface StudentImportResult {
  totalRecords: number
  successRecords: number
  failedRecords: number
  errors: string[]
  createdRecords?: number
  updatedRecords?: number
  unchangedRecords?: number
  skippedRecords?: number
  skippedReasons?: Array<{ reason: string; count: number }>
}

export interface StudentDetail {
  studentId: string
  fullName: string
  fullNameThai: string | null
  degreeLevel: 'Master' | 'Doctoral'
  educationPlan: string
  enrollmentAcademicYear: number
  semester: '1' | '2'
  academicStatus: StudentStatus
  studyExtensionGranted: boolean
  studyExtensionCount: number
  latestStudyExtensionNumber: number | null
  studyExtensionAcademicYear: number | null
  studyExtensionSemester: '1' | '2' | null
  studyExtensionStartsOn: string | null
  studyExtensionEndsOn: string | null
  normalStudyPeriodEnded: boolean
  canExtendStudyPeriod: boolean
  studyExtensionRound1Cancellations: number
  studyExtensionRound2Cancellations: number
  graduationSemester: string | null
  graduationAcademicYear: number | null
}

export interface AdminStudentMilestones {
  student: {
    studentId: string
    studentName: string
    studentNameThai: string | null
    graduationSemester: string | null
    graduationAcademicYear: number | null
  }
  milestones: StudentMilestone[]
}

export interface ApiResponse<T> {
  data: T
}

export interface ApiErrorResponse {
  message?: string
  errors?: Array<string | { row?: number; field?: string; message?: string }>
}
