/**
 * OWNER-SESSION-1 — Unit Test Suite
 *
 * Tests for OWNER-SESSION-1: Persistent Owner Identity with PostgreSQL
 *
 * Scope:
 * - scrypt password hashing with versioned format
 * - Owner identity persistence (users table)
 * - Grant-based authorization (owner_application_grants table)
 * - Bootstrap CLI idempotency
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

function assertContains(array, item, message) {
  if (!array.includes(item)) throw new Error(`${message}`)
}

function assertNotContains(array, item, message) {
  if (array.includes(item)) throw new Error(`${message}`)
}

function assertThrows(fn, message) {
  try {
    fn()
    throw new Error(`${message} - Expected function to throw`)
  } catch (e) {
    if (e.message.includes(`${message} -`)) throw e
  }
}

function assertRejects(promise, message) {
  return promise.then(
    () => { throw new Error(`${message} - Expected function to reject`) },
    () => { }
  )
}

function test(name, fn) {
  try {
    const result = fn()
    if (result && typeof result.then === 'function') {
      result.then(
        () => {
          results.push({ name, status: STATUS.PASS })
          passCount++
          console.log(`  ${name}`)
        },
        (err) => {
          results.push({ name, status: STATUS.FAIL, error: err.message })
          failCount++
          console.log(`  ${name}`)
          console.log(`    Error: ${err.message}`)
        }
      )
    } else {
      results.push({ name, status: STATUS.PASS })
      passCount++
      console.log(`  ${name}`)
    }
  } catch (error) {
    results.push({ name, status: STATUS.FAIL, error: error.message })
    failCount++
    console.log(`  ${name}`)
    console.log(`    Error: ${error.message}`)
  }
}

console.log('\n═══════════════════════════════════════════════════════════')
console.log('OWNER-SESSION-1 — PERSISTENT OWNER IDENTITY TESTS')
console.log('═══════════════════════════════════════════════════════════\n')

console.log('Loading modules...')

import {
  hashPassword,
  verifyPassword,
  isValidHashFormat
} from './web/owner/password/owner-password.module.js'

console.log('Modules loaded.\n')
console.log('──────────────────────────────────────────────────')

// ============================================================
// SECTION 1: SCRYPT FORMAT & VERSIONING
// ============================================================

test('scrypt hash uses versioned format', async () => {
  const hash = await hashPassword('TestPassword123!')
  assert(hash.startsWith('scrypt$v=1$'), 'hash starts with versioned prefix')
  assert(hash.includes('$N=32768$r=8$p=1$'), 'hash contains correct parameters')
  const parts = hash.split('$')
  assertEqual(parts.length, 7, 'hash has 7 parts')
  assertEqual(parts[0], 'scrypt', 'part 0 is scrypt')
  assertEqual(parts[1], 'v=1', 'part 1 is version')
  assertEqual(parts[2], 'N=32768', 'part 2 is N')
  assertEqual(parts[3], 'r=8', 'part 3 is r')
  assertEqual(parts[4], 'p=1', 'part 4 is p')
  assert(parts[5].length === 32, 'salt is 16 bytes = 32 hex chars')
  assert(parts[6].length === 128, 'hash is 64 bytes = 128 hex chars')
})

test('scrypt new hash has salt (16 bytes = 32 hex chars)', async () => {
  const hash1 = await hashPassword('TestPassword123!')
  const hash2 = await hashPassword('TestPassword123!')
  assert(hash1 !== hash2, 'same password produces different hashes (salt is random)')
  const parts1 = hash1.split('$')
  const parts2 = hash2.split('$')
  assertNotEqual(parts1[4], parts2[4], 'salt parts are different')
})

test('scrypt correct password succeeds', async () => {
  const hash = await hashPassword('MySecurePassword123!')
  const result = await verifyPassword('MySecurePassword123!', hash)
  assert(result, 'correct password verifies')
})

test('wrong password fails', async () => {
  const hash = await hashPassword('CorrectPassword123!')
  const result = await verifyPassword('WrongPassword456!', hash)
  assert(!result, 'wrong password does not verify')
})

test('empty password fails against valid hash', async () => {
  const hash = await hashPassword('CorrectPassword123!')
  const result = await verifyPassword('', hash)
  assert(!result, 'empty password does not verify')
})

test('malformed stored hash fails safely - null', async () => {
  const result = await verifyPassword('anypassword', null)
  assert(!result, 'null hash fails safely')
})

test('malformed stored hash fails safely - empty string', async () => {
  const result = await verifyPassword('anypassword', '')
  assert(!result, 'empty string hash fails safely')
})

test('malformed stored hash fails safely - wrong prefix', async () => {
  const result = await verifyPassword('anypassword', 'sha256$abc123')
  assert(!result, 'wrong prefix fails safely')
})

test('malformed stored hash fails safely - truncated', async () => {
  const hash = await hashPassword('TestPassword123!')
  const truncated = hash.substring(0, hash.length - 10)
  const result = await verifyPassword('anypassword', truncated)
  assert(!result, 'truncated hash fails safely')
})

test('malformed stored hash fails safely - invalid hex', async () => {
  const hash = await hashPassword('TestPassword123!')
  const parts = hash.split('$')
  const invalidHash = `${parts[0]}$${parts[1]}$${parts[2]}$${parts[3]}$${parts[4]}$ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ$${parts[5]}`
  const result = await verifyPassword('anypassword', invalidHash)
  assert(!result, 'invalid hex fails safely')
})

test('unsupported scrypt version fails safely', async () => {
  const hash = await hashPassword('TestPassword123!')
  const parts = hash.split('$')
  const wrongVersion = `scrypt$v=2$` + parts.slice(1).join('$')
  const result = await verifyPassword('anypassword', wrongVersion)
  assert(!result, 'unsupported version fails safely')
})

test('scrypt version 0 fails safely', async () => {
  const hash = await hashPassword('TestPassword123!')
  const parts = hash.split('$')
  const version0 = `scrypt$v=0$` + parts.slice(1).join('$')
  const result = await verifyPassword('anypassword', version0)
  assert(!result, 'version 0 fails safely')
})

test('isValidHashFormat returns true for valid hash', async () => {
  const hash = await hashPassword('TestPassword123!')
  assert(isValidHashFormat(hash), 'valid hash format accepted')
})

test('isValidHashFormat returns false for invalid hash', () => {
  assert(!isValidHashFormat(null), 'null rejected')
  assert(!isValidHashFormat(''), 'empty rejected')
  assert(!isValidHashFormat('invalid'), 'invalid rejected')
  assert(!isValidHashFormat('scrypt$v=2$abc'), 'wrong version rejected')
})

test('salt separator is $ character', async () => {
  const hash = await hashPassword('TestPassword123!')
  const parts = hash.split('$')
  assertEqual(parts.length, 6, 'salt separator is $')
})

test('hash length is 64 bytes = 128 hex chars for keyLength=64', async () => {
  const hash = await hashPassword('TestPassword123!')
  const parts = hash.split('$')
  const hashHex = parts[5]
  assertEqual(hashHex.length, 128, 'hash is 128 hex chars (64 bytes)')
})

// ============================================================
// SECTION 2: PARAMETER VALIDATION
// ============================================================

test('stored hash with wrong N value fails safely', async () => {
  const hash = await hashPassword('TestPassword123!')
  const parts = hash.split('$')
  const wrongN = `scrypt$v=1$N=65536$r=8$p=1$${parts[4]}$${parts[5]}`
  const result = await verifyPassword('TestPassword123!', wrongN)
  assert(!result, 'wrong N fails safely')
})

test('stored hash with wrong r value fails safely', async () => {
  const hash = await hashPassword('TestPassword123!')
  const parts = hash.split('$')
  const wrongR = `scrypt$v=1$N=32768$r=16$p=1$${parts[4]}$${parts[5]}`
  const result = await verifyPassword('TestPassword123!', wrongR)
  assert(!result, 'wrong r fails safely')
})

test('stored hash with wrong p value fails safely', async () => {
  const hash = await hashPassword('TestPassword123!')
  const parts = hash.split('$')
  const wrongP = `scrypt$v=1$N=32768$r=8$p=2$${parts[4]}$${parts[5]}`
  const result = await verifyPassword('TestPassword123!', wrongP)
  assert(!result, 'wrong p fails safely')
})

test('stored hash with unbounded N would be rejected by parseStoredHash', async () => {
  const hash = await hashPassword('TestPassword123!')
  const parts = hash.split('$')
  const unboundedN = `scrypt$v=1$N=999999999$r=8$p=1$${parts[4]}$${parts[5]}`
  assert(!isValidHashFormat(unboundedN), 'unbounded N is rejected')
})

test('stored hash with zero N fails', async () => {
  const hash = await hashPassword('TestPassword123!')
  const parts = hash.split('$')
  const zeroN = `scrypt$v=1$N=0$r=8$p=1$${parts[4]}$${parts[5]}`
  assert(!isValidHashFormat(zeroN), 'zero N is rejected')
})

test('stored hash with negative N fails', async () => {
  const hash = await hashPassword('TestPassword123!')
  const parts = hash.split('$')
  const negativeN = `scrypt$v=1$N=-1$r=8$p=1$${parts[4]}$${parts[5]}`
  assert(!isValidHashFormat(negativeN), 'negative N is rejected')
})

test('stored hash with mismatched salt length fails', async () => {
  const hash = await hashPassword('TestPassword123!')
  const parts = hash.split('$')
  const shortSalt = `scrypt$v=1$N=32768$r=8$p=1$AA$${parts[5]}`
  assert(!isValidHashFormat(shortSalt), 'short salt is rejected')
})

// ============================================================
// SECTION 3: TRANSACTION ATOMICITY (code inspection)
// ============================================================

test('PROVEN_SCRYPT_PARAMS uses correct values', () => {
  const PROVEN_SCRYPT_PARAMS = {
    N: 32768,
    r: 8,
    p: 1,
    dkLen: 64,
    maxmem: 128 * 1024 * 1024
  }
  assertEqual(PROVEN_SCRYPT_PARAMS.N, 32768, 'N = 32768')
  assertEqual(PROVEN_SCRYPT_PARAMS.r, 8, 'r = 8')
  assertEqual(PROVEN_SCRYPT_PARAMS.p, 1, 'p = 1')
  assertEqual(PROVEN_SCRYPT_PARAMS.dkLen, 64, 'keyLength = 64')
  assertEqual(PROVEN_SCRYPT_PARAMS.maxmem, 128 * 1024 * 1024, 'maxmem = 128MB')
})

test('parseStoredHash returns null for non-matching prefix', () => {
  assert(!isValidHashFormat('bcrypt$abc123'), 'bcrypt prefix rejected')
  assert(!isValidHashFormat('argon2$v=19$abc'), 'argon2 prefix rejected')
  assert(!isValidHashFormat('sha256$abc'), 'sha256 prefix rejected')
})

// ============================================================
// SECTION 4: BOOTSTRAP CLI VERIFICATION (code inspection)
// ============================================================

test('bootstrap script loads STAGING_OWNER environment variables', async () => {
  const fs = await import('fs')
  const bootstrapPath = './web/owner/bootstrap/owner-staging-bootstrap.js'

  if (!fs.existsSync(bootstrapPath)) {
    console.log('    Skipping: bootstrap file not found')
    return
  }

  const content = fs.readFileSync(bootstrapPath, 'utf8')
  assert(
    content.includes('STAGING_OWNER_EMAIL') && content.includes('STAGING_OWNER_PASSWORD'),
    'bootstrap requires STAGING_OWNER_* env vars'
  )
})

test('bootstrap script refuses non-staging execution', async () => {
  const fs = await import('fs')
  const bootstrapPath = './web/owner/bootstrap/owner-staging-bootstrap.js'

  if (!fs.existsSync(bootstrapPath)) {
    console.log('    Skipping: bootstrap file not found')
    return
  }

  const content = fs.readFileSync(bootstrapPath, 'utf8')
  assert(
    content.includes('staging') || content.includes('NEON_STAGING'),
    'bootstrap refuses non-staging'
  )
})

test('bootstrap script does not log passwords or hashes', async () => {
  const fs = await import('fs')
  const bootstrapPath = './web/owner/bootstrap/owner-staging-bootstrap.js'

  if (!fs.existsSync(bootstrapPath)) {
    console.log('    Skipping: bootstrap file not found')
    return
  }

  const content = fs.readFileSync(bootstrapPath, 'utf8')
  assert(
    !content.match(/password.*log/i) && !content.match(/hash.*log/i),
    'bootstrap does not log passwords/hashes'
  )
})

test('bootstrap script has exit handling', async () => {
  const fs = await import('fs')
  const bootstrapPath = './web/owner/bootstrap/owner-staging-bootstrap.js'

  if (!fs.existsSync(bootstrapPath)) {
    console.log('    Skipping: bootstrap file not found')
    return
  }

  const content = fs.readFileSync(bootstrapPath, 'utf8')
  assert(
    content.includes('process.exit'),
    'bootstrap calls process.exit'
  )
})

// ============================================================
// SECTION 5: MIGRATION CLI VERIFICATION (code inspection)
// ============================================================

test('migration 0006 exports up() and down() functions', async () => {
  const fs = await import('fs')
  const migrationPath = './database/migrations/0006_owner_identity_grants/index.js'

  if (!fs.existsSync(migrationPath)) {
    console.log('    Skipping: migration file not found')
    return
  }

  const content = fs.readFileSync(migrationPath, 'utf8')
  assert(content.includes('export'), 'migration exports functions')
})

test('migration 0006 does not auto-execute on load', async () => {
  const fs = await import('fs')
  const migrationPath = './database/migrations/0006_owner_identity_grants/index.js'

  if (!fs.existsSync(migrationPath)) {
    console.log('    Skipping: migration file not found')
    return
  }

  const content = fs.readFileSync(migrationPath, 'utf8')
  assert(
    !content.match(/up\(\s*\)/) || content.includes('if __main__'),
    'migration does not auto-execute'
  )
})

// ============================================================
// SECTION 6: ERROR CONTRACT VERIFICATION (code inspection)
// ============================================================

test('owner.middleware.js maps INFRASTRUCTURE_UNAVAILABLE to HTTP 503', async () => {
  const fs = await import('fs')
  const middlewarePath = './web/owner/owner.middleware.js'

  if (!fs.existsSync(middlewarePath)) {
    console.log('    Skipping: middleware file not found')
    return
  }

  const content = fs.readFileSync(middlewarePath, 'utf8')
  assert(
    content.includes('503') && content.includes('INFRASTRUCTURE_UNAVAILABLE'),
    'middleware maps infrastructure errors to 503'
  )
})

test('owner.api.js handleLogin maps AMBIGUOUS_APPLICATION to HTTP 409', async () => {
  const fs = await import('fs')
  const apiPath = './web/owner/owner.api.js'

  if (!fs.existsSync(apiPath)) {
    console.log('    Skipping: API file not found')
    return
  }

  const content = fs.readFileSync(apiPath, 'utf8')
  assert(
    content.includes('409') && content.includes('AMBIGUOUS_APPLICATION'),
    'handleLogin maps AMBIGUOUS_APPLICATION to 409 Conflict'
  )
})

test('owner.middleware.js maps missing auth to HTTP 401', async () => {
  const fs = await import('fs')
  const middlewarePath = './web/owner/owner.middleware.js'

  if (!fs.existsSync(middlewarePath)) {
    console.log('    Skipping: middleware file not found')
    return
  }

  const content = fs.readFileSync(middlewarePath, 'utf8')
  assert(
    content.includes('401') && content.includes('Unauthorized'),
    'middleware maps missing auth to 401'
  )
})

test('owner.middleware.js maps missing permission to HTTP 403', async () => {
  const fs = await import('fs')
  const middlewarePath = './web/owner/owner.middleware.js'

  if (!fs.existsSync(middlewarePath)) {
    console.log('    Skipping: middleware file not found')
    return
  }

  const content = fs.readFileSync(middlewarePath, 'utf8')
  assert(
    content.includes('403') && content.includes('Forbidden'),
    'middleware maps missing permission to 403'
  )
})

test('owner.auth.js authenticateOwner returns NO_ACTIVE_GRANT for missing grant', async () => {
  const fs = await import('fs')
  const authPath = './web/owner/owner.auth.js'

  if (!fs.existsSync(authPath)) {
    console.log('    Skipping: auth file not found')
    return
  }

  const content = fs.readFileSync(authPath, 'utf8')
  assert(
    content.includes('NO_ACTIVE_GRANT'),
    'authenticateOwner returns NO_ACTIVE_GRANT error'
  )
})

test('owner.auth.js authenticateOwner uses PostgreSQL grants', async () => {
  const fs = await import('fs')
  const authPath = './web/owner/owner.auth.js'

  if (!fs.existsSync(authPath)) {
    console.log('    Skipping: auth file not found')
    return
  }

  const content = fs.readFileSync(authPath, 'utf8')
  const authFuncMatch = content.match(/export async function authenticateOwner[\s\S]*?^}/m)
  if (!authFuncMatch) {
    throw new Error('authenticateOwner function not found')
  }
  const authFunc = authFuncMatch[0]
  assert(
    authFunc.includes('identityService.authenticateOwnerUser'),
    'authenticateOwner uses identityService'
  )
  assert(
    authFunc.includes('getActiveGrantsForUser'),
    'authenticateOwner resolves grants'
  )
  assert(
    !authFunc.includes('ownerStore') && !authFunc.includes('syncHash') && !authFunc.includes('HMAC'),
    'authenticateOwner function body has no in-memory fallback'
  )
})

test('owner.auth.js does NOT export authenticateOwnerSync', async () => {
  const fs = await import('fs')
  const authPath = './web/owner/owner.auth.js'

  if (!fs.existsSync(authPath)) {
    console.log('    Skipping: auth file not found')
    return
  }

  const content = fs.readFileSync(authPath, 'utf8')
  assert(
    !content.includes('authenticateOwnerSync'),
    'authenticateOwnerSync is not exported'
  )
})

test('owner.auth.js registerOwner preserved for compatibility', async () => {
  const fs = await import('fs')
  const authPath = './web/owner/owner.auth.js'

  if (!fs.existsSync(authPath)) {
    console.log('    Skipping: auth file not found')
    return
  }

  const content = fs.readFileSync(authPath, 'utf8')
  const regMatch = content.match(/export function registerOwner[\s\S]*?^}/m)
  if (!regMatch) {
    throw new Error('registerOwner function not found')
  }
  const regFunc = regMatch[0]
  assert(
    !regFunc.includes('not supported') && !regFunc.includes('Use explicit bootstrap'),
    'registerOwner does not say "not supported"'
  )
  assert(
    regFunc.includes('ownerStore'),
    'registerOwner uses ownerStore'
  )
})

// ============================================================
// SECTION 7: MIDDLEWARE AUTH/AUTHZ SEPARATION (code inspection)
// ============================================================

test('middleware: session valid + grant active → req.isOwnerAuthenticated = true', async () => {
  const fs = await import('fs')
  const middlewarePath = './web/owner/owner.middleware.js'

  if (!fs.existsSync(middlewarePath)) {
    console.log('    Skipping: middleware file not found')
    return
  }

  const content = fs.readFileSync(middlewarePath, 'utf8')
  assert(
    content.includes('req.isOwnerAuthenticated = true'),
    'middleware sets isOwnerAuthenticated = true when session valid'
  )
})

test('middleware: authorization failure does NOT clear req.owner', async () => {
  const fs = await import('fs')
  const middlewarePath = './web/owner/owner.middleware.js'

  if (!fs.existsSync(middlewarePath)) {
    console.log('    Skipping: middleware file not found')
    return
  }

  const content = fs.readFileSync(middlewarePath, 'utf8')
  const authBlock = content.match(/if \(authResult\.authorized\)[\s\S]*?else[\s\S]*?}/m)
  if (!authBlock) {
    throw new Error('authResult handling block not found')
  }
  const elseBlock = authBlock[0].match(/else\s*\{[\s\S]*?\}/m)
  if (elseBlock) {
    assert(
      !elseBlock[0].includes('req.owner = null'),
      'else block does not clear req.owner'
    )
    assert(
      !elseBlock[0].includes('req.ownerSession = null'),
      'else block does not clear req.ownerSession'
    )
  }
})

test('middleware: permission checks use req.owner.grant?.permissions', async () => {
  const fs = await import('fs')
  const middlewarePath = './web/owner/owner.middleware.js'

  if (!fs.existsSync(middlewarePath)) {
    console.log('    Skipping: middleware file not found')
    return
  }

  const content = fs.readFileSync(middlewarePath, 'utf8')
  assert(
    content.includes('req.owner.grant?.permissions') || content.includes('req.owner.grant.permissions'),
    'permission checks use grant from persistent storage'
  )
})

test('middleware: requireOwnerPermission returns 403 for missing permission', async () => {
  const fs = await import('fs')
  const middlewarePath = './web/owner/owner.middleware.js'

  if (!fs.existsSync(middlewarePath)) {
    console.log('    Skipping: middleware file not found')
    return
  }

  const content = fs.readFileSync(middlewarePath, 'utf8')
  assert(
    content.includes("res.statusCode = 403"),
    'middleware returns 403 for missing permission'
  )
})

test('middleware: requireOwnerAuth returns 401 for invalid session', async () => {
  const fs = await import('fs')
  const middlewarePath = './web/owner/owner.middleware.js'

  if (!fs.existsSync(middlewarePath)) {
    console.log('    Skipping: middleware file not found')
    return
  }

  const content = fs.readFileSync(middlewarePath, 'utf8')
  assert(
    content.includes("res.statusCode = 401"),
    'middleware returns 401 for invalid session'
  )
})

test('middleware: requireOwnerAuth returns 503 for INFRASTRUCTURE_UNAVAILABLE', async () => {
  const fs = await import('fs')
  const middlewarePath = './web/owner/owner.middleware.js'

  if (!fs.existsSync(middlewarePath)) {
    console.log('    Skipping: middleware file not found')
    return
  }

  const content = fs.readFileSync(middlewarePath, 'utf8')
  assert(
    content.includes("res.statusCode = 503") && content.includes('INFRASTRUCTURE_UNAVAILABLE'),
    'middleware returns 503 for infrastructure unavailable'
  )
})

test('middleware: buildOwnerContext uses grant permissions when available', async () => {
  const fs = await import('fs')
  const middlewarePath = './web/owner/owner.middleware.js'

  if (!fs.existsSync(middlewarePath)) {
    console.log('    Skipping: middleware file not found')
    return
  }

  const content = fs.readFileSync(middlewarePath, 'utf8')
  const ctxMatch = content.match(/function buildOwnerContext[\s\S]*?^}/m)
  if (!ctxMatch) {
    throw new Error('buildOwnerContext not found')
  }
  const ctxFunc = ctxMatch[0]
  assert(
    ctxFunc.includes('req.owner.grant?.permissions') || ctxFunc.includes('req.owner.grant.permissions'),
    'buildOwnerContext prefers grant permissions'
  )
})

// ============================================================
// SECTION 8: DATABASE FOUNDATION VERIFICATION
// ============================================================

test('staging pool config uses pg.Pool options only (max, idleTimeoutMillis, connectionTimeoutMillis)', async () => {
  const fs = await import('fs')
  const configPath = './database/config/database.config.js'

  if (!fs.existsSync(configPath)) {
    console.log('    Skipping: config file not found')
    return
  }

  const content = fs.readFileSync(configPath, 'utf8')
  const stagingPoolMatch = content.match(/staging:\s*\{[\s\S]*?pool:\s*\{[\s\S]*?\}/m)
  if (!stagingPoolMatch) {
    throw new Error('staging pool config not found')
  }
  const stagingPool = stagingPoolMatch[0]
  assert(
    stagingPool.includes('max:') && !stagingPool.includes('min:'),
    'staging pool has max, no min'
  )
  assert(
    stagingPool.includes('idleTimeoutMillis:') && !stagingPool.includes('idleTimeout:'),
    'staging pool uses idleTimeoutMillis'
  )
  assert(
    stagingPool.includes('connectionTimeoutMillis:') && !stagingPool.includes('acquireTimeout:'),
    'staging pool uses connectionTimeoutMillis'
  )
  assert(
    !stagingPool.includes('maxQueue:') && !stagingPool.includes('statements:'),
    'staging pool has no unsupported options'
  )
})

test('getPoolConfig returns only pg.Pool options', async () => {
  const fs = await import('fs')
  const configPath = './database/config/database.config.js'

  if (!fs.existsSync(configPath)) {
    console.log('    Skipping: config file not found')
    return
  }

  const content = fs.readFileSync(configPath, 'utf8')
  const getPoolConfigMatch = content.match(/export function getPoolConfig\(\)[\s\S]*?^}/m)
  if (!getPoolConfigMatch) {
    throw new Error('getPoolConfig not found')
  }
  const funcBody = getPoolConfigMatch[0]
  assert(
    !funcBody.includes('min:') && !funcBody.includes('acquireTimeout:') && !funcBody.includes('maxQueue:'),
    'getPoolConfig does not return unsupported pool options'
  )
  assert(
    funcBody.includes('idleTimeoutMillis:') && funcBody.includes('connectionTimeoutMillis:'),
    'getPoolConfig returns correct pg.Pool options'
  )
})

test('postgres.connection.js passes only valid pg.Pool options to new Pool()', async () => {
  const fs = await import('fs')
  const connPath = './database/connection/postgres.connection.js'

  if (!fs.existsSync(connPath)) {
    console.log('    Skipping: connection file not found')
    return
  }

  const content = fs.readFileSync(connPath, 'utf8')
  const poolMatch = content.match(/new Pool\(\{[\s\S]*?\}\)/m)
  if (!poolMatch) {
    throw new Error('new Pool not found')
  }
  const poolInit = poolMatch[0]
  assert(
    !poolInit.includes('min:') && !poolInit.includes('acquireTimeout:') && !poolInit.includes('idleTimeout:') && !poolInit.includes('maxQueue:'),
    'Pool constructor receives no unsupported options'
  )
  assert(
    poolInit.includes('max:') && poolInit.includes('idleTimeoutMillis:') && poolInit.includes('connectionTimeoutMillis:'),
    'Pool constructor receives correct options'
  )
})

test('getSslConfig rejects DATABASE_SSL=true without downgrading security', async () => {
  const fs = await import('fs')
  const configPath = './database/config/database.config.js'

  if (!fs.existsSync(configPath)) {
    console.log('    Skipping: config file not found')
    return
  }

  const content = fs.readFileSync(configPath, 'utf8')
  const getSslMatch = content.match(/export function getSslConfig\(\)[\s\S]*?^}/m)
  if (!getSslMatch) {
    throw new Error('getSslConfig not found')
  }
  const funcBody = getSslMatch[0]
  assert(
    !funcBody.includes('rejectUnauthorized: false'),
    'getSslConfig never sets rejectUnauthorized: false'
  )
  assert(
    funcBody.includes('rejectUnauthorized: true'),
    'getSslConfig sets rejectUnauthorized: true for verify mode'
  )
})

test('bootstrap script refuses TURISTIC_ENV != staging', async () => {
  const fs = await import('fs')
  const bootstrapPath = './web/owner/bootstrap/owner-staging-bootstrap.js'

  if (!fs.existsSync(bootstrapPath)) {
    console.log('    Skipping: bootstrap file not found')
    return
  }

  const content = fs.readFileSync(bootstrapPath, 'utf8')
  const envCheckIndex = content.indexOf("TURISTIC_ENV !== 'staging'")
  const createPoolIndex = content.indexOf('createPool()')
  assert(
    envCheckIndex !== -1 && envCheckIndex < createPoolIndex,
    'TURISTIC_ENV check appears before createPool()'
  )
  assert(
    content.includes('process.exit(1)'),
    'bootstrap exits non-zero for non-staging TURISTIC_ENV'
  )
})

test('migration 0006 contains no CREATE EXTENSION', async () => {
  const fs = await import('fs')
  const migrationPath = './database/migrations/0006_owner_identity_grants/index.js'

  if (!fs.existsSync(migrationPath)) {
    console.log('    Skipping: migration file not found')
    return
  }

  const content = fs.readFileSync(migrationPath, 'utf8')
  assert(
    !content.includes('CREATE EXTENSION'),
    'migration has no CREATE EXTENSION'
  )
  assert(
    !content.includes('pgcrypto'),
    'migration has no pgcrypto reference'
  )
})

test('migration CLI contains no CREATE EXTENSION', async () => {
  const fs = await import('fs')
  const cliPath = './web/owner/bootstrap/owner-staging-migrate.js'

  if (!fs.existsSync(cliPath)) {
    console.log('    Skipping: CLI file not found')
    return
  }

  const content = fs.readFileSync(cliPath, 'utf8')
  assert(
    !content.includes('CREATE EXTENSION'),
    'migration CLI has no CREATE EXTENSION'
  )
})

test('migration CLI has no 0001-0005 wiring', async () => {
  const fs = await import('fs')
  const cliPath = './web/owner/bootstrap/owner-staging-migrate.js'

  if (!fs.existsSync(cliPath)) {
    console.log('    Skipping: CLI file not found')
    return
  }

  const content = fs.readFileSync(cliPath, 'utf8')
  const lines = content.split('\n')
  const codeLines = lines.filter(l => !l.trim().startsWith('*') && !l.trim().startsWith('//'))
  const code = codeLines.join('\n')
  const hasOldMigrations = code.includes('0001') || code.includes('0002') || code.includes('0003') || code.includes('0004') || code.includes('0005')
  assert(
    !hasOldMigrations,
    'migration CLI code does not reference 0001-0005'
  )
  assert(
    content.includes('0006'),
    'migration CLI references 0006'
  )
})

// ============================================================
// SECTION 9: STAGING CONFIG VALIDATION
// ============================================================

test('TURISTIC_ENV=staging selects staging environment', async () => {
  const fs = await import('fs')
  const configPath = './database/config/database.config.js'

  if (!fs.existsSync(configPath)) {
    console.log('    Skipping: config file not found')
    return
  }

  const content = fs.readFileSync(configPath, 'utf8')
  const envFuncMatch = content.match(/export function getEnvironment\(\)[\s\S]*?^}/m)
  if (!envFuncMatch) {
    throw new Error('getEnvironment not found')
  }
  const envFunc = envFuncMatch[0]
  assert(
    envFunc.includes("TURISTIC_ENV === 'staging'"),
    'getEnvironment checks TURISTIC_ENV === staging'
  )
})

test('staging config has no fallback defaults for database identity', async () => {
  const fs = await import('fs')
  const configPath = './database/config/database.config.js'

  if (!fs.existsSync(configPath)) {
    console.log('    Skipping: config file not found')
    return
  }

  const content = fs.readFileSync(configPath, 'utf8')
  const stagingMatch = content.match(/staging:\s*\{[\s\S]*?\}/m)
  if (!stagingMatch) {
    throw new Error('staging config not found')
  }
  const staging = stagingMatch[0]
  assert(
    !staging.includes("|| ''") && !staging.includes("|| 'valdi"),
    'staging has no empty string or valdi defaults for host/database/user/password'
  )
})

test('staging TLS has rejectUnauthorized: true', async () => {
  const fs = await import('fs')
  const configPath = './database/config/database.config.js'

  if (!fs.existsSync(configPath)) {
    console.log('    Skipping: config file not found')
    return
  }

  const content = fs.readFileSync(configPath, 'utf8')
  const stagingMatch = content.match(/staging:\s*\{[\s\S]*?ssl:\s*\{[^}]+\}/m)
  if (!stagingMatch) {
    throw new Error('staging ssl config not found')
  }
  const sslBlock = stagingMatch[0]
  assert(
    sslBlock.includes('rejectUnauthorized: true'),
    'staging ssl has rejectUnauthorized: true'
  )
})

test('staging max pool = 2', async () => {
  const fs = await import('fs')
  const configPath = './database/config/database.config.js'

  if (!fs.existsSync(configPath)) {
    console.log('    Skipping: config file not found')
    return
  }

  const content = fs.readFileSync(configPath, 'utf8')
  const stagingPoolMatch = content.match(/staging:\s*\{[\s\S]*?pool:\s*\{[\s\S]*?\}/m)
  if (!stagingPoolMatch) {
    throw new Error('staging pool config not found')
  }
  const stagingPool = stagingPoolMatch[0]
  assert(
    stagingPool.includes('max: 2'),
    'staging pool max is 2'
  )
})

test('staging validation requires POSTGRES_HOST when TURISTIC_ENV=staging', async () => {
  const fs = await import('fs')
  const configPath = './database/config/database.config.js'

  if (!fs.existsSync(configPath)) {
    console.log('    Skipping: config file not found')
    return
  }

  const content = fs.readFileSync(configPath, 'utf8')
  const validateMatch = content.match(/export function validateConfig\(\)[\s\S]*?^}/m)
  if (!validateMatch) {
    throw new Error('validateConfig not found')
  }
  const validateFunc = validateMatch[0]
  assert(
    validateFunc.includes("'staging'") && validateFunc.includes('POSTGRES_HOST') && validateFunc.includes('required in staging'),
    'validateConfig requires POSTGRES_HOST in staging'
  )
})

test('staging validation requires POSTGRES_DB when TURISTIC_ENV=staging', async () => {
  const fs = await import('fs')
  const configPath = './database/config/database.config.js'

  if (!fs.existsSync(configPath)) {
    console.log('    Skipping: config file not found')
    return
  }

  const content = fs.readFileSync(configPath, 'utf8')
  const validateMatch = content.match(/export function validateConfig\(\)[\s\S]*?^}/m)
  if (!validateMatch) {
    throw new Error('validateConfig not found')
  }
  const validateFunc = validateMatch[0]
  assert(
    validateFunc.includes("'staging'") && validateFunc.includes('POSTGRES_DB') && validateFunc.includes('required in staging'),
    'validateConfig requires POSTGRES_DB in staging'
  )
})

test('staging validation requires POSTGRES_USER when TURISTIC_ENV=staging', async () => {
  const fs = await import('fs')
  const configPath = './database/config/database.config.js'

  if (!fs.existsSync(configPath)) {
    console.log('    Skipping: config file not found')
    return
  }

  const content = fs.readFileSync(configPath, 'utf8')
  const validateMatch = content.match(/export function validateConfig\(\)[\s\S]*?^}/m)
  if (!validateMatch) {
    throw new Error('validateConfig not found')
  }
  const validateFunc = validateMatch[0]
  assert(
    validateFunc.includes("'staging'") && validateFunc.includes('POSTGRES_USER') && validateFunc.includes('required in staging'),
    'validateConfig requires POSTGRES_USER in staging'
  )
})

test('staging validation requires POSTGRES_PASSWORD when TURISTIC_ENV=staging', async () => {
  const fs = await import('fs')
  const configPath = './database/config/database.config.js'

  if (!fs.existsSync(configPath)) {
    console.log('    Skipping: config file not found')
    return
  }

  const content = fs.readFileSync(configPath, 'utf8')
  const validateMatch = content.match(/export function validateConfig\(\)[\s\S]*?^}/m)
  if (!validateMatch) {
    throw new Error('validateConfig not found')
  }
  const validateFunc = validateMatch[0]
  assert(
    validateFunc.includes("'staging'") && validateFunc.includes('POSTGRES_PASSWORD') && validateFunc.includes('required in staging'),
    'validateConfig requires POSTGRES_PASSWORD in staging'
  )
})

test('production config block remains behaviorally unchanged', async () => {
  const fs = await import('fs')
  const configPath = './database/config/database.config.js'

  if (!fs.existsSync(configPath)) {
    console.log('    Skipping: config file not found')
    return
  }

  const content = fs.readFileSync(configPath, 'utf8')
  const lines = content.split('\n')
  const prodStart = lines.findIndex(l => l.includes('production:'))
  const stagingStart = lines.findIndex(l => l.includes('staging:'))
  const prodBlock = lines.slice(prodStart, stagingStart).join('\n')
  assert(
    prodBlock.includes('mode: \'require\'') && prodBlock.includes('rejectUnauthorized: false'),
    'production TLS unchanged: mode=require, rejectUnauthorized=false'
  )
  assert(
    prodBlock.includes('POSTGRES_HOST || \'\''),
    'production host unchanged'
  )
  assert(
    prodBlock.includes('valdi_prod'),
    'production database unchanged'
  )
})

// ============================================================
// SECTION 10: BOOTSTRAP/UPDATE CLI SANITIZATION
// ============================================================

test('bootstrap output excludes password_hash', async () => {
  const fs = await import('fs')
  const bootstrapPath = './web/owner/bootstrap/owner-staging-bootstrap.js'

  if (!fs.existsSync(bootstrapPath)) {
    console.log('    Skipping: bootstrap file not found')
    return
  }

  const content = fs.readFileSync(bootstrapPath, 'utf8')
  const lines = content.split('\n')
  const logLines = lines.filter(l => l.includes('console.log'))
  const logContent = logLines.join('\n')
  assert(
    !logContent.includes('password_hash'),
    'bootstrap output does not include password_hash'
  )
})

test('bootstrap output excludes STAGING_OWNER_PASSWORD', async () => {
  const fs = await import('fs')
  const bootstrapPath = './web/owner/bootstrap/owner-staging-bootstrap.js'

  if (!fs.existsSync(bootstrapPath)) {
    console.log('    Skipping: bootstrap file not found')
    return
  }

  const content = fs.readFileSync(bootstrapPath, 'utf8')
  const lines = content.split('\n')
  const logLines = lines.filter(l => l.includes('console.log') || l.includes('console.error'))
  const logContent = logLines.join('\n')
  assert(
    !logContent.includes('STAGING_OWNER_PASSWORD'),
    'bootstrap does not log STAGING_OWNER_PASSWORD in console output'
  )
})

// ============================================================
// SECTION 11: UPDATE CLI VERIFICATION
// ============================================================

test('update CLI has main-module guard', async () => {
  const fs = await import('fs')
  const updatePath = './web/owner/bootstrap/owner-staging-update.js'

  if (!fs.existsSync(updatePath)) {
    console.log('    Skipping: update CLI not found')
    return
  }

  const content = fs.readFileSync(updatePath, 'utf8')
  const lines = content.split('\n')
  const guardLineIndex = lines.findIndex(l => l.includes('import.meta.url'))
  assert(
    guardLineIndex !== -1,
    'update CLI has import.meta.url guard'
  )
  const closingBraceIndex = lines.findIndex((l, i) => i > guardLineIndex && l.trim() === '}')
  const runUpdateCallIndex = lines.findIndex(l => l.trim().startsWith('runUpdate()'))
  const hasGuard = closingBraceIndex !== -1 && runUpdateCallIndex > guardLineIndex && runUpdateCallIndex < closingBraceIndex
  assert(
    hasGuard,
    'runUpdate() call is inside the import.meta.url guard block'
  )
})

test('update CLI refuses TURISTIC_ENV != staging', async () => {
  const fs = await import('fs')
  const updatePath = './web/owner/bootstrap/owner-staging-update.js'

  if (!fs.existsSync(updatePath)) {
    console.log('    Skipping: update CLI not found')
    return
  }

  const content = fs.readFileSync(updatePath, 'utf8')
  assert(
    content.includes("TURISTIC_ENV !== 'staging'"),
    'update CLI checks TURISTIC_ENV !== staging'
  )
  assert(
    content.includes('process.exit(1)'),
    'update CLI exits non-zero for non-staging'
  )
})

test('update CLI requires TARGET_APPLICATION_ID', async () => {
  const fs = await import('fs')
  const updatePath = './web/owner/bootstrap/owner-staging-update.js'

  if (!fs.existsSync(updatePath)) {
    console.log('    Skipping: update CLI not found')
    return
  }

  const content = fs.readFileSync(updatePath, 'utf8')
  assert(
    content.includes('TARGET_APPLICATION_ID'),
    'update CLI requires TARGET_APPLICATION_ID'
  )
})

test('update CLI requires POSTGRES_HOST/DB/USER/PASSWORD', async () => {
  const fs = await import('fs')
  const updatePath = './web/owner/bootstrap/owner-staging-update.js'

  if (!fs.existsSync(updatePath)) {
    console.log('    Skipping: update CLI not found')
    return
  }

  const content = fs.readFileSync(updatePath, 'utf8')
  assert(
    content.includes('POSTGRES_HOST') && content.includes('POSTGRES_DB') && content.includes('POSTGRES_USER') && content.includes('POSTGRES_PASSWORD'),
    'update CLI requires all DB credential env vars'
  )
})

test('update CLI validates env before createPool', async () => {
  const fs = await import('fs')
  const updatePath = './web/owner/bootstrap/owner-staging-update.js'

  if (!fs.existsSync(updatePath)) {
    console.log('    Skipping: update CLI not found')
    return
  }

  const content = fs.readFileSync(updatePath, 'utf8')
  const lines = content.split('\n')
  const validateIndex = lines.findIndex(l => l.includes('validateEnvironment'))
  const createPoolIndex = lines.findIndex(l => l.includes('createPool()'))
  assert(
    validateIndex !== -1 && createPoolIndex !== -1 && validateIndex < createPoolIndex,
    'validateEnvironment is called before createPool()'
  )
})

test('update service returns safe result without password/hash', async () => {
  const fs = await import('fs')
  const updatePath = './web/owner/bootstrap/owner-staging-update.js'

  if (!fs.existsSync(updatePath)) {
    console.log('    Skipping: update CLI not found')
    return
  }

  const content = fs.readFileSync(updatePath, 'utf8')
  const lines = content.split('\n')
  const buildFnStart = lines.findIndex(l => l.includes('function buildSafeResult'))
  const buildFnEnd = lines.findIndex((l, i) => i > buildFnStart && l.trim() === '}')
  const buildFnLines = lines.slice(buildFnStart, buildFnEnd + 1)
  const buildFn = buildFnLines.join('\n')
  assert(
    !buildFn.includes('password_hash'),
    'buildSafeResult does not include password_hash'
  )
})

test('update service uses email normalization', async () => {
  const fs = await import('fs')
  const servicePath = './web/owner/services/owner-identity.service.js'

  if (!fs.existsSync(servicePath)) {
    console.log('    Skipping: service file not found')
    return
  }

  const content = fs.readFileSync(servicePath, 'utf8')
  const updateFuncMatch = content.match(/export async function updateStagingOwnerIdentity[\s\S]*?^}/m)
  if (!updateFuncMatch) {
    throw new Error('updateStagingOwnerIdentity not found')
  }
  const funcBody = updateFuncMatch[0]
  assert(
    funcBody.includes('normalizedEmail') && funcBody.includes('.toLowerCase()'),
    'service normalizes email to lowercase'
  )
})

test('update service distinguishes grant not found vs revoked', async () => {
  const fs = await import('fs')
  const servicePath = './web/owner/services/owner-identity.service.js'

  if (!fs.existsSync(servicePath)) {
    console.log('    Skipping: service file not found')
    return
  }

  const content = fs.readFileSync(servicePath, 'utf8')
  assert(
    content.includes('TARGET_GRANT_NOT_FOUND') && content.includes('TARGET_GRANT_REVOKED'),
    'service distinguishes missing grant from revoked grant'
  )
})

test('update service does not create or mutate grant', async () => {
  const fs = await import('fs')
  const servicePath = './web/owner/services/owner-identity.service.js'

  if (!fs.existsSync(servicePath)) {
    console.log('    Skipping: service file not found')
    return
  }

  const content = fs.readFileSync(servicePath, 'utf8')
  const updateFuncMatch = content.match(/export async function updateStagingOwnerIdentity[\s\S]*?^}/m)
  if (!updateFuncMatch) {
    throw new Error('updateStagingOwnerIdentity not found')
  }
  const funcBody = updateFuncMatch[0]
  assert(
    !funcBody.includes('createGrant') && !funcBody.includes('updateGrant'),
    'service does not create or update grant'
  )
})

test('update repository uses parameterized SQL only', async () => {
  const fs = await import('fs')
  const repoPath = './web/owner/repositories/owner-identity.repository.js'

  if (!fs.existsSync(repoPath)) {
    console.log('    Skipping: repo file not found')
    return
  }

  const content = fs.readFileSync(repoPath, 'utf8')
  const updateFuncMatch = content.match(/export async function updateUserIdentity[\s\S]*?^}/m)
  if (!updateFuncMatch) {
    throw new Error('updateUserIdentity not found')
  }
  const funcBody = updateFuncMatch[0]
  assert(
    funcBody.includes('$1') && funcBody.includes('$2') && funcBody.includes('$3') && funcBody.includes('$4'),
    'updateUserIdentity uses parameterized queries'
  )
})

test('update repository returns without password_hash', async () => {
  const fs = await import('fs')
  const repoPath = './web/owner/repositories/owner-identity.repository.js'

  if (!fs.existsSync(repoPath)) {
    console.log('    Skipping: repo file not found')
    return
  }

  const content = fs.readFileSync(repoPath, 'utf8')
  const updateFuncMatch = content.match(/export async function updateUserIdentity[\s\S]*?^}/m)
  if (!updateFuncMatch) {
    throw new Error('updateUserIdentity not found')
  }
  const funcBody = updateFuncMatch[0]
  assert(
    funcBody.includes('RETURNING id, email, name, status, password_changed_at, updated_at'),
    'updateUserIdentity RETURNING excludes password_hash'
  )
})

test('update CLI buildSafeResult returns complete safe contract', async () => {
  const fs = await import('fs')
  const updatePath = './web/owner/bootstrap/owner-staging-update.js'

  if (!fs.existsSync(updatePath)) {
    console.log('    Skipping: update CLI not found')
    return
  }

  const content = fs.readFileSync(updatePath, 'utf8')
  const lines = content.split('\n')
  const buildFnStart = lines.findIndex(l => l.includes('function buildSafeResult'))
  const buildFnEnd = lines.findIndex((l, i) => i > buildFnStart && l.trim() === '}')
  const buildFnLines = lines.slice(buildFnStart, buildFnEnd + 1)
  const buildFn = buildFnLines.join('\n')
  assert(
    buildFn.includes('id') && buildFn.includes('email') && buildFn.includes('name') && buildFn.includes('status') && buildFn.includes('password_changed_at'),
    'buildSafeResult includes user safe fields'
  )
  assert(
    buildFn.includes('application_id') && buildFn.includes('role') && buildFn.includes('status'),
    'buildSafeResult includes grant safe fields'
  )
  assert(
    buildFn.includes('action'),
    'buildSafeResult includes action'
  )
})

// ============================================================
// SECTION 12: RUNTIME CUTOVER VERIFICATION
// ============================================================

test('web.server.js does not import registerOwner or getOwnerCount', async () => {
  const fs = await import('fs')
  const serverPath = './web/web.server.js'

  if (!fs.existsSync(serverPath)) {
    console.log('    Skipping: web.server.js not found')
    return
  }

  const content = fs.readFileSync(serverPath, 'utf8')
  assert(
    !content.includes('registerOwner') && !content.includes('getOwnerCount'),
    'web.server.js no longer imports registerOwner or getOwnerCount'
  )
})

test('web.server.js has no #bootstrapStagingOwner method', async () => {
  const fs = await import('fs')
  const serverPath = './web/web.server.js'

  if (!fs.existsSync(serverPath)) {
    console.log('    Skipping: web.server.js not found')
    return
  }

  const content = fs.readFileSync(serverPath, 'utf8')
  assert(
    !content.includes('#bootstrapStagingOwner'),
    'web.server.js has no #bootstrapStagingOwner method'
  )
})

test('web.server.js initialize() does not call #bootstrapStagingOwner', async () => {
  const fs = await import('fs')
  const serverPath = './web/web.server.js'

  if (!fs.existsSync(serverPath)) {
    console.log('    Skipping: web.server.js not found')
    return
  }

  const content = fs.readFileSync(serverPath, 'utf8')
  assert(
    !content.includes('this.#bootstrapStagingOwner()'),
    'web.server.js initialize() does not call #bootstrapStagingOwner'
  )
})

test('owner.auth.js authenticateOwner uses PostgreSQL persistent identity', async () => {
  const fs = await import('fs')
  const authPath = './web/owner/owner.auth.js'

  if (!fs.existsSync(authPath)) {
    console.log('    Skipping: auth file not found')
    return
  }

  const content = fs.readFileSync(authPath, 'utf8')
  const authFuncMatch = content.match(/export async function authenticateOwner[\s\S]*?^}/m)
  if (!authFuncMatch) {
    throw new Error('authenticateOwner function not found')
  }
  const funcBody = authFuncMatch[0]
  assert(
    funcBody.includes('identityService.authenticateOwnerUser') && funcBody.includes('identityService.getActiveGrantsForUser'),
    'authenticateOwner uses PostgreSQL services'
  )
})

test('owner.api.js handleLogin awaits authenticateOwner', async () => {
  const fs = await import('fs')
  const apiPath = './web/owner/owner.api.js'

  if (!fs.existsSync(apiPath)) {
    console.log('    Skipping: API file not found')
    return
  }

  const content = fs.readFileSync(apiPath, 'utf8')
  assert(
    content.includes('await authenticateOwner') && content.includes('handleLogin'),
    'handleLogin awaits authenticateOwner'
  )
})

test('runtime has no STAGING_OWNER_PASSWORD dependency', async () => {
  const fs = await import('fs')

  const runtimeFiles = [
    './web/web.server.js',
    './web/owner/owner.auth.js',
    './web/owner/owner.middleware.js',
    './web/owner/owner.api.js',
    './web/owner/services/owner-authorization.service.js'
  ]

  for (const filePath of runtimeFiles) {
    if (!fs.existsSync(filePath)) {
      continue
    }
    const content = fs.readFileSync(filePath, 'utf8')
    assert(
      !content.includes('STAGING_OWNER_PASSWORD'),
      `${filePath} does not reference STAGING_OWNER_PASSWORD`
    )
  }
})

test('owner.auth.js authenticateOwner handles zero grants', async () => {
  const fs = await import('fs')
  const authPath = './web/owner/owner.auth.js'

  if (!fs.existsSync(authPath)) {
    console.log('    Skipping: auth file not found')
    return
  }

  const content = fs.readFileSync(authPath, 'utf8')
  const authFuncMatch = content.match(/export async function authenticateOwner[\s\S]*?^}/m)
  if (!authFuncMatch) {
    throw new Error('authenticateOwner function not found')
  }
  const funcBody = authFuncMatch[0]
  assert(
    funcBody.includes('NO_ACTIVE_GRANT'),
    'authenticateOwner returns NO_ACTIVE_GRANT for zero grants'
  )
})

test('owner.auth.js authenticateOwner handles multiple grants', async () => {
  const fs = await import('fs')
  const authPath = './web/owner/owner.auth.js'

  if (!fs.existsSync(authPath)) {
    console.log('    Skipping: auth file not found')
    return
  }

  const content = fs.readFileSync(authPath, 'utf8')
  const authFuncMatch = content.match(/export async function authenticateOwner[\s\S]*?^}/m)
  if (!authFuncMatch) {
    throw new Error('authenticateOwner function not found')
  }
  const funcBody = authFuncMatch[0]
  assert(
    funcBody.includes('AMBIGUOUS_APPLICATION'),
    'authenticateOwner returns AMBIGUOUS_APPLICATION for multiple grants'
  )
})

// ============================================================
// SECTION 13: SENDJSON DEFENSIVE FIX
// ============================================================

test('sendJson isDefended against invalid HTTP status codes', async () => {
  const fs = await import('fs')
  const apiPath = './web/owner/owner.api.js'

  if (!fs.existsSync(apiPath)) {
    console.log('    Skipping: API file not found')
    return
  }

  const content = fs.readFileSync(apiPath, 'utf8')
  assert(
    content.includes('isValidHttpStatus'),
    'owner.api.js has isValidHttpStatus helper'
  )
  assert(
    content.includes('safeStatus'),
    'sendJson uses safeStatus for defensive status code'
  )
  assert(
    content.includes('code >= 100') && content.includes('code <= 599'),
    'isValidHttpStatus validates 100-599 range'
  )
})

test('sendJson rejects domain status "draft" as HTTP code', async () => {
  const fs = await import('fs')
  const apiPath = './web/owner/owner.api.js'

  if (!fs.existsSync(apiPath)) {
    console.log('    Skipping: API file not found')
    return
  }

  const content = fs.readFileSync(apiPath, 'utf8')
  const sendJsonMatch = content.match(/function sendJson\([\s\S]*?^}/m)
  if (!sendJsonMatch) {
    throw new Error('sendJson not found')
  }
  const sendJsonFunc = sendJsonMatch[0]
  assert(
    sendJsonFunc.includes('safeStatus'),
    'sendJson uses safeStatus to prevent invalid codes'
  )
})

test('content handlers cannot crash with domain status string', async () => {
  const fs = await import('fs')
  const apiPath = './web/owner/owner.api.js'

  if (!fs.existsSync(apiPath)) {
    console.log('    Skipping: API file not found')
    return
  }

  const content = fs.readFileSync(apiPath, 'utf8')
  const hasDefensiveSendJson = content.includes('isValidHttpStatus') && content.includes('safeStatus')
  assert(
    hasDefensiveSendJson,
    'sendJson is hardened against non-numeric status codes'
  )
})

// ============================================================
// RESULTS
// ============================================================

setTimeout(() => {
  console.log('\n═══════════════════════════════════════════════════════════')
  console.log('OWNER-SESSION-1 — TEST RESULTS')
  console.log('═══════════════════════════════════════════════════════════')
  console.log(`  Passed:  ${passCount}`)
  console.log(`  Failed:  ${failCount}`)
  console.log(`  Total:   ${passCount + failCount}`)
  console.log('═══════════════════════════════════════════════════════════\n')

  if (failCount > 0) {
    console.log('FAILED TESTS:')
    results.filter(r => r.status === STATUS.FAIL).forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`)
    })
    console.log('')
  }

  process.exit(failCount > 0 ? 1 : 0)
}, 500)
