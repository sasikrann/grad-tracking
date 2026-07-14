export type DegreeLevel = 'Master' | 'Doctoral'
export type MilestoneProgram = DegreeLevel | 'All'
export type EducationPlan = 'All' | 'A1' | 'A2' | 'B' | '1.1' | '2.1' | '2.2'

export interface Milestone {
  milestoneId: string
  degreeLevel: MilestoneProgram
  semester: string
  plans: EducationPlan[]
  title: string
  description: string | null
  sequenceOrder: number
  openDate: string | null
  deadline: string | null
  firstReminderDate: string | null
  secondReminderDate: string | null
  prerequisiteMilestoneIds: string[]
  isEnabled: boolean
  isStandard?: boolean
}

export interface MilestoneInput {
  degreeLevel: MilestoneProgram
  semester: string
  plans: EducationPlan[]
  title: string
  description: string
  sequenceOrder: number | null
  openDate: string
  deadline: string
  firstReminderDate: string
  secondReminderDate: string
  prerequisiteMilestoneIds: string[]
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
  prerequisiteMilestoneIds?: string[]
  isLocked?: boolean
  lockedReason?: string
  status: StudentMilestoneStatus
  evidenceUrl: string | null
  advisorComment: string | null
  rejectionCount: number
  maxRejectedRevisionRounds: number
  submittedAt: string | null
  reviewedAt: string | null
}

export interface AdvisorMilestoneBreakdown {
  milestoneId: string
  title: string
  sequenceOrder: number
  degreeLevel: DegreeLevel
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
    degreeLevels: DegreeLevel[]
    semesters: string[]
    years: number[]
  }
}
