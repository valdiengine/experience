/**
 * Quote API Handler for Web Server
 *
 * Handles public quote API requests in the web server context.
 * This allows the web server to handle quote submissions without
 * requiring a separate API server.
 *
 * P15.11.3 — Quote Public API
 * P15.11.7 — Quote-to-Notification Orchestration
 */

import { createQuoteAPI } from '../business/quote/api/quote.api.js'
import { rateLimitMiddleware } from '../../api/middleware/rate-limit.middleware.js'

const PUBLIC_RATE_LIMIT_CONFIG = {
  windowMs: 60000,
  max: 10,
  keyPrefix: 'ratelimit:quote:public'
}

export class QuoteAPIHandler {
  #quoteAPI
  #rateLimiter
  #notificationService
  #notificationConfigResolver
  #notificationContextResolver

  constructor(options = {}) {
    this.#quoteAPI = options.quoteAPI || createQuoteAPI()
    this.#rateLimiter = rateLimitMiddleware(PUBLIC_RATE_LIMIT_CONFIG)
    this.#notificationService = options.notificationService || null
    this.#notificationConfigResolver = options.notificationConfigResolver || null
    this.#notificationContextResolver = options.notificationContextResolver || null
  }

  setNotificationService(service) {
    this.#notificationService = service
  }

  setNotificationConfigResolver(resolver) {
    this.#notificationConfigResolver = resolver
  }

  setNotificationContextResolver(resolver) {
    this.#notificationContextResolver = resolver
  }

