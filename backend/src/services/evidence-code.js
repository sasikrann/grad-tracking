const maxEvidenceCodeLength = 24

const defaultEvidenceCodes = {
  'ethics-training': 'ETHICS',
  'english-proficiency': 'ENGLISH',
  'advisor-appointment': 'ADVISOR',
  'comprehensive-exam': 'COMPREHENSIVE',
  'qualifying-exam': 'QUALIFYING',
  'proposal-exam': 'PROPOSAL',
  'support-grant': 'SUPPORT-GRANT',
  'defense-exam': 'DEFENSE',
  'format-checking': 'FORMAT-CHECK',
  'complete-file': 'COMPLETE-FILE',
  'research-publication': 'PUBLICATION',
  'publication-support-grant': 'PUBLICATION-GRANT',
  graduation: 'GRADUATE',
}

const ignoredTitleWords = new Set([
  'A',
  'AN',
  'THE',
  'FOR',
  'OF',
  'TO',
  'ATTEND',
  'SUBMIT',
  'APPLY',
  'PASS',
  'COMPLETE',
  'RESULT',
])

export function normalizeEvidenceCode(value) {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxEvidenceCodeLength)
    .replace(/-+$/g, '')
}

export function defaultEvidenceCodeForKey(templateKey) {
  const baseKey = String(templateKey ?? '')
    .replace(/^academic-\d+-/, '')
    .replace(/^(?:A1|A2|B|2\.1|2\.2)-/, '')
  const definitionKey = Object.keys(defaultEvidenceCodes).find((key) => baseKey.endsWith(key))
  return definitionKey ? defaultEvidenceCodes[definitionKey] : ''
}

export function createEvidenceCode({ value, title, templateKey, sequenceOrder } = {}) {
  const requestedCode = normalizeEvidenceCode(value)
  if (requestedCode) return requestedCode

  const defaultCode = defaultEvidenceCodeForKey(templateKey)
  if (defaultCode) return defaultCode

  const englishTitle = String(title ?? '').split('(')[0]
  const titleWords = normalizeEvidenceCode(englishTitle)
    .split('-')
    .filter((word) => word && !ignoredTitleWords.has(word))
  const generatedCode = normalizeEvidenceCode(titleWords.slice(0, 2).join('-'))
  if (generatedCode) return generatedCode

  const order = Number(sequenceOrder)
  return `MS${Number.isInteger(order) && order > 0 ? String(order).padStart(2, '0') : '01'}`
}

export { maxEvidenceCodeLength }
