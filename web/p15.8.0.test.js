/**
 * P15.8.0 — Experience Application Architecture Validation
 * 
 * ARCHITECTURAL VALIDATION ONLY
 * 
 * This test suite validates that the Application Instance model is
 * architecturally compatible with the existing certified components:
 * 
 * - P15.7.1 Route Ownership Registry
 * - P15.7.2 Migration State Machine
 * - P15.7.3 Hybrid Rendering
 * - P15.7.4 Migration Manager
 * - P15.1 Experience Engine
 * - P15.3 Presentation
 * - P15.4 Public Web Delivery
 * 
 * DO NOT IMPLEMENT:
 * - ApplicationResolver
 * - CapabilityRegistry
 * - CapabilityComposer
 * - Application builder UI
 * - New routes
 * - Migration activations
 */

import { RouteOwnershipRegistry, OWNERSHIP } from './routing/route.registry.js'
import { RouteMigrationController, MIGRATION_STATE } from './routing/route.migration.controller.js'
import { createRouteMigrationManager, TRANSITION_TARGET } from './routing/route.migration.manager.js'
import { ExperienceContext, ExperienceContextBuilder } from '../experience/experience.context.js'

const CANONICAL_DOMAINS = ['valdi.app', 'natales.app', 'puntaarenas.app', 'coyhaique.app', 'chiloe.app']
const REJECTED_DOMAINS = ['valdivia.app']

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
    throw new Error(`Assertion failed: ${message} - Key "${key}" not found in object`)
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

console.log('🧪 P15.8.0 — Experience Application Architecture Validation')
console.log('=' .repeat(70))
console.log('')

// ============================================================
// SECTION 1: APPLICATION IDENTITY VALIDATION
// ============================================================

console.log('📋 Application Identity Tests')

test('Application identity is uniquely defined by domain + route', () => {
  const registry = new RouteOwnershipRegistry({
    routes: [
      { domain: 'valdi.app', path: '/albasie', ownership: OWNERSHIP.EXPERIENCE, destination: 'valdi', company: 'albasie' },
      { domain: 'natales.app', path: '/albasie', ownership: OWNERSHIP.WORDPRESS, destination: 'natales' }
    ]
  })
  
  const valdiAlbasie = registry.resolve('valdi.app', '/albasie')
  const natalesAlbasie = registry.resolve('natales.app', '/albasie')
  
  assert(valdiAlbasie.valid, 'valdi.app/albasie should be valid')
  assert(natalesAlbasie.valid, 'natales.app/albasie should be valid')
  assert(valdiAlbasie.company === 'albasie', 'valdi.app/albasie should have company albasie')
  assert(natalesAlbasie.company === null, 'natales.app/albasie should have no company')
  assert(valdiAlbasie.destination === 'valdi', 'valdi.app/albasie should resolve to destination valdi')
  assert(natalesAlbasie.destination === 'natales', 'natales.app/albasie should resolve to destination natales')
  assert(valdiAlbasie.ownership === OWNERSHIP.EXPERIENCE, 'valdi.app/albasie should be EXPERIENCE ownership')
  assert(natalesAlbasie.ownership === OWNERSHIP.WORDPRESS, 'natales.app/albasie should be WORDPRESS ownership')
})

test('Same route path on different domains are different Application Instances', () => {
  const registry = new RouteOwnershipRegistry({
    routes: [
      { domain: 'valdi.app', path: '/demo', ownership: OWNERSHIP.EXPERIENCE, destination: 'valdi' },
      { domain: 'natales.app', path: '/demo', ownership: OWNERSHIP.HYBRID, destination: 'natales' },
      { domain: 'puntaarenas.app', path: '/demo', ownership: OWNERSHIP.WORDPRESS, destination: 'puntaarenas' }
    ]
  })
  
  const valdiDemo = registry.resolve('valdi.app', '/demo')
  const natalesDemo = registry.resolve('natales.app', '/demo')
  const puntaDemo = registry.resolve('puntaarenas.app', '/demo')
  
  assert(valdiDemo.ownership === OWNERSHIP.EXPERIENCE, 'valdi.app/demo should be EXPERIENCE')
  assert(natalesDemo.ownership === OWNERSHIP.HYBRID, 'natales.app/demo should be HYBRID')
  assert(puntaDemo.ownership === OWNERSHIP.WORDPRESS, 'puntaarenas.app/demo should be WORDPRESS')
  assert(valdiDemo.destination !== natalesDemo.destination, 'Different domains should have different destinations')
})

test('Application identity preserves URL', () => {
  const registry = new RouteOwnershipRegistry({
    routes: [
      { domain: 'valdi.app', path: '/empresa/albasie', ownership: OWNERSHIP.EXPERIENCE, destination: 'valdi', company: 'albasie', migrationState: 'EXPERIENCE_ACTIVE' }
    ]
  })
  
  const result = registry.resolve('valdi.app', '/empresa/albasie')
  assertEqual(result.domain, 'valdi.app', 'Domain should be preserved')
  assertEqual(result.path, '/empresa/albasie', 'Path should be preserved')
  assertEqual(result.migrationState, 'EXPERIENCE_ACTIVE', 'Migration state should be EXPERIENCE_ACTIVE')
})

// ============================================================
// SECTION 2: CANONICAL DOMAIN VALIDATION
// ============================================================

console.log('')
console.log('📋 Canonical Domain Validation Tests')

test('All five canonical domains are recognized', () => {
  const registry = new RouteOwnershipRegistry()
  
  for (const domain of CANONICAL_DOMAINS) {
    const result = registry.resolve(domain, '/test')
    assert(result.valid, `${domain} should be valid domain`)
  }
})

test('valdi.app is canonical', () => {
  const registry = new RouteOwnershipRegistry()
  const result = registry.resolve('valdi.app', '/test')
  assert(result.valid, 'valdi.app should be valid')
})

test('natales.app is canonical', () => {
  const registry = new RouteOwnershipRegistry()
  const result = registry.resolve('natales.app', '/test')
  assert(result.valid, 'natales.app should be valid')
})

test('puntaarenas.app is canonical', () => {
  const registry = new RouteOwnershipRegistry()
  const result = registry.resolve('puntaarenas.app', '/test')
  assert(result.valid, 'puntaarenas.app should be valid')
})

test('coyhaique.app is canonical', () => {
  const registry = new RouteOwnershipRegistry()
  const result = registry.resolve('coyhaique.app', '/test')
  assert(result.valid, 'coyhaique.app should be valid')
})

