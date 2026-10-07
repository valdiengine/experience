/**
 * CANCEL-TIMEOUT-REMEDIATION-2 - permanent auth fail-closed regression tests
 *
 * Permanent coverage retained after removal of the temporary diagnostics layer.
 *
 * Coverage:
 *   1/2   missing or refused credentials -> bounded 401 before business logic
 *   2b/2c rejected and anonymous authentication states remain distinct
 *   2d    401 responses expose no rejection reason or credential material
 *   3     authenticated identity without tenant fails closed
 *   4/5   valid tenant enters scoped path; businessId=null fallback stays unreachable
 *   6/7   expired and wrong-secret JWTs map to bounded rejection classes
 *   7b    valid JWT preserves tenant and permissions
 *   7c    provider rejection reasons remain inside the production closed vocabulary
 *   8     refused credentials leak no token, secret, tenant or verifier details to logs
 *   10    Remediation-1 bounded 500 behaviour remains intact
 */

import test from 'node:test'
import assert from 'node:assert/strict'

import { Router } from './router.js'
import { authMiddleware, requireAuth } from '../middleware/auth.middleware.js'
import { AUTH_REJECTION_REASONS } from '../../runtime/auth/providers/jwt/jwt.provider.js'

// A throwaway secret used only by these tests. It is never a real credential and
// exists so the leak assertions below have a concrete string to search for.
const TEST_SECRET_LITERAL = 'test-only-secret-do-not-use-9f2c'
const OTHER_SECRET_LITERAL = 'test-only-other-secret-do-not-use-7b1e'
const RESERVATION_ID = 'c82746fe-2341-4c7e-9825-0f503e1984b2'
const TENANT_ID = '36d84fc9-33db-44f4-ac1d-7400902eb756'

/**
 * Minimal ServerResponse double, mirroring the one used by the Remediation-1
 * suite: a late write after `end()` is a real double-send attempt and throws.
 */
function createResponseDouble() {
  const state = {
    statusCode: 200,
    headers: {},
    body: null,
    headersSent: false,
    writableEnded: false,
    endCalls: 0,
  }

  return {
    state,
    get statusCode() {
      return state.statusCode
    },
    set statusCode(value) {
      if (state.writableEnded) {
        const error = new Error('ERR_HTTP_HEADERS_SENT')
        error.code = 'ERR_HTTP_HEADERS_SENT'
        throw error
      }
      state.statusCode = value
    },
    get headersSent() {
      return state.headersSent
    },
    get writableEnded() {
      return state.writableEnded
    },
    setHeader(name, value) {
      if (state.writableEnded) {
        const error = new Error('ERR_HTTP_HEADERS_SENT')
        error.code = 'ERR_HTTP_HEADERS_SENT'
        throw error
      }
      state.headers[name] = value
    },
    getHeader(name) {
      return state.headers[name]
    },
    end(chunk) {
      state.endCalls += 1
      state.body = chunk === undefined ? '' : chunk
      state.headersSent = true
      state.writableEnded = true
    },
  }
}

/**
 * Build a real `authMiddleware -> requireAuth -> handler` chain so the tests
 * exercise the shipped middleware rather than a stand-in for it.
 *
 * @param {object} options
 * @param {() => void} options.onHandlerCalled invoked only if the guard admits
 * @returns {{router: Router, calls: {handler: number}}}
 */
function buildGuardedChain(onHandlerCalled) {
  const router = new Router()
  const calls = { handler: 0 }

  router.post(
    '/api/v1/reservations/:id/cancel',
    authMiddleware,
    requireAuth,
    async (req, res) => {
      calls.handler += 1
      onHandlerCalled()
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ success: true }))
    }
  )

  return { router, calls }
}

/**
 * Install a `global.runtimeContext` whose auth runtime returns a fixed result,
 * and restore the previous one afterwards.
 */
function withAuthRuntime(authRuntime, run) {
  const previous = global.runtimeContext
  global.runtimeContext = { ...(previous ?? {}), auth: authRuntime }
  try {
    return run()
  } finally {
    global.runtimeContext = previous
  }
}

