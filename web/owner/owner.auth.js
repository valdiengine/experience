/**
 * Owner Authentication & Session Management
 *
 * OWNER-SESSION-1: Persistent Owner Identity with PostgreSQL
 *
 * TEMPORARY COMPATIBILITY LAYER (until runtime cutover):
 * - ownerStore: in-memory store for web.server.js bootstrap compatibility
 * - registerOwner: in-memory registration for bootstrap
 * - getOwnerCount: in-memory count for bootstrap idempotency check
 * - createTestOwner: test fixture (uses in-memory store)
 *
 * PERSISTENT AUTHENTICATION (uses PostgreSQL):
 * - hashPassword / verifyPassword: scrypt module
 * - authenticateOwner: authenticates against PostgreSQL, resolves grants
 *
 * IN-MEMORY SESSION MANAGEMENT (unchanged until OWNER-SESSION-2):
 * - sessions Map
 * - validateSession
 * - invalidateSession
 * - getSessionOwner
 * - extendSession
 * - cleanupExpiredSessions
 * - getSessionCount
 *
 * FAIL-CLOSED: No in-memory fallback for PostgreSQL authentication.
 * If PostgreSQL is unavailable, authentication fails with INFRASTRUCTURE_UNAVAILABLE.
 */

import { createOwnerSession, generateSessionId, generateId, isValidEmail } from './owner.identity.js'

import * as identityService from './services/owner-identity.service.js'
import { hashPassword as scryptHash, verifyPassword as scryptVerify } from './password/owner-password.module.js'

const SESSION_TTL_MS = 24 * 60 * 60 * 1000

/**
 * Temporary compatibility layer: in-memory owner store
 * Used by web.server.js bootstrap until explicit PostgreSQL provisioning.
 * NOT used by authenticateOwner.
 */
const sessions = new Map()
const ownerStore = new Map()

// ============================================================
// TEMPORARY COMPATIBILITY FUNCTIONS
// ============================================================

/**
 * Temporary: In-memory owner registration for web.server.js bootstrap.
 * NOT used for PostgreSQL authentication.
 */
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

/**
 * Temporary: In-memory owner count for web.server.js bootstrap idempotency.
 */
export function getOwnerCount() {
  return ownerStore.size
}

/**
 * Temporary: Test fixture using in-memory store.
 */
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
 * Authenticate owner against PostgreSQL persistent identity.
 *
 * Flow:
 * 1. Validate credentials against users table
 * 2. Resolve ALL active, non-expired grants for that user
 * 3. Handle grant states:
 *    - 0 grants: NO_ACTIVE_GRANT (403)
 *    - 1 grant: create session with grant's applicationId/role/permissions
 *    - >1 grants: AMBIGUOUS_APPLICATION (403)
 *
 * No hardcoded applicationId. No in-memory fallback.
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

  // Step 4: Exactly one valid grant - use it
  const grant = grants[0]

  const sessionId = generateSessionId()
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()

  const session = createOwnerSession({
    id: sessionId,
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
  })

  sessions.set(sessionId, session)

  console.log(`[OwnerAuth] Session created for ${user.email} on ${grant.application_id}, expires ${expiresAt}`)

  return {
    success: true,
    session: {
      id: session.id,
      ownerId: session.ownerId,
      ownerEmail: session.ownerEmail,
      ownerName: session.ownerName,
      applicationId: session.applicationId,
      role: session.role,
      permissions: session.permissions,
      expiresAt: session.expiresAt
    }
  }
}

// ============================================================
// IN-MEMORY SESSION MANAGEMENT (unchanged)
// ============================================================

export function validateSession(sessionId) {
  if (!sessionId || typeof sessionId !== 'string') {
    return null
  }

  const session = sessions.get(sessionId)
  if (!session) {
    return null
  }

  if (new Date(session.expiresAt) < new Date()) {
    sessions.delete(sessionId)
    return null
  }

  return session
}

export function invalidateSession(sessionId) {
  if (!sessionId) return false
  return sessions.delete(sessionId)
}

export function getSessionOwner(sessionId) {
  const session = validateSession(sessionId)
  if (!session) return null

  return {
    id: session.ownerId,
    email: session.ownerEmail,
    name: session.ownerName,
    applicationId: session.applicationId,
    role: session.role,
    permissions: session.permissions
  }
}

export function extendSession(sessionId) {
  const session = sessions.get(sessionId)
  if (!session) return false

  const newExpiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()
  const updatedSession = { ...session, expiresAt: newExpiresAt, lastActivityAt: new Date().toISOString() }
  sessions.set(sessionId, Object.freeze(updatedSession))
  return true
}

export function cleanupExpiredSessions() {
  const now = new Date()
  let cleaned = 0

  for (const [id, session] of sessions.entries()) {
    if (new Date(session.expiresAt) < now) {
      sessions.delete(id)
      cleaned++
    }
  }

  if (cleaned > 0) {
    console.log(`[OwnerAuth] Cleaned up ${cleaned} expired sessions`)
  }

  return cleaned
}

export function getSessionCount() {
  return sessions.size
}

export function forTesting_onlyClearAllData() {
  sessions.clear()
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
  invalidateSession,
  getSessionOwner,
  extendSession,
  cleanupExpiredSessions,
  getSessionCount,
  forTesting_onlyClearAllData
}
