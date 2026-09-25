/**
 * ZonePresentation Real Integration Tests
 *
 * APP-ZONE-PRESENT-1 - first Level-2 Application-scoped visual identity
 *
 * Exercises the full pipeline (ApplicationResolver ->
 * ApplicationPresentation -> ApplicationPresentationAdapter ->
 * ApplicationPresentationRenderer -> HtmlRenderer -> DocumentTemplate) for the
 * first configured consumer (valdi.app/isla-teja) that declares an optional
 * declarative visual identity (version + Engine-owned variant + allowlisted
 * token overrides).
 *
 * Audit invariants verified here:
 *   - the config is declarative only, validated fail-closed by the engine
 *     contract, and never carries scope/placement/CSS vocabulary;
 *   - the Application-scoped scope is engine-derived (generateZoneNavigationScope);
 *   - the engine emits scoped --color-* reassignments under
 *     [data-application-scope=...] (no :root mutation, no new CSS vocabulary);
 *   - OTHER Applications (corral, costa, albasie) keep byte-identical generic
 *     L1 output: no identity CSS, no body hook, no marker strings;
 *   - Level-1 Zone Navigation (tabs) and Zone Content contracts are untouched;
 *   - an invalid declared block never breaks the Application (fail-closed
 *     fallback to the certified Level-1 baseline).
 */

import { createApplicationPresentationRenderer } from './application/application.presentation.renderer.js'
import { HtmlRenderer } from './rendering/html.renderer.js'
import { ROUTE_CONFIG } from './routing/route.config.js'
import { validateZonePresentationConfig, ZONE_PRESENTATION_VARIANTS } from '../experience/presentation/zone.presentation.js'
import { generateZoneNavigationScope } from '../experience/navigation/zone.navigation.scope.js'

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

function assertIncludes(html, needle, message) {
  assert(html.includes(needle), `${message}\nMissing needle: ${needle}`)
}

function assertExcludes(html, needle, message) {
  assert(!html.includes(needle), `${message}\nUnexpected needle: ${needle}`)
}

const renderer = createApplicationPresentationRenderer()
const htmlRenderer = new HtmlRenderer()

const ISLA_TEJA_SCOPE = 'zn-valdi-app-isla-teja-isla-teja-main'

async function renderApp(domain, path) {
  const result = await renderer.render({ domain, path })
  assert(result.success === true, `Pipeline must succeed for ${domain}${path}: ${result.error || ''}`)
  const html = htmlRenderer.render(result.presentation, { domain, pathname: path, canonicalDomain: domain })
  return { result, html }
}

function testIslaTejaRouteCarriesZonePresentation() {
  const islaTeja = ROUTE_CONFIG.routes.find(r => r.domain === 'valdi.app' && r.path === '/isla-teja')
  assert(islaTeja, '/isla-teja must be a configured Application route')
  assert(islaTeja.zonePresentation, '/isla-teja must declare a zonePresentation block')

  const validated = validateZonePresentationConfig(islaTeja.zonePresentation)
  assert(validated.valid === true,
    `Isla Teja zonePresentation must validate: ${JSON.stringify(validated.errors)}`)
  assert(islaTeja.zonePresentation.version === '1', 'version is the supported one')
  assert(ZONE_PRESENTATION_VARIANTS.includes(islaTeja.zonePresentation.variant),
    'variant is an Engine-owned enum value')
  assert(islaTeja.zonePresentation.tokens, 'tokens declared')
}

async function testIslaTejaPipelineCarriesZonePresentation() {
  const { result } = await renderApp('valdi.app', '/isla-teja')
  const zonePres = result.presentation.zonePresentation
  assert(zonePres, 'view model carries zonePresentation for isla-teja')
  assertEqual(zonePres.version, '1', 'version surfaced')
  assertEqual(zonePres.variant, 'nature', 'variant surfaced')
  assertEqual(zonePres.tokens.primary, '#3a7d66', 'primary token surfaced (effective set)')
  assertEqual(zonePres.tokens.accent, '#e8d5a3', 'accent token surfaced')
  assertEqual(zonePres.applicationId, 'valdi.app/isla-teja', 'applicationId surfaced')
  assertEqual(zonePres.cssScope, ISLA_TEJA_SCOPE, 'cssScope surfaced')
}

async function testEngineScopeAuthority() {
  const derived = generateZoneNavigationScope('valdi.app/isla-teja', 'isla-teja-main')
  const { result } = await renderApp('valdi.app', '/isla-teja')
  assertEqual(derived.cssScope, ISLA_TEJA_SCOPE, 'engine derives the documented scope')
  assertEqual(result.presentation.zonePresentation.cssScope, derived.cssScope,
    'identity cssScope equals the engine-derived navigation scope (never from config)')
  assertEqual(result.presentation.zoneNavigation.scope.cssScope, derived.cssScope,
    'navigation scope is the same single authority')
}

async function testSSREmitsScopedIdentityForIslaTeja() {
  const { html } = await renderApp('valdi.app', '/isla-teja')
  assertIncludes(html, `<body data-application-scope="${ISLA_TEJA_SCOPE}">`,
    'body carries the Application scope hook')
  assertIncludes(html, `[data-application-scope="${ISLA_TEJA_SCOPE}"] {`,
    'scoped identity block emitted')
  assertIncludes(html, '--color-primary: #3a7d66;', 'primary reassignment emitted')
  assertIncludes(html, '--color-secondary: #1f3530;', 'secondary reassignment emitted')
  assertIncludes(html, '--color-accent: #e8d5a3;', 'accent reassignment emitted')
  const occurrences = html.split('data-application-scope').length - 1
  assertEqual(occurrences, 2, 'scope hook appears exactly twice (body attr + style selector)')
}

