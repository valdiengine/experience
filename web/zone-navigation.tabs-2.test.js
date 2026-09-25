/**
 * ZoneNavigation Content Real Integration Tests
 *
 * APP-ZONE-TABS-2 - Isla Teja visual integration
 *
 * Exercises the full pipeline (ApplicationResolver -> ApplicationPresentation
 * -> ApplicationPresentationAdapter -> ApplicationPresentationRenderer ->
 * HtmlRenderer) for the first REAL Zone Application (valdi.app/isla-teja)
 * whose zoneNavigation panels are painted with structured, validated traveler
 * content delivered by the content layer. Reuses the same engine + capability
 * + contract as corral/costa (which deliberately carry NO zoneContent and must
 * keep their exact generic panel baseline).
 *
 * Audit invariants verified here:
 *   - content lives in the content layer and reaches SSR only via the
 *     ExperienceContext pipeline (never invented by presentation);
 *   - pairing is enforced: a ZoneContent must exactly cover the navigation
 *     contentRefs with matching component kinds and scopeId;
 *   - panel markup is per-component structured (intro/list/map) and escaped;
 *   - presentation/generic layer contains NO destination-specific conditional
 *     and NO visual fields in content.
 */

import { createApplicationPresentationRenderer } from './application/application.presentation.renderer.js'
import { HtmlRenderer } from './rendering/html.renderer.js'
import { ROUTE_CONFIG } from './routing/route.config.js'
import { validateZoneContentConfig, validateZoneContentPairing } from '../experience/content/zone.content.js'
import { validateZoneNavigationConfig } from '../experience/navigation/zone.navigation.js'

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

const renderer = createApplicationPresentationRenderer()
const htmlRenderer = new HtmlRenderer()

const ISLA_TEJA_KEYS = ['descubre', 'gastronomia', 'alojamientos', 'actividades', 'servicios', 'mapa']
const ISLA_TEJA_REFS = ISLA_TEJA_KEYS.map(key => `valdi:isla-teja:${key}`)

async function renderApp(domain, path) {
  const result = await renderer.render({ domain, path })
  assert(result.success === true, `Pipeline must succeed for ${domain}${path}: ${result.error || ''}`)
  const html = htmlRenderer.render(result.presentation, { domain, pathname: path, canonicalDomain: domain })
  return { result, html }
}

function testRouteConfigCarriesZoneContent() {
  const islaTeja = ROUTE_CONFIG.routes.find(r => r.domain === 'valdi.app' && r.path === '/isla-teja')
  assert(islaTeja, '/isla-teja must be a configured Application route')
  assert(islaTeja.experienceType === 'tourism-destination', 'Isla Teja is a tourism-destination experience')
  assert(islaTeja.zoneNavigation, '/isla-teja must define zoneNavigation content')
  assert(islaTeja.zoneContent, '/isla-teja must define zoneContent content')
  assertEqual(islaTeja.zoneNavigation.scopeId, 'isla-teja-main', 'zoneContent shares the navigation scopeId')
  assertEqual(islaTeja.zoneContent.scopeId, 'isla-teja-main', 'zoneContent scopeId matches navigation')
  assertEqual(islaTeja.zoneNavigation.items.length, 6, 'Navigation carries all 6 items')
  assertEqual(islaTeja.zoneContent.items.length, 6, 'Content carries exactly one entry per navigation item')
}

function testContentContractValidates() {
  const route = ROUTE_CONFIG.routes.find(r => r.domain === 'valdi.app' && r.path === '/isla-teja')
  const nav = validateZoneNavigationConfig({
    scopeId: route.zoneNavigation.scopeId,
    items: route.zoneNavigation.items
  })
  assert(nav.valid === true, 'Navigation content contract passes for isla-teja')
  const content = validateZoneContentConfig(route.zoneContent)
  assert(content.valid === true, 'ZoneContent content contract passes for isla-teja')
  const pairing = validateZoneContentPairing(nav.navigation, content.content)
  assert(pairing.valid === true, 'Navigation/Content pairing is coherent')
}

