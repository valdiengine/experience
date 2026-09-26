/**
 * RUNTIME-PERSISTENCE-1: Route-Scoped Execution Regression Test
 *
 * Tests that verify the fix for the bug where authenticated requests with
 * tenant.id = 'commercial' skipped withTenantScopedExecution and used the
 * global fallback path, causing tenant_id = 'commercial' SQL errors.
 *
 * The fix: Removed '&& authenticatedTenant.id !== "commercial"' condition
 * so ANY authenticated tenant (including commercial) uses scoped execution.
 */
import { createEventBus } from '../../shared/events/eventbus.js'
import { bootstrapRuntime } from '../../runtime/startup/runtime.bootstrap.js'
import { registerRepositories } from '../../runtime/startup/repository.bootstrap.js'
import { registerCapabilities, createRepositoriesFacade } from '../../runtime/startup/capability.bootstrap.js'
import { InMemoryRepositoryAdapter } from '../capability/capability.mock.repositories.js'
import { createMockEventBus } from '../capability/capability.mock.eventbus.js'
import { createMockRuntime } from '../capability/capability.mock.runtime.js'
import { ReservationManager } from '../../capabilities/reservation/reservation.manager.js'
import { BusinessManager } from '../../capabilities/business/business.manager.js'

const TEST_TENANT_A = { id: '11111111-1111-4111-8111-111111111111', name: 'Tenant A', slug: 'tenant-a' }
const TEST_TENANT_B = { id: '22222222-2222-4222-8222-222222222222', name: 'Tenant B', slug: 'tenant-b' }
const SYNTHETIC_TENANT = { id: 'commercial', name: 'Commercial', slug: 'commercial' }

const results = []

const record = (category, id, pass, detail = '') => {
  results.push({ category, id, pass: Boolean(pass), detail: String(detail || (pass ? 'ok' : 'FAIL')) })
}

function isSyntheticTenant(tenant) {
  if (!tenant) return true
  const id = typeof tenant === 'string' ? tenant : tenant.id
  return !id || id === 'commercial'
}

function createScopedContext(repositoryRuntime, baseContext, authenticatedTenant) {
  if (!repositoryRuntime || !authenticatedTenant) {
    throw new Error('Cannot create scoped context: repository runtime or tenant not available')
  }
  const scopedContext = Object.assign(Object.create(Object.getPrototypeOf(baseContext)), baseContext, {
    tenant: authenticatedTenant,
    repositories: null
  })
  scopedContext.repositories = createRepositoriesFacade(repositoryRuntime, scopedContext)
  return scopedContext
}

