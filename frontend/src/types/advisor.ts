export interface Advisor {
  advisorId: string
  userId: string
  fullName: string
  fullNameThai?: string | null
  email: string
  createdAt: string
  status: 'active' | 'inactive'
}
// Shared TypeScript shapes for advisor records and advisor import results.
