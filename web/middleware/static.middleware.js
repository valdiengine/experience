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
  createManifestMiddleware
}
