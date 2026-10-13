import assert from 'node:assert/strict'
import test from 'node:test'

import { dismissStudentsWithExpiredExtensions } from './study-extension-scheduler.service.js'

test('dismisses only eligible students through the scheduled database update', async () => {
  const calls = []
  const database = {
    async query(sql) {
      calls.push(sql)
      return { rows: [{ student_id: 'student-08' }] }
    },
  }

  const dismissed = await dismissStudentsWithExpiredExtensions(database)

  assert.deepEqual(dismissed, [{ student_id: 'student-08' }])
  assert.match(calls[0], /COUNT\(\*\)[\s\S]*= 2/)
  assert.match(calls[0], /Asia\/Bangkok/)
  assert.match(calls[0], /student_status = 'Normal'/)
  assert.match(calls[0], /graduation_semester IS NULL/)
})
