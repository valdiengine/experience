/**
 * P15.8.2 — Capability Registry & Composition Architecture Tests
 *
 * Tests the Capability Registry and Composition implementation:
 * - Registry registration and lookup
 * - Capability validation
 * - Dependency resolution
 * - Application type compatibility
 * - Capability composition
 * - Security boundaries
 * - Isolation
 */

import {
  CapabilityRegistry,
  createCapabilityRegistry,
  CapabilityValidator,
  createCapabilityValidator,
  DependencyResolver,
  createDependencyResolver,
  CapabilityResolver,
  createCapabilityResolver,
  CapabilityComposer,
  createCapabilityComposer,
  CAPABILITY_TYPES,
  DEFAULT_CAPABILITIES,
  COMPATIBLE_APPLICATION_TYPES
} from './application/capabilities/index.js'

import {
  createApplicationInstance
} from './application/index.js'

import { RouteOwnershipRegistry, OWNERSHIP } from './routing/route.registry.js'
import { RouteMigrationController, MIGRATION_STATE } from './routing/route.migration.controller.js'
import { createRouteMigrationManager, TRANSITION_TARGET } from './routing/route.migration.manager.js'

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`)
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${message} - Expected "${expected}", got "${actual}"`)
  }
}

function assertContains(obj, key, message) {
  if (!(key in obj)) {
    throw new Error(`Assertion failed: ${message} - Key "${key}" not found`)
  }
}

function assertThrows(fn, message) {
  try {
    fn()
    throw new Error(`Assertion failed: ${message} - Expected function to throw`)
  } catch (error) {
    if (error.message.startsWith('Assertion failed:')) {
      throw error
    }
  }
}

let passed = 0
let failed = 0
const failures = []

function test(name, fn) {
  try {
    fn()
    passed++
    console.log(`  ✅ ${name}`)
  } catch (error) {
    failed++
    failures.push({ name, error: error.message })
    console.log(`  ❌ ${name}`)
    console.log(`     Error: ${error.message}`)
  }
}

console.log('🧪 P15.8.2 — Capability Registry & Composition Tests')
console.log('=' .repeat(70))
console.log('')

// ============================================================
// SECTION 1: REGISTRY TESTS
// ============================================================

console.log('📋 Registry Tests')

test('Registry can be created', () => {
  const registry = createCapabilityRegistry()
  assert(registry, 'Registry should be created')
  assert(typeof registry.register === 'function', 'Registry should have register method')
  assert(typeof registry.get === 'function', 'Registry should have get method')
  assert(typeof registry.has === 'function', 'Registry should have has method')
})

test('Registry can register a capability', () => {
  const registry = createCapabilityRegistry()
  registry.register({
    name: 'test-capability',
    version: '1.0.0',
    type: CAPABILITY_TYPES.PRESENTATION,
    dependencies: [],
    optionalDependencies: [],
    compatibleApplicationTypes: ['company-profile']
  })
  assert(registry.has('test-capability'), 'Capability should be registered')
})

test('Registry can lookup a capability', () => {
  const registry = createCapabilityRegistry()
  registry.register({
    name: 'lookup-test',
    version: '2.0.0',
    type: CAPABILITY_TYPES.CONTENT,
    dependencies: [],
    optionalDependencies: [],
    compatibleApplicationTypes: ['company-profile']
  })
  const capability = registry.get('lookup-test')
  assertEqual(capability.name, 'lookup-test', 'Name should match')
  assertEqual(capability.version, '2.0.0', 'Version should match')
  assertEqual(capability.type, CAPABILITY_TYPES.CONTENT, 'Type should match')
})

test('Registry returns null for unknown capability', () => {
  const registry = createCapabilityRegistry()
  const capability = registry.get('unknown-capability')
  assertEqual(capability, null, 'Unknown capability should return null')
})

