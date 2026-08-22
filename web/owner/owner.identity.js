/**
 * Owner Identity & Grants Model
 *
 * OWNER-1: Business Owner Portal Foundation
 *
 * Provides secure owner identity independent of:
 * - domain
 * - route
 * - browser
 * - Application
 *
 * Authorization uses explicit server-side grants.
 */

export const OWNER_ROLES = Object.freeze({
  BUSINESS_OWNER: 'business_owner',
  ZONE_ADMIN: 'zone_admin',
  PLATFORM_ADMIN: 'platform_admin'
})

export const OWNER_PERMISSIONS = Object.freeze({
  READ_APPLICATION: 'application:read',
  EDIT_BUSINESS_INFO: 'business:edit_info',
  READ_INBOX: 'inbox:read',
  MANAGE_INTERACTIONS: 'inbox:manage',
  VIEW_QUOTES: 'quotes:view',
  VIEW_PWA: 'pwa:view',
  EDIT_NOTIFICATION_SETTINGS: 'notifications:edit_settings',
  VIEW_ANALYTICS: 'analytics:view'
})

export function createOwnerIdentity(data = {}) {
  return Object.freeze({
    id: data.id || null,
    email: data.email || null,
    name: data.name || null,
    role: data.role || OWNER_ROLES.BUSINESS_OWNER,
    createdAt: data.createdAt || new Date().toISOString()
  })
}

export function createOwnerGrant(data = {}) {
  return Object.freeze({
    id: data.id || generateId(),
    ownerId: data.ownerId,
    applicationId: data.applicationId,
    permissions: Object.freeze([...(data.permissions || [])]),
    grantedAt: data.grantedAt || new Date().toISOString(),
    grantedBy: data.grantedBy || 'system',
    expiresAt: data.expiresAt || null
  })
}

export function createOwnerSession(data = {}) {
  return Object.freeze({
    id: data.id || generateId(),
    ownerId: data.ownerId,
    ownerEmail: data.ownerEmail,
    ownerName: data.ownerName,
    applicationId: data.applicationId,
    role: data.role || OWNER_ROLES.BUSINESS_OWNER,
    permissions: Object.freeze([...(data.permissions || [])]),
    createdAt: data.createdAt || new Date().toISOString(),
    expiresAt: data.expiresAt || null,
    lastActivityAt: data.lastActivityAt || new Date().toISOString()
  })
}

export function generateId() {
  return 'owner_' + Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15)
}

export function generateSessionId() {
  return 'sess_' + Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15) +
         Date.now().toString(36)
}

export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email) && email.length <= 255
}

export function isValidOwnerId(ownerId) {
  if (!ownerId || typeof ownerId !== 'string') return false
  return ownerId.startsWith('owner_') && ownerId.length >= 20
}

export function isValidApplicationId(applicationId) {
  if (!applicationId || typeof applicationId !== 'string') return false
  const parts = applicationId.split('/')
  if (parts.length !== 2) return false
  const [domain, route] = parts
  if (!route || route.length === 0) return false
  const validDomains = ['valdi.app', 'natales.app', 'puntaarenas.app', 'coyhaique.app', 'chiloe.app']
  return validDomains.includes(domain)
}

export function isSessionExpired(session) {
  if (!session || !session.expiresAt) return false
  return new Date(session.expiresAt) < new Date()
}

export function hasPermission(session, permission) {
  if (!session || !session.permissions) return false
  return session.permissions.includes(permission) || session.permissions.includes('*')
}

export function canAccessApplication(session, applicationId) {
  if (!session || !session.applicationId) return false
  return session.applicationId === applicationId
}

export function sanitizeOwnerInput(input) {
  if (typeof input !== 'string') return ''
  return input
    .replace(/[<>]/g, '')
    .trim()
    .substring(0, 1000)
}

export function validateBusinessInfoField(key, value) {
  const allowedFields = ['name', 'description', 'contactPhone', 'contactEmail', 'address', 'website', 'socialLinks']
  if (!allowedFields.includes(key)) {
    return { valid: false, error: `Field '${key}' is not allowed` }
  }

  if (key === 'contactEmail' && value && !isValidEmail(value)) {
    return { valid: false, error: 'Invalid email format' }
  }

  if (key === 'website' && value) {
    try {
      const url = new URL(value.startsWith('http') ? value : 'https://' + value)
      if (!['http:', 'https:'].includes(url.protocol)) {
        return { valid: false, error: 'Website must use HTTP or HTTPS' }
      }
    } catch {
      return { valid: false, error: 'Invalid website URL' }
    }
  }

  if (typeof value === 'string' && value.length > 1000) {
    return { valid: false, error: 'Value too long (max 1000 characters)' }
  }

  return { valid: true, value: sanitizeOwnerInput(value) }
}

export default {
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
}
