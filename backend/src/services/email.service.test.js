import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createMimeMessage,
  resolveNotificationEmailRecipients,
  stripNotificationHtml,
} from './email.service.js'

test('converts rich-text non-breaking spaces to normal spaces for email text', () => {
  assert.equal(
    stripNotificationHtml('&nbsp;ทดสอบระบบ&nbsp;GRAD Tracking'),
    'ทดสอบระบบ GRAD Tracking',
  )
})

test('uses the selected student recipients when email test mode is disabled', () => {
  assert.deepEqual(
    resolveNotificationEmailRecipients(
      ['student1@example.com', 'student1@example.com', 'student2@example.com'],
      { EMAIL_TEST_MODE: 'false' },
    ),
    ['student1@example.com', 'student2@example.com'],
  )
})

test('redirects every notification email to one recipient in email test mode', () => {
  assert.deepEqual(
    resolveNotificationEmailRecipients(['student1@example.com', 'student2@example.com'], {
      EMAIL_TEST_MODE: 'true',
      EMAIL_TEST_RECIPIENT: 'gradtracking61@gmail.com',
    }),
    ['gradtracking61@gmail.com'],
  )
})

test('requires a test recipient when email test mode is enabled', () => {
  assert.throws(
    () =>
      resolveNotificationEmailRecipients(['student@example.com'], {
        EMAIL_TEST_MODE: 'true',
      }),
    /EMAIL_TEST_RECIPIENT is required/,
  )
})

test('creates a multipart email with the selected notification file attached', () => {
  const message = createMimeMessage({
    from: 'GRAD Tracking <grad@example.com>',
    subject: 'Test notification',
    text: 'Notification body',
    html: '<p>Notification body</p>',
    attachment: {
      fileName: 'test.png',
      contentType: 'image/png',
      content: Buffer.from('image-content'),
    },
  })

  assert.match(message, /Content-Type: multipart\/mixed/)
  assert.match(message, /Content-Type: image\/png; name="test\.png"/)
  assert.match(message, /Content-Disposition: attachment; filename="test\.png"/)
  assert.match(message, new RegExp(Buffer.from('image-content').toString('base64')))
  assert.doesNotMatch(message, /localhost|\/uploads\/notifications\//)
})