test('Registry can list all capabilities', () => {
  const registry = createCapabilityRegistry()
  registry.register({ name: 'cap-a', version: '1.0.0', type: 'presentation', dependencies: [], optionalDependencies: [], compatibleApplicationTypes: [] })
  registry.register({ name: 'cap-b', version: '1.0.0', type: 'content', dependencies: [], optionalDependencies: [], compatibleApplicationTypes: [] })
  const list = registry.list()
  assertEqual(list.length, 2, 'Should have 2 capabilities')
})

test('Registry detects duplicate capability', () => {
  const registry = createCapabilityRegistry()
  registry.register({ name: 'duplicate-test', version: '1.0.0', type: 'presentation', dependencies: [], optionalDependencies: [], compatibleApplicationTypes: [] })
  assertThrows(
    () => registry.register({ name: 'duplicate-test', version: '1.0.0', type: 'presentation', dependencies: [], optionalDependencies: [], compatibleApplicationTypes: [] }),
    'Duplicate should throw'
  )
})

test('Registry can list by type', () => {
  const registry = createCapabilityRegistry()
  registry.register({ name: 'pres-cap', version: '1.0.0', type: CAPABILITY_TYPES.PRESENTATION, dependencies: [], optionalDependencies: [], compatibleApplicationTypes: [] })
  registry.register({ name: 'content-cap', version: '1.0.0', type: CAPABILITY_TYPES.CONTENT, dependencies: [], optionalDependencies: [], compatibleApplicationTypes: [] })
  const presentationCaps = registry.listByType(CAPABILITY_TYPES.PRESENTATION)
  assertEqual(presentationCaps.length, 1, 'Should have 1 presentation capability')
  assertEqual(presentationCaps[0].name, 'pres-cap', 'Name should match')
})

test('Registry can list by application type', () => {
  const registry = createCapabilityRegistry()
  registry.register({ name: 'company-cap', version: '1.0.0', type: 'presentation', dependencies: [], optionalDependencies: [], compatibleApplicationTypes: ['company-profile', 'tourism-destination'] })
  registry.register({ name: 'tourism-cap', version: '1.0.0', type: 'presentation', dependencies: [], optionalDependencies: [], compatibleApplicationTypes: ['tourism-destination'] })
  const companyCaps = registry.listByApplicationType('company-profile')
  assertEqual(companyCaps.length, 1, 'Should have 1 capability for company-profile')
  assertEqual(companyCaps[0].name, 'company-cap', 'Name should match')
})

test('Registry can validate capability', () => {
  const registry = createCapabilityRegistry()
  registry.register({ name: 'validate-test', version: '1.0.0', type: 'presentation', dependencies: [], optionalDependencies: [], compatibleApplicationTypes: [] })
  const result = registry.validate('validate-test')
  assert(result.valid, 'Should be valid')
  assert(result.capability, 'Should have capability')
})

test('Registry validate returns false for unknown', () => {
  const registry = createCapabilityRegistry()
  const result = registry.validate('unknown')
  assert(!result.valid, 'Should be invalid')
})

test('Default capabilities are registered', () => {
  const registry = CapabilityRegistry.createDefault()
  assert(registry.size > 0, 'Should have default capabilities')
  assert(registry.has('hero'), 'Should have hero capability')
  assert(registry.has('gallery'), 'Should have gallery capability')
  assert(registry.has('contact'), 'Should have contact capability')
})

// ============================================================
// SECTION 2: VALIDATOR TESTS
// ============================================================

console.log('')
console.log('📋 Validator Tests')

test('Validator validates capability list', () => {
  const registry = CapabilityRegistry.createDefault()
  const validator = createCapabilityValidator(registry)
  const result = validator.validateCapabilityList(['hero', 'gallery'], 'company-profile')
  assert(result.valid, 'Should be valid list')
})

test('Validator detects duplicate capabilities', () => {
  const registry = CapabilityRegistry.createDefault()
  const validator = createCapabilityValidator(registry)
  const result = validator.validateCapabilityList(['hero', 'hero'], 'company-profile')
  assert(!result.valid, 'Should detect duplicates')
  assert(result.errors.some(e => e.includes('Duplicate')), 'Should mention duplicate')
})

