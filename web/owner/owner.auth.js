/**
 * Owner Authentication & Session Management
 *
 * OWNER-1: Business Owner Portal Foundation
 *
 * Provides secure authentication for business owners:
 * - Password hashing with bcrypt
 * - Session management
 * - Secure session validation
 *
 * Uses Node.js crypto for password hashing when bcrypt is unavailable.
 */

import { createOwnerSession, generateSessionId, generateId, isValidEmail } from './owner.identity.js'
import { createHash, randomBytes } from 'crypto'

const SESSION_TTL_MS = 24 * 60 * 60 * 1000

const sessions = new Map()
const ownerStore = new Map()

export function hashPassword(password) {
  if (!password || typeof password !== 'string' || password.length < 8) {
    throw new Error('Password must be at least 8 characters')
  }

  const salt = randomBytes(16).toString('hex')
  const hash = createHash('sha256').update(password + salt).digest('hex')
  return `${salt}$${hash}`
}

export function verifyPassword(password, storedHash) {
  if (!password || !storedHash) return false

  const parts = storedHash.split('$')
  if (parts.length !== 2) return false
  const [salt, hash] = parts
  const hashCheck = createHash('sha256').update(password + salt).digest('hex')
  return hashCheck === hash
}

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
  const passwordHash = hashPassword(password)

  const owner = Object.freeze({
    id: ownerId,
    email: email.toLowerCase(),
    name: name || email.split('@')[0],
    passwordHash,
    applicationId,
    createdAt: new Date().toISOString()
  })

  ownerStore.set(email.toLowerCase(), owner)

  console.log(`[OwnerAuth] Owner registered: ${email} for ${applicationId}`)

  return {
    id: ownerId,
    email: owner.email,
    name: owner.name,
    applicationId: owner.applicationId
  }
}

export function authenticateOwner(email, password) {
  if (!email || !password) {
    return { success: false, error: 'Email and password are required' }
  }

  const owner = ownerStore.get(email.toLowerCase())
  if (!owner) {
    return { success: false, error: 'Invalid credentials' }
  }

  const passwordValid = verifyPassword(password, owner.passwordHash)
  if (!passwordValid) {
    return { success: false, error: 'Invalid credentials' }
  }

  const sessionId = generateSessionId()
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()

  const session = createOwnerSession({
    id: sessionId,
    ownerId: owner.id,
    ownerEmail: owner.email,
    ownerName: owner.name,
    applicationId: owner.applicationId,
    role: 'business_owner',
    permissions: [
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

  console.log(`[OwnerAuth] Session created for ${owner.email}, expires ${expiresAt}`)

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

export function getOwnerCount() {
  return ownerStore.size
}

export function getSessionCount() {
  return sessions.size
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

export function forTesting_onlyClearAllData() {
  sessions.clear()
  ownerStore.clear()
}

export default {
  hashPassword,
  verifyPassword,
  registerOwner,
  authenticateOwner,
  validateSession,
  invalidateSession,
  getSessionOwner,
  extendSession,
  cleanupExpiredSessions,
  getOwnerCount,
  getSessionCount,
  createTestOwner,
  forTesting_onlyClearAllData
}