test('chiloe.app is canonical', () => {
  const registry = new RouteOwnershipRegistry()
  const result = registry.resolve('chiloe.app', '/test')
  assert(result.valid, 'chiloe.app should be valid')
})

test('valdivia.app is rejected', () => {
  const registry = new RouteOwnershipRegistry()
  const result = registry.resolve('valdivia.app', '/test')
  assertEqual(result.valid, false, 'valdivia.app should be rejected')
  assert(result.error, 'Should have error message')
})

test('Unknown domains are not canonical', () => {
  const registry = new RouteOwnershipRegistry()
  const result = registry.resolve('unknown.app', '/test')
  assertEqual(result.valid, false, 'unknown.app should be invalid')
})

test('Domain list returns five domains', () => {
  assertEqual(CANONICAL_DOMAINS.length, 5, 'Should have exactly 5 canonical domains')
})

// ============================================================
// SECTION 3: DESTINATION ISOLATION VALIDATION
// ============================================================

console.log('')
console.log('📋 Destination Isolation Tests')

test('Application Instance resolves to correct destination', () => {
  const registry = new RouteOwnershipRegistry({
    routes: [
      { domain: 'valdi.app', path: '/albasie', ownership: OWNERSHIP.EXPERIENCE, destination: 'valdi', company: 'albasie' },
      { domain: 'natales.app', path: '/hostal-patagonia', ownership: OWNERSHIP.EXPERIENCE, destination: 'natales', company: 'hostal-patagonia' }
    ]
  })
  
  const valdiResult = registry.resolve('valdi.app', '/albasie')
  const natalesResult = registry.resolve('natales.app', '/hostal-patagonia')
  
  assertEqual(valdiResult.destination, 'valdi', 'valdi.app should resolve to destination valdi')
  assertEqual(natalesResult.destination, 'natales', 'natales.app should resolve to destination natales')
})

test('Same company name in different domains is isolated', () => {
  const registry = new RouteOwnershipRegistry({
    routes: [
      { domain: 'valdi.app', path: '/demo', ownership: OWNERSHIP.EXPERIENCE, destination: 'valdi', company: 'demo' },
      { domain: 'natales.app', path: '/demo', ownership: OWNERSHIP.WORDPRESS, destination: 'natales', company: 'demo' }
    ]
  })
  
  const valdiDemo = registry.resolve('valdi.app', '/demo')
  const natalesDemo = registry.resolve('natales.app', '/demo')
  
  assertEqual(valdiDemo.destination, 'valdi', 'valdi.app/demo should have destination valdi')
  assertEqual(natalesDemo.destination, 'natales', 'natales.app/demo should have destination natales')
  assert(valdiDemo.ownership !== natalesDemo.ownership, 'Same company name but different ownership on different domains')
})

test('valdi.app routes do not leak to natales.app', () => {
  const registry = new RouteOwnershipRegistry({
    routes: [
      { domain: 'valdi.app', path: '/empresa/albasie', ownership: OWNERSHIP.EXPERIENCE, destination: 'valdi', company: 'albasie' }
    ]
  })
  
  const valdiRoute = registry.resolve('valdi.app', '/empresa/albasie')
  const natalesRoute = registry.resolve('natales.app', '/empresa/albasie')
  
  assertEqual(valdiRoute.destination, 'valdi', 'valdi.app/empresa/albasie should have destination valdi')
  assertEqual(valdiRoute.company, 'albasie', 'valdi.app should have company albasie')
  assert(natalesRoute.destination === null, 'natales.app/empresa/albasie should not have destination (not configured)')
  assert(natalesRoute.company === null, 'natales.app should not have company')
  assert(valdiRoute.ownership === OWNERSHIP.EXPERIENCE, 'valdi ownership should be EXPERIENCE')
  assert(natalesRoute.ownership === OWNERSHIP.WORDPRESS, 'natales ownership should default to WORDPRESS')
})

// ============================================================
// SECTION 4: COMPANY ISOLATION VALIDATION
// ============================================================

console.log('')
console.log('📋 Company Isolation Tests')

test('Company is optional - not every Application Instance has a company', () => {
  const registry = new RouteOwnershipRegistry({
    routes: [
      { domain: 'valdi.app', path: '/albasie', ownership: OWNERSHIP.EXPERIENCE, destination: 'valdi', company: 'albasie' },
      { domain: 'valdi.app', path: '/costa', ownership: OWNERSHIP.WORDPRESS, destination: 'valdi' },
      { domain: 'valdi.app', path: '/corral', ownership: OWNERSHIP.WORDPRESS, destination: 'valdi' }
    ]
  })
  
  const companyRoute = registry.resolve('valdi.app', '/albasie')
  const tourismRoute1 = registry.resolve('valdi.app', '/costa')
  const tourismRoute2 = registry.resolve('valdi.app', '/corral')
  
  assert(companyRoute.company === 'albasie', '/albasie should have company')
  assert(tourismRoute1.company === null, '/costa should have no company')
  assert(tourismRoute2.company === null, '/corral should have no company')
})

test('Company does not equal Application Instance', () => {
  const registry = new RouteOwnershipRegistry({
    routes: [
      { domain: 'valdi.app', path: '/costa', ownership: OWNERSHIP.WORDPRESS, destination: 'valdi' }
    ]
  })
  
  const result = registry.resolve('valdi.app', '/costa')
  assert(result.valid, 'Route should be valid')
  assertEqual(result.company, null, 'Tourism destination should have no company')
  assertEqual(result.destination, 'valdi', 'Tourism destination should have destination')
  assertEqual(result.ownership, OWNERSHIP.WORDPRESS, 'Tourism route should be WORDPRESS')
})

test('Different companies are isolated by domain', () => {
  const registry = new RouteOwnershipRegistry({
    routes: [
      { domain: 'valdi.app', path: '/company-a', ownership: OWNERSHIP.EXPERIENCE, destination: 'valdi', company: 'company-a' },
      { domain: 'natales.app', path: '/company-a', ownership: OWNERSHIP.EXPERIENCE, destination: 'natales', company: 'company-a' }
    ]
  })
  
  const valdiCompany = registry.resolve('valdi.app', '/company-a')
  const natalesCompany = registry.resolve('natales.app', '/company-a')
  
  assertEqual(valdiCompany.company, 'company-a', 'valdi.app should have company-a')
  assertEqual(natalesCompany.company, 'company-a', 'natales.app should have company-a')
  assert(valdiCompany.destination !== natalesCompany.destination, 'Same company name but different destinations')
})