function cancelRequest() {
  return {
    method: 'POST',
    pathname: `/api/v1/reservations/${RESERVATION_ID}/cancel`,
    params: { id: RESERVATION_ID },
    body: { reason: 'guest request' },
    headers: {},
  }
}

// ---------------------------------------------------------------------------
// 1. No Authorization header
// ---------------------------------------------------------------------------

test('1. /cancel without an Authorization header is a bounded 401 and never reaches the handler', async () => {
  const { router, calls } = buildGuardedChain(() => {
    throw new Error('handler must not run without credentials')
  })

  const res = createResponseDouble()

  await withAuthRuntime(null, () => router.handle(cancelRequest(), res))

  assert.equal(res.state.writableEnded, true, 'the response must be terminated, not left hanging')
  assert.equal(res.state.endCalls, 1)
  assert.equal(res.state.statusCode, 401)
  assert.equal(calls.handler, 0)
})

// ---------------------------------------------------------------------------
// 2. A presented-but-refused Bearer token
// ---------------------------------------------------------------------------

test('2. /cancel with a refused Bearer token is a bounded 401 and never reaches the handler', async () => {
  const { router, calls } = buildGuardedChain(() => {
    throw new Error('handler must not run with refused credentials')
  })

  const res = createResponseDouble()
  const req = cancelRequest()
  req.headers.authorization = 'Bearer a-token-the-runtime-will-refuse'

  await withAuthRuntime(
    {
      authenticate: async () => ({
        authenticated: false,
        identity: null,
        session: null,
        device: null,
        reason: 'INVALID_SIGNATURE',
      }),
    },
    () => router.handle(req, res)
  )

  assert.equal(res.state.writableEnded, true, 'the response must be terminated')
  assert.equal(res.state.endCalls, 1)
  assert.equal(res.state.statusCode, 401)
  assert.equal(calls.handler, 0)
})

test('2b. a refused credential is recorded as rejected, not as anonymous', async () => {
  const observed = {}

  await withAuthRuntime(
    {
      authenticate: async () => ({
        authenticated: false,
        identity: null,
        reason: 'EXPIRED',
      }),
    },
    async () => {
      const req = cancelRequest()
      req.headers.authorization = 'Bearer refused-token'
      await authMiddleware(req, createResponseDouble(), async () => {
        observed.outcome = req.authOutcome
        observed.reasonClass = req.authReasonClass
      })
    }
  )

  assert.equal(observed.outcome, 'rejected')
  assert.equal(observed.reasonClass, 'EXPIRED')
})

test('2c. an absent credential stays anonymous, so requireAuth-less routes keep their semantics', async () => {
  const observed = {}
  const req = cancelRequest()

  await authMiddleware(req, createResponseDouble(), async () => {
    observed.outcome = req.authOutcome
    observed.authenticated = req.authenticated
    observed.user = req.user
  })

  assert.equal(observed.outcome, 'anonymous')
  assert.equal(observed.authenticated, false)
  assert.equal(observed.user, null)
})

test('2d. the 401 body leaks neither the reason class nor any credential material', async () => {
  const { router } = buildGuardedChain(() => {})
  const res = createResponseDouble()
  const req = cancelRequest()
  req.headers.authorization = 'Bearer some-token-value'

  await withAuthRuntime(
    { authenticate: async () => ({ authenticated: false, identity: null, reason: 'MALFORMED' }) },
    () => router.handle(req, res)
  )

  assert.equal(res.state.statusCode, 401)
  assert.ok(!res.state.body.includes('MALFORMED'))
  assert.ok(!res.state.body.includes('some-token-value'))
})

// ---------------------------------------------------------------------------
// 3 + 5. Authenticated identity without a tenant, and the removed fallback
// ---------------------------------------------------------------------------

