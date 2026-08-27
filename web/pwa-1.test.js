/**
 * PWA-1 — InstallableApp Capability & PWA Integration
 *
 * Tests the installableApp capability integration:
 * - installableApp capability registration and configuration
 * - PWA manifest generation per tenant
 * - Service worker scope and registration
 * - Install CTA component rendering
 * - Quote regression (calculate + submit must still work)
 *
 * Framework-free implementation.
 */

import { createApplicationPresentationRenderer } from './application/application.presentation.renderer.js'
import { createApplicationPresentationAdapter } from './application/application.presentation.adapter.js'
import { HtmlRenderer, createHtmlRenderer } from './rendering/html.renderer.js'
import { createPWAMiddleware, generateManifest } from './middleware/pwa.middleware.js'

const TEST_ID = 'PWA-1'

let passed = 0
let failed = 0
const testPromises = []

function test(name, fn) {
  testPromises.push((async () => {
    try {
      await fn()
      console.log(`  ✅ ${name}`)
      passed++
    } catch (error) {
      console.log(`  ❌ ${name}`)
      console.log(`     Error: ${error.message}`)
      if (error.stack) {
        console.log(`     Stack: ${error.stack.split('\n')[1] || ''}`)
      }
      failed++
    }
  })())
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed')
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message || 'Assertion failed'}: expected ${expected}, got ${actual}`)
  }
}

function assertNotEqual(actual, expected, message) {
  if (actual === expected) {
    throw new Error(`${message || 'Assertion failed'}: actual should not equal ${expected}`)
  }
}

function assertContains(str, substring, message) {
  if (!str || !str.includes(substring)) {
    throw new Error(`${message || 'String assertion failed'}: expected "${str}" to contain "${substring}"`)
  }
}

function assertNotContains(str, substring, message) {
  if (str && str.includes(substring)) {
    throw new Error(`${message || 'String assertion failed'}: expected "${str}" to NOT contain "${substring}"`)
  }
}

console.log('\n📋 PWA-1 — InstallableApp Capability & PWA Integration\n')

// ============================================================================
// TEST 1: installableApp Capability Registration
// ============================================================================

console.log('Test 1 — installableApp Capability Registration')
console.log('──────────────────────────────────────────────────')

test('installableApp capability has PLATFORM type', async () => {
  const { CapabilityRegistry } = await import('./application/capabilities/capability.registry.js')
  const registry = CapabilityRegistry.createDefault()
  const cap = registry.get('installableApp')
  assert(cap !== null, 'installableApp capability should be registered')
  assertEqual(cap.type, 'platform', 'installableApp should have PLATFORM type')
})

test('installableApp capability has configuration schema', async () => {
  const { CapabilityRegistry } = await import('./application/capabilities/capability.registry.js')
  const registry = CapabilityRegistry.createDefault()
  const cap = registry.get('installableApp')
  assert(cap.configurationSchema !== null, 'installableApp should have configurationSchema')
  assertEqual(typeof cap.configurationSchema, 'object', 'configurationSchema should be an object')
})

test('installableApp capability is compatible with all application types', async () => {
  const { CapabilityRegistry } = await import('./application/capabilities/capability.registry.js')
  const registry = CapabilityRegistry.createDefault()
  const cap = registry.get('installableApp')
  const expectedTypes = ['company-profile', 'tourism-destination', 'accommodation', 'restaurant', 'tour', 'real-estate', 'boat', 'professional-service']
  assertEqual(cap.compatibleApplicationTypes.length, expectedTypes.length, 'Should have 8 compatible types')
})

// ============================================================================
// TEST 2: PWA Manifest Generation
// ============================================================================

console.log('\nTest 2 — PWA Manifest Generation')
console.log('──────────────────────────────────────────────────')

test('generateManifest creates valid manifest structure', () => {
  const manifest = generateManifest({ slug: 'albasie', name: 'Albasie' })
  assert(manifest.name === 'Albasie', 'Manifest should have correct name')
  assertEqual(manifest.short_name, 'Valdi', 'Manifest should have short_name')
  assertEqual(manifest.start_url, '/albasie/', 'start_url should be /albasie/')
  assertEqual(manifest.scope, '/albasie/', 'scope should be /albasie/')
  assertEqual(manifest.display, 'standalone', 'display should be standalone')
})

test('generateManifest uses tenant config for customization', () => {
  const tenant = {
    slug: 'albasie',
    name: 'Albasie Tourism',
    description: 'Tour operator in Valdivia',
    pwa: {
      shortName: 'Albasie App',
      themeColor: '#2d5a27',
      backgroundColor: '#ffffff'
    }
  }
  const manifest = generateManifest(tenant)
  assertEqual(manifest.name, 'Albasie Tourism', 'Name from tenant')
  assertEqual(manifest.short_name, 'Albasie App', 'shortName from pwa config')
  assertEqual(manifest.description, 'Tour operator in Valdivia', 'Description from tenant')
  assertEqual(manifest.theme_color, '#2d5a27', 'themeColor from pwa config')
  assertEqual(manifest.background_color, '#ffffff', 'backgroundColor from pwa config')
})

test('generateManifest sets correct id for tenant', () => {
  const manifest = generateManifest({ slug: 'albasie', domain: 'valdi.app' })
  assertEqual(manifest.id, '/tenant/valdi.app/albasie', 'Manifest id should be /tenant/valdi.app/albasie')
})

test('generateManifest uses default values when not configured', () => {
  const manifest = generateManifest({})
  assertEqual(manifest.short_name, 'Valdi', 'Should use default short_name')
  assertEqual(manifest.display, 'standalone', 'Should use default display')
})

// ============================================================================
// TEST 3: ApplicationPresentationRenderer PWA Integration
// ============================================================================

console.log('\nTest 3 — ApplicationPresentationRenderer PWA Integration')
console.log('──────────────────────────────────────────────────')

test('ApplicationPresentationAdapter extracts PWA config', () => {
  const adapter = createApplicationPresentationAdapter()
  const mockContext = {
    capabilities: [
      { name: 'installableApp', version: '1.0.0', type: 'platform', configuration: { enabled: true } }
    ],
    company: { slug: 'albasie', name: 'Albasie' },
    identity: { domain: 'albasie.app' }
  }

  const adapted = adapter.adapt(mockContext)
  assert(adapted.pwa !== undefined, 'Adapted context should have pwa field')
  assertEqual(adapted.pwa.enabled, true, 'PWA should be enabled')
})

test('ApplicationPresentationAdapter returns disabled PWA when not configured', () => {
  const adapter = createApplicationPresentationAdapter()
  const mockContext = {
    capabilities: [],
    company: { slug: 'albasie', name: 'Albasie' },
    identity: { domain: 'albasie.app' }
  }

  const adapted = adapter.adapt(mockContext)
  assertEqual(adapted.pwa.enabled, false, 'PWA should be disabled when not configured')
})

test('ApplicationPresentationRenderer includes PWA in presentation output', () => {
  const mockPresentation = {
    success: true,
    presentation: {
      identity: { domain: 'albasie.app', route: '/empresa/albasie' },
      destination: { slug: 'valdi' },
      capabilities: [
        { name: 'installableApp', version: '1.0.0', type: 'platform', configuration: { enabled: true } }
      ],
      company: { slug: 'albasie', name: 'Albasie' },
      branding: { name: 'Albasie' },
      theme: {},
      navigation: {},
      seo: {},
      contact: {},
      modules: [],
      experience: { sections: [] }
    }
  }

  const adapter = createApplicationPresentationAdapter()
  const adapted = adapter.adapt(mockPresentation.presentation)
  assert(adapted.pwa !== undefined, 'Should have pwa in adapted presentation')
})

// ============================================================================
// TEST 4: PWA Middleware
// ============================================================================

console.log('\nTest 4 — PWA Middleware')
console.log('──────────────────────────────────────────────────')

test('PWA middleware handles /pwa/:slug/manifest.json', async () => {
  const middleware = createPWAMiddleware()
  const mockReq = { pathname: '/pwa/valdi__DOT__app__SLASH__albasie/manifest.json', domain: 'valdi.app' }
  let handled = false
  let body

  const mockRes = {
    statusCode: 200,
    setHeader: () => {},
    end: (b) => { body = b; handled = true; }
  }

  await middleware(mockReq, mockRes, () => {})

  assert(handled, 'Middleware should have handled the request')
  const manifest = JSON.parse(body)
  assertEqual(manifest.id, '/tenant/valdi.app/albasie', 'Manifest should have correct id')
  assertEqual(manifest.scope, '/albasie/', 'Manifest scope should be /albasie/')
})

test('PWA middleware handles /sw-:slug.js', async () => {
  const middleware = createPWAMiddleware()
  const mockReq = { pathname: '/sw-albasie.js' }
  let handled = false
  let body

  const mockRes = {
    statusCode: 200,
    setHeader: () => {},
    end: (b) => { body = b; handled = true; }
  }

  await middleware(mockReq, mockRes, () => {})

  assert(handled, 'Middleware should have handled SW request')
  assertContains(body, 'app-cache-valdi_app_albasie', 'SW should have tenant-scoped cache name')
  assertContains(body, 'self.skipWaiting', 'SW should have skipWaiting handler')
})

test('PWA middleware passes through non-PWA routes', async () => {
  const middleware = createPWAMiddleware()
  const mockReq = { pathname: '/some-other-route' }
  let nextCalled = false

  const mockRes = {}

  await middleware(mockReq, mockRes, () => { nextCalled = true })

  assert(nextCalled, 'Middleware should call next for non-PWA routes')
})

// ============================================================================
// TEST 5: HtmlRenderer PWA Integration
// ============================================================================

console.log('\nTest 5 — HtmlRenderer PWA Integration')
console.log('──────────────────────────────────────────────────')

test('HtmlRenderer includes PWA manifest link when enabled', () => {
  const renderer = createHtmlRenderer()
  const presentation = {
    identity: { applicationId: 'albasie.app/empresa/albasie', domain: 'albasie.app', route: '/empresa/albasie' },
    destination: { slug: 'valdi', name: 'Valdivia' },
    pwa: {
      enabled: true,
      manifestUrl: '/pwa/albasie/manifest.json',
      serviceWorkerUrl: '/sw-albasie.js',
      serviceWorkerScope: '/albasie/'
    },
    branding: { name: 'Albasie' },
    navigation: { header: { items: [] }, footer: { columns: [] } },
    seo: {},
    contact: {},
    modules: [],
    experience: { sections: [] },
    metadata: { language: 'es', locale: 'es-CL' }
  }

  const html = renderer.render(presentation)
  assertContains(html, 'link rel="manifest" href="/pwa/albasie/manifest.json"', 'Should include PWA manifest link')
})

test('HtmlRenderer renders PWA service worker registration', () => {
  const renderer = createHtmlRenderer()
  const presentation = {
    identity: { applicationId: 'albasie.app/empresa/albasie', domain: 'albasie.app', route: '/empresa/albasie' },
    destination: { slug: 'valdi', name: 'Valdivia' },
    pwa: {
      enabled: true,
      manifestUrl: '/pwa/albasie/manifest.json',
      serviceWorkerUrl: '/sw-albasie.js',
      serviceWorkerScope: '/albasie/'
    },
    branding: { name: 'Albasie' },
    navigation: { header: { items: [] }, footer: { columns: [] } },
    seo: {},
    contact: {},
    modules: [],
    experience: { sections: [] },
    metadata: { language: 'es', locale: 'es-CL' }
  }

  const html = renderer.render(presentation)
  assertContains(html, "navigator.serviceWorker.register('/sw-albasie.js'", 'Should register SW')
  assertContains(html, "scope: '/albasie/'", 'Should use correct SW scope')
})

test('HtmlRenderer does not include PWA when disabled', () => {
  const renderer = createHtmlRenderer()
  const presentation = {
    identity: { applicationId: 'albasie.app/empresa/albasie', domain: 'albasie.app', route: '/empresa/albasie' },
    destination: { slug: 'valdi', name: 'Valdivia' },
    pwa: { enabled: false },
    branding: { name: 'Albasie' },
    navigation: { header: { items: [] }, footer: { columns: [] } },
    seo: {},
    contact: {},
    modules: [],
    experience: { sections: [] },
    metadata: { language: 'es', locale: 'es-CL' }
  }

  const html = renderer.render(presentation)
  assertNotContains(html, 'serviceWorker.register', 'Should NOT register SW when disabled')
})

// ============================================================================
// TEST 6: Install CTA Component
// ============================================================================

console.log('\nTest 6 — Install CTA Component')
console.log('──────────────────────────────────────────────────')

test('Install CTA is rendered when PWA is enabled', () => {
  const renderer = createHtmlRenderer()
  const presentation = {
    identity: { applicationId: 'albasie.app/empresa/albasie', domain: 'albasie.app', route: '/empresa/albasie' },
    destination: { slug: 'valdi', name: 'Valdivia' },
    pwa: {
      enabled: true,
      config: { shortName: 'Albasie' }
    },
    branding: { name: 'Albasie' },
    navigation: { header: { items: [] }, footer: { columns: [] } },
    seo: {},
    contact: {},
    modules: [],
    experience: { sections: [] },
    metadata: { language: 'es', locale: 'es-CL' }
  }

  const html = renderer.render(presentation)
  assertContains(html, 'install-pwa-banner', 'Should render install CTA banner')
  assertContains(html, 'pwa-install-btn', 'Should render install button')
})

test('Install CTA is NOT rendered when PWA is disabled', () => {
  const renderer = createHtmlRenderer()
  const presentation = {
    identity: { applicationId: 'albasie.app/empresa/albasie', domain: 'albasie.app', route: '/empresa/albasie' },
    destination: { slug: 'valdi', name: 'Valdivia' },
    pwa: { enabled: false },
    branding: { name: 'Albasie' },
    navigation: { header: { items: [] }, footer: { columns: [] } },
    seo: {},
    contact: {},
    modules: [],
    experience: { sections: [] },
    metadata: { language: 'es', locale: 'es-CL' }
  }

  const html = renderer.render(presentation)
  assertNotContains(html, 'install-pwa-banner', 'Should NOT render install CTA when disabled')
})

test('Install CTA uses shortName from config', () => {
  const renderer = createHtmlRenderer()
  const presentation = {
    identity: { applicationId: 'albasie.app/empresa/albasie', domain: 'albasie.app', route: '/empresa/albasie' },
    destination: { slug: 'valdi', name: 'Valdivia' },
    pwa: {
      enabled: true,
      config: { shortName: 'My App' }
    },
    branding: { name: 'Albasie' },
    navigation: { header: { items: [] }, footer: { columns: [] } },
    seo: {},
    contact: {},
    modules: [],
    experience: { sections: [] },
    metadata: { language: 'es', locale: 'es-CL' }
  }

  const html = renderer.render(presentation)
  assertContains(html, 'Instala My App', 'Should use shortName from config')
})

// ============================================================================
// TEST 7: Quote Regression
// ============================================================================

console.log('\nTest 7 — Quote Regression (calculate + submit must work)')
console.log('──────────────────────────────────────────────────')

test('Quote API config is still included in viewModel', () => {
  const renderer = createHtmlRenderer()
  const presentation = {
    identity: { applicationId: 'albasie.app/empresa/albasie', domain: 'albasie.app', route: '/empresa/albasie', company: 'albasie', destination: 'valdi' },
    destination: { slug: 'valdi', name: 'Valdivia' },
    pwa: { enabled: true },
    branding: { name: 'Albasie' },
    navigation: { header: { items: [] }, footer: { columns: [] } },
    seo: {},
    contact: {},
    modules: [],
    experience: { sections: [] },
    metadata: { language: 'es', locale: 'es-CL' },
    quote: { enabled: true }
  }

  const html = renderer.render(presentation)
  assertContains(html, 'window.quoteAPIConfig', 'Quote API config should be present')
  assertContains(html, "applicationId: 'albasie.app/empresa/albasie'", 'Quote should have correct applicationId')
})

test('Quote form handling code is still present', () => {
  const renderer = createHtmlRenderer()
  const presentation = {
    identity: { applicationId: 'albasie.app/empresa/albasie', domain: 'albasie.app', route: '/empresa/albasie' },
    destination: { slug: 'valdi', name: 'Valdivia' },
    pwa: { enabled: true },
    branding: { name: 'Albasie' },
    navigation: { header: { items: [] }, footer: { columns: [] } },
    seo: {},
    contact: {},
    modules: [],
    experience: { sections: [] },
    metadata: { language: 'es', locale: 'es-CL' },
    quote: { enabled: true }
  }

  const html = renderer.render(presentation)
  assertContains(html, 'quote-calculate', 'Quote calculate button handler should be present')
  assertContains(html, 'quote-submit', 'Quote submit button handler should be present')
})

test('Quote calculate and submit work independently of PWA', () => {
  const renderer = createHtmlRenderer()
  const presentation = {
    identity: { applicationId: 'albasie.app/empresa/albasie', domain: 'albasie.app', route: '/empresa/albasie' },
    destination: { slug: 'valdi', name: 'Valdivia' },
    pwa: {
      enabled: true,
      serviceWorkerUrl: '/sw-albasie.js',
      serviceWorkerScope: '/albasie/'
    },
    branding: { name: 'Albasie' },
    navigation: { header: { items: [] }, footer: { columns: [] } },
    seo: {},
    contact: {},
    modules: [],
    experience: { sections: [] },
    metadata: { language: 'es', locale: 'es-CL' },
    quote: { enabled: true }
  }

  const html = renderer.render(presentation)

  assertContains(html, 'navigator.serviceWorker.register', 'PWA SW registration present')
  assertContains(html, 'handleCalculate', 'Quote calculate handler present')
  assertContains(html, 'handleSubmit', 'Quote submit handler present')
})

// ============================================================================
// SUMMARY
// ============================================================================

async function runSummary() {
  await Promise.all(testPromises)
  console.log('\n──────────────────────────────────────────────────')
  console.log(`📊 PWA-1 Results: ${passed} passed, ${failed} failed`)

  if (failed > 0) {
    console.log(`❌ PWA-1 FAILED with ${failed} test failures`)
    process.exitCode = 1
  } else {
    console.log('✅ PWA-1 PASSED - All tests successful')
    process.exitCode = 0
  }
}

runSummary().catch(err => {
  console.error('Error running tests:', err)
  process.exitCode = 1
})
