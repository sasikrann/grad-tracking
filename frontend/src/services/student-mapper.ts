import type { Student } from '@/types/student'
import type { StudentApiResponse } from './student-api.types'

// Converts the backend student representation into the dashboard view model.
export function toStudent(student: StudentApiResponse, currentAdvisorId?: string): Student {
  return {
    studentId: student.studentId,
    name: student.fullName,
    nameEnglish: student.fullName,
    nameThai: student.fullNameThai ?? null,
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
    advisorThai: student.advisorNameThai,
    isAdvised: currentAdvisorId ? student.advisorId === currentAdvisorId : false,
    isCoAdvised: Boolean(student.isCoAdvised),
  }
}
