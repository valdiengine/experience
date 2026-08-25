/**
 * Owner Authentication & Session Management
 *
 * OWNER-SESSION-2: Persistent Sessions with PostgreSQL
 *
 * COMPATIBILITY LAYER (bootstrap/testing only):
 * - ownerStore: in-memory owner registration (NOT used for authentication)
 * - registerOwner: in-memory registration for bootstrap
 * - getOwnerCount: in-memory count for bootstrap idempotency
 * - createTestOwner: test fixture
 *
 * PERSISTENT AUTHENTICATION (PostgreSQL):
 * - hashPassword / verifyPassword: scrypt module
 * - authenticateOwner: authenticates against PostgreSQL, creates persistent session
 *
 * PERSISTENT SESSIONS (PostgreSQL):
 * - validateSession: token → hash → DB lookup
 * - invalidateSession: token → hash → revoke
 * - extendSession: token → hash → update expires_at
 * - getSessionOwner: returns identity context for middleware
 * - cleanupExpiredSessions: deletes expired sessions
 * - getSessionCount: counts active sessions
 *
 * AUTHORIZATION (unchanged from SESSION-1):
 * - authorizeRequest(): called by middleware AFTER session validation
 * - grant revalidation on every request
 *
 * FAIL-CLOSED: If PostgreSQL is unavailable during session operations,
 * functions propagate INFRASTRUCTURE_UNAVAILABLE.
 */

import { createOwnerSession, generateId, isValidEmail } from './owner.identity.js'
import { generateSecureSessionId, hashSessionToken, isValidTokenFormat } from './token/owner-session-token.module.js'
import * as identityService from './services/owner-identity.service.js'
import { hashPassword as scryptHash, verifyPassword as scryptVerify } from './password/owner-password.module.js'
import * as sessionRepo from './repositories/owner-session.repository.js'

const SESSION_TTL_MS = 24 * 60 * 60 * 1000

/**
 * Compatibility layer: in-memory owner store for bootstrap.
 * NOT used for authentication (which uses PostgreSQL).
 */
const ownerStore = new Map()

// ============================================================
// COMPATIBILITY FUNCTIONS (bootstrap/testing)
// ============================================================

export function registerOwner(ownerData) {
  const { email, password, name, applicationId } = ownerData

  if (!isValidEmail(email)) {
    throw new Error('Invalid email format')
  }

  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters')
  }

  if (!applicationId) {
    throw new Error('Application ID is required')
  }

  const existing = ownerStore.get(email.toLowerCase())
  if (existing) {
    throw new Error('Owner already registered')
  }

  const ownerId = 'owner_' + generateId()

  const owner = Object.freeze({
    id: ownerId,
    email: email.toLowerCase(),
    name: name || email.split('@')[0],
    passwordHash: hashPassword(password),
    applicationId,
    createdAt: new Date().toISOString()
  })

  ownerStore.set(email.toLowerCase(), owner)

  console.log(`[OwnerAuth] Owner registered (in-memory): ${email} for ${applicationId}`)

  return {
    id: ownerId,
    email: owner.email,
    name: owner.name,
    applicationId: owner.applicationId
  }
}

export function getOwnerCount() {
  return ownerStore.size
}

export function createTestOwner(applicationId = 'valdi.app/albasie') {
  const testEmail = `test.owner.${Date.now()}@example.com`
  return registerOwner({
    email: testEmail,
    password: 'TestPassword123!',
    name: 'Test Owner',
    applicationId
  })
}

// ============================================================
// PERSISTENT AUTHENTICATION
// ============================================================

export function hashPassword(password) {
  return scryptHash(password)
}

export function verifyPassword(password, storedHash) {
  return scryptVerify(password, storedHash)
}

/**
 * Authenticate owner against PostgreSQL and create persistent session.
 *
 * Flow:
 * 1. Validate credentials against users table
 * 2. Resolve ALL active, non-expired grants
 * 3. Handle grant states:
 *    - 0 grants: NO_ACTIVE_GRANT (403)
 *    - 1 grant: create persistent session
 *    - >1 grants: AMBIGUOUS_APPLICATION (403)
 * 4. Return raw session token to client ONCE
 */
export async function authenticateOwner(email, password) {
  if (!email || !password) {
    return { success: false, error: 'Email and password are required' }
  }

  // Step 1: Authenticate against PostgreSQL
  const authResult = await identityService.authenticateOwnerUser(email, password)

  if (!authResult.success) {
    return authResult
  }

  const user = authResult.user

  // Step 2: Find ALL active, non-expired grants for this user
  const grants = await identityService.getActiveGrantsForUser(user.id)

  // Step 3: Handle grant states
  if (grants.length === 0) {
    return { success: false, error: 'NO_ACTIVE_GRANT' }
  }

  if (grants.length > 1) {
    return { success: false, error: 'AMBIGUOUS_APPLICATION' }
  }

  // Step 4: Exactly one valid grant - create persistent session
  const grant = grants[0]

  const rawToken = generateSecureSessionId()
  const tokenHash = hashSessionToken(rawToken)
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()

  await sessionRepo.createSession({
    userId: user.id,
    applicationId: grant.application_id,
    tokenHash,
    expiresAt
  })

  console.log(`[OwnerAuth] Session created for ${user.email} on ${grant.application_id}, expires ${expiresAt}`)

  // Return session object with RAW token in id field
  // Client stores this token and sends as Bearer token
  return {
    success: true,
    session: {
      id: rawToken,
      ownerId: user.id,
      ownerEmail: user.email,
      ownerName: user.name,
      applicationId: grant.application_id,
      role: grant.role,
      permissions: grant.permissions || [
        'application:read',
        'business:edit_info',
        'inbox:read',
        'inbox:manage',
        'quotes:view',
        'pwa:view',
        'notifications:edit_settings'
      ],
      expiresAt
    }
  }
}