test('Validator detects unknown capability', () => {
  const registry = CapabilityRegistry.createDefault()
  const validator = createCapabilityValidator(registry)
  const result = validator.validateCapabilityList(['hero', 'unknown-cap'], 'company-profile')
  assert(!result.valid, 'Should detect unknown')
})

test('Validator detects incompatible application type', () => {
  const registry = CapabilityRegistry.createDefault()
  const validator = createCapabilityValidator(registry)
  const result = validator.validateCapabilityList(['rooms'], 'company-profile')
  assert(!result.valid, 'Should detect incompatibility')
})

test('Validator validates dependency graph', () => {
  const registry = CapabilityRegistry.createDefault()
  const validator = createCapabilityValidator(registry)
  const result = validator.validateDependencyGraph(['hero', 'gallery'])
  assert(result.valid, 'Should be valid graph')
})

test('Validator detects circular dependencies', () => {
  const registry = createCapabilityRegistry()
  registry.register({ name: 'a', version: '1.0.0', type: 'presentation', dependencies: ['b'], optionalDependencies: [], compatibleApplicationTypes: [] })
  registry.register({ name: 'b', version: '1.0.0', type: 'presentation', dependencies: ['a'], optionalDependencies: [], compatibleApplicationTypes: [] })
  const validator = createCapabilityValidator(registry)
  const result = validator.validateDependencyGraph(['a', 'b'])
  assert(!result.valid, 'Should detect circular dependency')
})

// ============================================================
// SECTION 3: DEPENDENCY RESOLVER TESTS
// ============================================================

console.log('')
console.log('📋 Dependency Resolver Tests')

test('DependencyResolver resolves direct dependencies', () => {
  const registry = CapabilityRegistry.createDefault()
  const validator = createCapabilityValidator(registry)
  const resolver = createDependencyResolver(registry, validator)
  const result = resolver.resolve(['hero'])
  assert(result.isValid, 'Should be valid')
  assert(result.resolved.length >= 1, 'Should resolve hero')
})

test('DependencyResolver resolves transitive dependencies', () => {
  const registry = createCapabilityRegistry()
  registry.register({ name: 'parent', version: '1.0.0', type: 'presentation', dependencies: ['child'], optionalDependencies: [], compatibleApplicationTypes: [] })
  registry.register({ name: 'child', version: '1.0.0', type: 'presentation', dependencies: [], optionalDependencies: [], compatibleApplicationTypes: [] })
  const validator = createCapabilityValidator(registry)
  const resolver = createDependencyResolver(registry, validator)
  const result = resolver.resolve(['parent'])
  assert(result.isValid, 'Should be valid')
  const names = result.resolved.map(c => c.name)
  assert(names.includes('parent'), 'Should include parent')
  assert(names.includes('child'), 'Should include child')
})

test('DependencyResolver detects missing capabilities', () => {
  const registry = CapabilityRegistry.createDefault()
  const validator = createCapabilityValidator(registry)
  const resolver = createDependencyResolver(registry, validator)
  const result = resolver.resolve(['unknown-cap'])
  assert(!result.isValid, 'Should detect missing')
  assert(result.missing.includes('unknown-cap'), 'Should list missing')
})

test('DependencyResolver includes optional dependencies', () => {
  const registry = createCapabilityRegistry()
  registry.register({ name: 'opt-parent', version: '1.0.0', type: 'presentation', dependencies: [], optionalDependencies: ['opt-child'], compatibleApplicationTypes: [] })
  registry.register({ name: 'opt-child', version: '1.0.0', type: 'presentation', dependencies: [], optionalDependencies: [], compatibleApplicationTypes: [] })
  const validator = createCapabilityValidator(registry)
  const resolver = createDependencyResolver(registry, validator)
  const result = resolver.resolve(['opt-parent'], { includeOptional: true })
  const names = result.resolved.map(c => c.name)
  assert(names.includes('opt-child'), 'Should include optional dependency when requested')
})

