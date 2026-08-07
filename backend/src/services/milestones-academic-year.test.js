import assert from 'node:assert/strict'
import test from 'node:test'

import { ensureAcademicYearMilestoneTemplates } from './milestones.service.js'

test('copies the latest academic-year templates with blank dates', async () => {
  const calls = []
  const sourceTemplates = [
    {
      milestone_id: 'source-1',
      default_template_key: 'academic-2025-master-thesis-ethics-training',
      degree_level: 'Master',
      semester: 'all',
      plans: ['A1', 'A2'],
      prerequisite_milestone_ids: [],
      title: 'Ethics',
      description: null,
      reference_urls: [],
      sequence_order: 1,
      is_enabled: true,
    },
  ]
  const client = {
    async query(sql, values = []) {
      calls.push({ sql, values })
      if (calls.length === 1) return { rowCount: 0, rows: [] }
      if (calls.length === 2) return { rowCount: 1, rows: [{ academic_year: 2025 }] }
      if (calls.length === 3) return { rowCount: 1, rows: sourceTemplates }
      return { rowCount: 1, rows: [] }
    },
  }

  assert.equal(await ensureAcademicYearMilestoneTemplates(client, 2026), true)

  assert.match(calls[1].sql, /academic_year < \$1/)
  assert.deepEqual(calls[1].values, [2026])
  const insert = calls.find(({ sql }) => sql.includes('INSERT INTO milestone_templates'))
  assert.ok(insert)
  assert.equal(insert.values[1], 'academic-2026-master-thesis-ethics-training')
  assert.equal(insert.values[3], 2026)
  assert.match(insert.sql, /NULL, NULL, NULL, NULL/)
})

test('does not duplicate an academic year that already exists', async () => {
  let calls = 0
  const client = {
    async query() {
      calls += 1
      return { rowCount: 1, rows: [{ exists: 1 }] }
    },
  }

  assert.equal(await ensureAcademicYearMilestoneTemplates(client, 2026), false)
  assert.equal(calls, 1)
})
