/**
 * OWNER-1 — Business Owner Portal Tests
 *
 * Tests for OWNER-1 Business Owner Portal authentication,
 * authorization, and application management.
 */

const STATUS = { PASS: 'pass', FAIL: 'fail' }
let passCount = 0
let failCount = 0
const results = []

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) throw new Error(`${message} - Expected ${expected}, got ${actual}`)
}

function assertNotEqual(actual, notExpected, message) {
  if (actual === notExpected) throw new Error(`${message} - Expected NOT ${notExpected}`)
}

function assertContains(array, item, message) {
  if (!array.includes(item)) throw new Error(`${message}`)
}

function assertThrows(fn, message) {
  try {
    fn()
    throw new Error(`${message} - Expected function to throw`)
  } catch (e) {
    if (e.message.includes(`${message} -`)) throw e
  }
}

function test(name, fn) {
  try {
    fn()
    results.push({ name, status: STATUS.PASS })
    passCount++
    console.log(`  ${name}`)
  } catch (error) {
    results.push({ name, status: STATUS.FAIL, error: error.message })
    failCount++
    console.log(`  ${name}`)
    console.log(`    Error: ${error.message}`)
  }
}

console.log('\n═══════════════════════════════════════════════════════════')
console.log('OWNER-1 — BUSINESS OWNER PORTAL TESTS')
console.log('═══════════════════════════════════════════════════════════\n')

console.log('Loading modules...')

import {
  OWNER_ROLES,
  OWNER_PERMISSIONS,
  createOwnerIdentity,
  createOwnerGrant,
  createOwnerSession,
  generateId,
  generateSessionId,
  isValidEmail,
  isValidOwnerId,
  isValidApplicationId,
  isSessionExpired,
  hasPermission,
  canAccessApplication,
  sanitizeOwnerInput,
  validateBusinessInfoField
} from './owner/owner.identity.js'

import {
  hashPassword,
  verifyPassword,
  registerOwner,
  authenticateOwner,
  validateSession,
  invalidateSession,
  getSessionOwner,
  createTestOwner,
  forTesting_onlyClearAllData
} from './owner/owner.auth.js'

import {
  createOwnerAPIHandler,
  createOwnerRouter
} from './owner/owner.api.js'

import {
  createOwnerAuthMiddleware,
  requireOwnerAuth,
  requireOwnerPermission,
  requireOwnerApplicationAccess,
  buildOwnerContext
} from './owner/owner.middleware.js'

console.log('Modules loaded.\n')

console.log('──────────────────────────────────────────────────')

test('OWNER_ROLES are defined', () => {
  assertEqual(OWNER_ROLES.BUSINESS_OWNER, 'business_owner', 'BUSINESS_OWNER exists')
  assertEqual(OWNER_ROLES.ZONE_ADMIN, 'zone_admin', 'ZONE_ADMIN exists')
  assertEqual(OWNER_ROLES.PLATFORM_ADMIN, 'platform_admin', 'PLATFORM_ADMIN exists')
})

test('OWNER_PERMISSIONS are defined', () => {
  assert(OWNER_PERMISSIONS.READ_APPLICATION, 'READ_APPLICATION exists')
  assert(OWNER_PERMISSIONS.EDIT_BUSINESS_INFO, 'EDIT_BUSINESS_INFO exists')
  assert(OWNER_PERMISSIONS.READ_INBOX, 'READ_INBOX exists')
})

test('createOwnerIdentity creates frozen object', () => {
  const identity = createOwnerIdentity({ id: 'owner_test', email: 'test@test.com', name: 'Test' })
  assertEqual(identity.id, 'owner_test', 'id is set')
  assertEqual(identity.email, 'test@test.com', 'email is set')
  assertEqual(identity.name, 'Test', 'name is set')
})

test('createOwnerGrant creates frozen object', () => {
  const grant = createOwnerGrant({
    ownerId: 'owner_test',
    applicationId: 'valdi.app/albasie',
    permissions: ['application:read']
  })
  assertEqual(grant.ownerId, 'owner_test', 'ownerId is set')
  assertEqual(grant.applicationId, 'valdi.app/albasie', 'applicationId is set')
  assertEqual(grant.permissions.length, 1, 'permissions count is 1')
})

test('createOwnerSession creates frozen object', () => {
  const session = createOwnerSession({
    ownerId: 'owner_test',
    ownerEmail: 'test@test.com',
    ownerName: 'Test',
    applicationId: 'valdi.app/albasie',
    permissions: ['application:read'],
    expiresAt: new Date(Date.now() + 86400000).toISOString()
  })
  assertEqual(session.ownerId, 'owner_test', 'ownerId is set')
  assertEqual(session.applicationId, 'valdi.app/albasie', 'applicationId is set')
  assert(session.expiresAt, 'expiresAt is set')
})

