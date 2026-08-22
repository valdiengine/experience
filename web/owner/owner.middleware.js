/**
 * Owner Authentication Middleware
 *
 * Provides secure authentication and authorization middleware
 * for the Owner Portal.
 */

import {
  validateSession,
  invalidateSession,
  getSessionOwner
} from './owner.auth.js'

import {
  isValidApplicationId,
  canAccessApplication,
  hasPermission
} from './owner.identity.js'

export function createOwnerAuthMiddleware() {
  return async function ownerAuthMiddleware(req, res, next) {
    const authHeader = req.headers.authorization

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const sessionId = authHeader.substring(7)
      const session = validateSession(sessionId)

      if (session) {
        req.owner = getSessionOwner(sessionId)
        req.ownerSession = session
        req.isOwnerAuthenticated = true
      } else {
        req.owner = null
        req.ownerSession = null
        req.isOwnerAuthenticated = false
      }
    } else {
      req.owner = null
      req.ownerSession = null
      req.isOwnerAuthenticated = false
    }

    next()
  }
}

export function requireOwnerAuth(req, res, next) {
  if (!req.isOwnerAuthenticated || !req.owner) {
    res.statusCode = 401
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({
      error: 'Unauthorized',
      message: 'Authentication required'
    }))
    return
  }
  next()
}

export function requireOwnerPermission(permission) {
  return (req, res, next) => {
    if (!req.isOwnerAuthenticated || !req.owner) {
      res.statusCode = 401
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({
        error: 'Unauthorized',
        message: 'Authentication required'
      }))
      return
    }

    if (!hasPermission(req.ownerSession, permission)) {
      res.statusCode = 403
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({
        error: 'Forbidden',
        message: `Permission '${permission}' required`
      }))
      return
    }

    next()
  }
}

export function requireOwnerApplicationAccess(applicationIdParam = 'applicationId') {
  return (req, res, next) => {
    if (!req.isOwnerAuthenticated || !req.owner) {
      res.statusCode = 401
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({
        error: 'Unauthorized',
        message: 'Authentication required'
      }))
      return
    }

    const requestedAppId = req.params[applicationIdParam] || req.body?.[applicationIdParam] || req.query?.[applicationIdParam]

    if (requestedAppId && !isValidApplicationId(requestedAppId)) {
      res.statusCode = 400
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({
        error: 'Bad Request',
        message: 'Invalid application ID format'
      }))
      return
    }

    if (requestedAppId && requestedAppId !== req.owner.applicationId) {
      res.statusCode = 403
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({
        error: 'Forbidden',
        message: 'You do not have access to this application'
      }))
      return
    }

    next()
  }
}

export function buildOwnerContext(req) {
  if (!req.isOwnerAuthenticated || !req.owner) {
    return null
  }

  return {
    ownerId: req.owner.id,
    email: req.owner.email,
    name: req.owner.name,
    applicationId: req.owner.applicationId,
    role: req.owner.role,
    permissions: req.owner.permissions
  }
}

export default {
  createOwnerAuthMiddleware,
  requireOwnerAuth,
  requireOwnerPermission,
  requireOwnerApplicationAccess,
  buildOwnerContext
}