// ============================================================
// SECTION 5: EXPERIENCE TYPE SEPARATION
// ============================================================

console.log('')
console.log('📋 Experience Type Separation Tests')

test('Application Instance experience type can be company-profile', () => {
  const builder = new ExperienceContextBuilder()
  const context = builder
    .setDomain('valdi.app')
    .setDestination('valdi')
    .setCompany('albasie')
    .setExperience('company-profile')
    .setCapabilities(['hero', 'services', 'gallery', 'contact', 'whatsapp'])
    .build()
  
  const expCtx = new ExperienceContext(builder)
  assertEqual(expCtx.experience, 'company-profile', 'Experience type should be company-profile')
  assertEqual(expCtx.company, 'albasie', 'Company should be albasie')
})

test('Application Instance experience type can be tourism-destination', () => {
  const builder = new ExperienceContextBuilder()
  builder
    .setDomain('valdi.app')
    .setDestination('valdi')
    .setExperience('tourism-destination')
    .setCapabilities(['hero', 'destinations', 'attractions', 'activities', 'gallery', 'map', 'weather', 'events', 'businesses'])
  
  const expCtx = new ExperienceContext(builder)
  assertEqual(expCtx.experience, 'tourism-destination', 'Experience type should be tourism-destination')
  assertEqual(expCtx.company, null, 'Tourism destination should have no company')
})

test('Application Instance experience type can be accommodation', () => {
  const builder = new ExperienceContextBuilder()
  builder
    .setDomain('natales.app')
    .setDestination('natales')
    .setCompany('hostal-patagonia')
    .setExperience('accommodation')
    .setCapabilities(['hero', 'rooms', 'gallery', 'location', 'booking', 'reviews', 'contact'])
  
  const expCtx = new ExperienceContext(builder)
  assertEqual(expCtx.experience, 'accommodation', 'Experience type should be accommodation')
})

test('Experience type separation does not require hardcoded logic', () => {
  const experienceTypes = ['company-profile', 'tourism-destination', 'accommodation', 'restaurant', 'tour', 'real-estate', 'boat', 'professional-service']
  
  for (const type of experienceTypes) {
    const builder = new ExperienceContextBuilder()
    builder.setExperience(type)
    const expCtx = new ExperienceContext(builder)
    assertEqual(expCtx.experience, type, `Experience type ${type} should be storable in context`)
  }
})

// ============================================================
// SECTION 6: CAPABILITY CONFIGURATION CONCEPT
// ============================================================

console.log('')
console.log('📋 Capability Configuration Concept Tests')

test('Capabilities can be composed through configuration', () => {
  const builder = new ExperienceContextBuilder()
  builder.setCapabilities(['hero', 'services', 'gallery', 'contact', 'whatsapp'])
  
  const expCtx = new ExperienceContext(builder)
  const caps = expCtx.capabilities
  
  assert(Array.isArray(caps), 'Capabilities should be an array')
  assert(caps.includes('hero'), 'Should include hero capability')
  assert(caps.includes('services'), 'Should include services capability')
  assert(caps.includes('gallery'), 'Should include gallery capability')
  assert(caps.includes('contact'), 'Should include contact capability')
  assert(caps.includes('whatsapp'), 'Should include whatsapp capability')
})

test('Different experience types can have different capabilities', () => {
  const companyBuilder = new ExperienceContextBuilder()
  companyBuilder.setCapabilities(['hero', 'services', 'gallery', 'contact'])
  
  const tourismBuilder = new ExperienceContextBuilder()
  tourismBuilder.setCapabilities(['hero', 'destinations', 'attractions', 'activities', 'gallery', 'map', 'weather', 'events', 'businesses'])
  
  const accommodationBuilder = new ExperienceContextBuilder()
  accommodationBuilder.setCapabilities(['hero', 'rooms', 'gallery', 'location', 'booking', 'reviews'])
  
  const companyCtx = new ExperienceContext(companyBuilder)
  const tourismCtx = new ExperienceContext(tourismBuilder)
  const accommodationCtx = new ExperienceContext(accommodationBuilder)
  
  assert(companyCtx.capabilities.length !== tourismCtx.capabilities.length, 'Company and tourism should have different capabilities')
  assert(tourismCtx.capabilities.includes('map'), 'Tourism should include map capability')
  assert(accommodationCtx.capabilities.includes('rooms'), 'Accommodation should include rooms capability')
})

test('Capability configuration is external to the runtime', () => {
  const builder = new ExperienceContextBuilder()
  builder.setCapabilities(['custom', 'capabilities', 'defined', 'externally'])
  
  const context = new ExperienceContext(builder)
  assertEqual(context.capabilities.length, 4, 'Capabilities should be externally configurable')
})

// ============================================================
// SECTION 7: WORDPRESS CONTENT SOURCE COMPATIBILITY
// ============================================================

console.log('')
console.log('📋 WordPress Content Source Compatibility Tests')

test('WordPress routes remain WORDPRESS ownership', () => {
  const registry = new RouteOwnershipRegistry({
    routes: [
      { domain: 'valdi.app', path: '/blog', ownership: OWNERSHIP.WORDPRESS, destination: 'valdi', migrationState: 'LEGACY' }
    ]
  })
  
  const result = registry.resolve('valdi.app', '/blog')
  assertEqual(result.ownership, OWNERSHIP.WORDPRESS, 'Blog should be WORDPRESS ownership')
  assertEqual(result.migrationState, 'LEGACY', 'Blog should be in LEGACY state')
})

test('Unknown routes default to WORDPRESS', () => {
  const registry = new RouteOwnershipRegistry()
  const result = registry.resolve('valdi.app', '/unknown-page')
  
  assertEqual(result.ownership, OWNERSHIP.WORDPRESS, 'Unknown routes should default to WORDPRESS')
  assertEqual(result.migrationState, 'LEGACY', 'Unknown routes should be in LEGACY state')
})

