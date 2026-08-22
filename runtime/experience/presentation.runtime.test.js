/**
 * P15.3.3 — Presentation Runtime Integration Tests
 * 
 * Tests the complete presentation pipeline:
 *   Request → ExperienceRuntime → ExperienceContext
 *                                    ↓
 *                      PresentationAdapter → ExperienceViewModel
 *                                              ↓
 *                                 ComponentResolver → Components
 *                                              ↓
 *                                              Renderer
 *                                              ↓
 *                                   Rendered Presentation
 */

import { PresentationRuntime, PRESENTATION_RUNTIME_EVENTS } from './presentation.runtime.js'

const CANONICAL_DOMAINS = [
  { hostname: 'valdi.app', destination: 'valdi', region: 'los-rios', country: 'cl' },
  { hostname: 'natales.app', destination: 'natales', region: 'magallanes', country: 'cl' },
  { hostname: 'puntaarenas.app', destination: 'puntaarenas', region: 'magallanes', country: 'cl' },
  { hostname: 'coyhaique.app', destination: 'coyhaique', region: 'aysen', country: 'cl' },
  { hostname: 'chiloe.app', destination: 'chiloe', region: 'los-lagos', country: 'cl' }
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

async function runTests() {
  console.log('🧪 Running P15.3.3 Presentation Runtime Integration Tests...\n')

  let passed = 0
  let failed = 0

  const tests = [
    testPresentationRuntimeInitialization,
    testValdiPresentation,
    testNatalesPresentation,
    testPuntaarenasPresentation,
    testCoyhaiquePresentation,
    testChiloePresentation,
    testViewModelInternalFieldsProtected,
    testComponentResolution,
    testRenderingResult,
    testCompanyIsolation,
    testMetadata,
    testHealthCheck,
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

async function testPresentationRuntimeInitialization() {
  const runtime = new PresentationRuntime()

  await runtime.initialize()

  assert(runtime.initialized, 'Presentation runtime should be initialized')
  assert(runtime.experience, 'Should have experience integration')

  await runtime.shutdown()
}

async function testValdiPresentation() {
  const runtime = new PresentationRuntime()
  await runtime.initialize()

  const result = await runtime.render({ hostname: 'valdi.app' })

  assertEqual(result.metadata.destination, 'valdi', 'Destination should be valdi')
  assertEqual(result.metadata.domain, 'valdi.app', 'Domain should match')
  assert(result.identity.platform, 'Should have platform identity')
  assert(result.destination, 'Should have destination data')
  assert(result.experience, 'Should have experience data')
  assert(result.branding, 'Should have branding')
  assert(result.seo, 'Should have SEO data')

  await runtime.shutdown()
}

async function testNatalesPresentation() {
  const runtime = new PresentationRuntime()
  await runtime.initialize()

  const result = await runtime.render({ hostname: 'natales.app' })

  assertEqual(result.metadata.destination, 'natales', 'Destination should be natales')
  assertEqual(result.destination.region, 'magallanes', 'Region should be magallanes')

  await runtime.shutdown()
}

async function testPuntaarenasPresentation() {
  const runtime = new PresentationRuntime()
  await runtime.initialize()

  const result = await runtime.render({ hostname: 'puntaarenas.app' })

  assertEqual(result.metadata.destination, 'puntaarenas', 'Destination should be puntaarenas')

  await runtime.shutdown()
}

async function testCoyhaiquePresentation() {
  const runtime = new PresentationRuntime()
  await runtime.initialize()

  const result = await runtime.render({ hostname: 'coyhaique.app' })

  assertEqual(result.metadata.destination, 'coyhaique', 'Destination should be coyhaique')
  assertEqual(result.destination.region, 'aysen', 'Region should be aysen')

  await runtime.shutdown()
}

async function testChiloePresentation() {
  const runtime = new PresentationRuntime()
  await runtime.initialize()

  const result = await runtime.render({ hostname: 'chiloe.app' })

  assertEqual(result.metadata.destination, 'chiloe', 'Destination should be chiloe')
  assertEqual(result.destination.region, 'los-lagos', 'Region should be los-lagos')

  await runtime.shutdown()
}

async function testViewModelInternalFieldsProtected() {
  const runtime = new PresentationRuntime()
  await runtime.initialize()

  const result = await runtime.render({ hostname: 'valdi.app' })

  assert(!('config' in result), 'config should not be in result')
  assert(!('providers' in result), 'providers should not be in result')
  assert(!('request' in result), 'request should not be in result')
  assert(!('resolution' in result), 'resolution should not be in result')

  await runtime.shutdown()
}

async function testComponentResolution() {
  const runtime = new PresentationRuntime()
  await runtime.initialize()

  const result = await runtime.render({ hostname: 'valdi.app' })

  assert(result.sections, 'Should have sections')
  assert(result.modules, 'Should have modules')
  assert(result.components, 'Should have component tree')
  assert(result.metadata.componentCount > 0, 'Should have components resolved')

  const sectionIds = result.sections.map(s => s.id)
  assert(sectionIds.length > 0, 'Should have at least one section')

  await runtime.shutdown()
}

async function testRenderingResult() {
  const runtime = new PresentationRuntime()
  await runtime.initialize()

  const result = await runtime.render({ hostname: 'valdi.app' })

  assert(result.rendered, 'Should have rendered section')
  assert(result.rendered.branding, 'Should have rendered branding')
  assert(result.rendered.navigation, 'Should have rendered navigation')
  assert(result.rendered.seo, 'Should have rendered SEO')
  assert(result.rendered.contact, 'Should have rendered contact')

  assert(result.rendered.seo.title, 'SEO should have resolved title')
  assert(result.rendered.branding.logo, 'Branding should have logo')

  await runtime.shutdown()
}

async function testCompanyIsolation() {
  const runtime = new PresentationRuntime()
  await runtime.initialize()

  const valdiResult = await runtime.render({ hostname: 'valdi.app' })
  const natalesResult = await runtime.render({ hostname: 'natales.app' })

  const valdiHasCompany = valdiResult.company && Object.keys(valdiResult.company).length > 0
  const natalesHasCompany = natalesResult.company && Object.keys(natalesResult.company).length > 0

  if (valdiHasCompany && natalesHasCompany) {
    assert(valdiResult.company.slug !== natalesResult.company.slug,
      'Company slugs should be different when both have data')
  }

  await runtime.shutdown()
}

async function testMetadata() {
  const runtime = new PresentationRuntime()
  await runtime.initialize()

  const result = await runtime.render({ hostname: 'valdi.app' })

  assert(result.requestId, 'Should have requestId')
  assert(result.metadata.destination, 'Should have destination')
  assert(result.metadata.experience, 'Should have experience')
  assert(result.metadata.renderDuration >= 0, 'Should have render duration')
  assert(typeof result.metadata.isResolved === 'boolean', 'Should have isResolved flag')

  await runtime.shutdown()
}

async function testHealthCheck() {
  const runtime = new PresentationRuntime()
  await runtime.initialize()

  const health = await runtime.health()

  assertEqual(health.status, 'healthy', 'Health status should be healthy')
  assert(health.experience, 'Should have experience health')
  assert(health.presentation, 'Should have presentation health')

  await runtime.shutdown()
}

async function testShutdown() {
  const runtime = new PresentationRuntime()
  await runtime.initialize()

  assert(runtime.initialized, 'Should be initialized before shutdown')

  await runtime.shutdown()

  assert(!runtime.initialized, 'Should not be initialized after shutdown')
}

export { runTests }

runTests().then(result => {
  console.log(`\nP15.3.3 Presentation Runtime: ${result.passed}/${result.passed + result.failed} passed`)
  process.exit(result.failed > 0 ? 1 : 0)
}).catch(err => {
  console.error('Test error:', err)
  process.exit(1)
})
