/**
 * P15.2 — First MVP Experience Tests
 * 
 * Tests the valdi.app tourism directory MVP experience.
 * Validates that the Experience Engine correctly composes
 * the MVP experience using configuration-driven composition.
 */

import { ExperienceRuntimeIntegration } from '../runtime/experience/experience.runtime.integration.js'

const CANONICAL_DESTINATION = {
  domain: 'valdi.app',
  destination: 'valdi',
  region: 'los-rios',
  country: 'cl',
  geographicName: 'Valdivia'
}

const TOURISM_CATEGORIES = [
  'tourism',
  'accommodation',
  'restaurant',
  'events',
  'services',
  'marine',
  'commerce'
]

const MVP_MODULES = [
  'categories',
  'companies',
  'locations',
  'gallery',
  'contact'
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
  console.log('🧪 Running P15.2 MVP Experience Tests...\n')
  console.log('MVP: valdi.app — Tourism Directory\n')
  
  let passed = 0
  let failed = 0

  const tests = [
    testValdiProductResolution,
    testValdiDestinationIdentity,
    testValdiGeographicIdentity,
    testTourismDirectoryExperience,
    testCategoriesConfiguration,
    testModulesResolution,
    testDestinationIsolation,
    testNoDronesticaDependency,
    testCompanyIsolation,
    testSEOConfiguration,
    testBrandingConfiguration,
    testNavigationConfiguration,
    testExperienceComposition,
    testHealthCheck
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

async function testValdiProductResolution() {
  const integration = new ExperienceRuntimeIntegration()
  await integration.initialize()

  const context = await integration.resolve({ hostname: 'valdi.app' })

  assertEqual(context.destination?.slug, CANONICAL_DESTINATION.destination, 
    'Destination slug should be valdi')
  assertEqual(context.region?.code, CANONICAL_DESTINATION.region,
    'Region should be los-rios')
  assertEqual(context.country?.code, CANONICAL_DESTINATION.country,
    'Country should be cl')

  await integration.shutdown()
}

async function testValdiDestinationIdentity() {
  const integration = new ExperienceRuntimeIntegration()
  await integration.initialize()

  const context = await integration.resolve({ hostname: 'valdi.app' })

  assertEqual(context.destination?.domain, CANONICAL_DESTINATION.domain,
    'Domain should be valdi.app')
  assert(context.destination?.name || context.destination?.slug,
    'Destination should have name or slug')

  await integration.shutdown()
}

async function testValdiGeographicIdentity() {
  const integration = new ExperienceRuntimeIntegration()
  await integration.initialize()

  const context = await integration.resolve({ hostname: 'valdi.app' })

  assert(context.region?.name?.includes('Los Ríos') || context.region?.code === 'los-rios',
    'Region should be Los Ríos')
  
  await integration.shutdown()
}

async function testTourismDirectoryExperience() {
  const integration = new ExperienceRuntimeIntegration()
  await integration.initialize()

  const context = await integration.resolve({ hostname: 'valdi.app' })

  assert(context.experience, 'Context should have experience')
  assert(context.experience?.type === 'directory' || context.experience?.id === 'tourism-directory' || context.config?.experienceType === 'tourism-directory',
    'Experience should be tourism-directory type')

  await integration.shutdown()
}

async function testCategoriesConfiguration() {
  const integration = new ExperienceRuntimeIntegration()
  await integration.initialize()

  const context = await integration.resolve({ hostname: 'valdi.app' })

  const categories = context.config?.categories || context.destination?.categories || {}
  
  assert(Object.keys(categories).length > 0, 'Should have categories configured')
  
  for (const cat of TOURISM_CATEGORIES.slice(0, 4)) {
    assert(categories[cat] || context.destination?.enabledCategories?.includes(cat),
      `Category ${cat} should be available`)
  }

  await integration.shutdown()
}

async function testModulesResolution() {
  const integration = new ExperienceRuntimeIntegration()
  await integration.initialize()

  const context = await integration.resolve({ hostname: 'valdi.app' })

  assert(context.modules, 'Context should have modules')
  assert(context.modules?.length > 0, 'Should have at least some modules enabled')
  assertContains(context.modules, 'gallery', 'Gallery module should be enabled')
  assertContains(context.modules, 'maps', 'Maps module should be enabled')

  await integration.shutdown()
}

async function testDestinationIsolation() {
  const integration = new ExperienceRuntimeIntegration()
  await integration.initialize()

  const valdiContext = await integration.resolve({ hostname: 'valdi.app' })
  const natalesContext = await integration.resolve({ hostname: 'natales.app' })

  assert(valdiContext.destination?.slug !== natalesContext.destination?.slug,
    'valdi and natales should have different destinations')

  assert(valdiContext.region?.code !== natalesContext.region?.code,
    'valdi and natales should have different regions')

  await integration.shutdown()
}

async function testNoDronesticaDependency() {
  const integration = new ExperienceRuntimeIntegration()
  await integration.initialize()

  const context = await integration.resolve({ hostname: 'valdi.app' })

  const contextString = JSON.stringify(context)
  
  assert(!contextString.toLowerCase().includes('dronestica'),
    'Experience context should not contain Dronestica references')

  await integration.shutdown()
}

async function testCompanyIsolation() {
  const integration = new ExperienceRuntimeIntegration()
  await integration.initialize()

  const valdiContext = await integration.resolve({ hostname: 'valdi.app' })
  const natalesContext = await integration.resolve({ hostname: 'natales.app' })

  const valdiHasCompany = valdiContext.company && Object.keys(valdiContext.company).length > 0
  const natalesHasCompany = natalesContext.company && Object.keys(natalesContext.company).length > 0

  if (valdiHasCompany && natalesHasCompany) {
    assert(valdiContext.company?.slug !== natalesContext.company?.slug,
      'Companies should be isolated by destination')
    assert(valdiContext.company?.destination !== natalesContext.company?.destination,
      'Company destinations should be isolated')
  } else if (valdiHasCompany || natalesHasCompany) {
    assert(false, 'Only one destination has a company - isolation cannot be verified')
  }

  await integration.shutdown()
}

async function testSEOConfiguration() {
  const integration = new ExperienceRuntimeIntegration()
  await integration.initialize()

  const context = await integration.resolve({ hostname: 'valdi.app' })

  const seo = context.seo || context.config?.seo || {}
  
  assert(seo.defaultTitle || seo.title, 'Should have SEO title')
  assert(seo.defaultDescription || seo.description, 'Should have SEO description')

  await integration.shutdown()
}

async function testBrandingConfiguration() {
  const integration = new ExperienceRuntimeIntegration()
  await integration.initialize()

  const context = await integration.resolve({ hostname: 'valdi.app' })

  const branding = context.branding || context.config?.branding || {}
  
  assert(branding.colors, 'Should have branding colors')
  assert(branding.colors?.primary, 'Should have primary color')

  await integration.shutdown()
}

async function testNavigationConfiguration() {
  const integration = new ExperienceRuntimeIntegration()
  await integration.initialize()

  const context = await integration.resolve({ hostname: 'valdi.app' })

  const navigation = context.navigation || context.config?.navigation || {}
  
  assert(navigation.header, 'Should have header navigation')
  assert(navigation.header?.items?.length > 0, 'Should have navigation items')

  await integration.shutdown()
}

async function testExperienceComposition() {
  const integration = new ExperienceRuntimeIntegration()
  await integration.initialize()

  const context = await integration.resolve({ hostname: 'valdi.app' })

  assert(context.platform, 'Context should have platform')
  assert(context.country, 'Context should have country')
  assert(context.region, 'Context should have region')
  assert(context.destination, 'Context should have destination')
  assert(context.branding, 'Context should have branding')
  assert(context.modules, 'Context should have modules')
  assert(context.capabilities, 'Context should have capabilities')

  assertEqual(context.platform, 'valdi', 'Platform should be valdi')

  await integration.shutdown()
}

async function testHealthCheck() {
  const integration = new ExperienceRuntimeIntegration()
  await integration.initialize()

  const health = integration.health()

  assertEqual(health.status, 'healthy', 'Experience module should be healthy')
  assertContains(health.destinations, 'valdi', 'Should include valdi in destinations')

  await integration.shutdown()
}

const testModule = process.argv[1]?.includes('p15.2.mvp.test')
if (testModule) {
  runTests().then(({ passed, failed }) => {
    console.log(`\nP15.2 MVP Tests: ${passed}/${passed + failed} passed`)
    process.exit(failed > 0 ? 1 : 0)
  }).catch(err => {
    console.error('Test error:', err)
    process.exit(1)
  })
}

export { runTests, testValdiProductResolution, testValdiDestinationIdentity, testValdiGeographicIdentity, testTourismDirectoryExperience, testCategoriesConfiguration, testModulesResolution, testDestinationIsolation, testNoDronesticaDependency, testCompanyIsolation, testSEOConfiguration, testBrandingConfiguration, testNavigationConfiguration, testExperienceComposition, testHealthCheck }

export default runTests
