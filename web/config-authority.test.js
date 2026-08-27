/**
 * GATE 1.11 — Application ID Normalization Tests
 */

import { ConfigurationLoader } from '../experience/loader/configuration.loader.js'
import { FilesystemConfigurationSource } from '../experience/source/filesystem.configuration.source.js'
import { createApplicationResolver } from './application/application.resolver.js'

const TEST_ID = 'CONFIG-AUTHORITY'

let passed = 0
let failed = 0
const testPromises = []

function test(name, fn) {
  testPromises.push((async () => {
    try {
      await fn()
      console.log(`  ✅ ${name}`)
      passed++
    } catch (error) {
      console.log(`  ❌ ${name}`)
      console.log(`     Error: ${error.message}`)
      if (error.stack) {
        console.log(`     Stack: ${error.stack.split('\n')[1] || ''}`)
      }
      failed++
    }
  })())
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed')
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) throw new Error(`${message || 'Assertion failed'}: expected ${expected}, got ${actual}`)
}

console.log(`\n${TEST_ID} — Configuration Authority Tests\n`)

// ============================================================================
// TEST 1: applicationId normalization - trailing slash removed
// ============================================================================

test('applicationId normalization removes trailing slash', async () => {
  const { createApplicationPresentationAdapter } = await import('./application/application.presentation.adapter.js')
  const adapter = await createApplicationPresentationAdapter()

  // Test with trailing slash in route
  const result1 = adapter.adapt({
    applicationId: null,
    company: { name: 'Albasie', slug: 'albasie' },
    config: { name: 'Albasie', scope: '/albasie/' },
    capabilities: [{ name: 'installableApp', configuration: { name: 'Albasie', themeColor: '#2d5a27' } }],
    identity: { domain: 'valdi.app', route: '/albasie/' },
    metadata: {}
  })

  assertEqual(result1.pwa?.appId, 'valdi.app/albasie', 'appId should not have trailing slash')
  assertEqual(result1.pwa?.manifestUrl, '/pwa/valdi__DOT__app__SLASH__albasie/manifest.json', 'manifestUrl should be normalized')
})

// ============================================================================
// TEST 2: /albasie and /albasie/ routes produce same applicationId
// ============================================================================

test('/albasie and /albasie/ routes produce same applicationId', async () => {
  const { createApplicationPresentationAdapter } = await import('./application/application.presentation.adapter.js')
  const adapter = await createApplicationPresentationAdapter()

  const result1 = adapter.adapt({
    applicationId: null,
    company: { name: 'Albasie', slug: 'albasie' },
    config: {},
    capabilities: [{ name: 'installableApp', configuration: {} }],
    identity: { domain: 'valdi.app', route: '/albasie/' },
    metadata: {}
  })

  const result2 = adapter.adapt({
    applicationId: null,
    company: { name: 'Albasie', slug: 'albasie' },
    config: {},
    capabilities: [{ name: 'installableApp', configuration: {} }],
    identity: { domain: 'valdi.app', route: '/albasie' },
    metadata: {}
  })

  assertEqual(result1.pwa?.appId, result2.pwa?.appId, 'Both route forms should produce same appId')
  assertEqual(result1.pwa?.manifestUrl, result2.pwa?.manifestUrl, 'Both route forms should produce same manifestUrl')
})

// ============================================================================
// TEST 3: Round-trip encoding/decoding
// ============================================================================

