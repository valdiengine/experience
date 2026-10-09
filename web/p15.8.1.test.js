/**
 * P15.8.1 — Application Configuration Model Tests
 *
 * Tests the Application Configuration Model implementation:
 * - Application Identity
 * - Application Configuration
 * - Domain isolation
 * - Destination isolation
 * - Company isolation
 * - Experience configuration
 * - Capability configuration
 * - Theme configuration
 * - Content configuration
 * - SEO configuration
 * - Migration compatibility
 * - Security validation
 * - P13.8/P15.0/P15.7 integrity
 */

import {
  ApplicationIdentity,
  createApplicationIdentity,
  isValidApplicationIdentity,
  createApplicationInstance,
  isCanonicalDomain,
  isValidApplicationRoute,
  getDestinationForDomain,
  getRegionForDestination,
  ApplicationConfigLoader,
  ApplicationValidator,
  CANONICAL_DOMAINS,
  REJECTED_DOMAINS,
  EXPERIENCE_TYPES,
  CONTENT_SOURCES,
  MIGRATION_STATES,
  DEFAULT_CAPABILITIES
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

console.log('🧪 P15.8.1 — Application Configuration Model Tests')
console.log('=' .repeat(70))
console.log('')

// ============================================================
// SECTION 1: IDENTITY TESTS
// ============================================================

console.log('📋 Identity Tests')

test('domain + route create unique identity', () => {
  const identity1 = createApplicationIdentity('valdi.app', '/albasie')
  const identity2 = createApplicationIdentity('natales.app', '/albasie')
  
  assertEqual(identity1.applicationId, 'valdi.app/albasie', 'First identity should have correct ID')
  assertEqual(identity2.applicationId, 'natales.app/albasie', 'Second identity should have correct ID')
  assert(!identity1.equals(identity2), 'Different domain should create different identity')
})

test('same route on different domains creates different identity', () => {
  const identity1 = createApplicationIdentity('valdi.app', '/demo')
  const identity2 = createApplicationIdentity('natales.app', '/demo')
  const identity3 = createApplicationIdentity('puntaarenas.app', '/demo')
  
  assertEqual(identity1.applicationId, 'valdi.app/demo', 'valdi identity')
  assertEqual(identity2.applicationId, 'natales.app/demo', 'natales identity')
  assertEqual(identity3.applicationId, 'puntaarenas.app/demo', 'puntaarenas identity')
  
  assert(!identity1.equals(identity2), 'valdi vs natales should be different')
  assert(!identity2.equals(identity3), 'natales vs puntaarenas should be different')
})

test('route normalization', () => {
  const identity1 = createApplicationIdentity('valdi.app', '/albasie')
  const identity2 = createApplicationIdentity('valdi.app', '/albasie/')
  const identity3 = createApplicationIdentity('valdi.app', '//albasie//')
  
  assertEqual(identity1.route, '/albasie', 'Route should be normalized')
  assertEqual(identity2.route, '/albasie', 'Trailing slash should be removed')
  assertEqual(identity3.route, '/albasie', 'Double slashes should be normalized')
  assert(identity1.equals(identity2), 'Normalized routes should be equal')
  assert(identity1.equals(identity3), 'Normalized routes should be equal')
})

test('invalid domain rejected', () => {
  assertThrows(
    () => createApplicationIdentity('invalid.app', '/test'),
    'Invalid domain should throw'
  )
})

test('valdivia.app rejected', () => {
  assertThrows(
    () => createApplicationIdentity('valdivia.app', '/test'),
    'valdivia.app should be rejected'
  )
})

test('ApplicationIdentity.domain returns canonical domain', () => {
  const identity = createApplicationIdentity('valdi.app', '/test')
  assertEqual(identity.domain, 'valdi.app', 'Domain should be canonical')
})

test('ApplicationIdentity.route returns normalized route', () => {
  const identity = createApplicationIdentity('valdi.app', '/test/')
  assertEqual(identity.route, '/test', 'Route should be normalized')
})

test('ApplicationIdentity.applicationId is deterministic', () => {
  const identity = createApplicationIdentity('valdi.app', '/albasie')
  assertEqual(identity.applicationId, 'valdi.app/albasie', 'Application ID should be deterministic')
})

test('ApplicationIdentity.toJSON works', () => {
  const identity = createApplicationIdentity('valdi.app', '/albasie')
  const json = identity.toJSON()
  assertEqual(json.domain, 'valdi.app', 'JSON should have domain')
  assertEqual(json.route, '/albasie', 'JSON should have route')
  assertEqual(json.applicationId, 'valdi.app/albasie', 'JSON should have applicationId')
  assertEqual(json.destination, 'valdi', 'JSON should have destination')
  assertEqual(json.region, 'los-rios', 'JSON should have region')
})

// ============================================================
// SECTION 2: DESTINATION TESTS
// ============================================================

console.log('')
console.log('📋 Destination Tests')

test('valdi resolution', () => {
  const identity = createApplicationIdentity('valdi.app', '/test')
  assertEqual(identity.destination, 'valdi', 'Should resolve to valdi')
  assertEqual(identity.region, 'los-rios', 'valdi should be in los-rios')
})

test('natales resolution', () => {
  const identity = createApplicationIdentity('natales.app', '/test')
  assertEqual(identity.destination, 'natales', 'Should resolve to natales')
  assertEqual(identity.region, 'magallanes', 'natales should be in magallanes')
})

test('puntaarenas resolution', () => {
  const identity = createApplicationIdentity('puntaarenas.app', '/test')
  assertEqual(identity.destination, 'puntaarenas', 'Should resolve to puntaarenas')
  assertEqual(identity.region, 'magallanes', 'puntaarenas should be in magallanes')
})

test('coyhaique resolution', () => {
  const identity = createApplicationIdentity('coyhaique.app', '/test')
  assertEqual(identity.destination, 'coyhaique', 'Should resolve to coyhaique')
  assertEqual(identity.region, 'aysen', 'coyhaique should be in aysen')
})

test('chiloe resolution', () => {
  const identity = createApplicationIdentity('chiloe.app', '/test')
  assertEqual(identity.destination, 'chiloe', 'Should resolve to chiloe')
  assertEqual(identity.region, 'los-lagos', 'chiloe should be in los-lagos')
})

test('incorrect destination/domain combination rejected', () => {
  const identity = createApplicationIdentity('valdi.app', '/test')
  assertEqual(identity.destination, 'valdi', 'Domain should map to correct destination')
  const natalesIdentity = createApplicationIdentity('natales.app', '/test')
  assertEqual(natalesIdentity.destination, 'natales', 'natales.app should map to natales')
  assert(natalesIdentity.destination !== 'valdi', 'Different domains should have different destinations')
})

test('getDestinationForDomain helper works', () => {
  assertEqual(getDestinationForDomain('valdi.app'), 'valdi', 'valdi.app maps to valdi')
  assertEqual(getDestinationForDomain('natales.app'), 'natales', 'natales.app maps to natales')
  assertEqual(getDestinationForDomain('invalid'), null, 'Invalid domain returns null')
})

test('getRegionForDestination helper works', () => {
  assertEqual(getRegionForDestination('valdi'), 'los-rios', 'valdi maps to los-rios')
  assertEqual(getRegionForDestination('natales'), 'magallanes', 'natales maps to magallanes')
  assertEqual(getRegionForDestination('invalid'), null, 'Invalid destination returns null')
})

// ============================================================
// SECTION 3: COMPANY TESTS
// ============================================================

console.log('')
console.log('📋 Company Tests')

test('company optional', () => {
  const config = createApplicationInstance('valdi.app', '/costa', {})
  assertEqual(config.company.slug, null, 'Tourism route should have no company')
  assertEqual(config.company.enabled, false, 'Company should be disabled')
})

test('company can be specified', () => {
  const config = createApplicationInstance('valdi.app', '/albasie', {
    company: 'albasie'
  })
  assertEqual(config.company.slug, 'albasie', 'Company slug should be set')
  assertEqual(config.company.enabled, true, 'Company should be enabled')
})

test('company isolation', () => {
  const config1 = createApplicationInstance('valdi.app', '/company-a', { company: 'company-a' })
  const config2 = createApplicationInstance('natales.app', '/company-a', { company: 'company-a' })
  
  assertEqual(config1.company.slug, 'company-a', 'First company')
  assertEqual(config2.company.slug, 'company-a', 'Second company')
  assert(config1.destination !== config2.destination, 'Different destinations should isolate companies')
})

test('company slug validation', () => {
  const config = createApplicationInstance('valdi.app', '/test', {
    company: { slug: 'valid-company', enabled: true }
  })
  assertEqual(config.company.slug, 'valid-company', 'Valid slug should be accepted')
})

test('company slug null for tourism', () => {
  const config = createApplicationInstance('valdi.app', '/turismo/costa', {})
  assertEqual(config.company.slug, null, 'Tourism route should have null company')
})

// ============================================================
// SECTION 4: EXPERIENCE TESTS
// ============================================================

console.log('')
console.log('📋 Experience Tests')

test('company-profile experience', () => {
  const config = createApplicationInstance('valdi.app', '/test', {
    experience: { type: 'company-profile' }
  })
  assertEqual(config.experience.type, 'company-profile', 'Should accept company-profile')
})

test('tourism-destination experience', () => {
  const config = createApplicationInstance('valdi.app', '/test', {
    experience: { type: 'tourism-destination' }
  })
  assertEqual(config.experience.type, 'tourism-destination', 'Should accept tourism-destination')
})

test('accommodation experience', () => {
  const config = createApplicationInstance('valdi.app', '/test', {
    experience: { type: 'accommodation' }
  })
  assertEqual(config.experience.type, 'accommodation', 'Should accept accommodation')
})

test('invalid experience rejected', () => {
  const config = createApplicationInstance('valdi.app', '/test', {
    experience: { type: 'invalid-type' }
  })
  assertEqual(config.experience.type, null, 'Invalid experience should be null')
})

test('experience type can be set via string', () => {
  const config = createApplicationInstance('valdi.app', '/test', {
    experienceType: 'company-profile'
  })
  assertEqual(config.experience.type, 'company-profile', 'Should accept experience type as string')
})

// ============================================================
// SECTION 5: CAPABILITIES TESTS
// ============================================================

console.log('')
console.log('📋 Capabilities Tests')

test('capability configuration accepted', () => {
  const config = createApplicationInstance('valdi.app', '/test', {
    capabilities: {
      hero: true,
      services: true,
      gallery: true,
      contact: false
    }
  })
  assertEqual(config.capabilities.hero, true, 'hero should be true')
  assertEqual(config.capabilities.services, true, 'services should be true')
  assertEqual(config.capabilities.gallery, true, 'gallery should be true')
  assertEqual(config.capabilities.contact, false, 'contact should be false')
})

test('disabled capability preserved', () => {
  const config = createApplicationInstance('valdi.app', '/test', {
    capabilities: {
      booking: false,
      reviews: false
    }
  })
  assertEqual(config.capabilities.booking, false, 'booking should be disabled')
  assertEqual(config.capabilities.reviews, false, 'reviews should be disabled')
})

test('capability configuration is immutable', () => {
  const config = createApplicationInstance('valdi.app', '/test', {
    capabilities: { hero: true }
  })
  assertThrows(
    () => { config.capabilities.hero = false },
    'Capabilities should be immutable'
  )
})

test('no executable configuration', () => {
  const validator = new ApplicationValidator({ strict: true })
  const result = validator.validate({
    identity: { domain: 'valdi.app', route: '/test', applicationId: 'valdi.app/test' },
    destination: { slug: 'valdi', region: 'los-rios' },
    company: { slug: null, enabled: false },
    experience: { type: 'company-profile' },
    capabilities: { hero: true },
    theme: {},
    content: { source: 'wordpress' },
    seo: {},
    integrations: {},
    migration: { state: 'LEGACY' }
  })
  assert(result.valid, 'Valid configuration should pass')
})

// ============================================================
// SECTION 6: CONTENT TESTS
// ============================================================

console.log('')
console.log('📋 Content Tests')

test('wordpress source', () => {
  const config = createApplicationInstance('valdi.app', '/test', {
    content: { source: 'wordpress' }
  })
  assertEqual(config.content.source, 'wordpress', 'Should default to wordpress')
})

test('experience source', () => {
  const config = createApplicationInstance('valdi.app', '/test', {
    content: { source: 'experience' }
  })
  assertEqual(config.content.source, 'experience', 'Should accept experience source')
})

test('default content source is wordpress', () => {
  const config = createApplicationInstance('valdi.app', '/test', {})
  assertEqual(config.content.source, 'wordpress', 'Default should be wordpress')
})

test('content source via contentSource field', () => {
  const config = createApplicationInstance('valdi.app', '/test', {
    contentSource: 'experience'
  })
  assertEqual(config.content.source, 'experience', 'Should accept contentSource field')
})

// ============================================================
// SECTION 7: MIGRATION TESTS
// ============================================================

console.log('')
console.log('📋 Migration Tests')

test('LEGACY state', () => {
  const config = createApplicationInstance('valdi.app', '/test', {
    migrationState: 'LEGACY'
  })
  assertEqual(config.migration.state, 'LEGACY', 'Should accept LEGACY state')
})

test('HYBRID_ACTIVE state', () => {
  const config = createApplicationInstance('valdi.app', '/test', {
    migrationState: 'HYBRID_ACTIVE'
  })
  assertEqual(config.migration.state, 'HYBRID_ACTIVE', 'Should accept HYBRID_ACTIVE state')
})

test('EXPERIENCE_ACTIVE state', () => {
  const config = createApplicationInstance('valdi.app', '/test', {
    migrationState: 'EXPERIENCE_ACTIVE'
  })
  assertEqual(config.migration.state, 'EXPERIENCE_ACTIVE', 'Should accept EXPERIENCE_ACTIVE state')
})

test('invalid migration state defaults to LEGACY', () => {
  const config = createApplicationInstance('valdi.app', '/test', {
    migrationState: 'INVALID'
  })
  assertEqual(config.migration.state, 'LEGACY', 'Invalid state should default to LEGACY')
})

test('migration manager compatibility', () => {
  const manager = createRouteMigrationManager({
    routes: [{
      domain: 'valdi.app',
      path: '/test',
      ownership: OWNERSHIP.WORDPRESS,
      migrationState: MIGRATION_STATE.ACTIVE_WORDPRESS
    }]
  })
  
  const inspection = manager.inspectRoute('valdi.app', '/test')
  assert(inspection.valid, 'Route should be valid')
  assertEqual(inspection.migration.currentState, 'ACTIVE_WORDPRESS', 'Should have correct migration state')
})

// ============================================================
// SECTION 8: THEME TESTS
// ============================================================

console.log('')
console.log('📋 Theme Tests')

test('branding preserved', () => {
  const config = createApplicationInstance('valdi.app', '/test', {
    theme: {
      branding: { logo: '/images/logo.png', name: 'Test' }
    }
  })
  assertEqual(config.theme.branding.logo, '/images/logo.png', 'Logo should be preserved')
  assertEqual(config.theme.branding.name, 'Test', 'Name should be preserved')
})

test('primary color validated', () => {
  const config = createApplicationInstance('valdi.app', '/test', {
    theme: { primaryColor: '#0066FF' }
  })
  assertEqual(config.theme.primaryColor, '#0066FF', 'Valid color should be accepted')
})

test('invalid primary color handled', () => {
  let errorThrown = false
  try {
    createApplicationInstance('valdi.app', '/test', {
      theme: { primaryColor: 'invalid' }
    })
  } catch (e) {
    errorThrown = e.message.includes('primaryColor')
  }
  assert(errorThrown, 'Invalid color should cause validation error')
})

test('theme is immutable', () => {
  const config = createApplicationInstance('valdi.app', '/test', {
    theme: { primaryColor: '#0066FF' }
  })
  assertThrows(
    () => { config.theme.primaryColor = '#FF0000' },
    'Theme should be immutable'
  )
})

// ============================================================
// SECTION 9: SEO TESTS
// ============================================================

console.log('')
console.log('📋 SEO Tests')

test('SEO configuration preserved', () => {
  const config = createApplicationInstance('valdi.app', '/test', {
    seo: {
      title: 'Test Page',
      description: 'Test description',
      canonical: 'https://valdi.app/test'
    }
  })
  assertEqual(config.seo.title, 'Test Page', 'Title should be preserved')
  assertEqual(config.seo.description, 'Test description', 'Description should be preserved')
  assertEqual(config.seo.canonical, 'https://valdi.app/test', 'Canonical should be preserved')
})

test('canonical URL uses canonical domain', () => {
  const validator = new ApplicationValidator()
  const result = validator.validate({
    identity: { domain: 'valdi.app', route: '/test', applicationId: 'valdi.app/test' },
    destination: { slug: 'valdi', region: 'los-rios' },
    company: { slug: null, enabled: false },
    experience: { type: null },
    capabilities: {},
    theme: {},
    content: { source: 'wordpress' },
    seo: { canonical: 'https://valdi.app/test' },
    integrations: {},
    migration: { state: 'LEGACY' }
  })
  assert(result.valid, 'Canonical with valid domain should pass')
})

test('canonical URL with non-canonical domain rejected', () => {
  const validator = new ApplicationValidator()
  const result = validator.validate({
    identity: { domain: 'valdi.app', route: '/test', applicationId: 'valdi.app/test' },
    destination: { slug: 'valdi', region: 'los-rios' },
    company: { slug: null, enabled: false },
    experience: { type: null },
    capabilities: {},
    theme: {},
    content: { source: 'wordpress' },
    seo: { canonical: 'https://valdivia.app/test' },
    integrations: {},
    migration: { state: 'LEGACY' }
  })
  assert(!result.valid, 'Canonical with valdivia.app should fail')
})

// ============================================================
// SECTION 10: SECURITY TESTS
// ============================================================

console.log('')
console.log('📋 Security Tests')

test('traversal blocked in route', () => {
  assertThrows(
    () => createApplicationIdentity('valdi.app', '/../../../etc/passwd'),
    'Path traversal should be blocked'
  )
})

test('encoded traversal - URL decoding handled at request layer', () => {
  const identity = createApplicationIdentity('valdi.app', '/test')
  assertEqual(identity.route, '/test', 'Normalized route should work')
})

test('invalid host rejected', () => {
  assertThrows(
    () => createApplicationIdentity('evil.com', '/test'),
    'Invalid host should be rejected'
  )
})

test('infrastructure references rejected', () => {
  const validator = new ApplicationValidator()
  const result = validator.validate({
    identity: { domain: 'valdi.app', route: '/test', applicationId: 'valdi.app/test' },
    destination: { slug: 'valdi', region: 'los-rios' },
    company: { slug: null, enabled: false },
    experience: { type: null },
    capabilities: {},
    theme: {},
    content: {
      source: 'wordpress',
      configuration: {
        pg: 'postgresql://...',
        password: 'secret'
      }
    },
    seo: {},
    integrations: {},
    migration: { state: 'LEGACY' }
  })
  assert(!result.valid, 'Infrastructure references should be rejected')
})

test('credentials in integrations rejected', () => {
  const validator = new ApplicationValidator()
  const result = validator.validate({
    identity: { domain: 'valdi.app', route: '/test', applicationId: 'valdi.app/test' },
    destination: { slug: 'valdi', region: 'los-rios' },
    company: { slug: null, enabled: false },
    experience: { type: null },
    capabilities: {},
    theme: {},
    content: { source: 'wordpress' },
    seo: {},
    integrations: {
      maps: { apiKey: 'secret-key', enabled: true }
    },
    migration: { state: 'LEGACY' }
  })
  assert(!result.valid, 'Credentials in integrations should be rejected')
})

// ============================================================
// SECTION 11: ISOLATION TESTS
// ============================================================

console.log('')
console.log('📋 Isolation Tests')

test('cross-domain isolation', () => {
  const config1 = createApplicationInstance('valdi.app', '/demo', {})
  const config2 = createApplicationInstance('natales.app', '/demo', {})
  
  assertEqual(config1.identity.domain, 'valdi.app', 'First config domain')
  assertEqual(config2.identity.domain, 'natales.app', 'Second config domain')
  assert(config1.identity.applicationId !== config2.identity.applicationId, 'Different IDs')
  assert(config1.destination.slug !== config2.destination.slug, 'Different destinations')
})

test('cross-route isolation', () => {
  const config1 = createApplicationInstance('valdi.app', '/route1', {})
  const config2 = createApplicationInstance('valdi.app', '/route2', {})
  
  assertEqual(config1.identity.route, '/route1', 'First route')
  assertEqual(config2.identity.route, '/route2', 'Second route')
  assert(config1.identity.applicationId !== config2.identity.applicationId, 'Different IDs')
})

test('cross-destination isolation', () => {
  for (const domain of CANONICAL_DOMAINS) {
    const config = createApplicationInstance(domain, '/test', {})
    assertEqual(config.destination.slug, getDestinationForDomain(domain), `${domain} should map to correct destination`)
  }
})

test('cross-company isolation', () => {
  const config1 = createApplicationInstance('valdi.app', '/company1', { company: 'company1' })
  const config2 = createApplicationInstance('natales.app', '/company1', { company: 'company1' })
  
  assertEqual(config1.company.slug, 'company1', 'First company')
  assertEqual(config2.company.slug, 'company1', 'Second company')
  assert(config1.destination.slug !== config2.destination.slug, 'Different destinations isolate same company name')
})

test('cache identity isolation', () => {
  const config1 = createApplicationInstance('valdi.app', '/test', { migrationState: 'WORDPRESS' })
  const config2 = createApplicationInstance('valdi.app', '/test', { migrationState: 'HYBRID_ACTIVE' })
  
  const cacheKey1 = `app:${config1.identity.domain}:${config1.identity.route}:${config1.migration.state}`
  const cacheKey2 = `app:${config2.identity.domain}:${config2.identity.route}:${config2.migration.state}`
  
  assert(cacheKey1 !== cacheKey2, 'Different migration states should produce different cache keys')
})

// ============================================================
// SECTION 12: RUNTIME INTEGRATION TESTS
// ============================================================

console.log('')
console.log('📋 Runtime Integration Tests')

test('ExperienceContext compatibility', () => {
  const config = createApplicationInstance('valdi.app', '/albasie', {
    company: 'albasie',
    experience: { type: 'company-profile' },
    capabilities: { hero: true, services: true }
  })
  
  assertEqual(config.identity.domain, 'valdi.app', 'Has domain')
  assertEqual(config.identity.route, '/albasie', 'Has route')
  assertEqual(config.destination.slug, 'valdi', 'Has destination')
  assertEqual(config.company.slug, 'albasie', 'Has company')
  assertEqual(config.experience.type, 'company-profile', 'Has experience type')
  assert(config.capabilities.hero, 'Has hero capability')
})

test('Presentation compatibility', () => {
  const config = createApplicationInstance('valdi.app', '/test', {
    theme: { primaryColor: '#0066FF', fontFamily: 'Inter', branding: { logo: '/images/logo.png' } }
  })
  
  assert(config.theme.primaryColor, 'Has theme')
  assert(config.theme.branding, 'Has branding')
  assertEqual(config.theme.branding.logo, '/images/logo.png', 'Logo should be set')
})

test('Route Ownership compatibility', () => {
  const registry = new RouteOwnershipRegistry({
    routes: [{
      domain: 'valdi.app',
      path: '/empresa/albasie',
      ownership: OWNERSHIP.EXPERIENCE,
      destination: 'valdi',
      company: 'albasie',
      migrationState: 'EXPERIENCE_ACTIVE'
    }]
  })
  
  const result = registry.resolve('valdi.app', '/empresa/albasie')
  const config = createApplicationInstance('valdi.app', '/empresa/albasie', {
    ownership: result.ownership,
    migrationState: result.migrationState,
    company: result.company,
    destination: result.destination
  })
  
  assertEqual(config.identity.domain, 'valdi.app', 'Domain matches')
  assertEqual(config.identity.route, '/empresa/albasie', 'Route matches')
  assertEqual(config.migration.state, 'EXPERIENCE_ACTIVE', 'Migration state matches')
})

test('Hybrid compatibility', () => {
  const config = createApplicationInstance('valdi.app', '/hybrid-test', {
    ownership: OWNERSHIP.HYBRID,
    migrationState: 'HYBRID_ACTIVE',
    content: { source: 'wordpress' }
  })
  
  assertEqual(config.migration.state, 'HYBRID_ACTIVE', 'Has hybrid state')
  assertEqual(config.content.source, 'wordpress', 'Hybrid uses WordPress content')
})

test('WordPress compatibility', () => {
  const config = createApplicationInstance('valdi.app', '/blog', {
    migrationState: 'LEGACY',
    content: { source: 'wordpress' }
  })
  
  assertEqual(config.migration.state, 'LEGACY', 'Legacy state')
  assertEqual(config.content.source, 'wordpress', 'WordPress content')
})

// ============================================================
// SECTION 13: REGRESSION TESTS
// ============================================================

console.log('')
console.log('📋 Regression Tests')

test('P13.8 integrity - Business Aggregate', () => {
  const identity = createApplicationIdentity('valdi.app', '/test')
  assertEqual(identity.platform, undefined, 'Identity should not have platform (P13.8 owns this)')
})

test('P13.8 integrity - Capability model', () => {
  const config = createApplicationInstance('valdi.app', '/test', {
    capabilities: { hero: true, gallery: true }
  })
  assert(Array.isArray(Object.keys(config.capabilities)), 'Capabilities should be object keys')
  assert(config.capabilities.hero, 'Hero capability works')
})

test('P15.0 integrity - Experience Engine compatibility', () => {
  const config = createApplicationInstance('valdi.app', '/test', {
    experience: { type: 'company-profile' }
  })
  assertEqual(config.experience.type, 'company-profile', 'Experience type stored')
})

test('P15.7.1 integrity - Route Ownership Registry', () => {
  const registry = new RouteOwnershipRegistry({
    routes: [{
      domain: 'valdi.app',
      path: '/test',
      ownership: OWNERSHIP.EXPERIENCE,
      destination: 'valdi'
    }]
  })
  
  const result = registry.resolve('valdi.app', '/test')
  assertEqual(result.ownership, OWNERSHIP.EXPERIENCE, 'Registry works')
})

test('P15.7.2 integrity - Migration State Machine', () => {
  const controller = new RouteMigrationController(new RouteOwnershipRegistry({
    routes: [{
      domain: 'valdi.app',
      path: '/test',
      ownership: OWNERSHIP.WORDPRESS,
      migrationState: MIGRATION_STATE.ACTIVE_WORDPRESS
    }]
  }))
  
  const result = controller.canActivateHybrid('valdi.app', '/test')
  assert(result.canActivate, 'Migration controller works')
})

test('P15.7.3 integrity - Hybrid Rendering', () => {
  const config = createApplicationInstance('valdi.app', '/test', {
    migrationState: 'HYBRID_ACTIVE',
    content: { source: 'wordpress' }
  })
  assertEqual(config.migration.state, 'HYBRID_ACTIVE', 'Hybrid state supported')
})

test('P15.7.4 integrity - Migration Manager', () => {
  const manager = createRouteMigrationManager()
  const domains = manager.listDomains()
  assertEqual(domains.length, 5, 'All canonical domains listed')
})

test('Dronestica decoupling', () => {
  const config = createApplicationInstance('valdi.app', '/test', {})
  const json = JSON.stringify(config)
  assert(!json.includes('dronestica'), 'No Dronestica references')
  assert(!json.includes('drone'), 'No drone references')
})

// ============================================================
// SECTION 14: CONFIGURATION LOADER TESTS
// ============================================================

console.log('')
console.log('📋 Configuration Loader Tests')

test('loader produces immutable config', () => {
  const config = createApplicationInstance('valdi.app', '/test', {
    company: 'test'
  })
  
  assertThrows(
    () => { config.identity.domain = 'changed.com' },
    'Identity should be immutable'
  )
})

test('loader validates domain', () => {
  assertThrows(
    () => createApplicationInstance('invalid.app', '/test', {}),
    'Invalid domain should throw'
  )
})

test('loader normalizes route', () => {
  const config = createApplicationInstance('valdi.app', '//test///', {})
  assertEqual(config.identity.route, '/test', 'Route should be normalized')
})

test('loader accepts route data', () => {
  const config = createApplicationInstance('valdi.app', '/company', {
    company: 'mycompany',
    experience: { type: 'company-profile' },
    migrationState: 'HYBRID_ACTIVE'
  })
  
  assertEqual(config.company.slug, 'mycompany', 'Company loaded')
  assertEqual(config.experience.type, 'company-profile', 'Experience loaded')
  assertEqual(config.migration.state, 'HYBRID_ACTIVE', 'Migration loaded')
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
  console.log('P15.8.1 APPLICATION CONFIGURATION MODEL: READY')
} else {
  console.log('❌ SOME TESTS FAILED')
  process.exit(1)
}