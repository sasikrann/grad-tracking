import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import StudentFilters from '../student/StudentFilters.vue'
import { useLanguage } from '@/composables/useLanguage'
import type { StudentFiltersState } from '@/types/student'

const masterFilters: StudentFiltersState = {
  semester: 'all',
  year: 'all',
  degree: 'Master',
  plan: 'all',
  status: 'all',
  advisor: 'all',
}

describe('StudentFilters', () => {
  beforeEach(() => useLanguage().setLanguage('th'))

  it('keeps the selected filter label localized when the API returns no options', () => {
    const wrapper = mount(StudentFilters, {
      props: {
        search: '',
        modelValue: masterFilters,
        advisorMode: 'all-only',
        filterOptions: {
          semesters: [],
          years: [],
          degrees: [],
          plans: [],
          statuses: [],
        },
      },
    })

    expect(wrapper.text()).toContain('ปริญญาโท')
    expect(wrapper.text()).not.toContain('All Program')
  })

  it('only offers plans compatible with the selected degree', async () => {
    const wrapper = mount(StudentFilters, {
      props: {
        search: '',
        modelValue: masterFilters,
        advisorMode: 'all-only',
        filterOptions: {
          semesters: [],
          years: [],
          degrees: ['Master', 'Doctoral'],
          plans: ['A1', 'A2', 'B', '2.1', '2.2'],
          statuses: [],
        },
      },
    })

    const planButton = wrapper
      .findAll('button')
      .find((button) => button.text() === 'ทุกแผนการศึกษา')
    expect(planButton).toBeDefined()
    await planButton?.trigger('click')

    const visibleLabels = wrapper.findAll('button').map((button) => button.text())
    expect(visibleLabels).toContain('ก1')
    expect(visibleLabels).not.toContain('2.1')
    expect(visibleLabels).not.toContain('2.2')
  })
})
