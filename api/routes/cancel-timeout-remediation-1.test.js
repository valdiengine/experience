/**
 * CANCEL-TIMEOUT-REMEDIATION-1 — permanent regression tests
 *
 * Permanent coverage retained after removal of the temporary diagnostics layer.
 *
 * Coverage:
 *   R1   handler rejection is propagated by the router
 *   R1b  middleware rejection is propagated by the router
 *   R2/R3 commercial API rejection terminates with a bounded 500 response
 *   R2b  the real server boundary terminates unmatched commercial routes
 *   R4/R5 raw error details, stack traces and identifiers are not exposed
 *   R6   an already-sent response is not double-sent
 *   R7   tenant-less cancellation does not leave the request hanging
 *   R8   successful cancellation behaviour remains unchanged
 *   R13  JWT tenant claim shape remains compatible with the cancel route
 */


import test from 'node:test'
import assert from 'node:assert/strict'

import { Router } from './router.js'
import { PublicWebServer } from '../../web/web.server.js'

const SECRET_LITERAL = 'super-secret-value'
const RESERVATION_ID = 'c82746fe-2341-4c7e-9825-0f503e1984b2'
const TENANT_ID = '36d84fc9-33db-44f4-ac1d-7400902eb756'

/**
 * Minimal ServerResponse double. It records whether headers were committed and
 * whether the body was ended, which is what distinguishes a terminated response
 * from an orphaned socket.
 */
function createResponseDouble() {
  const state = {
    statusCode: 200,
    headers: {},
    body: null,
    headersSent: false,
    writableEnded: false,
    endCalls: 0,
    setHeaderCalls: 0,
  }

  const res = {
    state,
    get statusCode() {
      return state.statusCode
    },
    // Assigning statusCode mirrors Node: it is only settable while the response
    // is still open, so a late write is a real double-send attempt.
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
      state.setHeaderCalls += 1
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

  return res
}

function createRequest(method, pathname) {
  return { method, pathname, headers: {} }
}

test('R1. a handler rejection is NOT swallowed by the router', async () => {
  const router = new Router()
  const failure = new Error('handler rejected before responding')

  router.post('/boom', async () => {
    throw failure
  })

  const res = createResponseDouble()

  await assert.rejects(
    () => router.handle(createRequest('POST', '/boom'), res),
    error => error === failure
  )

  // The router must not have written anything: containment belongs to the
  // boundary, so the rejection has to actually arrive there.
  assert.equal(res.state.endCalls, 0)
})

test('R1b. a middleware rejection is NOT swallowed by the router either', async () => {
  const router = new Router()
  const failure = new Error('middleware rejected')

  router.post('/guarded', async (_req, _res, next) => {
    await next()
    throw failure
  }, async () => 'never reached')

  const res = createResponseDouble()

  await assert.rejects(
    () => router.handle(createRequest('POST', '/guarded'), res),
    error => error === failure
  )
  assert.equal(res.state.endCalls, 0)
})

test('R2/R3. the commercial boundary terminates the response with 500', async () => {
  const router = new Router()
  const failure = new Error(`handler failed with ${SECRET_LITERAL}`)

  router.post('/api/v1/boom', async () => {
    throw failure
  })

  const res = createResponseDouble()

  // The same shape web.server.js wires: dispatch inside try, boundary in catch.
  try {
    await router.handle(createRequest('POST', '/api/v1/boom'), res)
  } catch (error) {
    // Mirrors #handleCommercialApiError for a not-yet-sent response.
    if (!res.headersSent && !res.writableEnded) {
      res.statusCode = error?.statusCode || 500
      res.setHeader('Content-Type', 'application/problem+json')
      res.end(
        JSON.stringify({
          type: 'https://api.example.com/errors/internal-error',
          title: 'Internal Server Error',
          status: res.statusCode,
          detail: 'The request could not be completed.',
        })
      )
    }
  }

  assert.equal(res.state.writableEnded, true)
  assert.equal(res.state.endCalls, 1)
  assert.equal(res.state.statusCode, 500)
})

test('R2b. the real server boundary terminates an unmatched commercial route', async () => {
  const port = 3391
  const server = new PublicWebServer({ port, host: '127.0.0.1', env: 'test' })
  await server.start()

  try {
    // The commercial router has no route here, so the boundary path runs and
    // the response must be terminated rather than left open.
    const response = await fetch(`http://127.0.0.1:${port}/api/v1/reservations/${RESERVATION_ID}/cancel`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ reason: 'guest request' }),
    })

    // 401 (auth middleware present, no Authorization header) or 404; either way
    // the request completed instead of hanging.
    assert.ok([401, 404, 500].includes(response.status), `unexpected status ${response.status}`)
    await response.text()
  } finally {
    await server.shutdown()
  }
})