test('generateId creates unique IDs', () => {
  const id1 = generateId()
  const id2 = generateId()
  assert(id1.startsWith('owner_'), 'ID starts with owner_')
  assert(id1 !== id2, 'IDs are unique')
})

test('generateSessionId creates unique session IDs', () => {
  const id1 = generateSessionId()
  const id2 = generateSessionId()
  assert(id1.startsWith('sess_'), 'Session ID starts with sess_')
  assert(id1 !== id2, 'Session IDs are unique')
})

test('isValidEmail validates email format', () => {
  assert(isValidEmail('test@example.com'), 'valid email passes')
  assert(isValidEmail('user.name@domain.co'), 'subdomain email passes')
  assert(!isValidEmail('invalid'), 'invalid fails')
  assert(!isValidEmail('@nodomain.com'), 'no local part fails')
  assert(!isValidEmail('test@'), 'no domain fails')
  assert(!isValidEmail(''), 'empty fails')
  assert(!isValidEmail(null), 'null fails')
})

test('isValidOwnerId validates owner ID format', () => {
  assert(isValidOwnerId('owner_abc123def45678901'), 'valid owner ID passes')
  assert(!isValidOwnerId('user_123'), 'wrong prefix fails')
  assert(!isValidOwnerId('owner_short'), 'too short fails')
  assert(!isValidOwnerId(''), 'empty fails')
})

test('isValidApplicationId validates application IDs', () => {
  assert(isValidApplicationId('valdi.app/albasie'), 'valdi.app/albasie valid')
  assert(isValidApplicationId('natales.app/hostal'), 'natales.app/hostal valid')
  assert(!isValidApplicationId('evil.com/albasie'), 'wrong domain fails')
  assert(!isValidApplicationId('valdi.app'), 'missing route fails')
  assert(!isValidApplicationId('valdi.app'), 'no route fails')
  assert(!isValidApplicationId(''), 'empty fails')
})

test('isSessionExpired detects expired sessions', () => {
  const expiredSession = createOwnerSession({
    expiresAt: '2020-01-01T00:00:00.000Z'
  })
  const validSession = createOwnerSession({
    expiresAt: new Date(Date.now() + 86400000).toISOString()
  })
  assert(isSessionExpired(expiredSession), 'expired session detected')
  assert(!isSessionExpired(validSession), 'valid session not expired')
})

test('hasPermission checks permissions correctly', () => {
  const session = createOwnerSession({
    permissions: ['application:read', 'business:edit_info']
  })
  assert(hasPermission(session, 'application:read'), 'has read permission')
  assert(hasPermission(session, 'business:edit_info'), 'has edit permission')
  assert(!hasPermission(session, 'admin:write'), 'missing permission denied')
})

test('canAccessApplication checks application scope', () => {
  const session = createOwnerSession({
    applicationId: 'valdi.app/albasie'
  })
  assert(canAccessApplication(session, 'valdi.app/albasie'), 'same app allowed')
  assert(!canAccessApplication(session, 'valdi.app/corral'), 'different app denied')
})

test('sanitizeOwnerInput removes dangerous content', () => {
  assertEqual(sanitizeOwnerInput('<script>'), 'script', 'angle brackets removed')
  assertEqual(sanitizeOwnerInput('  test  '), 'test', 'whitespace trimmed')
  assertEqual(sanitizeOwnerInput('a'.repeat(2000)).length, 1000, 'max length enforced')
})

test('validateBusinessInfoField validates allowed fields', () => {
  const nameResult = validateBusinessInfoField('name', 'Albasie')
  assert(nameResult.valid, 'name field valid')
  assertEqual(nameResult.value, 'Albasie', 'name value preserved')

  const descResult = validateBusinessInfoField('description', 'Boat tours')
  assert(descResult.valid, 'description field valid')

  const invalidResult = validateBusinessInfoField('password', 'secret')
  assert(!invalidResult.valid, 'password field not allowed')
  assert(invalidResult.error.includes('not allowed'), 'correct error')
})

test('validateBusinessInfoField validates email format', () => {
  const validEmail = validateBusinessInfoField('contactEmail', 'test@example.com')
  assert(validEmail.valid, 'valid email passes')

  const invalidEmail = validateBusinessInfoField('contactEmail', 'notanemail')
  assert(!invalidEmail.valid, 'invalid email fails')
})

test('hashPassword creates secure hash', async () => {
  const hash = await hashPassword('TestPassword123!')
  assert(hash.length > 20, 'hash is long')
  assert(hash.includes('$'), 'hash contains salt separator')
})

test('hashPassword rejects weak passwords', async () => {
  let thrown = false
  try {
    await hashPassword('short')
  } catch (e) {
    thrown = true
  }
  assert(thrown, 'short password rejected')
  thrown = false
  try {
    await hashPassword('')
  } catch (e) {
    thrown = true
  }
  assert(thrown, 'empty password rejected')
})

