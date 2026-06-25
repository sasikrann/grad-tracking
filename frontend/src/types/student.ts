export type StudentStatus = 'On-track' | 'Overdue'

// ข้อมูลขั้นต่ำที่ StudentTable ต้องใช้
export interface StudentTableItem {
  name: string
  studentId: string
  degree: string
  program: string
  enrollmentAcademicYear: string
  expectedGraduationYear: string
  semester: number
  year: string
  progress: number
  status: StudentStatus
}

// ข้อมูล Student ที่ใช้ในหน้า Dashboard
export interface Student extends StudentTableItem {
  advisor: string
  isAdvised: boolean
}

// ค่าของตัวกรองที่ใช้ร่วมกันระหว่าง Admin และ Lecturer
export interface StudentFiltersState {
  semester: string
  year: string
  degree: string
  status: string
  advisor: string
}

export type StudentFilterKey = keyof StudentFiltersState
