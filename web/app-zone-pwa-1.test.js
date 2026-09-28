/**
 * APP-ZONE-PWA-1 — Zone Application Installability & Push Consumption
 *
 * Focused tests for the first Zone Application that declares the existing
 * Engine capabilities `installableApp` and `pushNotifications`.
 *
 * Covers the real Engine chain:
 *   Zone route config -> ApplicationResolver -> ApplicationConfigLoader ->
 *   CapabilityComposer/CapabilityValidator -> ApplicationPresentationContext ->
 *   ApplicationPresentationAdapter -> HtmlRenderer / PWA middleware
 *
 * No database, no VAPID credentials, no network, no browser.
 *
 * Framework-free implementation (matches existing web/*.test.js style).
 */

import { createApplicationPresentationRenderer } from './application/application.presentation.renderer.js'
import { createApplicationPresentationAdapter } from './application/application.presentation.adapter.js'
import { createApplicationResolver } from './application/application.resolver.js'
import { ConfigurationLoader } from '../experience/loader/configuration.loader.js'
import { HtmlRenderer, createHtmlRenderer } from './rendering/html.renderer.js'
import { createPWAMiddleware, generateServiceWorker } from './middleware/pwa.middleware.js'
import { createOfflineMiddleware } from './middleware/static.middleware.js'
import { Writable } from 'stream'
import { ROUTE_CONFIG } from './routing/route.config.js'

const ISLA_TEJA = { domain: 'valdi.app', path: '/isla-teja' }
const ALBASIE = { domain: 'valdi.app', path: '/albasie' }

let passed = 0
let failed = 0
const failures = []

function test(name, fn) {
  try {
    const result = fn()
    if (result && typeof result.then === 'function') {
      return result.then(
        () => { passed++; console.log(`  PASS ${name}`) },
        (error) => { failed++; failures.push({ name, error }); console.log(`  FAIL ${name}: ${error.message}`) }
      )
    }
    passed++
    console.log(`  PASS ${name}`)
    return Promise.resolve()
  } catch (error) {
    failed++
    failures.push({ name, error })
    console.log(`  FAIL ${name}: ${error.message}`)
    return Promise.resolve()
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed')
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message || 'Assertion failed'}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
  }
}

function assertContains(str, substring, message) {
  if (!str || !str.includes(substring)) {
    throw new Error(`${message || 'Assertion failed'}: expected output to contain "${substring}"`)
  }
}

function assertNotContains(str, substring, message) {
  if (str && str.includes(substring)) {
    throw new Error(`${message || 'Assertion failed'}: expected output NOT to contain "${substring}"`)
  }
}

function mockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(k, v) { this.headers[k.toLowerCase()] = v },
    end(b) { this.body = b }
  }
  return res
}

// APP-ZONE-PWA-1: the offline middleware streams a real file into the response,
// so a real Writable sink is required to observe the delivered body. Built
// locally here on purpose: production architecture is not modified to suit the
// test.
function mockStreamingRes() {
  const chunks = []
  const res = new Writable({
    write(chunk, _encoding, callback) {
      chunks.push(Buffer.from(chunk))
      callback()
    }
  })
  res.statusCode = 200
  res.headers = {}
  res.headersSent = false
  res.setHeader = function (k, v) { this.headers[k.toLowerCase()] = v }
  res.getHeader = function (k) { return this.headers[k.toLowerCase()] }
  res.finished = new Promise(resolve => res.on('finish', resolve))
  Object.defineProperty(res, 'text', { get: () => Buffer.concat(chunks).toString('utf-8') })
  return res
}

console.log('\nAPP-ZONE-PWA-1 — Zone Application Installability & Push Consumption\n')

// ============================================================================
// 1. Declarative capability declaration (generic, not Engine-hardcoded)
// ============================================================================

console.log('1. Zone route declares existing Engine capabilities')

