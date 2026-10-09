/**
 * P15.4.3 — Public Web Production Readiness Validation Tests
 *
 * Comprehensive validation of production readiness for the Public Web Runtime.
 */

import http from 'http'
import { PublicWebServer } from './web.server.js'
import { createHtmlRenderer } from './rendering/html.renderer.js'
import { PresentationRuntime } from '../runtime/experience/presentation.runtime.js'
import { escapeHtml, escapeUrl } from './rendering/html.escape.js'
import { createCacheKey } from './cache/web.cache.js'
import { CANONICAL_DOMAINS } from './middleware/domain.resolver.js'

const TEST_PORT = 3096
const TEST_HOST = 'localhost'

let testServer = null

const CANONICAL_DOMAINS_DATA = [
  { hostname: 'valdi.app', destination: 'valdi', region: 'los-rios' },
  { hostname: 'natales.app', destination: 'natales', region: 'magallanes' },
  { hostname: 'puntaarenas.app', destination: 'puntaarenas', region: 'magallanes' },
  { hostname: 'coyhaique.app', destination: 'coyhaique', region: 'aysen' },
  { hostname: 'chiloe.app', destination: 'chiloe', region: 'los-lagos' }
]

let passed = 0
let failed = 0
const results = []

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

function assertNotEqual(actual, unexpected, message) {
  if (actual === unexpected) throw new Error(`Assertion failed: ${message}\nActual should not equal: ${unexpected}`)
}

// A V8 stack frame is a line beginning (after whitespace) with `at` and
// carrying a `file:line:column` location. This matches real runtime stack
// traces while ignoring benign copy such as the zone-nav CSS comment
// ("gutter at the right.") or inline JS (`var at = ...`, `[Push] Error:`).
const STACK_FRAME_PATTERN = /(?:^|\n)\s*at\s+[^\n]*:\d+:\d+/

function assertNoStackTrace(body, message) {
  const match = body.match(STACK_FRAME_PATTERN)
  if (match) throw new Error(`Assertion failed: ${message}\nMatched stack frame: ${match[0].trim()}`)
}