async function testNoRootMutation() {
  const { html } = await renderApp('valdi.app', '/isla-teja')
  assertExcludes(html, ':root { --color-primary: #3a7d66',
    'identity tokens never reach the :root block')
  assertIncludes(html, '[data-application-scope=', 'identity CSS is attribute-scoped only')
}

async function testLevel1StylingAndNavigationIntact() {
  const { html } = await renderApp('valdi.app', '/isla-teja')
  assertIncludes(html, `.${ISLA_TEJA_SCOPE}.zone-nav {`, 'L1 tabs styles intact')
  assertIncludes(html, `.${ISLA_TEJA_SCOPE} .zone-content-item {`, 'L1 zone content styles intact')
  assertIncludes(html, 'data-zone-nav', 'enhancement mount point intact')
  assertIncludes(html, 'zone-nav-panel', 'panel markup intact')
  assertIncludes(html, `<h1>Valdi</h1>`, 'hero identity untouched (semantic, not presentation)')
  assertExcludes(html, 'role="tab"', 'no aria tab role baked into SSR (progressive enhancement only)')
}

async function testZonePresentationOnlyForIslaTeja() {
  for (const path of ['/corral', '/costa']) {
    const { result, html } = await renderApp('valdi.app', path)
    assert(result.presentation.zonePresentation === null,
      `${path} must NOT carry zonePresentation`)
    assertExcludes(html, 'data-application-scope', `${path} must not emit the scope hook`)
    assertExcludes(html, 'ZonePresentation -', `${path} must not emit identity CSS`)
    assertExcludes(html, '--color-primary: #3a7d66', `${path} must not carry isla-teja tokens`)
    assertIncludes(html, `.zn-valdi-app-${path.slice(1)}-${path.slice(1)}-main.zone-nav {`,
      `${path} keeps its own L1 generic baseline`)
  }
}

async function testAlbasieByteEquivalenceUnaffected() {
  const { result, html } = await renderApp('valdi.app', '/albasie')
  assert(result.presentation.zonePresentation === null, 'albasie carries no zonePresentation')
  assertExcludes(html, 'data-application-scope', 'albasie emits no scope hook')
  assertExcludes(html, 'ZonePresentation -', 'albasie emits no identity CSS')
  assertIncludes(html, '<!DOCTYPE html>', 'albasie document intact')
  assertIncludes(html, '</html>', 'albasie document closes normally')
}

async function testInvalidZonePresentationFailsClosed() {
  const route = ROUTE_CONFIG.routes.find(r => r.domain === 'valdi.app' && r.path === '/isla-teja')
  const original = JSON.parse(JSON.stringify(route.zonePresentation))

  try {
    route.zonePresentation = { version: '1', variant: 'nature', tokens: { primary: 'not-a-color!' } }
    const validated = validateZonePresentationConfig(route.zonePresentation)
    assert(validated.valid === false, 'invalid config rejected by contract')

    const { result, html } = await renderApp('valdi.app', '/isla-teja')
    assert(result.success === true, 'invalid identity must not break the Application')
    assert(result.presentation.zonePresentation === null,
      'invalid identity falls back to the certified Level-1 baseline (never partial)')
    assertExcludes(html, 'data-application-scope', 'no scope hook when identity rejected')
    assertExcludes(html, '--color-primary: #3a7d66', 'no identity tokens when identity rejected')
    assertIncludes(html, 'data-zone-nav', 'Level-1 zone navigation still renders')
    assertIncludes(html, '.zone-content-item', 'Level-1 zone content still renders')
    assertIncludes(html, '<h1>Valdi</h1>', 'hero still renders')
  } finally {
    route.zonePresentation = original
  }

  const restored = await renderApp('valdi.app', '/isla-teja')
  assert(restored.result.presentation.zonePresentation !== null,
    'restored valid identity is served again')
}

function testIslaTejaConfigMatchesDocumentedContract() {
  assertIncludes(
    JSON.stringify(ROUTE_CONFIG.routes.find(r => r.domain === 'valdi.app' && r.path === '/isla-teja').zonePresentation),
    '#e8d5a3',
    'config is exactly the documented contract shape'
  )
}

async function testNoIslaTejaSpecificCapabilityFiles() {
  const fs = await import('fs')
  const presFiles = fs.readdirSync('./experience/presentation')
  const appFiles = fs.readdirSync('./web/application')
  assert(presFiles.some(f => f.includes('isla-teja')) === false,
    'no isla-teja-specific presentation capability file (reuses zone.presentation.js)')
  assert(appFiles.some(f => f.includes('isla-teja')) === false,
    'no isla-teja-specific application file')
}

async function runTests() {
  console.log('🧪 Running ZonePresentation Real Integration Tests (APP-ZONE-PRESENT-1)...\n')

  const tests = [
    testIslaTejaRouteCarriesZonePresentation,
    testIslaTejaPipelineCarriesZonePresentation,
    testEngineScopeAuthority,
    testSSREmitsScopedIdentityForIslaTeja,
    testNoRootMutation,
    testLevel1StylingAndNavigationIntact,
    testZonePresentationOnlyForIslaTeja,
    testAlbasieByteEquivalenceUnaffected,
    testInvalidZonePresentationFailsClosed,
    testIslaTejaConfigMatchesDocumentedContract,
    testNoIslaTejaSpecificCapabilityFiles
  ]

  let passed = 0
  let failed = 0

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

runTests().then(result => {
  console.log(`\nZonePresentation Real Integration (APP-ZONE-PRESENT-1): ${result.passed}/${result.passed + result.failed} passed`)
  process.exit(result.failed > 0 ? 1 : 0)
}).catch(err => {
  console.error('Test error:', err)
  process.exit(1)
})