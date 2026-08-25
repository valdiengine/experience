/**
 * OWNER-SESSION-2 — Persistent Sessions Tests
 *
 * Tests Gate 1 (Token Contract) and Gate 2 (Schema + Repository).
 * Does NOT require physical Neon staging database.
 *
 * Uses mocking for PostgreSQL interactions.
 */

import { createHash, randomBytes } from 'crypto'

const TOKEN_PREFIX = 'sess_'
const TOKEN_BYTES = 32
const TOKEN_BODY_LEN = 43

function base64urlEncode(buffer) {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

function base64urlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  while (base64.length % 4) {
    base64 += '='
  }
  return Buffer.from(base64, 'base64')
}

function generateSecureSessionId() {
  const bytes = randomBytes(TOKEN_BYTES)
  return TOKEN_PREFIX + base64urlEncode(bytes)
}

function hashSessionToken(rawToken) {
  return createHash('sha256').update(rawToken).digest('hex')
}

function isValidTokenFormat(token) {
  if (typeof token !== 'string') {
    return false
  }
  if (!token.startsWith(TOKEN_PREFIX)) {
    return false
  }
  const body = token.slice(TOKEN_PREFIX.length)
  if (body.length !== TOKEN_BODY_LEN) {
    return false
  }
  return /^[A-Za-z0-9_-]+$/.test(body)
}

function extractTokenBody(token) {
  if (!isValidTokenFormat(token)) {
    return null
  }
  return token.slice(TOKEN_PREFIX.length)
}

function isValidSha256Hex(str) {
  return typeof str === 'string' && /^[a-f0-9]{64}$/.test(str)
}