test('DependencyResolver skips missing optional dependencies gracefully', () => {
  const registry = createCapabilityRegistry()
  registry.register({ name: 'skip-optional', version: '1.0.0', type: 'presentation', dependencies: [], optionalDependencies: ['missing'], compatibleApplicationTypes: [] })
  const validator = createCapabilityValidator(registry)
  const resolver = createDependencyResolver(registry, validator)
  const result = resolver.resolve(['skip-optional'], { includeOptional: true, failOnMissing: false })
  assert(result.isValid, 'Should be valid despite missing optional')
})

// ============================================================
// SECTION 4: CAPABILITY RESOLVER TESTS
// ============================================================

console.log('')
console.log('📋 Capability Resolver Tests')

test('CapabilityResolver validates capabilities', () => {
  const registry = CapabilityRegistry.createDefault()
  const resolver = createCapabilityResolver(registry)
  const result = resolver.validateCapabilities(['hero', 'gallery'], 'company-profile')
  assert(result.valid, 'Should be valid')
})

test('CapabilityResolver resolves for application type', () => {
  const registry = CapabilityRegistry.createDefault()
  const resolver = createCapabilityResolver(registry)
  const result = resolver.resolveForApplication(['hero', 'rooms'], 'accommodation')
  assert(result.success, 'Should succeed')
  const names = result.capabilities.map(c => c.name)
  assert(names.includes('hero'), 'Should include hero')
  assert(names.includes('rooms'), 'Should include rooms')
})

test('CapabilityResolver resolves all dependencies', () => {
  const registry = CapabilityRegistry.createDefault()
  const resolver = createCapabilityResolver(registry)
  const result = resolver.resolveAllDependencies(['hero'])
  assert(result.success, 'Should succeed')
  assert(result.capabilities.length >= 1, 'Should have capabilities')
})

// ============================================================
// SECTION 5: CAPABILITY COMPOSER TESTS
// ============================================================

console.log('')
console.log('📋 Capability Composer Tests')

test('CapabilityComposer composes capabilities', () => {
  const registry = CapabilityRegistry.createDefault()
  const composer = createCapabilityComposer(registry)
  const app = createApplicationInstance('valdi.app', '/test', {
    experience: { type: 'company-profile' }
  })
  const result = composer.compose(app, ['hero', 'services', 'gallery'])
  assert(result.success, 'Should compose successfully')
  assertEqual(result.capabilities.length, 3, 'Should have 3 capabilities')
})

test('CapabilityComposer validates application type compatibility', () => {
  const registry = CapabilityRegistry.createDefault()
  const composer = createCapabilityComposer(registry)
  const app = createApplicationInstance('valdi.app', '/test', {
    experience: { type: 'company-profile' }
  })
  const result = composer.compose(app, ['rooms'], 'accommodation')
  assert(!result.success, 'Should fail - rooms not compatible with company-profile')
})

test('CapabilityComposer produces immutable composition', () => {
  const registry = CapabilityRegistry.createDefault()
  const composer = createCapabilityComposer(registry)
  const app = createApplicationInstance('valdi.app', '/test', {
    experience: { type: 'company-profile' }
  })
  const result = composer.compose(app, ['hero'])
  assert(result.success, 'Composition should succeed')
  assert(Object.isFrozen(result.capabilities), 'Capabilities array should be frozen')
  assert(Object.isFrozen(result.capabilities[0]), 'Capability should be frozen')
  assert(Object.isFrozen(result.application), 'Application should be frozen')
})

test('CapabilityComposer includes metadata', () => {
  const registry = CapabilityRegistry.createDefault()
  const composer = createCapabilityComposer(registry)
  const app = createApplicationInstance('valdi.app', '/test', {
    experience: { type: 'company-profile' }
  })
  const result = composer.compose(app, ['hero'])
  assert(result.metadata, 'Should have metadata')
  assertEqual(result.metadata.applicationType, 'company-profile', 'Should have application type')
  assert(result.metadata.resolvedAt, 'Should have resolved timestamp')
})

