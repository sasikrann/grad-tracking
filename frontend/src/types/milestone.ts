export type DegreeLevel = 'Master' | 'Doctoral'

export interface Milestone {
  milestoneId: string
  degreeLevel: DegreeLevel
  title: string
  description: string | null
  sequenceOrder: number
  openDate: string
  deadline: string
  firstReminderDate: string | null
  secondReminderDate: string | null
  isEnabled: boolean
}

export interface MilestoneInput {
  degreeLevel: DegreeLevel
  title: string
  description: string
  sequenceOrder: number | null
  openDate: string
  deadline: string
  firstReminderDate: string
  secondReminderDate: string
  isEnabled: boolean
}
