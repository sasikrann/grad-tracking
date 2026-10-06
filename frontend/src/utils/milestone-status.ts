import type { StudentMilestoneStatus } from '@/types/milestone'

// Maps a milestone workflow status to its visual color class.
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
// Derives the display status of a milestone from its workflow state and deadline.