await test('isla-teja route entry declares installableApp and pushNotifications', () => {
  const entry = ROUTE_CONFIG.routes.find(r => r.domain === ISLA_TEJA.domain && r.path === ISLA_TEJA.path)
  assert(entry, 'isla-teja route entry must exist')
  assert(entry.capabilities, 'route entry must carry a capabilities block')
  assertEqual(entry.capabilities.installableApp.enabled, true, 'installableApp enabled')
  assertEqual(entry.capabilities.pushNotifications.enabled, true, 'pushNotifications enabled')
})

await test('no Engine source file is named after the zone', async () => {
  const fs = await import('fs')
  const appFiles = fs.readdirSync('./web/application')
  const routingFiles = fs.readdirSync('./web/routing')
  const middlewareFiles = fs.readdirSync('./web/middleware')
  assert(appFiles.some(f => f.includes('isla-teja')) === false, 'no isla-teja-specific application file')
  assert(routingFiles.some(f => f.includes('isla-teja')) === false, 'no isla-teja-specific routing file')
  assert(middlewareFiles.some(f => f.includes('isla-teja')) === false, 'no isla-teja-specific middleware file')
})

await test('costa zone declares no PWA capabilities (scoped to first consumer)', () => {
  const entry = ROUTE_CONFIG.routes.find(r => r.domain === ISLA_TEJA.domain && r.path === '/costa')
  assert(entry, 'costa route entry must exist')
  const caps = entry.capabilities || {}
  assert(!caps.installableApp, 'costa must not declare installableApp')
  assert(!caps.pushNotifications, 'costa must not declare pushNotifications')
})

// ============================================================================
// 2. Engine composition consumes the declaration
// ============================================================================

console.log('\n2. Existing capability composition consumes the declaration')

// APP-ZONE-PWA-1: the production wiring (web.server.js) always supplies a
// ConfigurationLoader, which is what makes declared company/Application
// capabilities visible to the resolver. Mirror it here.
const configurationLoader = new ConfigurationLoader()
await configurationLoader.initialize()

const resolver = createApplicationResolver({ configurationLoader })
const islaResult = resolver.resolve({ domain: ISLA_TEJA.domain, path: ISLA_TEJA.path })
const albasieResult = resolver.resolve({ domain: ALBASIE.domain, path: ALBASIE.path })

await test('isla-teja resolves successfully through ApplicationResolver', () => {
  assert(islaResult.success, `expected success, got: ${islaResult.error}`)
  assert(islaResult.resolved, 'resolved payload required')
  assertEqual(islaResult.resolved.identity.applicationId, 'valdi.app/isla-teja', 'application identity')
})

await test('composition contains installableApp and pushNotifications', () => {
  const names = islaResult.resolved.composition.capabilities.map(c => c.name)
  assert(names.includes('installableApp'), `installableApp missing from ${names.join(',')}`)
  assert(names.includes('pushNotifications'), `pushNotifications missing from ${names.join(',')}`)
})

await test('declared configuration survives composition (not null)', () => {
  const cap = islaResult.resolved.composition.capabilities.find(c => c.name === 'installableApp')
  assert(cap.configuration, 'installableApp configuration must be present')
  assertEqual(cap.configuration.name, 'Isla Teja', 'name from declaration')
  assertEqual(cap.configuration.scope, '/isla-teja/', 'scope from declaration')
  assertEqual(cap.configuration.startUrl, '/isla-teja/', 'startUrl from declaration')
})

await test('zone SEO / hero identity is preserved (zonePresentation untouched)', () => {
  const entry = ROUTE_CONFIG.routes.find(r => r.domain === ISLA_TEJA.domain && r.path === ISLA_TEJA.path)
  assertEqual(entry.zonePresentation.variant, 'nature', 'zonePresentation variant preserved')
  assertEqual(entry.zonePresentation.tokens.accent, '#e8d5a3', 'zonePresentation tokens preserved')
  assert(Array.isArray(entry.zoneNavigation.items) && entry.zoneNavigation.items.length === 6, 'zoneNavigation preserved')
})

// ============================================================================
// 3. Presentation adapter derives zone identity (no cross-app fallback)
// ============================================================================