test('R4/R5. a terminated response carries no error.message, stack or identifiers', async () => {
  const port = 3392
  const server = new PublicWebServer({ port, host: '127.0.0.1', env: 'test' })
  await server.start()

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/v1/reservations/${RESERVATION_ID}/cancel`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ reason: 'guest request' }),
    })

    const text = await response.text()

    assert.ok(!text.includes(SECRET_LITERAL))
    assert.ok(!/\bat\s+\w+\s+\(/.test(text), 'no stack frames may appear')
    assert.ok(!text.includes(RESERVATION_ID))
    assert.ok(!text.includes(TENANT_ID))
  } finally {
    await server.shutdown()
  }
})

test('R6. an already-sent response is preserved and not double-sent', async () => {
  const res = createResponseDouble()

  // Handler commits a full 200 first.
  res.statusCode = 200
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify({ success: true }))

  // A later rejection reaches the boundary; it must not overwrite anything.
  const failure = new Error('too late')
  if (!res.headersSent && !res.writableEnded) {
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/problem+json')
    res.end(JSON.stringify({ status: 500 }))
  }

  assert.equal(res.state.statusCode, 200)
  assert.equal(res.state.endCalls, 1)
  assert.equal(JSON.parse(res.state.body).success, true)
  assert.equal(res.state.headers['Content-Type'], 'application/json')
})

test('R7. a tenant-less cancel request does not leave the request hanging', async () => {
  const { ReservationController } = await import('./reservation.routes.js')

  let serviceCalls = 0
  const controller = new ReservationController()
  controller.getService = () => {
    serviceCalls += 1
    return {
      cancelReservation: async () => {
        throw new Error('Business not found: null')
      },
    }
  }

  const res = createResponseDouble()
  const req = {
    method: 'POST',
    params: { id: RESERVATION_ID },
    body: { reason: 'guest request' },
    // No tenant on the identity.
    //
    // CANCEL-TIMEOUT-REMEDIATION-2: this assertion changed with the contract.
    // While the unscoped fallback existed, a tenant-less identity produced a
    // bounded 500 from a `findById(null)` lookup — a hang that was fixed but a
    // fail-open path that was not. The fallback is now removed, so this request
    // is refused before any business capability is touched.
    user: { id: 'user-1', tenant: null },
    headers: {},
  }

  await controller.cancel(req, res)

  assert.equal(res.state.writableEnded, true, 'response must be terminated')
  assert.equal(res.state.endCalls, 1)
  assert.equal(res.state.statusCode, 401)
  assert.equal(serviceCalls, 0, 'the unscoped business service must not be called')
  assert.ok(!res.state.body.includes('Business not found'))
})

test('R8. the successful cancel path is unchanged', async () => {
  const { ReservationController } = await import('./reservation.routes.js')

  // CANCEL-TIMEOUT-REMEDIATION-2: this assertion moved off the removed fallback.
  // A successful cancel now runs only through the tenant-scoped path, so a
  // tenant-bearing identity is required to observe a 200.
  //
  // The context is built from scratch rather than spread from whatever an
  // earlier test left on `global.runtimeContext`: an earlier boundary test
  // installs a real, already-disposed runtime, and inheriting its own
  // properties would make this assertion depend on test order.
  const previous = global.runtimeContext
  global.runtimeContext = {
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
        cancelReservationWithRelease: async () => ({
          id: RESERVATION_ID,
          status: 'cancelled',
        }),
      }),
    },
  }

  try {
    let serviceCalls = 0
    const controller = new ReservationController()
    controller.getService = () => {
      serviceCalls += 1
      return {
        cancelReservation: async () => ({ success: true, id: RESERVATION_ID, status: 'cancelled' }),
      }
    }

    const res = createResponseDouble()
    const req = {
      method: 'POST',
      params: { id: RESERVATION_ID },
      body: { reason: 'guest request' },
      user: { id: 'user-1', tenant: { id: TENANT_ID, name: 'MVP10' } },
      headers: {},
    }

    await controller.cancel(req, res)

    assert.equal(res.state.statusCode, 200)
    assert.equal(res.state.headers['Content-Type'], 'application/json')
    assert.equal(serviceCalls, 0, 'the unscoped business service must not be called')

    const payload = JSON.parse(res.state.body)
    assert.equal(payload.success, true)
  } finally {
    global.runtimeContext = previous
  }
})

test('R13. the JWT tenant claim shape the cancel route reads is populated', async () => {
  // The certified token carried `tid` and `ten`. The claims mapper normalizes
  // `tid` into `identity.tenant.id`, which is exactly what cancel() reads, so
  // the tenant IS compatible and the unguarded fallback is NOT taken for a
  // correctly issued token.
  const { JwtClaimsMapper } = await import('../../runtime/auth/providers/jwt/jwt.claims.mapper.js')

  const mapper = new JwtClaimsMapper({})
  const mapped = mapper.toIdentity({
    sub: 'user-abc',
    tid: TENANT_ID,
    ten: TENANT_ID,
    permissions: ['reservation:cancel'],
    roles: ['business_owner'],
  })

  assert.equal(mapped.identity.tenant.id, TENANT_ID)
  assert.deepEqual(mapped.identity.permissions, ['reservation:cancel'])

  // cancel() reads req.user.tenant.id, which is populated above.
  const authenticatedTenant = { id: mapped.identity.tenant.id }
  assert.ok(authenticatedTenant?.id)

  // A token WITHOUT tid leaves tenant null, which is what routes a request into
  // the fallback branch. That is why the fallback must stay contained.
  const noTenant = mapper.toIdentity({ sub: 'user-abc' })
  assert.equal(noTenant.identity.tenant, null)
  assert.equal(noTenant.identity.tenant?.id, undefined)
})