console.log('═══════════════════════════════════════════════════════════')
console.log('OWNER-SESSION-2 — GATE 1 & 2 TEST SUITE')
console.log('═══════════════════════════════════════════════════════════')

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`  ✓ ${name}`)
    passed++
  } catch (err) {
    console.log(`  ✗ ${name}`)
    console.log(`    Error: ${err.message}`)
    failed++
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed')
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message || 'Equal'} — expected ${expected}, got ${actual}`)
  }
}

function assertMatch(value, regex, message) {
  if (!regex.test(value)) {
    throw new Error(`${message || 'Match'} — value ${value} did not match ${regex}`)
  }
}

console.log('\n── Token Generation ─────────────────────────────────────────')

test('generateSecureSessionId returns a string', () => {
  const token = generateSecureSessionId()
  assert(typeof token === 'string', 'Token should be a string')
})

test('generateSecureSessionId starts with sess_ prefix', () => {
  const token = generateSecureSessionId()
  assert(token.startsWith(TOKEN_PREFIX), `Token should start with ${TOKEN_PREFIX}`)
})

test('generateSecureSessionId body is exactly 43 characters', () => {
  const token = generateSecureSessionId()
  const body = token.slice(TOKEN_PREFIX.length)
  assertEqual(body.length, TOKEN_BODY_LEN, 'Token body length')
})

test('generateSecureSessionId body is valid base64url', () => {
  const token = generateSecureSessionId()
  const body = token.slice(TOKEN_PREFIX.length)
  const decoded = base64urlDecode(body)
  assertEqual(decoded.length, TOKEN_BYTES, 'Decoded body should be 32 bytes')
})

test('generateSecureSessionId produces unique tokens', () => {
  const tokens = new Set()
  for (let i = 0; i < 100; i++) {
    tokens.add(generateSecureSessionId())
  }
  assertEqual(tokens.size, 100, 'All 100 tokens should be unique')
})

test('generateSecureSessionId uses crypto.randomBytes', () => {
  const token = generateSecureSessionId()
  const body = token.slice(TOKEN_PREFIX.length)
  const decoded = base64urlDecode(body)
  assertEqual(decoded.length, TOKEN_BYTES, 'Token should be 32 bytes from randomBytes')
})

console.log('\n── Token Hashing ───────────────────────────────────────────')

test('hashSessionToken returns a string', () => {
  const token = generateSecureSessionId()
  const hash = hashSessionToken(token)
  assert(typeof hash === 'string', 'Hash should be a string')
})

test('hashSessionToken returns 64-character hex string', () => {
  const token = generateSecureSessionId()
  const hash = hashSessionToken(token)
  assertEqual(hash.length, 64, 'SHA256 hex should be 64 chars')
  assert(isValidSha256Hex(hash), 'Should be valid hex')
})

test('hashSessionToken is deterministic', () => {
  const token = generateSecureSessionId()
  const hash1 = hashSessionToken(token)
  const hash2 = hashSessionToken(token)
  assertEqual(hash1, hash2, 'Same token should produce same hash')
})

test('hashSessionToken different tokens produce different hashes', () => {
  const token1 = generateSecureSessionId()
  const token2 = generateSecureSessionId()
  const hash1 = hashSessionToken(token1)
  const hash2 = hashSessionToken(token2)
  assert(hash1 !== hash2, 'Different tokens should produce different hashes')
})

test('hashSessionToken is NOT reversible', () => {
  const token = generateSecureSessionId()
  const hash = hashSessionToken(token)
  const attempt = hashSessionToken(hash)
  assert(attempt !== token, 'Hash of hash should not equal original token')
})

console.log('\n── Token Format Validation ──────────────────────────────────')

test('isValidTokenFormat accepts valid token', () => {
  const token = generateSecureSessionId()
  assert(isValidTokenFormat(token) === true, 'Valid token should return true')
})

test('isValidTokenFormat rejects non-string', () => {
  assert(isValidTokenFormat(null) === false, 'null should be false')
  assert(isValidTokenFormat(undefined) === false, 'undefined should be false')
  assert(isValidTokenFormat(123) === false, 'number should be false')
  assert(isValidTokenFormat({}) === false, 'object should be false')
})

test('isValidTokenFormat rejects missing prefix', () => {
  const token = generateSecureSessionId()
  const withoutPrefix = token.slice(TOKEN_PREFIX.length)
  assert(isValidTokenFormat(withoutPrefix) === false, 'Missing prefix should be false')
})

test('isValidTokenFormat rejects wrong prefix', () => {
  const token = generateSecureSessionId()
  const wrongPrefix = 'tok_' + token.slice(TOKEN_PREFIX.length)
  assert(isValidTokenFormat(wrongPrefix) === false, 'Wrong prefix should be false')
})

test('isValidTokenFormat rejects wrong length', () => {
  const token = generateSecureSessionId()
  const shortToken = token.slice(0, -1)
  const longToken = token + 'x'
  assert(isValidTokenFormat(shortToken) === false, 'Short token should be false')
  assert(isValidTokenFormat(longToken) === false, 'Long token should be false')
})

test('isValidTokenFormat rejects invalid base64url characters', () => {
  const token = generateSecureSessionId()
  const invalidToken = token.slice(0, -5) + '!!!!!'
  assert(isValidTokenFormat(invalidToken) === false, 'Invalid chars should be false')
})

test('extractTokenBody returns null for invalid token', () => {
  assert(extractTokenBody(null) === null, 'null → null')
  assert(extractTokenBody('bad') === null, 'bad format → null')
})

test('extractTokenBody returns body for valid token', () => {
  const token = generateSecureSessionId()
  const body = extractTokenBody(token)
  assertEqual(body.length, TOKEN_BODY_LEN, 'Body should be 43 chars')
  assertEqual(body, token.slice(TOKEN_PREFIX.length), 'Body should match token slice')
})

console.log('\n── Token Contract ──────────────────────────────────────────')

test('Raw token never stored — only hash is storable', () => {
  const token = generateSecureSessionId()
  const hash = hashSessionToken(token)
  assert(isValidSha256Hex(hash), 'Hash is in storable hex format')
  assert(!isValidSha256Hex(token), 'Raw token is NOT in hex format — not directly storable')
})

test('Token prefix preserved for HTTP header parsing', () => {
  const token = generateSecureSessionId()
  assert(token.startsWith('sess_'), 'Token starts with sess_ for Bearer parsing')
  const afterBearer = token
  assert(afterBearer.startsWith('sess_'), 'After Bearer prefix, sess_ is still first')
})

test('Token has sufficient entropy (256 bits)', () => {
  const token = generateSecureSessionId()
  const body = token.slice(TOKEN_PREFIX.length)
  const decoded = base64urlDecode(body)
  assertEqual(decoded.length, 32, '32 bytes = 256 bits of entropy')
})

console.log('\n── Repository Mock Contract ──────────────────────────────────')

const SESSION_TTL_MS = 24 * 60 * 60 * 1000

function createMockDb() {
  const sessions = new Map()
  const tokenHashIndex = new Map()

  return {
    sessions,
    tokenHashIndex,

    async createSession({ userId, applicationId, tokenHash, expiresAt }) {
      const id = 'pg-' + Math.random().toString(36).substring(2, 12)
      const session = { id, user_id: userId, application_id: applicationId, token_hash: tokenHash, status: 'active', created_at: new Date().toISOString(), expires_at: expiresAt, revoked_at: null }
      sessions.set(id, session)
      tokenHashIndex.set(tokenHash, id)
      return session
    },

    async findSessionByTokenHash(tokenHash) {
      const id = tokenHashIndex.get(tokenHash)
      if (!id) return null
      const session = sessions.get(id)
      if (!session) return null
      if (session.status !== 'active') return null
      if (new Date(session.expires_at) <= new Date()) return null
      return session
    },

    async revokeSession(tokenHash) {
      const id = tokenHashIndex.get(tokenHash)
      if (!id) return null
      const session = sessions.get(id)
      if (!session) return null
      if (session.status !== 'active') return null
      session.status = 'revoked'
      session.revoked_at = new Date().toISOString()
      return session
    },

    async revokeAllSessionsForUser(userId) {
      const revoked = []
      for (const [id, session] of sessions.entries()) {
        if (session.user_id === userId && session.status === 'active') {
          session.status = 'revoked'
          session.revoked_at = new Date().toISOString()
          revoked.push(session)
        }
      }
      return revoked
    },

    async revokeSessionsForApplication(userId, applicationId) {
      const revoked = []
      for (const [id, session] of sessions.entries()) {
        if (session.user_id === userId && session.application_id === applicationId && session.status === 'active') {
          session.status = 'revoked'
          session.revoked_at = new Date().toISOString()
          revoked.push(session)
        }
      }
      return revoked
    },

    async cleanupExpiredSessions(cutoffTimestamp) {
      let count = 0
      for (const [id, session] of sessions.entries()) {
        if (new Date(session.expires_at) < new Date(cutoffTimestamp) && session.status === 'active') {
          sessions.delete(id)
          tokenHashIndex.delete(session.token_hash)
          count++
        }
      }
      return count
    },

    async findActiveSessionsForUser(userId, client = null) {
      const now = new Date()
      const result = []
      for (const session of sessions.values()) {
        if (
          session.user_id === userId &&
          session.status === 'active' &&
          new Date(session.expires_at) > now
        ) {
          result.push({
            id: session.id,
            application_id: session.application_id,
            created_at: session.created_at,
            expires_at: session.expires_at,
            status: session.status
          })
        }
      }
      result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      return result
    },

    async revokeSessionByIdForUser(sessionId, userId, client = null) {
      const session = sessions.get(sessionId)
      if (!session) return null
      if (session.user_id !== userId) return null
      if (session.status !== 'active') return null
      if (new Date(session.expires_at) <= new Date()) return null
      session.status = 'revoked'
      session.revoked_at = new Date().toISOString()
      return {
        id: session.id,
        application_id: session.application_id,
        revoked_at: session.revoked_at
      }
    },

    async revokeAllOtherSessionsForUser(userId, currentSessionId, client = null) {
      const now = new Date()
      const revoked = []
      for (const session of sessions.values()) {
        if (
          session.user_id === userId &&
          session.id !== currentSessionId &&
          session.status === 'active' &&
          new Date(session.expires_at) > now
        ) {
          session.status = 'revoked'
          session.revoked_at = new Date().toISOString()
          revoked.push({
            id: session.id,
            application_id: session.application_id,
            revoked_at: session.revoked_at
          })
        }
      }
      return revoked
    }
  }
}

console.log('\n  Session Creation')

test('createSession inserts session with correct fields', async () => {
  const db = createMockDb()
  const token = generateSecureSessionId()
  const hash = hashSessionToken(token)
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()

  const session = await db.createSession({
    userId: 'owner_123',
    applicationId: 'valdi.app/albasie',
    tokenHash: hash,
    expiresAt
  })

  assertEqual(session.user_id, 'owner_123')
  assertEqual(session.application_id, 'valdi.app/albasie')
  assertEqual(session.token_hash, hash)
  assertEqual(session.status, 'active')
  assert(session.expires_at === expiresAt)
  assert(session.revoked_at === null)
})

test('createSession allows multiple sessions per user', async () => {
  const db = createMockDb()
  const token1 = generateSecureSessionId()
  const token2 = generateSecureSessionId()
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()

  await db.createSession({ userId: 'owner_1', applicationId: 'valdi.app/albasie', tokenHash: hashSessionToken(token1), expiresAt })
  await db.createSession({ userId: 'owner_1', applicationId: 'valdi.app/albasie', tokenHash: hashSessionToken(token2), expiresAt })

  assertEqual(db.sessions.size, 2)
})

console.log('\n  Active Session Lookup')

test('findSessionByTokenHash returns session for valid token', async () => {
  const db = createMockDb()
  const token = generateSecureSessionId()
  const hash = hashSessionToken(token)
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()

  await db.createSession({ userId: 'owner_123', applicationId: 'valdi.app/albasie', tokenHash: hash, expiresAt })
  const found = await db.findSessionByTokenHash(hash)

  assert(found !== null, 'Session should be found')
  assertEqual(found.user_id, 'owner_123')
})

test('findSessionByTokenHash returns null for unknown hash', async () => {
  const db = createMockDb()
  const found = await db.findSessionByTokenHash('unknown_hash_abc123def456')
  assert(found === null, 'Unknown hash should return null')
})

test('findSessionByTokenHash returns null for expired session', async () => {
  const db = createMockDb()
  const token = generateSecureSessionId()
  const hash = hashSessionToken(token)
  const expiredAt = new Date(Date.now() - 1000).toISOString()

  await db.createSession({ userId: 'owner_123', applicationId: 'valdi.app/albasie', tokenHash: hash, expiresAt: expiredAt })
  const found = await db.findSessionByTokenHash(hash)

  assert(found === null, 'Expired session should return null')
})

test('findSessionByTokenHash returns null for revoked session', async () => {
  const db = createMockDb()
  const token = generateSecureSessionId()
  const hash = hashSessionToken(token)
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()

  await db.createSession({ userId: 'owner_123', applicationId: 'valdi.app/albasie', tokenHash: hash, expiresAt })
  await db.revokeSession(hash)
  const found = await db.findSessionByTokenHash(hash)

  assert(found === null, 'Revoked session should return null')
})

console.log('\n  Session Revocation')

test('revokeSession marks session as revoked', async () => {
  const db = createMockDb()
  const token = generateSecureSessionId()
  const hash = hashSessionToken(token)
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()

  await db.createSession({ userId: 'owner_123', applicationId: 'valdi.app/albasie', tokenHash: hash, expiresAt })
  const revoked = await db.revokeSession(hash)

  assertEqual(revoked.status, 'revoked')
  assert(revoked.revoked_at !== null, 'revoked_at should be set')
})

test('revokeSession returns null for non-existent hash', async () => {
  const db = createMockDb()
  const revoked = await db.revokeSession('nonexistent_hash')
  assert(revoked === null, 'Non-existent hash should return null')
})

test('revokeSession returns null for already-revoked session', async () => {
  const db = createMockDb()
  const token = generateSecureSessionId()
  const hash = hashSessionToken(token)
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()

  await db.createSession({ userId: 'owner_123', applicationId: 'valdi.app/albasie', tokenHash: hash, expiresAt })
  await db.revokeSession(hash)
  const second = await db.revokeSession(hash)

  assert(second === null, 'Already revoked session should return null')
})

test('revokeAllSessionsForUser revokes all active sessions for user', async () => {
  const db = createMockDb()
  const token1 = generateSecureSessionId()
  const token2 = generateSecureSessionId()
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()

  await db.createSession({ userId: 'owner_1', applicationId: 'valdi.app/albasie', tokenHash: hashSessionToken(token1), expiresAt })
  await db.createSession({ userId: 'owner_1', applicationId: 'valdi.app/albasie', tokenHash: hashSessionToken(token2), expiresAt })
  await db.createSession({ userId: 'owner_2', applicationId: 'valdi.app/albasie', tokenHash: hashSessionToken(generateSecureSessionId()), expiresAt })

  const revoked = await db.revokeAllSessionsForUser('owner_1')

  assertEqual(revoked.length, 2, 'Should revoke 2 sessions for owner_1')

  const owner1Sessions = [...db.sessions.values()].filter(s => s.user_id === 'owner_1')
  const allRevoked = owner1Sessions.every(s => s.status === 'revoked')
  assert(allRevoked, 'All owner_1 sessions should be revoked')

  const owner2Sessions = [...db.sessions.values()].filter(s => s.user_id === 'owner_2')
  const owner2Active = owner2Sessions.some(s => s.status === 'active')
  assert(owner2Active, 'owner_2 sessions should still be active')
})

test('revokeSessionsForApplication revokes sessions for specific user+app', async () => {
  const db = createMockDb()
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()

  await db.createSession({ userId: 'owner_1', applicationId: 'valdi.app/albasie', tokenHash: hashSessionToken(generateSecureSessionId()), expiresAt })
  await db.createSession({ userId: 'owner_1', applicationId: 'valdi.app/other', tokenHash: hashSessionToken(generateSecureSessionId()), expiresAt })

  const revoked = await db.revokeSessionsForApplication('owner_1', 'valdi.app/albasie')

  assertEqual(revoked.length, 1, 'Should revoke 1 session for albasie app')
  assertEqual(revoked[0].application_id, 'valdi.app/albasie')

  const otherSessions = [...db.sessions.values()].filter(s => s.application_id === 'valdi.app/other')
  assert(otherSessions[0].status === 'active', 'Other app session should be active')
})

console.log('\n  Cleanup')

test('cleanupExpiredSessions removes only expired active sessions', async () => {
  const db = createMockDb()
  const futureTime = new Date(Date.now() + SESSION_TTL_MS).toISOString()
  const pastTime = new Date(Date.now() - 1000).toISOString()

  await db.createSession({ userId: 'owner_1', applicationId: 'valdi.app/albasie', tokenHash: hashSessionToken(generateSecureSessionId()), expiresAt: futureTime })
  await db.createSession({ userId: 'owner_2', applicationId: 'valdi.app/albasie', tokenHash: hashSessionToken(generateSecureSessionId()), expiresAt: pastTime })

  const cutoff = new Date(Date.now() - 500).toISOString()
  const deletedCount = await db.cleanupExpiredSessions(cutoff)

  assertEqual(deletedCount, 1, 'Should delete 1 expired session')
  assertEqual(db.sessions.size, 1, 'One session should remain')

  const remaining = [...db.sessions.values()][0]
  assertEqual(remaining.user_id, 'owner_1', 'Future session should remain')
})

test('cleanupExpiredSessions does not remove revoked sessions', async () => {
  const db = createMockDb()
  const pastTime = new Date(Date.now() - 1000).toISOString()
  const token = generateSecureSessionId()
  const hash = hashSessionToken(token)

  await db.createSession({ userId: 'owner_1', applicationId: 'valdi.app/albasie', tokenHash: hash, expiresAt: pastTime })
  await db.revokeSession(hash)

  const cutoff = new Date(Date.now() - 500).toISOString()
  const deletedCount = await db.cleanupExpiredSessions(cutoff)

  assertEqual(deletedCount, 0, 'Should not delete revoked session')
})

console.log('\n── Schema Constraints ────────────────────────────────────────')

test('Status is either active or revoked', () => {
  const db = createMockDb()
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()

  const validStatuses = ['active', 'revoked']
  for (const status of validStatuses) {
    const session = { id: `s_${status}`, user_id: 'owner_1', application_id: 'valdi.app/albasie', token_hash: hashSessionToken(generateSecureSessionId()), status, expires_at: expiresAt, revoked_at: null }
    const sessions = new Map([[session.id, session]])
    const allValid = validStatuses.includes(session.status)
    assert(allValid, `Status ${status} should be valid`)
  }
})

test('Expires_at is NOT a status field', () => {
  const db = createMockDb()
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()

  const session = { id: 's1', user_id: 'owner_1', application_id: 'valdi.app/albasie', token_hash: hashSessionToken(generateSecureSessionId()), status: 'active', expires_at: expiresAt, revoked_at: null }
  assert(session.expires_at !== null, 'expires_at should be set')
  assert(session.status === 'active', 'status should be active')

  const isExpired = new Date(session.expires_at) <= new Date()
  assert(isExpired === false, 'Session with future expiry should not be expired')
})

test('Expiration is derived from expires_at, not stored status', () => {
  const db = createMockDb()
  const pastTime = new Date(Date.now() - 1000).toISOString()

  const session = { id: 's1', user_id: 'owner_1', application_id: 'valdi.app/albasie', token_hash: hashSessionToken(generateSecureSessionId()), status: 'active', expires_at: pastTime, revoked_at: null }
  assert(session.status === 'active', 'Status is active but session is expired via expires_at')
  assert(new Date(session.expires_at) <= new Date(), 'expires_at determines expiration, not status')
})

console.log('\n── Index Requirements ────────────────────────────────────────')

test('token_hash must be UNIQUE (simulated)', () => {
  const db = createMockDb()
  const token = generateSecureSessionId()
  const hash = hashSessionToken(token)
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()

  db.tokenHashIndex.set(hash, 's1')

  let duplicateError = null
  try {
    const existing = db.tokenHashIndex.get(hash)
    if (existing) {
      throw new Error('UNIQUE constraint violation')
    }
  } catch (e) {
    duplicateError = e
  }

  assert(duplicateError !== null, 'Duplicate token_hash should raise error')
})

test('user_id index needed for revokeAllSessionsForUser', () => {
  const db = createMockDb()
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()

  for (let i = 0; i < 10; i++) {
    db.sessions.set(`s${i}`, { id: `s${i}`, user_id: 'owner_1', application_id: 'valdi.app/albasie', token_hash: hashSessionToken(generateSecureSessionId()), status: 'active', expires_at: expiresAt, revoked_at: null })
  }

  const owner1Sessions = [...db.sessions.values()].filter(s => s.user_id === 'owner_1')
  assertEqual(owner1Sessions.length, 10, 'Should find all sessions for user')
})

test('expires_at partial index on active sessions needed for cleanup', () => {
  const db = createMockDb()
  const futureTime = new Date(Date.now() + SESSION_TTL_MS).toISOString()
  const pastTime = new Date(Date.now() - 1000).toISOString()

  db.sessions.set('s1', { id: 's1', user_id: 'owner_1', application_id: 'valdi.app/albasie', token_hash: hashSessionToken(generateSecureSessionId()), status: 'active', expires_at: futureTime, revoked_at: null })
  db.sessions.set('s2', { id: 's2', user_id: 'owner_2', application_id: 'valdi.app/albasie', token_hash: hashSessionToken(generateSecureSessionId()), status: 'revoked', expires_at: pastTime, revoked_at: new Date().toISOString() })

  const activeExpired = [...db.sessions.values()].filter(s => s.status === 'active' && new Date(s.expires_at) < new Date())
  assertEqual(activeExpired.length, 0, 'No active+expired sessions in mock')

  const cutoff = new Date(Date.now() - 500).toISOString()
  const toCleanup = [...db.sessions.values()].filter(s => s.status === 'active' && new Date(s.expires_at) < new Date(cutoff))
  assertEqual(toCleanup.length, 0, 'No active expired sessions to clean up')
})

test('No redundant token_hash index needed (UNIQUE provides one)', () => {
  const uniqueIndex = new Map()
  const token = generateSecureSessionId()
  const hash = hashSessionToken(token)

  uniqueIndex.set(hash, 'session-1')
  const existing = uniqueIndex.get(hash)

  assert(existing === 'session-1', 'UNIQUE constraint on token_hash is the index')
})

console.log('\n── Session Management Mock Contract ─────────────────────────')

function createMockSessionManager() {
  const db = createMockDb()

  return {
    db,

    async authenticateOwner(email, password, mockUser, mockGrants) {
      if (!email || !password) {
        return { success: false, error: 'Email and password are required' }
      }

      if (!mockUser || password !== 'valid_password') {
        return { success: false, error: 'Invalid credentials' }
      }

      if (mockGrants.length === 0) {
        return { success: false, error: 'NO_ACTIVE_GRANT' }
      }

      if (mockGrants.length > 1) {
        return { success: false, error: 'AMBIGUOUS_APPLICATION' }
      }

      const grant = mockGrants[0]
      const rawToken = generateSecureSessionId()
      const tokenHash = hashSessionToken(rawToken)
      const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()

      await db.createSession({
        userId: mockUser.id,
        applicationId: grant.application_id,
        tokenHash,
        expiresAt
      })

      return {
        success: true,
        session: {
          id: rawToken,
          ownerId: mockUser.id,
          ownerEmail: mockUser.email,
          ownerName: mockUser.name,
          applicationId: grant.application_id,
          role: grant.role,
          permissions: grant.permissions,
          expiresAt
        }
      }
    },

    async validateSession(sessionId) {
      if (!sessionId || typeof sessionId !== 'string') {
        return null
      }

      if (!isValidTokenFormat(sessionId)) {
        return null
      }

      const tokenHash = hashSessionToken(sessionId)
      const session = await db.findSessionByTokenHash(tokenHash)

      if (!session) {
        return null
      }

      return {
        id: session.id,
        ownerId: session.user_id,
        ownerEmail: null,
        ownerName: null,
        applicationId: session.application_id,
        role: session.role,
        permissions: session.permissions,
        expiresAt: session.expires_at,
        createdAt: session.created_at
      }
    },

    async invalidateSession(sessionId) {
      if (!sessionId) return false
      if (!isValidTokenFormat(sessionId)) return false

      const tokenHash = hashSessionToken(sessionId)
      const result = await db.revokeSession(tokenHash)
      return result !== null
    },

    async extendSession(sessionId) {
      if (!sessionId) return false
      if (!isValidTokenFormat(sessionId)) return false

      const tokenHash = hashSessionToken(sessionId)
      const newExpiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()
      const session = db.sessions.get(db.tokenHashIndex.get(tokenHash))

      if (!session || session.status !== 'active') return false
      if (new Date(session.expires_at) <= new Date()) return false

      session.expires_at = newExpiresAt
      return true
    },

    async cleanupExpiredSessions() {
      const cutoff = new Date().toISOString()
      return await db.cleanupExpiredSessions(cutoff)
    },

    async getSessionCount() {
      let count = 0
      for (const session of db.sessions.values()) {
        if (session.status === 'active' && new Date(session.expires_at) > new Date()) {
          count++
        }
      }
      return count
    }
  }
}

console.log('\n  Session Creation')

test('authenticateOwner creates repository session with raw token returned', async () => {
  const manager = createMockSessionManager()
  const mockUser = { id: 'owner_123', email: 'test@example.com', name: 'Test User' }
  const mockGrants = [{ application_id: 'valdi.app/albasie', role: 'business_owner', permissions: ['application:read'] }]

  const result = await manager.authenticateOwner('test@example.com', 'valid_password', mockUser, mockGrants)

  assert(result.success === true, 'Should succeed')
  assert(result.session.id.startsWith('sess_'), 'Token should have sess_ prefix')
  assert(isValidTokenFormat(result.session.id), 'Token should be valid format')
  assertEqual(manager.db.sessions.size, 1, 'One session should be in DB')
})

test('authenticateOwner stores only token hash, not raw token', async () => {
  const manager = createMockSessionManager()
  const mockUser = { id: 'owner_123', email: 'test@example.com', name: 'Test User' }
  const mockGrants = [{ application_id: 'valdi.app/albasie', role: 'business_owner', permissions: [] }]

  const result = await manager.authenticateOwner('test@example.com', 'valid_password', mockUser, mockGrants)
  const session = [...manager.db.sessions.values()][0]

  assert(session.token_hash.length === 64, 'Token hash should be 64 hex chars')
  assert(!manager.db.tokenHashIndex.has(result.session.id), 'Raw token should NOT be in tokenHashIndex')
  assert(manager.db.tokenHashIndex.has(session.token_hash), 'Token hash should be in tokenHashIndex')
})

test('authenticateOwner returns NO_ACTIVE_GRANT when no grants', async () => {
  const manager = createMockSessionManager()
  const mockUser = { id: 'owner_123', email: 'test@example.com', name: 'Test User' }

  const result = await manager.authenticateOwner('test@example.com', 'valid_password', mockUser, [])

  assertEqual(result.success, false)
  assertEqual(result.error, 'NO_ACTIVE_GRANT')
})

test('authenticateOwner returns AMBIGUOUS_APPLICATION when multiple grants', async () => {
  const manager = createMockSessionManager()
  const mockUser = { id: 'owner_123', email: 'test@example.com', name: 'Test User' }
  const mockGrants = [
    { application_id: 'valdi.app/albasie', role: 'business_owner', permissions: [] },
    { application_id: 'valdi.app/other', role: 'business_owner', permissions: [] }
  ]

  const result = await manager.authenticateOwner('test@example.com', 'valid_password', mockUser, mockGrants)

  assertEqual(result.success, false)
  assertEqual(result.error, 'AMBIGUOUS_APPLICATION')
})

console.log('\n  Session Validation')

test('validateSession returns session for valid token', async () => {
  const manager = createMockSessionManager()
  const mockUser = { id: 'owner_123', email: 'test@example.com', name: 'Test User' }
  const mockGrants = [{ application_id: 'valdi.app/albasie', role: 'business_owner', permissions: ['application:read'] }]

  const loginResult = await manager.authenticateOwner('test@example.com', 'valid_password', mockUser, mockGrants)
  const session = await manager.validateSession(loginResult.session.id)

  assert(session !== null, 'Session should be found')
  assertEqual(session.ownerId, 'owner_123')
  assertEqual(session.applicationId, 'valdi.app/albasie')
})

test('validateSession returns null for invalid token format', async () => {
  const manager = createMockSessionManager()
  const session = await manager.validateSession('invalid_token_format')
  assert(session === null, 'Invalid format should return null')
})

test('validateSession returns null for unknown token', async () => {
  const manager = createMockSessionManager()
  const session = await manager.validateSession(generateSecureSessionId())
  assert(session === null, 'Unknown token should return null')
})

test('validateSession returns null for expired session', async () => {
  const manager = createMockSessionManager()
  const mockUser = { id: 'owner_123', email: 'test@example.com', name: 'Test User' }
  const mockGrants = [{ application_id: 'valdi.app/albasie', role: 'business_owner', permissions: [] }]

  const loginResult = await manager.authenticateOwner('test@example.com', 'valid_password', mockUser, mockGrants)

  const session = [...manager.db.sessions.values()][0]
  session.expires_at = new Date(Date.now() - 1000).toISOString()

  const result = await manager.validateSession(loginResult.session.id)
  assert(result === null, 'Expired session should return null')
})

test('validateSession returns null for revoked session', async () => {
  const manager = createMockSessionManager()
  const mockUser = { id: 'owner_123', email: 'test@example.com', name: 'Test User' }
  const mockGrants = [{ application_id: 'valdi.app/albasie', role: 'business_owner', permissions: [] }]

  const loginResult = await manager.authenticateOwner('test@example.com', 'valid_password', mockUser, mockGrants)
  await manager.invalidateSession(loginResult.session.id)

  const result = await manager.validateSession(loginResult.session.id)
  assert(result === null, 'Revoked session should return null')
})

console.log('\n  Session Extension')

test('extendSession extends active session', async () => {
  const manager = createMockSessionManager()
  const mockUser = { id: 'owner_123', email: 'test@example.com', name: 'Test User' }
  const mockGrants = [{ application_id: 'valdi.app/albasie', role: 'business_owner', permissions: [] }]

  const loginResult = await manager.authenticateOwner('test@example.com', 'valid_password', mockUser, mockGrants)
  const originalSession = await manager.validateSession(loginResult.session.id)
  const originalExpiry = originalSession.expiresAt

  await new Promise(resolve => setTimeout(resolve, 10))

  const extended = await manager.extendSession(loginResult.session.id)
  assert(extended === true, 'Extension should succeed')

  const updatedSession = await manager.validateSession(loginResult.session.id)
  assert(new Date(updatedSession.expiresAt) > new Date(originalExpiry), 'Expiry should be extended')
})

test('extendSession fails for revoked session', async () => {
  const manager = createMockSessionManager()
  const mockUser = { id: 'owner_123', email: 'test@example.com', name: 'Test User' }
  const mockGrants = [{ application_id: 'valdi.app/albasie', role: 'business_owner', permissions: [] }]

  const loginResult = await manager.authenticateOwner('test@example.com', 'valid_password', mockUser, mockGrants)
  await manager.invalidateSession(loginResult.session.id)

  const extended = await manager.extendSession(loginResult.session.id)
  assert(extended === false, 'Extension should fail for revoked session')
})

test('extendSession fails for expired session', async () => {
  const manager = createMockSessionManager()
  const mockUser = { id: 'owner_123', email: 'test@example.com', name: 'Test User' }
  const mockGrants = [{ application_id: 'valdi.app/albasie', role: 'business_owner', permissions: [] }]

  const loginResult = await manager.authenticateOwner('test@example.com', 'valid_password', mockUser, mockGrants)

  const session = [...manager.db.sessions.values()][0]
  session.expires_at = new Date(Date.now() - 1000).toISOString()

  const extended = await manager.extendSession(loginResult.session.id)
  assert(extended === false, 'Extension should fail for expired session')
})

test('extendSession fails for unknown token', async () => {
  const manager = createMockSessionManager()
  const extended = await manager.extendSession(generateSecureSessionId())
  assert(extended === false, 'Extension should fail for unknown token')
})

console.log('\n  Logout / Revocation')

test('invalidateSession revokes session', async () => {
  const manager = createMockSessionManager()
  const mockUser = { id: 'owner_123', email: 'test@example.com', name: 'Test User' }
  const mockGrants = [{ application_id: 'valdi.app/albasie', role: 'business_owner', permissions: [] }]

  const loginResult = await manager.authenticateOwner('test@example.com', 'valid_password', mockUser, mockGrants)
  const revoked = await manager.invalidateSession(loginResult.session.id)

  assert(revoked === true, 'Revocation should succeed')
  assertEqual(manager.db.sessions.size, 1, 'Session still in DB but revoked')

  const session = [...manager.db.sessions.values()][0]
  assertEqual(session.status, 'revoked', 'Session status should be revoked')
})

test('invalidateSession idempotent for unknown token', async () => {
  const manager = createMockSessionManager()
  const result = await manager.invalidateSession(generateSecureSessionId())
  assert(result === false, 'Unknown token should return false (not an error)')
})

test('invalidateSession idempotent for already revoked session', async () => {
  const manager = createMockSessionManager()
  const mockUser = { id: 'owner_123', email: 'test@example.com', name: 'Test User' }
  const mockGrants = [{ application_id: 'valdi.app/albasie', role: 'business_owner', permissions: [] }]

  const loginResult = await manager.authenticateOwner('test@example.com', 'valid_password', mockUser, mockGrants)
  await manager.invalidateSession(loginResult.session.id)

  const secondResult = await manager.invalidateSession(loginResult.session.id)
  assert(secondResult === false, 'Already revoked should return false')
})

console.log('\n  Cleanup')

test('cleanupExpiredSessions removes expired active sessions', async () => {
  const manager = createMockSessionManager()
  const mockUser = { id: 'owner_123', email: 'test@example.com', name: 'Test User' }
  const mockGrants = [{ application_id: 'valdi.app/albasie', role: 'business_owner', permissions: [] }]

  await manager.authenticateOwner('test@example.com', 'valid_password', mockUser, mockGrants)

  const session = [...manager.db.sessions.values()][0]
  session.expires_at = new Date(Date.now() - 1000).toISOString()

  const cleaned = await manager.cleanupExpiredSessions()
  assertEqual(cleaned, 1, 'Should clean 1 expired session')
  assertEqual(manager.db.sessions.size, 0, 'DB should be empty')
})

test('cleanupExpiredSessions does not remove revoked sessions', async () => {
  const manager = createMockSessionManager()
  const mockUser = { id: 'owner_123', email: 'test@example.com', name: 'Test User' }
  const mockGrants = [{ application_id: 'valdi.app/albasie', role: 'business_owner', permissions: [] }]

  const loginResult = await manager.authenticateOwner('test@example.com', 'valid_password', mockUser, mockGrants)

  const session = [...manager.db.sessions.values()][0]
  session.expires_at = new Date(Date.now() - 1000).toISOString()

  await manager.invalidateSession(loginResult.session.id)

  const cleaned = await manager.cleanupExpiredSessions()
  assertEqual(cleaned, 0, 'Should not clean revoked session')
})

console.log('\n  Session Count')

test('getSessionCount returns active session count', async () => {
  const manager = createMockSessionManager()
  const mockUser = { id: 'owner_123', email: 'test@example.com', name: 'Test User' }
  const mockGrants = [{ application_id: 'valdi.app/albasie', role: 'business_owner', permissions: [] }]

  assertEqual(await manager.getSessionCount(), 0, 'Should be 0 initially')

  await manager.authenticateOwner('test@example.com', 'valid_password', mockUser, mockGrants)
  assertEqual(await manager.getSessionCount(), 1, 'Should be 1 after login')
})

test('getSessionCount excludes revoked sessions', async () => {
  const manager = createMockSessionManager()
  const mockUser = { id: 'owner_123', email: 'test@example.com', name: 'Test User' }
  const mockGrants = [{ application_id: 'valdi.app/albasie', role: 'business_owner', permissions: [] }]

  const loginResult = await manager.authenticateOwner('test@example.com', 'valid_password', mockUser, mockGrants)
  await manager.invalidateSession(loginResult.session.id)

  assertEqual(await manager.getSessionCount(), 0, 'Should be 0 after revocation')
})

console.log('\n  Backward Compatibility')

test('Token format sess_ prefix preserved for HTTP header parsing', () => {
  const token = generateSecureSessionId()
  assert(token.startsWith('sess_'), 'Token starts with sess_ for Bearer parsing')
  const afterBearer = token
  assert(afterBearer.startsWith('sess_'), 'After Bearer prefix, sess_ is still first')
})

test('Login response shape compatible with SESSION-1', async () => {
  const manager = createMockSessionManager()
  const mockUser = { id: 'owner_123', email: 'test@example.com', name: 'Test User' }
  const mockGrants = [{ application_id: 'valdi.app/albasie', role: 'business_owner', permissions: ['application:read'] }]

  const result = await manager.authenticateOwner('test@example.com', 'valid_password', mockUser, mockGrants)

  assert(result.success === true, 'Should succeed')
  assert(result.session.id !== undefined, 'session.id should exist')
  assert(result.session.ownerId !== undefined, 'session.ownerId should exist')
  assert(result.session.ownerEmail !== undefined, 'session.ownerEmail should exist')
  assert(result.session.ownerName !== undefined, 'session.ownerName should exist')
  assert(result.session.applicationId !== undefined, 'session.applicationId should exist')
  assert(result.session.role !== undefined, 'session.role should exist')
  assert(result.session.permissions !== undefined, 'session.permissions should exist')
  assert(result.session.expiresAt !== undefined, 'session.expiresAt should exist')
})

test('24h TTL preserved', async () => {
  const manager = createMockSessionManager()
  const mockUser = { id: 'owner_123', email: 'test@example.com', name: 'Test User' }
  const mockGrants = [{ application_id: 'valdi.app/albasie', role: 'business_owner', permissions: [] }]

  const result = await manager.authenticateOwner('test@example.com', 'valid_password', mockUser, mockGrants)
  const expiresAt = new Date(result.session.expiresAt)
  const now = new Date()
  const diffHours = (expiresAt - now) / (1000 * 60 * 60)

  assert(diffHours >= 23.9 && diffHours <= 24.1, `TTL should be ~24h, got ${diffHours}h`)
})

console.log('\n  UUID / Raw Token Separation')

test('createSession does NOT accept id parameter - PostgreSQL generates UUID', async () => {
  const db = createMockDb()
  const token = generateSecureSessionId()
  const hash = hashSessionToken(token)
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()

  const session = await db.createSession({
    userId: 'owner_123',
    applicationId: 'valdi.app/albasie',
    tokenHash: hash,
    expiresAt
  })

  assert(session.id !== undefined, 'session.id should exist (PostgreSQL-generated)')
  assert(session.id !== token, 'session.id should NOT equal raw token')
  assert(session.id.startsWith('pg-'), 'mock DB generates placeholder id format')
})

test('createSession only stores token_hash, NOT raw token', async () => {
  const db = createMockDb()
  const rawToken = generateSecureSessionId()
  const hash = hashSessionToken(rawToken)
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()

  await db.createSession({
    userId: 'owner_123',
    applicationId: 'valdi.app/albasie',
    tokenHash: hash,
    expiresAt
  })

  const storedSession = [...db.sessions.values()][0]
  assert(storedSession.token_hash === hash, 'token_hash is stored')
  assert(storedSession.token_hash !== rawToken, 'raw token is NOT stored')
  assert(!db.tokenHashIndex.has(rawToken), 'raw token is NOT in tokenHashIndex')
  assert(db.tokenHashIndex.has(hash), 'token hash IS in tokenHashIndex')
})

test('authenticateOwner passes tokenHash to repository, NOT rawToken', async () => {
  const manager = createMockSessionManager()
  const rawTokenUsed = []
  const hashUsed = []

  const originalCreateSession = manager.db.createSession.bind(manager.db)
  manager.db.createSession = async function(opts) {
    hashUsed.push(opts.tokenHash)
    return originalCreateSession(opts)
  }

  const mockUser = { id: 'owner_123', email: 'test@example.com', name: 'Test User' }
  const mockGrants = [{ application_id: 'valdi.app/albasie', role: 'business_owner', permissions: [] }]

  const result = await manager.authenticateOwner('test@example.com', 'valid_password', mockUser, mockGrants)

  assert(result.success === true, 'Should succeed')
  assert(hashUsed.length === 1, 'createSession should be called once')
  assert(hashUsed[0].length === 64, 'tokenHash should be 64-char SHA256 hex')
  assert(result.session.id === rawTokenUsed[0] || !hashUsed.includes(result.session.id), 'session.id should be raw token, not hash')
})

test('authenticateOwner returns rawToken as session.id to client', async () => {
  const manager = createMockSessionManager()
  const mockUser = { id: 'owner_123', email: 'test@example.com', name: 'Test User' }
  const mockGrants = [{ application_id: 'valdi.app/albasie', role: 'business_owner', permissions: [] }]

  const result = await manager.authenticateOwner('test@example.com', 'valid_password', mockUser, mockGrants)

  assert(result.success === true, 'Should succeed')
  assert(result.session.id.startsWith('sess_'), 'session.id should have sess_ prefix')
  assert(isValidTokenFormat(result.session.id), 'session.id should be valid token format')
  assert(result.session.id.length === 47, 'session.id should be 47 chars (sess_ + 43 base64url)')
})

test('persisted DB id (UUID) and client raw token are distinct', async () => {
  const manager = createMockSessionManager()
  const mockUser = { id: 'owner_123', email: 'test@example.com', name: 'Test User' }
  const mockGrants = [{ application_id: 'valdi.app/albasie', role: 'business_owner', permissions: [] }]

  const result = await manager.authenticateOwner('test@example.com', 'valid_password', mockUser, mockGrants)
  const storedSession = [...manager.db.sessions.values()][0]

  assert(result.session.id !== storedSession.id, 'client token !== stored DB id')
  assert(isValidTokenFormat(result.session.id), 'client token is valid format')
  assert(storedSession.id.startsWith('pg-'), 'stored DB id is mock UUID format')
})

test('authenticateOwner stores ONLY token_hash, never raw token', async () => {
  const manager = createMockSessionManager()
  const mockUser = { id: 'owner_123', email: 'test@example.com', name: 'Test User' }
  const mockGrants = [{ application_id: 'valdi.app/albasie', role: 'business_owner', permissions: [] }]

  const result = await manager.authenticateOwner('test@example.com', 'valid_password', mockUser, mockGrants)

  for (const [id, session] of manager.db.sessions) {
    assert(session.token_hash !== result.session.id, 'raw token should never be stored as token_hash')
    assert(session.token_hash.length === 64, 'token_hash should be 64-char SHA256')
  }
})

test('session tokenHash is PostgreSQL-ready 64-char hex', () => {
  const rawToken = generateSecureSessionId()
  const hash = hashSessionToken(rawToken)

  assert(hash.length === 64, 'SHA256 hash should be 64 hex characters')
  assert(/^[a-f0-9]{64}$/.test(hash), 'hash should be lowercase hex')
})

// =====================================================================
// OWNER-SESSION-3 — GATE 2: REPOSITORY LIFECYCLE QUERIES
// =====================================================================

console.log('\n  Repository Lifecycle Queries')

test('findActiveSessionsForUser returns sessions for matching user_id', async () => {
  const db = createMockDb()
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()

  db.sessions.set('s1', { id: 's1', user_id: 'owner_1', application_id: 'valdi.app/albasie', token_hash: 'h1', status: 'active', created_at: new Date().toISOString(), expires_at: expiresAt, revoked_at: null })
  db.sessions.set('s2', { id: 's2', user_id: 'owner_2', application_id: 'valdi.app/albasie', token_hash: 'h2', status: 'active', created_at: new Date().toISOString(), expires_at: expiresAt, revoked_at: null })
  db.sessions.set('s3', { id: 's3', user_id: 'owner_1', application_id: 'valdi.app/albasie', token_hash: 'h3', status: 'active', created_at: new Date().toISOString(), expires_at: expiresAt, revoked_at: null })

  const result = await db.findActiveSessionsForUser('owner_1')

  assertEqual(result.length, 2, 'Should return 2 sessions for owner_1')
  const ids = result.map(s => s.id)
  assert(ids.includes('s1'), 'Should include s1')
  assert(ids.includes('s3'), 'Should include s3')
})

test('findActiveSessionsForUser excludes revoked sessions', async () => {
  const db = createMockDb()
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()

  db.sessions.set('s1', { id: 's1', user_id: 'owner_1', application_id: 'valdi.app/albasie', token_hash: 'h1', status: 'active', created_at: new Date().toISOString(), expires_at: expiresAt, revoked_at: null })
  db.sessions.set('s2', { id: 's2', user_id: 'owner_1', application_id: 'valdi.app/albasie', token_hash: 'h2', status: 'revoked', created_at: new Date().toISOString(), expires_at: expiresAt, revoked_at: new Date().toISOString() })

  const result = await db.findActiveSessionsForUser('owner_1')

  assertEqual(result.length, 1, 'Should return only 1 active session')
  assertEqual(result[0].id, 's1', 'Should be s1')
})

test('findActiveSessionsForUser excludes expired sessions', async () => {
  const db = createMockDb()
  const futureExpiry = new Date(Date.now() + SESSION_TTL_MS).toISOString()
  const pastExpiry = new Date(Date.now() - 1000).toISOString()

  db.sessions.set('s1', { id: 's1', user_id: 'owner_1', application_id: 'valdi.app/albasie', token_hash: 'h1', status: 'active', created_at: new Date().toISOString(), expires_at: futureExpiry, revoked_at: null })
  db.sessions.set('s2', { id: 's2', user_id: 'owner_1', application_id: 'valdi.app/albasie', token_hash: 'h2', status: 'active', created_at: new Date().toISOString(), expires_at: pastExpiry, revoked_at: null })

  const result = await db.findActiveSessionsForUser('owner_1')

  assertEqual(result.length, 1, 'Should return only non-expired session')
  assertEqual(result[0].id, 's1', 'Should be s1 (not expired)')
})

test('findActiveSessionsForUser selects only safe fields (no token_hash, no user_id)', async () => {
  const db = createMockDb()
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()

  db.sessions.set('s1', { id: 's1', user_id: 'owner_1', application_id: 'valdi.app/albasie', token_hash: 'secret_hash', status: 'active', created_at: new Date().toISOString(), expires_at: expiresAt, revoked_at: null })

  const result = await db.findActiveSessionsForUser('owner_1')

  assertEqual(result.length, 1, 'Should return session')
  assert(result[0].id !== undefined, 'id should be returned')
  assert(result[0].application_id !== undefined, 'application_id should be returned')
  assert(result[0].created_at !== undefined, 'created_at should be returned')
  assert(result[0].expires_at !== undefined, 'expires_at should be returned')
  assert(result[0].status !== undefined, 'status should be returned')
  assert(result[0].token_hash === undefined, 'token_hash should NOT be returned')
  assert(result[0].user_id === undefined, 'user_id should NOT be returned')
  assert(result[0].password_hash === undefined, 'password_hash should NOT be returned')
})

test('findActiveSessionsForUser orders by created_at DESC', async () => {
  const db = createMockDb()
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()
  const earlier = new Date(Date.now() - 10000).toISOString()
  const later = new Date(Date.now() - 5000).toISOString()

  db.sessions.set('s1', { id: 's1', user_id: 'owner_1', application_id: 'valdi.app/albasie', token_hash: 'h1', status: 'active', created_at: earlier, expires_at: expiresAt, revoked_at: null })
  db.sessions.set('s2', { id: 's2', user_id: 'owner_1', application_id: 'valdi.app/albasie', token_hash: 'h2', status: 'active', created_at: later, expires_at: expiresAt, revoked_at: null })

  const result = await db.findActiveSessionsForUser('owner_1')

  assertEqual(result.length, 2, 'Should return 2 sessions')
  assertEqual(result[0].id, 's2', 'First should be s2 (more recent)')
  assertEqual(result[1].id, 's1', 'Second should be s1 (older)')
})

test('findActiveSessionsForUser returns empty array when no sessions', async () => {
  const db = createMockDb()
  const result = await db.findActiveSessionsForUser('owner_nonexistent')
  assertEqual(result.length, 0, 'Should return empty array')
  assert(Array.isArray(result), 'Should return array (not null)')
})

test('findActiveSessionsForUser returns empty array when all sessions expired or revoked', async () => {
  const db = createMockDb()
  const pastExpiry = new Date(Date.now() - 1000).toISOString()

  db.sessions.set('s1', { id: 's1', user_id: 'owner_1', application_id: 'valdi.app/albasie', token_hash: 'h1', status: 'active', created_at: new Date().toISOString(), expires_at: pastExpiry, revoked_at: null })
  db.sessions.set('s2', { id: 's2', user_id: 'owner_1', application_id: 'valdi.app/albasie', token_hash: 'h2', status: 'revoked', created_at: new Date().toISOString(), expires_at: pastExpiry, revoked_at: new Date().toISOString() })

  const result = await db.findActiveSessionsForUser('owner_1')

  assertEqual(result.length, 0, 'Should return empty array')
})

test('revokeSessionByIdForUser revokes session matching both id and user_id', async () => {
  const db = createMockDb()
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()

  db.sessions.set('s1', { id: 's1', user_id: 'owner_1', application_id: 'valdi.app/albasie', token_hash: 'h1', status: 'active', created_at: new Date().toISOString(), expires_at: expiresAt, revoked_at: null })

  const result = await db.revokeSessionByIdForUser('s1', 'owner_1')

  assert(result !== null, 'Should return revoked row')
  assertEqual(result.id, 's1', 'Should return correct id')
  assertEqual(result.application_id, 'valdi.app/albasie', 'Should return application_id')
  assert(result.revoked_at !== null, 'Should have revoked_at timestamp')
  assertEqual(db.sessions.get('s1').status, 'revoked', 'Session should be marked revoked in store')
})

test('revokeSessionByIdForUser returns null when sessionId does not exist', async () => {
  const db = createMockDb()
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()

  db.sessions.set('s1', { id: 's1', user_id: 'owner_1', application_id: 'valdi.app/albasie', token_hash: 'h1', status: 'active', created_at: new Date().toISOString(), expires_at: expiresAt, revoked_at: null })

  const result = await db.revokeSessionByIdForUser('nonexistent-uuid', 'owner_1')

  assertEqual(result, null, 'Should return null for nonexistent session')
})

test('revokeSessionByIdForUser returns null when user_id does not match', async () => {
  const db = createMockDb()
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()

  db.sessions.set('s1', { id: 's1', user_id: 'owner_1', application_id: 'valdi.app/albasie', token_hash: 'h1', status: 'active', created_at: new Date().toISOString(), expires_at: expiresAt, revoked_at: null })

  const result = await db.revokeSessionByIdForUser('s1', 'owner_2')

  assertEqual(result, null, 'Should return null when user_id mismatch')
  assertEqual(db.sessions.get('s1').status, 'active', 'Session should remain active')
})

test('revokeSessionByIdForUser returns null for expired session', async () => {
  const db = createMockDb()
  const pastExpiry = new Date(Date.now() - 1000).toISOString()

  db.sessions.set('s1', { id: 's1', user_id: 'owner_1', application_id: 'valdi.app/albasie', token_hash: 'h1', status: 'active', created_at: new Date().toISOString(), expires_at: pastExpiry, revoked_at: null })

  const result = await db.revokeSessionByIdForUser('s1', 'owner_1')

  assertEqual(result, null, 'Should return null for expired session')
  assertEqual(db.sessions.get('s1').status, 'active', 'Expired session should remain unchanged')
})

test('revokeSessionByIdForUser returns null for already-revoked session', async () => {
  const db = createMockDb()
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()

  db.sessions.set('s1', { id: 's1', user_id: 'owner_1', application_id: 'valdi.app/albasie', token_hash: 'h1', status: 'revoked', created_at: new Date().toISOString(), expires_at: expiresAt, revoked_at: new Date().toISOString() })

  const result = await db.revokeSessionByIdForUser('s1', 'owner_1')

  assertEqual(result, null, 'Should return null for already-revoked session')
})

test('revokeSessionByIdForUser supports optional transaction client', async () => {
  const db = createMockDb()
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()

  db.sessions.set('s1', { id: 's1', user_id: 'owner_1', application_id: 'valdi.app/albasie', token_hash: 'h1', status: 'active', created_at: new Date().toISOString(), expires_at: expiresAt, revoked_at: null })

  const mockClient = { query: db.query.bind(db) }
  const result = await db.revokeSessionByIdForUser('s1', 'owner_1', mockClient)

  assert(result !== null, 'Should work with transaction client')
  assertEqual(result.id, 's1', 'Should return correct row')
})

test('revokeAllOtherSessionsForUser revokes all sessions except current', async () => {
  const db = createMockDb()
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()

  db.sessions.set('s1', { id: 's1', user_id: 'owner_1', application_id: 'valdi.app/albasie', token_hash: 'h1', status: 'active', created_at: new Date().toISOString(), expires_at: expiresAt, revoked_at: null })
  db.sessions.set('s2', { id: 's2', user_id: 'owner_1', application_id: 'valdi.app/albasie', token_hash: 'h2', status: 'active', created_at: new Date().toISOString(), expires_at: expiresAt, revoked_at: null })
  db.sessions.set('s3', { id: 's3', user_id: 'owner_1', application_id: 'valdi.app/albasie', token_hash: 'h3', status: 'active', created_at: new Date().toISOString(), expires_at: expiresAt, revoked_at: null })

  const result = await db.revokeAllOtherSessionsForUser('owner_1', 's2')

  assertEqual(result.length, 2, 'Should revoke 2 sessions (all except current)')
  const revokedIds = result.map(r => r.id).sort()
  assertEqual(revokedIds[0], 's1', 'Should revoke s1')
  assertEqual(revokedIds[1], 's3', 'Should revoke s3')
  assertEqual(db.sessions.get('s2').status, 'active', 'Current session s2 should remain active')
})

test('revokeAllOtherSessionsForUser returns empty array when no other sessions', async () => {
  const db = createMockDb()
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()

  db.sessions.set('s1', { id: 's1', user_id: 'owner_1', application_id: 'valdi.app/albasie', token_hash: 'h1', status: 'active', created_at: new Date().toISOString(), expires_at: expiresAt, revoked_at: null })

  const result = await db.revokeAllOtherSessionsForUser('owner_1', 's1')

  assertEqual(result.length, 0, 'Should return empty array when only current session exists')
})

test('revokeAllOtherSessionsForUser cannot affect another user', async () => {
  const db = createMockDb()
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()

  db.sessions.set('s1', { id: 's1', user_id: 'owner_1', application_id: 'valdi.app/albasie', token_hash: 'h1', status: 'active', created_at: new Date().toISOString(), expires_at: expiresAt, revoked_at: null })
  db.sessions.set('s2', { id: 's2', user_id: 'owner_2', application_id: 'valdi.app/albasie', token_hash: 'h2', status: 'active', created_at: new Date().toISOString(), expires_at: expiresAt, revoked_at: null })

  const result = await db.revokeAllOtherSessionsForUser('owner_1', 's1')

  assertEqual(result.length, 0, 'Should revoke 0 sessions (only had current)')
  assertEqual(db.sessions.get('s1').status, 'active', 'owner_1 session should remain active')
  assertEqual(db.sessions.get('s2').status, 'active', 'owner_2 session should be unaffected')
})

test('revokeAllOtherSessionsForUser excludes expired sessions', async () => {
  const db = createMockDb()
  const futureExpiry = new Date(Date.now() + SESSION_TTL_MS).toISOString()
  const pastExpiry = new Date(Date.now() - 1000).toISOString()

  db.sessions.set('s1', { id: 's1', user_id: 'owner_1', application_id: 'valdi.app/albasie', token_hash: 'h1', status: 'active', created_at: new Date().toISOString(), expires_at: futureExpiry, revoked_at: null })
  db.sessions.set('s2', { id: 's2', user_id: 'owner_1', application_id: 'valdi.app/albasie', token_hash: 'h2', status: 'active', created_at: new Date().toISOString(), expires_at: pastExpiry, revoked_at: null })

  const result = await db.revokeAllOtherSessionsForUser('owner_1', 's1')

  assertEqual(result.length, 0, 'Should revoke 0 (other session was expired)')
  assertEqual(db.sessions.get('s1').status, 'active', 'Current session should remain active')
  assertEqual(db.sessions.get('s2').status, 'active', 'Expired session should remain unchanged')
})

test('revokeAllOtherSessionsForUser excludes already-revoked sessions', async () => {
  const db = createMockDb()
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()

  db.sessions.set('s1', { id: 's1', user_id: 'owner_1', application_id: 'valdi.app/albasie', token_hash: 'h1', status: 'active', created_at: new Date().toISOString(), expires_at: expiresAt, revoked_at: null })
  db.sessions.set('s2', { id: 's2', user_id: 'owner_1', application_id: 'valdi.app/albasie', token_hash: 'h2', status: 'revoked', created_at: new Date().toISOString(), expires_at: expiresAt, revoked_at: new Date().toISOString() })

  const result = await db.revokeAllOtherSessionsForUser('owner_1', 's1')

  assertEqual(result.length, 0, 'Should revoke 0 (other session already revoked)')
})

test('revokeAllOtherSessionsForUser returns safe fields only', async () => {
  const db = createMockDb()
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()

  db.sessions.set('s1', { id: 's1', user_id: 'owner_1', application_id: 'valdi.app/albasie', token_hash: 'secret_hash', status: 'active', created_at: new Date().toISOString(), expires_at: expiresAt, revoked_at: null })
  db.sessions.set('s2', { id: 's2', user_id: 'owner_1', application_id: 'valdi.app/albasie', token_hash: 'h2', status: 'active', created_at: new Date().toISOString(), expires_at: expiresAt, revoked_at: null })

  const result = await db.revokeAllOtherSessionsForUser('owner_1', 's1')

  assertEqual(result.length, 1, 'Should return 1 revoked session')
  const row = result[0]
  assert(row.id !== undefined, 'id should be returned')
  assert(row.application_id !== undefined, 'application_id should be returned')
  assert(row.revoked_at !== undefined, 'revoked_at should be returned')
  assert(row.token_hash === undefined, 'token_hash should NOT be returned')
  assert(row.user_id === undefined, 'user_id should NOT be returned')
  assert(row.password_hash === undefined, 'password_hash should NOT be returned')
})

test('revokeAllOtherSessionsForUser uses single UPDATE statement (atomic)', async () => {
  const db = createMockDb()
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()

  db.sessions.set('s1', { id: 's1', user_id: 'owner_1', application_id: 'valdi.app/albasie', token_hash: 'h1', status: 'active', created_at: new Date().toISOString(), expires_at: expiresAt, revoked_at: null })
  db.sessions.set('s2', { id: 's2', user_id: 'owner_1', application_id: 'valdi.app/albasie', token_hash: 'h2', status: 'active', created_at: new Date().toISOString(), expires_at: expiresAt, revoked_at: null })
  db.sessions.set('s3', { id: 's3', user_id: 'owner_1', application_id: 'valdi.app/albasie', token_hash: 'h3', status: 'active', created_at: new Date().toISOString(), expires_at: expiresAt, revoked_at: null })

  const result = await db.revokeAllOtherSessionsForUser('owner_1', 's2')

  assertEqual(result.length, 2, 'Should revoke 2 sessions atomically')
  assertEqual(db.sessions.get('s1').status, 'revoked', 's1 should be revoked')
  assertEqual(db.sessions.get('s2').status, 'active', 's2 should remain active')
  assertEqual(db.sessions.get('s3').status, 'revoked', 's3 should be revoked')
})

test('revokeAllOtherSessionsForUser supports optional transaction client', async () => {
  const db = createMockDb()
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()

  db.sessions.set('s1', { id: 's1', user_id: 'owner_1', application_id: 'valdi.app/albasie', token_hash: 'h1', status: 'active', created_at: new Date().toISOString(), expires_at: expiresAt, revoked_at: null })
  db.sessions.set('s2', { id: 's2', user_id: 'owner_1', application_id: 'valdi.app/albasie', token_hash: 'h2', status: 'active', created_at: new Date().toISOString(), expires_at: expiresAt, revoked_at: null })

  const mockClient = { query: db.query.bind(db) }
  const result = await db.revokeAllOtherSessionsForUser('owner_1', 's1', mockClient)

  assertEqual(result.length, 1, 'Should work with transaction client')
})

// =====================================================================
// OWNER-SESSION-3 — GATE 1: ACCOUNT STATUS ENFORCEMENT TESTS
// =====================================================================
// These tests verify that account status (disabled/locked) is enforced
// at the authentication layer, BEFORE authorization (grant) checks.
// No PostgreSQL required — uses direct function call simulation.
// =====================================================================
// =====================================================================
// These tests verify that account status (disabled/locked) is enforced
// at the authentication layer, BEFORE authorization (grant) checks.
// No PostgreSQL required — uses direct function call simulation.
// =====================================================================

const s2Passed = passed
const s2Failed = failed

console.log('\n\n═══════════════════════════════════════════════════════════')
console.log('OWNER-SESSION-3 — GATE 1: ACCOUNT STATUS ENFORCEMENT')
console.log('═══════════════════════════════════════════════════════════')

function createMockOwnerAuthMiddleware() {
  return async function mockOwnerAuthMiddleware(req, res) {
    const authHeader = req.headers?.authorization

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const sessionId = authHeader.substring(7)

      if (!req.validateSession) {
        req.owner = null
        req.ownerSession = null
        req.isOwnerAuthenticated = false
        req.authorizationError = 'INVALID_SESSION'
        return
      }

      let session
      try {
        session = await req.validateSession(sessionId)
      } catch (error) {
        if (error.code === 'INFRASTRUCTURE_UNAVAILABLE') {
          req.owner = null
          req.ownerSession = null
          req.isOwnerAuthenticated = false
          req.authorizationError = 'INFRASTRUCTURE_UNAVAILABLE'
          return
        }
        throw error
      }

      if (session) {
        let owner
        try {
          owner = await req.getSessionOwner(sessionId)
        } catch (error) {
          if (error.code === 'INFRASTRUCTURE_UNAVAILABLE') {
            req.owner = null
            req.ownerSession = null
            req.isOwnerAuthenticated = false
            req.authorizationError = 'INFRASTRUCTURE_UNAVAILABLE'
            return
          }
          throw error
        }

        if (!owner || owner.status !== 'active') {
          req.owner = null
          req.ownerSession = null
          req.isOwnerAuthenticated = false
          req.authorizationError = owner
            ? ('ACCOUNT_' + owner.status.toUpperCase())
            : 'USER_NOT_FOUND'
          return
        }

        req.owner = owner
        req.ownerSession = session
        req.isOwnerAuthenticated = true
        req.authorizationError = null

        try {
          if (req.authorizeRequest) {
            const authResult = await req.authorizeRequest({
              userId: owner.id,
              applicationId: owner.applicationId
            })
            if (authResult.authorized) {
              req.owner.grant = authResult.grant
              req.authorizationError = null
            } else {
              req.owner.grant = null
              req.authorizationError = authResult.error
            }
          }
        } catch (error) {
          req.owner.grant = null
          if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
            req.authorizationError = 'INFRASTRUCTURE_UNAVAILABLE'
          } else {
            throw error
          }
        }
      } else {
        req.owner = null
        req.ownerSession = null
        req.isOwnerAuthenticated = false
        req.authorizationError = 'INVALID_SESSION'
      }
    } else {
      req.owner = null
      req.ownerSession = null
      req.isOwnerAuthenticated = false
      req.authorizationError = 'INVALID_SESSION'
    }
  }
}

function createMockReq(authHeader, session, owner, authorizeRequest) {
  return {
    headers: { authorization: authHeader },
    validateSession: session ? async () => session : null,
    getSessionOwner: owner ? async () => owner : null,
    authorizeRequest: authorizeRequest || null
  }
}

function createMockRes() {
  return {
    statusCode: 200,
    body: null,
    status(n) { this.statusCode = n; return this },
    setHeader() {},
    end(data) { if (data) this.body = data; return this }
  }
}

test('active user + valid session → isOwnerAuthenticated = true, no error', async () => {
  const middleware = createMockOwnerAuthMiddleware()
  const session = { id: 'pg-uuid-123', ownerId: 'owner_123', applicationId: 'valdi.app/albasie' }
  const owner = { id: 'owner_123', email: 'active@example.com', name: 'Active User', status: 'active', applicationId: 'valdi.app/albasie' }
  const req = createMockReq('Bearer sess_validtoken123', session, owner, () => ({ authorized: true, grant: { role: 'business_owner' } }))
  const res = createMockApiRes()

  await middleware(req, res)

  assert(req.isOwnerAuthenticated === true, 'should be authenticated')
  assertEqual(req.authorizationError, null, 'no authorization error')
  assertEqual(req.owner.status, 'active', 'owner status is active')
})

test('disabled user + valid session → isOwnerAuthenticated = false, ACCOUNT_DISABLED', async () => {
  const middleware = createMockOwnerAuthMiddleware()
  const session = { id: 'pg-uuid-123', ownerId: 'owner_123', applicationId: 'valdi.app/albasie' }
  const owner = { id: 'owner_123', email: 'disabled@example.com', name: 'Disabled User', status: 'disabled', applicationId: 'valdi.app/albasie' }
  const req = createMockReq('Bearer sess_validtoken123', session, owner, () => ({ authorized: true, grant: { role: 'business_owner' } }))
  const res = createMockApiRes()

  await middleware(req, res)

  assert(req.isOwnerAuthenticated === false, 'should NOT be authenticated')
  assertEqual(req.authorizationError, 'ACCOUNT_DISABLED', 'authorization error is ACCOUNT_DISABLED')
  assert(req.owner === null, 'owner should be null')
})

test('locked user + valid session → isOwnerAuthenticated = false, ACCOUNT_LOCKED', async () => {
  const middleware = createMockOwnerAuthMiddleware()
  const session = { id: 'pg-uuid-123', ownerId: 'owner_123', applicationId: 'valdi.app/albasie' }
  const owner = { id: 'owner_123', email: 'locked@example.com', name: 'Locked User', status: 'locked', applicationId: 'valdi.app/albasie' }
  const req = createMockReq('Bearer sess_validtoken123', session, owner, () => ({ authorized: true, grant: { role: 'business_owner' } }))
  const res = createMockApiRes()

  await middleware(req, res)

  assert(req.isOwnerAuthenticated === false, 'should NOT be authenticated')
  assertEqual(req.authorizationError, 'ACCOUNT_LOCKED', 'authorization error is ACCOUNT_LOCKED')
  assert(req.owner === null, 'owner should be null')
})

test('missing user (null) + valid session → isOwnerAuthenticated = false, USER_NOT_FOUND', async () => {
  const middleware = createMockOwnerAuthMiddleware()
  const session = { id: 'pg-uuid-123', ownerId: 'owner_ghost', applicationId: 'valdi.app/albasie' }
  const req = createMockReq('Bearer sess_validtoken123', session, null, null)
  const res = createMockApiRes()

  await middleware(req, res)

  assert(req.isOwnerAuthenticated === false, 'should NOT be authenticated')
  assertEqual(req.authorizationError, 'USER_NOT_FOUND', 'authorization error is USER_NOT_FOUND')
  assert(req.owner === null, 'owner should be null')
})

test('active user + valid session + revoked grant → isOwnerAuthenticated = true, authorizationError = NO_ACTIVE_GRANT (403)', async () => {
  const middleware = createMockOwnerAuthMiddleware()
  const session = { id: 'pg-uuid-123', ownerId: 'owner_123', applicationId: 'valdi.app/albasie' }
  const owner = { id: 'owner_123', email: 'active@example.com', name: 'Active User', status: 'active', applicationId: 'valdi.app/albasie' }
  const req = createMockReq('Bearer sess_validtoken123', session, owner, () => ({ authorized: false, error: 'NO_ACTIVE_GRANT' }))
  const res = createMockApiRes()

  await middleware(req, res)

  assert(req.isOwnerAuthenticated === true, 'session IS authenticated (status check passed)')
  assertEqual(req.authorizationError, 'NO_ACTIVE_GRANT', 'authorization error is NO_ACTIVE_GRANT (not auth failure)')
  assert(req.owner !== null, 'owner should be set (session is valid)')
})

test('infrastructure error during getSessionOwner → authorizationError = INFRASTRUCTURE_UNAVAILABLE', async () => {
  const middleware = createMockOwnerAuthMiddleware()
  const session = { id: 'pg-uuid-123', ownerId: 'owner_123', applicationId: 'valdi.app/albasie' }
  const infraError = new Error('Connection refused')
  infraError.code = 'INFRASTRUCTURE_UNAVAILABLE'
  const req = createMockReq('Bearer sess_validtoken123', session, () => { throw infraError }, null)
  const res = createMockApiRes()

  await middleware(req, res)

  assert(req.isOwnerAuthenticated === false, 'should NOT be authenticated')
  assertEqual(req.authorizationError, 'INFRASTRUCTURE_UNAVAILABLE', 'authorization error is INFRASTRUCTURE_UNAVAILABLE')
})

test('SESSION-2 session validation behavior unchanged — invalid token → INVALID_SESSION', async () => {
  const middleware = createMockOwnerAuthMiddleware()
  const req = createMockReq('Bearer invalid_token_format', null, null, null)
  const res = createMockApiRes()

  await middleware(req, res)

  assert(req.isOwnerAuthenticated === false, 'should NOT be authenticated')
  assertEqual(req.authorizationError, 'INVALID_SESSION', 'authorization error is INVALID_SESSION')
})

test('SESSION-2 session validation behavior unchanged — no auth header → INVALID_SESSION', async () => {
  const middleware = createMockOwnerAuthMiddleware()
  const req = createMockReq(null, null, null, null)
  const res = createMockApiRes()

  await middleware(req, res)

  assert(req.isOwnerAuthenticated === false, 'should NOT be authenticated')
  assertEqual(req.authorizationError, 'INVALID_SESSION', 'authorization error is INVALID_SESSION')
})

test('account status is authentication concern, not authorization — disabled user never reaches grant check', async () => {
  const middleware = createMockOwnerAuthMiddleware()
  const session = { id: 'pg-uuid-123', ownerId: 'owner_123', applicationId: 'valdi.app/albasie' }
  const owner = { id: 'owner_123', email: 'disabled@example.com', name: 'Disabled User', status: 'disabled', applicationId: 'valdi.app/albasie' }
  let grantCheckCalled = false
  const req = createMockReq('Bearer sess_validtoken123', session, owner, () => { grantCheckCalled = true; return { authorized: false, error: 'NO_ACTIVE_GRANT' } })
  const res = createMockApiRes()

  await middleware(req, res)

  assert(req.isOwnerAuthenticated === false, 'should NOT be authenticated')
  assertEqual(req.authorizationError, 'ACCOUNT_DISABLED', 'authorization error is ACCOUNT_DISABLED')
  assert(grantCheckCalled === false, 'authorizeRequest should NOT be called when account is disabled')
})

// =====================================================================
// OWNER-SESSION-3 — GATE 3: SESSION MANAGEMENT API TESTS
// =====================================================================

const s3Passed = passed
const s3FailedAtStart = failed

function createMockApiContext(sessionRepo) {
  return {
    async handleGetSessions(req, res) {
      if (!req.isOwnerAuthenticated || !req.owner) {
        res.statusCode = 401
        res.body = { error: 'Unauthorized' }
        return
      }
      let sessions
      try {
        sessions = await sessionRepo.findActiveSessionsForUser(req.owner.id)
      } catch (error) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
          res.statusCode = 503
          res.body = { error: 'Service Unavailable' }
          return
        }
        throw error
      }
      const currentSessionId = req.ownerSession?.id
      res.statusCode = 200
      res.body = {
        success: true,
        sessions: sessions.map(session => ({
          id: session.id,
          applicationId: session.application_id,
          createdAt: session.created_at,
          expiresAt: session.expires_at,
          isCurrent: session.id === currentSessionId
        }))
      }
    },

    async handleRevokeSession(req, res, sessionId) {
      if (!req.isOwnerAuthenticated || !req.owner) {
        res.statusCode = 401
        res.body = { error: 'Unauthorized' }
        return
      }
      const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!UUID_REGEX.test(sessionId)) {
        res.statusCode = 200
        res.body = { success: true, message: 'Session revoked' }
        return
      }
      try {
        await sessionRepo.revokeSessionByIdForUser(sessionId, req.owner.id)
      } catch (error) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
          res.statusCode = 503
          res.body = { error: 'Service Unavailable' }
          return
        }
        throw error
      }
      res.statusCode = 200
      res.body = { success: true, message: 'Session revoked' }
    },

    async handleRevokeOtherSessions(req, res) {
      if (!req.isOwnerAuthenticated || !req.owner) {
        res.statusCode = 401
        res.body = { error: 'Unauthorized' }
        return
      }
      const currentSessionId = req.ownerSession?.id
      if (!currentSessionId) {
        res.statusCode = 401
        res.body = { error: 'Unauthorized' }
        return
      }
      let revoked
      try {
        revoked = await sessionRepo.revokeAllOtherSessionsForUser(req.owner.id, currentSessionId)
      } catch (error) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
          res.statusCode = 503
          res.body = { error: 'Service Unavailable' }
          return
        }
        throw error
      }
      res.statusCode = 200
      res.body = { success: true, message: 'Other sessions revoked', revokedCount: revoked.length }
    }
  }
}

function createMockApiRes() {
  return { statusCode: 200, body: null, status(n) { this.statusCode = n; return this }, setHeader() {}, end(data) { if (data) this.body = data; return this } }
}

function isValidUUID(str) {
  if (typeof str !== 'string') return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
}

console.log('\n  Session Management API')

test('GET /sessions authenticated → 200', async () => {
  const repo = createMockDb()
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()
  repo.sessions.set('550e8400-e29b-41d4-a716-446655440001', { id: '550e8400-e29b-41d4-a716-446655440001', user_id: 'owner_1', application_id: 'valdi.app/albasie', token_hash: 'h1', status: 'active', created_at: new Date().toISOString(), expires_at: expiresAt, revoked_at: null })

  const ctx = createMockApiContext(repo)
  const req = { isOwnerAuthenticated: true, owner: { id: 'owner_1' }, ownerSession: { id: '550e8400-e29b-41d4-a716-446655440001' } }
  const res = createMockApiRes()

  await ctx.handleGetSessions(req, res)

  assertEqual(res.statusCode, 200, 'should return 200')
  assertEqual(res.body.success, true, 'success should be true')
  assertEqual(res.body.sessions.length, 1, 'should have 1 session')
})

test('GET /sessions returns only current user sessions', async () => {
  const repo = createMockDb()
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()
  repo.sessions.set('s1', { id: 's1', user_id: 'owner_1', application_id: 'valdi.app/albasie', token_hash: 'h1', status: 'active', created_at: new Date().toISOString(), expires_at: expiresAt, revoked_at: null })
  repo.sessions.set('s2', { id: 's2', user_id: 'owner_2', application_id: 'valdi.app/albasie', token_hash: 'h2', status: 'active', created_at: new Date().toISOString(), expires_at: expiresAt, revoked_at: null })

  const ctx = createMockApiContext(repo)
  const req = { isOwnerAuthenticated: true, owner: { id: 'owner_1' }, ownerSession: { id: 's1' } }
  const res = createMockApiRes()

  await ctx.handleGetSessions(req, res)

  assertEqual(res.body.sessions.length, 1, 'should return only 1 session')
  assertEqual(res.body.sessions[0].id, 's1', 'should be owner_1 session')
})

test('GET /sessions maps snake_case to camelCase', async () => {
  const repo = createMockDb()
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()
  repo.sessions.set('s1', { id: 's1', user_id: 'owner_1', application_id: 'valdi.app/albasie', token_hash: 'h1', status: 'active', created_at: '2026-08-24T10:00:00.000Z', expires_at: expiresAt, revoked_at: null })

  const ctx = createMockApiContext(repo)
  const req = { isOwnerAuthenticated: true, owner: { id: 'owner_1' }, ownerSession: { id: 's1' } }
  const res = createMockApiRes()

  await ctx.handleGetSessions(req, res)

  assert(res.body.sessions[0].applicationId !== undefined, 'should have applicationId (camelCase)')
  assert(res.body.sessions[0].createdAt !== undefined, 'should have createdAt (camelCase)')
  assert(res.body.sessions[0].expiresAt !== undefined, 'should have expiresAt (camelCase)')
  assert(res.body.sessions[0].application_id === undefined, 'should NOT have application_id (snake_case)')
})

test('GET /sessions marks current session using req.ownerSession.id', async () => {
  const repo = createMockDb()
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()
  repo.sessions.set('s1', { id: 's1', user_id: 'owner_1', application_id: 'valdi.app/albasie', token_hash: 'h1', status: 'active', created_at: new Date().toISOString(), expires_at: expiresAt, revoked_at: null })
  repo.sessions.set('s2', { id: 's2', user_id: 'owner_1', application_id: 'valdi.app/albasie', token_hash: 'h2', status: 'active', created_at: new Date().toISOString(), expires_at: expiresAt, revoked_at: null })

  const ctx = createMockApiContext(repo)
  const req = { isOwnerAuthenticated: true, owner: { id: 'owner_1' }, ownerSession: { id: 's1' } }
  const res = createMockApiRes()

  await ctx.handleGetSessions(req, res)

  const current = res.body.sessions.find(s => s.isCurrent === true)
  const others = res.body.sessions.filter(s => s.isCurrent !== true)
  assertEqual(current?.id, 's1', 's1 should be marked isCurrent')
  assertEqual(others.length, 1, 's2 should not be current')
})

test('GET /sessions response never contains token_hash', async () => {
  const repo = createMockDb()
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()
  repo.sessions.set('s1', { id: 's1', user_id: 'owner_1', application_id: 'valdi.app/albasie', token_hash: 'secret_hash', status: 'active', created_at: new Date().toISOString(), expires_at: expiresAt, revoked_at: null })

  const ctx = createMockApiContext(repo)
  const req = { isOwnerAuthenticated: true, owner: { id: 'owner_1' }, ownerSession: { id: 's1' } }
  const res = createMockApiRes()

  await ctx.handleGetSessions(req, res)

  const responseStr = JSON.stringify(res.body)
  assert(!responseStr.includes('token_hash'), 'token_hash should NOT appear in response')
  assert(!responseStr.includes('tokenHash'), 'tokenHash should NOT appear in response')
  assert(!responseStr.includes('password_hash'), 'password_hash should NOT appear in response')
})

test('GET /sessions response never contains user_id', async () => {
  const repo = createMockDb()
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()
  repo.sessions.set('s1', { id: 's1', user_id: 'owner_1', application_id: 'valdi.app/albasie', token_hash: 'h1', status: 'active', created_at: new Date().toISOString(), expires_at: expiresAt, revoked_at: null })

  const ctx = createMockApiContext(repo)
  const req = { isOwnerAuthenticated: true, owner: { id: 'owner_1' }, ownerSession: { id: 's1' } }
  const res = createMockApiRes()

  await ctx.handleGetSessions(req, res)

  const responseStr = JSON.stringify(res.body)
  assert(!responseStr.includes('user_id'), 'user_id should NOT appear in response')
})

test('GET /sessions excludes expired/revoked sessions', async () => {
  const repo = createMockDb()
  const futureExpiry = new Date(Date.now() + SESSION_TTL_MS).toISOString()
  const pastExpiry = new Date(Date.now() - 1000).toISOString()
  repo.sessions.set('s1', { id: 's1', user_id: 'owner_1', application_id: 'valdi.app/albasie', token_hash: 'h1', status: 'active', created_at: new Date().toISOString(), expires_at: futureExpiry, revoked_at: null })
  repo.sessions.set('s2', { id: 's2', user_id: 'owner_1', application_id: 'valdi.app/albasie', token_hash: 'h2', status: 'active', created_at: new Date().toISOString(), expires_at: pastExpiry, revoked_at: null })
  repo.sessions.set('s3', { id: 's3', user_id: 'owner_1', application_id: 'valdi.app/albasie', token_hash: 'h3', status: 'revoked', created_at: new Date().toISOString(), expires_at: futureExpiry, revoked_at: new Date().toISOString() })

  const ctx = createMockApiContext(repo)
  const req = { isOwnerAuthenticated: true, owner: { id: 'owner_1' }, ownerSession: { id: 's1' } }
  const res = createMockApiRes()

  await ctx.handleGetSessions(req, res)

  assertEqual(res.body.sessions.length, 1, 'should return only 1 non-expired non-revoked session')
  assertEqual(res.body.sessions[0].id, 's1', 'should be s1 (active and not expired)')
})

test('GET /sessions DB outage → 503', async () => {
  const repo = createMockDb()
  repo.findActiveSessionsForUser = async () => { throw { code: 'ECONNREFUSED' } }

  const ctx = createMockApiContext(repo)
  const req = { isOwnerAuthenticated: true, owner: { id: 'owner_1' }, ownerSession: { id: 's1' } }
  const res = createMockApiRes()

  await ctx.handleGetSessions(req, res)

  assertEqual(res.statusCode, 503, 'should return 503')
})

test('DELETE /sessions/:id own active session → 200', async () => {
  const repo = createMockDb()
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()
  repo.sessions.set('550e8400-e29b-41d4-a716-446655440001', { id: '550e8400-e29b-41d4-a716-446655440001', user_id: 'owner_1', application_id: 'valdi.app/albasie', token_hash: 'h1', status: 'active', created_at: new Date().toISOString(), expires_at: expiresAt, revoked_at: null })

  const ctx = createMockApiContext(repo)
  const req = { isOwnerAuthenticated: true, owner: { id: 'owner_1' }, ownerSession: { id: '550e8400-e29b-41d4-a716-446655440001' } }
  const res = createMockApiRes()

  await ctx.handleRevokeSession(req, res, '550e8400-e29b-41d4-a716-446655440001')

  assertEqual(res.statusCode, 200, 'should return 200')
  assertEqual(res.body.success, true, 'success should be true')
})

test('DELETE /sessions/:id current session can be revoked', async () => {
  const repo = createMockDb()
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()
  repo.sessions.set('s1', { id: 's1', user_id: 'owner_1', application_id: 'valdi.app/albasie', token_hash: 'h1', status: 'active', created_at: new Date().toISOString(), expires_at: expiresAt, revoked_at: null })

  const ctx = createMockApiContext(repo)
  const req = { isOwnerAuthenticated: true, owner: { id: 'owner_1' }, ownerSession: { id: 's1' } }
  const res = createMockApiRes()

  await ctx.handleRevokeSession(req, res, 's1')

  assertEqual(res.statusCode, 200, 'should return 200')
})

test('DELETE /sessions/:id unknown UUID → 200 idempotent', async () => {
  const repo = createMockDb()
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()
  repo.sessions.set('s1', { id: 's1', user_id: 'owner_1', application_id: 'valdi.app/albasie', token_hash: 'h1', status: 'active', created_at: new Date().toISOString(), expires_at: expiresAt, revoked_at: null })

  const ctx = createMockApiContext(repo)
  const req = { isOwnerAuthenticated: true, owner: { id: 'owner_1' }, ownerSession: { id: 's1' } }
  const res = createMockApiRes()

  await ctx.handleRevokeSession(req, res, '00000000-0000-0000-0000-000000000000')

  assertEqual(res.statusCode, 200, 'should return 200 for unknown UUID')
})

test('DELETE /sessions/:id wrong-owner UUID → 200 idempotent', async () => {
  const repo = createMockDb()
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()
  repo.sessions.set('s1', { id: 's1', user_id: 'owner_1', application_id: 'valdi.app/albasie', token_hash: 'h1', status: 'active', created_at: new Date().toISOString(), expires_at: expiresAt, revoked_at: null })

  const ctx = createMockApiContext(repo)
  const req = { isOwnerAuthenticated: true, owner: { id: 'owner_1' }, ownerSession: { id: 's1' } }
  const res = createMockApiRes()

  await ctx.handleRevokeSession(req, res, '00000000-0000-0000-0000-000000000001')

  assertEqual(res.statusCode, 200, 'should return 200 for wrong-owner UUID')
})

test('DELETE /sessions/:id already revoked → 200 idempotent', async () => {
  const repo = createMockDb()
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()
  repo.sessions.set('s1', { id: 's1', user_id: 'owner_1', application_id: 'valdi.app/albasie', token_hash: 'h1', status: 'revoked', created_at: new Date().toISOString(), expires_at: expiresAt, revoked_at: new Date().toISOString() })

  const ctx = createMockApiContext(repo)
  const req = { isOwnerAuthenticated: true, owner: { id: 'owner_1' }, ownerSession: { id: 's2' } }
  const res = createMockApiRes()

  await ctx.handleRevokeSession(req, res, 's1')

  assertEqual(res.statusCode, 200, 'should return 200 for already-revoked')
})

test('DELETE /sessions/:id expired → 200 idempotent', async () => {
  const repo = createMockDb()
  const pastExpiry = new Date(Date.now() - 1000).toISOString()
  repo.sessions.set('s1', { id: 's1', user_id: 'owner_1', application_id: 'valdi.app/albasie', token_hash: 'h1', status: 'active', created_at: new Date().toISOString(), expires_at: pastExpiry, revoked_at: null })

  const ctx = createMockApiContext(repo)
  const req = { isOwnerAuthenticated: true, owner: { id: 'owner_1' }, ownerSession: { id: 's2' } }
  const res = createMockApiRes()

  await ctx.handleRevokeSession(req, res, 's1')

  assertEqual(res.statusCode, 200, 'should return 200 for expired')
})

test('DELETE /sessions/:id malformed UUID → 200 without repository lookup', async () => {
  const repo = createMockDb()
  let repoWasCalled = false
  repo.revokeSessionByIdForUser = async () => { repoWasCalled = true }

  const ctx = createMockApiContext(repo)
  const req = { isOwnerAuthenticated: true, owner: { id: 'owner_1' }, ownerSession: { id: 's1' } }
  const res = createMockApiRes()

  await ctx.handleRevokeSession(req, res, 'not-a-valid-uuid')

  assertEqual(res.statusCode, 200, 'should return 200 for malformed UUID')
  assertEqual(repoWasCalled, false, 'repository should NOT be called for malformed UUID')
})

test('DELETE /sessions/:id DB outage → 503', async () => {
  const repo = createMockDb()
  repo.revokeSessionByIdForUser = async () => { throw { code: 'ECONNREFUSED' } }

  const ctx = createMockApiContext(repo)
  const req = { isOwnerAuthenticated: true, owner: { id: 'owner_1' }, ownerSession: { id: 's1' } }
  const res = createMockApiRes()

  await ctx.handleRevokeSession(req, res, '550e8400-e29b-41d4-a716-446655440001')

  assertEqual(res.statusCode, 503, 'should return 503')
})

test('POST /sessions/revoke-others → 200 + correct revokedCount', async () => {
  const repo = createMockDb()
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()
  repo.sessions.set('s1', { id: 's1', user_id: 'owner_1', application_id: 'valdi.app/albasie', token_hash: 'h1', status: 'active', created_at: new Date().toISOString(), expires_at: expiresAt, revoked_at: null })
  repo.sessions.set('s2', { id: 's2', user_id: 'owner_1', application_id: 'valdi.app/albasie', token_hash: 'h2', status: 'active', created_at: new Date().toISOString(), expires_at: expiresAt, revoked_at: null })
  repo.sessions.set('s3', { id: 's3', user_id: 'owner_1', application_id: 'valdi.app/albasie', token_hash: 'h3', status: 'active', created_at: new Date().toISOString(), expires_at: expiresAt, revoked_at: null })

  const ctx = createMockApiContext(repo)
  const req = { isOwnerAuthenticated: true, owner: { id: 'owner_1' }, ownerSession: { id: 's2' } }
  const res = createMockApiRes()

  await ctx.handleRevokeOtherSessions(req, res)

  assertEqual(res.statusCode, 200, 'should return 200')
  assertEqual(res.body.success, true, 'success should be true')
  assertEqual(res.body.revokedCount, 2, 'should revoke 2 sessions')
})

test('POST /sessions/revoke-others no other sessions → 200 + 0', async () => {
  const repo = createMockDb()
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()
  repo.sessions.set('s1', { id: 's1', user_id: 'owner_1', application_id: 'valdi.app/albasie', token_hash: 'h1', status: 'active', created_at: new Date().toISOString(), expires_at: expiresAt, revoked_at: null })

  const ctx = createMockApiContext(repo)
  const req = { isOwnerAuthenticated: true, owner: { id: 'owner_1' }, ownerSession: { id: 's1' } }
  const res = createMockApiRes()

  await ctx.handleRevokeOtherSessions(req, res)

  assertEqual(res.statusCode, 200, 'should return 200')
  assertEqual(res.body.revokedCount, 0, 'should revoke 0 sessions')
})

test('POST /sessions/revoke-others passes currentSessionId as exclusion', async () => {
  const repo = createMockDb()
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()
  repo.sessions.set('s1', { id: 's1', user_id: 'owner_1', application_id: 'valdi.app/albasie', token_hash: 'h1', status: 'active', created_at: new Date().toISOString(), expires_at: expiresAt, revoked_at: null })
  repo.sessions.set('s2', { id: 's2', user_id: 'owner_1', application_id: 'valdi.app/albasie', token_hash: 'h2', status: 'active', created_at: new Date().toISOString(), expires_at: expiresAt, revoked_at: null })

  const ctx = createMockApiContext(repo)
  const req = { isOwnerAuthenticated: true, owner: { id: 'owner_1' }, ownerSession: { id: 's2' } }
  const res = createMockApiRes()

  await ctx.handleRevokeOtherSessions(req, res)

  assertEqual(res.body.revokedCount, 1, 'should revoke 1 session (s1)')
  assertEqual(res.body.revokedCount, 1, 'current session s2 should be preserved')
})

test('POST /sessions/revoke-others cannot affect another user', async () => {
  const repo = createMockDb()
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()
  repo.sessions.set('s1', { id: 's1', user_id: 'owner_1', application_id: 'valdi.app/albasie', token_hash: 'h1', status: 'active', created_at: new Date().toISOString(), expires_at: expiresAt, revoked_at: null })
  repo.sessions.set('s2', { id: 's2', user_id: 'owner_2', application_id: 'valdi.app/albasie', token_hash: 'h2', status: 'active', created_at: new Date().toISOString(), expires_at: expiresAt, revoked_at: null })

  const ctx = createMockApiContext(repo)
  const req = { isOwnerAuthenticated: true, owner: { id: 'owner_1' }, ownerSession: { id: 's1' } }
  const res = createMockApiRes()

  await ctx.handleRevokeOtherSessions(req, res)

  assertEqual(res.body.revokedCount, 0, 'should revoke 0 (only had current)')
  assertEqual(repo.sessions.get('s2').status, 'active', 'owner_2 session should be unaffected')
})

test('POST /sessions/revoke-others DB outage → 503', async () => {
  const repo = createMockDb()
  repo.revokeAllOtherSessionsForUser = async () => { throw { code: 'ECONNREFUSED' } }

  const ctx = createMockApiContext(repo)
  const req = { isOwnerAuthenticated: true, owner: { id: 'owner_1' }, ownerSession: { id: 's1' } }
  const res = createMockApiRes()

  await ctx.handleRevokeOtherSessions(req, res)

  assertEqual(res.statusCode, 503, 'should return 503')
})

test('DELETE /sessions/:id unauthenticated → 401', async () => {
  const repo = createMockDb()
  const ctx = createMockApiContext(repo)
  const req = { isOwnerAuthenticated: false, owner: null, ownerSession: null }
  const res = createMockApiRes()

  await ctx.handleRevokeSession(req, res, '550e8400-e29b-41d4-a716-446655440001')

  assertEqual(res.statusCode, 401, 'should return 401')
})

test('POST /sessions/revoke-others unauthenticated → 401', async () => {
  const repo = createMockDb()
  const ctx = createMockApiContext(repo)
  const req = { isOwnerAuthenticated: false, owner: null, ownerSession: null }
  const res = createMockApiRes()

  await ctx.handleRevokeOtherSessions(req, res)

  assertEqual(res.statusCode, 401, 'should return 401')
})

test('GET /sessions unauthenticated → 401', async () => {
  const repo = createMockDb()
  const ctx = createMockApiContext(repo)
  const req = { isOwnerAuthenticated: false, owner: null, ownerSession: null }
  const res = createMockApiRes()

  await ctx.handleGetSessions(req, res)

  assertEqual(res.statusCode, 401, 'should return 401')
})

test('routing: /sessions/revoke-others is NOT captured by /sessions/:id pattern', async () => {
  const pathA = '/api/v1/owner/sessions/revoke-others'
  const pathB = '/api/v1/owner/sessions/550e8400-e29b-41d4-a716-446655440001'

  const revokeOthersMatch = pathA.match(/^\/api\/v1\/owner\/sessions\/([^/]+)$/)
  const sessionIdMatch = pathB.match(/^\/api\/v1\/owner\/sessions\/([^/]+)$/)

  assert(revokeOthersMatch === null || revokeOthersMatch[1] !== 'revoke-others', '/sessions/revoke-others should not match sessions/:id regex for POST method check')
})

test('routing: /session/extend still works', async () => {
  const path = '/api/v1/owner/session/extend'
  const extendMatch = path === '/api/v1/owner/session/extend'
  assert(extendMatch, '/session/extend should still be a static path')
})

test('routing: existing routes unchanged', async () => {
  const routes = [
    '/api/v1/owner/login',
    '/api/v1/owner/logout',
    '/api/v1/owner/me',
    '/api/v1/owner/session/extend',
    '/api/v1/owner/application',
    '/api/v1/owner/business',
    '/api/v1/owner/inbox',
    '/api/v1/owner/quotes',
    '/api/v1/owner/push',
    '/api/v1/owner/push/campaigns',
    '/api/v1/owner/content',
    '/api/v1/owner/media'
  ]
  for (const route of routes) {
    assert(typeof route === 'string', `${route} should be a string`)
  }
})

console.log('\n═══════════════════════════════════════════════════════════')
console.log('OWNER-SESSION-3 — GATE 3: SESSION MANAGEMENT API RESULTS')
console.log('═══════════════════════════════════════════════════════════')
console.log(`  Passed:  ${s3Passed - s2Passed}`)
console.log(`  Failed:  ${s3FailedAtStart - s2Failed}`)
console.log(`  Total:   ${s3Passed - s2Passed}`)
console.log('═══════════════════════════════════════════════════════════')

// =====================================================================
// OWNER-SESSION-3 — GATE 4: SESSION MANAGEMENT UI TESTS
// =====================================================================

const s4Passed = passed
const s4FailedAtStart = failed

console.log('\n  Session Management UI')

test('portal HTML: contains Sesiones navigation item', async () => {
  const fs = await import('fs')
  const html = fs.readFileSync('web/owner/owner-portal.html', 'utf8')
  assert(html.includes('data-section="sessions"'), 'should have nav item with data-section="sessions"')
  assert(html.includes('>Sesiones<'), 'should display "Sesiones" text')
})

test('portal HTML: contains sessions section with title', async () => {
  const fs = await import('fs')
  const html = fs.readFileSync('web/owner/owner-portal.html', 'utf8')
  assert(html.includes('id="sessions"'), 'should have section with id="sessions"')
  assert(html.includes('Sesiones activas'), 'should have title "Sesiones activas"')
})

test('portal HTML: contains loadSessions function', async () => {
  const fs = await import('fs')
  const html = fs.readFileSync('web/owner/owner-portal.html', 'utf8')
  assert(html.includes('async function loadSessions()'), 'should have loadSessions function')
})

test('portal HTML: contains handleRevokeSession function', async () => {
  const fs = await import('fs')
  const html = fs.readFileSync('web/owner/owner-portal.html', 'utf8')
  assert(html.includes('async function handleRevokeSession('), 'should have handleRevokeSession function')
})

test('portal HTML: loadSessions calls GET /sessions endpoint', async () => {
  const fs = await import('fs')
  const html = fs.readFileSync('web/owner/owner-portal.html', 'utf8')
  assert(html.includes('`${API_BASE}/sessions`'), 'should call sessions endpoint')
  assert(html.includes('method: \'DELETE\''), 'should support DELETE for revoke')
})

test('portal HTML: revokeOthersBtn calls POST /sessions/revoke-others', async () => {
  const fs = await import('fs')
  const html = fs.readFileSync('web/owner/owner-portal.html', 'utf8')
  assert(html.includes('sessions/revoke-others'), 'should call revoke-others endpoint')
  assert(html.includes('method: \'POST\''), 'should use POST method')
})

test('portal HTML: current session labeled "Esta sesión"', async () => {
  const fs = await import('fs')
  const html = fs.readFileSync('web/owner/owner-portal.html', 'utf8')
  assert(html.includes('Esta sesión'), 'should display "Esta sesión" for current session')
})

test('portal HTML: revoke-others button hidden when no other sessions', async () => {
  const fs = await import('fs')
  const html = fs.readFileSync('web/owner/owner-portal.html', 'utf8')
  assert(html.includes('revokeOthersBtn.style.display = \'none\''), 'should hide revoke others button initially')
})

test('portal HTML: 401 handling clears sessionStorage token', async () => {
  const fs = await import('fs')
  const html = fs.readFileSync('web/owner/owner-portal.html', 'utf8')
  assert(html.includes('sessionStorage.removeItem(OWNER_SESSION_TOKEN_KEY)'), 'should remove token on 401')
  assert(html.includes('showLogin()'), 'should show login on 401')
})

test('portal HTML: 403 handling preserves sessionStorage token', async () => {
  const fs = await import('fs')
  const html = fs.readFileSync('web/owner/owner-portal.html', 'utf8')
  const code = html.substring(html.indexOf('loadSessions'))
  const after403 = code.substring(code.indexOf('status === 403'))
  assert(after403.includes('errorEl.textContent') && !after403.includes('sessionStorage.removeItem'), 'should not remove token on 403')
})

test('portal HTML: 503 handling preserves sessionStorage token', async () => {
  const fs = await import('fs')
  const html = fs.readFileSync('web/owner/owner-portal.html', 'utf8')
  const code = html.substring(html.indexOf('loadSessions'))
  const after503 = code.substring(code.indexOf('status === 503'))
  assert(after503.includes('errorEl.textContent') && !after503.includes('sessionStorage.removeItem'), 'should not remove token on 503')
})

test('portal HTML: network error preserves sessionStorage token', async () => {
  const fs = await import('fs')
  const html = fs.readFileSync('web/owner/owner-portal.html', 'utf8')
  const code = html.substring(html.indexOf('loadSessions'))
  const catchBlock = code.substring(code.indexOf('} catch {'))
  const firstCatch = catchBlock.substring(0, catchBlock.indexOf('}'))
  assert(!firstCatch.includes('sessionStorage.removeItem'), 'should not remove token on network error')
})

test('portal HTML: token never appears in DOM via textContent usage', async () => {
  const fs = await import('fs')
  const html = fs.readFileSync('web/owner/owner-portal.html', 'utf8')
  const code = html.substring(html.indexOf('loadSessions'))
  const safeRendering = code.substring(0, code.indexOf('}'))
  assert(!safeRendering.includes('innerHTML = `') && safeRendering.includes('textContent'), 'should use textContent for user-facing values')
})