test('verifyPassword validates correct password', async () => {
  const hash = await hashPassword('MySecurePassword123')
  assert(await verifyPassword('MySecurePassword123', hash), 'correct password verifies')
  assert(!(await verifyPassword('WrongPassword', hash)), 'wrong password fails')
  assert(!(await verifyPassword('', hash)), 'empty password fails')
})

test('registerOwner creates new owner', async () => {
  forTesting_onlyClearAllData()

  const result = await registerOwner({
    email: 'newowner@example.com',
    password: 'SecurePass123!',
    name: 'New Owner',
    applicationId: 'valdi.app/albasie'
  })

  assertEqual(result.email, 'newowner@example.com', 'email set')
  assertEqual(result.applicationId, 'valdi.app/albasie', 'applicationId set')
  assert(result.id.startsWith('owner_'), 'id starts with owner_')
})

test('registerOwner rejects duplicate email', async () => {
  const existingEmail = 'alreadyregistered@example.com'
  forTesting_onlyClearAllData()
  await registerOwner({
    email: existingEmail,
    password: 'SecurePass123!',
    applicationId: 'valdi.app/albasie'
  })

  let thrown = false
  try {
    await registerOwner({
      email: existingEmail,
      password: 'DifferentPassword123!',
      applicationId: 'valdi.app/albasie'
    })
  } catch (e) {
    thrown = true
  }
  assert(thrown, 'duplicate email rejected')
})

test('registerOwner rejects invalid email', async () => {
  forTesting_onlyClearAllData()
  let thrown = false
  try {
    await registerOwner({
      email: 'invalid-email',
      password: 'SecurePass123!',
      applicationId: 'valdi.app/albasie'
    })
  } catch (e) {
    thrown = true
  }
  assert(thrown, 'invalid email rejected')
})

test('authenticateOwner validates credentials', async () => {
  forTesting_onlyClearAllData()

  await registerOwner({
    email: 'authtest@example.com',
    password: 'AuthTestPass123!',
    name: 'Auth Test',
    applicationId: 'valdi.app/albasie'
  })

  const result = await authenticateOwner('authtest@example.com', 'AuthTestPass123!')
  assert(result.success, 'authentication succeeded')
  assertEqual(result.session.ownerEmail, 'authtest@example.com', 'session email correct')
  assert(result.session.permissions.length > 0, 'session has permissions')
})

test('authenticateOwner rejects wrong password', async () => {
  const result = await authenticateOwner('authtest@example.com', 'WrongPassword')
  assert(!result.success, 'wrong password fails')
  assertEqual(result.error, 'Invalid credentials', 'correct error message')
})

test('authenticateOwner rejects non-existent owner', async () => {
  const result = await authenticateOwner('nonexistent@example.com', 'AnyPassword123')
  assert(!result.success, 'non-existent fails')
})

test('validateSession returns session for valid token', async () => {
  forTesting_onlyClearAllData()

  await registerOwner({
    email: 'sessiontest@example.com',
    password: 'SessionTest123!',
    applicationId: 'valdi.app/albasie'
  })

  const auth = await authenticateOwner('sessiontest@example.com', 'SessionTest123!')
  const session = await validateSession(auth.session.id)
  assert(session, 'session found')
  assertEqual(session.ownerEmail, 'sessiontest@example.com', 'session owner correct')
})

test('validateSession returns null for invalid token', async () => {
  assertEqual(await validateSession('invalid_token'), null, 'invalid token returns null')
  assertEqual(await validateSession(''), null, 'empty token returns null')
  assertEqual(await validateSession(null), null, 'null token returns null')
})

test('invalidateSession removes session', async () => {
  forTesting_onlyClearAllData()

  await registerOwner({
    email: 'invalidate@example.com',
    password: 'Invalidate123!',
    applicationId: 'valdi.app/albasie'
  })

  const auth = await authenticateOwner('invalidate@example.com', 'Invalidate123!')
  assert(await invalidateSession(auth.session.id), 'session invalidated')
  assertEqual(await validateSession(auth.session.id), null, 'session no longer valid')
})

test('getSessionOwner returns owner info', async () => {
  forTesting_onlyClearAllData()

  await registerOwner({
    email: 'ownertest@example.com',
    password: 'OwnerTest123!',
    name: 'Owner Test',
    applicationId: 'valdi.app/albasie'
  })

  const auth = await authenticateOwner('ownertest@example.com', 'OwnerTest123!')
  const owner = getSessionOwner(auth.session.id)

  assertEqual(owner.email, 'ownertest@example.com', 'email correct')
  assertEqual(owner.name, 'Owner Test', 'name correct')
  assertEqual(owner.applicationId, 'valdi.app/albasie', 'applicationId correct')
})

