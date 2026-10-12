import assert from 'node:assert/strict'
import test from 'node:test'

import {
  academicTermForDate,
  extensionPeriodFromDate,
  hasExtensionEnded,
  isPastNormalStudyPeriod,
  maximumStudyYears,
  normalStudyEndDate,
} from './study-extension-policy.js'

test('uses the configured normal study periods for each degree and plan', () => {
  assert.equal(maximumStudyYears('Master', 'A1'), 4)
  assert.equal(maximumStudyYears('Doctoral', '2.1'), 5)
  assert.equal(maximumStudyYears('Doctoral', '2.2'), 7)
})

test('grants exactly four calendar months from the approval date', () => {
  assert.deepEqual(extensionPeriodFromDate('2026-08-01'), {
    startsOn: '2026-08-01', endsOn: '2026-12-01',
  })
  assert.deepEqual(extensionPeriodFromDate('2026-10-31'), {
    startsOn: '2026-10-31', endsOn: '2027-02-28',
  })
})

test('opens the next round only after the previous four-month deadline', () => {
  assert.equal(hasExtensionEnded('2026-12-01', '2026-11-30'), false)
  assert.equal(hasExtensionEnded('2026-12-01', '2026-12-01'), false)
  assert.equal(hasExtensionEnded('2026-12-01', '2026-12-02'), true)
})

test('calculates normal study end from the enrollment semester without a two-year rule', () => {
  assert.equal(normalStudyEndDate({
    degreeLevel: 'Master', educationPlan: 'A1', enrollmentAcademicYear: 2020, semester: '1',
  }), '2024-05-31')
  assert.equal(normalStudyEndDate({
    degreeLevel: 'Doctoral', educationPlan: '2.2', enrollmentAcademicYear: 2020, semester: '2',
  }), '2027-12-31')
  assert.equal(isPastNormalStudyPeriod({
    degreeLevel: 'Doctoral', educationPlan: '2.1', enrollmentAcademicYear: 2020, semester: '1',
  }, '2025-06-01'), true)
  const student = {
    degreeLevel: 'Master', educationPlan: '1.1', enrollmentAcademicYear: 2020, semester: '1',
  }
  assert.equal(isPastNormalStudyPeriod(student, '2024-05-30'), false)
  assert.equal(isPastNormalStudyPeriod(student, '2024-05-31'), false)
  assert.equal(isPastNormalStudyPeriod(student, '2024-06-01'), true)
})

test('identifies the academic term only as extension metadata', () => {
  assert.deepEqual(academicTermForDate('2026-09-21'), {
    academicYear: 2026, semester: '1', startsOn: '2026-08-01', endsOn: '2026-12-31',
  })
})
// Verifies study-duration rules and extension date calculations for each degree plan.