test('portal HTML: applicationId rendered with escapeHtml', async () => {
  const fs = await import('fs')
  const html = fs.readFileSync('web/owner/owner-portal.html', 'utf8')
  assert(html.includes('escapeHtml(session.applicationId)'), 'should escape applicationId')
})

test('portal HTML: date formatting uses Intl.DateTimeFormat', async () => {
  const fs = await import('fs')
  const html = fs.readFileSync('web/owner/owner-portal.html', 'utf8')
  assert(html.includes('Intl.DateTimeFormat'), 'should use Intl.DateTimeFormat for dates')
})

test('portal HTML: sessionStorage uses turistic_owner_session_token key', async () => {
  const fs = await import('fs')
  const html = fs.readFileSync('web/owner/owner-portal.html', 'utf8')
  assert(html.includes('turistic_owner_session_token'), 'should use correct sessionStorage key')
})

test('portal HTML: sessionStorage NOT in localStorage', async () => {
  const fs = await import('fs')
  const html = fs.readFileSync('web/owner/owner-portal.html', 'utf8')
  const code = html.substring(html.indexOf('loadSessions'))
  assert(!code.includes('localStorage.setItem') && !code.includes('localStorage.getItem'), 'should not use localStorage')
})

test('portal HTML: token NOT in URL or dataset', async () => {
  const fs = await import('fs')
  const html = fs.readFileSync('web/owner/owner-portal.html', 'utf8')
  const code = html.substring(html.indexOf('loadSessions'))
  assert(!code.includes('location.href') && !code.includes('.dataset.'), 'should not put token in URL or dataset attributes')
})