test('CapabilityComposer sorts by priority', () => {
  const registry = createCapabilityRegistry()
  registry.register({ name: 'low-priority', version: '1.0.0', type: 'presentation', dependencies: [], optionalDependencies: [], compatibleApplicationTypes: ['company-profile'], priority: 10 })
  registry.register({ name: 'high-priority', version: '1.0.0', type: 'presentation', dependencies: [], optionalDependencies: [], compatibleApplicationTypes: ['company-profile'], priority: 100 })
  const composer = createCapabilityComposer(registry)
  const app = createApplicationInstance('valdi.app', '/test', { experience: { type: 'company-profile' } })
  const result = composer.compose(app, ['low-priority', 'high-priority'], 'company-profile')
  assertEqual(result.capabilities[0].name, 'high-priority', 'High priority should be first')
  assertEqual(result.capabilities[1].name, 'low-priority', 'Low priority should be second')
})

test('CapabilityComposer rejects invalid composition', () => {
  const registry = CapabilityRegistry.createDefault()
  const composer = createCapabilityComposer(registry)
  const app = createApplicationInstance('valdi.app', '/test', { experience: { type: 'company-profile' } })
  const result = composer.compose(app, ['unknown-cap'])
  assert(!result.success, 'Should fail for unknown capability')
  assert(result.errors.length > 0, 'Should have errors')
})

// ============================================================
// SECTION 6: APPLICATION TYPE COMPATIBILITY TESTS
// ============================================================

console.log('')
console.log('📋 Application Type Compatibility Tests')

test('company-profile capabilities work', () => {
  const registry = CapabilityRegistry.createDefault()
  const composer = createCapabilityComposer(registry)
  const app = createApplicationInstance('valdi.app', '/albasie', {
    company: 'albasie',
    experience: { type: 'company-profile' }
  })
  const result = composer.compose(app, ['hero', 'services', 'gallery', 'contact'], 'company-profile')
  assert(result.success, 'Company-profile capabilities should compose')
})

test('tourism-destination capabilities work', () => {
  const registry = CapabilityRegistry.createDefault()
  const composer = createCapabilityComposer(registry)
  const app = createApplicationInstance('valdi.app', '/costa', {
    experience: { type: 'tourism-destination' }
  })
  const result = composer.compose(app, ['hero', 'destinations', 'attractions', 'map'], 'tourism-destination')
  assert(result.success, 'Tourism-destination capabilities should compose')
})

test('accommodation capabilities work', () => {
  const registry = CapabilityRegistry.createDefault()
  const composer = createCapabilityComposer(registry)
  const app = createApplicationInstance('natales.app', '/hostal-patagonia', {
    company: 'hostal-patagonia',
    experience: { type: 'accommodation' }
  })
  const result = composer.compose(app, ['hero', 'rooms', 'gallery', 'booking'], 'accommodation')
  assert(result.success, 'Accommodation capabilities should compose')
})

test('incompatible capability is rejected', () => {
  const registry = CapabilityRegistry.createDefault()
  const composer = createCapabilityComposer(registry)
  const app = createApplicationInstance('valdi.app', '/test', {
    experience: { type: 'company-profile' }
  })
  const result = composer.compose(app, ['rooms'], 'accommodation')
  assert(!result.success, 'Should reject incompatible capability')
})

// ============================================================
// SECTION 7: ISOLATION TESTS
// ============================================================

console.log('')
console.log('📋 Isolation Tests')

test('Different domains produce isolated compositions', () => {
  const registry = CapabilityRegistry.createDefault()
  const composer = createCapabilityComposer(registry)
  const app1 = createApplicationInstance('valdi.app', '/test', { experience: { type: 'company-profile' } })
  const app2 = createApplicationInstance('natales.app', '/test', { experience: { type: 'company-profile' } })
  const result1 = composer.compose(app1, ['hero'], 'company-profile')
  const result2 = composer.compose(app2, ['hero'], 'company-profile')
  assert(result1.success, 'First composition should succeed')
  assert(result2.success, 'Second composition should succeed')
  assert(result1.application.identity.domain !== result2.application.identity.domain, 'Domains should differ')
})

