import { beforeEach, describe, expect, it } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'
import Navbar from '../navigation/Navbar.vue'
import { useLanguage } from '@/composables/useLanguage'
import { th } from '@/lang/th'

describe('Navbar', () => {
  beforeEach(() => useLanguage().setLanguage('en'))

  it.each([
    ['admin', th.nav.advisorManagement],
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

  it('allows every role to change the language and defaults advisors and students to English', async () => {
    const admin = mount(Navbar, {
      props: { user: { fullName: 'Admin User', email: 'admin@example.com', role: 'admin' } },
      global: { stubs: { RouterLink: RouterLinkStub } },
    })
    const adminThaiButton = admin.findAll('button').find((button) => button.text() === 'TH')
    expect(adminThaiButton?.attributes('disabled')).toBeUndefined()
    await adminThaiButton?.trigger('click')
    expect(admin.text()).toContain(th.nav.studentManagement)

    useLanguage().setLanguage('en')
    const advisor = mount(Navbar, {
      props: { user: { fullName: 'Advisor User', email: 'advisor@example.com', role: 'advisor' } },
      global: { stubs: { RouterLink: RouterLinkStub } },
    })
    expect(useLanguage().language.value).toBe('en')
    const advisorThaiButton = advisor.findAll('button').find((button) => button.text() === 'TH')
    expect(advisorThaiButton?.attributes('disabled')).toBeUndefined()
    await advisorThaiButton?.trigger('click')
    expect(advisor.text()).toContain(th.nav.studentOverall)

    useLanguage().setLanguage('en')
    const student = mount(Navbar, {
      props: { user: { fullName: 'Student User', email: 'student@example.com', role: 'student' } },
      global: { stubs: { RouterLink: RouterLinkStub } },
    })
    const studentThaiButton = student.findAll('button').find((button) => button.text() === 'TH')
    expect(studentThaiButton?.attributes('disabled')).toBeUndefined()
    await studentThaiButton?.trigger('click')
    expect(useLanguage().language.value).toBe('th')
    expect(student.text()).toContain(th.nav.studentInformation)
  })
})
