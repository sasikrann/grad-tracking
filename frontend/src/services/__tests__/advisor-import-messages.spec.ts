import { describe, expect, it } from 'vitest'
import { advisorImportMessage } from '../advisor-import-messages'

describe('advisor import notification language', () => {
  it('translates duplicate ID errors according to the selected language', () => {
    const message = 'Duplicate Advisor ID found in the import file.'
    expect(advisorImportMessage(message, true)).toContain('พบรหัสอาจารย์ซ้ำ')
    expect(advisorImportMessage(message, false)).toBe(message)
  })
  it('translates organization email validation for English users', () => {
    expect(advisorImportMessage('กรุณากรอกอีเมลในองค์กรเท่านั้น', false)).toContain('@mfu.ac.th')
  })
  it('preserves IDs and email addresses in translated partial failures', () => {
    expect(advisorImportMessage('Advisor A002: Email a@mfu.ac.th is already assigned to advisor A001; please correct the email for advisor A002.', true))
      .toBe('อาจารย์รหัส A002: อีเมล a@mfu.ac.th ถูกใช้โดยอาจารย์รหัส A001 แล้ว กรุณาแก้ไขอีเมลของอาจารย์รหัส A002')
  })
  it('uses a Thai fallback for unrecognized server errors', () => {
    expect(advisorImportMessage('Internal server error', true)).toBe('ไม่สามารถนำเข้าข้อมูลอาจารย์ที่ปรึกษาได้ กรุณาลองอีกครั้ง')
  })
})
