import { defineComponent, h } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import { useStudentOverview } from '../useStudentOverview'
import type { Student } from '@/types/student'

function student(studentId: string, educationPlan: string): Student {
  return {
    name: studentId,
    nameEnglish: studentId,
    nameThai: null,
    studentId,
    degree: 'Master',
    program: 'Test program',
    educationPlan,
    enrollmentAcademicYear: '2568',
    expectedGraduationYear: '2570',
    semester: 1,
    year: '2568',
    progress: 0,
    status: 'On-track',
    studyExtensionGranted: false,
    advisor: '-',
    isAdvised: false,
    isCoAdvised: false,
  }
}

describe('useStudentOverview education-plan filtering', () => {
  it('treats legacy and current Master plan names as the same filter group', async () => {
    const loadedStudents = [
      student('legacy-a1', 'A1'),
      student('current-11', '1.1'),
      student('legacy-a2', 'A2'),
      student('current-12', '1.2'),
    ]
    let overview!: ReturnType<typeof useStudentOverview>

    const host = defineComponent({
      setup() {
        overview = useStudentOverview(vi.fn().mockResolvedValue(loadedStudents), 'all')
        return () => h('div')
      },
    })

    const wrapper = mount(host)
    await flushPromises()

    overview.filters.value.plan = '1.1'

    const matchingStudentIds = overview.filteredStudents.value.map(({ studentId }) => studentId)
    expect(matchingStudentIds).toHaveLength(2)
    expect(matchingStudentIds).toEqual(expect.arrayContaining(['legacy-a1', 'current-11']))

    wrapper.unmount()
  })
})
