import assert from 'node:assert/strict'
import test from 'node:test'

import { milestoneReminderContent } from './milestone-notification.service.js'

test('stores language-neutral keys for automatic milestone notifications', () => {
  const content = milestoneReminderContent({ title: 'Test Milestone' }, 'created')

  assert.deepEqual(content, {
    title: 'notification.milestone.created.title',
    message: 'notification.milestone.created.message',
  })
  assert.equal(content.title.includes('Test Milestone'), false)
  assert.equal(content.message.includes('A new milestone'), false)
})
