import type {
  DegreeLevel,
  EducationPlan,
  Milestone,
  StudentMilestone,
} from '@/types/milestone'

const commonFields = {
  semester: 'all',
  openDate: null,
  deadline: null,
  firstReminderDate: null,
  secondReminderDate: null,
  isEnabled: true,
  isStandard: true,
} as const

const standardMilestoneDefinitions: Milestone[] = [
  {
    ...commonFields,
    milestoneId: 'standard-milestone-01',
    degreeLevel: 'All',
    plans: ['All'],
    title: 'Attend ethics training or pass a university-arranged course',
    description: 'เข้ารับการอบรมจริยธรรม หรือผ่านรายวิชาที่มหาวิทยาลัยกำหนด',
    references: [],
    sequenceOrder: 1,
    prerequisiteMilestoneIds: [],
  },
  {
    ...commonFields,
    milestoneId: 'standard-milestone-02',
    degreeLevel: 'Doctoral',
    plans: ['1.1', '2.1', '2.2'],
    title: 'Pass the Qualifying Exam',
    description: 'สอบผ่าน Qualifying Exam (เฉพาะนักศึกษาระดับปริญญาเอก)',
    references: [],
    sequenceOrder: 5,
    prerequisiteMilestoneIds: ['standard-milestone-11', 'standard-milestone-05'],
  },
  {
    ...commonFields,
    milestoneId: 'standard-milestone-03',
    degreeLevel: 'All',
    plans: ['All'],
    title: 'Pass Proposal Exam',
    description: 'สอบผ่านการสอบเค้าโครงวิทยานิพนธ์ (Proposal Exam)',
    references: [],
    sequenceOrder: 7,
    prerequisiteMilestoneIds: ['standard-milestone-11', 'standard-milestone-02'],
  },
  {
    ...commonFields,
    milestoneId: 'standard-milestone-04',
    degreeLevel: 'All',
    plans: ['All'],
    title: 'Submit the English proficiency test as required by the university',
    description: 'ส่งผลการทดสอบภาษาอังกฤษตามที่มหาวิทยาลัยกำหนด',
    references: [],
    sequenceOrder: 2,
    prerequisiteMilestoneIds: [],
  },
  {
    ...commonFields,
    milestoneId: 'standard-milestone-05',
    degreeLevel: 'All',
    plans: ['A2', 'B', '2.1', '2.2'],
    title: 'Register completed all courses required in the curriculum and have a GPAX ≥ 3.00',
    description: 'ลงทะเบียนเรียนครบตามหลักสูตร และมี GPAX ตั้งแต่ 3.00 ขึ้นไป',
    references: [],
    sequenceOrder: 4,
    prerequisiteMilestoneIds: ['standard-milestone-11'],
  },
  {
    ...commonFields,
    milestoneId: 'standard-milestone-06',
    degreeLevel: 'Master',
    plans: ['B'],
    title: 'Pass the Comprehensive Exam',
    description: 'สอบผ่าน Comprehensive Exam (เฉพาะหลักสูตรปริญญาโท แผน B)',
    references: [],
    sequenceOrder: 6,
    prerequisiteMilestoneIds: ['standard-milestone-11', 'standard-milestone-05'],
  },
  {
    ...commonFields,
    milestoneId: 'standard-milestone-07',
    degreeLevel: 'All',
    plans: ['All'],
    title: 'Pass Defense Exam',
    description: 'สอบผ่านการสอบป้องกันวิทยานิพนธ์ (Defense Exam)',
    references: [],
    sequenceOrder: 8,
    prerequisiteMilestoneIds: [
      'standard-milestone-03',
      'standard-milestone-05',
      'standard-milestone-06',
    ],
  },
  {
    ...commonFields,
    milestoneId: 'standard-milestone-08',
    degreeLevel: 'All',
    plans: ['All'],
    title: 'Pass the Format Checking',
    description: 'ผ่านการตรวจสอบรูปแบบเล่มวิทยานิพนธ์/ดุษฎีนิพนธ์',
    references: [],
    sequenceOrder: 9,
    prerequisiteMilestoneIds: ['standard-milestone-07'],
  },
  {
    ...commonFields,
    milestoneId: 'standard-milestone-09',
    degreeLevel: 'All',
    plans: ['All'],
    title: 'Submit the complete thesis file',
    description: 'ส่งไฟล์วิทยานิพนธ์/ดุษฎีนิพนธ์ฉบับสมบูรณ์',
    references: [],
    sequenceOrder: 10,
    prerequisiteMilestoneIds: ['standard-milestone-08'],
  },
  {
    ...commonFields,
    milestoneId: 'standard-milestone-10',
    degreeLevel: 'All',
    plans: ['All'],
    title: 'Publish research findings as required by the university',
    description: 'เผยแพร่ผลงานวิจัยตามข้อกำหนดของมหาวิทยาลัย',
    references: [],
    sequenceOrder: 11,
    prerequisiteMilestoneIds: ['standard-milestone-07'],
  },
  {
    ...commonFields,
    milestoneId: 'standard-milestone-11',
    degreeLevel: 'All',
    plans: ['All'],
    title: 'Appoint an Advisor',
    description: 'Complete the formal appointment of a graduate advisor.',
    references: [],
    sequenceOrder: 3,
    prerequisiteMilestoneIds: ['standard-milestone-01', 'standard-milestone-04'],
  },
  {
    ...commonFields,
    milestoneId: 'standard-milestone-12',
    degreeLevel: 'All',
    plans: ['All'],
    title: 'Graduate',
    description: 'Complete every milestone required for the student’s program and plan.',
    references: [],
    sequenceOrder: 12,
    prerequisiteMilestoneIds: [
      'standard-milestone-01',
      'standard-milestone-04',
      'standard-milestone-11',
      'standard-milestone-05',
      'standard-milestone-02',
      'standard-milestone-06',
      'standard-milestone-03',
      'standard-milestone-07',
      'standard-milestone-08',
      'standard-milestone-09',
      'standard-milestone-10',
    ],
  },
]

export const standardMilestones = [...standardMilestoneDefinitions].sort(
  (first, second) => first.sequenceOrder - second.sequenceOrder,
)

export function getStandardMilestonesForStudent(
  degreeLevel: DegreeLevel,
  educationPlan: string | null | undefined,
) {
  return standardMilestones.filter((milestone) => {
    const matchesDegree =
      milestone.degreeLevel === 'All' || milestone.degreeLevel === degreeLevel
    const matchesPlan =
      milestone.plans.includes('All') ||
      (Boolean(educationPlan) && milestone.plans.includes(educationPlan as EducationPlan))

    return milestone.isEnabled && matchesDegree && matchesPlan
  })
}

export function toFrontendStudentMilestones(milestones: Milestone[]): StudentMilestone[] {
  return milestones.map((milestone) => ({
    ...milestone,
    prerequisiteMilestoneIds: [...milestone.prerequisiteMilestoneIds],
    status: 'In Progress',
    evidenceUrl: null,
    advisorComment: null,
    rejectionCount: 0,
    maxRejectedRevisionRounds: 3,
    submittedAt: null,
    reviewedAt: null,
  }))
}