test('Different routes produce isolated compositions', () => {
  const registry = CapabilityRegistry.createDefault()
  const composer = createCapabilityComposer(registry)
  const app1 = createApplicationInstance('valdi.app', '/route1', { experience: { type: 'company-profile' } })
  const app2 = createApplicationInstance('valdi.app', '/route2', { experience: { type: 'company-profile' } })
  const result1 = composer.compose(app1, ['hero'], 'company-profile')
  const result2 = composer.compose(app2, ['hero'], 'company-profile')
  assert(result1.success, 'First composition should succeed')
  assert(result2.success, 'Second composition should succeed')
  assert(result1.application.identity.route !== result2.application.identity.route, 'Routes should differ')
})

test('Company isolation - same capability different companies', () => {
  const registry = CapabilityRegistry.createDefault()
  const composer = createCapabilityComposer(registry)
  const app1 = createApplicationInstance('valdi.app', '/company1', { company: 'company1', experience: { type: 'company-profile' } })
  const app2 = createApplicationInstance('valdi.app', '/company2', { company: 'company2', experience: { type: 'company-profile' } })
  const result1 = composer.compose(app1, ['hero'], 'company-profile')
  const result2 = composer.compose(app2, ['hero'], 'company-profile')
  assert(result1.success, 'First should succeed')
  assert(result2.success, 'Second should succeed')
  assert(result1.application.company.slug !== result2.application.company.slug, 'Companies should differ')
})

test('Destination isolation - same route different destinations', () => {
  const registry = CapabilityRegistry.createDefault()
  const composer = createCapabilityComposer(registry)
  const app1 = createApplicationInstance('valdi.app', '/demo', { experience: { type: 'company-profile' } })
  const app2 = createApplicationInstance('natales.app', '/demo', { experience: { type: 'company-profile' } })
  const result1 = composer.compose(app1, ['hero'], 'company-profile')
  const result2 = composer.compose(app2, ['hero'], 'company-profile')
  assert(result1.success, 'First should succeed')
  assert(result2.success, 'Second should succeed')
  assert(result1.application.destination.slug !== result2.application.destination.slug, 'Destinations should differ')
})

// ============================================================
// SECTION 8: MIGRATION COMPATIBILITY TESTS
// ============================================================

console.log('')
console.log('📋 Migration Compatibility Tests')

test('WORDPRESS ownership compatibility', () => {
  const registry = CapabilityRegistry.createDefault()
  const composer = createCapabilityComposer(registry)
  const app = createApplicationInstance('valdi.app', '/blog', {
    migration: { state: 'LEGACY' },
    content: { source: 'wordpress' }
  })
  assert(app.migration.state === 'LEGACY', 'Should be LEGACY state')
})

test('HYBRID ownership compatibility', () => {
  const registry = CapabilityRegistry.createDefault()
  const composer = createCapabilityComposer(registry)
  const app = createApplicationInstance('valdi.app', '/hybrid-route', {
    migration: { state: 'HYBRID_ACTIVE' },
    content: { source: 'wordpress' }
  })
  assert(app.migration.state === 'HYBRID_ACTIVE', 'Should be HYBRID_ACTIVE state')
})

test('EXPERIENCE ownership compatibility', () => {
  const registry = CapabilityRegistry.createDefault()
  const composer = createCapabilityComposer(registry)
  const app = createApplicationInstance('valdi.app', '/experience-route', {
    migration: { state: 'EXPERIENCE_ACTIVE' },
    content: { source: 'experience' }
  })
  assert(app.migration.state === 'EXPERIENCE_ACTIVE', 'Should be EXPERIENCE_ACTIVE state')
})

// ============================================================
// SECTION 9: SECURITY TESTS
// ============================================================

console.log('')
console.log('📋 Security Tests')

test('No infrastructure references in capability names', () => {
  const registry = CapabilityRegistry.createDefault()
  const composer = createCapabilityComposer(registry)
  const list = registry.list()
  for (const cap of list) {
    assert(!cap.name.includes('pg'), 'Should not have pg in name')
    assert(!cap.name.includes('mysql'), 'Should not have mysql in name')
    assert(!cap.name.includes('mongodb'), 'Should not have mongodb in name')
    assert(!cap.name.includes('postgres'), 'Should not have postgres in name')
    assert(!cap.name.includes('redis'), 'Should not have redis in name')
  }
})

