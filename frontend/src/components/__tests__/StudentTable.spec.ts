import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import StudentTable from '../student/StudentTable.vue'
import { useLanguage } from '@/composables/useLanguage'
import type { StudentTableItem } from '@/types/student'

function student(studentId: string, educationPlan: string): StudentTableItem {
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
  }
}

describe('StudentTable education-plan labels', () => {
  beforeEach(() => useLanguage().setLanguage('th'))

  it('preserves legacy labels while showing current plan names for new records', () => {
    const wrapper = mount(StudentTable, {
      props: {
        students: [student('legacy-a1', 'A1'), student('current-11', '1.1')],
        isLoading: false,
        error: '',
      },
    })

    expect(wrapper.text()).toContain('แผน ก1')
    expect(wrapper.text()).toContain('แผน 1.1')
  })
})
// Verifies that the table preserves legacy labels while displaying current plan names.
