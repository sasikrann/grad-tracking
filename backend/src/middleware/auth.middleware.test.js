import assert from 'node:assert/strict'
import test from 'node:test'

import { createAccessToken, requireAuth, requireRole } from './auth.middleware.js'

process.env.JWT_SECRET = 'test-secret-that-is-only-used-by-unit-tests'

function createRequest(authorization = '') {
  return {
    get(name) {
      return name === 'authorization' ? authorization : undefined
    },
  }
}

test('requireAuth accepts a valid access token', () => {
  const token = createAccessToken({
    userId: 'user-1',
    email: 'admin@lamduan.mfu.ac.th',
    role: 'admin',
  })
  const request = createRequest(`Bearer ${token}`)
  let calledNext = false

  requireAuth(request, {}, () => {
    calledNext = true
  })

  assert.equal(calledNext, true)
  assert.deepEqual(request.user, {
    userId: 'user-1',
    email: 'admin@lamduan.mfu.ac.th',
    role: 'admin',
  })
})

test('requireAuth rejects a missing access token', () => {
  assert.throws(
    () => requireAuth(createRequest(), {}, () => {}),
    (error) => error.statusCode === 401 && error.message === 'Authentication is required',
  )
})

test('requireRole rejects a user with the wrong role', () => {
  const request = { user: { role: 'advisor' } }

  assert.throws(
    () => requireRole('admin')(request, {}, () => {}),
    (error) => error.statusCode === 403,
  )
})
