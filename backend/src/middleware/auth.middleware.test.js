import assert from 'node:assert/strict'
import test from 'node:test'
import jwt from 'jsonwebtoken'

import { createAccessToken, createRequireAuth, requireRole } from './auth.middleware.js'

process.env.JWT_SECRET = 'test-secret-that-is-only-used-by-unit-tests'

function createRequest(cookie = '') {
  return {
    get(name) {
      return name === 'cookie' ? cookie : undefined
    },
  }
}

test('requireAuth accepts a valid HS256 access token and loads the current database role', async () => {
  const token = createAccessToken({
    userId: 'user-1',
    email: 'admin@lamduan.mfu.ac.th',
    role: 'admin',
  })
  const request = createRequest(`access_token=${encodeURIComponent(token)}`)
  let calledNext = false
  const requireAuth = createRequireAuth(async () => ({
    userId: 'user-1',
    email: 'admin@lamduan.mfu.ac.th',
    role: 'advisor',
  }))

  await requireAuth(request, {}, () => {
    calledNext = true
  })

  assert.equal(calledNext, true)
  assert.deepEqual(request.user, {
    userId: 'user-1',
    email: 'admin@lamduan.mfu.ac.th',
    role: 'advisor',
  })
})

test('requireAuth rejects a missing access token', async () => {
  const requireAuth = createRequireAuth(async () => null)

  await assert.rejects(
    requireAuth(createRequest(), {}, () => {}),
    (error) => error.statusCode === 401 && error.message === 'Authentication is required',
  )
})

test('createAccessToken explicitly uses HS256', () => {
  const token = createAccessToken({
    userId: 'user-1',
    email: 'admin@lamduan.mfu.ac.th',
    role: 'admin',
  })

  assert.equal(jwt.decode(token, { complete: true }).header.alg, 'HS256')
})

test('requireAuth rejects a token signed with another algorithm', async () => {
  const token = jwt.sign(
    { email: 'admin@lamduan.mfu.ac.th', role: 'admin' },
    process.env.JWT_SECRET,
    {
      algorithm: 'HS384',
      subject: 'user-1',
      issuer: 'grad-tracking',
      audience: 'grad-tracking-web',
      expiresIn: '8h',
    },
  )
  const requireAuth = createRequireAuth(async () => {
    throw new Error('Database lookup must not run for an invalid algorithm')
  })

  await assert.rejects(
    requireAuth(createRequest(`access_token=${encodeURIComponent(token)}`), {}, () => {}),
    (error) => error.statusCode === 401,
  )
})

test('requireAuth rejects a deleted or inactive user', async () => {
  const token = createAccessToken({
    userId: 'user-1',
    email: 'admin@lamduan.mfu.ac.th',
    role: 'admin',
  })
  const requireAuth = createRequireAuth(async () => null)

  await assert.rejects(
    requireAuth(createRequest(`access_token=${encodeURIComponent(token)}`), {}, () => {}),
    (error) => error.statusCode === 401,
  )
})

test('requireRole rejects a user with the wrong role', () => {
  const request = { user: { role: 'advisor' } }

  assert.throws(
    () => requireRole('admin')(request, {}, () => {}),
    (error) => error.statusCode === 403,
  )
})