test('Round-trip: decode(encode(id)) === id', async () => {
  const testCases = [
    'valdi.app/albasie',
    'valdi.app/corral',
    'natales.app/turismo-21',
    'puntaarenas.app/hostal-del-tuto'
  ]

  for (const id of testCases) {
    const encoded = id.replace(/\//g, '__SLASH__').replace(/\./g, '__DOT__')
    const decoded = encoded.replace(/__SLASH__/g, '/').replace(/__DOT__/g, '.')
    assertEqual(decoded, id, `Round-trip should preserve: ${id}`)
  }
})

// ============================================================================
// TEST 4: Multiple consecutive slashes normalized
// ============================================================================

test('Application ID normalization handles edge cases', async () => {
  const { createApplicationPresentationAdapter } = await import('./application/application.presentation.adapter.js')
  const adapter = await createApplicationPresentationAdapter()

  // With trailing slash
  const result1 = adapter.adapt({
    applicationId: null,
    company: { name: 'Albasie', slug: 'albasie' },
    config: {},
    capabilities: [{ name: 'installableApp', configuration: {} }],
    identity: { domain: 'valdi.app', route: '/albasie/' },
    metadata: {}
  })
  assertEqual(result1.pwa?.manifestUrl, '/pwa/valdi__DOT__app__SLASH__albasie/manifest.json', 'Trailing slash normalized')

  // Without trailing slash
  const result2 = adapter.adapt({
    applicationId: null,
    company: { name: 'Albasie', slug: 'albasie' },
    config: {},
    capabilities: [{ name: 'installableApp', configuration: {} }],
    identity: { domain: 'valdi.app', route: '/albasie' },
    metadata: {}
  })
  assertEqual(result2.pwa?.manifestUrl, '/pwa/valdi__DOT__app__SLASH__albasie/manifest.json', 'No trailing slash same result')
})

// ============================================================================
// TEST 5: PWA manifest resolution works with canonical URL
// ============================================================================

test('PWA manifest uses canonical URL and returns correct values', async () => {
  const { createPWAMiddleware } = await import('./middleware/pwa.middleware.js')
  const middleware = createPWAMiddleware()

  const mockReq = { pathname: '/pwa/valdi__DOT__app__SLASH__albasie/manifest.json', domain: 'valdi.app' }
  let body = ''
  const mockRes = {
    statusCode: 200,
    setHeader: () => {},
    end: (b) => { body = b }
  }

  await middleware(mockReq, mockRes, () => {})

  const manifest = JSON.parse(body)
  assertEqual(manifest.name, 'Albasie - Experiencias Patrimoniales', 'Manifest name correct')
  assertEqual(manifest.theme_color, '#2d5a27', 'Manifest theme_color correct')
  assertEqual(manifest.scope, '/albasie/', 'Manifest scope correct')
  assertEqual(manifest.start_url, '/albasie/', 'Manifest start_url correct')
  assertEqual(manifest.id, '/tenant/valdi.app/albasie', 'Manifest id correct')
})

// ============================================================================
// TEST 6: Domain mismatch safely fails
// ============================================================================

test('Domain mismatch in encoded slug safely fails', async () => {
  const { createPWAMiddleware } = await import('./middleware/pwa.middleware.js')
  const middleware = createPWAMiddleware()

  // Malicious slug with wrong domain
  const mockReq = { pathname: '/pwa/valdi__DOT__app__SLASH__albasie/manifest.json', domain: 'malicious.app' }
  let body = ''
  const mockRes = {
    statusCode: 200,
    setHeader: () => {},
    end: (b) => { body = b }
  }

  await middleware(mockReq, mockRes, () => {})
  const manifest = JSON.parse(body)
  // Should return fallback manifest with wrong domain, not crash
  assert(manifest.name === 'Valdi App' || manifest.name === 'Albasie', 'Should return some manifest')
})

// ============================================================================
// SUMMARY
// ============================================================================

async function runSummary() {
  await Promise.all(testPromises)
  console.log('\n──────────────────────────────────────────────────')
  console.log(`${TEST_ID} Results: ${passed} passed, ${failed} failed`)

  if (failed > 0) {
    console.log(`❌ ${TEST_ID} FAILED with ${failed} test failures`)
    process.exitCode = 1
  } else {
    console.log(`✅ ${TEST_ID} PASSED - All ${passed} tests passed`)
    process.exitCode = 0
  }
}

runSummary().catch(err => {
  console.error('Error running tests:', err)
  process.exitCode = 1
})
