import assert from 'node:assert/strict'
import test from 'node:test'

import {
  academicTermForDate,
  isPastNormalStudyPeriod,
  maximumStudyYears,
  nextAcademicTerm,
  normalStudyEndDate,
} from './study-extension-policy.js'

test('uses the configured normal study periods for each degree and plan', () => {
  assert.equal(maximumStudyYears('Master', 'A1'), 4)
  assert.equal(maximumStudyYears('Doctoral', '2.1'), 5)
  assert.equal(maximumStudyYears('Doctoral', '2.2'), 7)
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
})

test('grants one academic term at a time and advances to the next term', () => {
  assert.deepEqual(academicTermForDate('2026-09-21'), {
    academicYear: 2026, semester: '1', startsOn: '2026-08-01', endsOn: '2026-12-31',
  })
  assert.deepEqual(nextAcademicTerm({ academicYear: 2026, semester: '1' }), {
    academicYear: 2026, semester: '2', startsOn: '2027-01-01', endsOn: '2027-05-31',
  })
})