test('createOwnerAPIHandler creates handler object', () => {
  const handler = createOwnerAPIHandler()
  assert(typeof handler.handleLogin === 'function', 'has handleLogin')
  assert(typeof handler.handleLogout === 'function', 'has handleLogout')
  assert(typeof handler.handleMe === 'function', 'has handleMe')
  assert(typeof handler.handleGetApplication === 'function', 'has handleGetApplication')
  assert(typeof handler.handleUpdateBusinessInfo === 'function', 'has handleUpdateBusinessInfo')
})

test('createOwnerRouter creates router function', () => {
  const handler = createOwnerAPIHandler()
  const router = createOwnerRouter(handler)
  assert(typeof router === 'function', 'router is function')
})

test('createOwnerAuthMiddleware creates middleware', () => {
  const middleware = createOwnerAuthMiddleware()
  assert(typeof middleware === 'function', 'middleware is function')
})

test('requireOwnerAuth returns 401 when not authenticated', () => {
  const req = { isOwnerAuthenticated: false, owner: null }
  const res = { statusCode: 200, ended: false, status(n) { this.statusCode = n; return this }, json(data) { this.body = data; this.ended = true; return this }, end() { this.ended = true; return this }, setHeader() {} }
  const next = () => {}

  requireOwnerAuth(req, res, next)
  assertEqual(res.statusCode, 401, 'returns 401')
})

test('requireOwnerPermission returns 403 when permission missing', () => {
  const req = {
    isOwnerAuthenticated: true,
    owner: { id: 'owner_test' },
    ownerSession: { permissions: ['application:read'] }
  }
  const res = { statusCode: 200, ended: false, status(n) { this.statusCode = n; return this }, json(data) { this.body = data; this.ended = true; return this }, end() { this.ended = true; return this }, setHeader() {} }
  const next = () => {}

  requireOwnerPermission('admin:write')(req, res, next)
  assertEqual(res.statusCode, 403, 'returns 403')
})

test('buildOwnerContext returns owner info', () => {
  const req = {
    isOwnerAuthenticated: true,
    owner: {
      id: 'owner_test',
      email: 'test@example.com',
      name: 'Test',
      applicationId: 'valdi.app/albasie',
      role: 'business_owner',
      permissions: ['application:read']
    }
  }

  const context = buildOwnerContext(req)
  assertEqual(context.ownerId, 'owner_test', 'ownerId correct')
  assertEqual(context.email, 'test@example.com', 'email correct')
  assertEqual(context.applicationId, 'valdi.app/albasie', 'applicationId correct')
})

test('buildOwnerContext returns null when not authenticated', () => {
  const req = { isOwnerAuthenticated: false, owner: null }
  assertEqual(buildOwnerContext(req), null, 'returns null')
})

test('cross-ecosystem isolation - albasie cannot access natales', () => {
  const session = createOwnerSession({
    applicationId: 'valdi.app/albasie'
  })

  assert(canAccessApplication(session, 'valdi.app/albasie'), 'can access own app')
  assert(!canAccessApplication(session, 'natales.app/hostal'), 'cannot access different ecosystem')
})

test('cross-ecosystem isolation - valdi zones are isolated', () => {
  const session = createOwnerSession({
    applicationId: 'valdi.app/albasie'
  })

  assert(!canAccessApplication(session, 'valdi.app/corral'), 'cannot access corral')
  assert(!canAccessApplication(session, 'valdi.app/costa'), 'cannot access costa')
})

test('five ecosystems are all valid targets', () => {
  const ecosystems = [
    'valdi.app/albasie',
    'natales.app/hostal',
    'puntaarenas.app/business',
    'coyhaique.app/service',
    'chiloe.app/tour'
  ]

  for (const appId of ecosystems) {
    assert(isValidApplicationId(appId), `${appId} is valid`)
  }
})

test('all ecosystems share same permission model', () => {
  const session1 = createOwnerSession({ applicationId: 'valdi.app/test', permissions: ['application:read'] })
  const session2 = createOwnerSession({ applicationId: 'natales.app/test', permissions: ['application:read'] })

  assert(hasPermission(session1, 'application:read'), 'valdi.app has read')
  assert(hasPermission(session2, 'application:read'), 'natales.app has read')
})

console.log('──────────────────────────────────────────────────\n')

console.log('═══════════════════════════════════════════════════════════')
console.log('OWNER-1 — TEST RESULTS')
console.log('═══════════════════════════════════════════════════════════')
console.log(`\n  Passed:  ${passCount}`)
console.log(`  Failed:  ${failCount}`)
console.log(`  Total:   ${passCount + failCount}`)
console.log('\n═══════════════════════════════════════════════════════════\n')

const allPassed = failCount === 0
process.exit(allPassed ? 0 : 1)
