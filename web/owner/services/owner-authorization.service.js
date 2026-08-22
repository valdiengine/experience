/**
 * Owner Authorization Service
 *
 * Grant-based authorization for owner requests.
 * Resolves userId + canonical ApplicationId to current active grant.
 */

import * as identityService from './owner-identity.service.js'

export async function authorizeRequest({ userId, applicationId }) {
  try {
    const grant = await identityService.getActiveGrant(userId, applicationId)

    if (!grant) {
      return { authorized: false, error: 'NO_ACTIVE_GRANT' }
    }

    if (grant.status !== 'active') {
      return { authorized: false, error: 'GRANT_' + grant.status.toUpperCase() }
    }

    if (grant.expires_at && new Date(grant.expires_at) <= new Date()) {
      return { authorized: false, error: 'GRANT_EXPIRED' }
    }

    return {
      authorized: true,
      grant: {
        id: grant.id,
        userId: grant.user_id,
        applicationId: grant.application_id,
        role: grant.role,
        permissions: grant.permissions || []
      }
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      return { authorized: false, error: 'INFRASTRUCTURE_UNAVAILABLE' }
    }
    throw error
  }
}

export function hasPermission(sessionPermissions, requiredPermission) {
  if (!sessionPermissions || !Array.isArray(sessionPermissions)) {
    return false
  }

  if (sessionPermissions.includes('admin:*')) {
    return true
  }

  if (sessionPermissions.includes(requiredPermission)) {
    return true
  }

  const requiredParts = requiredPermission.split(':')
  const requiredPrefix = requiredParts[0] + ':*'

  if (sessionPermissions.includes(requiredPrefix)) {
    return true
  }

  return false
}

export async function checkPermission({ userId, applicationId, requiredPermission }) {
  const auth = await authorizeRequest({ userId, applicationId })

  if (!auth.authorized) {
    return { allowed: false, error: auth.error }
  }

  const allowed = hasPermission(auth.grant.permissions, requiredPermission)

  if (!allowed) {
    return { allowed: false, error: 'PERMISSION_DENIED' }
  }

  return { allowed: true, grant: auth.grant }
}

export default {
  authorizeRequest,
  hasPermission,
  checkPermission
}
