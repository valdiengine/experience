/**
 * Visual Identity Contract Tests
 *
 * PWA-PER-APPLICATION GATE 2A
 *
 * Tests the per-application visual identity configuration contract:
 * - Manifest icons per-app configuration
 * - HTML favicon per-app configuration
 * - HTML apple-touch-icon per-app configuration
 * - HTML theme-color per-app configuration
 * - iOS home screen meta tags
 * - Malformed path rejection
 * - Fallback behavior
 * - Cross-app isolation
 *
 * Framework-free implementation.
 */

import { generateManifest } from './middleware/pwa.middleware.js'
import { createApplicationPresentationAdapter } from './application/application.presentation.adapter.js'
import { renderDocument } from './templates/document.template.js'

const TEST_ID = 'VISUAL-IDENTITY'

let passed = 0
let failed = 0
const testPromises = []

function test(name, fn) {
  testPromises.push((async () => {
    console.log(`  [DEBUG] Running test: ${name}`)
    try {
      await fn()
      console.log(`  ✅ ${name}`)
      passed++
    } catch (error) {
      console.log(`  ❌ ${name}`)
      console.log(`     Error: ${error.message}`)
      failed++
    }
  })())
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed')
  }
}

function assertContains(body, substring, message) {
  if (!body.includes(substring)) {
    throw new Error(`${message || 'Substring not found'}: "${substring}"`)
  }
}

function assertNotContains(body, substring, message) {
  if (body.includes(substring)) {
    throw new Error(`${message || 'Unexpected substring found'}: "${substring}"`)
  }
}

// ============================================================================
// TEST FIXTURES
// ============================================================================

