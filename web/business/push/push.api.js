/**
 * PUSH-1/PUSH-2 — Push API Handler
 *
 * Public API endpoints for push subscription management:
 * - POST /api/v1/push/subscriptions - Subscribe
 * - DELETE /api/v1/push/subscriptions/current - Unsubscribe
 * - GET /api/v1/push/status - Get subscription status
 * - GET /api/v1/push/public-key - Get VAPID public key
 */

import { createPushSubscriptionService } from './push.subscription.service.js'
import { createPushSubscriptionPersistence } from './persistence/push.subscription.persistence.js'
import { ApplicationResolver } from '../../application/application.resolver.js'
import { FileApplicationPersistence } from '../../application/persistence/file.application.persistence.js'

const persistence = createPushSubscriptionPersistence()
const pushService = createPushSubscriptionService({ persistence })
const appPersistence = new FileApplicationPersistence()

function getVapidPublicKey() {
  return process.env.WEB_PUSH_VAPID_PUBLIC_KEY || null
}

export const pushAPI = {
  async handleSubscribe(req, res) {
    try {
      let body = ''
      for await (const chunk of req) {
        body += chunk
      }

      let data
      try {
        data = JSON.parse(body)
      } catch {
        return this.sendJson(res, 400, { error: 'Bad Request', message: 'Invalid JSON' })
      }

      const applicationId = this.resolveApplicationId(req)
      if (!applicationId) {
        return this.sendJson(res, 400, { error: 'Bad Request', message: 'Could not resolve application' })
      }

      const result = await pushService.register(applicationId, data)

      if (!result.success) {
        return this.sendJson(res, 400, { error: 'Bad Request', message: result.error })
      }

      return this.sendJson(res, 201, {
        success: true,
        subscription: result.subscription,
        isDuplicate: result.isDuplicate || false,
        isReactivated: result.isReactivated || false
      })
    } catch (error) {
      console.error('[PushAPI] Subscribe error:', error.message)
      return this.sendJson(res, 500, { error: 'Internal Server Error' })
    }
  },

  async handleUnsubscribe(req, res) {
    try {
      const applicationId = this.resolveApplicationId(req)
      if (!applicationId) {
        return this.sendJson(res, 400, { error: 'Bad Request', message: 'Could not resolve application' })
      }

      let body = ''
      for await (const chunk of req) {
        body += chunk
      }

      let data = {}
      try {
        if (body) data = JSON.parse(body)
      } catch {
        // body optional for unsubscribe
      }

      if (data.endpoint) {
        const result = await pushService.revokeByEndpoint(applicationId, data.endpoint)
        if (!result.success) {
          return this.sendJson(res, 404, { error: 'Not Found', message: result.error })
        }
        return this.sendJson(res, 200, { success: true, message: 'Unsubscribed' })
      }

      return this.sendJson(res, 400, { error: 'Bad Request', message: 'endpoint is required' })
    } catch (error) {
      console.error('[PushAPI] Unsubscribe error:', error.message)
      return this.sendJson(res, 500, { error: 'Internal Server Error' })
    }
  },

  async handleGetStatus(req, res) {
    try {
      const applicationId = this.resolveApplicationId(req)
      if (!applicationId) {
        return this.sendJson(res, 400, { error: 'Bad Request', message: 'Could not resolve application' })
      }

      const status = await pushService.getStatus(applicationId)

      return this.sendJson(res, 200, {
        success: true,
        ...status
      })
    } catch (error) {
      console.error('[PushAPI] Status error:', error.message)
      return this.sendJson(res, 500, { error: 'Internal Server Error' })
    }
  },

  async handleGetPublicKey(req, res) {
    try {
      const publicKey = getVapidPublicKey()

      if (!publicKey) {
        return this.sendJson(res, 200, {
          success: true,
          publicKey: null,
          configured: false,
          message: 'VAPID public key not configured'
        })
      }

      return this.sendJson(res, 200, {
        success: true,
        publicKey,
        configured: true
      })
    } catch (error) {
      console.error('[PushAPI] PublicKey error:', error.message)
      return this.sendJson(res, 500, { error: 'Internal Server Error' })
    }
  },

  resolveApplicationId(req) {
    const url = new URL(req.url, 'http://localhost')
    const pathname = url.pathname

    const match = pathname.match(/^\/api\/v1\/push/)
    if (!match) return null

    const referer = req.headers['referer'] || req.headers['origin'] || ''
    let domain = null
    let route = null

    try {
      if (referer) {
        const refererUrl = new URL(referer)
        domain = refererUrl.hostname
        route = refererUrl.pathname
        if (route !== '/') {
          route = route.replace(/\/$/, '') || '/'
        }
      }
    } catch {
      // fallback to header-based resolution
    }

    if (!domain) {
      domain = req.headers['x-application-domain'] || 'valdi.app'
    }

    if (!route || route === '/') {
      const pathSegments = pathname.split('/').filter(Boolean)
      const apiIndex = pathSegments.indexOf('push')
      if (apiIndex >= 0 && pathSegments.length > apiIndex + 2) {
        route = '/' + pathSegments[apiIndex + 2]
      }
    }

    const resolver = new ApplicationResolver({
      configurationLoader: appPersistence
    })

    const result = resolver.resolve(domain, route)
    if (result.success && result.resolved) {
      return result.resolved.identity.applicationId
    }

    return `${domain}${route}`.replace('localhost', 'valdi.app').replace('127.0.0.1', 'valdi.app')
  },

  sendJson(res, statusCode, data) {
    res.statusCode = statusCode
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(data))
  }
}

export function createPushRouter(handler) {
  return async function pushRouter(req, res) {
    const url = new URL(req.url, 'http://localhost')
    const pathname = url.pathname

    if (pathname === '/api/v1/push/subscriptions' && req.method === 'POST') {
      return handler.handleSubscribe(req, res)
    }

    if (pathname === '/api/v1/push/subscriptions/current' && req.method === 'DELETE') {
      return handler.handleUnsubscribe(req, res)
    }

    if (pathname === '/api/v1/push/status' && req.method === 'GET') {
      return handler.handleGetStatus(req, res)
    }

    if (pathname === '/api/v1/push/public-key' && req.method === 'GET') {
      return handler.handleGetPublicKey(req, res)
    }

    res.statusCode = 404
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Not Found' }))
  }
}

export default {
  pushAPI,
  createPushRouter
}