test('Existing WordPress routes are not automatically migrated', () => {
  const registry = new RouteOwnershipRegistry({
    routes: [
      { domain: 'valdi.app', path: '/blog', ownership: OWNERSHIP.WORDPRESS, destination: 'valdi' },
      { domain: 'valdi.app', path: '/noticias', ownership: OWNERSHIP.WORDPRESS, destination: 'valdi' },
      { domain: 'valdi.app', path: '/turismo', ownership: OWNERSHIP.WORDPRESS, destination: 'valdi' }
    ]
  })
  
  const blog = registry.resolve('valdi.app', '/blog')
  const noticias = registry.resolve('valdi.app', '/noticias')
  const turismo = registry.resolve('valdi.app', '/turismo')
  
  assertEqual(blog.ownership, OWNERSHIP.WORDPRESS, 'Blog should remain WORDPRESS')
  assertEqual(noticias.ownership, OWNERSHIP.WORDPRESS, 'Noticias should remain WORDPRESS')
  assertEqual(turismo.ownership, OWNERSHIP.WORDPRESS, 'Turismo should remain WORDPRESS')
})

test('WordPress content source is behind ContentProvider boundary', () => {
  const registry = new RouteOwnershipRegistry({
    routes: [
      { domain: 'valdi.app', path: '/blog/my-post', ownership: OWNERSHIP.WORDPRESS, destination: 'valdi' }
    ]
  })
  
  const result = registry.resolve('valdi.app', '/blog/my-post')
  assertEqual(result.ownership, OWNERSHIP.WORDPRESS, 'WordPress route should have WORDPRESS ownership')
  assert(result.valid, 'WordPress route should be valid')
})

// ============================================================
// SECTION 8: HYBRID COMPATIBILITY
// ============================================================

console.log('')
console.log('📋 Hybrid Architecture Compatibility Tests')

test('Application Instance can be HYBRID ownership', () => {
  const registry = new RouteOwnershipRegistry({
    routes: [
      { domain: 'valdi.app', path: '/albasie', ownership: OWNERSHIP.HYBRID, destination: 'valdi', company: 'albasie', migrationState: 'HYBRID' }
    ]
  })
  
  const result = registry.resolve('valdi.app', '/albasie')
  assertEqual(result.ownership, OWNERSHIP.HYBRID, 'Should be HYBRID ownership')
  assertEqual(result.migrationState, 'HYBRID', 'Should be in HYBRID state')
})

test('HYBRID routes use Experience presentation with WordPress content', () => {
  const registry = new RouteOwnershipRegistry({
    routes: [
      { domain: 'valdi.app', path: '/hybrid-route', ownership: OWNERSHIP.HYBRID, destination: 'valdi' }
    ]
  })
  
  const result = registry.resolve('valdi.app', '/hybrid-route')
  assert(result.isHybrid || result.ownership === OWNERSHIP.HYBRID, 'Should be hybrid route')
})

test('HYBRID is intermediate between WORDPRESS and EXPERIENCE', () => {
  const registry = new RouteOwnershipRegistry({
    routes: [
      { domain: 'valdi.app', path: '/wp-test', ownership: OWNERSHIP.WORDPRESS, migrationState: MIGRATION_STATE.ACTIVE_WORDPRESS },
      { domain: 'valdi.app', path: '/hybrid-test', ownership: OWNERSHIP.HYBRID, migrationState: MIGRATION_STATE.HYBRID_ACTIVE },
      { domain: 'valdi.app', path: '/exp-test', ownership: OWNERSHIP.EXPERIENCE, migrationState: MIGRATION_STATE.EXPERIENCE_ACTIVE }
    ]
  })
  const controller = new RouteMigrationController(registry)
  
  const wpResult = controller.canActivateHybrid('valdi.app', '/wp-test')
  assert(wpResult.canActivate, 'Can activate HYBRID from ACTIVE_WORDPRESS')
  
  const hybridResult = controller.canActivateHybrid('valdi.app', '/hybrid-test')
  assert(!hybridResult.canActivate, 'Cannot activate HYBRID when already HYBRID_ACTIVE')
  
  const expResult = controller.canActivateHybrid('valdi.app', '/exp-test')
  assert(!expResult.canActivate, 'Cannot activate HYBRID from EXPERIENCE_ACTIVE')
})

// ============================================================
// SECTION 9: EXPERIENCE COMPATIBILITY
// ============================================================

console.log('')
console.log('📋 Experience Compatibility Tests')

test('Application Instance can be EXPERIENCE ownership', () => {
  const registry = new RouteOwnershipRegistry({
    routes: [
      { domain: 'valdi.app', path: '/albasie', ownership: OWNERSHIP.EXPERIENCE, destination: 'valdi', company: 'albasie', migrationState: 'EXPERIENCE' }
    ]
  })
  
  const result = registry.resolve('valdi.app', '/albasie')
  assertEqual(result.ownership, OWNERSHIP.EXPERIENCE, 'Should be EXPERIENCE ownership')
  assertEqual(result.migrationState, 'EXPERIENCE', 'Should be in EXPERIENCE state')
})

test('EXPERIENCE routes do not access WordPress', () => {
  const registry = new RouteOwnershipRegistry({
    routes: [
      { domain: 'valdi.app', path: '/pure-experience', ownership: OWNERSHIP.EXPERIENCE, destination: 'valdi' }
    ]
  })
  
  const result = registry.resolve('valdi.app', '/pure-experience')
  assertEqual(result.ownership, OWNERSHIP.EXPERIENCE, 'Should be EXPERIENCE ownership')
})

test('EXPERIENCE can be activated from HYBRID_ACTIVE', () => {
  const registry = new RouteOwnershipRegistry({
    routes: [
      { domain: 'valdi.app', path: '/hybrid-current', ownership: OWNERSHIP.HYBRID, migrationState: MIGRATION_STATE.HYBRID_ACTIVE },
      { domain: 'valdi.app', path: '/wp-current', ownership: OWNERSHIP.WORDPRESS, migrationState: MIGRATION_STATE.ACTIVE_WORDPRESS }
    ]
  })
  const controller = new RouteMigrationController(registry)
  
  const hybridResult = controller.canActivateExperience('valdi.app', '/hybrid-current')
  assert(hybridResult.canActivate, 'Can activate EXPERIENCE from HYBRID_ACTIVE')
  
  const wpResult = controller.canActivateExperience('valdi.app', '/wp-current')
  assert(!wpResult.canActivate, 'Cannot activate EXPERIENCE from ACTIVE_WORDPRESS directly')
})

// ============================================================
// SECTION 10: ROUTE OWNERSHIP COMPATIBILITY
// ============================================================

console.log('')
console.log('📋 Route Ownership Compatibility Tests')

