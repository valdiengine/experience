/**
 * Web Response
 *
 * HTTP response utilities for public web delivery.
 * Framework-free implementation.
 */

export function createResponse(res) {
  return {
    status(code) {
      res.statusCode = code
      return this
    },

    header(name, value) {
      res.setHeader(name, value)
      return this
    },

    json(data) {
      res.statusCode = res.statusCode || 200
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.end(JSON.stringify(data))
      return this
    },

    html(html, options = {}) {
      res.statusCode = res.statusCode || 200
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.setHeader('X-Content-Type-Options', 'nosniff')

      if (options.cacheControl) {
        res.setHeader('Cache-Control', options.cacheControl)
      }
      if (options.requestId) {
        res.setHeader('X-Request-Id', options.requestId)
      }
      if (options.destination) {
        res.setHeader('X-Destination', options.destination)
      }

      res.end(html)
      return this
    },

    redirect(url, status = 302) {
      res.statusCode = status
      res.setHeader('Location', url)
      res.end()
      return this
    },

    notFound(message = 'Not Found') {
      res.statusCode = 404
      res.setHeader('Content-Type', 'text/plain; charset=utf-8')
      res.end(message)
      return this
    },

    sendFile(filepath, options = {}) {
      res.statusCode = 200
      if (options.contentType) {
        res.setHeader('Content-Type', options.contentType)
      }
      if (options.cacheControl) {
        res.setHeader('Cache-Control', options.cacheControl)
      }
      return this
    }
  }
}

export function sendHtml(res, status, html, options = {}) {
  const response = createResponse(res)
  response.status(status)
  response.html(html, options)
}

export function sendRedirect(res, url, status = 302) {
  res.statusCode = status
  res.setHeader('Location', url)
  res.end()
}

export function sendNotFound(res, message = 'Not Found') {
  res.statusCode = 404
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.end(message)
}

export function sendError(res, status, message) {
  res.statusCode = status
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.end(message)
}

export default {
  createResponse,
  sendHtml,
  sendRedirect,
  sendNotFound,
  sendError
}
