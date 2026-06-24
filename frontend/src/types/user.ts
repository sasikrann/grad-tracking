export type UserRole = 'admin' | 'lecturer' | 'advisor' | 'student'

export interface CurrentUser {
  userId?: string
  fullName: string
  email: string
  role: UserRole
  initials?: string
}
