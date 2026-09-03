import assert from 'node:assert/strict'
import test from 'node:test'

import { requireTrustedOrigin } from './origin.middleware.js'

function createRequest({ method = 'POST', origin, referer } = {}) {
  return {
    method,
    get(name) {
      if (name === 'origin') return origin
      if (name === 'referer') return referer
      return undefined
    },
  }
}

test('allows safe requests without an Origin header', () => {
  let calledNext = false
  requireTrustedOrigin(createRequest({ method: 'GET' }), {}, () => {
    calledNext = true
  })
  assert.equal(calledNext, true)
})

test('allows state-changing requests from the configured network IP', () => {
  const previousOrigin = process.env.FRONTEND_ORIGIN
  process.env.FRONTEND_ORIGIN = 'http://172.27.136.218:5173'

  try {
    let calledNext = false
    requireTrustedOrigin(
      createRequest({ origin: 'http://172.27.136.218:5173' }),
      {},
      () => { calledNext = true },
    )
    assert.equal(calledNext, true)
  } finally {
    if (previousOrigin === undefined) delete process.env.FRONTEND_ORIGIN
    else process.env.FRONTEND_ORIGIN = previousOrigin
  }
})

test('rejects state-changing requests from an untrusted or missing origin', () => {
  assert.throws(
    () => requireTrustedOrigin(createRequest({ origin: 'https://attacker.example' }), {}, () => {}),
    (error) => error.statusCode === 403,
  )
  assert.throws(
    () => requireTrustedOrigin(createRequest(), {}, () => {}),
    (error) => error.statusCode === 403,
  )
})

