/**
 * Experience Engine Tests
 * 
 * Unit tests for Experience Engine core functionality.
 */

import { ExperienceEngine } from './experience.engine.js'
import { ExperienceContext, ExperienceContextBuilder } from './experience.context.js'
import { ProductResolver } from './resolver/product.resolver.js'
import { EcosystemResolver } from './resolver/ecosystem.resolver.js'
import { ModuleResolver } from './resolver/module.resolver.js'
import { CapabilityResolver } from './resolver/capability.resolver.js'
import { ConfigurationLoader } from './loader/configuration.loader.js'
import { ExperienceLoader } from './loader/experience.loader.js'
import { ExperienceComposer } from './composition/experience.composer.js'
import {
  ExperienceEngineError,
  ProductResolutionError,
  EcosystemLoadError,
  ConfigurationResolutionError
} from './experience.errors.js'

const TEST_MODE = true

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
  console.log('🧪 Running Experience Engine Tests...\n')
  let passed = 0
  let failed = 0

  const tests = [
    testExperienceContextBuilder,
    testExperienceContext,
    testProductResolver,
    testEcosystemResolver,
    testModuleResolver,
    testCapabilityResolver,
    testConfigurationLoader,
    testExperienceLoader,
    testExperienceComposer,
    testExperienceEngine,
    testMultiDestination,
    testNoHardcodedProduct,
    testTenantIsolation,
    testConfigurationInheritance
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

async function testExperienceContextBuilder() {
  const builder = new ExperienceContextBuilder()
  builder
    .setPlatform('valdi')
    .setCountry({ code: 'cl', name: 'Chile' })
    .setRegion({ code: 'los-rios', name: 'Los Ríos' })
    .setDestination({ slug: 'valdi', name: 'Valdi' })
    .setModules(['reservations', 'gallery'])
    .setCapabilities(['reservation', 'media'])

  const context = builder.build()

  assertEqual(context.platform, 'valdi', 'Platform should be set')
  assertEqual(context.country.code, 'cl', 'Country should be set')
  assertEqual(context.region.code, 'los-rios', 'Region should be set')
  assertEqual(context.destination.slug, 'valdi', 'Destination should be set')
  assertContains(context.modules, 'reservations', 'Reservations module should be set')
  assertContains(context.capabilities, 'media', 'Media capability should be set')
}

async function testExperienceContext() {
  const builder = new ExperienceContextBuilder()
  builder
    .setPlatform('valdi')
    .setDestination({ slug: 'natales', name: 'Natales' })
    .setModules(['gallery', 'maps'])
    .setCapabilities(['media', 'cms'])
    .setTheme({ mode: 'dark' })

  const context = new ExperienceContext(builder)
  context.freeze()

  assertEqual(context.platform, 'valdi', 'Platform should be accessible')
  assertEqual(context.destination.slug, 'natales', 'Destination should be accessible')
  assert(context.hasModule('gallery'), 'Should have gallery module')
  assert(!context.hasModule('nonexistent'), 'Should not have nonexistent module')
  assert(context.hasCapability('media'), 'Should have media capability')
}

async function testProductResolver() {
  const resolver = new ProductResolver()
  await resolver.initialize({})

  const request1 = { hostname: 'albasie.valdi.app' }
  const context1 = await resolver.resolve(request1)
  assertEqual(context1.subdomain, 'albasie', 'Subdomain should be resolved')
  assertEqual(context1.destination, 'albasie', 'Destination from subdomain')
  assertEqual(context1.resolutionStrategy, 'subdomain', 'Resolution strategy should be subdomain')

  const request2 = { hostname: 'valdi.app' }
  const context2 = await resolver.resolve(request2)
  assertEqual(context2.destination, 'valdi', 'Destination should be valdi')

  const request3 = { query: { ecosystem: 'cl-magallanes-natales' } }
  const context3 = await resolver.resolve(request3)
  assertEqual(context3.country, 'cl', 'Country should be cl')
  assertEqual(context3.region, 'magallanes', 'Region should be magallanes')
  assertEqual(context3.destination, 'natales', 'Destination should be natales')

  const health = await resolver.healthCheck()
  assertEqual(health.status, 'ok', 'Health check should return ok')
}

async function testEcosystemResolver() {
  const resolver = new EcosystemResolver()
  await resolver.initialize({})

  const context = await resolver.resolve({
    country: 'cl',
    region: 'los-rios',
    destination: 'valdi',
    company: 'albasie'
  })

  assertEqual(context.country.code, 'cl', 'Country code should be cl')
  assertEqual(context.region.code, 'los-rios', 'Region code should be los-rios')
  assertEqual(context.destination.slug, 'valdi', 'Destination slug should be valdi')
  assertEqual(context.ecosystem, 'cl-los-rios-valdi', 'Ecosystem ID should be correct')

  const health = await resolver.healthCheck()
  assertEqual(health.status, 'ok', 'Health check should return ok')
}

async function testModuleResolver() {
  const resolver = new ModuleResolver()
  await resolver.initialize({})

  const context = await resolver.resolve({
    destination: { enabledModules: ['reservations', 'gallery', 'maps'] },
    company: { slug: 'albasie' }
  })

  assertContains(context.modules, 'reservations', 'Should have reservations module')
  assertContains(context.modules, 'gallery', 'Should have gallery module')
  assertContains(context.modules, 'maps', 'Should have maps module')
  assert(context.modulesConfig['reservations'], 'Should have reservations config')
  assertEqual(context.capabilities.length > 0, true, 'Should have capabilities')

  const health = await resolver.healthCheck()
  assertEqual(health.status, 'ok', 'Health check should return ok')
}

async function testCapabilityResolver() {
  const resolver = new CapabilityResolver()
  await resolver.initialize({})

  const context = await resolver.resolve({
    modules: ['reservations', 'gallery', 'notifications'],
    capabilities: ['reservation', 'cms']
  })

  assertContains(context.capabilities, 'persistence', 'Should have persistence capability')
  assertContains(context.capabilities, 'media', 'Should have media capability')
  assertContains(context.capabilities, 'reservation', 'Should have reservation capability')

  const health = await resolver.healthCheck()
  assertEqual(health.status, 'ok', 'Health check should return ok')
}

async function testConfigurationLoader() {
  const loader = new ConfigurationLoader()
  await loader.initialize({})

  const context = {
    country: 'cl',
    region: 'los-rios',
    destination: 'valdi',
    company: 'albasie'
  }

  const loaded = await loader.load(context)

  assertEqual(loaded.country.code, 'cl', 'Country should be loaded')
  assertEqual(loaded.destination.slug, 'valdi', 'Destination should be loaded')
  assert(loaded.branding, 'Should have branding')
  assert(loaded.navigation, 'Should have navigation')
  assertEqual(loaded.theme.mode, 'dark', 'Should have theme')

  const health = await loader.healthCheck()
  assertEqual(health.status, 'ok', 'Health check should return ok')
}

async function testExperienceLoader() {
  const loader = new ExperienceLoader()
  await loader.initialize({})

  const context = {
    config: {
      destination: {
        slug: 'valdi',
        name: 'Valdi',
        type: 'tourism-platform'
      }
    }
  }

  const experience = await loader.load(context)

  assert(experience.id, 'Should have experience ID')
  assert(experience.sections, 'Should have sections')
  assert(experience.components, 'Should have components')
  assert(experience.type, 'Experience type should be set')

  const health = await loader.healthCheck()
  assertEqual(health.status, 'ok', 'Health check should return ok')
}

async function testExperienceComposer() {
  const composer = new ExperienceComposer()
  await composer.initialize({})

  const context = {
    platform: 'valdi',
    country: 'cl',
    config: {
      country: { code: 'cl', name: 'Chile' },
      destination: {
        slug: 'valdi',
        name: 'Valdi',
        branding: {
          colors: { primary: '#c8a55c' }
        }
      }
    }
  }

  const composed = await composer.compose(context)

  assertEqual(composed.platform, 'valdi', 'Platform should be set')
  assert(composed.branding, 'Should have branding')
  assertEqual(composed.branding.colors.primary, '#c8a55c', 'Branding colors should be set')
  assert(composed.navigation, 'Should have navigation')
  assert(composed.seo, 'Should have SEO')
  assert(composed.i18n, 'Should have i18n')
  assert(composed.maps, 'Should have maps')
}

async function testExperienceEngine() {
  const engine = new ExperienceEngine({ debug: TEST_MODE })

  engine.registerResolver('product', new ProductResolver())
  engine.registerResolver('ecosystem', new EcosystemResolver())
  engine.registerResolver('module', new ModuleResolver())
  engine.registerResolver('capability', new CapabilityResolver())
  engine.registerLoader('configuration', new ConfigurationLoader())
  engine.registerLoader('experience', new ExperienceLoader())
  engine.setComposition(new ExperienceComposer())

  await engine.initialize()
  assert(engine.initialized, 'Engine should be initialized')

  await engine.start()
  assert(engine.started, 'Engine should be started')

  const request = { hostname: 'valdi.app' }
  const context = await engine.resolveAndCompose(request)

  assertEqual(context.platform, 'valdi', 'Platform should be valdi')
  assert(context.modules.length > 0, 'Should have modules')
  assert(context.capabilities.length > 0, 'Should have capabilities')

  const health = await engine.healthCheck()
  assertEqual(health.status, 'healthy', 'Health should be healthy')

  await engine.stop()
  assert(!engine.started, 'Engine should be stopped')
}

async function testMultiDestination() {
  const resolver = new ProductResolver()
  await resolver.initialize({})

  const destinations = [
    { hostname: 'valdi.app', expected: 'valdi' },
    { hostname: 'natales.app', expected: 'natales' },
    { hostname: 'puntaarenas.app', expected: 'puntaarenas' },
    { hostname: 'chiloe.app', expected: 'chiloe' },
    { hostname: 'coyhaique.app', expected: 'coyhaique' }
  ]

  for (const { hostname, expected } of destinations) {
    const context = await resolver.resolve({ hostname })
    assertEqual(context.destination, expected, `Destination for ${hostname} should be ${expected}`)
  }
}

async function testNoHardcodedProduct() {
  const resolver = new ProductResolver()
  await resolver.initialize({})

  const registry = resolver.getRegistry()

  const forbidden = ['dronestica', 'albasie', 'secnet', 'esr-motos']
  for (const product of forbidden) {
    const context = await resolver.resolve({ hostname: `${product}.valdi.app` })
    assert(context.destination === product, `Should resolve ${product} generically`)
  }
}

async function testTenantIsolation() {
  const resolver = new ProductResolver()
  await resolver.initialize({})

  const context1 = await resolver.resolve({ hostname: 'company1.valdi.app' })
  const context2 = await resolver.resolve({ hostname: 'company2.valdi.app' })

  assert(context1.subdomain !== context2.subdomain, 'Different subdomains should produce different contexts')
  assert(context1.company !== context2.company, 'Companies should be isolated')
}

async function testConfigurationInheritance() {
  const loader = new ConfigurationLoader()
  await loader.initialize({})

  const baseContext = {
    country: 'cl',
    region: 'los-rios',
    destination: 'valdi',
    company: 'albasie'
  }

  const loaded = await loader.load(baseContext)

  assertEqual(loaded.country.code, 'cl', 'Country should be inherited')
  assert(loaded.destination, 'Destination should be inherited')
  assert(loaded.branding.colors.primary, 'Primary color should be inherited from destination')
}

export { runTests }

if (typeof process !== 'undefined' && process.argv && process.argv[1] && process.argv[1].includes('experience.test')) {
  runTests().then(({ passed, failed }) => {
    process.exit(failed > 0 ? 1 : 0)
  }).catch(err => {
    console.error('Test runner failed:', err)
    process.exit(1)
  })
}
