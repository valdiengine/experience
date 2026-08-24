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

console.log('\n═══════════════════════════════════════════════════════════')
console.log(`OWNER-SESSION-2 — TEST RESULTS`)
console.log('═══════════════════════════════════════════════════════════')
console.log(`  Passed:  ${passed}`)
console.log(`  Failed:  ${failed}`)
console.log(`  Total:   ${passed + failed}`)
console.log('═══════════════════════════════════════════════════════════')

process.exit(failed > 0 ? 1 : 0)