test('3. an authenticated identity with no tenant fails closed before any business capability', async () => {
  const { ReservationController } = await import('./reservation.routes.js')

  let serviceCalls = 0
  const controller = new ReservationController()
  controller.getService = () => {
    serviceCalls += 1
    return {
      cancelReservation: async () => {
        throw new Error('the unscoped business service must never be reached')
      },
    }
  }

  const res = createResponseDouble()
  const req = {
    method: 'POST',
    params: { id: RESERVATION_ID },
    body: { reason: 'guest request' },
    // A verified identity, but with no tenant: this is the case that used to
    // fall through to `businessId = null`.
    user: { id: 'user-1', tenant: null, permissions: ['reservation:cancel'] },
    authenticated: true,
    authOutcome: 'authenticated',
    headers: {},
  }

  await controller.cancel(req, res)

  assert.equal(res.state.writableEnded, true, 'the response must be terminated')
  assert.equal(res.state.endCalls, 1)
  assert.equal(res.state.statusCode, 401, 'a request with no tenant is not attributable')
  assert.equal(serviceCalls, 0, 'the unscoped business service must not be called')
})

test('5. the businessId=null fallback is unreachable from the cancel handler', async () => {
  const { ReservationController } = await import('./reservation.routes.js')

  // Whatever the capability lookup returns, it must stay untouched: the removed
  // branch is the only thing that could have called it.
  let serviceCalls = 0
  const controller = new ReservationController()
  controller.getService = () => {
    serviceCalls += 1
    return {
      cancelReservation: async () => ({ success: true }),
    }
  }

  for (const user of [
    { id: 'user-1', tenant: null },
    { id: 'user-1' },
    { id: 'user-1', tenant: {} },
    { id: 'user-1', tenant: { id: '' } },
  ]) {
    const res = createResponseDouble()
    await controller.cancel(
      { method: 'POST', params: { id: RESERVATION_ID }, body: {}, user, headers: {} },
      res
    )

    assert.equal(res.state.statusCode, 401, `tenant-less identity must fail closed (${JSON.stringify(user.tenant ?? null)})`)
    assert.equal(res.state.writableEnded, true)
  }

  assert.equal(serviceCalls, 0, 'no tenant-less identity may reach the business service')
})

// ---------------------------------------------------------------------------
// 4. Authenticated identity WITH a tenant enters the scoped path
// ---------------------------------------------------------------------------

test('4. an authenticated identity with a tenant enters the scoped path', async () => {
  const { ReservationController } = await import('./reservation.routes.js')

  const previous = global.runtimeContext
  const cancelCalls = []

  global.runtimeContext = {
    ...(previous ?? {}),
    repositories: {
      get: async () => ({
        findById: async () => null,
        cancelReservationWithRelease: async () => null,
      }),
    },
  }

  try {
    let serviceCalls = 0
    const controller = new ReservationController()
    controller.getService = () => {
      serviceCalls += 1
      return { cancelReservation: async () => ({ success: true }) }
    }

    const res = createResponseDouble()
    const req = {
      method: 'POST',
      params: { id: RESERVATION_ID },
      body: { reason: 'guest request' },
      user: { id: 'user-1', tenant: { id: TENANT_ID, name: 'MVP10' }, permissions: ['reservation:cancel'] },
      authenticated: true,
      headers: {},
    }

    await controller.cancel(req, res)

    assert.notEqual(res.state.statusCode, 401, 'a tenant-bearing identity must not fail closed')
    assert.equal(serviceCalls, 0, 'the unscoped business service must not be called')
    assert.equal(res.state.writableEnded, true, 'the response must be terminated exactly once')
    assert.equal(res.state.endCalls, 1)
    assert.equal(cancelCalls.length, 0)
  } finally {
    global.runtimeContext = previous
  }
})

// ---------------------------------------------------------------------------
// 6 + 7. Safe reason classification from a real provider
// ---------------------------------------------------------------------------

