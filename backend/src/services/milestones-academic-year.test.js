// Verifies that academic-year milestone sets are copied independently for each exact plan.
import assert from 'node:assert/strict'
import test from 'node:test'

import { ensureAcademicYearMilestoneTemplates } from './academic-year-milestones.service.js'

test('copies only the missing degree-and-plan scope from the latest year of that plan', async () => {
  const calls = []
  const sourceTemplates = [
    {
      milestone_id: 'source-first',
      default_template_key: 'academic-2025-1.1-first',
      degree_level: 'Master', semester: 'all', prerequisite_milestone_ids: [],
      evidence_code: 'FIRST', title: 'First', description: null,
      reference_urls: [], sequence_order: 1, is_enabled: true,
    },
    {
      milestone_id: 'source-second',
      default_template_key: 'academic-2025-1.1-second',
      degree_level: 'Master', semester: 'all', prerequisite_milestone_ids: ['source-first'],
      evidence_code: 'SECOND', title: 'Second', description: null,
      reference_urls: [], sequence_order: 2, is_enabled: true,
    },
  ]
  const client = {
    async query(sql, values = []) {
      calls.push({ sql, values })
      if (calls.length === 1) {
        return { rowCount: 2, rows: [
          { degreeLevel: 'Master', educationPlan: 'A1' },
          { degreeLevel: 'Master', educationPlan: '1.1' },
        ] }
      }
      if (calls.length === 2) return { rowCount: 1, rows: [{ exists: 1 }] }
      if (calls.length === 3) return { rowCount: 0, rows: [] }
      if (calls.length === 4) return { rowCount: 1, rows: [{ academicYear: 2025 }] }
      if (calls.length === 5) return { rowCount: 2, rows: sourceTemplates }
      return { rowCount: 1, rows: [] }
    },
  }

  assert.equal(await ensureAcademicYearMilestoneTemplates(client, 2026), true)

  const inserts = calls.filter(({ sql }) => sql.includes('INSERT INTO milestone_templates'))
  assert.equal(inserts.length, 2)
  assert.ok(inserts.every(({ values }) => values[6] === '1.1'))
  assert.deepEqual(inserts.map(({ values }) => values[1]), [
    'academic-2026-1.1-first',
    'academic-2026-1.1-second',
  ])
  assert.deepEqual(calls[3].values, [2026, 'Master', '1.1'])

  const prerequisiteUpdates = calls.filter(({ sql }) => sql.includes('UPDATE milestone_templates'))
  const firstCopiedId = inserts[0].values[0]
  assert.deepEqual(prerequisiteUpdates[1].values[1], [firstCopiedId])
})

test('does not fall back from a new plan to a legacy equivalent plan', async () => {
  const calls = []
  const client = {
    async query(sql, values = []) {
      calls.push({ sql, values })
      if (calls.length === 1) {
        return { rowCount: 1, rows: [{ degreeLevel: 'Master', educationPlan: '1.1' }] }
      }
      if (calls.length === 2) return { rowCount: 0, rows: [] }
      if (calls.length === 3) return { rowCount: 1, rows: [{ academicYear: null }] }
      return { rowCount: 0, rows: [] }
    },
  }

  assert.equal(await ensureAcademicYearMilestoneTemplates(client, 2026), false)
  assert.deepEqual(calls[2].values, [2026, 'Master', '1.1'])
  assert.deepEqual(calls[3].values, ['Master', '1.1'])
  assert.equal(calls.some(({ sql }) => sql.includes('INSERT INTO milestone_templates')), false)
})

test('does not duplicate a plan that already exists in the target year', async () => {
  let calls = 0
  const client = {
    async query() {
      calls += 1
      if (calls === 1) {
        return { rowCount: 1, rows: [{ degreeLevel: 'Master', educationPlan: 'A1' }] }
      }
      return { rowCount: 1, rows: [{ exists: 1 }] }
    },
  }

  assert.equal(await ensureAcademicYearMilestoneTemplates(client, 2026), false)
  assert.equal(calls, 2)
})