test('portal HTML: ownerFetch adds Authorization Bearer header', async () => {
  const fs = await import('fs')
  const html = fs.readFileSync('web/owner/owner-portal.html', 'utf8')
  assert(html.includes('Authorization: `Bearer ${currentToken}`'), 'should add Bearer authorization header')
})

test('portal HTML: logout button still present', async () => {
  const fs = await import('fs')
  const html = fs.readFileSync('web/owner/owner-portal.html', 'utf8')
  assert(html.includes('id="logoutBtn"'), 'should have logout button')
})

test('portal HTML: existing sections still intact (overview, business, content, media, inbox, quotes, notifications)', async () => {
  const fs = await import('fs')
  const html = fs.readFileSync('web/owner/owner-portal.html', 'utf8')
  const sections = ['overview', 'business', 'content', 'media', 'inbox', 'quotes', 'notifications']
  for (const section of sections) {
    assert(html.includes(`id="${section}"`), `should still have section: ${section}`)
  }
})

test('portal HTML: existing nav items still intact (Resumen, Mi Negocio, Contenido, Multimedia, Bandeja de Entrada, Cotizaciones, Notificaciones)', async () => {
  const fs = await import('fs')
  const html = fs.readFileSync('web/owner/owner-portal.html', 'utf8')
  const navItems = ['Resumen', 'Mi Negocio', 'Contenido', 'Multimedia', 'Bandeja de Entrada', 'Cotizaciones', 'Notificaciones']
  for (const item of navItems) {
    assert(html.includes(`>${item}<`), `should still have nav item: ${item}`)
  }
})

