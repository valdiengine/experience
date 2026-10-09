/**
 * P15.4.2 — Public Web Presentation Integration Tests
 *
 * Comprehensive integration tests for the complete public web rendering pipeline:
 * HTTP → Domain Resolution → Experience Runtime → Presentation → HTML
 */

import { createServer } from 'http'
import http from 'http'
import { PublicWebServer } from './web.server.js'
import { createDomainResolver, CANONICAL_DOMAINS } from './middleware/domain.resolver.js'
import { createHtmlRenderer } from './rendering/html.renderer.js'
import { escapeHtml, escapeUrl } from './rendering/html.escape.js'
import { createCacheKey } from './cache/web.cache.js'
import { PresentationRuntime } from '../runtime/experience/presentation.runtime.js'
import { PRESENTATION_CONTRACT } from '../experience/presentation/presentation.contract.js'

const TEST_PORT = 3098
const TEST_HOST = 'localhost'

const CANONICAL_DOMAINS_DATA = [
  { hostname: 'valdi.app', destination: 'valdi', region: 'los-rios' },
  { hostname: 'natales.app', destination: 'natales', region: 'magallanes' },
  { hostname: 'puntaarenas.app', destination: 'puntaarenas', region: 'magallanes' },
  { hostname: 'coyhaique.app', destination: 'coyhaique', region: 'aysen' },
  { hostname: 'chiloe.app', destination: 'chiloe', region: 'los-lagos' }
]

const REJECTED_DOMAINS = [
  'valdivia.app',
  'valdivi.app',
  'unknown.com',
  'example.com',
  'malicious.com'
]

function assert(condition, message) {
  if (!condition) throw new Error(`Assertion failed: ${message}`)
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) throw new Error(`Assertion failed: ${message}\nExpected: ${expected}\nActual: ${actual}`)
}

function assertContains(str, substring, message) {
  if (!str.includes(substring)) throw new Error(`Assertion failed: ${message}\nString does not contain: ${substring}`)
}

function assertNotContains(str, substring, message) {
  if (str.includes(substring)) throw new Error(`Assertion failed: ${message}\nString should NOT contain: ${substring}`)
}

function assertNoInternalFieldKey(html, field, message) {
  const pattern = new RegExp(`["']${field}["']\\s*:`)
  if (pattern.test(html)) {
    throw new Error(`Assertion failed: ${message}\nSerialized internal field key found: "${field}"`)
  }
}