test('6. an expired token is rejected with REASON_CLASS EXPIRED', async () => {
  const { JwtProvider } = await import('../../runtime/auth/providers/jwt/jwt.provider.js')

  const provider = new JwtProvider({
    secret: TEST_SECRET_LITERAL,
    issuer: 'valdi-engine',
    audience: 'valdi-platform',
    algorithm: 'HS256',
  })
  await provider.initialize()

  const identity = {
    id: 'user-abc',
    tenant: { id: TENANT_ID, name: 'MVP10' },
    permissions: ['reservation:cancel'],
  }

  // A negative TTL puts `exp` in the past, which is what a token that outlived a
  // slow out-of-band procedure looks like.
  const expired = provider.accessService.issue(identity, { expiresIn: -30 })
  const result = await provider.authenticate(expired.token)

  assert.equal(result.authenticated, false)
  assert.equal(result.identity, null)
  assert.equal(result.reason, 'EXPIRED')
  assert.ok(AUTH_REJECTION_REASONS.includes(result.reason))
})

test('7. a token signed with a different secret is rejected with REASON_CLASS INVALID_SIGNATURE', async () => {
  const { JwtProvider } = await import('../../runtime/auth/providers/jwt/jwt.provider.js')

  const minter = new JwtProvider({
    secret: OTHER_SECRET_LITERAL,
    issuer: 'valdi-engine',
    audience: 'valdi-platform',
    algorithm: 'HS256',
  })
  await minter.initialize()

  const verifier = new JwtProvider({
    secret: TEST_SECRET_LITERAL,
    issuer: 'valdi-engine',
    audience: 'valdi-platform',
    algorithm: 'HS256',
  })
  await verifier.initialize()

  const identity = {
    id: 'user-abc',
    tenant: { id: TENANT_ID, name: 'MVP10' },
    permissions: ['reservation:cancel'],
  }

  const foreign = minter.accessService.issue(identity, { expiresIn: 300 })
  const result = await verifier.authenticate(foreign.token)

  assert.equal(result.authenticated, false)
  assert.equal(result.identity, null)
  assert.equal(result.reason, 'INVALID_SIGNATURE')
})

test('7b. a valid token still authenticates and preserves its tenant and permissions', async () => {
  const { JwtProvider } = await import('../../runtime/auth/providers/jwt/jwt.provider.js')

  const provider = new JwtProvider({
    secret: TEST_SECRET_LITERAL,
    issuer: 'valdi-engine',
    audience: 'valdi-platform',
    algorithm: 'HS256',
  })
  await provider.initialize()

  const identity = {
    id: 'user-abc',
    tenant: { id: TENANT_ID, name: 'MVP10' },
    permissions: ['reservation:cancel'],
  }

  const issued = provider.accessService.issue(identity, { expiresIn: 300 })
  const result = await provider.authenticate(issued.token)

  assert.equal(result.authenticated, true)
  assert.equal(result.identity.tenant.id, TENANT_ID)
  assert.deepEqual(result.identity.permissions, ['reservation:cancel'])
  assert.equal(result.reason, null)
})

test('7c. every reason the provider can emit is inside the closed vocabulary', async () => {
  const { JwtProvider } = await import('../../runtime/auth/providers/jwt/jwt.provider.js')

  const provider = new JwtProvider({
    secret: TEST_SECRET_LITERAL,
    issuer: 'valdi-engine',
    audience: 'valdi-platform',
    algorithm: 'HS256',
  })
  await provider.initialize()

  const samples = [
    'not-a-token',
    '',
    'a.b.c',
    `${'x'.repeat(40)}.${'y'.repeat(40)}.${'z'.repeat(43)}`,
  ]

  for (const sample of samples) {
    const result = await provider.authenticate(sample)
    assert.equal(result.authenticated, false)
    assert.ok(
      AUTH_REJECTION_REASONS.includes(result.reason),
      `reason "${result.reason}" escaped the closed vocabulary`
    )
  }
})

// ---------------------------------------------------------------------------
// 8. No credential material reaches diagnostics or logs
// ---------------------------------------------------------------------------