console.log('\n3. Presentation adapter derives Application identity')

const appRenderer = createApplicationPresentationRenderer({ configurationLoader })
const islaPresentation = await appRenderer.render({ domain: ISLA_TEJA.domain, path: ISLA_TEJA.path })
const albasiePresentation = await appRenderer.render({ domain: ALBASIE.domain, path: ALBASIE.path })

await test('isla-teja presentation is renderable', () => {
  assert(islaPresentation.success, `expected success, got: ${islaPresentation.error}`)
  assert(islaPresentation.presentation, 'presentation payload required')
})

await test('isla-teja PWA view model uses the zone identity, not albasie', () => {
  const pwa = islaPresentation.presentation.pwa
  assertEqual(pwa.enabled, true, 'pwa enabled')
  assertEqual(pwa.appId, 'valdi.app/isla-teja', 'appId')
  assertEqual(pwa.serviceWorkerUrl, '/sw-isla-teja.js', 'app-scoped service worker URL')
  assertEqual(pwa.serviceWorkerScope, '/isla-teja/', 'app-scoped scope')
  assertEqual(pwa.manifestUrl, '/pwa/valdi__DOT__app__SLASH__isla-teja/manifest.json', 'app-scoped manifest URL')
  assertEqual(pwa.config.name, 'Isla Teja', 'declared name')
  assertEqual(pwa.config.shortName, 'Isla Teja', 'declared short name')
})

await test('no pwa view model value references another application', () => {
  const pwa = islaPresentation.presentation.pwa
  assertNotContains(pwa.serviceWorkerUrl, 'albasie', 'service worker URL must not reference albasie')
  assertNotContains(pwa.serviceWorkerScope, 'albasie', 'scope must not reference albasie')
  assertNotContains(pwa.manifestUrl, 'albasie', 'manifest URL must not reference albasie')
})

await test('albasie PWA identity is byte-for-byte unchanged', () => {
  const pwa = albasiePresentation.presentation.pwa
  assertEqual(pwa.enabled, true, 'albasie pwa still enabled')
  assertEqual(pwa.serviceWorkerUrl, '/sw-albasie.js', 'albasie service worker URL')
  assertEqual(pwa.serviceWorkerScope, '/albasie/', 'albasie scope')
  assertEqual(pwa.config.shortName, 'Albasie', 'albasie short name')
  assertEqual(pwa.config.themeColor, '#2d5a27', 'albasie theme color')
})

// ============================================================================
// 4. PWA middleware: app-scoped, capability-gated, fail closed
// ============================================================================

console.log('\n4. PWA middleware serves only declared, app-scoped artifacts')

await test('service worker for isla-teja is app-scoped', async () => {
  const middleware = createPWAMiddleware()
  const res = mockRes()
  await middleware({ pathname: '/sw-isla-teja.js', domain: 'valdi.app' }, res, () => {})

  assertEqual(res.statusCode, 200, 'SW served')
  assertContains(res.body, "app-cache-valdi_app_isla_teja-", 'app-scoped cache prefix')
  assertContains(res.body, "APP_SCOPE = '/isla-teja/'", 'declared scope')
  assertContains(res.body, "OFFLINE_URL = '/offline.html'", 'declared offline fallback')
  assertNotContains(res.body, 'albasie', 'must not reference another application')
})

await test('service worker does not delete other applications caches', async () => {
  const middleware = createPWAMiddleware()
  const res = mockRes()
  await middleware({ pathname: '/sw-isla-teja.js', domain: 'valdi.app' }, res, () => {})

  assertContains(res.body, "name.startsWith(APPLICATION_CACHE_PREFIX)", 'cleanup stays prefix-scoped')
  assert(res.body.includes("'app-cache-valdi_app_albasie-'") === false, 'must not reference albasie cache')
})

await test('service worker for an undeclared application fails closed', async () => {
  const middleware = createPWAMiddleware()
  const res = mockRes()
  await middleware({ pathname: '/sw-costa.js', domain: 'valdi.app' }, res, () => {})

  assertEqual(res.statusCode, 404, 'undeclared application must not receive a service worker')
})

