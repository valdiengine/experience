/**
 * Static Asset Middleware
 *
 * Serves public static assets with security protections.
 * Framework-free implementation.
 */

import { createReadStream, statSync, existsSync } from 'fs'
import { join, resolve, normalize, extname, sep } from 'path'
import { mimeTypes } from './mime.types.js'

const STATIC_ROOT = resolve(process.cwd(), 'public', 'static')
const OFFLINE_ROUTE = '/offline.html'
const OFFLINE_FILENAME = 'offline.html'
const FORBIDDEN_PATTERNS = [
  /\.\./,
  /\.\./
]

export function createStaticMiddleware(options = {}) {
  const root = options.root || STATIC_ROOT
  const prefix = options.prefix || '/static'
  const maxAge = options.maxAge || 31536000
  const normalizedRoot = normalize(root)

  return async function staticMiddleware(req, res, next) {
    const rawPath = req.rawPath || req.pathname || req.url

    if (!rawPath.startsWith(prefix)) {
      return next()
    }

    const assetPath = rawPath.slice(prefix.length)
    if (!assetPath || assetPath === '/') {
      return next()
    }

    if (containsForbiddenPattern(assetPath)) {
      return sendForbidden(res)
    }

    const normalizedPath = normalize(assetPath.replace(/^\//, ''))
    const filepath = resolve(root, normalizedPath)

    const normalizedFilepath = normalize(filepath)
    if (!normalizedFilepath.startsWith(normalizedRoot)) {
      return sendForbidden(res)
    }

    if (!existsSync(filepath)) {
      return sendNotFound(res)
    }

    try {
      const stat = statSync(filepath)
      if (!stat.isFile()) {
        return sendNotFound(res)
      }

      const ext = extname(filepath).toLowerCase()
      const contentType = mimeTypes[ext] || 'application/octet-stream'

      res.statusCode = 200
      res.setHeader('Content-Type', contentType)
      res.setHeader('Content-Length', stat.size)
      res.setHeader('Cache-Control', `public, max-age=${maxAge}, immutable`)
      res.setHeader('X-Content-Type-Options', 'nosniff')

      const stream = createReadStream(filepath)
      stream.pipe(res)
    } catch (error) {
      console.error('Static asset error:', error)
      return sendInternalError(res)
    }
  }
}

function containsForbiddenPattern(path) {
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(path)) {
      return true
    }
  }
  return false
}

function sendForbidden(res) {
  res.statusCode = 403
  res.setHeader('Content-Type', 'text/plain')
  res.end('Forbidden')
}

function sendNotFound(res) {
  res.statusCode = 404
  res.setHeader('Content-Type', 'text/plain')
  res.end('Not Found')
}

function sendInternalError(res) {
  res.statusCode = 500
  res.setHeader('Content-Type', 'text/plain')
  res.end('Internal Server Error')
}

export function createFaviconMiddleware(options = {}) {
  const root = options.root || resolve(process.cwd(), 'public')
  const maxAge = options.maxAge || 86400

  return async function faviconMiddleware(req, res, next) {
    const pathname = req.pathname || req.url

    if (pathname !== '/favicon.ico' && pathname !== '/favicon.png') {
      return next()
    }

    const filename = pathname === '/favicon.png' ? 'favicon.png' : 'favicon.ico'
    const filepath = join(root, filename)

    if (!existsSync(filepath)) {
      return next()
    }

    try {
      const stat = statSync(filepath)
      const ext = extname(filepath).toLowerCase()
      const contentType = ext === '.png' ? 'image/png' : 'image/x-icon'

      res.statusCode = 200
      res.setHeader('Content-Type', contentType)
      res.setHeader('Content-Length', stat.size)
      res.setHeader('Cache-Control', `public, max-age=${maxAge}`)
      res.setHeader('X-Content-Type-Options', 'nosniff')

      const stream = createReadStream(filepath)
      stream.pipe(res)
    } catch (error) {
      return next()
    }
  }
}

/**
 * Platform offline fallback middleware.
 *
 * Serves the single platform resource `public/offline.html` at `/offline.html`
 * so a generated Service Worker `OFFLINE_URL` is actually retrievable over HTTP.
 *
 * This is deliberately NOT a generic static directory server:
 *   - exactly one route is handled: `/offline.html`
 *   - the resolved filename is a module constant with no path separators,
 *     so no user-controlled value ever reaches the filesystem
 *   - every other path falls through to `next()`
 *
 * Cache policy is intentionally short-lived and NOT `immutable`: this document
 * is a runtime fallback, not a fingerprinted build artifact.
 */
export function createOfflineMiddleware(options = {}) {
  const root = options.root || resolve(process.cwd(), 'public')
  const maxAge = options.maxAge || 3600
  const normalizedRoot = normalize(root)

  return async function offlineMiddleware(req, res, next) {
    const rawPath = req.pathname || req.url || ''
    // Only ever compared against the fixed route below; never used as a path.
    const pathname = rawPath.split('?')[0].split('#')[0]

    if (pathname !== OFFLINE_ROUTE) {
      return next()
    }

    // Constant segment: contains no separators and no traversal sequence.
    const filepath = join(normalizedRoot, OFFLINE_FILENAME)
    const normalizedFilepath = normalize(filepath)
    if (!normalizedFilepath.startsWith(normalizedRoot)) {
      return next()
    }

    if (!existsSync(filepath)) {
      return next()
    }

    try {
      const stat = statSync(filepath)
      if (!stat.isFile()) {
        return next()
      }

      res.statusCode = 200
      res.setHeader('Content-Type', mimeTypes['.html'])
      res.setHeader('Content-Length', stat.size)
      res.setHeader('Cache-Control', `public, max-age=${maxAge}`)
      res.setHeader('X-Content-Type-Options', 'nosniff')

      const stream = createReadStream(filepath)
      stream.on('error', () => {
        // Never surface filesystem detail to the client.
        if (!res.headersSent) {
          sendInternalError(res)
        } else {
          res.end()
        }
      })
      stream.pipe(res)
    } catch {
      return next()
    }
  }
}

export function createManifestMiddleware(options = {}) {
  const root = options.root || resolve(process.cwd(), 'public')
  const maxAge = options.maxAge || 86400

  return async function manifestMiddleware(req, res, next) {
    const pathname = req.pathname || req.url

    if (pathname !== '/manifest.json') {
      return next()
    }

    const filepath = join(root, 'manifest.json')

    if (!existsSync(filepath)) {
      return next()
    }

    try {
      const stat = statSync(filepath)
      const content = await import('fs').then(fs => fs.promises.readFile(filepath, 'utf-8'))
      const json = JSON.parse(content)

      res.statusCode = 200
      res.setHeader('Content-Type', 'application/manifest+json')
      res.setHeader('Cache-Control', `public, max-age=${maxAge}`)

      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(json))
    } catch (error) {
      return next()
    }
  }
}

export default {
  createStaticMiddleware,
  createFaviconMiddleware,
  createOfflineMiddleware,
  createManifestMiddleware
}
