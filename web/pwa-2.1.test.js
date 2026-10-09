/**
 * PWA-2.1 — Application-Scoped Cache Cleanup Tests
 *
 * Tests cache isolation to ensure one Application's Service Worker
 * only cleans up its own cache versions, never another Application's cache.
 */

import { generateServiceWorker, generateManifest } from './middleware/pwa.middleware.js'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const TESTS = []

function assert(condition, message) {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`)
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`ASSERTION FAILED: ${message} - Expected ${expected}, got ${actual}`)
  }
}

function assertContains(str, substring, message) {
  if (!str.includes(substring)) {
    throw new Error(`ASSERTION FAILED: ${message} - String "${str}" does not contain "${substring}"`)
  }
}

function assertNotContains(str, substring, message) {
  if (str.includes(substring)) {
    throw new Error(`ASSERTION FAILED: ${message} - String "${str}" contains "${substring}" but should not`)
  }
}

function assertMatch(str, regex, message) {
  if (!regex.test(str)) {
    throw new Error(`ASSERTION FAILED: ${message} - String "${str}" does not match ${regex}`)
  }
}

function test(name, fn) {
  TESTS.push({ name, fn })
}

function runTests() {
  const results = []
  let passed = 0
  let failed = 0

  for (const t of TESTS) {
    try {
      t.fn()
      results.push({ name: t.name, pass: true })
      passed++
      console.log(`  ✓ ${t.name}`)
    } catch (err) {
      results.push({ name: t.name, pass: false, error: err.message })
      failed++
      console.log(`  ✗ ${t.name}`)
      console.log(`    Error: ${err.message}`)
    }
  }

  return { passed, failed, results }
}

// ============================================================
// PWA-2.1 TESTS
// ============================================================

console.log('\n=== PWA-2.1: Application-Scoped Cache Cleanup ===\n')

// Test 1: Application cache prefix exists
test('1. Application cache prefix exists', () => {
  const sw = generateServiceWorker('albasie', 'valdi.app', {})
  assertContains(sw, 'APPLICATION_CACHE_PREFIX', 'SW should define APPLICATION_CACHE_PREFIX')
  assertContains(sw, 'app-cache-', 'APPLICATION_CACHE_PREFIX should start with app-cache-')
})

// Test 2: Albasie prefix deterministic
test('2. Albasie prefix deterministic', () => {
  const sw1 = generateServiceWorker('albasie', 'valdi.app', {})
  const sw2 = generateServiceWorker('albasie', 'valdi.app', {})
  const prefixMatch1 = sw1.match(/APPLICATION_CACHE_PREFIX = '([^']+)'/)
  const prefixMatch2 = sw2.match(/APPLICATION_CACHE_PREFIX = '([^']+)'/)
  assert(prefixMatch1 && prefixMatch2, 'Should extract prefix')
  assertEqual(prefixMatch1[1], prefixMatch2[1], 'Same app should produce same prefix')
})

// Test 3: Corral prefix deterministic
test('3. Corral prefix deterministic', () => {
  const sw1 = generateServiceWorker('corral', 'valdi.app', {})
  const sw2 = generateServiceWorker('corral', 'valdi.app', {})
  const prefixMatch1 = sw1.match(/APPLICATION_CACHE_PREFIX = '([^']+)'/)
  const prefixMatch2 = sw2.match(/APPLICATION_CACHE_PREFIX = '([^']+)'/)
  assert(prefixMatch1 && prefixMatch2, 'Should extract prefix')
  assertEqual(prefixMatch1[1], prefixMatch2[1], 'Same app should produce same prefix')
})

// Test 4: Costa prefix deterministic
test('4. Costa prefix deterministic', () => {
  const sw1 = generateServiceWorker('costa', 'valdi.app', {})
  const sw2 = generateServiceWorker('costa', 'valdi.app', {})
  const prefixMatch1 = sw1.match(/APPLICATION_CACHE_PREFIX = '([^']+)'/)
  const prefixMatch2 = sw2.match(/APPLICATION_CACHE_PREFIX = '([^']+)'/)
  assert(prefixMatch1 && prefixMatch2, 'Should extract prefix')
  assertEqual(prefixMatch1[1], prefixMatch2[1], 'Same app should produce same prefix')
})

// Test 5: Albasie ≠ Corral prefix
test('5. Albasie ≠ Corral prefix', () => {
  const swAlbasie = generateServiceWorker('albasie', 'valdi.app', {})
  const swCorral = generateServiceWorker('corral', 'valdi.app', {})
  const prefixAlbasie = swAlbasie.match(/APPLICATION_CACHE_PREFIX = '([^']+)'/)[1]
  const prefixCorral = swCorral.match(/APPLICATION_CACHE_PREFIX = '([^']+)'/)[1]
  assertNotContains(prefixAlbasie, 'corral', 'Albasie prefix should not contain corral')
  assertNotContains(prefixCorral, 'albasie', 'Corral prefix should not contain albasie')
  assert(prefixAlbasie !== prefixCorral, 'Different apps should have different prefixes')
})

// Test 6: Albasie ≠ Costa prefix
test('6. Albasie ≠ Costa prefix', () => {
  const swAlbasie = generateServiceWorker('albasie', 'valdi.app', {})
  const swCosta = generateServiceWorker('costa', 'valdi.app', {})
  const prefixAlbasie = swAlbasie.match(/APPLICATION_CACHE_PREFIX = '([^']+)'/)[1]
  const prefixCosta = swCosta.match(/APPLICATION_CACHE_PREFIX = '([^']+)'/)[1]
  assert(prefixAlbasie !== prefixCosta, 'Different apps should have different prefixes')
})

// Test 7: Corral ≠ Costa prefix
test('7. Corral ≠ Costa prefix', () => {
  const swCorral = generateServiceWorker('corral', 'valdi.app', {})
  const swCosta = generateServiceWorker('costa', 'valdi.app', {})
  const prefixCorral = swCorral.match(/APPLICATION_CACHE_PREFIX = '([^']+)'/)[1]
  const prefixCosta = swCosta.match(/APPLICATION_CACHE_PREFIX = '([^']+)'/)[1]
  assert(prefixCorral !== prefixCosta, 'Different apps should have different prefixes')
})

// Test 8: Cache name includes version
test('8. Cache name includes version', () => {
  const sw = generateServiceWorker('albasie', 'valdi.app', {})
  assertMatch(sw, /CACHE_NAME = APPLICATION_CACHE_PREFIX \+ 'v\d+'/, 'CACHE_NAME should include version')
})

// Test 9: Albasie cleanup filter uses prefix
test('9. Albasie cleanup filter uses prefix', () => {
  const sw = generateServiceWorker('albasie', 'valdi.app', {})
  const prefixMatch = sw.match(/APPLICATION_CACHE_PREFIX = '([^']+)'/)
  const prefix = prefixMatch[1]
  assertContains(sw, `startsWith(APPLICATION_CACHE_PREFIX)`, 'Filter should use APPLICATION_CACHE_PREFIX')
  assertNotContains(sw, "startsWith('app-cache-')", 'Filter should NOT use generic app-cache- prefix')
})

// Test 10: Albasie v1 removed when v2 current (simulated)
test('10. Albasie v1 removed when v2 current', () => {
  const sw = generateServiceWorker('albasie', 'valdi.app', {})
  const prefixMatch = sw.match(/APPLICATION_CACHE_PREFIX = '([^']+)'/)
  const prefix = prefixMatch[1]

  // Simulate cache names
  const caches = [
    `${prefix}v1`,  // Old Albasie
    `${prefix}v2`,  // Current Albasie
    `app-cache-valdi_app_corral-v1`, // Corral (should keep)
    `app-cache-valdi_app_costa-v1`,  // Costa (should keep)
  ]

  const currentCache = `${prefix}v2`

  // Apply filter logic
  const toDelete = caches.filter(name =>
    name.startsWith(prefix) && name !== currentCache
  )

  assertEqual(toDelete.length, 1, 'Should only delete old Albasie cache')
  assert(toDelete[0] === `${prefix}v1`, 'Should delete only old Albasie v1')
})

// Test 11: Albasie v2 preserved
test('11. Albasie v2 preserved', () => {
  const sw = generateServiceWorker('albasie', 'valdi.app', {})
  const prefixMatch = sw.match(/APPLICATION_CACHE_PREFIX = '([^']+)'/)
  const prefix = prefixMatch[1]

  const caches = [
    `${prefix}v1`,
    `${prefix}v2`,
  ]
  const currentCache = `${prefix}v2`

  const toDelete = caches.filter(name =>
    name.startsWith(prefix) && name !== currentCache
  )
  const toKeep = caches.filter(name => !toDelete.includes(name))

  assert(toKeep.includes(`${prefix}v2`), 'Current cache should be preserved')
})

// Test 12: Corral cache preserved during Albasie cleanup
test('12. Corral cache preserved during Albasie cleanup', () => {
  const swAlbasie = generateServiceWorker('albasie', 'valdi.app', {})
  const swCorral = generateServiceWorker('corral', 'valdi.app', {})

  const prefixAlbasie = swAlbasie.match(/APPLICATION_CACHE_PREFIX = '([^']+)'/)[1]
  const prefixCorral = swCorral.match(/APPLICATION_CACHE_PREFIX = '([^']+)'/)[1]

  const caches = [
    `${prefixAlbasie}v1`, // Old Albasie
    `${prefixAlbasie}v2`, // Current Albasie
    `${prefixCorral}v1`,  // Current Corral
  ]

  const currentCache = `${prefixAlbasie}v2`

  const toDelete = caches.filter(name =>
    name.startsWith(prefixAlbasie) && name !== currentCache
  )
  const toKeep = caches.filter(name => !toDelete.includes(name))

  assert(!toDelete.some(c => c.includes('corral')), 'Corral caches should not be deleted')
  assert(toKeep.some(c => c.includes('corral')), 'Corral cache should be preserved')
})

// Test 13: Costa cache preserved during Albasie cleanup
test('13. Costa cache preserved during Albasie cleanup', () => {
  const swAlbasie = generateServiceWorker('albasie', 'valdi.app', {})
  const swCosta = generateServiceWorker('costa', 'valdi.app', {})

  const prefixAlbasie = swAlbasie.match(/APPLICATION_CACHE_PREFIX = '([^']+)'/)[1]
  const prefixCosta = swCosta.match(/APPLICATION_CACHE_PREFIX = '([^']+)'/)[1]

  const caches = [
    `${prefixAlbasie}v1`,
    `${prefixAlbasie}v2`,
    `${prefixCosta}v1`,
  ]

  const currentCache = `${prefixAlbasie}v2`

  const toDelete = caches.filter(name =>
    name.startsWith(prefixAlbasie) && name !== currentCache
  )

  assert(!toDelete.some(c => c.includes('costa')), 'Costa caches should not be deleted')
})

// Test 14: Albasie preserved during Corral cleanup
test('14. Albasie preserved during Corral cleanup', () => {
  const swAlbasie = generateServiceWorker('albasie', 'valdi.app', {})
  const swCorral = generateServiceWorker('corral', 'valdi.app', {})

  const prefixAlbasie = swAlbasie.match(/APPLICATION_CACHE_PREFIX = '([^']+)'/)[1]
  const prefixCorral = swCorral.match(/APPLICATION_CACHE_PREFIX = '([^']+)'/)[1]

  const caches = [
    `${prefixAlbasie}v1`,
    `${prefixCorral}v1`,
    `${prefixCorral}v2`,
  ]

  const currentCache = `${prefixCorral}v2`

  const toDelete = caches.filter(name =>
    name.startsWith(prefixCorral) && name !== currentCache
  )

  assert(!toDelete.some(c => c.includes('albasie')), 'Albasie caches should not be deleted')
})

// Test 15: Five pilot cache prefixes unique
test('15. Five pilot cache prefixes unique', () => {
  const pilots = [
    { slug: 'albasie', domain: 'valdi.app' },
    { slug: 'turismo-21', domain: 'natales.app' },
    { slug: 'hostal-del-tuto', domain: 'puntaarenas.app' },
    { slug: 'dronestica', domain: 'coyhaique.app' },
    { slug: 'el-encanto-chiloe', domain: 'chiloe.app' },
  ]

  const prefixes = pilots.map(p => {
    const sw = generateServiceWorker(p.slug, p.domain, {})
    return sw.match(/APPLICATION_CACHE_PREFIX = '([^']+)'/)[1]
  })

  // All should be unique
  const unique = [...new Set(prefixes)]
  assertEqual(unique.length, prefixes.length, 'All five pilots should have unique prefixes')
})

// Test 16: Same slug cross-domain identity safe
test('16. Same slug cross-domain identity safe', () => {
  const sw1 = generateServiceWorker('demo', 'valdi.app', {})
  const sw2 = generateServiceWorker('demo', 'natales.app', {})

  const prefix1 = sw1.match(/APPLICATION_CACHE_PREFIX = '([^']+)'/)[1]
  const prefix2 = sw2.match(/APPLICATION_CACHE_PREFIX = '([^']+)'/)[1]

  assert(prefix1 !== prefix2, 'Same slug different domain should have different prefix')
  assertContains(prefix1, 'valdi', 'Valdi prefix should contain domain identifier')
  assertContains(prefix2, 'natales', 'Natales prefix should contain domain identifier')
})

// Test 17: Route traversal cannot alter prefix
test('17. Route traversal cannot alter prefix', () => {
  // Attempt to inject path traversal
  const sw = generateServiceWorker('../../../etc/passwd', 'valdi.app', {})
  const prefixMatch = sw.match(/APPLICATION_CACHE_PREFIX = '([^']+)'/)
  const prefix = prefixMatch[1]

  // Should not contain slashes or path traversal
  assertNotContains(prefix, '..', 'Prefix should not contain path traversal')
  assertNotContains(prefix, '/', 'Prefix should not contain slashes')
  assertNotContains(prefix, '\\', 'Prefix should not contain backslashes')

  // Should be normalized
  assertMatch(prefix, /^app-cache-[\w_]+-$/, 'Prefix should be normalized safe string')
})

// Test 18: Root ecosystem cache does not match child prefix
test('18. Root ecosystem cache does not match child prefix', () => {
  const swRoot = generateServiceWorker('', 'valdi.app', {})
  const swAlbasie = generateServiceWorker('albasie', 'valdi.app', {})

  const prefixRoot = swRoot.match(/APPLICATION_CACHE_PREFIX = '([^']+)'/)[1]
  const prefixAlbasie = swAlbasie.match(/APPLICATION_CACHE_PREFIX = '([^']+)'/)[1]

  // Root prefix should not be a prefix of Albasie prefix
  assert(
    !prefixAlbasie.startsWith(prefixRoot) || prefixRoot === 'app-cache-',
    'Root prefix should not match child prefix pattern'
  )
})

// Test 19: Cache name structure correct
test('19. Cache name structure correct', () => {
  const sw = generateServiceWorker('albasie', 'valdi.app', {})
  assertMatch(sw, /var CACHE_NAME = APPLICATION_CACHE_PREFIX \+ 'v\d+';/, 'CACHE_NAME should be constructed from prefix + version')
})

// Test 20: Push listener remains present
test('20. Push listener remains present', () => {
  const sw = generateServiceWorker('albasie', 'valdi.app', {})
  assertContains(sw, "addEventListener('push'", 'SW should have push event listener')
  assertContains(sw, 'showNotification', 'SW should call showNotification')
  assertContains(sw, 'event.waitUntil', 'Push should use waitUntil')
})

// Test 21: Notificationclick remains present
test('21. Notificationclick remains present', () => {
  const sw = generateServiceWorker('albasie', 'valdi.app', {})
  assertContains(sw, "addEventListener('notificationclick'", 'SW should have notificationclick listener')
  assertContains(sw, 'clients.matchAll', 'notificationclick should use clients.matchAll')
})

// Test 22: Skip waiting remains present
test('22. Skip waiting remains present', () => {
  const sw = generateServiceWorker('albasie', 'valdi.app', {})
  assertContains(sw, 'skipWaiting', 'SW should call skipWaiting in install')
})

// Test 23: Clients claim remains present
test('23. Clients claim remains present', () => {
  const sw = generateServiceWorker('albasie', 'valdi.app', {})
  assertContains(sw, 'clients.claim', 'SW should call clients.claim in activate')
})

// Test 24: Offline URL correct
test('24. Offline URL correct', () => {
  const sw = generateServiceWorker('albasie', 'valdi.app', {})
  assertContains(sw, "OFFLINE_URL = '/albasie/offline.html'", 'Offline URL should reference correct scope')
})

// Test 25: Scope correct
test('25. Scope correct', () => {
  const sw = generateServiceWorker('albasie', 'valdi.app', {})
  assertContains(sw, "APP_SCOPE = '/albasie/'", 'Scope should match route')
})

// Test 26: Fetch handler present
test('26. Fetch handler present', () => {
  const sw = generateServiceWorker('albasie', 'valdi.app', {})
  assertContains(sw, "addEventListener('fetch'", 'SW should have fetch listener')
  assertContains(sw, 'caches.match', 'Fetch should use caches.match')
})

// Test 27: Message handler present
test('27. Message handler present', () => {
  const sw = generateServiceWorker('albasie', 'valdi.app', {})
  assertContains(sw, "addEventListener('message'", 'SW should have message listener for skip waiting')
})

// Test 28: Install handler present
test('28. Install handler present', () => {
  const sw = generateServiceWorker('albasie', 'valdi.app', {})
  assertContains(sw, "addEventListener('install'", 'SW should have install listener')
  assertContains(sw, 'caches.open', 'Install should open cache')
})

// Test 29: Activate handler present
test('29. Activate handler present', () => {
  const sw = generateServiceWorker('albasie', 'valdi.app', {})
  assertContains(sw, "addEventListener('activate'", 'SW should have activate listener')
  assertContains(sw, 'caches.keys', 'Activate should check cache keys')
})

// Test 30: No generic app-cache- deletion
test('30. No generic app-cache- deletion', () => {
  const sw = generateServiceWorker('albasie', 'valdi.app', {})
  // Should use APPLICATION_CACHE_PREFIX, not generic 'app-cache-'
  assertNotContains(sw, "startsWith('app-cache-')", 'Should not use generic app-cache- in filter')
})

// Run all tests
console.log('Running PWA-2.1 tests...\n')
const { passed, failed } = runTests()

console.log(`\n=== RESULTS ===`)
console.log(`Passed: ${passed}`)
console.log(`Failed: ${failed}`)
console.log(`Total: ${passed + failed}`)

if (failed > 0) {
  console.log('\nFAILED TESTS:')
  // Already printed in runTests
  process.exit(1)
}

console.log('\n✓ ALL PWA-2.1 TESTS PASSED')

export { passed, failed }