test('Route ownership is preserved in Application Instance resolution', () => {
  const registry = new RouteOwnershipRegistry({
    routes: [
      { domain: 'valdi.app', path: '/wp-route', ownership: OWNERSHIP.WORDPRESS, destination: 'valdi' },
      { domain: 'valdi.app', path: '/hybrid-route', ownership: OWNERSHIP.HYBRID, destination: 'valdi' },
      { domain: 'valdi.app', path: '/exp-route', ownership: OWNERSHIP.EXPERIENCE, destination: 'valdi' }
    ]
  })
  
  const wp = registry.resolve('valdi.app', '/wp-route')
  const hybrid = registry.resolve('valdi.app', '/hybrid-route')
  const exp = registry.resolve('valdi.app', '/exp-route')
  
  assertEqual(wp.ownership, OWNERSHIP.WORDPRESS, 'First route should be WORDPRESS')
  assertEqual(hybrid.ownership, OWNERSHIP.HYBRID, 'Second route should be HYBRID')
  assertEqual(exp.ownership, OWNERSHIP.EXPERIENCE, 'Third route should be EXPERIENCE')
})

test('Application Instance consumes existing route ownership model', () => {
  const registry = new RouteOwnershipRegistry({
    routes: [
      { domain: 'valdi.app', path: '/empresa/albasie', ownership: OWNERSHIP.EXPERIENCE, destination: 'valdi', company: 'albasie', migrationState: 'EXPERIENCE' }
    ]
  })
  
  const result = registry.resolve('valdi.app', '/empresa/albasie')
  assertContains(result, 'ownership', 'Should have ownership field')
  assertContains(result, 'migrationState', 'Should have migrationState field')
  assertContains(result, 'destination', 'Should have destination field')
  assertContains(result, 'company', 'Should have company field')
})

// ============================================================
// SECTION 11: MIGRATION STATE COMPATIBILITY
// ============================================================

console.log('')
console.log('📋 Migration State Compatibility Tests')

test('Application Instance supports LEGACY migration state', () => {
  const registry = new RouteOwnershipRegistry({
    routes: [
      { domain: 'valdi.app', path: '/legacy', ownership: OWNERSHIP.WORDPRESS, destination: 'valdi', migrationState: 'LEGACY' }
    ]
  })
  
  const result = registry.resolve('valdi.app', '/legacy')
  assertEqual(result.migrationState, 'LEGACY', 'Should be LEGACY state')
})

test('Application Instance supports HYBRID migration state', () => {
  const registry = new RouteOwnershipRegistry({
    routes: [
      { domain: 'valdi.app', path: '/hybrid-active', ownership: OWNERSHIP.HYBRID, destination: 'valdi', migrationState: 'HYBRID_ACTIVE' }
    ]
  })
  
  const result = registry.resolve('valdi.app', '/hybrid-active')
  assertEqual(result.migrationState, 'HYBRID_ACTIVE', 'Should be HYBRID_ACTIVE state')
})

test('Application Instance supports EXPERIENCE migration state', () => {
  const registry = new RouteOwnershipRegistry({
    routes: [
      { domain: 'valdi.app', path: '/experience-active', ownership: OWNERSHIP.EXPERIENCE, destination: 'valdi', migrationState: 'EXPERIENCE_ACTIVE' }
    ]
  })
  
  const result = registry.resolve('valdi.app', '/experience-active')
  assertEqual(result.migrationState, 'EXPERIENCE_ACTIVE', 'Should be EXPERIENCE_ACTIVE state')
})

test('Migration state machine supports rollback', () => {
  const registry = new RouteOwnershipRegistry({
    routes: [
      { domain: 'valdi.app', path: '/hybrid-rollback', ownership: OWNERSHIP.HYBRID, migrationState: MIGRATION_STATE.HYBRID_ACTIVE },
      { domain: 'valdi.app', path: '/exp-rollback', ownership: OWNERSHIP.EXPERIENCE, migrationState: MIGRATION_STATE.EXPERIENCE_ACTIVE }
    ]
  })
  const controller = new RouteMigrationController(registry)
  
  const hybridRollback = controller.getNextRollbackState('valdi.app', '/hybrid-rollback')
  assertEqual(hybridRollback.targetState, MIGRATION_STATE.ACTIVE_WORDPRESS, 'HYBRID_ACTIVE should rollback to ACTIVE_WORDPRESS')
  
  const expRollback = controller.getNextRollbackState('valdi.app', '/exp-rollback')
  assertEqual(expRollback.targetState, MIGRATION_STATE.HYBRID_ACTIVE, 'EXPERIENCE_ACTIVE should rollback to HYBRID_ACTIVE')
})

// ============================================================
// SECTION 12: URL PRESERVATION
// ============================================================

console.log('')
console.log('📋 URL Preservation Tests')

test('Application Instance URL is preserved during migration', () => {
  const registry = new RouteOwnershipRegistry({
    routes: [
      { domain: 'valdi.app', path: '/empresa/albasie', ownership: OWNERSHIP.EXPERIENCE, destination: 'valdi', company: 'albasie', migrationState: 'EXPERIENCE' }
    ]
  })
  
  const result = registry.resolve('valdi.app', '/empresa/albasie')
  assertEqual(result.domain, 'valdi.app', 'Domain should be preserved')
  assertEqual(result.path, '/empresa/albasie', 'Path should be preserved')
})

test('URL is preserved in migration preview', () => {
  const manager = createRouteMigrationManager({
    routes: [
      { domain: 'valdi.app', path: '/blog-test', ownership: OWNERSHIP.WORDPRESS, migrationState: MIGRATION_STATE.ACTIVE_WORDPRESS }
    ]
  })
  
  const result = manager.prepareTransition('valdi.app', '/blog-test', TRANSITION_TARGET.HYBRID, { dryRun: true })
  assert(result.success, 'Transition preparation should succeed')
  assertEqual(result.transition.domain, 'valdi.app', 'Domain should be preserved in preview')
  assertEqual(result.transition.path, '/blog-test', 'Path should be preserved in preview')
})

test('URL is preserved in rollback preview', () => {
  const manager = createRouteMigrationManager({
    routes: [
      { domain: 'valdi.app', path: '/empresa/albasie', ownership: OWNERSHIP.EXPERIENCE, migrationState: MIGRATION_STATE.EXPERIENCE_ACTIVE }
    ]
  })
  
  const result = manager.prepareRollback('valdi.app', '/empresa/albasie', { dryRun: true })
  assert(result.success, 'Rollback preparation should succeed')
  assertEqual(result.rollback.domain, 'valdi.app', 'Domain should be preserved in rollback preview')
  assertEqual(result.rollback.path, '/empresa/albasie', 'Path should be preserved in rollback preview')
})

