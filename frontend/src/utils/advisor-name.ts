interface AdvisorName {
  fullName?: string | null
  fullNameThai?: string | null
}

export function advisorDisplayName(advisor: AdvisorName, isThai: boolean): string {
  return (isThai ? advisor.fullNameThai?.trim() || advisor.fullName : advisor.fullName) ?? ''
}

// Only the sidebar removes the English title; stored names remain unchanged.
export function advisorSidebarName(fullName: string): string {
  const name = fullName.trim()
  const title = /(?:\bDr\.?|ดร\.)\s*/i.exec(name)
  return title ? name.slice(title.index + title[0].length).trim() || name : name
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
