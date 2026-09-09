import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import PaginationControls from '../common/PaginationControls.vue'

describe('PaginationControls', () => {
  it('uses the Student Management appearance and emits previous, page, and next changes', async () => {
    const wrapper = mount(PaginationControls, {
      props: { currentPage: 3, totalPages: 5, paginationLabel: 'Pages' },
    })

    expect(wrapper.text()).toContain('‹')
    expect(wrapper.text()).toContain('1')
    expect(wrapper.text()).toContain('5')
    expect(wrapper.text()).toContain('›')

    await wrapper.get('[aria-label="Pages: previous"]').trigger('click')
    await wrapper.get('[aria-label="Pages: 4"]').trigger('click')
    await wrapper.get('[aria-label="Pages: next"]').trigger('click')

    expect(wrapper.emitted('change')).toEqual([[2], [4], [4]])
  })

  it('collapses long page ranges with ellipses', () => {
    const wrapper = mount(PaginationControls, {
      props: { currentPage: 6, totalPages: 12, paginationLabel: 'Pages' },
    })

    expect(wrapper.text()).toContain('…')
    expect(wrapper.text()).toContain('5')
    expect(wrapper.text()).toContain('6')
    expect(wrapper.text()).toContain('7')
    expect(wrapper.text()).not.toContain('12')
  })
})
