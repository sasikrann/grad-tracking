import { beforeEach, describe, expect, it } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'
import Navbar from '../navbar.vue'
import { useLanguage } from '@/composables/useLanguage'

describe('Navbar', () => {
  beforeEach(() => useLanguage().setLanguage('en'))

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

    expect(wrapper.text()).toContain('GRAD Tracking')
    expect(wrapper.text()).toContain(expectedMenu)
    expect(wrapper.text()).toContain('Dr. John Doe')
    expect(wrapper.text()).toContain('JD')
  })

  it('allows only admins to change the language', async () => {
    const admin = mount(Navbar, {
      props: { user: { fullName: 'Admin User', email: 'admin@example.com', role: 'admin' } },
      global: { stubs: { RouterLink: RouterLinkStub } },
    })
    const adminThaiButton = admin.findAll('button').find((button) => button.text() === 'TH')
    expect(adminThaiButton?.attributes('disabled')).toBeUndefined()
    await adminThaiButton?.trigger('click')
    expect(admin.text()).toContain('จัดการนักศึกษา')

    useLanguage().setLanguage('en')
    const student = mount(Navbar, {
      props: { user: { fullName: 'Student User', email: 'student@example.com', role: 'student' } },
      global: { stubs: { RouterLink: RouterLinkStub } },
    })
    const studentThaiButton = student.findAll('button').find((button) => button.text() === 'TH')
    expect(studentThaiButton?.attributes('disabled')).toBeDefined()
    await studentThaiButton?.trigger('click')
    expect(useLanguage().language.value).toBe('en')
  })
})