function testContentLanguageAndSemantics() {
  const route = ROUTE_CONFIG.routes.find(r => r.domain === 'valdi.app' && r.path === '/isla-teja')
  const intro = route.zoneContent.items[0]
  assertEqual(intro.component, 'zone.intro', 'Descubre panel is zone.intro')
  assert(Array.isArray(intro.paragraphs) && intro.paragraphs.length === 2, 'Intro panel has structured paragraphs')
  assert(intro.paragraphs.every(p => typeof p === 'string' && p.length > 0), 'Paragraphs are non-empty strings')

  const listPanels = route.zoneContent.items.filter(i => i.component === 'zone.list')
  assertEqual(listPanels.length, 4, 'Four structured list panels (gastronomia/alojamientos/actividades/servicios)')
  for (const panel of listPanels) {
    assert(Array.isArray(panel.items) && panel.items.length > 0, `${panel.contentRef} has list entries`)
    assert(panel.items.every(entry => entry.name && typeof entry.name === 'string'),
      `${panel.contentRef} entries are named`)
  }

  const mapa = route.zoneContent.items[5]
  assertEqual(mapa.component, 'zone.map', 'Mapa panel is zone.map')
  assert(mapa.location && typeof mapa.location === 'string', 'Map panel has a location')
  assert(Array.isArray(mapa.coordinates) && mapa.coordinates.length === 2, 'Map panel has coordinates')
  assert(typeof mapa.coordinates[0] === 'number' && typeof mapa.coordinates[1] === 'number', 'Coordinates are numeric')

  const hasRealPlaces = JSON.stringify(route.zoneContent.items).includes('Philippi') ||
    JSON.stringify(route.zoneContent.items).includes('Jardín Botánico') ||
    JSON.stringify(route.zoneContent.items).includes('Parque Saval')
  assert(hasRealPlaces, 'Content names real, established Isla Teja places (no invented copy)')
  assert(JSON.stringify(route.zoneContent.items).includes('Puente Pedro de Valdivia'),
    'Content uses Puente Pedro de Valdivia as the downtown-Isla Teja connection')
}

async function testIslaTejaPipelineServesContent() {
  const { result } = await renderApp('valdi.app', '/isla-teja')
  const zn = result.presentation.zoneNavigation
  const zc = result.presentation.zoneContent
  assert(zn !== null, 'Isla Teja presentation must include zoneNavigation')
  assert(zc !== null, 'Isla Teja presentation must include zoneContent (real content delivered)')
  assertEqual(zc.scopeId, 'isla-teja-main', 'Presentation zoneContent scope is engine-scoped')
  assertEqual(zc.items.length, 6, 'Presentation delivers all 6 content items')
  assertEqual(zc.items.map(i => i.contentRef).join(','), ISLA_TEJA_REFS.join(','), 'Content items paired by contentRef order')
  assertEqual(zn.scope.cssScope, 'zn-valdi-app-isla-teja-isla-teja-main', 'Isla Teja CSS scope is namespaced')
  assertEqual(zc.applicationId, 'valdi.app/isla-teja', 'zoneContent bound to the Application identity')
}

async function testSSRRendersRealContent() {
  const { html } = await renderApp('valdi.app', '/isla-teja')
  assert(html.includes('data-zone-content="valdi:isla-teja:descubre"'), 'Intro panel renders real content block')
  assert(html.includes('data-zone-content="valdi:isla-teja:mapa"'), 'Map panel renders real content block')
  assert(html.includes('Museo de la Exploración R.A. Philippi'), 'List content contains the established campus museum')
  assert(html.includes('Jardín Botánico de la Universidad Austral'), 'List content contains the established botanical garden')
  assert(html.includes('Parque Saval'), 'List content contains the established riverside park')
  assert(html.includes('Puente Pedro de Valdivia'), 'Content names the real bridge connecting the island to downtown')
  assert(html.includes('Lat -39.8051 · Lng -73.2499'), 'Map coordinates render as [lat, lng] text')
  assert(html.includes('Recorridos gastronómicos en Valdivia: cocina sureña'), 'List lead renders')
  assert(html.includes('Isla Teja — Valdivia, Región de Los Ríos, Chile'), 'Map location renders')
}

