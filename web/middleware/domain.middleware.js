/**
 * Domain Middleware
 *
 * Middleware that resolves hostname to destination identity.
 * Must NOT contain destination-specific presentation logic.
 */

import { createDomainResolver } from './domain.resolver.js'

export function createDomainMiddleware(options = {}) {
  const env = options.env || process.env.NODE_ENV || 'development'
  const resolver = options.resolver || createDomainResolver({ env })
  const onUnknown = options.onUnknown || defaultUnknownHandler

  return async function domainMiddleware(req, res, next) {
    if (req.isEcosystemSimulation) {
      return next()
    }

    const hostname = req.headers.host

    if (!hostname) {
      return onUnknown(req, res, null, 'Missing host header')
    }

    const resolved = resolver.resolve(hostname)

    if (!resolved) {
      return onUnknown(req, res, hostname)
    }

    req.destination = resolved.destination
    req.domain = resolved.domain
    req.region = resolved.region
    req.country = resolved.country
    req.canonicalDomain = resolved.domain
    req.isDevLocalhost = resolved.isDevLocalhost || false
    req.devOriginalHostname = resolved.originalHostname || null
    req.isStagingHost = resolved.isStagingHost || false
    req.stagingOriginalHostname = resolved.originalHostname || null

    next()
  }
}

async function defaultUnknownHandler(req, res, hostname, error) {
  const { renderError } = await import('../errors/web.errors.js')
  const errorPage = renderError('unknown-domain', {
    message: error || 'Domain not configured'
  })
  sendHtmlResponse(res, 404, errorPage)
}

export function sendHtmlResponse(res, status, html, headers = {}) {
  res.statusCode = status
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  for (const [key, value] of Object.entries(headers)) {
    res.setHeader(key, value)
  }
  if (res.isHeadMethod) {
    res.end()
  } else {
    res.end(html)
  }
}

export default createDomainMiddleware
