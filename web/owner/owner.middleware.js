/**
 * Owner Authentication Middleware
 *
 * Provides secure authentication and authorization middleware
 * for the Owner Portal.
 *
 * Authentication: validates persistent session from PostgreSQL
 * Authorization: resolves current persistent grant from PostgreSQL
 *
 * CORE INVARIANTS:
 * - Session proves identity (authentication)
 * - Persistent grant proves authorization
 * - Authentication and authorization are SEPARATE
 *
 * req.isOwnerAuthenticated = true only when session is valid
 * req.authorizationError captures grant resolution failures
 */

import {
  validateSession,
  getSessionOwner
} from './owner.auth.js'

import {
  isValidApplicationId,
  canAccessApplication,
  hasPermission
} from './owner.identity.js'

import * as authorizationService from './services/owner-authorization.service.js'

export function createOwnerAuthMiddleware() {
  return async function ownerAuthMiddleware(req, res, next) {
    const authHeader = req.headers.authorization

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const sessionId = authHeader.substring(7)

      let session
      try {
        session = await validateSession(sessionId)
      } catch (error) {
        if (error.code === 'INFRASTRUCTURE_UNAVAILABLE') {
          req.owner = null
          req.ownerSession = null
          req.isOwnerAuthenticated = false
          req.authorizationError = 'INFRASTRUCTURE_UNAVAILABLE'
          next()
          return
        }
        throw error
      }

      if (session) {
        let owner
        try {
          owner = await getSessionOwner(sessionId)
        } catch (error) {
          if (error.code === 'INFRASTRUCTURE_UNAVAILABLE') {
            req.owner = null
            req.ownerSession = null
            req.isOwnerAuthenticated = false
            req.authorizationError = 'INFRASTRUCTURE_UNAVAILABLE'
            next()
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
          next()
          return
        }

        req.owner = owner
        req.ownerSession = session
        req.isOwnerAuthenticated = true
        req.authorizationError = null

        try {
          const authResult = await authorizationService.authorizeRequest({
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
        } catch (error) {
          if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
            req.owner.grant = null
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

    next()
  }
}

export function requireOwnerAuth(req, res, next) {
  if (!req.isOwnerAuthenticated) {
    if (req.authorizationError === 'INFRASTRUCTURE_UNAVAILABLE') {
      res.statusCode = 503
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({
        error: 'Service Unavailable',
        message: 'Infrastructure temporarily unavailable'
      }))
    } else {
      res.statusCode = 401
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({
        error: 'Unauthorized',
        message: 'Authentication required'
      }))
    }
    return
  }
  next()
}

export function requireOwnerPermission(permission) {
  return (req, res, next) => {
    if (!req.isOwnerAuthenticated) {
      if (req.authorizationError === 'INFRASTRUCTURE_UNAVAILABLE') {
        res.statusCode = 503
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({
          error: 'Service Unavailable',
          message: 'Infrastructure temporarily unavailable'
        }))
      } else {
        res.statusCode = 401
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({
          error: 'Unauthorized',
          message: 'Authentication required'
        }))
      }
      return
    }

    if (req.authorizationError === 'INFRASTRUCTURE_UNAVAILABLE') {
      res.statusCode = 503
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({
        error: 'Service Unavailable',
        message: 'Infrastructure temporarily unavailable'
      }))
      return
    }

    if (!authorizationService.hasPermission(req.owner.grant?.permissions, permission)) {
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
    if (!req.isOwnerAuthenticated) {
      if (req.authorizationError === 'INFRASTRUCTURE_UNAVAILABLE') {
        res.statusCode = 503
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({
          error: 'Service Unavailable',
          message: 'Infrastructure temporarily unavailable'
        }))
      } else {
        res.statusCode = 401
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({
          error: 'Unauthorized',
          message: 'Authentication required'
        }))
      }
      return
    }

    if (req.authorizationError === 'INFRASTRUCTURE_UNAVAILABLE') {
      res.statusCode = 503
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({
        error: 'Service Unavailable',
        message: 'Infrastructure temporarily unavailable'
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
  if (!req.isOwnerAuthenticated) {
    return null
  }

  return {
    ownerId: req.owner.id,
    email: req.owner.email,
    name: req.owner.name,
    applicationId: req.owner.applicationId,
    role: req.owner.grant?.role || req.owner.role,
    permissions: req.owner.grant?.permissions || req.owner.permissions
  }
}

export default {
  createOwnerAuthMiddleware,
  requireOwnerAuth,
  requireOwnerPermission,
  requireOwnerApplicationAccess,
  buildOwnerContext
}