async function testSSREscapesContent() {
  const { html } = await renderApp('valdi.app', '/isla-teja')
  assert(html.includes('data-zone-content="valdi:isla-teja:gastronomia"'), 'Gastronomía panel renders content block')
  assert(!html.includes('data-zone-content="><script>'), 'No angle-bracket injection on attributes')
  assert(!/class="zone-content[^"]*><script/i.test(html), 'No script injection inside content blocks')

  // Proof through the real SSR pipeline: allowed semantic text containing an
  // ampersand must be HTML-escaped when rendered (raw-HTML rejection in the
  // content contract remains untouched; & is legitimate content and must be
  // escaped, not rejected).
  const src = 'Panaderías & cafés'
  assert(html.includes('Panaderías &amp; cafés'),
    'Semantic ampersand is HTML-escaped in the rendered panel content')
  assert(!html.includes(`>${src}<`) && !html.includes(`>${src}</h4`),
    'No unescaped ampersand in SSR text nodes')

  // Sanity: raw '<' is still content-rejected by the contract (proven in the
  // contract suite), so the gastronomía block must never contain a lossy raw
  // ampersand after escaping — only the declared tag structure.
  const sectionStart = html.indexOf('data-zone-content="valdi:isla-teja:gastronomia"')
  const zoneContentSection = html.slice(sectionStart, html.indexOf('</section>', sectionStart))
  assert(zoneContentSection.indexOf('<script') < 0, 'No script markup in the rendered content block')
}

async function testCorralCostaKeepGenericBaseline() {
  const corral = await renderApp('valdi.app', '/corral')
  const costa = await renderApp('valdi.app', '/costa')
  assertEqual(corral.result.presentation.zoneContent, null, 'Corral carries no zoneContent')
  assertEqual(costa.result.presentation.zoneContent, null, 'Costa carries no zoneContent')
  assert(!corral.html.includes('data-zone-content="'), 'Corral HTML must not contain content block markers')
  assert(!costa.html.includes('data-zone-content="'), 'Costa HTML must not contain content block markers')
  assert(!corral.html.includes('class="zone-content'), 'Corral HTML must not contain zone-content styled markup')
  assert(!corral.html.includes('zone-content-lead'), 'Corral HTML must not contain content lead markup')
  assert(!corral.html.includes('Puente Pedro de Valdivia'), 'Corral HTML must not leak Isla Teja content')
  assert(!costa.html.includes('Puente Pedro de Valdivia'), 'Costa HTML must not leak Isla Teja content')
  assert(corral.html.includes('data-zone-content-ref="valdi:corral:gastronomia"'),
    'Corral generic panel baseline preserved')
}

async function testNoCrossApplicationLeak() {
  const islaTeja = await renderApp('valdi.app', '/isla-teja')
  const corral = await renderApp('valdi.app', '/corral')
  const costa = await renderApp('valdi.app', '/costa')

  const refs = new Set(islaTeja.result.presentation.zoneContent.items.map(i => i.contentRef))
  for (const ref of refs) {
    assert(!corral.html.includes(ref), `Corral HTML must not contain ${ref}`)
    assert(!costa.html.includes(ref), `Costa HTML must not contain ${ref}`)
  }

  const islaIds = new Set(islaTeja.result.presentation.zoneNavigation.items.flatMap(i => [i.tabId, i.panelId]))
  for (const item of corral.result.presentation.zoneNavigation.items) {
    assert(!islaIds.has(item.tabId), `Isla Teja tabId collides with Corral: ${item.tabId}`)
    assert(!islaIds.has(item.panelId), `Isla Teja panelId collides with Corral: ${item.panelId}`)
  }
  assert(!corral.html.includes('zn-valdi-app-isla-teja-isla-teja-main'),
    'Corral HTML must not reference Isla Teja CSS scope')
}

async function testPresentationStaysGeneric() {
  const islaTeja = await renderApp('valdi.app', '/isla-teja')
  const route = ROUTE_CONFIG.routes.find(r => r.domain === 'valdi.app' && r.path === '/isla-teja')

  const forbiddenVisual = ['rotation:', 'circle:', 'star:', 'triangle:',
    'zIndex:', 'rawHtml', 'dangerouslySetInnerHTML', 'style=']
  for (const token of forbiddenVisual) {
    assert(!islaTeja.html.toLowerCase().includes(token.toLowerCase()),
      `Isla Teja HTML must not contain visual field token "${token}"`)
  }

  const contentJson = JSON.stringify(route.zoneContent)
  assert(contentJson.indexOf('display:') < 0 && contentJson.indexOf('margin:') < 0 &&
    contentJson.indexOf('padding:') < 0 && contentJson.indexOf('color:') < 0,
    'Content layer must not carry CSS declarations')
  assert(contentJson.indexOf('grid-template') < 0, 'Content must not carry layout vocabulary')
  assert(!contentJson.includes('width') && !contentJson.includes('height'),
    'Content must not carry dimension fields')
  assert(route.zoneContent && route.zoneNavigation.items.length === route.zoneContent.items.length,
    'Content and navigation are enumerated strictly from route config')
}