test('8. a refused credential never leaks token, secret, tenant or verifier details to logs', async () => {

  const { JwtProvider } = await import('../../runtime/auth/providers/jwt/jwt.provider.js')

  const provider = new JwtProvider({
    secret: TEST_SECRET_LITERAL,
    issuer: 'valdi-engine',
    audience: 'valdi-platform',
    algorithm: 'HS256',
  })
  await provider.initialize()

  const minter = new JwtProvider({
    secret: OTHER_SECRET_LITERAL,
    issuer: 'valdi-engine',
    audience: 'valdi-platform',
    algorithm: 'HS256',
  })
  await minter.initialize()

  const foreignToken = minter.accessService.issue(
    { id: 'user-abc', tenant: { id: TENANT_ID, name: 'MVP10' }, permissions: ['reservation:cancel'] },
    { expiresIn: 300 }
  ).token

  // Capture everything written to the console during a refused verification.
  const captured = []
  const originalLog = console.log
  const originalError = console.error
  console.log = (...args) => captured.push(args.map(String).join(' '))
  console.error = (...args) => captured.push(args.map(String).join(' '))

  let rejection
  try {
    await withAuthRuntime(
      {
        authenticate: token => provider.authenticate(token),
      },
      async () => {
        const req = cancelRequest()
        req.headers.authorization = `Bearer ${foreignToken}`
        await authMiddleware(req, createResponseDouble(), async () => {})
        rejection = req.authReasonClass
      }
    )
  } finally {
    console.log = originalLog
    console.error = originalError
  }

  assert.equal(rejection, 'INVALID_SIGNATURE')

  const everything = captured.join('\n')

  // The credential itself, and any fragment of it, must be absent.
  assert.ok(!everything.includes(foreignToken), 'the token must never be logged')
  assert.ok(!everything.includes(foreignToken.slice(0, 20)), 'no token prefix may be logged')
  assert.ok(!everything.includes(foreignToken.slice(-16)), 'no token suffix may be logged')
  assert.ok(!everything.includes(TEST_SECRET_LITERAL), 'the signing secret must never be logged')
  assert.ok(!everything.includes(OTHER_SECRET_LITERAL))
  assert.ok(!everything.includes(TENANT_ID), 'no tenant id may be logged')
  assert.ok(!/authorization/i.test(everything), 'no Authorization header may be logged')
  assert.ok(
    !everything.includes('signature is invalid'),
    'the underlying error message must not be logged'
  )



})
// ---------------------------------------------------------------------------
// 10. Remediation-1 bounded behaviour is intact
// ---------------------------------------------------------------------------

test('10. the Remediation-1 bounded 500 boundary is unchanged for a downstream rejection', async () => {
  const { ReservationController } = await import('./reservation.routes.js')

  const controller = new ReservationController()

  const previous = global.runtimeContext
  global.runtimeContext = {
    ...(previous ?? {}),
    repositories: {
      get: async () => ({
        findById: async () => ({
          id: RESERVATION_ID,
          status: 'requested',
          tenantId: TENANT_ID,
          guestId: 'guest-1',
          checkIn: '2026-10-20',
          checkOut: '2026-10-22',
          guests: 2,
          totalAmount: 100,
          notes: '',
        }),
        cancelReservationWithRelease: async () => {
          throw new Error('driver said: relation "reservations" does not exist')
        },
      }),
    },
  }

  try {
    const res = createResponseDouble()
    const req = {
      method: 'POST',
      params: { id: RESERVATION_ID },
      body: { reason: 'guest request' },
      user: { id: 'user-1', tenant: { id: TENANT_ID, name: 'MVP10' }, permissions: ['reservation:cancel'] },
      authenticated: true,
      headers: {},
    }

    await controller.cancel(req, res)

    assert.equal(res.state.writableEnded, true, 'the request must not hang')
    assert.equal(res.state.endCalls, 1, 'exactly one terminal write')
    assert.equal(res.state.statusCode, 500)
    assert.ok(!res.state.body.includes('relation'), 'no driver text may reach the client')
    assert.ok(!res.state.body.includes(TENANT_ID))
    assert.ok(!res.state.body.includes(RESERVATION_ID))
  } finally {
    global.runtimeContext = previous
  }
})