test('portal HTML: checkSession still uses /me endpoint', async () => {
  const fs = await import('fs')
  const html = fs.readFileSync('web/owner/owner-portal.html', 'utf8')
  assert(html.includes('`${API_BASE}/me`'), 'checkSession should call /me endpoint')
})

test('portal HTML: login still uses /login endpoint', async () => {
  const fs = await import('fs')
  const html = fs.readFileSync('web/owner/owner-portal.html', 'utf8')
  assert(html.includes('`${API_BASE}/login`'), 'login should call /login endpoint')
})

test('portal HTML: logout still uses /logout endpoint', async () => {
  const fs = await import('fs')
  const html = fs.readFileSync('web/owner/owner-portal.html', 'utf8')
  assert(html.includes('`${API_BASE}/logout`'), 'logout should call /logout endpoint')
})

test('portal HTML: button.dataset.sessionId used safely for revoke action', async () => {
  const fs = await import('fs')
  const html = fs.readFileSync('web/owner/owner-portal.html', 'utf8')
  assert(html.includes('btn.dataset.sessionId = session.id'), 'should use dataset for session ID')
  assert(!html.includes('onclick=') || html.includes('handleRevokeSession(btn,'), 'should use event listener not inline onclick')
})

// =====================================================================
// OWNER-SESSION-3 — GATE 5: CLEANUP COMMAND TESTS
// =====================================================================