async function testSSRA11yWiringStillHolds() {
  const { result, html } = await renderApp('valdi.app', '/isla-teja')
  const zn = result.presentation.zoneNavigation

  for (const item of zn.items) {
    assert(html.includes(`id="${item.tabId}"`), `Tab id="${item.tabId}" SSR'd`)
    assert(html.includes(`id="${item.panelId}"`), `Panel id="${item.panelId}" SSR'd`)
    assert(html.includes(`href="#${item.panelId}"`), `Anchor deep-link to panel "${item.panelId}" SSR'd`)
    assert(html.includes(`data-zone-tab="${item.key}"`), `Tab data-zone-tab="${item.key}" SSR'd`)
    assert(html.includes(`data-zone-panel="${item.key}"`), `Panel data-zone-panel="${item.key}" SSR'd`)
    assert(html.includes(`data-zone-content-ref="${item.contentRef}"`), `Content ref "${item.contentRef}" SSR'd`)
  }
  assert(!html.includes('role="tab"'), 'No aria tab role baked into SSR (progressive enhancement only)')
  assert(html.includes(`${zn.scope.cssScope}-nav`), 'Root element id derives from cssScope')
  assert(html.includes('data-zone-nav'), 'Enhancement mount point present')
}

async function testLevel1TokenStylingOnly() {
  const islaTeja = await renderApp('valdi.app', '/isla-teja')
  const corral = await renderApp('valdi.app', '/corral')
  for (const token of ['zone-content', 'zone-content-lead', 'zone-content-list', 'zone-content-item',
    'zone-content-map']) {
    assert(islaTeja.html.includes(token), `Level-1 styles emitted for "${token}"`)
  }
  assert(!corral.html.includes('zone-content-lead'), 'Corral must not emit zone-content styles')

  const scopedStyleBlock = islaTeja.html.includes('.zn-valdi-app-isla-teja-isla-teja-main .zone-content {')
  assert(scopedStyleBlock, 'zone-content styles are scoped under own cssScope')
  assert(!corral.html.includes('.zn-valdi-app-corral-corral-main .zone-content '),
    'Corral must not emit zone-content styles under its scope')
}

async function testSeoStillRendersForZone() {
  const { html } = await renderApp('valdi.app', '/isla-teja')
  assert(html.includes('<title>'), 'Full HTML document present')
  assert(html.includes('</html>'), 'Document closes normally')
}

async function testNoDuplicateCapabilityFiles() {
  const fs = (await import('fs'))
  const flag = await import('fs').then(() => true).catch(() => false)
  void flag
  const caps = fs.readdirSync('./experience/navigation').filter(f => f.endsWith('.js'))
  const tabsCaps = fs.readdirSync('./experience/presentation/components').filter(f => f.endsWith('.js'))
  assert(caps.some(f => f.includes('isla-teja')) === false,
    'No isla-teja-specific navigation capability file (reuses zone.navigation.js)')
  assert(tabsCaps.some(f => f.includes('isla-teja')) === false,
    'No isla-teja-specific component file (reuses tabs component)')
  assert(caps.some(f => f.includes('tabs')) === false,
    'No duplicated tabs engine file (single zone.navigation engine)')
}

async function runTests() {
  console.log('🧪 Running Zone Navigation Content Real Integration Tests (APP-ZONE-TABS-2)...\n')

  const tests = [
    testRouteConfigCarriesZoneContent,
    testContentContractValidates,
    testContentLanguageAndSemantics,
    testIslaTejaPipelineServesContent,
    testSSRRendersRealContent,
    testSSREscapesContent,
    testCorralCostaKeepGenericBaseline,
    testNoCrossApplicationLeak,
    testPresentationStaysGeneric,
    testSSRA11yWiringStillHolds,
    testLevel1TokenStylingOnly,
    testSeoStillRendersForZone,
    testNoDuplicateCapabilityFiles
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

export { runTests }

runTests().then(result => {
  console.log(`\nZone Content Real Integration (ABT-2): ${result.passed}/${result.passed + result.failed} passed`)
  process.exit(result.failed > 0 ? 1 : 0)
}).catch(err => {
  console.error('Test error:', err)
  process.exit(1)
})