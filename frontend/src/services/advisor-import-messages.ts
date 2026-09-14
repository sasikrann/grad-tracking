export function advisorImportMessage(text: string, isThai: boolean): string {
  const message = text.replace(/\bRow\s+\d+:\s*/gi, '')
  const organizationMessage = 'กรุณากรอกอีเมลในองค์กรเท่านั้น'
  if (message === organizationMessage) {
    return isThai ? organizationMessage : 'Please use an organization email address (@mfu.ac.th).'
  }
  if (!isThai) return message || 'Unable to import advisors. Please try again.'

  const advisor = message.match(/^Advisor (.+?): (.*)$/)
  if (advisor) return `อาจารย์รหัส ${advisor[1]}: ${advisorImportMessage(advisor[2] ?? '', true)}`

  const messages: Record<string, string> = {
    'Duplicate Advisor ID found in the import file.': 'พบรหัสอาจารย์ซ้ำในไฟล์นำเข้า กรุณาแก้ไขแล้วนำเข้าอีกครั้ง',
    'No data found.': 'ไม่พบข้อมูลในไฟล์นำเข้า',
    'Only CSV and XLSX files are supported': 'รองรับเฉพาะไฟล์ CSV และ XLSX เท่านั้น',
    'A CSV or XLSX file is required': 'กรุณาเลือกไฟล์ CSV หรือ XLSX',
    'File too large': 'ไฟล์มีขนาดเกิน 5 MB กรุณาเลือกไฟล์ใหม่',
    'A valid email is required': 'กรุณากรอกอีเมลให้ถูกต้อง',
  }
  if (messages[message]) return messages[message]
  if (message.includes('Thai characters were replaced with ?')) {
    return 'ภาษาไทยในไฟล์ CSV เสียหาย กรุณาบันทึกไฟล์ต้นฉบับเป็น CSV แบบ UTF-8 แล้วนำเข้าอีกครั้ง'
  }
  if (/\b(missing|required)\b/i.test(message)) return 'กรุณากรอกข้อมูลให้ครบถ้วน'

  const duplicate = message.match(/^Email (.+) is duplicated in the import file for advisors (.+) and (.+)\. Please correct the email and import again\.$/)
  if (duplicate) return `อีเมล ${duplicate[1]} ซ้ำในไฟล์สำหรับอาจารย์รหัส ${duplicate[2]} และ ${duplicate[3]} กรุณาแก้ไขอีเมลแล้วนำเข้าอีกครั้ง`
  const assigned = message.match(/^Email (.+) is already assigned to advisor (.+?)(?:; please correct the email for advisor (.+)\.)?$/)
  if (assigned) return `อีเมล ${assigned[1]} ถูกใช้โดยอาจารย์รหัส ${assigned[2]} แล้ว${assigned[3] ? ` กรุณาแก้ไขอีเมลของอาจารย์รหัส ${assigned[3]}` : ''}`
  const account = message.match(/^Email (.+) belongs to a (.+) account$/)
  if (account) {
    const roles: Record<string, string> = { student: 'นักศึกษา', admin: 'ผู้ดูแลระบบ', advisor: 'อาจารย์ที่ปรึกษา' }
    return `อีเมล ${account[1]} ถูกใช้โดยบัญชี${roles[account[2] ?? ''] ?? 'ผู้ใช้อื่น'}แล้ว`
  }
  const another = message.match(/^Email (.+) belongs to another user$/)
  if (another) return `อีเมล ${another[1]} ถูกใช้โดยผู้ใช้อื่นแล้ว`
  return 'ไม่สามารถนำเข้าข้อมูลอาจารย์ที่ปรึกษาได้ กรุณาลองอีกครั้ง'
}