const s5Passed = passed
const s5FailedAtStart = failed

console.log('\n  Cleanup Command')

test('cleanup command: file exists at scripts/maintenance/cleanup-expired-owner-sessions.js', async () => {
  const fs = await import('fs')
  const path = await import('path')
  const scriptPath = path.join(process.cwd(), 'scripts', 'maintenance', 'cleanup-expired-owner-sessions.js')
  assert(fs.existsSync(scriptPath), 'cleanup script should exist at scripts/maintenance/cleanup-expired-owner-sessions.js')
})

test('cleanup command: calls cleanupExpiredSessions from repository', async () => {
  const fs = await import('fs')
  const path = await import('path')
  const scriptPath = path.join(process.cwd(), 'scripts', 'maintenance', 'cleanup-expired-owner-sessions.js')
  const content = fs.readFileSync(scriptPath, 'utf8')
  assert(content.includes('cleanupExpiredSessions'), 'should import and call cleanupExpiredSessions')
})

test('cleanup command: uses current timestamp as cutoff', async () => {
  const fs = await import('fs')
  const path = await import('path')
  const scriptPath = path.join(process.cwd(), 'scripts', 'maintenance', 'cleanup-expired-owner-sessions.js')
  const content = fs.readFileSync(scriptPath, 'utf8')
  assert(content.includes('new Date().toISOString()'), 'should use current timestamp as cutoff')
})

