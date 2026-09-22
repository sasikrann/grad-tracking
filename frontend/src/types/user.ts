export type UserRole = 'admin' | 'advisor' | 'student'

export interface CurrentUser {
  userId?: string
  advisorId?: string | null
  fullName: string
  fullNameEnglish?: string | null
  fullNameThai?: string | null
  email: string
  role: UserRole
  initials?: string
}
