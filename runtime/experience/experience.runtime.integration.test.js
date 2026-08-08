/**
 * Experience Runtime Integration Tests
 * 
 * Tests the integration of the Experience Engine with the Runtime
 * for all five canonical destinations.
 */

import { ExperienceRuntimeIntegration } from './experience.runtime.integration.js'
import { ProductResolver } from '../../experience/resolver/product.resolver.js'
import { EcosystemResolver } from '../../experience/resolver/ecosystem.resolver.js'
import { ModuleResolver } from '../../experience/resolver/module.resolver.js'
import { CapabilityResolver } from '../../experience/resolver/capability.resolver.js'
import { ConfigurationLoader } from '../../experience/loader/configuration.loader.js'
import { ExperienceLoader } from '../../experience/loader/experience.loader.js'
import { ExperienceComposer } from '../../experience/composition/experience.composer.js'

const TEST_DOMAINS = [
  { hostname: 'valdi.app', expected: { destination: 'valdi', region: 'los-rios', country: 'cl' } },
  { hostname: 'natales.app', expected: { destination: 'natales', region: 'magallanes', country: 'cl' } },
  { hostname: 'puntaarenas.app', expected: { destination: 'puntaarenas', region: 'magallanes', country: 'cl' } },
  { hostname: 'coyhaique.app', expected: { destination: 'coyhaique', region: 'aysen', country: 'cl' } },
  { hostname: 'chiloe.app', expected: { destination: 'chiloe', region: 'los-lagos', country: 'cl' } },
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

async function runTests() {
  console.log('🧪 Running Experience Runtime Integration Tests...\n')
  let passed = 0
  let failed = 0

  const tests = [
    testExperienceEngineInitialization,
    testFiveDestinationResolution,
    testDestinationIsolation,
    testCompanyIsolation,
    testCacheIsolation,
    testExperienceContext,
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

async function testExperienceEngineInitialization() {
  const integration = new ExperienceRuntimeIntegration({
    debug: true,
    cacheEnabled: true
  })

  await integration.initialize()

  assert(integration.initialized, 'Experience Engine should be initialized')
  assert(integration.engine, 'Experience Engine should have engine reference')

  await integration.shutdown()
}

async function testFiveDestinationResolution() {
  const integration = new ExperienceRuntimeIntegration()
  await integration.initialize()

  for (const { hostname, expected } of TEST_DOMAINS) {
    const request = { hostname }
    const context = await integration.resolve(request)

    assertEqual(context.destination?.slug, expected.destination, `Domain ${hostname}: destination should be ${expected.destination}`)
    assertEqual(context.region?.code, expected.region, `Domain ${hostname}: region should be ${expected.region}`)
    assertEqual(context.country?.code, expected.country, `Domain ${hostname}: country should be ${expected.country}`)
  }

  await integration.shutdown()
}

async function testDestinationIsolation() {
  const integration = new ExperienceRuntimeIntegration()
  await integration.initialize()

  const valdiContext = await integration.resolve({ hostname: 'valdi.app' })
  const natalesContext = await integration.resolve({ hostname: 'natales.app' })

  assert(valdiContext.destination?.slug !== natalesContext.destination?.slug,
    'Different destinations should have different slug')

  assert(valdiContext.branding?.colors?.primary !== natalesContext.branding?.colors?.primary,
    'Different destinations should have different branding')

  await integration.shutdown()
}

async function testCompanyIsolation() {
  const integration = new ExperienceRuntimeIntegration()
  await integration.initialize()

  const valdiContext = await integration.resolve({
    hostname: 'valdi.app',
    company: 'albasie'
  })

  const natalesContext = await integration.resolve({ hostname: 'natales.app' })

  assert(valdiContext.company === undefined || valdiContext.company === null || valdiContext.company?.destination !== natalesContext.destination?.slug,
    'Company context should not leak between destinations')

  await integration.shutdown()
}

async function testCacheIsolation() {
  const integration = new ExperienceRuntimeIntegration({ cacheEnabled: true })
  await integration.initialize()

  const request1 = { hostname: 'valdi.app' }
  const context1 = await integration.resolve(request1)

  const request2 = { hostname: 'natales.app' }
  const context2 = await integration.resolve(request2)

  assert(context1.destination?.slug !== context2.destination?.slug,
    'Cache should isolate destinations')

  await integration.shutdown()
}

async function testExperienceContext() {
  const integration = new ExperienceRuntimeIntegration()
  await integration.initialize()

  const context = await integration.resolve({ hostname: 'valdi.app' })

  assert(context.platform, 'Context should have platform')
  assert(context.country?.code, 'Context should have country')
  assert(context.region?.code, 'Context should have region')
  assert(context.destination?.slug, 'Context should have destination')
  assert(context.destination?.domain, 'Context should have domain')
  assert(context.branding, 'Context should have branding')
  assert(context.modules, 'Context should have modules')
  assert(context.capabilities, 'Context should have capabilities')

  await integration.shutdown()
}

async function testHealthCheck() {
  const integration = new ExperienceRuntimeIntegration()
  await integration.initialize()

  const health = integration.health()

  assertEqual(health.status, 'healthy', 'Health should be healthy')
  assert(Array.isArray(health.destinations), 'Health should list destinations')
  assert(health.destinations.includes('valdi'), 'Health should include valdi')
  assert(health.destinations.includes('natales'), 'Health should include natales')

  await integration.shutdown()
}

async function testShutdown() {
  const integration = new ExperienceRuntimeIntegration()
  await integration.initialize()

  assert(integration.initialized, 'Should be initialized before shutdown')

  await integration.shutdown()

  assert(!integration.initialized, 'Should not be initialized after shutdown')
}

const testModule = process.argv[1]?.includes('experience.runtime.integration.test')
if (testModule) {
  runTests().then(({ passed, failed }) => {
    process.exit(failed > 0 ? 1 : 0)
  }).catch(err => {
    console.error('Test error:', err)
    process.exit(1)
  })
}

export { runTests, testExperienceEngineInitialization, testFiveDestinationResolution, testDestinationIsolation, testCompanyIsolation, testCacheIsolation, testExperienceContext, testHealthCheck, testShutdown }

export default runTests
