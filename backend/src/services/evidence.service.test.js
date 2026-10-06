// Verifies which users may access a student's uploaded milestone evidence.
import assert from 'node:assert/strict'
import test from 'node:test'

import { canAccessEvidence } from './evidence.service.js'

const evidence = {
  studentUserId: 'student-user',
  primaryAdvisorUserId: 'advisor-user',
  coAdvisorUserIds: ['co-advisor-user'],
}

test('allows the evidence owner, all advisors, and administrators', () => {
  assert.equal(canAccessEvidence({ userId: 'student-user', role: 'student' }, evidence), true)
  assert.equal(canAccessEvidence({ userId: 'advisor-user', role: 'advisor' }, evidence), true)
  assert.equal(canAccessEvidence({ userId: 'co-advisor-user', role: 'advisor' }, evidence), true)
  assert.equal(canAccessEvidence({ userId: 'other-advisor', role: 'advisor' }, evidence), true)
  assert.equal(canAccessEvidence({ userId: 'admin-user', role: 'admin' }, evidence), true)
})

test('rejects students who do not own the evidence and unknown roles', () => {
  assert.equal(canAccessEvidence({ userId: 'other-student', role: 'student' }, evidence), false)
  assert.equal(canAccessEvidence({ userId: 'unknown-user', role: 'unknown' }, evidence), false)
})
