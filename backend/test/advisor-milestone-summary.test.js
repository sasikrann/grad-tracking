import assert from 'node:assert/strict'
import test from 'node:test'

import { parseMilestoneSummaryFilters } from '../src/controllers/advisors.controller.js'

test('uses all filters by default', () => {
  assert.deepEqual(parseMilestoneSummaryFilters(), {
    semester: null,
    year: null,
  })
})

test('parses semester and year filters', () => {
  assert.deepEqual(parseMilestoneSummaryFilters({ semester: '2', year: '2026' }), {
    semester: '2',
    year: 2026,
  })
})

test('accepts explicit all filters', () => {
  assert.deepEqual(parseMilestoneSummaryFilters({ semester: 'all', year: 'all' }), {
    semester: null,
    year: null,
  })
})

test('rejects an invalid semester', () => {
  assert.throws(
    () => parseMilestoneSummaryFilters({ semester: '3' }),
    (error) => error.statusCode === 400 && error.message.includes('semester'),
  )
})

test('rejects an invalid year', () => {
  assert.throws(
    () => parseMilestoneSummaryFilters({ year: 'not-a-year' }),
    (error) => error.statusCode === 400 && error.message.includes('year'),
  )
})