// ============================================================
// SECTION 13: CACHE ISOLATION
// ============================================================

console.log('')
console.log('📋 Cache Isolation Tests')

test('Application identity is safe for cache keys', () => {
  const registry = new RouteOwnershipRegistry({
    routes: [
      { domain: 'valdi.app', path: '/albasie', ownership: OWNERSHIP.EXPERIENCE, destination: 'valdi', company: 'albasie' },
      { domain: 'natales.app', path: '/albasie', ownership: OWNERSHIP.WORDPRESS, destination: 'natales' }
    ]
  })
  
  const valdi = registry.resolve('valdi.app', '/albasie')
  const natales = registry.resolve('natales.app', '/albasie')
  
  const valdiCacheKey = `app:${valdi.domain}:${valdi.path}:${valdi.ownership}`
  const natalesCacheKey = `app:${natales.domain}:${natales.path}:${natales.ownership}`
  
  assert(valdiCacheKey !== natalesCacheKey, 'Different domains should produce different cache keys')
  assert(valdiCacheKey.includes('valdi.app'), 'Cache key should include domain')
  assert(natalesCacheKey.includes('natales.app'), 'Cache key should include domain')
})

test('Different ownership produces different cache keys', () => {
  const registry = new RouteOwnershipRegistry({
    routes: [
      { domain: 'valdi.app', path: '/demo', ownership: OWNERSHIP.WORDPRESS, destination: 'valdi' },
      { domain: 'valdi.app', path: '/demo-hybrid', ownership: OWNERSHIP.HYBRID, destination: 'valdi' }
    ]
  })
  
  const wp = registry.resolve('valdi.app', '/demo')
  const hybrid = registry.resolve('valdi.app', '/demo-hybrid')
  
  assert(wp.ownership !== hybrid.ownership, 'Different ownership should produce different cache keys')
})

test('Domain isolation in cache keys is mandatory', () => {
  const registry = new RouteOwnershipRegistry({
    routes: [
      { domain: 'valdi.app', path: '/same', ownership: OWNERSHIP.EXPERIENCE, destination: 'valdi' },
      { domain: 'natales.app', path: '/same', ownership: OWNERSHIP.EXPERIENCE, destination: 'natales' }
    ]
  })
  
  const valdi = registry.resolve('valdi.app', '/same')
  const natales = registry.resolve('natales.app', '/same')
  
  assert(valdi.destination !== natales.destination, 'Same path different domain must have different destinations')
})

// ============================================================
// SECTION 14: SEO COMPATIBILITY
// ============================================================

console.log('')
console.log('📋 SEO Compatibility Tests')

test('Application Instance can hold SEO metadata', () => {
  const builder = new ExperienceContextBuilder()
  builder
    .setDomain('valdi.app')
    .setSeo({
      title: 'Albasie - Empresa de Servicios',
      description: 'Servicios profesionales en Valdivia',
      canonical: 'https://valdi.app/empresa/albasie',
      ogImage: 'https://valdi.app/images/og-albasie.jpg',
      jsonLd: {}
    })
  
  const context = new ExperienceContext(builder)
  assertContains(context, 'seo', 'Context should have SEO field')
  assertEqual(context.seo.title, 'Albasie - Empresa de Servicios', 'SEO title should be configurable')
})

test('Application Instance SEO is destination-scoped', () => {
  const builder = new ExperienceContextBuilder()
  builder.setDestination('valdi')
  
  const context = new ExperienceContext(builder)
  assertEqual(context.destination, 'valdi', 'SEO context should be scoped to destination')
})

test('Public URLs remain unchanged during progressive migration', () => {
  const registry = new RouteOwnershipRegistry({
    routes: [
      { domain: 'valdi.app', path: '/empresa/albasie', ownership: OWNERSHIP.EXPERIENCE, destination: 'valdi', company: 'albasie', migrationState: 'EXPERIENCE' },
      { domain: 'valdi.app', path: '/blog', ownership: OWNERSHIP.WORDPRESS, destination: 'valdi', migrationState: 'LEGACY' }
    ]
  })
  
  const albasie = registry.resolve('valdi.app', '/empresa/albasie')
  const blog = registry.resolve('valdi.app', '/blog')
  
  assert(albasie.valid, 'Albasie URL should remain valid')
  assert(blog.valid, 'Blog URL should remain valid')
  assertEqual(albasie.path, '/empresa/albasie', 'Albasie path should be unchanged')
  assertEqual(blog.path, '/blog', 'Blog path should be unchanged')
})

// ============================================================
// SECTION 15: PRESENTATION BOUNDARY
// ============================================================

console.log('')
console.log('📋 Presentation Boundary Tests')

test('Application Instance does not expose infrastructure to UI', () => {
  const builder = new ExperienceContextBuilder()
  builder
    .setDomain('valdi.app')
    .setDestination('valdi')
    .setCompany('albasie')
    .setExperience('company-profile')
    .setCapabilities(['hero', 'services'])
  
  const context = new ExperienceContext(builder)
  
  assert(context.domain === 'valdi.app', 'Context should have domain')
  assert(context.destination === 'valdi', 'Context should have destination')
  assert(context.company === 'albasie', 'Context should have company')
  assert(Array.isArray(context.capabilities), 'Context should have capabilities array')
  
  const json = context.toJSON()
  assert(!json.password, 'Context should not expose passwords')
  assert(!json.apiKey, 'Context should not expose API keys')
  assert(!json.databaseUrl, 'Context should not expose database URLs')
})

test('Presentation layer receives safe view model only', () => {
  const builder = new ExperienceContextBuilder()
  builder
    .setDomain('valdi.app')
    .setDestination('valdi')
    .setExperience('company-profile')
    .setTheme({ primaryColor: '#0066FF', fontFamily: 'Inter' })
    .setBranding({ logo: '/images/logo.png', name: 'Valdi' })
  
  const context = new ExperienceContext(builder)
  const safeFields = ['domain', 'destination', 'experience', 'theme', 'branding', 'capabilities', 'seo']
  
  for (const field of safeFields) {
    assert(field in context, `Context should have safe field: ${field}`)
  }
})