await test('manifest for isla-teja carries the declared identity', async () => {
  const middleware = createPWAMiddleware()
  const res = mockRes()
  await middleware({ pathname: '/pwa/valdi__DOT__app__SLASH__isla-teja/manifest.json', domain: 'valdi.app' }, res, () => {})

  assertEqual(res.statusCode, 200, 'manifest served')
  const manifest = JSON.parse(res.body)
  assertEqual(manifest.name, 'Isla Teja', 'manifest name')
  assertEqual(manifest.short_name, 'Isla Teja', 'manifest short_name')
  assertEqual(manifest.start_url, '/isla-teja/', 'manifest start_url')
  assertEqual(manifest.scope, '/isla-teja/', 'manifest scope')
  assertEqual(manifest.theme_color, '#3a7d66', 'manifest theme_color from existing zone token')
  assert(manifest.id.includes('isla-teja'), 'manifest id must be app-scoped')
})

await test('manifest for an undeclared application fails closed (no fabricated identity)', async () => {
  const middleware = createPWAMiddleware()
  const res = mockRes()
  await middleware({ pathname: '/pwa/valdi_app__SLASH__costa/manifest.json', domain: 'valdi.app' }, res, () => {})

  assertEqual(res.statusCode, 404, 'undeclared application must not receive a manifest')
})