  async handleCalculate(req, res) {
    try {
      const body = await this.#parseBody(req)
      const result = this.#quoteAPI.handleCalculate(body)

      res.statusCode = result.status || (result.success ? 200 : 400)
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(result))
    } catch (error) {
      console.error('Quote calculate error:', error)
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({
        success: false,
        error: 'Internal server error',
        status: 500
      }))
    }
  }

  async handleSubmit(req, res) {
    try {
      const body = await this.#parseBody(req)
      const context = {
        source: 'quote-public-web',
        requestId: req.headers['x-request-id'] || null,
        userAgent: req.headers['user-agent'] || null,
        origin: req.headers['origin'] || null
      }

      const result = await this.#quoteAPI.handleSubmit(body, context)

      res.statusCode = result.status || (result.success ? 201 : 400)
      res.setHeader('Content-Type', 'application/json')
      if (result.success && result.data?.interactionId) {
        res.setHeader('X-Interaction-Id', result.data.interactionId)
      }

      if (result.success && result.data?.event && this.#notificationService) {
        this.#orchestrateNotification(result.data, body, context).catch(err => {
          console.error('[QuoteAPIHandler] Notification orchestration failed:', err.message)
        })
      }

      res.end(JSON.stringify(result))
    } catch (error) {
      console.error('Quote submit error:', error)
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({
        success: false,
        error: 'Internal server error',
        status: 500
      }))
    }
  }

  async #orchestrateNotification(quoteResult, request, context) {
    const event = quoteResult.event
    if (!event) {
      console.log('[QuoteAPIHandler] No event in quoteResult - skipping notification')
      return
    }

    console.log('[QuoteAPIHandler] #orchestrateNotification() running')
    console.log(`[QuoteAPIHandler] Event: id=${event.id}, type=${event.type}, applicationId=${event.applicationId}`)
    console.log(`[QuoteAPIHandler] Event payload keys: ${Object.keys(event.payload || {}).join(', ')}`)
    console.log(`[QuoteAPIHandler] customerData in payload: ${!!event.payload?.customerData}`)
    if (event.payload?.customerData) {
      console.log(`[QuoteAPIHandler] customerData email: ${event.payload.customerData.email}`)
    }

    const isPreview = context.preview === true || request.preview === true
    console.log(`[QuoteAPIHandler] Preview mode: ${isPreview}`)

    const notificationConfig = this.#resolveNotificationConfig(request, isPreview)
    console.log(`[QuoteAPIHandler] NotificationService exists: ${this.#notificationService !== null}`)
    console.log(`[QuoteAPIHandler] Resolved notification config:`, JSON.stringify(notificationConfig, (k, v) => k === 'recipients' ? v : v, 2))

    if (!notificationConfig) {
      console.log('[QuoteAPIHandler] No notification config - skipping')
      return
    }

    const notificationContext = {
      preview: isPreview,
      source: 'quote-api-handler',
      ...(this.#notificationContextResolver ? this.#notificationContextResolver(request, notificationConfig) : {})
    }
    console.log(`[QuoteAPIHandler] Notification context keys: ${Object.keys(notificationContext).join(',')}`)
    if (notificationContext.applicationOwnerEmail) {
      console.log(`[QuoteAPIHandler] applicationOwnerEmail: ${notificationContext.applicationOwnerEmail}`)
    }

    try {
      const notification = await this.#notificationService.createFromEvent(
        event,
        notificationConfig,
        notificationContext
      )

      if (!notification) {
        console.log('[QuoteAPIHandler] createFromEvent returned null - skipping')
        return
      }

      console.log(`[QuoteAPIHandler] Notification created: ${notification.id}`)
      console.log(`[QuoteAPIHandler] Notification status after createFromEvent(): ${notification.status}`)
      console.log(`[QuoteAPIHandler] Notification channels: ${notification.channels.join(',')}`)
      console.log(`[QuoteAPIHandler] Notification recipients:`, notification.recipients.map(r => ({ type: r.type, address: r.address })))

      if (!isPreview && notification.status !== 'cancelled') {
        console.log(`[QuoteAPIHandler] Calling processNotification() for ${notification.id}`)

        const processed = await this.#notificationService.processNotification(notification.id)
        console.log(`[QuoteAPIHandler] processNotification() completed`)
        console.log(`[QuoteAPIHandler] Final notification status: ${processed.status}`)

        const finalNotification = this.#notificationService.get(notification.id)
        if (finalNotification) {
          console.log(`[QuoteAPIHandler] notificationId: ${finalNotification.id}`)
          console.log(`[QuoteAPIHandler] notification channels: ${finalNotification.channels.join(',')}`)
          console.log(`[QuoteAPIHandler] notification recipients:`, finalNotification.recipients.map(r => ({ type: r.type, address: r.address })))
        }
      } else {
        console.log(`[QuoteAPIHandler] Skipping processNotification() - preview=${isPreview}, status=${notification.status}`)
      }
    } catch (err) {
      console.error(`[QuoteAPIHandler] Notification creation/processing failed:`, err.message)
      console.error(`[QuoteAPIHandler] Stack:`, err.stack)
    }
  }

  #resolveNotificationConfig(request, isPreview) {
    if (this.#notificationConfigResolver) {
      return this.#notificationConfigResolver(request, isPreview)
    }

    return this.#createDefaultNotificationConfig(request, isPreview)
  }

  #createDefaultNotificationConfig(request, isPreview) {
    const applicationId = request.applicationId
    if (!applicationId) {
      return null
    }

    const companyContactEmail = request.companyContactEmail || request.contact?.email || null

    const config = {
      events: {}
    }

    if (isPreview) {
      config.events.quote_request_created = {
        enabled: false,
        channels: []
      }
    } else {
      config.events.quote_request_created = {
        enabled: true,
        channels: companyContactEmail ? ['email'] : [],
        recipients: companyContactEmail ? ['company_contact'] : []
      }
    }

    if (!config.events.quote_request_created.enabled) {
      return null
    }

    return config
  }

  async handleValidate(req, res) {
    try {
      const body = await this.#parseBody(req)
      const result = this.#quoteAPI.handleValidate(body)

      res.statusCode = result.status || (result.success ? 200 : 400)
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(result))
    } catch (error) {
      console.error('Quote validate error:', error)
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({
        success: false,
        error: 'Internal server error',
        status: 500
      }))
    }
  }

  async #parseBody(req) {
    return new Promise((resolve, reject) => {
      let body = ''
      req.on('data', chunk => {
        body += chunk.toString()
      })
      req.on('end', () => {
        try {
          if (!body) {
            resolve({})
            return
          }
          const contentType = req.headers['content-type'] || ''
          if (contentType.includes('application/json')) {
            resolve(JSON.parse(body))
          } else if (contentType.includes('application/x-www-form-urlencoded')) {
            resolve(this.#parseFormData(body))
          } else {
            resolve({})
          }
        } catch (e) {
          reject(new Error('Invalid request body'))
        }
      })
      req.on('error', reject)
    })
  }

  #parseFormData(body) {
    const params = new URLSearchParams(body)
    const data = {}
    for (const [key, value] of params) {
      if (key.endsWith('[]')) {
        const arrayKey = key.slice(0, -2)
        if (!data[arrayKey]) {
          data[arrayKey] = []
        }
        data[arrayKey].push(value)
      } else {
        data[key] = value
      }
    }
    return data
  }

  getRateLimiter() {
    return this.#rateLimiter
  }
}

export function createQuoteAPIHandler(options = {}) {
  return new QuoteAPIHandler(options)
}
