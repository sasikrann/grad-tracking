import { describe, expect, it } from 'vitest'

import { advisorSidebarInitials, advisorSidebarName } from '@/utils/advisor-name'

describe('advisor name display', () => {
  it('uses the Thai personal name after ดร. for initials', () => {
    const name = 'ผู้ช่วยศาสตราจารย์ ดร.สันติชัย วิชา'

    expect(advisorSidebarName(name)).toBe('สันติชัย วิชา')
    expect(advisorSidebarInitials(name)).toBe('สว')
  })

  it('uses the English personal name after Dr. for initials', () => {
    const name = 'Assistant Professor Group Captain Dr.Thongchai Yooyativong'

    expect(advisorSidebarName(name)).toBe('Thongchai Yooyativong')
    expect(advisorSidebarInitials(name)).toBe('TY')
  })

  it('uses the consonant after a leading Thai vowel', () => {
    const name = 'รองศาสตราจารย์ ดร.เต็มดี แสงงาม'

    expect(advisorSidebarInitials(name)).toBe('ตส')
  })

  it('keeps a name without a doctor title intact', () => {
    expect(advisorSidebarInitials('Somsri Jaidee')).toBe('SJ')
  })
})