await test('declared manifest icons reference real, served assets', async () => {
  const fs = await import('fs')
  const entry = ROUTE_CONFIG.routes.find(r => r.domain === ISLA_TEJA.domain && r.path === ISLA_TEJA.path)
  const icons = entry.capabilities.installableApp.icons
  assert(icons.length >= 2, 'at least 192 and 512 icons required for installability')
  for (const icon of icons) {
    const rel = icon.src.replace(/^\//, '')
    assert(fs.existsSync(`./public/${rel}`), `icon must exist on disk: ${icon.src}`)
  }
  const sizes = icons.map(i => i.sizes)
  assert(sizes.includes('192x192'), '192x192 icon required')
  assert(sizes.includes('512x512'), '512x512 icon required')
})

await test('declared offline fallback exists on disk', async () => {
  const fs = await import('fs')
  const entry = ROUTE_CONFIG.routes.find(r => r.domain === ISLA_TEJA.domain && r.path === ISLA_TEJA.path)
  const offline = entry.capabilities.installableApp.offlineFallback
  assert(offline.startsWith('/'), 'offline fallback must be an absolute path')
  assert(fs.existsSync(`./public${offline}`), `offline fallback must exist: ${offline}`)
})

await test('offline fallback is generic and dependency-free', async () => {
  const fs = await import('fs')
  const html = fs.readFileSync('./public/offline.html', 'utf-8')
  assertNotContains(html.toLowerCase(), 'isla-teja', 'offline page must not be app-specific')
  assertNotContains(html, 'http://', 'offline page must not reference external http resources')
  assertNotContains(html, 'https://', 'offline page must not reference external https resources')
  assertNotContains(html, '<script', 'offline page must not require scripts')
})

await test('generated service worker keeps the app-scoped cache contract', () => {
  const code = generateServiceWorker('isla-teja', 'valdi.app', { scope: '/isla-teja/', offlineFallback: '/offline.html' })
  assertContains(code, "app-cache-valdi_app_isla_teja-", 'cache prefix')
  assertContains(code, "CACHE_NAME = APPLICATION_CACHE_PREFIX + 'v1'", 'versioned cache name')
})

await test('service worker install survives a missing precache URL (worker must activate)', async () => {
  const middleware = createPWAMiddleware()
  const res = mockRes()
  await middleware({ pathname: '/sw-isla-teja.js', domain: 'valdi.app' }, res, () => {})
  const code = res.body

  assertNotContains(code, 'cache.addAll(', 'a single 404 must not reject the whole install')
  assertContains(code, 'Promise.allSettled', 'precache tolerates individual misses')
  assertContains(code, 'self.skipWaiting()', 'worker skips waiting and activates')
  assertContains(code, 'self.clients.claim()', 'worker claims clients on activate')
})

await test('service worker never precaches outside its Application scope', async () => {
  const middleware = createPWAMiddleware()
  const res = mockRes()
  await middleware({ pathname: '/sw-isla-teja.js', domain: 'valdi.app' }, res, () => {})
  const code = res.body

  // Inspect only the install precache list, not every literal in the worker.
  const start = code.indexOf('var precacheUrls')
  const block = code.slice(start, code.indexOf('];', start))
  assert(start > 0, 'precache list must exist')

  const precacheEntries = block.match(/APP_SCOPE \+ '[^']*'|APP_SCOPE|OFFLINE_URL/g) || []
  assertEqual(precacheEntries.length, 3, `precache must list exactly 3 resolved entries, got ${block}`)
  assertEqual(precacheEntries[0], 'APP_SCOPE', 'first entry is the Application scope')
  assertEqual(precacheEntries[1], "APP_SCOPE + 'index.html'", 'second entry is scoped to the Application')
  assertEqual(precacheEntries[2], 'OFFLINE_URL', 'third entry is the platform offline resource')

  assertContains(code, "APP_SCOPE = '/isla-teja/'", 'scope is the Application scope')
  assertContains(code, "OFFLINE_URL = '/offline.html'", 'offline fallback is the platform resource')
  assertNotContains(block, 'api/', 'precache must never include API routes')
  assertNotContains(block, 'reservation', 'precache must never include reservation routes')
})

// ============================================================================
// 5. Platform offline fallback is actually served over HTTP
// ============================================================================

console.log('\n5. /offline.html is served, not merely present on disk')

// A disk-existence assertion is not serving evidence. These tests drive the
// real middleware contract end to end.
const offlineMiddleware = createOfflineMiddleware()
const PUBLIC_FIXTURE = './public/apps/valdi/albasie/icons/icon-192.png'

await test('/offline.html is handled and returns 200 with HTML content', async () => {
  const fs = await import('fs')
  const res = mockStreamingRes()
  let nexted = false

  await offlineMiddleware({ pathname: '/offline.html' }, res, () => { nexted = true })
  await res.finished

  assertEqual(nexted, false, 'the middleware must handle /offline.html')
  assertEqual(res.statusCode, 200, 'offline fallback must return 200')
  assertContains(res.getHeader('content-type'), 'text/html', 'Content-Type must be HTML')
  assertEqual(res.getHeader('x-content-type-options'), 'nosniff', 'nosniff required')
  assert(res.text.length > 0, 'a non-empty body must be streamed')
  assertContains(res.text, '<!DOCTYPE html>', 'body must be an HTML document')

  // The delivered bytes are the real platform document, not a placeholder.
  const onDisk = fs.readFileSync('./public/offline.html', 'utf-8')
  assertEqual(res.text, onDisk, 'streamed body must equal public/offline.html')
  assertEqual(
    Number(res.getHeader('content-length')),
    Buffer.byteLength(onDisk, 'utf-8'),
    'Content-Length must match the real file size'
  )
})

await test('the served offline document stays generic (not Application-specific)', async () => {
  const res = mockStreamingRes()
  await offlineMiddleware({ pathname: '/offline.html' }, res, () => {})
  await res.finished
  assertNotContains(res.text.toLowerCase(), 'isla-teja', 'must not be zone-specific')
  assertNotContains(res.text.toLowerCase(), 'albasie', 'must not be application-specific')
})

await test('offline fallback uses a short-lived cache policy, not the immutable asset policy', async () => {
  const res = mockStreamingRes()
  await offlineMiddleware({ pathname: '/offline.html' }, res, () => {})
  await res.finished
  const cacheControl = String(res.getHeader('cache-control'))
  assert(cacheControl.length > 0, 'Cache-Control must be set')
  assert(!/immutable/i.test(cacheControl), 'must not use the immutable asset policy')
  assert(!/max-age=31536000/.test(cacheControl), 'must not use the one-year max-age')
})

await test('a query string does not prevent the offline resource from being served', async () => {
  const res = mockStreamingRes()
  let nexted = false
  await offlineMiddleware({ pathname: '/offline.html', url: '/offline.html?v=1' }, res, () => { nexted = true })
  await res.finished
  assertEqual(nexted, false, 'query string must not break the offline route')
  assertEqual(res.statusCode, 200, 'offline fallback still served')
})

await test('the OFFLINE_URL the service worker precaches is the URL actually served', async () => {
  const pwa = createPWAMiddleware()
  const swRes = mockRes()
  await pwa({ pathname: '/sw-isla-teja.js', domain: 'valdi.app' }, swRes, () => {})

  const declared = swRes.body.match(/OFFLINE_URL = '([^']+)'/)
  assert(declared, 'worker must declare OFFLINE_URL')
  const offlineUrl = declared[1]
  assertEqual(offlineUrl, '/offline.html', 'declared offline fallback')

  // This is the contract that was previously unproven: the worker precaches a
  // URL that the server could not actually return.
  const res = mockStreamingRes()
  let nexted = false
  await offlineMiddleware({ pathname: offlineUrl }, res, () => { nexted = true })
  await res.finished
  assertEqual(nexted, false, 'the precached OFFLINE_URL must be servable')
  assertEqual(res.statusCode, 200, 'precached offline resource returns 200')
})

