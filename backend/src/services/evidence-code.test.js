import assert from 'node:assert/strict'
import test from 'node:test'

import { createEvidenceCode, normalizeEvidenceCode } from './evidence-code.js'

test('normalizes an administrator-defined evidence code', () => {
  assert.equal(normalizeEvidenceCode(' research proposal '), 'RESEARCH-PROPOSAL')
})

test('generates a short evidence code from a custom milestone title', () => {
  assert.equal(
    createEvidenceCode({ title: 'Submit Research Proposal Result', sequenceOrder: 4 }),
    'RESEARCH-PROPOSAL',
  )
})

test('falls back to the milestone order for a Thai-only title', () => {
  assert.equal(createEvidenceCode({ title: 'ยื่นเอกสาร', sequenceOrder: 4 }), 'MS04')
})
