export type DegreeLevel = 'Master' | 'Doctoral'

export interface Milestone {
  milestoneId: string
  degreeLevel: DegreeLevel
  semester: string
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
  semester: string
  title: string
  description: string
  sequenceOrder: number | null
  openDate: string
  deadline: string
  firstReminderDate: string
  secondReminderDate: string
  isEnabled: boolean
}

export type StudentMilestoneStatus = 'In Progress' | 'Completed' | 'Approved' | 'Missing'

export interface StudentMilestone {
  milestoneId: string
  degreeLevel: DegreeLevel
  semester: string
  title: string
  description: string | null
  sequenceOrder: number
  openDate: string
  deadline: string
  firstReminderDate: string | null
  secondReminderDate: string | null
  status: StudentMilestoneStatus
  evidenceUrl: string | null
  advisorComment: string | null
  submittedAt: string | null
  reviewedAt: string | null
}

export interface AdvisorMilestoneBreakdown {
  milestoneId: string
  title: string
  sequenceOrder: number
  semester: string
  year: number
  totalStudents: number
  completed: number
  inProgress: number
  approved: number
  missing: number
}

export interface AdvisorMilestoneSummary {
  counts: {
    completed: number
    inProgress: number
    approved: number
    missing: number
    total: number
  }
  overallProgress: number
  milestones: AdvisorMilestoneBreakdown[]
  filters: {
    semesters: string[]
    years: number[]
  }
}