await test('an unrelated public-root file that exists on disk is NOT served', async () => {
  const fs = await import('fs')
  assert(fs.existsSync(PUBLIC_FIXTURE), `fixture must exist for this assertion: ${PUBLIC_FIXTURE}`)

  const res = mockStreamingRes()
  let nexted = false
  await offlineMiddleware({ pathname: '/apps/valdi/albasie/icons/icon-192.png' }, res, () => { nexted = true })

  assertEqual(nexted, true, 'an unrelated public-root path must fall through')
  assertEqual(res.getHeader('content-type'), undefined, 'no headers may be set for a non-offline path')
  assertEqual(res.getHeader('content-length'), undefined, 'no Content-Length for a non-offline path')
  assertEqual(res.text, '', 'no body may be written for a non-offline path')
})

await test('the middleware is not a generic public directory server', async () => {
  const paths = [
    '/',
    '/index.html',
    '/offline',
    '/offline.htm',
    '/offline.html.bak',
    '/OFFLINE.HTML',
    '/apps/',
    '/apps/valdi/albasie/icons/icon-512.png',
    '/favicon.ico',
    '/manifest.json',
    '/static/style.css',
    '/../package.json',
    '/..%2fpackage.json',
    '/offline.html/../../package.json'
  ]
  for (const pathname of paths) {
    const res = mockStreamingRes()
    let nexted = false
    await offlineMiddleware({ pathname }, res, () => { nexted = true })
    assertEqual(nexted, true, `must fall through for ${pathname}`)
    assertEqual(res.getHeader('content-type'), undefined, `must not serve content for ${pathname}`)
  }
})

await test('web server mounts the offline middleware against publicRoot, without exposing a generic static root', async () => {
  const fs = await import('fs')
  const src = fs.readFileSync('./web/web.server.js', 'utf-8')

  const offlineMountStart = src.indexOf('createOfflineMiddleware({')
  assert(offlineMountStart > 0, 'createOfflineMiddleware must be mounted in the chain')
  const offlineMount = src.slice(offlineMountStart, src.indexOf('})', offlineMountStart))
  assertContains(offlineMount, 'root: this.#config.publicRoot', 'offline mount must use publicRoot')
  assert(!offlineMount.includes('prefix:'), 'offline mount must not declare a generic prefix')

  // The pre-existing generic static mount must remain scoped to staticRoot.
  const staticStart = src.indexOf('createStaticMiddleware({')
  assert(staticStart > 0, 'createStaticMiddleware must still be mounted')
  const staticMount = src.slice(staticStart, src.indexOf('})', staticStart))
  assertContains(staticMount, 'root: this.#config.staticRoot', 'generic static root unchanged')
  assertContains(staticMount, "prefix: '/static'", 'generic static prefix unchanged')
  assert(!staticMount.includes('publicRoot'), 'public/ must never become a generic static root')
})

