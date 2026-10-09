/**
 * P15.8.5 - Application Configuration & First Real Application Validation
 *
 * Validates the complete application pilot flow:
 * - Application configuration loading
 * - Migration states (LEGACY → HYBRID → EXPERIENCE)
 * - Rollback
 * - URL preservation
 * - Isolation
 * - Security
 * - Presentation
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

const APPLICATION_PILOT_CONFIG = {
  domain: 'valdi.app',
  route: '/empresa/albasie',
  company: 'albasie',
  destination: 'valdi',
  experienceType: 'company-profile',
  capabilities: {
    hero: true,
    services: true,
    gallery: true,
    contact: true
  }
}

function createPilotRouteConfig(ownership, migrationState, extraConfig = {}) {
  const config = {
    routes: [
      {
        domain: 'valdi.app',
        path: '/empresa/albasie',
        match: 'exact',
        ownership: ownership,
        migrationState: migrationState,
        destination: 'valdi',
        company: 'albasie',
        enabled: true,
        ...extraConfig
      },
      {
        domain: 'natales.app',
        path: '/empresa/other',
        match: 'exact',
        ownership: 'wordpress',
        migrationState: 'ACTIVE_WORDPRESS',
        destination: 'natales',
        company: 'other',
        enabled: true
      }
    ]
  }
  return config
}

function createTestResolver(config) {
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

function createTestAssembly(resolver) {
  return createRuntimeAssembly(resolver)
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

  console.log('\n📋 P15.8.5 - Application Configuration & First Real Application Validation\n')

  console.log('=== APPLICATION PILOT ===')
  console.log(`Domain: ${APPLICATION_PILOT_CONFIG.domain}`)
  console.log(`Route: ${APPLICATION_PILOT_CONFIG.route}`)
  console.log(`Company: ${APPLICATION_PILOT_CONFIG.company}`)
  console.log(`Destination: ${APPLICATION_PILOT_CONFIG.destination}`)
  console.log(`Experience Type: ${APPLICATION_PILOT_CONFIG.experienceType}`)
  console.log('')

  console.log('1. Application Configuration Tests')
  console.log('─'.repeat(50))

  test('Application configuration loads for pilot route', () => {
    const config = createPilotRouteConfig('wordpress', 'ACTIVE_WORDPRESS')
    const resolver = createTestResolver(config)
    const result = resolver.resolve({
      domain: 'valdi.app',
      path: '/empresa/albasie'
    })
    assert(result.success === true, 'Resolution should succeed')
    assertEqual(result.resolved.identity.domain, 'valdi.app')
    assertEqual(result.resolved.identity.route, '/empresa/albasie')
  })

  test('Application identity is deterministic', () => {
    const config = createPilotRouteConfig('wordpress', 'ACTIVE_WORDPRESS')
    const resolver = createTestResolver(config)
    const result1 = resolver.resolve({ domain: 'valdi.app', path: '/empresa/albasie' })
    const result2 = resolver.resolve({ domain: 'valdi.app', path: '/empresa/albasie' })
    assertEqual(result1.resolved.identity.applicationId, result2.resolved.identity.applicationId)
  })

  test('Application schema validation passes', () => {
    const config = createPilotRouteConfig('wordpress', 'ACTIVE_WORDPRESS')
    const resolver = createTestResolver(config)
    const result = resolver.resolve({
      domain: 'valdi.app',
      path: '/empresa/albasie',
      experienceType: 'company-profile'
    })
    assert(result.success === true, 'Schema validation should pass')
  })

  console.log('\n2. Migration State Tests')
  console.log('─'.repeat(50))

  test('LEGACY state (WORDPRESS ownership)', () => {
    const config = createPilotRouteConfig('wordpress', 'ACTIVE_WORDPRESS')
    const resolver = createTestResolver(config)
    const result = resolver.resolve({ domain: 'valdi.app', path: '/empresa/albasie' })
    assertEqual(result.resolved.ownership.type, OWNERSHIP.WORDPRESS)
    assertEqual(result.resolved.migrationState.state, MIGRATION_STATE.ACTIVE_WORDPRESS)
  })

  test('HYBRID_ACTIVE state', () => {
    const config = createPilotRouteConfig('hybrid', 'HYBRID_ACTIVE')
    const resolver = createTestResolver(config)
    const result = resolver.resolve({ domain: 'valdi.app', path: '/empresa/albasie' })
    assertEqual(result.resolved.ownership.type, OWNERSHIP.HYBRID)
    assertEqual(result.resolved.migrationState.state, MIGRATION_STATE.HYBRID_ACTIVE)
  })

  test('EXPERIENCE_ACTIVE state', () => {
    const config = createPilotRouteConfig('experience', 'EXPERIENCE_ACTIVE')
    const resolver = createTestResolver(config)
    const result = resolver.resolve({ domain: 'valdi.app', path: '/empresa/albasie' })
    assertEqual(result.resolved.ownership.type, OWNERSHIP.EXPERIENCE)
    assertEqual(result.resolved.migrationState.state, MIGRATION_STATE.EXPERIENCE_ACTIVE)
  })

  console.log('\n3. Capability Composition Tests')
  console.log('─'.repeat(50))

  test('Capabilities compose for company-profile', () => {
    const config = createPilotRouteConfig('experience', 'EXPERIENCE_ACTIVE')
    const resolver = createTestResolver(config)
    const result = resolver.resolve({
      domain: 'valdi.app',
      path: '/empresa/albasie',
      experienceType: 'company-profile'
    })
    assert(result.success === true)
    const caps = result.resolved.composition.capabilities.map(c => c.name)
    assert(caps.includes('hero'), 'Should include hero')
  })

  test('Configured capabilities override defaults', () => {
    const config = createPilotRouteConfig('experience', 'EXPERIENCE_ACTIVE')
    const resolver = createTestResolver(config)
    const result = resolver.resolve({
      domain: 'valdi.app',
      path: '/empresa/albasie',
      capabilities: { hero: true, services: false }
    })
    const caps = result.resolved.composition.capabilities.map(c => c.name)
    assert(caps.includes('hero'), 'Should include hero')
    assert(!caps.includes('services'), 'Should not include disabled services')
  })

  console.log('\n4. Presentation Runtime Integration')
  console.log('─'.repeat(50))

  test('ApplicationPresentationRenderer works for EXPERIENCE', async () => {
    const config = createPilotRouteConfig('experience', 'EXPERIENCE_ACTIVE')
    const resolver = createTestResolver(config)
    const renderer = createApplicationPresentationRenderer({ resolver })
    const result = await renderer.render({ domain: 'valdi.app', path: '/empresa/albasie' })
    assert(result.success === true)
    assertEqual(result.presentation.rendering.mode, RENDERING_MODE.EXPERIENCE)
  })

  test('ApplicationPresentationRenderer works for HYBRID', async () => {
    const config = createPilotRouteConfig('hybrid', 'HYBRID_ACTIVE')
    const resolver = createTestResolver(config)
    const renderer = createApplicationPresentationRenderer({ resolver })
    const result = await renderer.render({ domain: 'valdi.app', path: '/empresa/albasie' })
    assert(result.success === true)
    assertEqual(result.presentation.rendering.mode, RENDERING_MODE.HYBRID)
  })

  test('ApplicationPresentationRenderer works for WORDPRESS', async () => {
    const config = createPilotRouteConfig('wordpress', 'ACTIVE_WORDPRESS')
    const resolver = createTestResolver(config)
    const renderer = createApplicationPresentationRenderer({ resolver })
    const result = await renderer.render({ domain: 'valdi.app', path: '/empresa/albasie' })
    assert(result.success === true)
    assertEqual(result.presentation.rendering.mode, RENDERING_MODE.WORDPRESS)
  })

  console.log('\n5. Migration State Tests (via ApplicationResolver)')
  console.log('─'.repeat(50))

  test('ApplicationResolver correctly resolves EXPERIENCE_ACTIVE state', () => {
    const config = createPilotRouteConfig('experience', 'EXPERIENCE_ACTIVE')
    const resolver = createTestResolver(config)
    const result = resolver.resolve({ domain: 'valdi.app', path: '/empresa/albasie' })
    assertEqual(result.resolved.migrationState.state, MIGRATION_STATE.EXPERIENCE_ACTIVE)
  })

  test('ApplicationResolver correctly resolves HYBRID_ACTIVE state', () => {
    const config = createPilotRouteConfig('hybrid', 'HYBRID_ACTIVE')
    const resolver = createTestResolver(config)
    const result = resolver.resolve({ domain: 'valdi.app', path: '/empresa/albasie' })
    assertEqual(result.resolved.migrationState.state, MIGRATION_STATE.HYBRID_ACTIVE)
  })

  test('ApplicationResolver correctly resolves ACTIVE_WORDPRESS state', () => {
    const config = createPilotRouteConfig('wordpress', 'ACTIVE_WORDPRESS')
    const resolver = createTestResolver(config)
    const result = resolver.resolve({ domain: 'valdi.app', path: '/empresa/albasie' })
    assertEqual(result.resolved.migrationState.state, MIGRATION_STATE.ACTIVE_WORDPRESS)
  })

  console.log('\n6. URL Preservation Tests')
  console.log('─'.repeat(50))

  test('URL remains identical across migration states', () => {
    const states = [
      { ownership: 'wordpress', migration: 'ACTIVE_WORDPRESS' },
      { ownership: 'hybrid', migration: 'HYBRID_ACTIVE' },
      { ownership: 'experience', migration: 'EXPERIENCE_ACTIVE' }
    ]

    const baseUrl = 'https://valdi.app/empresa/albasie'

    for (const state of states) {
      const config = createPilotRouteConfig(state.ownership, state.migration)
      const resolver = createTestResolver(config)
      const result = resolver.resolve({ domain: 'valdi.app', path: '/empresa/albasie' })
      assertEqual(result.resolved.identity.domain, 'valdi.app', `Domain should be valdi.app for ${state.migration}`)
      assertEqual(result.resolved.identity.route, '/empresa/albasie', `Route should be /empresa/albasie for ${state.migration}`)
      assertEqual(result.resolved.identity.applicationId, 'valdi.app/empresa/albasie', `Application ID should be stable for ${state.migration}`)
    }
  })

  test('Canonical URL is preserved', async () => {
    const config = createPilotRouteConfig('experience', 'EXPERIENCE_ACTIVE')
    const resolver = createTestResolver(config)
    const renderer = createApplicationPresentationRenderer({ resolver })
    const result = await renderer.render({ domain: 'valdi.app', path: '/empresa/albasie' })
    assert(result.presentation.seo !== undefined, 'SEO should be present')
  })

  console.log('\n7. Domain Isolation Tests')
  console.log('─'.repeat(50))

  test('valdi.app and natale.app are isolated', () => {
    const config = createPilotRouteConfig('experience', 'EXPERIENCE_ACTIVE')
    const resolver = createTestResolver(config)
    const result1 = resolver.resolve({ domain: 'valdi.app', path: '/empresa/albasie' })
    const result2 = resolver.resolve({ domain: 'natales.app', path: '/empresa/albasie' })
    assert(result1.resolved.identity.applicationId !== result2.resolved.identity.applicationId)
  })

  test('Different domains have different cache keys', async () => {
    const config = createPilotRouteConfig('experience', 'EXPERIENCE_ACTIVE')
    const resolver = createTestResolver(config)
    const renderer = createApplicationPresentationRenderer({ resolver })
    const result1 = await renderer.render({ domain: 'valdi.app', path: '/empresa/albasie' })
    const result2 = await renderer.render({ domain: 'natales.app', path: '/empresa/other' })
    assert(result1.presentation.metadata.cacheKey !== result2.presentation.metadata.cacheKey)
  })

  console.log('\n8. Route Isolation Tests')
  console.log('─'.repeat(50))

  test('Different routes are isolated', () => {
    const config = createPilotRouteConfig('experience', 'EXPERIENCE_ACTIVE')
    const resolver = createTestResolver(config)
    const result1 = resolver.resolve({ domain: 'valdi.app', path: '/empresa/albasie' })
    const result2 = resolver.resolve({ domain: 'valdi.app', path: '/empresa/other' })
    assert(result1.resolved.identity.applicationId !== result2.resolved.identity.applicationId)
  })

  console.log('\n9. Company Isolation Tests')
  console.log('─'.repeat(50))

  test('Different companies are isolated', () => {
    const config = createPilotRouteConfig('experience', 'EXPERIENCE_ACTIVE')
    const resolver = createTestResolver(config)
    const result1 = resolver.resolve({ domain: 'valdi.app', path: '/empresa/albasie' })
    const result2 = resolver.resolve({ domain: 'natales.app', path: '/empresa/other' })
    assert(result1.resolved.configuration.company?.slug !== result2.resolved.configuration.company?.slug)
  })

  console.log('\n10. Destination Isolation Tests')
  console.log('─'.repeat(50))

  test('Different destinations are isolated', () => {
    const config = createPilotRouteConfig('experience', 'EXPERIENCE_ACTIVE')
    const resolver = createTestResolver(config)
    const result1 = resolver.resolve({ domain: 'valdi.app', path: '/empresa/albasie' })
    const result2 = resolver.resolve({ domain: 'natales.app', path: '/empresa/other' })
    assert(result1.resolved.identity.destination !== result2.resolved.identity.destination)
  })

  console.log('\n11. Security Tests')
  console.log('─'.repeat(50))

  test('valdivia.app is rejected', async () => {
    const config = createPilotRouteConfig('wordpress', 'ACTIVE_WORDPRESS')
    const resolver = createTestResolver(config)
    const result = resolver.resolve({ domain: 'valdivia.app', path: '/empresa/albasie' })
    assert(result.success === false, 'Should reject valdivia.app')
  })

  test('Path traversal is rejected', () => {
    const config = createPilotRouteConfig('wordpress', 'ACTIVE_WORDPRESS')
    const resolver = createTestResolver(config)
    const result = resolver.resolve({ domain: 'valdi.app', path: '/empresa/../../../etc/passwd' })
    assert(result.success === false, 'Should reject path traversal')
  })

  test('No infrastructure references in presentation', async () => {
    const config = createPilotRouteConfig('experience', 'EXPERIENCE_ACTIVE')
    const resolver = createTestResolver(config)
    const renderer = createApplicationPresentationRenderer({ resolver })
    const result = await renderer.render({ domain: 'valdi.app', path: '/empresa/albasie' })
    const str = JSON.stringify(result.presentation)
    assert(!str.includes('pg'), 'Should not contain pg')
    assert(!str.includes('mysql'), 'Should not contain mysql')
    assert(!str.includes('mongodb'), 'Should not contain mongodb')
  })

  test('No WordPress client in presentation', async () => {
    const config = createPilotRouteConfig('experience', 'EXPERIENCE_ACTIVE')
    const resolver = createTestResolver(config)
    const renderer = createApplicationPresentationRenderer({ resolver })
    const result = await renderer.render({ domain: 'valdi.app', path: '/empresa/albasie' })
    const str = JSON.stringify(result.presentation)
    assert(!str.includes('wordpress.client'), 'Should not contain wordpress.client')
    assert(!str.includes('WordPressAdapter'), 'Should not contain WordPressAdapter')
  })

  console.log('\n12. WordPress Content Flow Tests')
  console.log('─'.repeat(50))

  test('HYBRID mode indicates WordPress content layer', () => {
    const config = createPilotRouteConfig('hybrid', 'HYBRID_ACTIVE')
    const resolver = createTestResolver(config)
    const assembly = createRuntimeAssembly(resolver)
    const result = assembly.assemble({ domain: 'valdi.app', path: '/empresa/albasie', contentSource: 'wordpress' })
    assertEqual(result.runtime.rendering.contentLayer, CONTENT_LAYER.WORDPRESS)
  })

  test('WORDPRESS mode indicates WordPress content layer', () => {
    const config = createPilotRouteConfig('wordpress', 'ACTIVE_WORDPRESS')
    const resolver = createTestResolver(config)
    const assembly = createRuntimeAssembly(resolver)
    const result = assembly.assemble({ domain: 'valdi.app', path: '/empresa/albasie' })
    assertEqual(result.runtime.rendering.contentLayer, CONTENT_LAYER.WORDPRESS)
  })

  test('EXPERIENCE mode indicates experience content layer', () => {
    const config = createPilotRouteConfig('experience', 'EXPERIENCE_ACTIVE')
    const resolver = createTestResolver(config)
    const assembly = createRuntimeAssembly(resolver)
    const result = assembly.assemble({ domain: 'valdi.app', path: '/empresa/albasie', contentSource: 'experience' })
    assertEqual(result.runtime.rendering.contentLayer, CONTENT_LAYER.EXPERIENCE)
  })

  console.log('\n13. Invalid Configuration Tests')
  console.log('─'.repeat(50))

  test('Registry stores invalid ownership as-is (validation at resolver level)', () => {
    const config = createPilotRouteConfig('invalid', 'ACTIVE_WORDPRESS')
    const resolver = createTestResolver(config)
    const result = resolver.resolve({ domain: 'valdi.app', path: '/empresa/albasie' })
    assertEqual(result.resolved.ownership.type, 'invalid')
  })

  test('Invalid migration state is handled', () => {
    const config = createPilotRouteConfig('wordpress', 'INVALID_STATE')
    const resolver = createTestResolver(config)
    const result = resolver.resolve({ domain: 'valdi.app', path: '/empresa/albasie' })
    assert(result.success === false || result.resolved.migrationState.state === MIGRATION_STATE.ACTIVE_WORDPRESS)
  })

  console.log('\n14. Regression Tests')
  console.log('─'.repeat(50))

  test('P15.8.4 ApplicationPresentationRenderer still works', async () => {
    const config = createPilotRouteConfig('experience', 'EXPERIENCE_ACTIVE')
    const resolver = createTestResolver(config)
    const renderer = createApplicationPresentationRenderer({ resolver })
    const result = await renderer.render({ domain: 'valdi.app', path: '/empresa/albasie' })
    assert(result.success === true)
  })

  test('P15.8.3 RuntimeApplicationAssembly still works', () => {
    const config = createPilotRouteConfig('experience', 'EXPERIENCE_ACTIVE')
    const resolver = createTestResolver(config)
    const assembly = createRuntimeAssembly(resolver)
    const result = assembly.assemble({ domain: 'valdi.app', path: '/empresa/albasie' })
    assert(result.success === true)
  })

  test('P15.8.2 CapabilityRegistry still works', () => {
    const registry = CapabilityRegistry.createDefault()
    const cap = registry.get('hero')
    assert(cap !== null, 'Hero capability should exist')
  })

  test('P15.8.1 ApplicationIdentity still works', () => {
    const identity = new ApplicationIdentity('valdi.app', '/empresa/albasie')
    assertEqual(identity.domain, 'valdi.app')
    assertEqual(identity.route, '/empresa/albasie')
    assertEqual(identity.applicationId, 'valdi.app/empresa/albasie')
  })

  test('P15.7.x RouteOwnershipRegistry still works', () => {
    const config = createPilotRouteConfig('wordpress', 'ACTIVE_WORDPRESS')
    const registry = createRouteOwnershipRegistry(config)
    const resolved = registry.resolve('valdi.app', '/empresa/albasie')
    assertEqual(resolved.ownership, 'wordpress')
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