// ============================================================
// PERSISTENT SESSION MANAGEMENT
// ============================================================

/**
 * Validate a session token.
 *
 * - Validates token format
 * - Hashes token
 * - Looks up in PostgreSQL
 * - Returns session if active and not expired
 *
 * Returns null for: invalid format, unknown hash, expired, revoked
 *
 * Note: The session row only contains user_id, application_id, and timing fields.
 * Identity (email/name) must be loaded separately via getSessionOwner().
 * Authorization (role/permissions) is resolved separately via authorizeRequest().
 */
export async function validateSession(sessionId) {
  if (!sessionId || typeof sessionId !== 'string') {
    return null
  }

  if (!isValidTokenFormat(sessionId)) {
    return null
  }

  const tokenHash = hashSessionToken(sessionId)

  let session
  try {
    session = await sessionRepo.findSessionByTokenHash(tokenHash)
  } catch (error) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      const err = new Error('INFRASTRUCTURE_UNAVAILABLE')
      err.code = 'INFRASTRUCTURE_UNAVAILABLE'
      throw err
    }
    throw error
  }

  if (!session) {
    return null
  }

  return {
    id: session.id,
    ownerId: session.user_id,
    applicationId: session.application_id,
    expiresAt: session.expires_at,
    createdAt: session.created_at
  }
}

/**
 * Get session owner identity.
 *
 * Loads user identity (id, email, name, status) from the users table.
 * Authorization (role, permissions) is handled separately by authorizeRequest()
 * in the middleware, which resolves the current grant on every request.
 *
 * Returns null if session is invalid or user not found.
 */
export async function getSessionOwner(sessionId) {
  const session = await validateSession(sessionId)
  if (!session) {
    return null
  }

  const user = await identityService.getUserById(session.ownerId)
  if (!user) {
    return null
  }

  return {
    id: session.ownerId,
    email: user.email,
    name: user.name,
    status: user.status,
    applicationId: session.applicationId
  }
}

/**
 * Invalidate (revoke) a session.
 *
 * - Hashes token
 * - Updates status to 'revoked' in PostgreSQL
 *
 * Returns true on success or if session already revoked/nonexistent.
 * Throws INFRASTRUCTURE_UNAVAILABLE on DB error.
 */
export async function invalidateSession(sessionId) {
  if (!sessionId) return false

  if (!isValidTokenFormat(sessionId)) {
    return false
  }

  const tokenHash = hashSessionToken(sessionId)

  try {
    const result = await sessionRepo.revokeSession(tokenHash)
    return result !== null
  } catch (error) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      const err = new Error('INFRASTRUCTURE_UNAVAILABLE')
      err.code = 'INFRASTRUCTURE_UNAVAILABLE'
      throw err
    }
    throw error
  }
}

/**
 * Extend session TTL.
 *
 * - Session must be currently active
 * - Session must not be expired
 * - Sets new expires_at = now + SESSION_TTL_MS
 *
 * Returns true on success, false if session not found/expired/revoked.
 * Throws INFRASTRUCTURE_UNAVAILABLE on DB error.
 */
export async function extendSession(sessionId) {
  if (!sessionId) return false

  if (!isValidTokenFormat(sessionId)) {
    return false
  }

  const tokenHash = hashSessionToken(sessionId)
  const newExpiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()

  try {
    const updated = await sessionRepo.extendSession(tokenHash, newExpiresAt)
    return updated !== null
  } catch (error) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      const err = new Error('INFRASTRUCTURE_UNAVAILABLE')
      err.code = 'INFRASTRUCTURE_UNAVAILABLE'
      throw err
    }
    throw error
  }
}

/**
 * Cleanup expired sessions.
 *
 * Calls repository cleanup with current timestamp as cutoff.
 *
 * Returns count of deleted sessions.
 * Throws INFRASTRUCTURE_UNAVAILABLE on DB error.
 */
export async function cleanupExpiredSessions() {
  const cutoff = new Date().toISOString()

  try {
    const count = await sessionRepo.cleanupExpiredSessions(cutoff)
    if (count > 0) {
      console.log(`[OwnerAuth] Cleaned up ${count} expired sessions`)
    }
    return count
  } catch (error) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      const err = new Error('INFRASTRUCTURE_UNAVAILABLE')
      err.code = 'INFRASTRUCTURE_UNAVAILABLE'
      throw err
    }
    throw error
  }
}

/**
 * Count active sessions.
 *
 * Returns count of all active (not expired, not revoked) sessions.
 * Throws INFRASTRUCTURE_UNAVAILABLE on DB error.
 */
export async function getSessionCount() {
  try {
    return await sessionRepo.countActiveSessions()
  } catch (error) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      const err = new Error('INFRASTRUCTURE_UNAVAILABLE')
      err.code = 'INFRASTRUCTURE_UNAVAILABLE'
      throw err
    }
    throw error
  }
}

export function forTesting_onlyClearAllData() {
  ownerStore.clear()
}

export default {
  hashPassword,
  verifyPassword,
  registerOwner,
  getOwnerCount,
  createTestOwner,
  authenticateOwner,
  validateSession,
  getSessionOwner,
  invalidateSession,
  extendSession,
  cleanupExpiredSessions,
  getSessionCount,
  forTesting_onlyClearAllData
}