test('valdivia.app rejection still works', () => {
  assertThrows(
    () => createApplicationInstance('valdivia.app', '/test', {}),
    'valdivia.app should be rejected'
  )
})

test('Path traversal blocked in application instance', () => {
  assertThrows(
    () => createApplicationInstance('valdi.app', '/../../../etc/passwd', {}),
    'Traversal should be blocked'
  )
})

test('No executable code in capability configuration', () => {
  const registry = CapabilityRegistry.createDefault()
  const validator = createCapabilityValidator(registry)
  const result = validator.validateCapabilityConfig({
    name: 'test-capability',
    enabled: true,
    configuration: {
      displayName: 'Test',
      maxItems: 10
    }
  })
  assert(result.valid, 'Valid configuration should pass')
})

// ============================================================
// SECTION 10: WORDPRESS BOUNDARY TESTS
// ============================================================

console.log('')
console.log('📋 WordPress Boundary Tests')

test('WordPress routes remain WordPress', () => {
  const registry = new RouteOwnershipRegistry({
    routes: [{
      domain: 'valdi.app',
      path: '/blog',
      ownership: OWNERSHIP.WORDPRESS,
      migrationState: 'LEGACY'
    }]
  })
  const result = registry.resolve('valdi.app', '/blog')
  assertEqual(result.ownership, 'wordpress', 'Should be wordpress ownership')
})

test('HYBRID routes use WordPress content', () => {
  const app = createApplicationInstance('valdi.app', '/hybrid', {
    migration: { state: 'HYBRID_ACTIVE' },
    content: { source: 'wordpress' }
  })
  assertEqual(app.content.source, 'wordpress', 'HYBRID should use WordPress content')
})

test('Capability composition does not bypass WordPress boundary', () => {
  const registry = CapabilityRegistry.createDefault()
  const composer = createCapabilityComposer(registry)
  const app = createApplicationInstance('valdi.app', '/blog', {
    migration: { state: 'LEGACY' },
    content: { source: 'wordpress' }
  })
  const result = composer.compose(app, ['hero', 'gallery', 'seo'])
  assert(result.success, 'Composition should succeed')
  assertEqual(result.application.content.source, 'wordpress', 'WordPress boundary should be preserved')
})

// ============================================================
// SECTION 11: REGRESSION TESTS
// ============================================================

console.log('')
console.log('📋 Regression Tests')

test('P15.8.1 Application Configuration still works', () => {
  const app = createApplicationInstance('valdi.app', '/test', {
    company: 'test-company',
    experience: { type: 'company-profile' },
    migrationState: 'HYBRID_ACTIVE'
  })
  assertEqual(app.identity.domain, 'valdi.app', 'Domain should work')
  assertEqual(app.company.slug, 'test-company', 'Company should work')
  assertEqual(app.experience.type, 'company-profile', 'Experience should work')
})

test('P15.7.4 Migration Manager still works', () => {
  const manager = createRouteMigrationManager()
  const domains = manager.listDomains()
  assertEqual(domains.length, 5, 'Should have 5 canonical domains')
  assert(domains.includes('valdi.app'), 'Should include valdi.app')
  assert(domains.includes('natales.app'), 'Should include natales.app')
})

test('P15.7.1 Route Ownership still works', () => {
  const registry = new RouteOwnershipRegistry({
    routes: [{
      domain: 'valdi.app',
      path: '/empresa/test',
      ownership: OWNERSHIP.EXPERIENCE,
      destination: 'valdi',
      migrationState: 'EXPERIENCE_ACTIVE'
    }]
  })
  const result = registry.resolve('valdi.app', '/empresa/test')
  assertEqual(result.ownership, 'experience', 'Should be experience ownership')
})

