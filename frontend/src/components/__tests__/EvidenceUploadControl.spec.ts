import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import EvidenceUploadControl from '../student-milestone/EvidenceUploadControl.vue'

describe('EvidenceUploadControl', () => {
  it('emits the selected evidence file without changing it', async () => {
    const wrapper = mount(EvidenceUploadControl)
    const file = new File(['evidence'], 'advisor-evidence.pdf', { type: 'application/pdf' })
    const input = wrapper.get('input[type="file"]')
    Object.defineProperty(input.element, 'files', { configurable: true, value: [file] })

    await input.trigger('change')

    expect(wrapper.emitted('select')?.[0]).toEqual([file])
  })
})
