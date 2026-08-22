/**
 * Web Delivery Index
 *
 * Public web delivery exports.
 */

export { PublicWebServer, createPublicWebServer } from './web.server.js'
export { createDomainMiddleware, createDomainResolver, CANONICAL_DOMAINS } from './middleware/domain.middleware.js'
export { createStaticMiddleware, createFaviconMiddleware, createManifestMiddleware } from './middleware/static.middleware.js'
export { createHtmlRenderer, HtmlRenderer } from './rendering/html.renderer.js'
export { renderDocument } from './templates/document.template.js'
export * from './templates/component.templates.js'
export { renderError, WEB_ERROR_TYPES, getErrorType } from './errors/web.errors.js'
export { createWebCache, createCacheKey } from './cache/web.cache.js'
export { createResponse, sendHtml, sendRedirect, sendNotFound, sendError } from './response/web.response.js'
export { escapeHtml, escapeHtmlAttr, escapeUrl, escapeAttr, escapeScript } from './rendering/html.escape.js'
