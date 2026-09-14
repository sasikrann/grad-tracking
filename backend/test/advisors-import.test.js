import assert from 'node:assert/strict'
import test from 'node:test'

process.env.DATABASE_URL ||= 'postgres://localhost/advisor_import_test'
const { default: pool } = await import('../src/config/database.js')
const { importAdvisors } = await import('../src/services/advisors.service.js')

const original = { advisorId: 'A001', fullName: 'Original', email: 'original@mfu.ac.th', userId: 'u1' }

function mockDatabase(t, { advisors = [original], users = [] } = {}) {
  const writes = []
  const commands = []
  const client = {
    release() {},
    async query(sql, values = []) {
      commands.push(sql)
      let rows = []
      if (sql.includes('ANY($1::varchar[])')) rows = advisors.filter(a => values[0].includes(a.advisorId))
      else if (sql.startsWith('SELECT advisor_id, user_id FROM advisors')) rows = advisors.filter(a => a.email.trim().toLowerCase() === values[0]).map(a => ({ advisor_id: a.advisorId, user_id: a.userId }))
      else if (sql.startsWith('SELECT user_id FROM advisors')) rows = advisors.filter(a => a.advisorId === values[0]).map(a => ({ user_id: a.userId }))
      else if (sql.startsWith('SELECT user_id, role FROM users')) rows = users.filter(u => u.email.trim().toLowerCase() === values[0])
      else if (sql.startsWith('SELECT advisor_id FROM advisors')) rows = advisors.filter(a => a.userId === values[0] && a.advisorId !== values[1]).map(a => ({ advisor_id: a.advisorId }))
      else if (/INSERT INTO (users|advisors)\s/.test(sql)) writes.push({ sql, values })
      else if (!/^(BEGIN|COMMIT|ROLLBACK|SAVEPOINT|RELEASE)/.test(sql) && !sql.includes('import_logs')) throw new Error(`Unexpected query: ${sql}`)
      return { rows, rowCount: rows.length }
    },
  }
  t.mock.method(pool, 'connect', async () => client)
  t.mock.method(pool, 'query', async () => ({ rows: [] }))
  return { writes, commands }
}

test('same ID updates its linked account when name and email change', async t => {
  const { writes } = mockDatabase(t)
  const result = await importAdvisors([{ ...original, fullName: 'Changed', email: 'new@mfu.ac.th' }])
  assert.equal(result.updatedRecords, 1)
  assert.equal(result.createdRecords, 0)
  assert.deepEqual(writes[0].values, ['u1', 'new@mfu.ac.th', 'Changed'])
  assert.equal(writes[1].values[0], 'A001')
})

test('identical ID and details skip all writes', async t => {
  const { writes } = mockDatabase(t)
  const result = await importAdvisors([original])
  assert.equal(result.unchangedRecords, 1)
  assert.equal(result.totalRecords, 0)
  assert.equal(writes.length, 0)
})

test('different ID cannot take an existing email; independent new advisor still imports', async t => {
  const { writes, commands } = mockDatabase(t)
  const result = await importAdvisors([
    { advisorId: 'A002', fullName: 'Conflict', email: original.email },
    { advisorId: 'A003', fullName: 'New', email: 'new@mfu.ac.th' },
  ])
  assert.equal(result.failedRecords, 1)
  assert.equal(result.createdRecords, 1)
  assert.match(result.errors[0], /A001.*A002/)
  assert.equal(writes.length, 2)
  assert.equal(writes[1].values[0], 'A003')
  assert.ok(commands.includes('ROLLBACK TO SAVEPOINT advisor_row_0'))
  assert.ok(commands.includes('COMMIT'))
})

test('student or admin email cannot be reassigned to an advisor', async t => {
  for (const role of ['student', 'admin']) {
    const { writes } = mockDatabase(t, { users: [{ user_id: 'other', role, email: 'taken@mfu.ac.th' }] })
    const result = await importAdvisors([{ ...original, email: 'taken@mfu.ac.th' }])
    assert.equal(result.failedRecords, 1)
    assert.match(result.errors[0], new RegExp(role))
    assert.equal(writes.length, 0)
    t.mock.restoreAll()
  }
})
