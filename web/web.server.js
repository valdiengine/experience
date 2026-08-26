/**
 * Public Web Server
 *
 * HTTP server implementation for public web delivery.
 * Framework-free SSR using native Node.js http module.
 */

import { createServer } from 'http'
import { readFileSync } from 'fs'
import { join, resolve } from 'path'
import { URL } from 'url'
import { createDomainMiddleware, sendHtmlResponse } from './middleware/domain.middleware.js'
import { createRouteOwnershipMiddleware } from './middleware/route.ownership.middleware.js'
import { createStaticMiddleware, createFaviconMiddleware, createManifestMiddleware } from './middleware/static.middleware.js'
import { createPWAMiddleware } from './middleware/pwa.middleware.js'
import { createEcosystemSimulationMiddleware } from './middleware/ecosystem.simulation.middleware.js'
import { createHtmlRenderer } from './rendering/html.renderer.js'
import { renderError, getErrorType } from './errors/web.errors.js'
import { createWebCache, createCacheKey } from './cache/web.cache.js'
import { PresentationRuntime } from '../runtime/experience/presentation.runtime.js'
import { createApplicationPresentationRenderer } from './application/application.presentation.renderer.js'
import { createContentProvider, isEditorialRoute, getEditorialType } from './content/content.provider.js'
import { createWordPressAdapter } from './content/wordpress/wordpress.adapter.js'
import { ConfigurationLoader } from '../experience/loader/configuration.loader.js'
import { createQuoteAPIHandler } from './api/quote-api.handler.js'
import { pushAPI, createPushRouter } from './business/push/push.api.js'
import { createNotificationService, createFileNotificationPersistence } from './business/notification/index.js'
import { EmailNotificationAdapter, SMTPEmailProvider, MockEmailProvider } from './business/notification/adapters/email/index.js'
import { WhatsAppNotificationAdapter, MockWhatsAppProvider, MetaGraphWhatsAppProvider, TwilioWhatsAppProvider } from './business/notification/adapters/whatsapp/index.js'
import { createOwnerAPIHandler, createOwnerRouter } from './owner/owner.api.js'

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

const DEFAULT_CONFIG = {
  port: process.env.WEB_PORT || 3001,
  host: process.env.WEB_HOST || '0.0.0.0',
  env: process.env.NODE_ENV || 'development',
  staticRoot: process.cwd() + '/public/static',
  publicRoot: process.cwd() + '/public'
}

export class PublicWebServer {
  #config
  #server
  #runtime
  #appRenderer
  #renderer
  #cache
  #contentProvider
  #configurationLoader
  #quoteAPIHandler
  #pushRouter
  #ownerRouter
  #notificationService
  #middleware = []
  #initialized = false

  constructor(config = {}) {
    this.#config = { ...DEFAULT_CONFIG, ...config }
    this.#renderer = createHtmlRenderer()
    this.#cache = createWebCache({ maxSize: 500, ttl: 60000 })
    this.#contentProvider = null
    this.#appRenderer = null
    this.#configurationLoader = null
    this.#notificationService = this.#createNotificationService()
    this.#quoteAPIHandler = this.#createQuoteAPIHandlerWithNotification()
    this.#pushRouter = createPushRouter(pushAPI)
    this.#ownerRouter = this.#createOwnerRouter()
  }

  #createNotificationService() {
    const persistence = createFileNotificationPersistence()

    const emailProvider = this.#createEmailProvider()
    const defaultFrom = process.env.EMAIL_FROM || 'rodrigomedina@valdi.app'
    const emailAdapter = new EmailNotificationAdapter({
      mockMode: emailProvider instanceof MockEmailProvider,
      provider: emailProvider,
      defaultFrom
    })

    const whatsAppProvider = this.#createWhatsAppProvider()
    const whatsAppAdapter = new WhatsAppNotificationAdapter({
      mockMode: whatsAppProvider instanceof MockWhatsAppProvider,
      provider: whatsAppProvider
    })

