/**
 * Web Errors
 *
 * Error handling for public web delivery.
 * Framework-free implementation.
 */

import { escapeHtml } from '../rendering/html.escape.js'

export const WEB_ERROR_TYPES = {
  'unknown-domain': { status: 404, title: 'Domain Not Found', message: 'The domain you requested is not configured.' },
  'not-found': { status: 404, title: 'Page Not Found', message: 'The page you requested could not be found.' },
  'forbidden': { status: 403, title: 'Access Forbidden', message: 'You do not have permission to access this page.' },
  'internal-error': { status: 500, title: 'Server Error', message: 'Something went wrong. Please try again later.' },
  'service-unavailable': { status: 503, title: 'Service Unavailable', message: 'The service is temporarily unavailable. Please try again later.' }
}

export function renderError(errorType, options = {}) {
  const errorInfo = WEB_ERROR_TYPES[errorType] || WEB_ERROR_TYPES['internal-error']
  const title = escapeHtml(options.title || errorInfo.title)
  const message = escapeHtml(options.message || errorInfo.message)
  const status = options.status || errorInfo.status

  return `<!DOCTYPE html>
<html lang="es-CL">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #fff;
    }
    .error-container {
      text-align: center;
      padding: 2rem;
      background: rgba(255,255,255,0.1);
      border-radius: 16px;
      backdrop-filter: blur(10px);
      max-width: 500px;
    }
    .error-status { font-size: 4rem; font-weight: bold; margin-bottom: 1rem; }
    .error-title { font-size: 1.5rem; margin-bottom: 0.5rem; }
    .error-message { color: rgba(255,255,255,0.8); }
    .error-home { margin-top: 2rem; }
    .error-home a {
      display: inline-block;
      padding: 0.75rem 1.5rem;
      background: #fff;
      color: #667eea;
      border-radius: 8px;
      font-weight: 500;
      transition: transform 0.2s;
    }
    .error-home a:hover { transform: scale(1.05); }
  </style>
</head>
<body>
  <div class="error-container">
    <div class="error-status">${status}</div>
    <h1 class="error-title">${title}</h1>
    <p class="error-message">${message}</p>
    <div class="error-home">
      <a href="/">Return Home</a>
    </div>
  </div>
</body>
</html>`
}

export function getErrorType(statusCode, message) {
  switch (statusCode) {
    case 400:
      return 'bad-request'
    case 403:
      return 'forbidden'
    case 404:
      return 'not-found'
    case 500:
      return 'internal-error'
    case 503:
      return 'service-unavailable'
    default:
      if (statusCode >= 500) {
        return 'internal-error'
      }
      return 'not-found'
  }
}

export default {
  WEB_ERROR_TYPES,
  renderError,
  getErrorType
}
