import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

import StudentMilestoneCard from '../student-milestone/StudentMilestoneCard.vue'
import MilestoneSelectDropdown from '../milestone/form/MilestoneSelectDropdown.vue'
import type { StudentMilestone } from '@/types/milestone'

class ResizeObserverStub {
  observe() {}
  disconnect() {}
}

vi.stubGlobal('ResizeObserver', ResizeObserverStub)

const appointmentMilestone: StudentMilestone = {
  milestoneId: 'appointment',
  templateKey: 'master-advisor-appointment',
  degreeLevel: 'Master',
  semester: 'all',
  plans: ['A1'],
  title: 'Appoint an Advisor',
  description: null,
  references: [],
  sequenceOrder: 1,
  openDate: null,
  deadline: null,
  firstReminderDate: null,
  secondReminderDate: null,
  status: 'In Progress',
  evidenceUrl: null,
  advisorComment: null,
  rejectionCount: 0,
  maxRejectedRevisionRounds: 3,
  submittedAt: null,
  reviewedAt: null,
}

const advisors = [
  {
    advisorId: 'A1',
    userId: 'U1',
    fullName: 'Advisor One',
    email: 'one@mfu.ac.th',
    status: 'active' as const,
    createdAt: '2026-09-09T00:00:00.000Z',
  },
  {
    advisorId: 'A2',
    userId: 'U2',
    fullName: 'Advisor Two',
    email: 'two@mfu.ac.th',
    status: 'active' as const,
    createdAt: '2026-09-09T00:00:00.000Z',
  },
  {
    advisorId: 'A3',
    userId: 'U3',
    fullName: 'Advisor Three',
    email: 'three@mfu.ac.th',
    status: 'active' as const,
    createdAt: '2026-09-09T00:00:00.000Z',
  },
]

describe('StudentMilestoneCard advisor draft', () => {
  it('keeps unsubmitted advisor selections when auto-refresh supplies unchanged saved values', async () => {
    const wrapper = mount(StudentMilestoneCard, {
      props: {
        milestone: appointmentMilestone,
        index: 1,
        advisors,
        currentAdvisorId: null,
        currentCoAdvisorIds: [],
      },
    })

    const dropdowns = wrapper.findAllComponents(MilestoneSelectDropdown)
    dropdowns[0]?.vm.$emit('select', 'A1')
    dropdowns[1]?.vm.$emit('select', 'A2')
    dropdowns[2]?.vm.$emit('select', 'A3')
    await wrapper.vm.$nextTick()

    await wrapper.setProps({ advisors: [...advisors], currentCoAdvisorIds: [] })

    const refreshedDropdowns = wrapper.findAllComponents(MilestoneSelectDropdown)
    expect(refreshedDropdowns[0]?.props('modelValue')).toBe('A1')
    expect(refreshedDropdowns[1]?.props('modelValue')).toBe('A2')
    expect(refreshedDropdowns[2]?.props('modelValue')).toBe('A3')
    expect(
      refreshedDropdowns[0]
        ?.props('options')
        .some((option: { value: string }) => ['A2', 'A3'].includes(option.value)),
    ).toBe(false)
    expect(
      refreshedDropdowns[1]
        ?.props('options')
        .some((option: { value: string }) => ['A1', 'A3'].includes(option.value)),
    ).toBe(false)
    expect(
      refreshedDropdowns[2]
        ?.props('options')
        .some((option: { value: string }) => ['A1', 'A2'].includes(option.value)),
    ).toBe(false)
  })
})