// ============================================================================
// 6. Renderer: push is authorized by pushNotifications, opt-in only
// ============================================================================

console.log('\n6. Renderer consumes the pushNotifications capability')

const htmlRenderer = createHtmlRenderer()
const islaHtml = htmlRenderer.render(islaPresentation.presentation)
const albasieHtml = htmlRenderer.render(albasiePresentation.presentation)

await test('isla-teja registers its own app-scoped service worker', () => {
  assertContains(islaHtml, "'/sw-isla-teja.js'", 'app-scoped SW registration')
  assertContains(islaHtml, "scope: '/isla-teja/'", 'app-scoped SW scope')
  assertContains(islaHtml, '/pwa/valdi__DOT__app__SLASH__isla-teja/manifest.json', 'app-scoped manifest link')
})

await test('isla-teja emits the push activation UI (declared pushNotifications)', () => {
  assertContains(islaHtml, 'push-notify-btn', 'push button present')
  assertContains(islaHtml, '/api/v1/push/subscriptions', 'subscription endpoint')
})

await test('push permission is requested only from an explicit user action', () => {
  assertContains(islaHtml, "pushButton.addEventListener('click'", 'permission gated behind click')
  const permissionIndex = islaHtml.indexOf('Notification.requestPermission')
  const clickIndex = islaHtml.indexOf("pushButton.addEventListener('click'")
  assert(permissionIndex > clickIndex, 'requestPermission must appear inside/after the click handler')
  assertNotContains(islaHtml, "addEventListener('load', initPush", 'no automatic prompt on load')
})

await test('subscription payload carries no client-supplied application identity', () => {
  const endpoint = islaHtml.indexOf("fetch('/api/v1/push/subscriptions'")
  assert(endpoint > 0, 'push subscription request must exist')
  const start = islaHtml.indexOf('body: JSON.stringify({', endpoint)
  const snippet = islaHtml.slice(start, start + 200)
  assert(start > endpoint, 'subscription body must follow the push endpoint')
  assertNotContains(snippet, 'applicationId', 'client must not send applicationId')
  assertNotContains(snippet, 'domain', 'client must not send a domain')
  assertContains(snippet, 'endpoint', 'endpoint sent')
  assertContains(snippet, 'keys', 'subscription keys sent')

  // The subscription keys are assembled in the same client-side subscribe routine.
  const keysStart = islaHtml.lastIndexOf('var keys = {', endpoint)
  const keysSnippet = islaHtml.slice(keysStart, keysStart + 160)
  assert(keysStart > 0, 'keys object must exist')
  assertContains(keysSnippet, 'p256dh', 'p256dh sent')
  assertContains(keysSnippet, 'auth', 'auth sent')
})

await test('no hardcoded albasie fallback remains in the push/SW scripts', () => {
  assertNotContains(islaHtml, "'/sw-albasie.js'", 'no default service worker URL')
  assertNotContains(islaHtml, "scope: '/albasie/'", 'no default scope')
})

await test('push UI is NOT emitted for an installable Application without pushNotifications', () => {
  const adapter = createApplicationPresentationAdapter()
  const noPushViewModel = {
    ...albasiePresentation.presentation,
    capabilities: [
      { name: 'installableApp', version: '1.0.0', type: 'platform', configuration: { enabled: true } }
    ]
  }
  const html = htmlRenderer.render(noPushViewModel)
  assertNotContains(html, 'push-notify-btn', 'installability alone must not enable push UI')
  assert(adapter, 'adapter available')
})

