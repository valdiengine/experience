/**
 * P15.8.4 - Application Presentation Runtime Integration Test Suite
 *
 * Tests the complete application presentation integration:
 * - Application resolution
 * - Runtime assembly
 * - Presentation context transformation
 * - ViewModel adaptation
 * - Ownership-based rendering
 * - Security boundaries
 * - Isolation
 */

import {
  ApplicationResolver,
  createApplicationResolver
} from './application/application.resolver.js'

import {
  RuntimeApplicationAssembly,
  createRuntimeAssembly,
  RENDERING_MODE,
  PRESENTATION_STATUS
} from './application/application.runtime.js'

import {
  ApplicationPresentationContext,
  createApplicationPresentationContext,
  CONTENT_LAYER
} from './application/application.presentation.js'

import {
  ApplicationPresentationAdapter,
  createApplicationPresentationAdapter
} from './application/application.presentation.adapter.js'

import {
  ApplicationPresentationRenderer,
  createApplicationPresentationRenderer
} from './application/application.presentation.renderer.js'

import { CapabilityRegistry } from './application/capabilities/capability.registry.js'
import { createCapabilityComposer } from './application/capabilities/capability.composer.js'
import { createRouteOwnershipRegistry, OWNERSHIP } from './routing/route.registry.js'
import { createRouteMigrationManager } from './routing/route.migration.manager.js'
import { MIGRATION_STATE } from './routing/route.migration.controller.js'
import { ApplicationIdentity, CANONICAL_DOMAINS, REJECTED_DOMAINS } from './application/application.identity.js'

const ROUTE_CONFIG = {
  routes: [
    {
      domain: 'valdi.app',
      path: '/empresa/albasie',
      ownership: 'experience',
      migrationState: 'EXPERIENCE_ACTIVE',
      destination: 'valdi',
      company: 'albasie',
      match: 'exact',
      enabled: true
    },
    {
      domain: 'valdi.app',
      path: '/empresa/x',
      ownership: 'wordpress',
      migrationState: 'ACTIVE_WORDPRESS',
      destination: 'valdi',
      company: 'x',
      match: 'exact',
      enabled: true
    },
    {
      domain: 'valdi.app',
      path: '/costa',
      ownership: 'hybrid',
      migrationState: 'HYBRID_ACTIVE',
      destination: 'valdi',
      match: 'exact',
      enabled: true
    },
    {
      domain: 'valdi.app',
      path: '/corral',
      ownership: 'hybrid',
      migrationState: 'HYBRID_ACTIVE',
      destination: 'valdi',
      match: 'exact',
      enabled: true
    },
    {
      domain: 'natales.app',
      path: '/hostal-patagonia',
      ownership: 'experience',
      migrationState: 'EXPERIENCE_ACTIVE',
      destination: 'natales',
      company: 'hostal-patagonia',
      match: 'exact',
      enabled: true
    }
  ]
}

function createTestResolver(config = ROUTE_CONFIG) {
  const registry = createRouteOwnershipRegistry(config)
  const migrationManager = createRouteMigrationManager(registry)
  const capabilityRegistry = CapabilityRegistry.createDefault()
  const capabilityComposer = createCapabilityComposer(capabilityRegistry)

  return new ApplicationResolver({
    registry,
    migrationManager,
    capabilityComposer
  })
}