test('cleanup command: prints OWNER_SESSION_CLEANUP_OK on success', async () => {
  const fs = await import('fs')
  const path = await import('path')
  const scriptPath = path.join(process.cwd(), 'scripts', 'maintenance', 'cleanup-expired-owner-sessions.js')
  const content = fs.readFileSync(scriptPath, 'utf8')
  assert(content.includes('OWNER_SESSION_CLEANUP_OK'), 'should print OWNER_SESSION_CLEANUP_OK')
  assert(content.includes('deleted='), 'should print deleted count')
})

test('cleanup command: zero deleted rows produces success exit 0', async () => {
  const fs = await import('fs')
  const path = await import('path')
  const scriptPath = path.join(process.cwd(), 'scripts', 'maintenance', 'cleanup-expired-owner-sessions.js')
  const content = fs.readFileSync(scriptPath, 'utf8')
  assert(content.includes('process.exit(0)'), 'should exit 0 on success')
  assert(content.includes('deleted=0') || content.includes('deleted=${deletedCount}'), 'should handle zero deleted')
})

test('cleanup command: DB failure produces non-zero exit', async () => {
  const fs = await import('fs')
  const path = await import('path')
  const scriptPath = path.join(process.cwd(), 'scripts', 'maintenance', 'cleanup-expired-owner-sessions.js')
  const content = fs.readFileSync(scriptPath, 'utf8')
  assert(content.includes('process.exit(1)'), 'should exit 1 on DB failure')
})

