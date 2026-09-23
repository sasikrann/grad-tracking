interface AdvisorName {
  fullName?: string | null
  fullNameThai?: string | null
}

export function advisorDisplayName(advisor: AdvisorName, isThai: boolean): string {
  return (isThai ? advisor.fullNameThai?.trim() || advisor.fullName : advisor.fullName) ?? ''
}

// Display the personal name after Dr./ดร. while leaving the stored name unchanged.
export function advisorSidebarName(fullName: string): string {
  const name = fullName
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
  const doctorTitle = /(?:\bDr\s*\.|ดร\s*\.)\s*/iu.exec(name)
  return doctorTitle
    ? name.slice((doctorTitle.index ?? 0) + doctorTitle[0].length).trim() || name
    : name
}

export function advisorSidebarInitials(fullName: string): string {
  const words = advisorSidebarName(fullName)
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  const firstName = words[0] ?? ''
  const lastName = words[words.length - 1] ?? ''
  const initialWords = lastName && lastName !== firstName ? [firstName, lastName] : [firstName]

  return initialWords
    .map((word) => word.replace(/^[เแโใไ]+/, '').charAt(0).toUpperCase())
    .join('')
}