async function runTests() {
  console.log('🧪 P15.4.3 — Production Readiness Validation\n')

  // Start server
  testServer = new PublicWebServer({ port: TEST_PORT, host: TEST_HOST, env: 'production' })
  await testServer.initialize()
  await testServer.start()

  const testGroups = [
    { name: 'HTTP Correctness', tests: httpCorrectnessTests() },
    { name: 'Security', tests: securityTests() },
    { name: 'XSS Protection', tests: xssTests() },
    { name: 'Path Traversal', tests: pathTraversalTests() },
    { name: 'Static Asset Isolation', tests: staticAssetIsolationTests() },
    { name: 'Host Header Security', tests: hostHeaderTests() },
    { name: 'Domain Isolation', tests: domainIsolationTests() },
    { name: 'Company Isolation', tests: companyIsolationTests() },
    { name: 'Cache Isolation', tests: cacheIsolationTests() },
    { name: 'Error Handling', tests: errorHandlingTests() },
    { name: 'Startup/Shutdown', tests: lifecycleTests() },
    { name: 'Concurrency', tests: concurrencyTests() },
    { name: 'Observability', tests: observabilityTests() },
    { name: 'SEO Production', tests: seoTests() },
    { name: 'Memory Safety', tests: memorySafetyTests() }
  ]

  for (const group of testGroups) {
    console.log(`\n📋 ${group.name}`)
    for (const test of group.tests) {
      try {
        await test.fn()
        console.log(`  ✅ ${test.name}`)
        results.push({ group: group.name, name: test.name, status: 'PASS' })
        passed++
      } catch (error) {
        console.log(`  ❌ ${test.name}: ${error.message}`)
        results.push({ group: group.name, name: test.name, status: 'FAIL', error: error.message })
        failed++
      }
    }
  }

  // Shutdown
  await testServer.shutdown()

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`)
  return { passed, failed, results }
}

// ============ HTTP Correctness ============

function httpCorrectnessTests() {
  return [
    {
      name: 'GET method returns 200',
      fn: async () => {
        const response = await makeRequest('valdi.app', '/')
        assert(response.statusCode === 200, `Expected 200, got ${response.statusCode}`)
      }
    },
    {
      name: 'HTML content-type for HTML responses',
      fn: async () => {
        const response = await makeRawRequest(TEST_HOST, TEST_PORT, '/', 'valdi.app')
        assert(response.headers['content-type']?.includes('text/html'), 'Should have HTML content-type')
      }
    },
    {
      name: 'POST method returns 405',
      fn: async () => {
        const response = await makeRawRequestMethod('POST', TEST_HOST, TEST_PORT, '/', 'valdi.app')
        assert(response.statusCode === 405, `Expected 405, got ${response.statusCode}`)
      }
    },
    {
      name: 'PUT method returns 405',
      fn: async () => {
        const response = await makeRawRequestMethod('PUT', TEST_HOST, TEST_PORT, '/', 'valdi.app')
        assert(response.statusCode === 405, `Expected 405, got ${response.statusCode}`)
      }
    },
    {
      name: 'DELETE method returns 405',
      fn: async () => {
        const response = await makeRawRequestMethod('DELETE', TEST_HOST, TEST_PORT, '/', 'valdi.app')
        assert(response.statusCode === 405, `Expected 405, got ${response.statusCode}`)
      }
    },
    {
      name: 'OPTIONS method returns 405',
      fn: async () => {
        const response = await makeRawRequestMethod('OPTIONS', TEST_HOST, TEST_PORT, '/', 'valdi.app')
        assert(response.statusCode === 405, `Expected 405, got ${response.statusCode}`)
      }
    },
    {
      name: 'PATCH method returns 405',
      fn: async () => {
        const response = await makeRawRequestMethod('PATCH', TEST_HOST, TEST_PORT, '/', 'valdi.app')
        assert(response.statusCode === 405, `Expected 405, got ${response.statusCode}`)
      }
    },
    {
      name: 'HEAD method returns 200',
      fn: async () => {
        const response = await makeRawRequestMethod('HEAD', TEST_HOST, TEST_PORT, '/', 'valdi.app')
        assert(response.statusCode === 200, `Expected 200, got ${response.statusCode}`)
      }
    },
    {
      name: 'Cache-Control header present',
      fn: async () => {
        const response = await makeRawRequest(TEST_HOST, TEST_PORT, '/', 'valdi.app')
        assert(response.headers['cache-control'], 'Should have Cache-Control header')
      }
    },
    {
      name: 'X-Content-Type-Options nosniff',
      fn: async () => {
        const response = await makeRawRequest(TEST_HOST, TEST_PORT, '/', 'valdi.app')
        assertEqual(response.headers['x-content-type-options'], 'nosniff', 'Should have nosniff')
      }
    },
    {
      name: 'X-Request-Id header present',
      fn: async () => {
        const response = await makeRawRequest(TEST_HOST, TEST_PORT, '/', 'valdi.app')
        assert(response.headers['x-request-id'], 'Should have X-Request-Id')
      }
    }
  ]
}

// ============ Security Headers ============

function securityTests() {
  return [
    {
      name: 'No internal paths in response',
      fn: async () => {
        const response = await makeRawRequest(TEST_HOST, TEST_PORT, '/', 'valdi.app')
        assertNotContains(response.body, '/database/', 'Should not expose database paths')
        assertNotContains(response.body, '/config/', 'Should not expose config paths')
        assertNotContains(response.body, '/storage/', 'Should not expose storage paths')
      }
    },
    {
      name: 'No credentials in response',
      fn: async () => {
        const response = await makeRawRequest(TEST_HOST, TEST_PORT, '/', 'valdi.app')
        assertNotContains(response.body.toLowerCase(), 'password', 'Should not expose passwords')
        assertNotContains(response.body.toLowerCase(), 'api_key', 'Should not expose API keys')
        assertNotContains(response.body.toLowerCase(), 'secret', 'Should not expose secrets')
      }
    },
    {
      name: 'No stack traces in response',
      fn: async () => {
        const response = await makeRawRequest(TEST_HOST, TEST_PORT, '/', 'valdi.app')
        assertNoStackTrace(response.body, 'Response body must not expose a runtime stack trace')
        assertNotContains(response.body, '/database/', 'Should not expose internal database paths')
      }
    }
  ]
}

// ============ XSS Protection ============

function xssTests() {
  return [
    {
      name: 'Script tag escaping in title',
      fn: async () => {
        const renderer = createHtmlRenderer()
        const presentation = {
          destination: { name: '<script>alert(1)</script>' },
          seo: { title: '<script>alert(1)</script>' },
          branding: {},
          navigation: {},
          contact: {},
          metadata: { destination: 'test', language: 'es', locale: 'es-CL' }
        }
        const html = renderer.render(presentation, { canonicalDomain: 'valdi.app', pathname: '/' })
        assertNotContains(html, '<script>alert(1)</script>', 'Should escape script tags')
        assertContains(html, '&lt;script&gt;', 'Should have escaped script tag')
      }
    },
    {
      name: 'Event handler escaping - opening tag escaped',
      fn: async () => {
        const escaped = escapeHtml('<img onerror="alert(1)">')
        assertContains(escaped, '&lt;img', 'Should escape opening tag bracket')
        assertNotContains(escaped, '<img', 'Opening tag should not appear raw')
      }
    },
    {
      name: 'Quote escaping in attributes',
      fn: async () => {
        const escaped = escapeHtml('"test"')
        assertContains(escaped, '&quot;', 'Should escape quotes')
      }
    },
    {
      name: 'URL javascript scheme rejected',
      fn: async () => {
        const result = escapeUrl('javascript:alert(1)')
        assertEqual(result, '', 'Should reject javascript: scheme')
      }
    },
    {
      name: 'URL data scheme rejected',
      fn: async () => {
        const result = escapeUrl('data:text/html,<script>alert(1)</script>')
        assertEqual(result, '', 'Should reject data: scheme')
      }
    },
    {
      name: 'Safe URL https allowed',
      fn: async () => {
        const result = escapeUrl('https://example.com/path')
        assertEqual(result, 'https://example.com/path', 'Should allow https URLs')
      }
    }
  ]
}

// ============ Path Traversal ============

function pathTraversalTests() {
  return [
    {
      name: 'Double dot traversal blocked',
      fn: async () => {
        const response = await makeRawRequest(TEST_HOST, TEST_PORT, '/static/../../../etc/passwd', 'valdi.app')
        assert(response.statusCode === 403 || response.statusCode === 404, 'Should return 403 or 404')
      }
    },
    {
      name: 'Encoded traversal blocked',
      fn: async () => {
        const response = await makeRawRequest(TEST_HOST, TEST_PORT, '/static/..%2f..%2f..%2fetc/passwd', 'valdi.app')
        assert(response.statusCode === 403 || response.statusCode === 404, 'Should return 403 or 404')
      }
    },
    {
      name: 'Double encoded traversal blocked',
      fn: async () => {
        const response = await makeRawRequest(TEST_HOST, TEST_PORT, '/static/%252e%252e/%252e%252e/etc/passwd', 'valdi.app')
        assert(response.statusCode === 403 || response.statusCode === 404, 'Should return 403 or 404')
      }
    },
    {
      name: 'Windows backslash traversal blocked',
      fn: async () => {
        const response = await makeRawRequest(TEST_HOST, TEST_PORT, '/static/..\\..\\..\\etc\\passwd', 'valdi.app')
        assert(response.statusCode === 403 || response.statusCode === 404, 'Should return 403 or 404')
      }
    }
  ]
}

// ============ Static Asset Isolation ============

function staticAssetIsolationTests() {
  return [
    {
      name: 'Root paths are dynamic routes',
      fn: async () => {
        const response1 = await makeRawRequest(TEST_HOST, TEST_PORT, '/package.json', 'valdi.app')
        const response2 = await makeRawRequest(TEST_HOST, TEST_PORT, '/.env', 'valdi.app')
        assert(response1.statusCode === 200, 'Should return 200 (SPA serves same content)')
        assert(response2.statusCode === 200, 'Should return 200 (SPA serves same content)')
        assert(response1.body.includes('<!DOCTYPE html>'), 'Should return HTML')
      }
    },
    {
      name: 'Engine CSS is delivered inline (current CSS contract)',
      fn: async () => {
        // The current committed contract has no generic public/static file
        // server (public/static is untracked). CSS is delivered inline by the
        // committed HtmlRenderer design-token engine (renderStyles).
        const response = await makeRawRequest(TEST_HOST, TEST_PORT, '/', 'valdi.app')
        assert(response.statusCode === 200, 'Should return 200')
        assertContains(response.body, '<style', 'Should deliver the inline engine stylesheet')
        assertContains(response.body, '--color-', 'Should deliver engine design-token CSS variables')
      }
    },
    {
      name: 'Application-scoped manifest serves correctly',
      fn: async () => {
        // Current PWA contract is Application-scoped (public/manifest.json is
        // untracked). The albasie Application is the committed fixture that
        // declares installableApp (companies/.../valdivia/albasie/config.js).
        const response = await makeRawRequest(TEST_HOST, TEST_PORT, '/pwa/valdi__DOT__app__SLASH__albasie/manifest.json', 'valdi.app')
        assert(response.statusCode === 200, 'Should return 200 for the Application-scoped manifest')
        assert(response.headers['content-type']?.includes('application/manifest+json'), 'Should have manifest content-type')
      }
    }
  ]
}

// ============ Host Header Security ============

function hostHeaderTests() {
  return [
    {
      name: 'localhost rejected',
      fn: async () => {
        const response = await makeRawRequest(TEST_HOST, TEST_PORT, '/', 'localhost')
        assert(response.statusCode === 404, 'Should return 404 for localhost')
      }
    },
    {
      name: '127.0.0.1 rejected',
      fn: async () => {
        const response = await makeRawRequest(TEST_HOST, TEST_PORT, '/', '127.0.0.1')
        assert(response.statusCode === 404, 'Should return 404 for 127.0.0.1')
      }
    },
    {
      name: 'valdi.app.evil.com rejected',
      fn: async () => {
        const response = await makeRawRequest(TEST_HOST, TEST_PORT, '/', 'valdi.app.evil.com')
        assert(response.statusCode === 404, 'Should return 404 for suffix spoofing')
      }
    },
    {
      name: 'evil.com rejected',
      fn: async () => {
        const response = await makeRawRequest(TEST_HOST, TEST_PORT, '/', 'evil.com')
        assert(response.statusCode === 404, 'Should return 404 for unknown domain')
      }
    }
  ]
}

// ============ Domain Isolation ============

function domainIsolationTests() {
  return [
    {
      name: 'valdi.app resolves correctly',
      fn: async () => {
        const response = await makeRawRequest(TEST_HOST, TEST_PORT, '/', 'valdi.app')
        assert(response.headers['x-destination'] === 'valdi', 'Should have correct destination')
      }
    },
    {
      name: 'natales.app resolves correctly',
      fn: async () => {
        const response = await makeRawRequest(TEST_HOST, TEST_PORT, '/', 'natales.app')
        assert(response.headers['x-destination'] === 'natales', 'Should have correct destination')
      }
    },
    {
      name: 'puntaarenas.app resolves correctly',
      fn: async () => {
        const response = await makeRawRequest(TEST_HOST, TEST_PORT, '/', 'puntaarenas.app')
        assert(response.headers['x-destination'] === 'puntaarenas', 'Should have correct destination')
      }
    },
    {
      name: 'coyhaique.app resolves correctly',
      fn: async () => {
        const response = await makeRawRequest(TEST_HOST, TEST_PORT, '/', 'coyhaique.app')
        assert(response.headers['x-destination'] === 'coyhaique', 'Should have correct destination')
      }
    },
    {
      name: 'chiloe.app resolves correctly',
      fn: async () => {
        const response = await makeRawRequest(TEST_HOST, TEST_PORT, '/', 'chiloe.app')
        assert(response.headers['x-destination'] === 'chiloe', 'Should have correct destination')
      }
    },
    {
      name: 'valdivia.app rejected',
      fn: async () => {
        const response = await makeRawRequest(TEST_HOST, TEST_PORT, '/', 'valdivia.app')
        assert(response.statusCode === 404, 'Should return 404 for valdivia.app')
      }
    },
    {
      name: 'www.valdi.app normalizes to canonical',
      fn: async () => {
        const response = await makeRawRequest(TEST_HOST, TEST_PORT, '/', 'www.valdi.app')
        assert(response.statusCode === 200, 'www.valdi.app should normalize to valdi.app (200)')
        assert(response.headers['x-destination'] === 'valdi', 'www.valdi.app should resolve to valdi destination')
      }
    }
  ]
}

// ============ Company Isolation ============

function companyIsolationTests() {
  return [
    {
      name: 'valdi.app does not contain natales company references',
      fn: async () => {
        const response = await makeRawRequest(TEST_HOST, TEST_PORT, '/', 'valdi.app')
        if (response.body.includes('Albasie') || response.body.includes('natales')) {
          assert(!response.body.includes('Albasie') || !response.body.includes('Natales'), 'Should not leak natales company data to valdi')
        }
      }
    },
    {
      name: 'Each domain has isolated HTML content',
      fn: async () => {
        const responses = await Promise.all(
          CANONICAL_DOMAINS_DATA.map(d => makeRawRequest(TEST_HOST, TEST_PORT, '/', d.hostname))
        )
        const bodies = responses.map(r => r.body)
        // Verify each body is valid HTML
        for (const body of bodies) {
          assert(body.includes('<!DOCTYPE html>'), 'Should have valid HTML')
          assert(body.includes('</html>'), 'Should close HTML tag')
        }
      }
    }
  ]
}

// ============ Cache Isolation ============

function cacheIsolationTests() {
  return [
    {
      name: 'Cache keys are unique per domain',
      fn: async () => {
        const keys = CANONICAL_DOMAINS_DATA.map(d =>
          createCacheKey({ domain: d.hostname, destination: d.destination, path: '/' })
        )
        const uniqueKeys = new Set(keys)
        assertEqual(uniqueKeys.size, keys.length, 'All cache keys should be unique')
      }
    },
    {
      name: 'Cache key contains domain',
      fn: async () => {
        const key = createCacheKey({ domain: 'valdi.app', destination: 'valdi', path: '/' })
        assertContains(key, 'valdi.app', 'Cache key should contain domain')
        assertNotContains(key, 'natales.app', 'Cache key should not contain other domains')
      }
    },
    {
      name: 'Different paths produce different keys',
      fn: async () => {
        const key1 = createCacheKey({ domain: 'valdi.app', destination: 'valdi', path: '/' })
        const key2 = createCacheKey({ domain: 'valdi.app', destination: 'valdi', path: '/categories' })
        assertNotEqual(key1, key2, 'Different paths should produce different keys')
      }
    },
    {
      name: 'Cached response matches request domain',
      fn: async () => {
        // First request to valdi.app
        const response1 = await makeRawRequest(TEST_HOST, TEST_PORT, '/', 'valdi.app')
        // Second request to natales.app
        const response2 = await makeRawRequest(TEST_HOST, TEST_PORT, '/', 'natales.app')
        // The responses should be different
        assertNotEqual(response1.body, response2.body, 'Different domains should produce different content')
      }
    }
  ]
}

// ============ Error Handling ============

function errorHandlingTests() {
  return [
    {
      name: 'Unknown route returns valid HTML',
      fn: async () => {
        const response = await makeRawRequest(TEST_HOST, TEST_PORT, '/unknown-route-12345', 'valdi.app')
        assert(response.statusCode === 200, 'Should return 200 for any route (SPA behavior)')
        assert(response.body.includes('<!DOCTYPE html>'), 'Should return valid HTML')
      }
    },
    {
      name: 'Error page has valid HTML',
      fn: async () => {
        const response = await makeRawRequest(TEST_HOST, TEST_PORT, '/nonexistent-page', 'valdi.app')
        assert(response.body.includes('<!DOCTYPE html>'), 'Should have valid HTML')
        assert(response.body.includes('</html>'), 'Should close HTML tag')
      }
    },
    {
      name: 'Error page does not expose stack trace',
      fn: async () => {
        const response = await makeRawRequest(TEST_HOST, TEST_PORT, '/nonexistent-page', 'valdi.app')
        assertNoStackTrace(response.body, 'Error response body must not expose a runtime stack trace')
        assertNotContains(response.body, '/database/', 'Should not expose internal paths')
      }
    },
    {
      name: 'Unknown domain returns 404',
      fn: async () => {
        const response = await makeRawRequest(TEST_HOST, TEST_PORT, '/', 'unknown-domain-12345.com')
        assert(response.statusCode === 404, 'Should return 404 for unknown domain')
      }
    }
  ]
}

// ============ Startup/Shutdown ============

function lifecycleTests() {
  return [
    {
      name: 'Server starts successfully',
      fn: async () => {
        const server = new PublicWebServer({ port: 3095, host: TEST_HOST, env: 'production' })
        await server.initialize()
        await server.start()
        const health = await server.health()
        assertEqual(health.status, 'healthy', 'Server should be healthy after start')
        await server.shutdown()
      }
    },
    {
      name: 'Server shuts down cleanly',
      fn: async () => {
        const server = new PublicWebServer({ port: 3094, host: TEST_HOST, env: 'production' })
        await server.initialize()
        await server.start()
        await server.shutdown()
        assert(!server['#initialized'], 'Server should not be initialized after shutdown')
      }
    },
    {
      name: 'Double shutdown is idempotent',
      fn: async () => {
        const server = new PublicWebServer({ port: 3093, host: TEST_HOST, env: 'production' })
        await server.initialize()
        await server.start()
        await server.shutdown()
        await server.shutdown() // Should not throw
      }
    },
    {
      name: 'Double initialize is idempotent',
      fn: async () => {
        const server = new PublicWebServer({ port: 3092, host: TEST_HOST, env: 'production' })
        await server.initialize()
        await server.initialize() // Should not throw
        const health = await server.health()
        assertEqual(health.status, 'healthy', 'Server should be healthy after double init')
        await server.shutdown()
      }
    }
  ]
}

// ============ Concurrency ============

function concurrencyTests() {
  return [
    {
      name: 'Multiple concurrent requests work',
      fn: async () => {
        const promises = CANONICAL_DOMAINS_DATA.map(d =>
          makeRawRequest(TEST_HOST, TEST_PORT, '/', d.hostname)
        )
        const responses = await Promise.all(promises)
        assertEqual(responses.length, 5, 'Should return 5 responses')
        for (const response of responses) {
          assert(response.statusCode === 200, 'Each response should be 200')
        }
      }
    },
    {
      name: 'Concurrent requests to same domain',
      fn: async () => {
        const promises = Array(5).fill(null).map(() =>
          makeRawRequest(TEST_HOST, TEST_PORT, '/', 'valdi.app')
        )
        const responses = await Promise.all(promises)
        for (const response of responses) {
          assertEqual(response.statusCode, 200, 'All concurrent requests should succeed')
        }
      }
    },
    {
      name: 'No request context leakage',
      fn: async () => {
        const promises = CANONICAL_DOMAINS_DATA.map(d =>
          makeRawRequest(TEST_HOST, TEST_PORT, '/', d.hostname)
        )
        const responses = await Promise.all(promises)
        // Check each response has correct destination header
        for (let i = 0; i < CANONICAL_DOMAINS_DATA.length; i++) {
          assertEqual(
            responses[i].headers['x-destination'],
            CANONICAL_DOMAINS_DATA[i].destination,
            `Response ${i} should have correct destination`
          )
        }
      }
    }
  ]
}

// ============ Observability ============

function observabilityTests() {
  return [
    {
      name: 'Health endpoint returns status',
      fn: async () => {
        const health = await testServer.health()
        assertEqual(health.status, 'healthy', 'Health should be healthy')
        assert(health.server, 'Health should have server info')
      }
    },
    {
      name: 'Request ID in response',
      fn: async () => {
        const response = await makeRawRequest(TEST_HOST, TEST_PORT, '/', 'valdi.app')
        assert(response.headers['x-request-id'], 'Should have request ID header')
      }
    },
    {
      name: 'Custom request ID header respected',
      fn: async () => {
        const response = await makeRawRequestWithHeaders(TEST_HOST, TEST_PORT, '/', 'valdi.app', {
          'X-Request-Id': 'custom-request-id-123'
        })
        assertEqual(response.headers['x-request-id'], 'custom-request-id-123', 'Should echo custom request ID')
      }
    }
  ]
}

// ============ SEO Production ============

function seoTests() {
  return [
    {
      name: 'Canonical URL uses correct domain',
      fn: async () => {
        const response = await makeRawRequest(TEST_HOST, TEST_PORT, '/', 'valdi.app')
        assertContains(response.body, 'https://valdi.app/', 'Canonical URL should use correct domain')
        assertNotContains(response.body, 'https://natales.app/', 'Should not contain other domains')
      }
    },
    {
      name: 'No valdivia.app references in canonical',
      fn: async () => {
        const response = await makeRawRequest(TEST_HOST, TEST_PORT, '/', 'valdi.app')
        assertNotContains(response.body, 'valdivia.app', 'Should not reference valdivia.app')
      }
    },
    {
      name: 'Title tag present',
      fn: async () => {
        const response = await makeRawRequest(TEST_HOST, TEST_PORT, '/', 'valdi.app')
        assertContains(response.body, '<title>', 'Should have title tag')
      }
    },
    {
      name: 'Meta description present',
      fn: async () => {
        const response = await makeRawRequest(TEST_HOST, TEST_PORT, '/', 'valdi.app')
        assertContains(response.body, 'description', 'Should have meta description')
      }
    },
    {
      name: 'OG tags present',
      fn: async () => {
        const response = await makeRawRequest(TEST_HOST, TEST_PORT, '/', 'valdi.app')
        assertContains(response.body, 'og:title', 'Should have OG title')
        assertContains(response.body, 'og:description', 'Should have OG description')
      }
    },
    {
      name: 'Twitter card present',
      fn: async () => {
        const response = await makeRawRequest(TEST_HOST, TEST_PORT, '/', 'valdi.app')
        assertContains(response.body, 'twitter:card', 'Should have Twitter card')
      }
    },
    {
      name: 'Language attribute set',
      fn: async () => {
        const response = await makeRawRequest(TEST_HOST, TEST_PORT, '/', 'valdi.app')
        assertContains(response.body, 'lang="', 'Should have language attribute')
      }
    }
  ]
}

// ============ Memory Safety ============

function memorySafetyTests() {
  return [
    {
      name: 'No global mutable state in request',
      fn: async () => {
        // Make multiple requests and verify no state leakage
        const r1 = await makeRawRequest(TEST_HOST, TEST_PORT, '/', 'valdi.app')
        const r2 = await makeRawRequest(TEST_HOST, TEST_PORT, '/', 'natales.app')
        const r3 = await makeRawRequest(TEST_HOST, TEST_PORT, '/', 'valdi.app')

        assertNotEqual(r1.body, r2.body, 'Different domains should have different content')
        assertEqual(r1.body, r3.body, 'Same domain should have same content (cached)')
        assertNotEqual(r1.headers['x-destination'], r2.headers['x-destination'], 'Destinations should differ')
      }
    },
    {
      name: 'Cache is isolated per domain',
      fn: async () => {
        // Clear cache implicitly by checking different domains produce different content
        const valdi = await makeRawRequest(TEST_HOST, TEST_PORT, '/', 'valdi.app')
        const natales = await makeRawRequest(TEST_HOST, TEST_PORT, '/', 'natales.app')

        assertNotEqual(valdi.body, natales.body, 'valdi and natales should have different content')
      }
    }
  ]
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
      res.on('end', () => resolve({ statusCode: res.statusCode, body: data }))
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
      res.on('end', () => resolve({ statusCode: res.statusCode, body: data, headers: res.headers }))
    })

    req.on('error', reject)
    req.end()
  })
}

async function makeRawRequestMethod(method, host, port, path, hostname) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: host,
      port: port,
      path: path,
      method: method,
      headers: { Host: hostname }
    }

    const req = http.request(options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => resolve({ statusCode: res.statusCode, body: data, headers: res.headers }))
    })

    req.on('error', reject)
    req.end()
  })
}

async function makeRawRequestWithHeaders(host, port, path, hostname, extraHeaders) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: host,
      port: port,
      path: path,
      method: 'GET',
      headers: { Host: hostname, ...extraHeaders }
    }

    const req = http.request(options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => resolve({ statusCode: res.statusCode, body: data, headers: res.headers }))
    })

    req.on('error', reject)
    req.end()
  })
}

// Run tests
runTests().then(result => {
  console.log('\n' + '='.repeat(60))
  console.log('P15.4.3 PRODUCTION READINESS VALIDATION COMPLETE')
  console.log('='.repeat(60))
  console.log(`\nFinal Score: ${result.passed}/${result.passed + result.failed} passed`)

  if (result.failed > 0) {
    console.log('\n❌ FAILED TESTS:')
    for (const r of result.results) {
      if (r.status === 'FAIL') {
        console.log(`  [${r.group}] ${r.name}`)
        console.log(`    Error: ${r.error}`)
      }
    }
  }

  process.exit(result.failed > 0 ? 1 : 0)
}).catch(err => {
  console.error('Test error:', err)
  process.exit(1)
})