async function runTests() {
  console.log('🧪 Running P15.4.2 Public Web Presentation Integration Tests...\n')

  let passed = 0
  let failed = 0

  const tests = [
    // Domain Resolution Tests
    testFiveCanonicalDomains,
    testDomainResolverForAllDomains,
    testValdiviaAppRejection,
    testUnknownDomainRejection,
    testDomainNormalization,

    // Presentation Runtime Tests
    testPresentationRuntimeForAllDomains,
    testPresentationContainsRequiredFields,

    // HTML Rendering Tests
    testHtmlDocumentStructure,
    testComponentRendering,
    testHeroRendering,
    testServicesRendering,
    testGalleryRendering,
    testCompaniesRendering,
    testContactRendering,
    testFooterRendering,

    // SEO Tests
    testSeoTitle,
    testSeoDescription,
    testCanonicalUrl,
    testOgTags,
    testTwitterTags,

    // Security Tests
    testHtmlEscaping,
    testUrlSchemeRejection,
    testPathTraversalPrevention,
    testInternalFieldsNotExposed,
    testNoCredentialsInResponse,

    // Cache Isolation Tests
    testCacheKeyIsolation,
    testCacheKeyFormat,

    // Integration Tests
    testEndToEndValdi,
    testEndToEndNatales,
    testEndToEndPuntaArenas,
    testEndToEndCoyhaique,
    testEndToEndChiloe,
    testEndToEndValdiviaRejected,

    // Server Tests
    testHealthEndpoint,
    testStaticAssetServing,
    testStaticAssetSecurity,
    testShutdown
  ]

  for (const test of tests) {
    try {
      await test()
      console.log(`✅ ${test.name}`)
      passed++
    } catch (error) {
      console.log(`❌ ${test.name}: ${error.message}`)
      failed++
    }
  }

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`)
  return { passed, failed }
}

// ============ Domain Resolution Tests ============

function testFiveCanonicalDomains() {
  assertEqual(CANONICAL_DOMAINS.length, 5, 'Should have exactly 5 canonical domains')
  assert(CANONICAL_DOMAINS.includes('valdi.app'), 'Should include valdi.app')
  assert(CANONICAL_DOMAINS.includes('natales.app'), 'Should include natales.app')
  assert(CANONICAL_DOMAINS.includes('puntaarenas.app'), 'Should include puntaarenas.app')
  assert(CANONICAL_DOMAINS.includes('coyhaique.app'), 'Should include coyhaique.app')
  assert(CANONICAL_DOMAINS.includes('chiloe.app'), 'Should include chiloe.app')
  assert(!CANONICAL_DOMAINS.includes('valdivia.app'), 'Should NOT include valdivia.app')
}

function testDomainResolverForAllDomains() {
  const resolver = createDomainResolver()

  for (const { hostname, destination, region } of CANONICAL_DOMAINS_DATA) {
    const resolved = resolver.resolve(hostname)
    assert(resolved !== null, `Should resolve ${hostname}`)
    assertEqual(resolved.destination, destination, `Should resolve ${hostname} to ${destination}`)
    assertEqual(resolved.region, region, `Should have correct region for ${hostname}`)
  }
}

function testValdiviaAppRejection() {
  const resolver = createDomainResolver()
  assert(resolver.isRejected('valdivia.app'), 'valdivia.app should be rejected')
  assert(resolver.resolve('valdivia.app') === null, 'valdivia.app should not resolve')
}

function testUnknownDomainRejection() {
  const resolver = createDomainResolver()

  for (const domain of REJECTED_DOMAINS) {
    assert(resolver.isRejected(domain), `${domain} should be rejected`)
    assert(resolver.resolve(domain) === null, `${domain} should not resolve`)
  }
}

function testDomainNormalization() {
  const resolver = createDomainResolver()

  assert(resolver.isCanonical('VALDI.APP'), 'Should accept uppercase')
  assert(resolver.isCanonical('www.valdi.app'), 'Should strip www')
  assert(resolver.isCanonical('WWW.VALDI.APP'), 'Should handle WWW uppercase')
  assert(resolver.isCanonical('Natales.App'), 'Should handle mixed case')
}

// ============ Presentation Runtime Tests ============

let testServer = null

async function testPresentationRuntimeForAllDomains() {
  const runtime = new PresentationRuntime()
  await runtime.initialize()

  for (const { hostname, destination } of CANONICAL_DOMAINS_DATA) {
    const presentation = await runtime.render({ hostname })
    assert(presentation !== null, `Should render for ${hostname}`)
    assertEqual(presentation.metadata.destination, destination, `Destination should be ${destination} for ${hostname}`)
    assert(presentation.requestId > 0, `Should have requestId for ${hostname}`)
  }

  await runtime.shutdown()
}

async function testPresentationContainsRequiredFields() {
  const runtime = new PresentationRuntime()
  await runtime.initialize()

  const presentation = await runtime.render({ hostname: 'valdi.app' })

  assert(presentation.metadata, 'Should have metadata')
  assert(presentation.identity, 'Should have identity')
  assert(presentation.destination, 'Should have destination')
  assert(presentation.branding, 'Should have branding')
  assert(presentation.seo, 'Should have seo')
  assert(presentation.navigation, 'Should have navigation')
  assert(presentation.contact, 'Should have contact')
  assert(presentation.sections, 'Should have sections')
  assert(presentation.components, 'Should have components')

  await runtime.shutdown()
}

// ============ HTML Rendering Tests ============

async function testHtmlDocumentStructure() {
  const runtime = new PresentationRuntime()
  await runtime.initialize()
  const renderer = createHtmlRenderer()

  const presentation = await runtime.render({ hostname: 'valdi.app' })
  const html = renderer.render(presentation, { canonicalDomain: 'valdi.app', pathname: '/' })

  assertContains(html, '<!DOCTYPE html>', 'Should have doctype')
  assertContains(html, '<html', 'Should have html tag')
  assertContains(html, '</html>', 'Should close html tag')
  assertContains(html, '<head>', 'Should have head tag')
  assertContains(html, '</head>', 'Should close head tag')
  assertContains(html, '<body>', 'Should have body tag')
  assertContains(html, '</body>', 'Should close body tag')

  await runtime.shutdown()
}

async function testComponentRendering() {
  const runtime = new PresentationRuntime()
  await runtime.initialize()
  const renderer = createHtmlRenderer()

  const presentation = await runtime.render({ hostname: 'valdi.app' })
  const html = renderer.render(presentation, { canonicalDomain: 'valdi.app', pathname: '/' })

  assertContains(html, 'site-header', 'Should have header')
  assertContains(html, 'site-footer', 'Should have footer')

  await runtime.shutdown()
}

async function testHeroRendering() {
  const runtime = new PresentationRuntime()
  await runtime.initialize()
  const renderer = createHtmlRenderer()

  const presentation = await runtime.render({ hostname: 'valdi.app' })
  const html = renderer.render(presentation, { canonicalDomain: 'valdi.app', pathname: '/' })

  assertContains(html, 'hero', 'Should have hero section')

  await runtime.shutdown()
}

async function testServicesRendering() {
  const runtime = new PresentationRuntime()
  await runtime.initialize()
  const renderer = createHtmlRenderer()

  const presentation = await runtime.render({ hostname: 'valdi.app' })
  const html = renderer.render(presentation, { canonicalDomain: 'valdi.app', pathname: '/' })

  assertContains(html, 'services', 'Should have services section')

  await runtime.shutdown()
}

async function testGalleryRendering() {
  const runtime = new PresentationRuntime()
  await runtime.initialize()
  const renderer = createHtmlRenderer()

  const presentation = await runtime.render({ hostname: 'valdi.app' })
  const html = renderer.render(presentation, { canonicalDomain: 'valdi.app', pathname: '/' })

  assertContains(html, 'gallery', 'Should have gallery section')

  await runtime.shutdown()
}

async function testCompaniesRendering() {
  const runtime = new PresentationRuntime()
  await runtime.initialize()
  const renderer = createHtmlRenderer()

  const presentation = await runtime.render({ hostname: 'valdi.app' })
  const html = renderer.render(presentation, { canonicalDomain: 'valdi.app', pathname: '/' })

  assertContains(html, 'companies', 'Should have companies section')

  await runtime.shutdown()
}

async function testContactRendering() {
  const runtime = new PresentationRuntime()
  await runtime.initialize()
  const renderer = createHtmlRenderer()

  const presentation = await runtime.render({ hostname: 'valdi.app' })
  const html = renderer.render(presentation, { canonicalDomain: 'valdi.app', pathname: '/' })

  assertContains(html, 'contact', 'Should have contact section')

  await runtime.shutdown()
}

async function testFooterRendering() {
  const runtime = new PresentationRuntime()
  await runtime.initialize()
  const renderer = createHtmlRenderer()

  const presentation = await runtime.render({ hostname: 'valdi.app' })
  const html = renderer.render(presentation, { canonicalDomain: 'valdi.app', pathname: '/' })

  assertContains(html, 'site-footer', 'Should have footer')
  assertContains(html, 'footer-column', 'Should have footer columns')

  await runtime.shutdown()
}

// ============ SEO Tests ============

async function testSeoTitle() {
  const runtime = new PresentationRuntime()
  await runtime.initialize()
  const renderer = createHtmlRenderer()

  const presentation = await runtime.render({ hostname: 'valdi.app' })
  const html = renderer.render(presentation, { canonicalDomain: 'valdi.app', pathname: '/' })

  assertContains(html, '<title>', 'Should have title tag')
  assertNotContains(html, '<title></title>', 'Title should not be empty')

  await runtime.shutdown()
}

async function testSeoDescription() {
  const runtime = new PresentationRuntime()
  await runtime.initialize()
  const renderer = createHtmlRenderer()

  const presentation = await runtime.render({ hostname: 'valdi.app' })
  const html = renderer.render(presentation, { canonicalDomain: 'valdi.app', pathname: '/' })

  assertContains(html, 'description', 'Should support meta description tag')
  assertContains(html, '<meta', 'Should have meta tags')

  await runtime.shutdown()
}

async function testCanonicalUrl() {
  const runtime = new PresentationRuntime()
  await runtime.initialize()
  const renderer = createHtmlRenderer()

  const presentation = await runtime.render({ hostname: 'valdi.app' })
  const html = renderer.render(presentation, { canonicalDomain: 'valdi.app', pathname: '/' })

  assertContains(html, 'rel="canonical"', 'Should have canonical link')
  assertContains(html, 'https://valdi.app/', 'Canonical URL should be correct')

  await runtime.shutdown()
}

async function testOgTags() {
  const runtime = new PresentationRuntime()
  await runtime.initialize()
  const renderer = createHtmlRenderer()

  const presentation = await runtime.render({ hostname: 'valdi.app' })
  const html = renderer.render(presentation, { canonicalDomain: 'valdi.app', pathname: '/' })

  assertContains(html, 'og:', 'Should have OG tags')
  assertContains(html, 'og:title', 'Should have OG title')

  await runtime.shutdown()
}

async function testTwitterTags() {
  const runtime = new PresentationRuntime()
  await runtime.initialize()
  const renderer = createHtmlRenderer()

  const presentation = await runtime.render({ hostname: 'valdi.app' })
  const html = renderer.render(presentation, { canonicalDomain: 'valdi.app', pathname: '/' })

  assertContains(html, 'twitter:card', 'Should have Twitter card')

  await runtime.shutdown()
}

// ============ Security Tests ============

function testHtmlEscaping() {
  assertEqual(escapeHtml('<script>'), '&lt;script&gt;', 'Should escape script tags')
  assertEqual(escapeHtml('"quotes"'), '&quot;quotes&quot;', 'Should escape quotes')
  assertEqual(escapeHtml("'single'"), '&#x27;single&#x27;', 'Should escape single quotes')
  assertEqual(escapeHtml('&amp;'), '&amp;amp;', 'Should escape ampersands')
  const escaped = escapeHtml('<img onerror="alert(1)">')
  assert(escaped.includes('&lt;img'), 'Should escape opening tag')
  assert(escaped.includes('onerror'), 'Should preserve attribute name')
}

function testUrlSchemeRejection() {
  assertEqual(escapeUrl('javascript:alert(1)'), '', 'Should reject javascript:')
  assertEqual(escapeUrl('data:text/html,<script>alert(1)</script>'), '', 'Should reject data:')
  assertEqual(escapeUrl('vbscript:msgbox("xss")'), '', 'Should reject vbscript:')
  assertEqual(escapeUrl('https://example.com/path'), 'https://example.com/path', 'Should allow https')
  assertEqual(escapeUrl('/relative/path'), '/relative/path', 'Should allow relative')
}

async function testPathTraversalPrevention() {
  if (!testServer) {
    testServer = new PublicWebServer({ port: TEST_PORT, host: TEST_HOST, env: 'test' })
    await testServer.initialize()
    await testServer.start()
  }

  const response = await makeRequest('valdi.app', '/static/../../../etc/passwd')
  assertNotContains(response, 'root:', 'Should not expose /etc/passwd')
  assert(response.includes('Not Found') || response.includes('Forbidden') || response.includes('404'), 'Should return error for traversal')
}

async function testInternalFieldsNotExposed() {
  const runtime = new PresentationRuntime()
  await runtime.initialize()
  const renderer = createHtmlRenderer()

  const presentation = await runtime.render({ hostname: 'valdi.app' })
  const html = renderer.render(presentation, { canonicalDomain: 'valdi.app', pathname: '/' })

  // Contract: experience/presentation/presentation.contract.js declares
  // FORBIDDEN_EXPOSURE = ['config', 'providers', 'request', 'resolution'];
  // presentation.adapter.js strips INTERNAL_FIELDS = ['config', 'providers'].
  // Assert those field NAMES are never serialised as object keys in the public
  // document. Matching the quoted key distinguishes the forbidden field name
  // from legitimate public output: the inline comment "Quote API configuration
  // from server" and the browser global `window.quoteAPIConfig` both contain
  // the substring "config" but are valid public contracts.
  for (const field of PRESENTATION_CONTRACT.FORBIDDEN_EXPOSURE) {
    assertNoInternalFieldKey(html, field, `Should not expose internal field "${field}"`)
  }

  assertNotContains(html, 'database', 'Should not expose database internals')
  assertNotContains(html, 'secret', 'Should not expose secrets')

  await runtime.shutdown()
}

async function testNoCredentialsInResponse() {
  const runtime = new PresentationRuntime()
  await runtime.initialize()
  const renderer = createHtmlRenderer()

  const presentation = await runtime.render({ hostname: 'valdi.app' })
  const html = renderer.render(presentation, { canonicalDomain: 'valdi.app', pathname: '/' })

  assertNotContains(html, 'password', 'Should not expose passwords')
  assertNotContains(html, 'api_key', 'Should not expose API keys')
  assertNotContains(html, 'secret', 'Should not expose secrets')
  assertNotContains(html, 'credential', 'Should not expose credentials')

  await runtime.shutdown()
}

// ============ Cache Isolation Tests ============

function testCacheKeyIsolation() {
  const keys = CANONICAL_DOMAINS_DATA.map(d =>
    createCacheKey({ domain: d.hostname, destination: d.destination, path: '/' })
  )

  const uniqueKeys = new Set(keys)
  assertEqual(uniqueKeys.size, keys.length, 'All cache keys should be unique')
}

function testCacheKeyFormat() {
  const key = createCacheKey({
    domain: 'valdi.app',
    destination: 'valdi',
    experience: 'tourism-directory',
    locale: 'es-CL',
    path: '/'
  })

  assertContains(key, 'valdi.app', 'Key should contain domain')
  assertContains(key, 'valdi', 'Key should contain destination')
  assertContains(key, 'tourism-directory', 'Key should contain experience')
  assertContains(key, 'es-CL', 'Key should contain locale')
  assert(!key.includes('natales'), 'Key should not contain other destinations')

  const keyWithPath = createCacheKey({
    domain: 'valdi.app',
    destination: 'valdi',
    experience: 'tourism-directory',
    locale: 'es-CL',
    path: '/categories'
  })
  assert(keyWithPath !== key, 'Different paths should produce different keys')
}

// ============ End-to-End Tests ============

async function testEndToEndValdi() {
  if (!testServer) {
    testServer = new PublicWebServer({ port: TEST_PORT, host: TEST_HOST, env: 'test' })
    await testServer.initialize()
    await testServer.start()
  }

  const html = await makeRequest('valdi.app', '/')
  assertContains(html, '<!DOCTYPE html>', 'Should return HTML')
  assertContains(html, 'valdi', 'Should contain destination reference')
  assertNotContains(html, 'valdivia', 'Should NOT contain valdivia')
}

async function testEndToEndNatales() {
  if (!testServer) {
    testServer = new PublicWebServer({ port: TEST_PORT, host: TEST_HOST, env: 'test' })
    await testServer.initialize()
    await testServer.start()
  }

  const html = await makeRequest('natales.app', '/')
  assertContains(html, '<!DOCTYPE html>', 'Should return HTML')
  assertContains(html, 'natales', 'Should contain natales reference')
}

async function testEndToEndPuntaArenas() {
  if (!testServer) {
    testServer = new PublicWebServer({ port: TEST_PORT, host: TEST_HOST, env: 'test' })
    await testServer.initialize()
    await testServer.start()
  }

  const html = await makeRequest('puntaarenas.app', '/')
  assertContains(html, '<!DOCTYPE html>', 'Should return HTML')
  assertContains(html, 'puntaarenas', 'Should contain puntaarenas reference')
}

async function testEndToEndCoyhaique() {
  if (!testServer) {
    testServer = new PublicWebServer({ port: TEST_PORT, host: TEST_HOST, env: 'test' })
    await testServer.initialize()
    await testServer.start()
  }

  const html = await makeRequest('coyhaique.app', '/')
  assertContains(html, '<!DOCTYPE html>', 'Should return HTML')
  assertContains(html, 'coyhaique', 'Should contain coyhaique reference')
}

async function testEndToEndChiloe() {
  if (!testServer) {
    testServer = new PublicWebServer({ port: TEST_PORT, host: TEST_HOST, env: 'test' })
    await testServer.initialize()
    await testServer.start()
  }

  const html = await makeRequest('chiloe.app', '/')
  assertContains(html, '<!DOCTYPE html>', 'Should return HTML')
  assertContains(html, 'chiloe', 'Should contain chiloe reference')
}

async function testEndToEndValdiviaRejected() {
  if (!testServer) {
    testServer = new PublicWebServer({ port: TEST_PORT, host: TEST_HOST, env: 'test' })
    await testServer.initialize()
    await testServer.start()
  }

  const html = await makeRequest('valdivia.app', '/')
  assertContains(html, '404', 'Should return 404 for valdivia.app')
  assertContains(html, 'Domain Not Found', 'Should say domain not found')
}

// ============ Server Tests ============

async function testHealthEndpoint() {
  if (!testServer) {
    testServer = new PublicWebServer({ port: TEST_PORT, host: TEST_HOST, env: 'test' })
    await testServer.initialize()
    await testServer.start()
  }

  const health = await testServer.health()
  assertEqual(health.status, 'healthy', 'Server should be healthy')
  assert(health.server === 'public-web', 'Should identify as public-web')
}

async function testStaticAssetServing() {
  if (!testServer) {
    testServer = new PublicWebServer({ port: TEST_PORT, host: TEST_HOST, env: 'test' })
    await testServer.initialize()
    await testServer.start()
  }

  const response = await makeRawRequest(TEST_HOST, TEST_PORT, '/manifest.json', 'valdi.app')
  assertEqual(response.statusCode, 200, 'Manifest should return 200')
}

async function testStaticAssetSecurity() {
  if (!testServer) {
    testServer = new PublicWebServer({ port: TEST_PORT, host: TEST_HOST, env: 'test' })
    await testServer.initialize()
    await testServer.start()
  }

  const response = await makeRawRequest(TEST_HOST, TEST_PORT, '/static/../../../etc/passwd', 'valdi.app')
  assert(response.statusCode === 403 || response.statusCode === 404, 'Traversal should be blocked')
  assertNotContains(response.body || '', 'root:', 'Should not expose system files')
}

async function testShutdown() {
  if (testServer) {
    await testServer.shutdown()
    testServer = null
  }
}

// ============ Helper Functions ============

async function makeRequest(hostname, path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: TEST_HOST,
      port: TEST_PORT,
      path: path,
      method: 'GET',
      headers: { Host: hostname }
    }

    const req = http.request(options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => resolve(data))
    })

    req.on('error', reject)
    req.end()
  })
}

async function makeRawRequest(host, port, path, hostname) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: host,
      port: port,
      path: path,
      method: 'GET',
      headers: { Host: hostname }
    }

    const req = http.request(options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => resolve({ statusCode: res.statusCode, body: data }))
    })

    req.on('error', reject)
    req.end()
  })
}

export { runTests }

runTests().then(result => {
  console.log(`\nP15.4.2 Presentation Integration: ${result.passed}/${result.passed + result.failed} passed`)
  process.exit(result.failed > 0 ? 1 : 0)
}).catch(err => {
  console.error('Test error:', err)
  process.exit(1)
})