function runTests() {
  const results = []
  let passed = 0
  let failed = 0

  function test(name, fn) {
    try {
      fn()
      console.log(`  ✅ ${name}`)
      passed++
      results.push({ name, status: 'PASS' })
    } catch (error) {
      console.log(`  ❌ ${name}`)
      console.log(`     Error: ${error.message}`)
      failed++
      results.push({ name, status: 'FAIL', error: error.message })
    }
  }

  function assert(condition, message) {
    if (!condition) {
      throw new Error(message || 'Assertion failed')
    }
  }

  function assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(message || `Expected ${expected}, got ${actual}`)
    }
  }

  console.log('\n📋 P15.8.4 - Application Presentation Runtime Integration\n')

  console.log('1. Application Resolution Tests')
  console.log('─'.repeat(50))

  test('ApplicationResolver resolves application correctly', () => {
    const resolver = createTestResolver()
    const result = resolver.resolve({ domain: 'valdi.app', path: '/empresa/albasie' })
    assert(result.success === true, 'Resolution should succeed')
    assert(result.resolved !== null, 'Resolved should not be null')
    assertEqual(result.resolved.identity.domain, 'valdi.app')
    assertEqual(result.resolved.identity.route, '/empresa/albasie')
  })

  test('RuntimeApplicationAssembly assembles correctly', () => {
    const resolver = createTestResolver()
    const assembly = createRuntimeAssembly(resolver)
    const result = assembly.assemble({ domain: 'valdi.app', path: '/empresa/albasie' })
    assert(result.success === true, 'Assembly should succeed')
    assert(result.runtime !== null, 'Runtime should not be null')
    assertEqual(result.runtime.rendering.mode, RENDERING_MODE.EXPERIENCE)
  })

  console.log('\n2. Application Presentation Context Tests')
  console.log('─'.repeat(50))

  test('ApplicationPresentationContext creates from RuntimeApplication', () => {
    const resolver = createTestResolver()
    const assembly = createRuntimeAssembly(resolver)
    const result = assembly.assemble({ domain: 'valdi.app', path: '/empresa/albasie' })
    const context = createApplicationPresentationContext(result.runtime)
    assert(context !== null, 'Context should not be null')
    assert(context.presentationStatus === PRESENTATION_STATUS.READY)
  })

  test('ApplicationPresentationContext has correct rendering mode for EXPERIENCE', () => {
    const resolver = createTestResolver()
    const assembly = createRuntimeAssembly(resolver)
    const result = assembly.assemble({ domain: 'valdi.app', path: '/empresa/albasie' })
    const context = createApplicationPresentationContext(result.runtime)
    assertEqual(context.renderingMode, RENDERING_MODE.EXPERIENCE)
    assert(context.isExperience() === true)
    assert(context.contentLayer === CONTENT_LAYER.EXPERIENCE)
  })

  test('ApplicationPresentationContext has correct rendering mode for WORDPRESS', () => {
    const resolver = createTestResolver()
    const assembly = createRuntimeAssembly(resolver)
    const result = assembly.assemble({ domain: 'valdi.app', path: '/empresa/x' })
    const context = createApplicationPresentationContext(result.runtime)
    assertEqual(context.renderingMode, RENDERING_MODE.WORDPRESS)
    assert(context.isWordPress() === true)
    assert(context.contentLayer === CONTENT_LAYER.WORDPRESS)
  })

  test('ApplicationPresentationContext has correct rendering mode for HYBRID', () => {
    const resolver = createTestResolver()
    const assembly = createRuntimeAssembly(resolver)
    const result = assembly.assemble({ domain: 'valdi.app', path: '/costa' })
    const context = createApplicationPresentationContext(result.runtime)
    assertEqual(context.renderingMode, RENDERING_MODE.HYBRID)
    assert(context.isHybrid() === true)
    assert(context.contentLayer === CONTENT_LAYER.HYBRID)
  })

  test('ApplicationPresentationContext provides presentation context', () => {
    const resolver = createTestResolver()
    const assembly = createRuntimeAssembly(resolver)
    const result = assembly.assemble({ domain: 'valdi.app', path: '/empresa/albasie' })
    const context = createApplicationPresentationContext(result.runtime)
    const ctx = context.getPresentationContext()
    assert(ctx !== null, 'Presentation context should not be null')
    assert(ctx.domain === 'valdi.app', 'Domain should be valdi.app')
    assert(ctx.platform === 'valdi-platform', 'Platform should be valdi-platform')
  })

  console.log('\n3. Application Presentation Adapter Tests')
  console.log('─'.repeat(50))

  test('ApplicationPresentationAdapter adapts context to view model', () => {
    const resolver = createTestResolver()
    const assembly = createRuntimeAssembly(resolver)
    const result = assembly.assemble({ domain: 'valdi.app', path: '/empresa/albasie' })
    const context = createApplicationPresentationContext(result.runtime)
    const adapter = createApplicationPresentationAdapter()
    const viewModel = adapter.adapt(context)
    assert(viewModel !== null, 'ViewModel should not be null')
    assert(viewModel.identity !== null, 'Identity should not be null')
    assert(viewModel.destination !== null, 'Destination should not be null')
  })

  test('ViewModel contains branding', () => {
    const resolver = createTestResolver()
    const assembly = createRuntimeAssembly(resolver)
    const result = assembly.assemble({ domain: 'valdi.app', path: '/empresa/albasie' })
    const context = createApplicationPresentationContext(result.runtime)
    const adapter = createApplicationPresentationAdapter()
    const viewModel = adapter.adapt(context)
    assert(viewModel.branding !== null, 'Branding should not be null')
    assert(viewModel.branding.colors !== null, 'Branding colors should not be null')
    assertEqual(viewModel.branding.colors.primary, '#c8a55c')
  })

  test('ViewModel contains SEO data', () => {
    const resolver = createTestResolver()
    const assembly = createRuntimeAssembly(resolver)
    const result = assembly.assemble({ domain: 'valdi.app', path: '/empresa/albasie' })
    const context = createApplicationPresentationContext(result.runtime)
    const adapter = createApplicationPresentationAdapter()
    const viewModel = adapter.adapt(context)
    assert(viewModel.seo !== null, 'SEO should not be null')
    assert(viewModel.seo.title !== null, 'SEO title should not be null')
  })

  test('ViewModel contains capabilities', () => {
    const resolver = createTestResolver()
    const assembly = createRuntimeAssembly(resolver)
    const result = assembly.assemble({ domain: 'valdi.app', path: '/empresa/albasie' })
    const context = createApplicationPresentationContext(result.runtime)
    const adapter = createApplicationPresentationAdapter()
    const viewModel = adapter.adapt(context)
    assert(Array.isArray(viewModel.capabilities), 'Capabilities should be an array')
    assert(viewModel.capabilities.length > 0, 'Should have capabilities')
  })

  test('ViewModel contains theme', () => {
    const resolver = createTestResolver()
    const assembly = createRuntimeAssembly(resolver)
    const result = assembly.assemble({ domain: 'valdi.app', path: '/empresa/albasie' })
    const context = createApplicationPresentationContext(result.runtime)
    const adapter = createApplicationPresentationAdapter()
    const viewModel = adapter.adapt(context)
    assert(viewModel.theme !== null, 'Theme should not be null')
    assertEqual(viewModel.theme.mode, 'dark')
  })

  test('ViewModel rendering info is present', () => {
    const resolver = createTestResolver()
    const assembly = createRuntimeAssembly(resolver)
    const result = assembly.assemble({ domain: 'valdi.app', path: '/empresa/albasie' })
    const context = createApplicationPresentationContext(result.runtime)
    const adapter = createApplicationPresentationAdapter()
    const viewModel = adapter.adapt(context)
    assert(viewModel.rendering !== null, 'Rendering info should not be null')
    assertEqual(viewModel.rendering.mode, RENDERING_MODE.EXPERIENCE)
    assertEqual(viewModel.rendering.contentLayer, CONTENT_LAYER.EXPERIENCE)
  })

  console.log('\n4. Application Presentation Renderer Tests')
  console.log('─'.repeat(50))

  test('ApplicationPresentationRenderer renders EXPERIENCE application', async () => {
    const renderer = createApplicationPresentationRenderer()
    const result = await renderer.render({ domain: 'valdi.app', path: '/empresa/albasie' })
    assert(result.success === true, 'Render should succeed')
    assert(result.presentation !== null, 'Presentation should not be null')
    assertEqual(result.presentation.identity.domain, 'valdi.app')
  })

  test('ApplicationPresentationRenderer renders WORDPRESS application', async () => {
    const renderer = createApplicationPresentationRenderer()
    const result = await renderer.render({ domain: 'valdi.app', path: '/empresa/x' })
    assert(result.success === true, 'Render should succeed')
    assertEqual(result.presentation.rendering.mode, RENDERING_MODE.WORDPRESS)
  })

  test('ApplicationPresentationRenderer renders HYBRID application', async () => {
    const renderer = createApplicationPresentationRenderer()
    const result = await renderer.render({ domain: 'valdi.app', path: '/costa' })
    assert(result.success === true, 'Render should succeed')
    assertEqual(result.presentation.rendering.mode, RENDERING_MODE.HYBRID)
  })

  test('Renderer output contains sections', async () => {
    const renderer = createApplicationPresentationRenderer()
    const result = await renderer.render({ domain: 'valdi.app', path: '/empresa/albasie' })
    assert(result.success === true, 'Render should succeed')
    assert(Array.isArray(result.presentation.sections), 'Sections should be an array')
  })

  test('Renderer output contains components', async () => {
    const renderer = createApplicationPresentationRenderer()
    const result = await renderer.render({ domain: 'valdi.app', path: '/empresa/albasie' })
    assert(result.success === true, 'Render should succeed')
    assert(Array.isArray(result.presentation.components), 'Components should be an array')
  })

  console.log('\n5. Capability-Based Rendering Tests')
  console.log('─'.repeat(50))

  test('Rendering includes capability-based sections', async () => {
    const renderer = createApplicationPresentationRenderer()
    const result = await renderer.render({
      domain: 'valdi.app',
      path: '/empresa/albasie',
      experienceType: 'company-profile'
    })
    assert(result.success === true, 'Render should succeed')
    const sectionIds = result.presentation.sections.map(s => s.id)
    assert(sectionIds.includes('hero'), 'Should include hero section')
  })

  test('Rendering includes all enabled capabilities', async () => {
    const renderer = createApplicationPresentationRenderer()
    const result = await renderer.render({
      domain: 'valdi.app',
      path: '/empresa/albasie',
      capabilities: { hero: true, services: true, gallery: true }
    })
    assert(result.success === true, 'Render should succeed')
    assert(result.presentation.capabilities.includes('hero'))
    assert(result.presentation.capabilities.includes('services'))
    assert(result.presentation.capabilities.includes('gallery'))
  })

  test('Disabled capability is not rendered', async () => {
    const renderer = createApplicationPresentationRenderer()
    const result = await renderer.render({
      domain: 'valdi.app',
      path: '/empresa/albasie',
      capabilities: { hero: true, services: false, gallery: true }
    })
    assert(result.success === true, 'Render should succeed')
    assert(result.presentation.capabilities.includes('hero'))
    assert(!result.presentation.capabilities.includes('services'))
    assert(result.presentation.capabilities.includes('gallery'))
  })

  console.log('\n6. Domain Isolation Tests')
  console.log('─'.repeat(50))

  test('Different domains have isolated presentations', async () => {
    const renderer = createApplicationPresentationRenderer()
    const result1 = await renderer.render({ domain: 'valdi.app', path: '/test' })
    const result2 = await renderer.render({ domain: 'natales.app', path: '/test' })
    assert(result1.success === true)
    assert(result2.success === true)
    assert(result1.presentation.identity.domain !== result2.presentation.identity.domain)
  })

  test('Domain isolation for caching', async () => {
    const renderer = createApplicationPresentationRenderer()
    const result1 = await renderer.render({ domain: 'valdi.app', path: '/empresa/albasie' })
    const result2 = await renderer.render({ domain: 'natales.app', path: '/empresa/albasie' })
    assert(result1.presentation.metadata.cacheKey !== result2.presentation.metadata.cacheKey)
  })

  console.log('\n7. Route Isolation Tests')
  console.log('─'.repeat(50))

  test('Different routes have isolated presentations', async () => {
    const renderer = createApplicationPresentationRenderer()
    const result1 = await renderer.render({ domain: 'valdi.app', path: '/route1' })
    const result2 = await renderer.render({ domain: 'valdi.app', path: '/route2' })
    assert(result1.success === true)
    assert(result2.success === true)
    assert(result1.presentation.identity.route !== result2.presentation.identity.route)
  })

  test('Route isolation for caching', async () => {
    const renderer = createApplicationPresentationRenderer()
    const result1 = await renderer.render({ domain: 'valdi.app', path: '/empresa/albasie' })
    const result2 = await renderer.render({ domain: 'valdi.app', path: '/empresa/x' })
    assert(result1.presentation.metadata.cacheKey !== result2.presentation.metadata.cacheKey)
  })

  console.log('\n8. Company Isolation Tests')
  console.log('─'.repeat(50))

  test('Different companies have isolated presentations', async () => {
    const renderer = createApplicationPresentationRenderer()
    const result1 = await renderer.render({ domain: 'valdi.app', path: '/empresa/albasie' })
    const result2 = await renderer.render({ domain: 'valdi.app', path: '/empresa/x' })
    assert(result1.success === true)
    assert(result2.success === true)
    assert(result1.presentation.company?.slug !== result2.presentation.company?.slug)
  })

  console.log('\n9. Security Boundary Tests')
  console.log('─'.repeat(50))

  test('No infrastructure references in presentation', async () => {
    const renderer = createApplicationPresentationRenderer()
    const result = await renderer.render({ domain: 'valdi.app', path: '/empresa/albasie' })
    const str = JSON.stringify(result.presentation)
    assert(!str.includes('pg'), 'Should not contain pg')
    assert(!str.includes('mysql'), 'Should not contain mysql')
    assert(!str.includes('mongodb'), 'Should not contain mongodb')
    assert(!str.includes('drizzle'), 'Should not contain drizzle')
  })

  test('No WordPress references in presentation', async () => {
    const renderer = createApplicationPresentationRenderer()
    const result = await renderer.render({ domain: 'valdi.app', path: '/empresa/albasie' })
    const str = JSON.stringify(result.presentation)
    assert(!str.includes('wp-api'), 'Should not contain wp-api')
    assert(!str.includes('WordPress'), 'Should not contain WordPress')
  })

  test('No storage references in presentation', async () => {
    const renderer = createApplicationPresentationRenderer()
    const result = await renderer.render({ domain: 'valdi.app', path: '/empresa/albasie' })
    const str = JSON.stringify(result.presentation)
    assert(!str.includes('S3Client'), 'Should not contain S3Client')
    assert(!str.includes('StorageProvider'), 'Should not contain StorageProvider')
    assert(!str.includes('R2Client'), 'Should not contain R2Client')
  })

  test('No credentials in presentation', async () => {
    const renderer = createApplicationPresentationRenderer()
    const result = await renderer.render({ domain: 'valdi.app', path: '/empresa/albasie' })
    const str = JSON.stringify(result.presentation)
    assert(!str.includes('apiKey'), 'Should not contain apiKey')
    assert(!str.includes('secret'), 'Should not contain secret')
    assert(!str.includes('password'), 'Should not contain password')
  })

  console.log('\n10. valdivia.app Rejection Tests')
  console.log('─'.repeat(50))

  test('valdivia.app is rejected', async () => {
    const renderer = createApplicationPresentationRenderer()
    const result = await renderer.render({ domain: 'valdivia.app', path: '/test' })
    assert(result.success === false, 'Should reject valdivia.app')
    assert(result.error.includes('not allowed'), 'Should indicate domain is not allowed')
  })

  test('valdivia.app does not reach presentation', async () => {
    const resolver = createTestResolver()
    const assembly = createRuntimeAssembly(resolver)
    const result = assembly.assemble({ domain: 'valdivia.app', path: '/test' })
    assert(result.success === false, 'Should reject valdivia.app at assembly level')
  })

  console.log('\n11. Regression Tests')
  console.log('─'.repeat(50))

  test('P15.8.3 ApplicationResolver still works', () => {
    const resolver = createTestResolver()
    const result = resolver.resolve({ domain: 'valdi.app', path: '/empresa/albasie' })
    assert(result.success === true)
    assertEqual(result.resolved.identity.applicationId, 'valdi.app/empresa/albasie')
  })

  test('P15.8.3 RuntimeApplicationAssembly still works', () => {
    const resolver = createTestResolver()
    const assembly = createRuntimeAssembly(resolver)
    const result = assembly.assemble({ domain: 'valdi.app', path: '/empresa/albasie' })
    assert(result.success === true)
    assertEqual(result.runtime.rendering.mode, RENDERING_MODE.EXPERIENCE)
  })

  test('P15.8.2 CapabilityRegistry still works', () => {
    const registry = CapabilityRegistry.createDefault()
    const cap = registry.get('hero')
    assert(cap !== null, 'Hero capability should exist')
  })

  test('P15.8.1 ApplicationIdentity still works', () => {
    const identity = new ApplicationIdentity('valdi.app', '/test')
    assertEqual(identity.domain, 'valdi.app')
    assertEqual(identity.route, '/test')
  })

  console.log('\n12. Progressive Migration Tests')
  console.log('─'.repeat(50))

  test('WORDPRESS route remains WORDPRESS after rendering', async () => {
    const renderer = createApplicationPresentationRenderer()
    const result = await renderer.render({ domain: 'valdi.app', path: '/empresa/x' })
    assert(result.success === true)
    assertEqual(result.presentation.rendering.mode, RENDERING_MODE.WORDPRESS)
    assertEqual(result.presentation.rendering.contentLayer, CONTENT_LAYER.WORDPRESS)
  })

  test('HYBRID route renders HYBRID content layer', async () => {
    const renderer = createApplicationPresentationRenderer()
    const result = await renderer.render({ domain: 'valdi.app', path: '/costa' })
    assert(result.success === true)
    assertEqual(result.presentation.rendering.mode, RENDERING_MODE.HYBRID)
    assertEqual(result.presentation.rendering.contentLayer, CONTENT_LAYER.HYBRID)
  })

  test('EXPERIENCE route renders without WordPress requirement', async () => {
    const renderer = createApplicationPresentationRenderer()
    const result = await renderer.render({ domain: 'valdi.app', path: '/empresa/albasie' })
    assert(result.success === true)
    assertEqual(result.presentation.rendering.mode, RENDERING_MODE.EXPERIENCE)
    assertEqual(result.presentation.rendering.contentLayer, CONTENT_LAYER.EXPERIENCE)
  })

  console.log('\n13. Cache Isolation Tests')
  console.log('─'.repeat(50))

  test('Cache key includes domain', async () => {
    const renderer = createApplicationPresentationRenderer()
    const result = await renderer.render({ domain: 'valdi.app', path: '/test' })
    assert(result.presentation.metadata.cacheKey.includes('valdi.app'))
  })

  test('Cache key includes route', async () => {
    const renderer = createApplicationPresentationRenderer()
    const result = await renderer.render({ domain: 'valdi.app', path: '/test' })
    assert(result.presentation.metadata.cacheKey.includes('/test'))
  })

  test('Cache key includes ownership', async () => {
    const renderer = createApplicationPresentationRenderer()
    const result = await renderer.render({ domain: 'valdi.app', path: '/test' })
    assert(result.presentation.metadata.cacheKey.includes('wordpress'))
  })

  console.log('\n14. ViewModel Boundary Tests')
  console.log('─'.repeat(50))

  test('Internal fields do not reach view model', async () => {
    const renderer = createApplicationPresentationRenderer()
    const result = await renderer.render({ domain: 'valdi.app', path: '/empresa/albasie' })
    const str = JSON.stringify(result.presentation)
    assert(!str.includes('_ApplicationPresentationContext'), 'Should not contain internal fields')
    assert(!str.includes('__runtime'), 'Should not contain runtime reference')
  })

  test('ViewModel is frozen', async () => {
    const renderer = createApplicationPresentationRenderer()
    const result = await renderer.render({ domain: 'valdi.app', path: '/empresa/albasie' })
    assert(Object.isFrozen(result.presentation), 'Presentation should be frozen')
    assert(Object.isFrozen(result.presentation.identity), 'Identity should be frozen')
    assert(Object.isFrozen(result.presentation.branding), 'Branding should be frozen')
  })

  console.log('\n15. Destination Isolation Tests')
  console.log('─'.repeat(50))

  test('Different destinations have isolated presentations', async () => {
    const renderer = createApplicationPresentationRenderer()
    const result1 = await renderer.render({ domain: 'valdi.app', path: '/test' })
    const result2 = await renderer.render({ domain: 'natales.app', path: '/test' })
    assert(result1.presentation.destination?.slug !== result2.presentation.destination?.slug)
  })

  console.log('\n16. SEO Metadata Tests')
  console.log('─'.repeat(50))

  test('SEO title reaches renderer', async () => {
    const renderer = createApplicationPresentationRenderer()
    const result = await renderer.render({ domain: 'valdi.app', path: '/empresa/albasie' })
    assert(result.presentation.seo.title !== null, 'SEO title should reach renderer')
    assert(result.presentation.seo.title.length > 0, 'SEO title should not be empty')
  })

  test('SEO description reaches renderer', async () => {
    const renderer = createApplicationPresentationRenderer()
    const result = await renderer.render({ domain: 'valdi.app', path: '/empresa/albasie' })
    assert(result.presentation.seo.description !== null, 'SEO description should reach renderer')
  })

  console.log('\n' + '═'.repeat(50))
  console.log(`📊 Results: ${passed} passed, ${failed} failed`)

  if (failed === 0) {
    console.log('✅ ALL TESTS PASSED')
  } else {
    console.log('❌ SOME TESTS FAILED')
  }

  return { passed, failed, results }
}

const results = runTests()
process.exit(results.failed > 0 ? 1 : 0)