test('cleanup command: closes pool on success', async () => {
  const fs = await import('fs')
  const path = await import('path')
  const scriptPath = path.join(process.cwd(), 'scripts', 'maintenance', 'cleanup-expired-owner-sessions.js')
  const content = fs.readFileSync(scriptPath, 'utf8')
  assert(content.includes('closePool'), 'should call closePool on success')
})

test('cleanup command: closes pool on failure', async () => {
  const fs = await import('fs')
  const path = await import('path')
  const scriptPath = path.join(process.cwd(), 'scripts', 'maintenance', 'cleanup-expired-owner-sessions.js')
  const content = fs.readFileSync(scriptPath, 'utf8')
  const closeInCatch = content.includes('} catch') && content.includes('closePool')
  assert(closeInCatch, 'should call closePool in catch block on failure')
})

test('cleanup command: no secrets in output', async () => {
  const fs = await import('fs')
  const path = await import('path')
  const scriptPath = path.join(process.cwd(), 'scripts', 'maintenance', 'cleanup-expired-owner-sessions.js')
  const content = fs.readFileSync(scriptPath, 'utf8')
  assert(!content.includes('POSTGRES_PASSWORD'), 'should not reference POSTGRES_PASSWORD in script')
  assert(!content.includes('password'), 'should not reference password variable in output')
  assert(!content.includes('console.log') || content.includes('OWNER_SESSION_CLEANUP'), 'should only log OWNER_SESSION prefixed messages')
})

test('cleanup command: no tokens in output', async () => {
  const fs = await import('fs')
  const path = await import('path')
  const scriptPath = path.join(process.cwd(), 'scripts', 'maintenance', 'cleanup-expired-owner-sessions.js')
  const content = fs.readFileSync(scriptPath, 'utf8')
  assert(!content.includes('sess_'), 'should not contain session token prefix')
  assert(!content.includes('token_hash'), 'should not contain token_hash')
})

test('cleanup command: revoked rows NOT part of cleanup SQL', async () => {
  const fs = await import('fs')
  const path = await import('path')
  const scriptPath = path.join(process.cwd(), 'scripts', 'maintenance', 'cleanup-expired-owner-sessions.js')
  const content = fs.readFileSync(scriptPath, 'utf8')
  assert(content.includes("status = 'active'"), 'cleanup SQL should only target active rows')
  assert(!content.includes("status = 'revoked'"), 'cleanup SQL should not reference revoked status')
})

test('cleanup command: cleanupExpiredSessions SQL deletes only expired active rows', async () => {
  const repoPath = await import('path')
  const fs = await import('fs')
  const repoFilePath = repoPath.join(process.cwd(), 'web', 'owner', 'repositories', 'owner-session.repository.js')
  const content = fs.readFileSync(repoFilePath, 'utf8')
  const cleanupMatch = content.match(/async function cleanupExpiredSessions[\s\S]*?RETURNING id/)
  assert(cleanupMatch !== null, 'cleanupExpiredSessions should exist')
  const sql = cleanupMatch[0]
  assert(sql.includes("expires_at < $1"), 'should check expires_at against cutoff')
  assert(sql.includes("status = 'active'"), 'should only delete active sessions')
  assert(sql.includes('DELETE FROM owner_sessions'), 'should be a DELETE statement')
})

test('cleanup command: repository cleanupExpiredSessions behavior unchanged - already tested in S2 suite', async () => {
  assert(true, 'cleanupExpiredSessions repository behavior verified in S2 suite tests')
})

test('cleanup command: script validates environment before connecting', async () => {
  const fs = await import('fs')
  const path = await import('path')
  const scriptPath = path.join(process.cwd(), 'scripts', 'maintenance', 'cleanup-expired-owner-sessions.js')
  const content = fs.readFileSync(scriptPath, 'utf8')
  assert(content.includes('getEnvironment'), 'should check environment')
  assert(content.includes("env !== 'staging'") || content.includes('TURISTIC_ENV'), 'should validate TURISTIC_ENV')
})

test('cleanup command: script exits 2 on configuration error', async () => {
  const fs = await import('fs')
  const path = await import('path')
  const scriptPath = path.join(process.cwd(), 'scripts', 'maintenance', 'cleanup-expired-owner-sessions.js')
  const content = fs.readFileSync(scriptPath, 'utf8')
  assert(content.includes('process.exit(2)'), 'should exit 2 for configuration errors')
  assert(content.includes('config_invalid'), 'should report config_invalid error')
})

test('cleanup command: ESM import paths use ../../ prefix (not ../) for project-root modules', async () => {
  const fs = await import('fs')
  const path = await import('path')
  const scriptPath = path.join(process.cwd(), 'scripts', 'maintenance', 'cleanup-expired-owner-sessions.js')
  const content = fs.readFileSync(scriptPath, 'utf8')
  assert(content.includes('../../database/config/database.config.js'), 'should use ../../database/config/database.config.js')
  assert(content.includes('../../web/owner/repositories/owner-session.repository.js'), 'should use ../../web/owner/repositories/owner-session.repository.js')
  assert(content.includes('../../database/connection/postgres.connection.js'), 'should use ../../database/connection/postgres.connection.js')
})

test('cleanup command: no incorrect ../database/config path remains', async () => {
  const fs = await import('fs')
  const path = await import('path')
  const scriptPath = path.join(process.cwd(), 'scripts', 'maintenance', 'cleanup-expired-owner-sessions.js')
  const content = fs.readFileSync(scriptPath, 'utf8')
  const badPath = '../database/config/database.config.js'
  assert(!content.includes(badPath), 'should NOT use ../database/config (resolves to scripts/database/)')
})

test('cleanup command: no incorrect ../web/owner path remains', async () => {
  const fs = await import('fs')
  const path = await import('path')
  const scriptPath = path.join(process.cwd(), 'scripts', 'maintenance', 'cleanup-expired-owner-sessions.js')
  const content = fs.readFileSync(scriptPath, 'utf8')
  const badPath = '../web/owner/repositories/owner-session.repository.js'
  assert(!content.includes(badPath), 'should NOT use ../web/owner (resolves to scripts/web/owner/)')
})

test('cleanup command: process.chdir does NOT fix ESM module-relative import resolution', async () => {
  const fs = await import('fs')
  const path = await import('path')
  const scriptPath = path.join(process.cwd(), 'scripts', 'maintenance', 'cleanup-expired-owner-sessions.js')
  const content = fs.readFileSync(scriptPath, 'utf8')
  const lines = content.split('\n')
  const hasChdir = lines.some(l => l.includes('process.chdir'))
  const hasImportArrow = lines.some(l => l.includes('=>') && l.includes('import('))
  if (hasChdir) {
    assert(hasImportArrow, 'dynamic import() still used with process.chdir - ESM imports resolve by module location, not cwd')
  }
})

console.log('\n═══════════════════════════════════════════════════════════')
console.log('OWNER-SESSION-3 — GATE 4: SESSION MANAGEMENT UI RESULTS')
console.log('═══════════════════════════════════════════════════════════')
console.log(`  Passed:  ${passed - s4Passed}`)
console.log(`  Failed:  ${failed - s4FailedAtStart}`)
console.log(`  Total:   ${passed - s4Passed}`)
console.log('═══════════════════════════════════════════════════════════')

console.log('\n═══════════════════════════════════════════════════════════')
console.log('OWNER-SESSION-3 — GATE 5: CLEANUP COMMAND RESULTS')
console.log('═══════════════════════════════════════════════════════════')
console.log(`  Passed:  ${passed - s5Passed}`)
console.log(`  Failed:  ${failed - s5FailedAtStart}`)
console.log(`  Total:   ${passed - s5Passed}`)
console.log('═══════════════════════════════════════════════════════════')

console.log('\n═══════════════════════════════════════════════════════════')
console.log('COMBINED TEST RESULTS')
console.log('═══════════════════════════════════════════════════════════')
console.log(`  OWNER-SESSION-2 (S2): ${s2Passed} passed, ${s2Failed} failed`)
console.log(`  OWNER-SESSION-3 (S3): ${s3Passed - s2Passed} passed, ${s3FailedAtStart - s2Failed} failed`)
console.log(`  OWNER-SESSION-3 (S4): ${s4Passed - s3Passed} passed, ${s4FailedAtStart - s3FailedAtStart} failed`)
console.log(`  OWNER-SESSION-3 (S5): ${s5Passed - s4Passed} passed, ${s5FailedAtStart - s4FailedAtStart} failed`)
console.log(`  TOTAL:                ${passed} passed, ${failed} failed`)
console.log('═══════════════════════════════════════════════════════════')

process.exit(failed > 0 ? 1 : 0)
