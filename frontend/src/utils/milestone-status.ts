import type { StudentMilestoneStatus } from '@/types/milestone'

export function milestoneStatusColor(status: StudentMilestoneStatus | undefined) {
  if (status === 'Approved' || status === 'Completed') {
    return 'bg-[#49b866] text-white'
  }

  if (status === 'Missing') {
    return 'bg-[#d90010] text-white'
  }

  if (status === 'In Progress') {
    return 'bg-[#ffbb2a] text-white'
  }

  return 'bg-slate-300 text-white'
}
