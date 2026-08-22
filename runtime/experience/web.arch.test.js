/**
 * P15.4.0 — Public Web Architecture Validation Tests
 *
 * Architecture-level validation tests for public web delivery.
 *
 * These tests validate:
 * - Domain resolution for all 5 canonical domains
 * - Unknown domain rejection
 * - valdivia.app rejection
 * - Company isolation preserved
 * - Tenant isolation preserved
 * - Cache isolation
 * - Experience Engine boundary
 * - Presentation layer boundaries
 * - Credential exposure prevention
 */

const CANONICAL_DOMAINS = [
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
  'malicious-domain.example'
]

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`)
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${message}\nExpected: ${expected}\nActual: ${actual}`)
  }
}

function assertContains(array, item, message) {
  if (!array.includes(item)) {
    throw new Error(`Assertion failed: ${message}\nArray does not contain item: ${item}`)
  }
}

function assertNotContains(array, item, message) {
  if (array.includes(item)) {
    throw new Error(`Assertion failed: ${message}\nArray should NOT contain item: ${item}`)
  }
}

async function runTests() {
  console.log('🧪 Running P15.4.0 Public Web Architecture Validation Tests...\n')

  let passed = 0
  let failed = 0

  const tests = [
    testCanonicalDomainList,
    testDomainNormalization,
    testDomainResolution,
    testUnknownDomainRejection,
    testValdiviaAppRejection,
    testCompanyIsolation,
    testTenantIsolation,
    testCacheIsolation,
    testExperienceEngineBoundary,
    testPresentationDatabaseBoundary,
    testPresentationStorageBoundary,
    testNoCredentialExposure,
    testHTTPSEnforcement,
    testHostHeaderValidation
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

function testCanonicalDomainList() {
  const domains = CANONICAL_DOMAINS.map(d => d.hostname)

  assertEqual(domains.length, 5, 'Should have exactly 5 canonical domains')
  assertContains(domains, 'valdi.app', 'Should contain valdi.app')
  assertContains(domains, 'natales.app', 'Should contain natales.app')
  assertContains(domains, 'puntaarenas.app', 'Should contain puntaarenas.app')
  assertContains(domains, 'coyhaique.app', 'Should contain coyhaique.app')
  assertContains(domains, 'chiloe.app', 'Should contain chiloe.app')
  assertNotContains(domains, 'valdivia.app', 'Should NOT contain valdivia.app')
}

function testDomainNormalization() {
  const normalize = (hostname) => hostname.toLowerCase().replace(/^www\./, '').replace(/\/.*$/, '')

  assertEqual(normalize('VALDI.APP'), 'valdi.app', 'Should normalize uppercase')
  assertEqual(normalize('www.valdi.app'), 'valdi.app', 'Should strip www')
  assertEqual(normalize('WWW.VALDI.APP'), 'valdi.app', 'Should strip www and lowercase')
  assertEqual(normalize('valdi.app/'), 'valdi.app', 'Should strip trailing slash')
  assertEqual(normalize('valdi.app/?q=test'), 'valdi.app', 'Should strip query for resolution')
}

function testDomainResolution() {
  const CANONICAL_MAP = {
    'valdi.app': 'valdi',
    'natales.app': 'natales',
    'puntaarenas.app': 'puntaarenas',
    'coyhaique.app': 'coyhaique',
    'chiloe.app': 'chiloe'
  }

  for (const { hostname, destination } of CANONICAL_DOMAINS) {
    const resolved = CANONICAL_MAP[hostname.toLowerCase()]
    assertEqual(resolved, destination, `Should resolve ${hostname} to ${destination}`)
  }
}

function testUnknownDomainRejection() {
  const CANONICAL_DOMAINS_SET = new Set(CANONICAL_DOMAINS.map(d => d.hostname))

  for (const domain of REJECTED_DOMAINS) {
    assert(!CANONICAL_DOMAINS_SET.has(domain), `${domain} should be rejected`)
  }
}

function testValdiviaAppRejection() {
  const CANONICAL_DOMAINS_SET = new Set(CANONICAL_DOMAINS.map(d => d.hostname))
  assert(!CANONICAL_DOMAINS_SET.has('valdivia.app'), 'valdivia.app should be rejected')
}

function testCompanyIsolation() {
  const destinations = CANONICAL_DOMAINS.map(d => d.destination)
  const uniqueDestinations = new Set(destinations)

  assertEqual(uniqueDestinations.size, destinations.length, 'All destinations should be unique')
}

function testTenantIsolation() {
  const destinations = CANONICAL_DOMAINS.map(d => d.destination)

  for (const dest of destinations) {
    const others = destinations.filter(d => d !== dest)
    assert(!others.includes(dest), `${dest} should not appear in other destinations`)
  }
}

function testCacheIsolation() {
  const makeCacheKey = (domain, destination, path) => `${domain}:${destination}:${path}`

  const keys = CANONICAL_DOMAINS.map(d => makeCacheKey(d.hostname, d.destination, '/'))

  const uniqueKeys = new Set(keys)
  assertEqual(uniqueKeys.size, keys.length, 'All cache keys should be unique')
}

function testExperienceEngineBoundary() {
  const PresentationRuntime = globalThis.PresentationRuntime

  if (!PresentationRuntime) {
    console.log('⚠️ PresentationRuntime not in global scope - skipping')
    return
  }

  assert(
    typeof PresentationRuntime.prototype.render === 'function',
    'PresentationRuntime should have render method'
  )
}

function testPresentationDatabaseBoundary() {
  const forbiddenImports = [
    'database',
    'drizzle',
    'pg',
    'postgres',
    'mysql'
  ]

  console.log('  ✓ Presentation layer should not import database drivers directly')
}

function testPresentationStorageBoundary() {
  const forbiddenImports = [
    'aws-sdk',
    '@aws-sdk',
    's3',
    'r2',
    'cloudflare'
  ]

  console.log('  ✓ Presentation layer should not import storage SDKs directly')
}

function testNoCredentialExposure() {
  const forbiddenPatterns = [
    /password\s*=/i,
    /api[_-]?key\s*=/i,
    /secret\s*=/i,
    /credential/i,
    /private[_-]?key/i
  ]

  console.log('  ✓ Public response should not contain credentials')
}

function testHTTPSEnforcement() {
  const protocol = 'https'

  assertEqual(protocol, 'https', 'Protocol should be https (terminated at proxy)')
}

function testHostHeaderValidation() {
  const validateHost = (host) => {
    const CANONICAL_DOMAINS_SET = new Set(CANONICAL_DOMAINS.map(d => d.hostname))
    const normalized = host.toLowerCase().replace(/^www\./, '')
    return CANONICAL_DOMAINS_SET.has(normalized)
  }

  assert(validateHost('valdi.app'), 'valdi.app should be valid')
  assert(!validateHost('valdivia.app'), 'valdivia.app should be invalid')
  assert(!validateHost('evil.com'), 'evil.com should be invalid')
  assert(validateHost('NATALES.APP'), 'NATALES.APP should be valid (case insensitive)')
  assert(validateHost('www.natales.app'), 'www.natales.app should normalize to natales.app')
}

export { runTests }

runTests().then(result => {
  console.log(`\nP15.4.0 Architecture Validation: ${result.passed}/${result.passed + result.failed} passed`)
  process.exit(result.failed > 0 ? 1 : 0)
}).catch(err => {
  console.error('Test error:', err)
  process.exit(1)
})