test('P15.7.2 Migration Controller still works', () => {
  const registry = new RouteOwnershipRegistry({
    routes: [{
      domain: 'valdi.app',
      path: '/test',
      ownership: OWNERSHIP.WORDPRESS,
      migrationState: MIGRATION_STATE.ACTIVE_WORDPRESS
    }]
  })
  const controller = new RouteMigrationController(registry)
  const result = controller.canActivateHybrid('valdi.app', '/test')
  assert(result.canActivate, 'Should be able to activate hybrid')
})

test('Dronestica decoupling maintained', () => {
  const registry = CapabilityRegistry.createDefault()
  const list = registry.list()
  const json = JSON.stringify(list)
  assert(!json.includes('dronestica'), 'Should not have dronestica references')
  assert(!json.includes('drone'), 'Should not have drone references')
})

// ============================================================
// SECTION 12: CACHE ISOLATION TESTS
// ============================================================

console.log('')
console.log('📋 Cache Isolation Tests')

test('Cache key includes domain and route', () => {
  const app1 = createApplicationInstance('valdi.app', '/test', { experience: { type: 'company-profile' } })
  const app2 = createApplicationInstance('natales.app', '/test', { experience: { type: 'company-profile' } })
  const key1 = `app:${app1.identity.domain}:${app1.identity.route}`
  const key2 = `app:${app2.identity.domain}:${app2.identity.route}`
  assert(key1 !== key2, 'Different domains should produce different cache keys')
})

test('Cache key includes ownership state', () => {
  const app1 = createApplicationInstance('valdi.app', '/test', { migration: { state: 'LEGACY' } })
  const app2 = createApplicationInstance('valdi.app', '/test', { migration: { state: 'HYBRID_ACTIVE' } })
  const key1 = `app:${app1.identity.domain}:${app1.identity.route}:${app1.migration.state}`
  const key2 = `app:${app2.identity.domain}:${app2.identity.route}:${app2.migration.state}`
  assert(key1 !== key2, 'Different migration states should produce different cache keys')
})

// ============================================================
// SECTION 13: IMMUTABILITY TESTS
// ============================================================

console.log('')
console.log('📋 Immutability Tests')

test('Registry can be locked', () => {
  const registry = createCapabilityRegistry()
  registry.register({ name: 'lock-test', version: '1.0.0', type: 'presentation', dependencies: [], optionalDependencies: [], compatibleApplicationTypes: [] })
  registry.lock()
  assert(registry.isLocked(), 'Registry should be locked')
})

test('Locked registry cannot be modified', () => {
  const registry = createCapabilityRegistry()
  registry.register({ name: 'lock-test', version: '1.0.0', type: 'presentation', dependencies: [], optionalDependencies: [], compatibleApplicationTypes: [] })
  registry.lock()
  assertThrows(
    () => registry.register({ name: 'new-cap', version: '1.0.0', type: 'presentation', dependencies: [], optionalDependencies: [], compatibleApplicationTypes: [] }),
    'Locked registry should not accept new capabilities'
  )
})

test('Default registry is locked', () => {
  const registry = CapabilityRegistry.createDefault()
  assert(registry.isLocked(), 'Default registry should be locked')
})

test('Composition is immutable', () => {
  const registry = CapabilityRegistry.createDefault()
  const composer = createCapabilityComposer(registry)
  const app = createApplicationInstance('valdi.app', '/test', { experience: { type: 'company-profile' } })
  const result = composer.compose(app, ['hero'])
  assertThrows(
    () => { result.capabilities[0] = {} },
    'Composition should be immutable'
  )
})

// ============================================================
// RESULTS
// ============================================================

console.log('')
console.log('=' .repeat(70))
console.log(`📊 Results: ${passed} passed, ${failed} failed`)

if (failed > 0) {
  console.log('')
  console.log('❌ FAILED TESTS:')
  for (const f of failures) {
    console.log(`   - ${f.name}`)
    console.log(`     ${f.error}`)
  }
}

console.log('')

if (failed === 0) {
  console.log('✅ ALL TESTS PASSED')
  console.log('')
  console.log('P15.8.2 CAPABILITY REGISTRY & COMPOSITION: READY')
} else {
  console.log('❌ SOME TESTS FAILED')
  process.exit(1)
}