await test('albasie push/SW behavior is preserved after the change', () => {
  assertContains(albasieHtml, "'/sw-albasie.js'", 'albasie SW registration')
  assertContains(albasieHtml, '/api/v1/push/subscriptions', 'albasie push endpoints preserved')
  assertContains(albasieHtml, 'Notification.requestPermission', 'albasie permission flow preserved')
})

await test('albasie declares pushNotifications explicitly (gate is honest, not implicit)', () => {
  const companyConfig = ROUTE_CONFIG.routes.find(r => r.path === '/albasie')
  assert(companyConfig.company === 'albasie', 'albasie route targets the albasie company')
  const caps = albasieResult.resolved.configuration.capabilities
  assertEqual(caps.pushNotifications.enabled, true, 'declared in the company config')
  const names = albasieResult.resolved.composition.capabilities.map(c => c.name)
  assert(names.includes('pushNotifications'), 'pushNotifications composed for albasie')
})

// ============================================================================
// 7. Push server-side capability gate (fail closed)
// ============================================================================

console.log('\n7. Push endpoints are gated by the declared capability')

const { pushAPI } = await import('./business/push/push.api.js')

await test('subscribe is refused for an Application without pushNotifications', async () => {
  const res = mockRes()
  let status = null
  const req = Object.assign(
    (async function* () { yield JSON.stringify({ endpoint: 'https://fcm.googleapis.com/fcm/send/abc', keys: { p256dh: 'a', auth: 'b' } }) })(),
    { url: '/api/v1/push/subscriptions', headers: { origin: 'https://valdi.app/costa' } }
  )
  await pushAPI.handleSubscribe(req, res)
  status = res.statusCode
  assertEqual(status, 403, 'costa does not declare pushNotifications')
  assertEqual(JSON.parse(res.body).message.includes('pushNotifications'), true, 'capability reason reported')
})

await test('status endpoint is refused for an Application without pushNotifications', async () => {
  const res = mockRes()
  const req = { url: '/api/v1/push/status', headers: { origin: 'https://valdi.app/costa' } }
  await pushAPI.handleGetStatus(req, res)
  assertEqual(res.statusCode, 403, 'costa does not declare pushNotifications')
})

await test('unsubscribe is refused for an Application without pushNotifications', async () => {
  const res = mockRes()
  const req = Object.assign(
    (async function* () { yield JSON.stringify({ endpoint: 'https://fcm.googleapis.com/fcm/send/abc' }) })(),
    { url: '/api/v1/push/subscriptions/current', headers: { origin: 'https://valdi.app/costa' } }
  )
  await pushAPI.handleUnsubscribe(req, res)
  assertEqual(res.statusCode, 403, 'costa does not declare pushNotifications')
})

await test('subscribe passes the capability gate for isla-teja (no identity error)', async () => {
  const res = mockRes()
  const req = Object.assign(
    (async function* () { yield JSON.stringify({ endpoint: 'not-a-url', keys: { p256dh: 'a', auth: 'b' } }) })(),
    { url: '/api/v1/push/subscriptions', headers: { origin: 'https://valdi.app/isla-teja' } }
  )
  process.env.TURISTIC_ENV = 'staging'
  await pushAPI.handleSubscribe(req, res)
  // 400 = reached the service with a server-derived Application identity and
  // failed validation of the intentionally invalid endpoint. A 403 would mean
  // the capability gate rejected a declared Application.
  assert(res.statusCode !== 403, `declared Application must pass the gate, got ${res.statusCode}`)
  assert(res.statusCode !== 400 || JSON.parse(res.body).message !== 'Could not resolve application',
    'Application identity must resolve server-side from the request origin')
})

// ============================================================================
// Summary
// ============================================================================

console.log('\n' + '='.repeat(60))
console.log(`Results: ${passed} passed, ${failed} failed`)
if (failed > 0) {
  console.log('\nFailures:')
  for (const f of failures) {
    console.log(`  - ${f.name}: ${f.error.message}`)
  }
}
console.log('='.repeat(60))

process.exit(failed === 0 ? 0 : 1)