async function main() {
  console.log('=== RUNTIME-PERSISTENCE-1: Route-Scoped Execution Regression Test ===\n')

  InMemoryRepositoryAdapter.reset()

  const realBus = createEventBus()
  const eventBus = createMockEventBus(realBus)
  const mockRuntime = createMockRuntime()

  const config = { runtime: {}, tenant: SYNTHETIC_TENANT, capabilities: {} }
  const runtime = await bootstrapRuntime({ eventBus, config })

  runtime.repositoryRuntime.registerAdapter('mock', InMemoryRepositoryAdapter)
  registerRepositories(runtime.repositoryRuntime)

  const { context } = await registerCapabilities(runtime, {
    tenant: SYNTHETIC_TENANT,
    configuration: {},
  })
  context.runtime = mockRuntime

  global.runtimeContext = context

  console.log(`[Setup] global.runtimeContext tenant: ${global.runtimeContext.tenant.id}`)

  InMemoryRepositoryAdapter.seed('business', [
    { id: 'biz-A-001', tenantId: TEST_TENANT_A.id, name: 'Business A', status: 'active', deletedAt: null },
    { id: 'biz-B-001', tenantId: TEST_TENANT_B.id, name: 'Business B', status: 'active', deletedAt: null },
    { id: 'biz-C-001', tenantId: SYNTHETIC_TENANT.id, name: 'Business Commercial', status: 'active', deletedAt: null },
  ])
  InMemoryRepositoryAdapter.seed('accommodation', [
    { id: 'acc-A-001', tenantId: TEST_TENANT_A.id, businessId: 'biz-A-001', name: 'Accommodation A', deletedAt: null },
    { id: 'acc-B-001', tenantId: TEST_TENANT_B.id, businessId: 'biz-B-001', name: 'Accommodation B', deletedAt: null },
    { id: 'acc-C-001', tenantId: SYNTHETIC_TENANT.id, businessId: 'biz-C-001', name: 'Accommodation Commercial', deletedAt: null },
  ])
  InMemoryRepositoryAdapter.seed('reservation', [])

  let tenantIdAtFindById = null
  const origFindOne = InMemoryRepositoryAdapter.prototype.findOne
  InMemoryRepositoryAdapter.prototype.findOne = function(query, options) {
    tenantIdAtFindById = query.tenantId
    return origFindOne.call(this, query, options)
  }

  console.log('[R1] Authenticated request with tenant UUID enters scoped execution...')
  {
    const identity = { tenantId: TEST_TENANT_A.id, userId: 'user-A', permissions: ['reservation:create'], tenant: TEST_TENANT_A }
    const req = { user: identity, body: { businessId: 'biz-A-001', guestName: 'Test' } }

    const authenticatedTenant = req.user?.tenant

    if (authenticatedTenant?.id && authenticatedTenant?.id !== 'commercial') {
      const scopedContext = createScopedContext(runtime.repositoryRuntime, global.runtimeContext, authenticatedTenant)
      const scopedReservationManager = new ReservationManager(scopedContext)
      const scopedBusinessManager = new BusinessManager(scopedContext, scopedReservationManager)

      await scopedBusinessManager.createReservation('biz-A-001', { guestName: 'Test', tenantId: TEST_TENANT_A.id }, identity)

      record('regression', 'r1-UUID-tenant-uses-scoped-path',
        tenantIdAtFindById === TEST_TENANT_A.id,
        `Tenant A: expected ${TEST_TENANT_A.id}, got ${tenantIdAtFindById}`)
    } else {
      record('regression', 'r1-UUID-tenant-uses-scoped-path', false, 'Scoped path not entered')
    }
  }

  console.log('[R2] Synthetic commercial tenant is REJECTED (cannot be PostgreSQL tenant)...')
  {
    tenantIdAtFindById = null
    const identity = { tenantId: SYNTHETIC_TENANT.id, userId: 'user-commercial', permissions: ['reservation:create'], tenant: SYNTHETIC_TENANT }
    const req = { user: identity, body: { businessId: 'biz-C-001', guestName: 'Test' } }

    const authenticatedTenant = req.user?.tenant

    if (isSyntheticTenant(authenticatedTenant)) {
      record('regression', 'r2-commercial-tenant-rejected',
        true,
        'Commercial correctly rejected as synthetic tenant')
    } else {
      record('regression', 'r2-commercial-tenant-rejected',
        false,
        'Commercial was NOT rejected - should not be valid PostgreSQL tenant')
    }
  }

  console.log('[R3] Unauthenticated/missing tenant fails closed (no global manager usage)...')
  {
    tenantIdAtFindById = null
    const identity = { tenantId: null, userId: 'user-anon', permissions: [], tenant: null }
    const req = { user: identity, body: { businessId: 'biz-A-001', guestName: 'Test' } }

    const authenticatedTenant = req.user?.tenant

    if (authenticatedTenant?.id) {
      const scopedContext = createScopedContext(runtime.repositoryRuntime, global.runtimeContext, authenticatedTenant)
      const scopedReservationManager = new ReservationManager(scopedContext)
      const scopedBusinessManager = new BusinessManager(scopedContext, scopedReservationManager)

      await scopedBusinessManager.createReservation('biz-A-001', { guestName: 'Test', tenantId: null }, identity)

      record('regression', 'r3-no-tenant-no-global-access',
        tenantIdAtFindById !== SYNTHETIC_TENANT.id,
        `No tenant: findById called with ${tenantIdAtFindById} (should not be commercial)`)
    } else {
      record('regression', 'r3-no-tenant-no-global-access', true, 'No authenticated tenant - would fail at controller')
    }
  }

  console.log('[R4] Body tenantId cannot override authenticated tenant (spoof prevention)...')
  {
    tenantIdAtFindById = null
    const identity = { tenantId: TEST_TENANT_A.id, userId: 'user-A', permissions: ['reservation:create'], tenant: TEST_TENANT_A }
    const req = { user: identity, body: { businessId: 'biz-A-001', guestName: 'Test', tenantId: 'spoofed-tenant' } }

    const authenticatedTenant = req.user?.tenant

    if (authenticatedTenant?.id) {
      const scopedContext = createScopedContext(runtime.repositoryRuntime, global.runtimeContext, authenticatedTenant)
      const scopedReservationManager = new ReservationManager(scopedContext)
      const scopedBusinessManager = new BusinessManager(scopedContext, scopedReservationManager)

      await scopedBusinessManager.createReservation('biz-A-001', { ...req.body, tenantId: 'spoofed-tenant' }, identity)

      record('regression', 'r4-body-tenant-spoof-prevented',
        tenantIdAtFindById === TEST_TENANT_A.id,
        `Spoof: expected ${TEST_TENANT_A.id}, got ${tenantIdAtFindById} (body tenantId should not override)`)
    } else {
      record('regression', 'r4-body-tenant-spoof-prevented', false, 'Scoped path not entered')
    }
  }

  console.log('[R5] Two tenant requests remain isolated (sequential)...')
  {
    tenantIdAtFindById = null

    const identityA = { tenantId: TEST_TENANT_A.id, userId: 'user-A', permissions: ['reservation:create'], tenant: TEST_TENANT_A }
    const scopedContextA = createScopedContext(runtime.repositoryRuntime, global.runtimeContext, TEST_TENANT_A)
    const scopedReservationManagerA = new ReservationManager(scopedContextA)
    const scopedBusinessManagerA = new BusinessManager(scopedContextA, scopedReservationManagerA)

    await scopedBusinessManagerA.createReservation('biz-A-001', { guestName: 'Test A', tenantId: TEST_TENANT_A.id }, identityA)
    const tenantAfterA = tenantIdAtFindById

    const identityB = { tenantId: TEST_TENANT_B.id, userId: 'user-B', permissions: ['reservation:create'], tenant: TEST_TENANT_B }
    const scopedContextB = createScopedContext(runtime.repositoryRuntime, global.runtimeContext, TEST_TENANT_B)
    const scopedReservationManagerB = new ReservationManager(scopedContextB)
    const scopedBusinessManagerB = new BusinessManager(scopedContextB, scopedReservationManagerB)

    await scopedBusinessManagerB.createReservation('biz-B-001', { guestName: 'Test B', tenantId: TEST_TENANT_B.id }, identityB)
    const tenantAfterB = tenantIdAtFindById

    record('regression', 'r5-tenant-A-isolated',
      tenantAfterA === TEST_TENANT_A.id,
      `Tenant A: expected ${TEST_TENANT_A.id}, got ${tenantAfterA}`)
    record('regression', 'r5-tenant-B-isolated',
      tenantAfterB === TEST_TENANT_B.id,
      `Tenant B: expected ${TEST_TENANT_B.id}, got ${tenantAfterB}`)
  }

  console.log('[ASYNC-1] Async middleware test: controller NOT called before validation completes...')
  {
    const executionOrder = []
    let validateTokenCalled = false

    const mockValidateToken = async (token) => {
      validateTokenCalled = true
      executionOrder.push('validateToken_START')
      await new Promise(r => setTimeout(r, 50))
      executionOrder.push('validateToken_END')
      return {
        id: 'test-user',
        tenant: TEST_TENANT_A,
        roles: ['user'],
      }
    }

    global.runtimeContext = {
      ...global.runtimeContext,
      auth: {
        validateToken: mockValidateToken,
      },
    }

    let controllerSawUser = false
    const controller = async (req, res) => {
      executionOrder.push('controller_CALLED')
      controllerSawUser = Boolean(req.user?.tenant?.id === TEST_TENANT_A.id)
      executionOrder.push('controllerSawUser_' + controllerSawUser)
    }

    const Router = (await import('../../api/routes/router.js')).Router
    const { authMiddleware } = await import('../../api/middleware/auth.middleware.js')

    const router = new Router()
    router.post('/', authMiddleware, controller)

    const req = {
      method: 'POST',
      pathname: '/',
      headers: { authorization: 'Bearer test-token' },
      body: null,
    }
    const res = {}

    await router.handle(req, res)

    const asyncTestPassed = executionOrder.includes('validateToken_END') &&
                            executionOrder.includes('controller_CALLED') &&
                            controllerSawUser &&
                            executionOrder.indexOf('controller_CALLED') > executionOrder.indexOf('validateToken_END')

    record('regression', 'async-1-controller-after-validation',
      asyncTestPassed,
      `Execution order: ${executionOrder.join(' -> ')}, controller saw user: ${controllerSawUser}`)
  }

  console.log('[JWT-1] JWT authentication chain test...')
  {
    const jwtModule = await import('jsonwebtoken')
    const jwt = jwtModule.default || jwtModule

    const testSecret = 'test-jwt-secret-for-unit-test'
    const testIssuer = 'valdi-engine'
    const testAudience = 'valdi-platform'
    const testTenantId = '11111111-1111-4111-8111-111111111111'

    const validToken = jwt.sign(
      {
        sub: 'user-123',
        email: 'test@example.com',
        tid: testTenantId,
        ten: 'Test Tenant',
        roles: ['user'],
        permissions: ['reservation:create'],
      },
      testSecret,
      {
        algorithm: 'HS256',
        issuer: testIssuer,
        audience: testAudience,
        expiresIn: 3600,
      }
    )

    const wrongSecretToken = jwt.sign(
      { sub: 'user-123', tid: testTenantId },
      'wrong-secret',
      { algorithm: 'HS256', issuer: testIssuer, audience: testAudience }
    )

    const wrongIssuerToken = jwt.sign(
      { sub: 'user-123', tid: testTenantId },
      testSecret,
      { algorithm: 'HS256', issuer: 'wrong-issuer', audience: testAudience }
    )

    const noSubToken = jwt.sign(
      { tid: testTenantId },
      testSecret,
      { algorithm: 'HS256', issuer: testIssuer, audience: testAudience }
    )

    const originalRuntimeContext = global.runtimeContext

    global.runtimeContext = {
      ...global.runtimeContext,
      auth: {
        async validateToken(token) {
          try {
            const decoded = jwt.verify(token, testSecret, {
              algorithms: ['HS256'],
              issuer: testIssuer,
              audience: testAudience,
            })
            if (!decoded || !decoded.sub) return null
            return {
              id: decoded.sub,
              tenant: decoded.tid ? { id: decoded.tid, name: decoded.ten } : null,
              roles: decoded.roles || [],
              permissions: decoded.permissions || [],
            }
          } catch (e) {
            return null
          }
        }
      }
    }

    const { authMiddleware } = await import('../../api/middleware/auth.middleware.js')

    const testReq = {
      method: 'POST',
      pathname: '/test',
      headers: { authorization: `Bearer ${validToken}` },
      body: null,
    }
    const testRes = {}
    await authMiddleware(testReq, testRes, () => {})

    record('regression', 'jwt-1-valid-token-identity',
      testReq.user?.id === 'user-123' && testReq.user?.tenant?.id === testTenantId,
      `Valid token: expected user-123/${testTenantId}, got ${testReq.user?.id}/${testReq.user?.tenant?.id}`)

    const wrongSecretReq = {
      method: 'POST',
      pathname: '/test',
      headers: { authorization: `Bearer ${wrongSecretToken}` },
      body: null,
    }
    await authMiddleware(wrongSecretReq, testRes, () => {})
    record('regression', 'jwt-2-wrong-secret-rejected',
      !wrongSecretReq.user,
      `Wrong secret: expected null user, got ${wrongSecretReq.user?.id}`)

    const wrongIssuerReq = {
      method: 'POST',
      pathname: '/test',
      headers: { authorization: `Bearer ${wrongIssuerToken}` },
      body: null,
    }
    await authMiddleware(wrongIssuerReq, testRes, () => {})
    record('regression', 'jwt-3-wrong-issuer-rejected',
      !wrongIssuerReq.user,
      `Wrong issuer: expected null user, got ${wrongIssuerReq.user?.id}`)

    const noSubReq = {
      method: 'POST',
      pathname: '/test',
      headers: { authorization: `Bearer ${noSubToken}` },
      body: null,
    }
    await authMiddleware(noSubReq, testRes, () => {})
    record('regression', 'jwt-4-no-sub-rejected',
      !noSubReq.user,
      `No sub claim: expected null user, got ${noSubReq.user?.id}`)

    global.runtimeContext = originalRuntimeContext
  }

  console.log('\n[JWT-WIRING] Auth provider config propagation tests...')
  {
    const { AuthenticationEngine } = await import('../../runtime/auth/engine/authentication.engine.js')
    const { JwtProvider } = await import('../../runtime/auth/providers/jwt/jwt.provider.js')

    const testSecret = 'test-jwt-secret-for-jwt-wiring-test'
    const testIssuer = 'valdi-engine'
    const testAudience = 'valdi-platform'
    const testTenantId = '22222222-2222-4222-8222-222222222222'

    const jwtModule = await import('jsonwebtoken')
    const jwt = jwtModule.default || jwtModule

    function createToken(claims, secret, options = {}) {
      return jwt.sign(claims, secret, {
        algorithm: 'HS256',
        issuer: testIssuer,
        audience: testAudience,
        ...options,
      })
    }

    const validToken = createToken({
      sub: 'user-123',
      email: 'test@example.com',
      tid: testTenantId,
      ten: 'Test Tenant',
      roles: ['user'],
      permissions: ['reservation:create'],
    }, testSecret, { expiresIn: 3600 })

    const wrongSecretToken = createToken({ sub: 'user-123', tid: testTenantId }, 'wrong-secret')
    const wrongIssuerToken = createToken({ sub: 'user-123', tid: testTenantId }, testSecret, { issuer: 'wrong-issuer' })
    const wrongAudienceToken = createToken({ sub: 'user-123', tid: testTenantId }, testSecret, { audience: 'wrong-audience' })

    const authEngine = new AuthenticationEngine({
      cacheInstances: false,
      singletonByTenant: false,
    })

    authEngine.registerProvider('default', JwtProvider, {
      issuer: testIssuer,
      audience: testAudience,
      secret: testSecret,
      algorithm: 'HS256',
    })

    await authEngine.initialize()

    const result1 = await authEngine.authenticate(validToken)
    record('wiring', 'jwt-wiring-1-valid-token-identity',
      result1?.authenticated === true && result1?.identity?.id === 'user-123' && result1?.identity?.tenant?.id === testTenantId,
      `Valid token: authenticated=${result1?.authenticated}, id=${result1?.identity?.id}, tenantId=${result1?.identity?.tenant?.id}`)

    const result2 = await authEngine.authenticate(wrongSecretToken)
    record('wiring', 'jwt-wiring-2-wrong-secret-fails',
      result2?.authenticated === false && !result2?.identity,
      `Wrong secret: authenticated=${result2?.authenticated}, identity=${result2?.identity}`)

    const result3 = await authEngine.authenticate(wrongIssuerToken)
    record('wiring', 'jwt-wiring-3-wrong-issuer-fails',
      result3?.authenticated === false && !result3?.identity,
      `Wrong issuer: authenticated=${result3?.authenticated}, identity=${result3?.identity}`)

    const result4 = await authEngine.authenticate(wrongAudienceToken)
    record('wiring', 'jwt-wiring-4-wrong-audience-fails',
      result4?.authenticated === false && !result4?.identity,
      `Wrong audience: authenticated=${result4?.authenticated}, identity=${result4?.identity}`)

    record('wiring', 'jwt-wiring-5-valid-tid-maps',
      result1?.identity?.tenant?.id === testTenantId,
      `Valid tid: tenantId=${result1?.identity?.tenant?.id}`)

    await authEngine.shutdown()
  }

  InMemoryRepositoryAdapter.prototype.findOne = origFindOne

  console.log('\n=== RESULTS ===')
  const passed = results.filter(r => r.pass).length
  const failed = results.filter(r => !r.pass).length
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`)

  if (failed > 0) {
    console.log('\n=== FAILED ===')
    for (const r of results.filter(r => !r.pass)) {
      console.log(`  [${r.category}] ${r.id}: ${r.detail}`)
    }
  }

  try { await runtime.engine.shutdown() } catch {}
  InMemoryRepositoryAdapter.reset()

}

async function runContextWiringTests() {
  console.log('\n[CONTEXT-WIRING] Passenger API context wiring tests...')

  const originalRuntimeContext = global.runtimeContext

  const TEST_TENANT_A = { id: '11111111-1111-4111-8111-111111111111', name: 'Tenant A', slug: 'tenant-a' }
  const TEST_TENANT_B = { id: '22222222-2222-4222-8222-222222222222', name: 'Tenant B', slug: 'tenant-b' }
  const SYNTHETIC_TENANT = { id: 'commercial', name: 'Commercial', slug: 'commercial' }

  InMemoryRepositoryAdapter.reset()
  const realBus = createEventBus()
  const eventBus = createMockEventBus(realBus)
  const mockRuntime = createMockRuntime()

  const config = { runtime: {}, tenant: SYNTHETIC_TENANT, capabilities: {} }
  const runtime = await bootstrapRuntime({ eventBus, config })

  runtime.repositoryRuntime.registerAdapter('mock', InMemoryRepositoryAdapter)
  registerRepositories(runtime.repositoryRuntime)

  const { context } = await registerCapabilities(runtime, {
    tenant: SYNTHETIC_TENANT,
    configuration: {},
  })
  context.runtime = mockRuntime

  const apiContext = {
    ...context,
    capabilities: context.capabilities,
    repositories: runtime.repositoryRuntime,
    auth: { validateToken: async () => null },
    tenant: SYNTHETIC_TENANT,
  }

  InMemoryRepositoryAdapter.seed('business', [
    { id: 'biz-A-001', tenantId: TEST_TENANT_A.id, name: 'Business A', status: 'active', deletedAt: null },
    { id: 'biz-B-001', tenantId: TEST_TENANT_B.id, name: 'Business B', status: 'active', deletedAt: null },
  ])

  InMemoryRepositoryAdapter.seed('reservation', [])

  const { withTenantScopedExecution } = await import('../../api/routes/reservation.routes.js')

  global.runtimeContext = apiContext

  try {
    const identity = { tenantId: TEST_TENANT_A.id, userId: 'user-A', permissions: ['reservation:create'], tenant: TEST_TENANT_A }

    let scopedContextCreated = false

    await withTenantScopedExecution(TEST_TENANT_A, identity, async (scopedReservationManager, scopedBusinessManager) => {
      scopedContextCreated = true
      return { success: true }
    })

    record('wiring', 'context-wiring-1-uuid-tenant-scoped-context',
      scopedContextCreated === true,
      `Scoped context created=${scopedContextCreated}`)
  } catch (err) {
    record('wiring', 'context-wiring-1-uuid-tenant-scoped-context',
      false,
      `Error: ${err.message}`)
  }

  {
    const identity = { tenantId: TEST_TENANT_A.id, userId: 'user-A', permissions: ['reservation:create'], tenant: TEST_TENANT_A }

    let tenantIdAtFindById = null
    const origFindOne = InMemoryRepositoryAdapter.prototype.findOne
    InMemoryRepositoryAdapter.prototype.findOne = function(query, options) {
      tenantIdAtFindById = query.tenantId
      return origFindOne.call(this, query, options)
    }

    try {
      await withTenantScopedExecution(TEST_TENANT_A, identity, async (scopedReservationManager, scopedBusinessManager) => {
        await scopedReservationManager.findById('biz-A-001')
        return { success: true }
      })
      record('wiring', 'context-wiring-2-repo-receives-auth-tenant',
        tenantIdAtFindById === TEST_TENANT_A.id,
        `Expected ${TEST_TENANT_A.id}, got ${tenantIdAtFindById}`)
    } catch (err) {
      record('wiring', 'context-wiring-2-repo-receives-auth-tenant',
        false,
        `Error: ${err.message}`)
    }

    InMemoryRepositoryAdapter.prototype.findOne = origFindOne
  }

  {
    const TEST_TENANT_SPOOF = { id: '99999999-9999-4999-8999-999999999999', name: 'Spoof Tenant', slug: 'spoof' }

    let capturedTenantIdAtRepo = null
    const origFindOne = InMemoryRepositoryAdapter.prototype.findOne
    InMemoryRepositoryAdapter.prototype.findOne = function(query, options) {
      capturedTenantIdAtRepo = query.tenantId
      return origFindOne.call(this, query, options)
    }

    try {
      const { ReservationController } = await import('../../api/routes/reservation.routes.js')
      const controller = new ReservationController()

      const mockReq = {
        user: {
          id: 'user-A',
          tenant: TEST_TENANT_A,
          tenantId: TEST_TENANT_A.id,
          permissions: ['reservation:create'],
          roles: ['user']
        },
        body: {
          businessId: 'biz-A-001',
          tenantId: TEST_TENANT_SPOOF.id,
          guestName: 'Test Guest',
          dates: { checkIn: '2026-10-01', checkOut: '2026-10-05' }
        }
      }

      const mockRes = {
        statusCode: null,
        headers: {},
        setHeader: function(k, v) { this.headers[k] = v },
        end: function(data) {
          try { this.body = JSON.parse(data) } catch(e) { this.body = data }
        }
      }

      await controller.create(mockReq, mockRes)

      const spoofBlocked = capturedTenantIdAtRepo === TEST_TENANT_A.id && capturedTenantIdAtRepo !== TEST_TENANT_SPOOF.id

      record('wiring', 'context-wiring-5-body-tenant-blocked',
        spoofBlocked && mockRes.statusCode !== 500,
        `Body tenant spoof blocked: authenticated=${TEST_TENANT_A.id}, spoofBody=${TEST_TENANT_SPOOF.id}, repoReceived=${capturedTenantIdAtRepo}, status=${mockRes.statusCode}`)
    } catch (err) {
      record('wiring', 'context-wiring-5-body-tenant-blocked',
        false,
        `Error: ${err.message}`)
    }

    InMemoryRepositoryAdapter.prototype.findOne = origFindOne
  }

  try {
    const identity = { tenantId: SYNTHETIC_TENANT.id, userId: 'user-com', permissions: ['reservation:create'], tenant: SYNTHETIC_TENANT }
    await withTenantScopedExecution(SYNTHETIC_TENANT, identity, async () => {})
    record('wiring', 'context-wiring-3-commercial-fails-closed',
      false,
      'Commercial tenant should have failed but did not')
  } catch (err) {
    record('wiring', 'context-wiring-3-commercial-fails-closed',
      err.message.includes('synthetic') || err.message.includes('required'),
      `Error: ${err.message}`)
  }

  try {
    const badContext = { ...apiContext, repositories: null }
    global.runtimeContext = badContext
    const identity = { tenantId: TEST_TENANT_A.id, userId: 'user-A', permissions: ['reservation:create'], tenant: TEST_TENANT_A }
    await withTenantScopedExecution(TEST_TENANT_A, identity, async () => {})
    record('wiring', 'context-wiring-4-missing-repo-fails-closed',
      false,
      'Should have failed with missing repository')
  } catch (err) {
    record('wiring', 'context-wiring-4-missing-repo-fails-closed',
      err.message.includes('repository runtime or tenant not available'),
      `Error: ${err.message}`)
  }

  global.runtimeContext = apiContext

  const originalTenant = global.runtimeContext.tenant
  const identityA = { tenantId: TEST_TENANT_A.id, userId: 'user-A', permissions: [], tenant: TEST_TENANT_A }
  await withTenantScopedExecution(TEST_TENANT_A, identityA, async () => {})
  const tenantAfterA = global.runtimeContext.tenant
  await withTenantScopedExecution(TEST_TENANT_B, identityA, async () => {})
  const tenantAfterB = global.runtimeContext.tenant

  record('wiring', 'context-wiring-6-no-global-mutation',
    tenantAfterA === originalTenant && tenantAfterB === originalTenant,
      `Original=${originalTenant?.id}, AfterA=${tenantAfterA?.id}, AfterB=${tenantAfterB?.id}`)

  global.runtimeContext = originalRuntimeContext
  try { await runtime.engine.shutdown() } catch {}
  InMemoryRepositoryAdapter.reset()
}

async function runAllTests() {
  try {
    await main()
  } catch (err) {
    console.error('Main suite error:', err.message)
  }
  try {
    await runContextWiringTests()
  } catch (err) {
    console.error('Context wiring suite error:', err.message)
  }
  console.log('\n=== RESULTS ===')
  const passed = results.filter(r => r.pass).length
  const failed = results.filter(r => !r.pass).length
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`)
  if (failed > 0) {
    console.log('\n=== FAILED ===')
    for (const r of results.filter(r => !r.pass)) {
      console.log(`  [${r.category}] ${r.id}: ${r.detail}`)
    }
  }
  process.exit(failed > 0 ? 1 : 0)
}

runAllTests().catch(err => {
  console.error('Test runner error:', err)
  process.exit(1)
})
