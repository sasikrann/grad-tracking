export type UserRole = 'admin' | 'advisor' | 'student'

export interface CurrentUser {
  userId?: string
  advisorId?: string | null
  fullName: string
  email: string
  role: UserRole
  initials?: string
}
