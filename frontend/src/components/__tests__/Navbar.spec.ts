import { describe, expect, it } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'
import Navbar from '../navbar.vue'

describe('Navbar', () => {
  it.each([
    ['admin', 'Advisor Management'],
    ['lecturer', 'Milestone Summary'],
    ['advisor', 'Milestone Summary'],
    ['student', 'Student Information'],
  ] as const)('renders the correct menu for %s', (role, expectedMenu) => {
    const wrapper = mount(Navbar, {
      props: {
        user: {
          fullName: 'Dr. John Doe',
          email: 'johndoe@lamduan.mfu.ac.th',
          role,
        },
      },
      global: {
        stubs: { RouterLink: RouterLinkStub },
      },
    })

    expect(wrapper.text()).toContain('Thesis Tracker')
    expect(wrapper.text()).toContain(expectedMenu)
    expect(wrapper.text()).toContain('Dr. John Doe')
    expect(wrapper.text()).toContain('JD')
  })
})
