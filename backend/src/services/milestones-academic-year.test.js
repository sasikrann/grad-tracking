import assert from 'node:assert/strict'
import test from 'node:test'

import { ensureAcademicYearMilestoneTemplates } from './academic-year-milestones.service.js'

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
      evidence_code: 'ETHICS',
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
  const inserts = calls.filter(({ sql }) => sql.includes('INSERT INTO milestone_templates'))
  assert.equal(inserts.length, 2)
  assert.deepEqual(inserts.map(({ values }) => values[1]), [
    'academic-2026-A1-master-thesis-ethics-training',
    'academic-2026-A2-master-thesis-ethics-training',
  ])
  assert.deepEqual(inserts.map(({ values }) => values[6]), [['A1'], ['A2']])
  assert.equal(inserts[0].values[3], 2026)
  assert.equal(inserts[0].values[7], 'ETHICS')
  assert.match(inserts[0].sql, /NULL, NULL, NULL, NULL/)
})

test('keeps prerequisites inside each separate plan', async () => {
  const calls = []
  const sourceTemplates = [
    {
      milestone_id: 'source-1',
      default_template_key: 'master-thesis-first',
      degree_level: 'Master', semester: 'all', plans: ['A1', 'A2'],
      prerequisite_milestone_ids: [], title: 'First', description: null,
      evidence_code: 'FIRST',
      reference_urls: [], sequence_order: 1, is_enabled: true,
    },
    {
      milestone_id: 'source-2',
      default_template_key: 'master-thesis-second',
      degree_level: 'Master', semester: 'all', plans: ['A1', 'A2'],
      prerequisite_milestone_ids: ['source-1'], title: 'Second', description: null,
      evidence_code: 'SECOND',
      reference_urls: [], sequence_order: 2, is_enabled: true,
    },
  ]
  const client = {
    async query(sql, values = []) {
      calls.push({ sql, values })
      if (calls.length === 1) return { rowCount: 0, rows: [] }
      if (calls.length === 2) return { rowCount: 1, rows: [{ academic_year: null }] }
      if (calls.length === 3) return { rowCount: 2, rows: sourceTemplates }
      return { rowCount: 1, rows: [] }
    },
  }

  await ensureAcademicYearMilestoneTemplates(client, 2026)

  const inserts = calls.filter(({ sql }) => sql.includes('INSERT INTO milestone_templates'))
  const updates = calls.filter(({ sql }) => sql.includes('UPDATE milestone_templates'))
  const firstIdByPlan = new Map(inserts
    .filter(({ values }) => values[8] === 'First')
    .map(({ values }) => [values[6][0], values[0]]))
  for (const update of updates.filter(({ values }) => values[1].length)) {
    const secondInsert = inserts.find(({ values }) => values[0] === update.values[0])
    const plan = secondInsert.values[6][0]
    assert.deepEqual(update.values[1], [firstIdByPlan.get(plan)])
  }
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
