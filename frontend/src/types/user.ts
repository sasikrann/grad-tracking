export type UserRole = 'admin' | 'lecturer' | 'advisor' | 'student'

export interface CurrentUser {
  fullName: string
  email: string
  role: UserRole
  initials?: string
}