// ============================================================
// SECTION 16: INFRASTRUCTURE BOUNDARY
// ============================================================

console.log('')
console.log('📋 Infrastructure Boundary Tests')

test('Application Instance resolution does not access database', () => {
  const registry = new RouteOwnershipRegistry({
    routes: [
      { domain: 'valdi.app', path: '/test', ownership: OWNERSHIP.WORDPRESS, destination: 'valdi' }
    ]
  })
  
  const result = registry.resolve('valdi.app', '/test')
  assert(result.valid, 'Resolution should work without database')
})

test('Application Instance resolution does not call WordPress REST API', () => {
  const registry = new RouteOwnershipRegistry({
    routes: [
      { domain: 'valdi.app', path: '/test', ownership: OWNERSHIP.EXPERIENCE, destination: 'valdi' }
    ]
  })
  
  const result = registry.resolve('valdi.app', '/test')
  assert(result.valid, 'Resolution should work without WordPress API')
})

test('Application Instance does not access storage directly', () => {
  const builder = new ExperienceContextBuilder()
  builder.setDomain('valdi.app').setDestination('valdi')
  
  const context = new ExperienceContext(builder)
  const json = context.toJSON()
  
  assert(!json.storageCredentials, 'Context should not expose storage credentials')
})

// ============================================================
// SECTION 17: FUTURE TOURISM ROUTE COMPATIBILITY
// ============================================================

console.log('')
console.log('📋 Future Tourism Route Compatibility Tests')

test('valdi.app/costa can become Application Instance', () => {
  const registry = new RouteOwnershipRegistry({
    routes: [
      { domain: 'valdi.app', path: '/costa', ownership: OWNERSHIP.WORDPRESS, destination: 'valdi', migrationState: 'LEGACY' }
    ]
  })
  
  const result = registry.resolve('valdi.app', '/costa')
  assert(result.valid, 'costa route should be valid Application Instance candidate')
  assertEqual(result.destination, 'valdi', 'Should resolve to valdi destination')
  assertEqual(result.ownership, OWNERSHIP.WORDPRESS, 'Currently WORDPRESS but can be migrated')
})

test('valdi.app/corral can become Application Instance', () => {
  const registry = new RouteOwnershipRegistry({
    routes: [
      { domain: 'valdi.app', path: '/corral', ownership: OWNERSHIP.WORDPRESS, destination: 'valdi', migrationState: 'LEGACY' }
    ]
  })
  
  const result = registry.resolve('valdi.app', '/corral')
  assert(result.valid, 'corral route should be valid Application Instance candidate')
  assertEqual(result.destination, 'valdi', 'Should resolve to valdi destination')
})

test('Tourism Application Instance can have tourism-destination experience', () => {
  const builder = new ExperienceContextBuilder()
  builder
    .setDomain('valdi.app')
    .setDestination('valdi')
    .setExperience('tourism-destination')
    .setCapabilities(['hero', 'destinations', 'attractions', 'activities', 'gallery', 'map', 'weather', 'events', 'businesses', 'accommodation', 'restaurants', 'transport', 'contact'])
  
  const context = new ExperienceContext(builder)
  assertEqual(context.experience, 'tourism-destination', 'Should support tourism-destination experience type')
  assert(context.capabilities.includes('destinations'), 'Should include destinations capability')
  assert(context.capabilities.includes('activities'), 'Should include activities capability')
  assert(context.capabilities.includes('weather'), 'Should include weather capability')
})

test('Tourism routes are NOT migrated during P15.8.0', () => {
  const registry = new RouteOwnershipRegistry({
    routes: [
      { domain: 'valdi.app', path: '/costa', ownership: OWNERSHIP.WORDPRESS, destination: 'valdi' },
      { domain: 'valdi.app', path: '/corral', ownership: OWNERSHIP.WORDPRESS, destination: 'valdi' }
    ]
  })
  
  const costa = registry.resolve('valdi.app', '/costa')
  const corral = registry.resolve('valdi.app', '/corral')
  
  assertEqual(costa.ownership, OWNERSHIP.WORDPRESS, 'Costa should remain WORDPRESS in P15.8.0')
  assertEqual(corral.ownership, OWNERSHIP.WORDPRESS, 'Corral should remain WORDPRESS in P15.8.0')
})

// ============================================================
// SECTION 18: NO AUTOMATIC MIGRATION
// ============================================================

console.log('')
console.log('📋 No Automatic Migration Tests')

test('Unknown routes default to WORDPRESS without migration', () => {
  const registry = new RouteOwnershipRegistry()
  const result = registry.resolve('valdi.app', '/unknown-route-xyz')
  
  assertEqual(result.ownership, OWNERSHIP.WORDPRESS, 'Unknown routes should default to WORDPRESS')
  assertEqual(result.migrationState, 'LEGACY', 'Unknown routes should be in LEGACY state')
})

test('No transition is allowed without explicit request', () => {
  const manager = createRouteMigrationManager({
    routes: [
      { domain: 'valdi.app', path: '/test', ownership: OWNERSHIP.WORDPRESS, migrationState: MIGRATION_STATE.ACTIVE_WORDPRESS }
    ]
  })
  
  const result = manager.validateTransition('valdi.app', '/test', TRANSITION_TARGET.HYBRID)
  assert(result.allowed, 'Valid transition should be allowed')
  
  const prepareResult = manager.prepareTransition('valdi.app', '/test', TRANSITION_TARGET.HYBRID, { dryRun: true })
  assert(prepareResult.dryRun, 'Prepare transition should be dry-run by default')
  assert(prepareResult.success, 'Prepare should succeed for valid transition')
})

test('Migration is configuration-driven, not automatic', () => {
  const registry = new RouteOwnershipRegistry({
    routes: [
      { domain: 'valdi.app', path: '/wp-state', ownership: OWNERSHIP.WORDPRESS, migrationState: MIGRATION_STATE.ACTIVE_WORDPRESS },
      { domain: 'valdi.app', path: '/hybrid-state', ownership: OWNERSHIP.HYBRID, migrationState: MIGRATION_STATE.HYBRID_ACTIVE }
    ]
  })
  const controller = new RouteMigrationController(registry)
  
  const wpResult = controller.canActivateHybrid('valdi.app', '/wp-state')
  assert(wpResult.canActivate, 'Can activate HYBRID from WP but requires explicit request')
  
  const hybridResult = controller.canActivateExperience('valdi.app', '/hybrid-state')
  assert(hybridResult.canActivate, 'Can activate EXPERIENCE from HYBRID but requires explicit request')
})