    const service = createNotificationService({
      persistence,
      adapters: { email: emailAdapter, whatsapp: whatsAppAdapter }
    })

    console.log(`[NotificationService] Email provider: ${emailProvider.constructor.name} (${emailAdapter.health().status})`)
    console.log(`[NotificationService] WhatsApp provider: ${whatsAppProvider.constructor.name} (${whatsAppAdapter.health().status})`)
    console.log(`[NotificationService] Default sender: ${defaultFrom}`)

    return service
  }

  #createWhatsAppProvider() {
    const providerType = process.env.WHATSAPP_PROVIDER || 'mock'

    if (providerType === 'meta') {
      return new MetaGraphWhatsAppProvider({
        accessToken: process.env.META_ACCESS_TOKEN,
        phoneNumberId: process.env.META_PHONE_NUMBER_ID,
        from: process.env.META_FROM_NUMBER
      })
    }

    if (providerType === 'twilio') {
      return new TwilioWhatsAppProvider({
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
        from: process.env.TWILIO_FROM_NUMBER
      })
    }

    console.log(`[NotificationService] WHATSAPP_PROVIDER=${providerType}, using MockWhatsAppProvider`)
    return new MockWhatsAppProvider()
  }

  #createEmailProvider() {
    const providerType = process.env.EMAIL_PROVIDER || 'mock'

    if (providerType === 'smtp') {
      return new SMTPEmailProvider({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 465,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD
        }
      })
    }

    console.log(`[NotificationService] EMAIL_PROVIDER=${providerType}, using MockEmailProvider`)
    return new MockEmailProvider()
  }

  #createQuoteAPIHandlerWithNotification() {
    const handler = createQuoteAPIHandler({
      notificationService: this.#notificationService,
      notificationConfigResolver: this.#resolveNotificationConfig.bind(this),
      notificationContextResolver: this.#resolveNotificationContext.bind(this)
    })

    console.log(`[QuoteAPIHandler] Notification orchestration enabled`)

    return handler
  }

  #createOwnerRouter() {
    const ownerHandler = createOwnerAPIHandler()
    return createOwnerRouter(ownerHandler)
  }

  #resolveNotificationContext(request, notificationConfig) {
    const context = {}
    const eventConfig = notificationConfig?.events?.business_interaction_created

    if (eventConfig?.recipients?.includes('application_owner')) {
      context.applicationOwnerEmail = process.env.ALBASIE_NOTIFICATION_EMAIL || 'admin@valdi.app'
      console.log(`[NotificationContext] applicationOwnerEmail: ${context.applicationOwnerEmail}`)

      context.applicationOwnerPhone = process.env.ALBASIE_NOTIFICATION_WHATSAPP || null
      if (context.applicationOwnerPhone) {
        console.log(`[NotificationContext] applicationOwnerPhone: ${context.applicationOwnerPhone}`)
      }
    }

    return context
  }

  #resolveNotificationConfig(request, isPreview) {
    const applicationId = request.applicationId
    if (!applicationId) {
      return null
    }

    if (isPreview) {
      return {
        events: {
          business_interaction_created: {
            enabled: false,
            channels: []
          }
        }
      }
    }

    const config = {
      events: {
        business_interaction_created: {
          enabled: true,
          channels: ['email', 'whatsapp'],
          recipients: ['application_owner']
        }
      }
    }

    console.log(`[NotificationConfig] Resolved for ${applicationId}: channels=${config.events.business_interaction_created.channels.join(',')}, recipients=${config.events.business_interaction_created.recipients.join(',')}`)

    return config
  }

  async initialize() {
    if (this.#initialized) return

    this.#runtime = new PresentationRuntime()
    await this.#runtime.initialize()

    this.#configurationLoader = new ConfigurationLoader()
    await this.#configurationLoader.initialize()

    this.#appRenderer = createApplicationPresentationRenderer({
      configurationLoader: this.#configurationLoader
    })

    this.#initializeContentProvider()

    this.#middleware = [
      createStaticMiddleware({
        root: this.#config.staticRoot,
        prefix: '/static',
        maxAge: 31536000
      }),
      createFaviconMiddleware({
        root: this.#config.publicRoot,
        maxAge: 86400
      }),
      createManifestMiddleware({
        root: this.#config.publicRoot,
        maxAge: 86400
      }),
      createEcosystemSimulationMiddleware({
        env: this.#config.env
      }),
      createDomainMiddleware({
        env: this.#config.env,
        onUnknown: this.#handleUnknownDomain.bind(this)
      }),
      createPWAMiddleware({
        maxAge: 86400
      }),
      createRouteOwnershipMiddleware({ env: this.#config.env }),
      this.#handlePublicRoute.bind(this)
    ]

    this.#server = createServer((req, res) => {
      this.#handleRequest(req, res)
    })

    this.#initialized = true
  }

  async start() {
    if (!this.#initialized) {
      await this.initialize()
    }

    return new Promise((resolve) => {
      this.#server.listen(this.#config.port, this.#config.host, () => {
        console.log(`Public Web Server running on ${this.#config.host}:${this.#config.port}`)
        resolve()
      })
    })
  }

  async shutdown() {
    if (this.#runtime) {
      await this.#runtime.shutdown()
    }

    if (this.#server) {
      await new Promise((resolve) => {
        this.#server.close(() => resolve())
      })
    }

    this.#initialized = false
  }

  async #handleRequest(req, res) {
    const requestId = req.headers['x-request-id'] || generateUUID()
    const startTime = Date.now()

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const url = new URL(req.url, `http://${req.headers.host}`)
      const pathname = url.pathname
      if (pathname.startsWith('/api/v1/owner')) {
        return this.#ownerRouter(req, res)
      }
      if (pathname.startsWith('/api/v1/quotes')) {
        return this.#handleQuoteAPI(req, res, pathname)
      }
      if (pathname.startsWith('/api/v1/push')) {
        return this.#handlePushAPI(req, res, pathname)
      }
      res.statusCode = 405
      res.setHeader('Content-Type', 'text/plain')
      res.setHeader('Allow', 'GET, HEAD')
      res.end('Method Not Allowed')
      return
    }

    try {
      const parsed = this.#parseRequest(req)
      parsed.requestId = requestId
      const isHeadMethod = req.method === 'HEAD'
      res.isHeadMethod = isHeadMethod

      let index = 0
      const next = async () => {
        if (index >= this.#middleware.length) {
          return this.#handleNotFound(res, requestId)
        }
        const middleware = this.#middleware[index++]
        await middleware(parsed, res, next)
      }

      await next()

      this.#logRequest(parsed, res.statusCode || 200, Date.now() - startTime)
    } catch (error) {
      console.error('Request error:', error)
      this.#handleInternalError(res, error, requestId)
    }
  }

  #parseRequest(req) {
    const url = new URL(req.url, `http://${req.headers.host}`)
    return {
      method: req.method,
      url: req.url,
      pathname: url.pathname,
      rawPath: req.url,
      query: Object.fromEntries(url.searchParams),
      headers: req.headers,
      raw: req
    }
  }

  async #handlePublicRoute(req, res, next) {
    if (req.pathname.startsWith('/api/v1/owner')) {
      return this.#ownerRouter(req, res)
    }

    if (req.pathname.startsWith('/api/v1/quotes')) {
      return this.#handleQuoteAPI(req, res)
    }

    if (req.pathname.startsWith('/api/v1/push')) {
      return this.#handlePushAPI(req, res)
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return next()
    }

    if (req.pathname.startsWith('/health')) {
      return this.#handleHealthEndpoint(req, res)
    }

    // Portal routes - serve dedicated portal HTML files for Owner and Admin
    if (req.pathname === '/owner' || req.pathname === '/admin') {
      return this.#handlePortalRoute(req, res)
    }

    if (req.routeOwnership) {
      if (req.routeOwnership.isHybrid) {
        return this.#handleHybridRoute(req, res)
      }

      if (req.routeOwnership.isExperience) {
        return this.#handleExperienceRoute(req, res)
      }
    }

    if (req.isStagingHost && req.pathname === '/' && req.routeOwnership?.ownership === 'wordpress') {
      return this.#handleExperienceRoute(req, res)
    }

    if (this.#isEditorialRoute(req.pathname)) {
      return this.#handleEditorialRoute(req, res)
    }

    try {
      const html = await this.#renderPage(req)
      sendHtmlResponse(res, 200, html, {
        'X-Request-Id': req.requestId,
        'X-Destination': req.destination,
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300'
      })
    } catch (error) {
      console.error('Render error:', error)
      this.#handleRenderError(res, error, req)
    }
  }

  #isEditorialRoute(pathname) {
    if (!pathname) return false

    const editorialPrefixes = ['/blog', '/noticias', '/guia', '/articulos']

    for (const prefix of editorialPrefixes) {
      if (pathname === prefix || pathname.startsWith(prefix + '/')) {
        return true
      }
    }

    return false
  }

  async #handleEditorialRoute(req, res) {
    try {
      const content = await this.#fetchEditorialContent(req)

      if (!content) {
        const errorHtml = renderError('not-found')
        sendHtmlResponse(res, 404, errorHtml, {
          'X-Request-Id': req.requestId,
          'X-Destination': req.destination
        })
        return
      }

      const html = await this.#renderEditorialContent(req, content)
      sendHtmlResponse(res, 200, html, {
        'X-Request-Id': req.requestId,
        'X-Destination': req.destination,
        'X-Content-Type': 'editorial',
        'X-Route-Ownership': 'wordpress',
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600'
      })
    } catch (error) {
      console.error('Editorial render error:', error)
      this.#handleRenderError(res, error, req)
    }
  }

  async #handleHybridRoute(req, res) {
    try {
      const content = await this.#fetchEditorialContent(req)

      if (!content) {
        const errorHtml = renderError('not-found')
        sendHtmlResponse(res, 404, errorHtml, {
          'X-Request-Id': req.requestId,
          'X-Destination': req.destination
        })
        return
      }

      const html = await this.#renderPage(req, {
        content: {
          title: content.title,
          excerpt: content.excerpt,
          body: content.content,
          author: content.author?.name || null,
          date: content.date,
          categories: content.categories || [],
          featuredImage: content.featuredImage
        },
        editorial: true
      })

      sendHtmlResponse(res, 200, html, {
        'X-Request-Id': req.requestId,
        'X-Destination': req.destination,
        'X-Content-Type': 'hybrid',
        'X-Route-Ownership': 'hybrid',
        'X-Migration-State': req.routeOwnership?.migrationState || 'HYBRID_ACTIVE',
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600'
      })
    } catch (error) {
      console.error('Hybrid render error:', error)
      this.#handleRenderError(res, error, req)
    }
  }

  async #handleExperienceRoute(req, res) {
    try {
      const result = await this.#appRenderer.render({
        domain: req.domain,
        path: req.pathname,
        routeOwnership: req.routeOwnership?.ownership,
        destination: req.destination,
        company: req.routeOwnership?.company,
        zone: req.routeOwnership?.zone,
        experienceType: req.routeOwnership?.experienceType
      })

      if (!result.success) {
        const errorHtml = renderError('not-found')
        sendHtmlResponse(res, 404, errorHtml, {
          'X-Request-Id': req.requestId,
          'X-Destination': req.destination
        })
        return
      }

      const presentation = result.presentation
      const html = await this.#renderApplicationPage(req, presentation)

      sendHtmlResponse(res, 200, html, {
        'X-Request-Id': req.requestId,
        'X-Destination': req.destination,
        'X-Content-Type': 'experience',
        'X-Route-Ownership': 'experience',
        'X-Migration-State': req.routeOwnership?.migrationState || 'EXPERIENCE_ACTIVE',
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300'
      })
    } catch (error) {
      console.error('Experience render error:', error)
      this.#handleRenderError(res, error, req)
    }
  }

  async #handlePortalRoute(req, res) {
    const pathname = req.pathname
    const isOwner = pathname === '/owner'
    const isAdmin = pathname === '/admin'

    if (!isOwner && !isAdmin) {
      return this.#handleNotFound(res, req.requestId)
    }

    const portalFile = isOwner
      ? resolve(process.cwd(), 'web', 'owner', 'owner-portal.html')
      : resolve(process.cwd(), 'web', 'admin', 'admin-portal.html')

    try {
      const html = readFileSync(portalFile, 'utf-8')

      sendHtmlResponse(res, 200, html, {
        'X-Request-Id': req.requestId,
        'X-Destination': req.destination,
        'X-Content-Type': isOwner ? 'owner-portal' : 'admin-portal',
        'Cache-Control': 'private, no-cache, no-store, must-revalidate'
      })
    } catch (error) {
      console.error(`Portal render error (${pathname}):`, error)
      this.#handleRenderError(res, error, req)
    }
  }

  async #handleQuoteAPI(req, res, pathname) {
    try {
      if (pathname === '/api/v1/quotes' || pathname === '/api/v1/quotes/') {
        if (req.method === 'POST') {
          return this.#quoteAPIHandler.handleSubmit(req, res)
        }
        res.statusCode = 405
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Allow', 'POST')
        res.end(JSON.stringify({ error: 'Method Not Allowed', status: 405 }))
        return
      }

      if (pathname === '/api/v1/quotes/calculate') {
        if (req.method === 'POST') {
          return this.#quoteAPIHandler.handleCalculate(req, res)
        }
        res.statusCode = 405
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Allow', 'POST')
        res.end(JSON.stringify({ error: 'Method Not Allowed', status: 405 }))
        return
      }

      if (pathname === '/api/v1/quotes/validate') {
        if (req.method === 'POST') {
          return this.#quoteAPIHandler.handleValidate(req, res)
        }
        res.statusCode = 405
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Allow', 'POST')
        res.end(JSON.stringify({ error: 'Method Not Allowed', status: 405 }))
        return
      }

      res.statusCode = 404
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'Not Found', status: 404 }))
    } catch (error) {
      console.error('Quote API error:', error)
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'Internal Server Error', status: 500 }))
    }
  }

  async #handlePushAPI(req, res, pathname) {
    try {
      await this.#pushRouter(req, res)
    } catch (error) {
      console.error('Push API error:', error)
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'Internal Server Error', status: 500 }))
    }
  }

  async #fetchEditorialContent(req) {
    if (!this.#contentProvider) {
      return null
    }

    try {
      const content = await this.#contentProvider.getContent(req.pathname, req.destination)
      return content
    } catch (error) {
      console.error('Content fetch error:', error)
      return null
    }
  }

  async #renderEditorialContent(req, content) {
    const presentation = {
      metadata: {
        destination: req.destination,
        destinationName: req.domain?.replace('.app', '') || req.destination,
        language: 'es',
        locale: 'es-CL',
        canonicalDomain: req.canonicalDomain
      },
      seo: {
        title: content.title || '',
        description: content.excerpt || '',
        image: content.featuredImage?.src || null
      },
      content: {
        title: content.title,
        excerpt: content.excerpt,
        body: content.content,
        author: content.author?.name || null,
        date: content.date,
        categories: content.categories || [],
        featuredImage: content.featuredImage
      }
    }

    return this.#renderer.render(presentation, req)
  }

  #initializeContentProvider() {
    this.#contentProvider = createContentProvider()

    const wordpressConfig = this.#config.wordpress

    if (wordpressConfig) {
      if (wordpressConfig.destinations) {
        for (const [destination, config] of Object.entries(wordpressConfig.destinations)) {
          if (config && config.enabled !== false) {
            const adapter = createWordPressAdapter({
              destination,
              endpoint: config.endpoint,
              apiKey: config.apiKey,
              timeout: config.timeout || 5000,
              retries: config.retries || 1,
              cacheSize: config.cacheSize || 500,
              cacheTtl: config.cacheTtl || 300000
            })
            this.#contentProvider.registerAdapter(destination, adapter)
          }
        }
      } else if (wordpressConfig.endpoint) {
        const adapter = createWordPressAdapter({
          destination: 'default',
          endpoint: wordpressConfig.endpoint,
          apiKey: wordpressConfig.apiKey,
          timeout: wordpressConfig.timeout || 5000,
          retries: wordpressConfig.retries || 1
        })
        this.#contentProvider.registerAdapter('wordpress', adapter)
      }
    }
  }

  async #renderPage(req, options = {}) {
    const routeOwnership = req.routeOwnership?.ownership || 'wordpress'
    const migrationState = req.routeOwnership?.migrationState || 'ACTIVE_WORDPRESS'

    const cacheKey = createCacheKey({
      domain: req.canonicalDomain,
      destination: req.destination,
      experience: 'tourism-directory',
      locale: 'es-CL',
      path: req.pathname,
      ownership: routeOwnership,
      migration: migrationState
    })

    const cached = this.#cache.get(cacheKey)
    if (cached) {
      return cached
    }

    const renderOptions = {
      hostname: req.canonicalDomain
    }

    if (options.content) {
      renderOptions.content = options.content
      renderOptions.editorial = options.editorial || false
    }

    const presentation = await this.#runtime.render(renderOptions)

    const html = this.#renderer.render(presentation, req)

    const ttl = routeOwnership === 'wordpress' ? 300000 : 60000
    this.#cache.set(cacheKey, html, ttl)

    return html
  }

  async #renderApplicationPage(req, presentation) {
    const cacheKey = createCacheKey({
      domain: req.canonicalDomain,
      destination: req.destination,
      experience: presentation.experience?.id || 'application',
      locale: 'es-CL',
      path: req.pathname,
      ownership: 'experience'
    })

    const cached = this.#cache.get(cacheKey)
    if (cached) {
      return cached
    }

    const html = this.#renderer.render(presentation, req)

    this.#cache.set(cacheKey, html, 60000)

    return html
  }

  #handleUnknownDomain(req, res, hostname) {
    const errorHtml = renderError('unknown-domain')
    sendHtmlResponse(res, 404, errorHtml, {
      'X-Request-Id': req.requestId
    })
  }

  #handleNotFound(res, requestId) {
    const errorHtml = renderError('not-found')
    sendHtmlResponse(res, 404, errorHtml, {
      'X-Request-Id': requestId
    })
  }

  #handleInternalError(res, error, requestId) {
    const status = error.statusCode || 500
    const errorHtml = renderError('internal-error', {
      message: this.#config.env === 'development' ? error.message : undefined
    })
    sendHtmlResponse(res, status, errorHtml, {
      'X-Request-Id': requestId
    })
  }

  #handleRenderError(res, error, req) {
    const errorType = getErrorType(500, error.message)
    const status = error.statusCode || 500
    const errorHtml = renderError(errorType, {
      message: this.#config.env === 'development' ? error.message : undefined
    })
    sendHtmlResponse(res, status, errorHtml, {
      'X-Request-Id': req.requestId,
      'X-Destination': req.destination
    })
  }

  #logRequest(req, status, duration) {
    if (this.#config.env === 'development') {
      console.log(`[${req.requestId}] ${req.method} ${req.hostname}${req.pathname} ${status} ${duration}ms`)
    }
  }

  #handleHealthEndpoint(req, res) {
    const health = {
      status: 'ok',
      environment: this.#config.env
    }

    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
    res.end(JSON.stringify(health))
  }

  async health() {
    const runtimeHealth = await this.#runtime.health()
    return {
      status: 'healthy',
      server: 'public-web',
      runtime: runtimeHealth,
      cache: {
        size: this.#cache.cache?.size || 0
      }
    }
  }
}

export async function createPublicWebServer(config = {}) {
  const server = new PublicWebServer(config)
  return server
}

export default PublicWebServer