// generateManifest expects tenant.pwa.icons for icon configuration
const VISUAL_A_CONFIG = {
  id: 'valdi-app-test-visual-a',
  name: 'Test Visual A',
  slug: 'test-visual-a',
  domain: 'valdi.app',
  route: '/test-visual-a',
  capabilities: ['pwa'],
  branding: {
    logo: null,
    favicon: null,
    colors: {
      primary: '#123456',
      secondary: '#abcdef',
      accent: '#fedcba'
    }
  },
  pwa: {
    name: 'Test Visual A App',
    shortName: 'VisA',
    description: 'Test fixture A',
    display: 'standalone',
    themeColor: '#123456',
    backgroundColor: '#0a0a0a',
    startUrl: '/test-visual-a/',
    scope: '/test-visual-a/',
    offlineFallback: '/test-visual-a/offline.html',
    icons: [
      { src: '/apps/valdi/test-visual-a/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/apps/valdi/test-visual-a/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/apps/valdi/test-visual-a/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ],
    favicon: '/apps/valdi/test-visual-a/favicon.png',
    appleTouchIcon: '/apps/valdi/test-visual-a/apple-touch-icon.png'
  }
}

const VISUAL_B_CONFIG = {
  id: 'valdi-app-test-visual-b',
  name: 'Test Visual B',
  slug: 'test-visual-b',
  domain: 'valdi.app',
  route: '/test-visual-b',
  capabilities: ['pwa'],
  branding: {
    logo: null,
    favicon: null,
    colors: {
      primary: '#654321',
      secondary: '#fedcba',
      accent: '#abcdef'
    }
  },
  pwa: {
    name: 'Test Visual B App',
    shortName: 'VisB',
    description: 'Test fixture B',
    display: 'standalone',
    themeColor: '#654321',
    backgroundColor: '#1a1a1a',
    startUrl: '/test-visual-b/',
    scope: '/test-visual-b/',
    offlineFallback: '/test-visual-b/offline.html',
    icons: [
      { src: '/apps/valdi/test-visual-b/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/apps/valdi/test-visual-b/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/apps/valdi/test-visual-b/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ],
    favicon: '/apps/valdi/test-visual-b/favicon.png',
    appleTouchIcon: '/apps/valdi/test-visual-b/apple-touch-icon.png'
  }
}

const NO_VISUAL_CONFIG = {
  id: 'valdi-app-no-visual',
  name: 'No Visual Config',
  slug: 'no-visual',
  domain: 'valdi.app',
  route: '/no-visual',
  capabilities: ['pwa'],
  branding: {
    logo: null,
    favicon: null,
    colors: {
      primary: '#999999'
    }
  },
  pwa: {
    name: 'No Visual App',
    shortName: 'NoVis',
    description: 'App without visual config',
    display: 'standalone',
    startUrl: '/no-visual/',
    scope: '/no-visual/',
    offlineFallback: '/no-visual/offline.html'
  }
}

const MALFORMED_ICONS_CONFIG = {
  id: 'valdi-app-malformed',
  name: 'Malformed Icons',
  slug: 'malformed',
  domain: 'valdi.app',
  route: '/malformed',
  capabilities: ['pwa'],
  pwa: {
    name: 'Malformed App',
    shortName: 'Mal',
    icons: [
      { src: '../secret.png', sizes: '192x192', type: 'image/png' },
      { src: 'javascript:alert(1)', sizes: '192x192', type: 'image/png' },
      { src: '/valid-icon.png', sizes: '192x192', type: 'image/png' }
    ]
  }
}

// ============================================================================
// TEST GROUP 1: Manifest Icon Configuration
// ============================================================================

console.log(`\n${TEST_ID} — Manifest Icon Configuration`)
console.log('────────────────────────────────────────')

test('configured manifest uses configured icons', async () => {
  const manifest = generateManifest(VISUAL_A_CONFIG, 'valdi.app')

  assert(manifest.icons.length === 3, 'Should have 3 configured icons')
  assert(manifest.icons[0].src === '/apps/valdi/test-visual-a/icons/icon-192.png', 'Icon 192 src should match')
  assert(manifest.icons[1].src === '/apps/valdi/test-visual-a/icons/icon-512.png', 'Icon 512 src should match')
  assert(manifest.icons[2].src === '/apps/valdi/test-visual-a/icons/icon-512-maskable.png', 'Icon 512 maskable src should match')
})

test('192 entry preserved with purpose=any', async () => {
  const manifest = generateManifest(VISUAL_A_CONFIG, 'valdi.app')

  const icon192 = manifest.icons.find(i => i.sizes === '192x192')
  assert(icon192, '192x192 icon should exist')
  assert(icon192.purpose === 'any', '192 icon purpose should be "any"')
  assert(icon192.type === 'image/png', '192 icon type should be image/png')
})

test('512 any entry preserved with purpose=any', async () => {
  const manifest = generateManifest(VISUAL_A_CONFIG, 'valdi.app')

  const icon512any = manifest.icons.find(i => i.sizes === '512x512' && i.purpose === 'any')
  assert(icon512any, '512x512 any icon should exist')
  assert(icon512any.purpose === 'any', '512 any icon purpose should be "any"')
})

test('maskable entry preserved with purpose=maskable', async () => {
  const manifest = generateManifest(VISUAL_A_CONFIG, 'valdi.app')

  const iconMaskable = manifest.icons.find(i => i.purpose === 'maskable')
  assert(iconMaskable, 'Maskable icon should exist')
  assert(iconMaskable.sizes === '512x512', 'Maskable icon should be 512x512')
  assert(iconMaskable.purpose === 'maskable', 'Maskable icon purpose should be "maskable"')
})

// ============================================================================
// TEST GROUP 2: Fallback Manifest Icons
// ============================================================================

console.log(`\n${TEST_ID} — Fallback Manifest Icons`)
console.log('────────────────────────────────────')

test('fallback manifest uses DEFAULT_ICONS when no icons configured', async () => {
  const manifest = generateManifest(NO_VISUAL_CONFIG)

  const DEFAULT_ICONS = [
    { src: '/icons/icon-72x72.png', sizes: '72x72', type: 'image/png' },
    { src: '/icons/icon-96x96.png', sizes: '96x96', type: 'image/png' },
    { src: '/icons/icon-128x128.png', sizes: '128x128', type: 'image/png' },
    { src: '/icons/icon-144x144.png', sizes: '144x144', type: 'image/png' },
    { src: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
    { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
    { src: '/icons/icon-384x384.png', sizes: '384x384', type: 'image/png' },
    { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
  ]

  assert(manifest.icons.length === DEFAULT_ICONS.length, `Should use ${DEFAULT_ICONS.length} DEFAULT_ICONS`)
  assert(manifest.icons[5].src === '/icons/icon-192x192.png', '192x192 icon should be at index 5')
})

// ============================================================================
// TEST GROUP 3: HTML Favicon Rendering
// ============================================================================

console.log(`\n${TEST_ID} — HTML Favicon Rendering`)
console.log('───────────────────────────────────')

test('configured favicon appears in HTML', async () => {
  const adapter = createApplicationPresentationAdapter()
  const ctx = {
    capabilities: [{ name: 'installableApp', configuration: VISUAL_A_CONFIG.pwa }],
    company: { slug: 'test-visual-a', name: 'Test Visual A', branding: VISUAL_A_CONFIG.branding },
    identity: { domain: 'valdi.app', route: '/test-visual-a' },
    metadata: { applicationId: 'valdi.app/test-visual-a' }
  }

  const vm = adapter.adapt(ctx)
  const html = renderDocument({
    title: 'Test',
    description: 'Test',
    favicon: vm.pwa.config.favicon
  })

  assertContains(html, '/apps/valdi/test-visual-a/favicon.png', 'Favicon path should appear in HTML')
  assertContains(html, 'rel="icon"', 'Should have icon link rel')
})

test('no favicon tag rendered when favicon is null', async () => {
  const html = renderDocument({
    title: 'Test',
    description: 'Test',
    favicon: null
  })

  assertNotContains(html, 'rel="icon"', 'No icon tag should be rendered when favicon is null')
  assertNotContains(html, 'rel="apple-touch-icon"', 'No apple-touch-icon tag either')
})

// ============================================================================
// TEST GROUP 4: HTML Apple-Touch-Icon Rendering
// ============================================================================

console.log(`\n${TEST_ID} — HTML Apple-Touch-Icon Rendering`)
console.log('────────────────────────────────────────────')

test('configured apple-touch-icon appears in HTML', async () => {
  const adapter = createApplicationPresentationAdapter()
  const ctx = {
    capabilities: [{ name: 'installableApp', configuration: VISUAL_A_CONFIG.pwa }],
    company: { slug: 'test-visual-a', name: 'Test Visual A', branding: VISUAL_A_CONFIG.branding },
    identity: { domain: 'valdi.app', route: '/test-visual-a' },
    metadata: { applicationId: 'valdi.app/test-visual-a' }
  }

  const vm = adapter.adapt(ctx)
  const html = renderDocument({
    title: 'Test',
    description: 'Test',
    appleTouchIcon: vm.pwa.config.appleTouchIcon
  })

  assertContains(html, '/apps/valdi/test-visual-a/apple-touch-icon.png', 'Apple-touch-icon path should appear in HTML')
  assertContains(html, 'rel="apple-touch-icon"', 'Should have apple-touch-icon link rel')
})

test('no apple-touch-icon tag rendered when appleTouchIcon is null', async () => {
  const html = renderDocument({
    title: 'Test',
    description: 'Test',
    appleTouchIcon: null
  })

  assertNotContains(html, 'rel="apple-touch-icon"', 'No apple-touch-icon tag should be rendered')
})

// ============================================================================
// TEST GROUP 5: HTML Theme-Color Rendering
// ============================================================================

console.log(`\n${TEST_ID} — HTML Theme-Color Rendering`)
console.log('───────────────────────────────────────')

test('configured theme-color appears in HTML', async () => {
  const adapter = createApplicationPresentationAdapter()
  const ctx = {
    capabilities: [{ name: 'installableApp', configuration: VISUAL_A_CONFIG.pwa }],
    company: { slug: 'test-visual-a', name: 'Test Visual A', branding: VISUAL_A_CONFIG.branding },
    identity: { domain: 'valdi.app', route: '/test-visual-a' },
    metadata: { applicationId: 'valdi.app/test-visual-a' }
  }

  const vm = adapter.adapt(ctx)
  const html = renderDocument({
    title: 'Test',
    description: 'Test',
    themeColor: vm.pwa.config.themeColor
  })

  assertContains(html, 'name="theme-color"', 'Should have theme-color meta tag')
  assertContains(html, '#123456', 'Theme color value should appear')
})

test('no theme-color tag rendered when themeColor is null', async () => {
  const html = renderDocument({
    title: 'Test',
    description: 'Test',
    themeColor: null
  })

  assertNotContains(html, 'name="theme-color"', 'No theme-color tag should be rendered')
})

// ============================================================================
// TEST GROUP 6: iOS Home Screen Meta Tags
// ============================================================================

console.log(`\n${TEST_ID} — iOS Home Screen Meta Tags`)
console.log('───────────────────────────────────────')

test('iOS meta tags rendered when appleWebApp.capable is true', async () => {
  const html = renderDocument({
    title: 'Test',
    description: 'Test',
    appleWebApp: {
      capable: true,
      title: 'Test App',
      statusBarStyle: 'black-translucent'
    }
  })

  assertContains(html, 'name="apple-mobile-web-app-capable"', 'Should have web app capable meta')
  assertContains(html, 'content="yes"', 'web-app-capable should be yes')
  assertContains(html, 'name="apple-mobile-web-app-title"', 'Should have title meta')
  assertContains(html, 'content="Test App"', 'Title should match')
  assertContains(html, 'name="apple-mobile-web-app-status-bar-style"', 'Should have status bar style meta')
  assertContains(html, 'black-translucent', 'Status bar style should match')
})

test('no iOS meta tags rendered when appleWebApp is null', async () => {
  const html = renderDocument({
    title: 'Test',
    description: 'Test',
    appleWebApp: null
  })

  assertNotContains(html, 'apple-mobile-web-app-capable', 'No iOS meta tags should be rendered')
})

// ============================================================================
// TEST GROUP 7: Cross-App Visual Isolation
// ============================================================================

console.log(`\n${TEST_ID} — Cross-App Visual Isolation`)
console.log('───────────────────────────────────────')

test('app B does not inherit app A icons', async () => {
  const manifestA = generateManifest(VISUAL_A_CONFIG)
  const manifestB = generateManifest(VISUAL_B_CONFIG)

  const iconSrcsA = manifestA.icons.map(i => i.src)
  const iconSrcsB = manifestB.icons.map(i => i.src)

  assert(!iconSrcsA.some(src => src.includes('test-visual-b')), 'App A should not have App B icons')
  assert(!iconSrcsB.some(src => src.includes('test-visual-a')), 'App B should not have App A icons')

  assert(iconSrcsA.every(src => src.includes('test-visual-a')), 'App A icons should all reference test-visual-a')
  assert(iconSrcsB.every(src => src.includes('test-visual-b')), 'App B icons should all reference test-visual-b')
})

test('app B does not inherit app A theme color', async () => {
  const adapter = createApplicationPresentationAdapter()

  const ctxA = {
    capabilities: [{ name: 'installableApp', configuration: VISUAL_A_CONFIG.pwa }],
    company: { slug: 'test-visual-a', name: 'Test Visual A', branding: VISUAL_A_CONFIG.branding },
    identity: { domain: 'valdi.app', route: '/test-visual-a' },
    metadata: { applicationId: 'valdi.app/test-visual-a' }
  }

  const ctxB = {
    capabilities: [{ name: 'installableApp', configuration: VISUAL_B_CONFIG.pwa }],
    company: { slug: 'test-visual-b', name: 'Test Visual B', branding: VISUAL_B_CONFIG.branding },
    identity: { domain: 'valdi.app', route: '/test-visual-b' },
    metadata: { applicationId: 'valdi.app/test-visual-b' }
  }

  const vmA = adapter.adapt(ctxA)
  const vmB = adapter.adapt(ctxB)

  assert(vmA.pwa.config.themeColor === '#123456', 'App A should have theme #123456')
  assert(vmB.pwa.config.themeColor === '#654321', 'App B should have theme #654321')
})

// ============================================================================
// TEST GROUP 8: Fallback Behavior
// ============================================================================

console.log(`\n${TEST_ID} — Fallback Behavior`)
console.log('────────────────────────────────')

test('app without visual config receives fallback themeColor from company', async () => {
  const adapter = createApplicationPresentationAdapter()
  const ctx = {
    capabilities: [{ name: 'installableApp', configuration: NO_VISUAL_CONFIG.pwa }],
    company: {
      slug: 'no-visual',
      name: 'No Visual',
      branding: { colors: { primary: '#999999' } }
    },
    identity: { domain: 'valdi.app', route: '/no-visual' },
    metadata: { applicationId: 'valdi.app/no-visual' }
  }

  const vm = adapter.adapt(ctx)

  assert(vm.pwa.config.themeColor === '#999999', 'Should fallback to company primary color')
})

// ============================================================================
// TEST GROUP 9: Malformed Path Rejection
// ============================================================================

console.log(`\n${TEST_ID} — Malformed Path Rejection`)
console.log('──────────────────────────────────────')

test('malformed traversal icon path rejected', async () => {
  const adapter = createApplicationPresentationAdapter()
  const ctx = {
    capabilities: [{
      name: 'installableApp',
      configuration: {
        enabled: true,
        name: 'Malformed',
        shortName: 'Mal',
        icons: [
          { src: '../etc/passwd', sizes: '192x192', type: 'image/png' },
          { src: '/valid.png', sizes: '192x192', type: 'image/png' }
        ]
      }
    }],
    company: { slug: 'malformed', name: 'Malformed' },
    identity: { domain: 'valdi.app', route: '/malformed' },
    metadata: { applicationId: 'valdi.app/malformed' }
  }

  const vm = adapter.adapt(ctx)

  assert(vm.pwa.config.icons.length === 1, 'Traversal path should be rejected, only valid icon kept')
  assert(vm.pwa.config.icons[0].src === '/valid.png', 'Valid icon should be retained')
})

test('javascript URL rejected in icon path', async () => {
  const adapter = createApplicationPresentationAdapter()
  const ctx = {
    capabilities: [{
      name: 'installableApp',
      configuration: {
        enabled: true,
        name: 'Malformed',
        shortName: 'Mal',
        icons: [
          { src: 'javascript:alert(1)', sizes: '192x192', type: 'image/png' },
          { src: '/valid.png', sizes: '192x192', type: 'image/png' }
        ]
      }
    }],
    company: { slug: 'malformed', name: 'Malformed' },
    identity: { domain: 'valdi.app', route: '/malformed' },
    metadata: { applicationId: 'valdi.app/malformed' }
  }

  const vm = adapter.adapt(ctx)

  assert(vm.pwa.config.icons.length === 1, 'JavaScript URL should be rejected')
  assert(vm.pwa.config.icons[0].src === '/valid.png', 'Valid icon should be retained')
})

test('favicon traversal path rejected', async () => {
  const adapter = createApplicationPresentationAdapter()
  const ctx = {
    capabilities: [{
      name: 'installableApp',
      configuration: {
        enabled: true,
        name: 'Malformed',
        shortName: 'Mal',
        favicon: '../secret.ico'
      }
    }],
    company: { slug: 'malformed', name: 'Malformed' },
    identity: { domain: 'valdi.app', route: '/malformed' },
    metadata: { applicationId: 'valdi.app/malformed' }
  }

  const vm = adapter.adapt(ctx)

  assert(vm.pwa.config.favicon === null, 'Traversal favicon path should be rejected')
})

test('appleTouchIcon javascript URL rejected', async () => {
  const adapter = createApplicationPresentationAdapter()
  const ctx = {
    capabilities: [{
      name: 'installableApp',
      configuration: {
        enabled: true,
        name: 'Malformed',
        shortName: 'Mal',
        appleTouchIcon: 'javascript:alert(1)'
      }
    }],
    company: { slug: 'malformed', name: 'Malformed' },
    identity: { domain: 'valdi.app', route: '/malformed' },
    metadata: { applicationId: 'valdi.app/malformed' }
  }

  const vm = adapter.adapt(ctx)

  assert(vm.pwa.config.appleTouchIcon === null, 'JavaScript URL appleTouchIcon should be rejected')
})

// ============================================================================
// TEST GROUP 10: Gate 1 Regression
// ============================================================================

console.log(`\n${TEST_ID} — Gate 1 Regression`)
console.log('────────────────────────────────')

test('Gate 1 manifest identity unchanged', async () => {
  const ALBASIE_CONFIG = {
    slug: 'albasie',
    name: 'Albasie',
    description: 'Albasie Experiences',
    branding: { colors: { primary: '#2d5a27', background: '#0a0a0a' } },
    pwa: {
      enabled: true,
      name: 'Albasie - Experiencias Patrimoniales',
      shortName: 'Albasie',
      description: 'Operador turístico especializado',
      display: 'standalone',
      themeColor: '#2d5a27',
      backgroundColor: '#0a0a0a',
      startUrl: '/albasie/',
      scope: '/albasie/',
      offlineFallback: '/albasie/offline.html'
    }
  }

  const manifest = generateManifest(ALBASIE_CONFIG)

  assert(manifest.name === 'Albasie - Experiencias Patrimoniales', 'Name unchanged from Gate 1')
  assert(manifest.short_name === 'Albasie', 'Short name unchanged from Gate 1')
  assert(manifest.start_url === '/albasie/', 'Start URL unchanged from Gate 1')
  assert(manifest.scope === '/albasie/', 'Scope unchanged from Gate 1')
  assert(manifest.display === 'standalone', 'Display unchanged from Gate 1')
})

test('start_url unchanged in manifest', async () => {
  const manifest = generateManifest(VISUAL_A_CONFIG)
  assert(manifest.start_url === '/test-visual-a/', 'Start URL should be preserved')
})

test('scope unchanged in manifest', async () => {
  const manifest = generateManifest(VISUAL_A_CONFIG)
  assert(manifest.scope === '/test-visual-a/', 'Scope should be preserved')
})

test('manifest id follows expected pattern', async () => {
  const manifest = generateManifest(VISUAL_A_CONFIG)
  assert(manifest.id === '/tenant/valdi.app/test-visual-a', 'Manifest id should follow /tenant/domain/slug pattern')
})

// ============================================================================
// TEST GROUP 11: Security
// ============================================================================

console.log(`\n${TEST_ID} — Security Validation`)
console.log('─────────────────────────────────')

test('javascript URL in favicon renders safely', async () => {
  const html = renderDocument({
    title: 'Test',
    description: 'Test',
    favicon: 'javascript:alert(1)'
  })

  assertNotContains(html, 'javascript:', 'JavaScript URL should be sanitized')
  assertNotContains(html, 'rel="icon"', 'No icon tag for invalid favicon')
})

test('data URL in appleTouchIcon renders safely', async () => {
  const html = renderDocument({
    title: 'Test',
    description: 'Test',
    appleTouchIcon: 'data:text/html,<script>alert(1)</script>'
  })

  assertNotContains(html, 'data:', 'Data URL should be sanitized')
  assertNotContains(html, 'rel="apple-touch-icon"', 'No apple-touch-icon tag for invalid URL')
})

// ============================================================================
// TEST GROUP 12: Rendering Integration
// ============================================================================

console.log(`\n${TEST_ID} — Rendering Integration`)
console.log('──────────────────────────────────')

test('full visual identity rendering with all tags', async () => {
  const adapter = createApplicationPresentationAdapter()
  const ctx = {
    capabilities: [{ name: 'installableApp', configuration: VISUAL_A_CONFIG.pwa }],
    company: { slug: 'test-visual-a', name: 'Test Visual A', branding: VISUAL_A_CONFIG.branding },
    identity: { domain: 'valdi.app', route: '/test-visual-a' },
    metadata: { applicationId: 'valdi.app/test-visual-a' }
  }

  const vm = adapter.adapt(ctx)
  const html = renderDocument({
    title: 'Test Visual A',
    description: 'Testing visual identity',
    favicon: vm.pwa.config.favicon,
    appleTouchIcon: vm.pwa.config.appleTouchIcon,
    themeColor: vm.pwa.config.themeColor,
    appleWebApp: {
      capable: true,
      title: vm.pwa.config.name,
      statusBarStyle: 'black-translucent'
    }
  })

  assertContains(html, '/apps/valdi/test-visual-a/favicon.png', 'Favicon should be present')
  assertContains(html, '/apps/valdi/test-visual-a/apple-touch-icon.png', 'Apple touch icon should be present')
  assertContains(html, '#123456', 'Theme color should be present')
  assertContains(html, 'apple-mobile-web-app-capable', 'iOS meta should be present')
})

// ============================================================================
// RUN ALL TESTS
// ============================================================================

console.log(`\n${'='.repeat(60)}`)
console.log(`${TEST_ID} — Running all tests`)
console.log(`${'='.repeat(60)}\n`)

Promise.all(testPromises).then(() => {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`${TEST_ID} Results: ${passed} passed, ${failed} failed`)
  console.log(`${'='.repeat(60)}\n`)

  if (failed > 0) {
    process.exit(1)
  }
}).catch(err => {
  console.error('Test execution failed:', err)
  process.exit(1)
})