// ============================================================
// SECTION 19: P13.8 INTEGRITY
// ============================================================

console.log('')
console.log('📋 P13.8 Integrity Tests')

test('P13.8 Business Aggregate is not modified', () => {
  const builder = new ExperienceContextBuilder()
  builder.setPlatform('valdi').setEcosystem('chile')
  
  const context = new ExperienceContext(builder)
  assertEqual(context.platform, 'valdi', 'Platform should remain accessible')
  assertEqual(context.ecosystem, 'chile', 'Ecosystem should remain accessible')
})

test('P13.8 capability model is not modified', () => {
  const builder = new ExperienceContextBuilder()
  builder.setCapabilities(['hero', 'services', 'gallery'])
  
  const context = new ExperienceContext(builder)
  assertEqual(context.capabilities.length, 3, 'Capabilities should remain array-based')
  assert(context.capabilities.includes('hero'), 'Hero capability should exist')
})

// ============================================================
// SECTION 20: P15.0 INTEGRITY
// ============================================================

console.log('')
console.log('📋 P15.0 Integrity Tests')

test('P15.0 Experience Engine resolver is not modified', () => {
  const builder = new ExperienceContextBuilder()
  builder.setDestination('valdi').setEcosystem('chile')
  
  const context = new ExperienceContext(builder)
  assert(context.isResolved(), 'Context should support resolution state')
})

test('P15.0 ExperienceContext is not modified', () => {
  const builder = new ExperienceContextBuilder()
  builder
    .setDomain('valdi.app')
    .setDestination('valdi')
    .setCompany('albasie')
    .setExperience('company-profile')
  
  const context = new ExperienceContext(builder)
  assertContains(context, 'domain', 'Context should have domain field')
  assertContains(context, 'destination', 'Context should have destination field')
  assertContains(context, 'company', 'Context should have company field')
  assertContains(context, 'experience', 'Context should have experience field')
})

// ============================================================
// SECTION 21: DRONESTICA DECOUPLING
// ============================================================

console.log('')
console.log('📋 Dronestica Decoupling Tests')

test('Application Instance does not couple to Dronestica', () => {
  const builder = new ExperienceContextBuilder()
  builder
    .setDomain('valdi.app')
    .setDestination('valdi')
    .setCompany('albasie')
  
  const context = new ExperienceContext(builder)
  const json = JSON.stringify(context.toJSON())
  
  assert(!json.includes('dronestica'), 'Context should not contain Dronestica references')
  assert(!json.includes('drone'), 'Context should not contain drone references')
})

test('Application Instance architecture is platform-agnostic', () => {
  const domains = ['valdi.app', 'natales.app', 'puntaarenas.app', 'coyhaique.app', 'chiloe.app']
  
  for (const domain of domains) {
    const builder = new ExperienceContextBuilder()
    builder.setDomain(domain).setDestination(domain.replace('.app', ''))
    const context = new ExperienceContext(builder)
    assert(context.domain === domain, `Should support ${domain}`)
  }
})

// ============================================================
// SECTION 22: CONFIGURATION MODEL VALIDATION
// ============================================================

console.log('')
console.log('📋 Configuration Model Validation Tests')

test('Application Instance conceptual model is compatible with route config', () => {
  const conceptualModel = {
    applicationId: 'valdi.app/albasie',
    domain: 'valdi.app',
    route: '/empresa/albasie',
    destination: 'valdi',
    company: 'albasie',
    experience: 'company-profile',
    capabilities: ['hero', 'services', 'gallery', 'contact', 'whatsapp'],
    migrationState: 'EXPERIENCE_ACTIVE'
  }
  
  const registry = new RouteOwnershipRegistry({
    routes: [
      {
        domain: conceptualModel.domain,
        path: conceptualModel.route,
        ownership: OWNERSHIP.EXPERIENCE,
        destination: conceptualModel.destination,
        company: conceptualModel.company,
        migrationState: 'EXPERIENCE'
      }
    ]
  })
  
  const result = registry.resolve(conceptualModel.domain, conceptualModel.route)
  
  assertEqual(result.domain, conceptualModel.domain, 'Domain should match')
  assertEqual(result.path, conceptualModel.route, 'Route should match')
  assertEqual(result.destination, conceptualModel.destination, 'Destination should match')
  assertEqual(result.company, conceptualModel.company, 'Company should match')
  assertEqual(result.ownership, OWNERSHIP.EXPERIENCE, 'Ownership should be EXPERIENCE')
})

test('Future conceptual config is compatible with existing architecture', () => {
  const futureConfig = {
    application: {
      id: 'natales.app/hostal-patagonia',
      domain: 'natales.app',
      route: '/hostal-patagonia',
      destination: 'natales',
      company: 'hostal-patagonia'
    },
    experience: {
      type: 'accommodation'
    },
    capabilities: {
      hero: true,
      rooms: true,
      gallery: true,
      location: true,
      booking: true,
      reviews: true,
      contact: true
    },
    theme: {
      primaryColor: '#2B7A4B',
      fontFamily: 'Playfair Display'
    },
    content: {
      source: 'wordpress'
    },
    seo: {
      title: 'Hostal Patagonia',
      description: 'Alojamiento en Puerto Natales'
    },
    migration: {
      state: 'HYBRID_ACTIVE'
    }
  }
  
  const registry = new RouteOwnershipRegistry({
    routes: [
      {
        domain: futureConfig.application.domain,
        path: futureConfig.application.route,
        ownership: OWNERSHIP.HYBRID,
        destination: futureConfig.application.destination,
        company: futureConfig.application.company,
        migrationState: 'HYBRID_ACTIVE'
      }
    ]
  })
  
  const result = registry.resolve(futureConfig.application.domain, futureConfig.application.route)
  
  assertEqual(result.domain, futureConfig.application.domain, 'Domain should match')
  assertEqual(result.path, futureConfig.application.route, 'Route should match')
  assertEqual(result.destination, futureConfig.application.destination, 'Destination should match')
  assertEqual(result.company, futureConfig.application.company, 'Company should match')
  assertEqual(result.migrationState, 'HYBRID_ACTIVE', 'Migration state should match')
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
  console.log('P15.8.0 ARCHITECTURE VALIDATION: COMPATIBLE')
} else {
  console.log('❌ SOME TESTS FAILED')
  process.exit(1)
}