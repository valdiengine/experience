/**
 * ZoneNavigation Web Integration / SSR Tests
 *
 * APP-ZONE-TABS-1 - ZoneNavigation (tabs)
 *
 * Exercises the full pipeline (ApplicationResolver -> ApplicationPresentation
 * -> ApplicationPresentationAdapter -> ApplicationPresentationRenderer ->
 * HtmlRenderer) for two configured Applications (corral, costa), proving the
 * same engine + capability + contract is reused under distinct Application
 * identities/scopes without leaking. Also verifies SSR no-JS readability,
 * progressive-enhancement a11y wiring, non-zone routes stay unchanged, and the
 * post-implementation audit invariants:
 *   - engine root CSS selector is a same-element compound that actually
 *     matches the class structure emitted by SSR;
 *   - the root DOM id is deterministic and server-derived from the cssScope
 *     (never a global literal), unique across Applications;
 *   - progressive enhancement is instance-safe: every [data-zone-nav] root is
 *     enhanced independently with root-local tab/panel lookup.
 */

import { createApplicationPresentationRenderer } from './application/application.presentation.renderer.js'
import { HtmlRenderer } from './rendering/html.renderer.js'
import { ROUTE_CONFIG } from './routing/route.config.js'

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

const EXPECTED_CORRAL_KEYS = ['descubre', 'gastronomia', 'alojamientos', 'actividades', 'comercio', 'mapa']
const EXPECTED_COSTA_KEYS = ['descubre', 'gastronomia', 'alojamientos', 'actividades', 'comercio', 'mapa']

async function renderApp(domain, path) {
  const result = await renderer.render({ domain, path })
  assert(result.success === true, `Pipeline must succeed for ${domain}${path}: ${result.error || ''}`)
  const html = htmlRenderer.render(result.presentation, { domain, pathname: path, canonicalDomain: domain })
  return { result, html }
}

function testRouteConfigCarriesZoneNavigation() {
  const corral = ROUTE_CONFIG.routes.find(r => r.domain === 'valdi.app' && r.path === '/corral')
  const costa = ROUTE_CONFIG.routes.find(r => r.domain === 'valdi.app' && r.path === '/costa')
  assert(corral && corral.zoneNavigation, '/corral must define zoneNavigation content')
  assert(costa && costa.zoneNavigation, '/costa must define zoneNavigation content')
  assert(corral.zoneNavigation.scopeId !== costa.zoneNavigation.scopeId,
    'Each Application defines its own scopeId')
}

async function testCorralPipeline() {
  const { result } = await renderApp('valdi.app', '/corral')
  const zn = result.presentation.zoneNavigation
  assert(zn !== null, 'Corral presentation must include zoneNavigation')
  assertEqual(zn.layout, 'tabs', 'Corral layout is tabs')
  assertEqual(zn.scope.applicationId, 'valdi.app/corral', 'Corral scope tied to its Application identity')
  assertEqual(zn.scope.scope, 'valdi.app/corral::corral-main', 'Corral engine scope')
  assertEqual(zn.scope.cssScope, 'zn-valdi-app-corral-corral-main', 'Corral CSS scope is namespaced')
  assertEqual(zn.items.length, 6, 'Corral presents all 6 items')
  assertEqual(zn.items.map(i => i.key).join(','), EXPECTED_CORRAL_KEYS.join(','), 'Corral items ordered')
  assert(zn.items.every(i => i.contentRef.startsWith('valdi:corral:')), 'Corral contentRefs are Corral-scoped')
}

async function testCostaPipeline() {
  const { result } = await renderApp('valdi.app', '/costa')
  const zn = result.presentation.zoneNavigation
  assert(zn !== null, 'Costa presentation must include zoneNavigation')
  assertEqual(zn.layout, 'tabs', 'Costa layout is tabs')
  assertEqual(zn.scope.applicationId, 'valdi.app/costa', 'Costa scope tied to its Application identity')
  assertEqual(zn.scope.scope, 'valdi.app/costa::costa-main', 'Costa engine scope')
  assertEqual(zn.scope.cssScope, 'zn-valdi-app-costa-costa-main', 'Costa CSS scope is namespaced')
  assertEqual(zn.items.length, 6, 'Costa presents all 6 items')
  assert(zn.items.every(i => i.contentRef.startsWith('valdi:costa:')), 'Costa contentRefs are Costa-scoped')
}

async function testTwoApplicationNoLeak() {
  const corral = await renderApp('valdi.app', '/corral')
  const costa = await renderApp('valdi.app', '/costa')

  const corralZn = corral.result.presentation.zoneNavigation
  const costaZn = costa.result.presentation.zoneNavigation

  assert(corralZn.scope.applicationId !== costaZn.scope.applicationId,
    'Applications have distinct identities')
  assert(corralZn.scope.cssScope !== costaZn.scope.cssScope,
    'Applications have distinct CSS scopes')
  assert(!costaZn.scope.scope.includes('corral'), 'Costa scope must not reference Corral')

  const corralIds = new Set(corralZn.items.flatMap(i => [i.tabId, i.panelId]))
  for (const item of costaZn.items) {
    assert(!corralIds.has(item.tabId), `Costa tabId collides with Corral scope: ${item.tabId}`)
    assert(!corralIds.has(item.panelId), `Costa panelId collides with Corral scope: ${item.panelId}`)
  }

  assert(!corral.html.includes('zn-valdi-app-costa-costa-main'), 'Corral HTML must not contain Costa CSS scope')
  assert(!costa.html.includes('zn-valdi-app-corral-corral-main'), 'Costa HTML must not contain Corral CSS scope')
  assert(!corral.html.includes('valdi:costa:'), 'Corral HTML must not reference Costa contentRefs')
  assert(!costa.html.includes('valdi:corral:'), 'Costa HTML must not reference Corral contentRefs')
}

async function testNonZoneApplicationUnchanged() {
  const { result, html } = await renderApp('valdi.app', '/albasie')
  assertEqual(result.presentation.zoneNavigation, null, 'Non-zone Application has no zoneNavigation')
  assert(!html.includes('data-zone-nav'), 'Non-zone Application must not render zone navigation markup')
  assert(!html.includes('zone-nav-tab'), 'Non-zone Application must not render zone nav CSS/classes')
}

async function testSsrNoJsReadable() {
  const { result, html } = await renderApp('valdi.app', '/corral')
  const zn = result.presentation.zoneNavigation

  for (const item of zn.items) {
    assert(html.includes(item.panelId), `Panel "${item.panelId}" must be server-rendered`)
    assert(html.includes(item.tabId), `Tab "${item.tabId}" must be server-rendered`)
  }

  for (const label of ['Descubre', 'Gastronomía', 'Alojamientos', 'Actividades', 'Comercio', 'Mapa']) {
    assert(html.includes(`<h3>${label}</h3>`), `Panel heading "${label}" server-rendered`)
  }

  assert(html.includes('data-zone-nav'), 'Zone nav root server-rendered')
  assert(html.includes('data-zone-content-ref="valdi:corral:gastronomia"'),
    'contentRef exists as server-rendered panel metadata')

  // Baseline is a plain semantic list + panels with anchor deep links. ARIA
  // tab roles are applied by the enhancement script at runtime; the SSR
  // markup for the baseline must be a plain list + sections (the script text
  // itself intentionally references the ARIA strings it later sets).
  assert(html.includes('href="#zn-valdi-app-corral-corral-main-panel-mapa"'),
    'No-JS baseline uses anchor deep links to panels')
  assert(!html.includes('role="tab"'), 'ARIA tab role must not be baked into SSR baseline markup')
  assert(!html.includes('role="tablist"'), 'ARIA tablist role must not be baked into SSR baseline markup')
  assert(![...html.matchAll(/aria-selected=/g)].length, 'aria-selected attribute must not be in SSR baseline markup')
}

async function testSsrA11yWiringRelationships() {
  const { result, html } = await renderApp('valdi.app', '/corral')
  const zn = result.presentation.zoneNavigation

  // Every panel announces its controlling tab via aria-labelledby, and the
  // referenced tab id must exist in the document (static correctness).
  for (const item of zn.items) {
    const labelledBy = `aria-labelledby="${item.tabId}"`
    assert(html.includes(labelledBy), `Panel must reference tab id: ${item.tabId}`)
    const tabOpen = html.indexOf(`id="${item.tabId}"`)
    assert(tabOpen !== -1, `Tab element id exists: ${item.tabId}`)
    const labelledAt = html.indexOf(labelledBy)
    assert(labelledAt > tabOpen, `aria-labelledby resolves to the tab element that appears before the panel`)
  }

  assert(html.includes('data-zone-panel-ref'), 'Tabs carry the enhancement ref to their panel')

  // Enhancement script is included and wires keyboard/hash/roles.
  const scriptChecks = [
    "setAttribute('role', 'tablist')",
    "setAttribute('aria-selected'",
    "setAttribute('aria-controls'",
    'tablist.addEventListener',
    'ArrowRight',
    'ArrowLeft',
    'Home',
    'End',
    'hashchange',
    'keyFromHash'
  ]
  for (const fragment of scriptChecks) {
    assert(html.includes(fragment), `Enhancement script must contain: ${fragment}`)
  }
}

async function testResponsiveNoPageOverflow() {
  const { html } = await renderApp('valdi.app', '/corral')
  assert(html.includes('zn-valdi-app-corral-corral-main') === true, 'Scoped zone styles exist')

  const rulesToCheck = [
    '.zn-valdi-app-corral-corral-main.zone-nav {',
    '.zn-valdi-app-corral-corral-main .zone-nav-rail',
    'overflow-x: auto',
    'min-width: max-content',
    'flex-wrap: nowrap',
    '.zn-valdi-app-corral-corral-main.zone-nav.is-enhanced .zone-nav-panel',
    '.zn-valdi-app-corral-corral-main.zone-nav.is-enhanced .zone-nav-panel.is-active',
    '@media (min-width: 768px)',
    '@media (max-width: 767px)'
  ]
  for (const rule of rulesToCheck) {
    assert(html.includes(rule), `Responsive/overflow CSS must include: ${rule}`)
  }

  // Confirm the rail (the only scrollable axis) is isolated so the page does
  // not overflow horizontally: no global body overflow helpers are introduced.
  assert(!html.includes('body { overflow-x: hidden'), 'No global body overflow hack introduced')
}

function extractZoneStyles(html) {
  const blocks = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)]
  const block = blocks.find(b => b[1].includes('Zone Navigation (tabs) - scope:'))
  return block ? block[1] : ''
}

function extractZoneNavScript(html) {
  const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
  const block = blocks.find(b => b[1].includes("querySelectorAll('[data-zone-nav]')"))
  return block ? block[1] : ''
}

// Proves whether a CSS selector rule matches a single element whose classes
// are provided as a Set. Descendant selectors (containing whitespace) require
// an ancestor element, so a bare single element can never satisfy them.
function cssSelectorMatchesClassSet(selector, classSet) {
  const tokens = selector.trim().split(/\s+/)
  if (tokens.length > 1) return false
  return tokens[0].split('.').filter(Boolean).every(cls => classSet.has(cls))
}

async function testRootCssSelectorMatchesSsrDom() {
  const { result, html } = await renderApp('valdi.app', '/corral')
  const cssScope = result.presentation.zoneNavigation.scope.cssScope

  // SSR DOM structure: both `zone-nav` and the scoped class live on ONE root element.
  const rootMatch = html.match(/<section class="([^"]+)" id="([^"]+)" data-zone-nav/)
  assert(rootMatch, 'SSR zone root section found')
  const rootClasses = new Set(rootMatch[1].trim().split(/\s+/))
  assert(rootClasses.has('zone-nav'), 'SSR root carries the zone-nav class')
  assert(rootClasses.has(cssScope), 'SSR root carries the scoped class on the SAME element')

  // Engine styles: the root rule must be a same-element compound selector.
  const css = extractZoneStyles(html)
  assert(css.includes(`.${cssScope}.zone-nav {`), 'Root CSS rule is a same-element compound selector')
  assert(!css.includes(`.${cssScope} .zone-nav {`), 'No descendant-scoped root rule remains')

  assert(css.includes(`.${cssScope}.zone-nav.is-enhanced .zone-nav-panel {`),
    'Enhanced panel-hiding rule keeps the same-element root')
  assert(css.includes(`.${cssScope}.zone-nav.is-enhanced .zone-nav-panel.is-active {`),
    'Enhanced active-panel rule keeps the same-element root')
  assert(!css.includes(`.${cssScope} .zone-nav.is-enhanced`),
    'Enhanced rules must not revert to a descendant root selector')

  // Unchanged descendant rules remain exactly as before (real structure).
  assert(css.includes(`.${cssScope} .zone-nav-container {`), 'Container rule remains a root descendant')
  assert(css.includes(`.${cssScope} .zone-nav-rail {`), 'Rail rule remains a root descendant')
  assert(css.includes(`.${cssScope} .zone-nav-tabs {`), 'Tabs rule remains a root descendant')
  assert(css.includes(`.${cssScope} .zone-nav-tab {`), 'Tab rule remains a root descendant')
  assert(css.includes(`.${cssScope} .zone-nav-panel {`), 'Panel rule remains a root descendant')

  // Proof the engine selector actually applies to the emitted SSR root element,
  // and that the old descendant form does not (classes are on a single element).
  assert(cssSelectorMatchesClassSet(`.${cssScope}.zone-nav`, rootClasses),
    'Engine root selector applies to the SSR root DOM element')
  assertEqual(cssSelectorMatchesClassSet(`.${cssScope} .zone-nav`, rootClasses), false,
    'Descendant form cannot match (classes live on one element)')
}

async function testRootDomIdScopedDeterministic() {
  const corral = await renderApp('valdi.app', '/corral')
  const costa = await renderApp('valdi.app', '/costa')

  const corralCssScope = corral.result.presentation.zoneNavigation.scope.cssScope
  const costaCssScope = costa.result.presentation.zoneNavigation.scope.cssScope
  const corralRootId = `${corralCssScope}-nav`
  const costaRootId = `${costaCssScope}-nav`

  assert(corralRootId !== costaRootId, 'Root ids are derived from distinct scopes')

  for (const [html, cssScope, rootId, appName] of [
    [corral.html, corralCssScope, corralRootId, 'Corral'],
    [costa.html, costaCssScope, costaRootId, 'Costa']
  ]) {
    const match = html.match(/<section class="zone-nav [^"]+" id="([^"]+)" data-zone-nav/)
    assert(match, `${appName} zone root rendered`)
    assertEqual(match[1], rootId, `${appName} root id is server-derived from its cssScope`)
    assertEqual(match[1].endsWith('-nav'), true, `${appName} root id follows the deterministic -nav suffix`)
    assert(match[1] !== 'explorar', `${appName} root id must never be a global literal`)
    assert(html.includes(`class="zone-nav ${cssScope}"`), `${appName} root classes match its scoped id`)
  }

  assert(!corral.html.includes(`id="${costaRootId}"`), 'Corral must not emit the Costa root id')
  assert(!costa.html.includes(`id="${corralRootId}"`), 'Costa must not emit the Corral root id')
}

// ---- Minimal DOM stub (framework-free) used to execute the real enhancement
// script against multiple ZoneNavigation roots and prove instance safety. ----

function createZoneDom(viewModel) {
  const zn = viewModel.zoneNavigation
  const cssScope = zn.scope.cssScope

  function matchesSimple(el, sel) {
    if (sel.startsWith('[')) {
      const m = sel.match(/^\[([a-z-]+)\]$/)
      return Boolean(m) && el.getAttribute(m[1]) !== null
    }
    if (sel.startsWith('.')) return el.classList.contains(sel.slice(1))
    return false
  }

  function makeNode() {
    const node = {
      id: '',
      children: [],
      attributes: {},
      listeners: {},
      classSet: new Set(),
      setAttribute(k, v) {
        node.attributes[k] = String(v)
        if (k === 'id') node.id = String(v)
      },
      getAttribute(k) {
        return Object.prototype.hasOwnProperty.call(node.attributes, k) ? node.attributes[k] : null
      },
      addEventListener(type, fn) {
        (node.listeners[type] = node.listeners[type] || []).push(fn)
      },
      focus() {},
      classList: {
        add: (...classes) => classes.forEach(c => node.classSet.add(c)),
        toggle: (cls, force) => {
          const on = force === undefined ? !node.classSet.has(cls) : Boolean(force)
          if (on) node.classSet.add(cls); else node.classSet.delete(cls)
          return on
        },
        contains: cls => node.classSet.has(cls)
      },
      querySelector(sel) { return node.querySelectorAll(sel)[0] || null },
      querySelectorAll(sel) {
        const out = []
        ;(function walk(nd) {
          for (const child of nd.children) {
            if (matchesSimple(child, sel)) out.push(child)
            walk(child)
          }
        })(node)
        return out
      }
    }
    return node
  }

  // Structure mirrors the SSR template: root -> tablist + panels (descendants
  // discovered by querySelectorAll just as the enhancement script does).
  const root = makeNode()
  root.classList.add('zone-nav', cssScope)
  root.setAttribute('data-zone-nav', '')
  root.setAttribute('aria-label', 'Explorar')
  root.id = `${cssScope}-nav`

  const tablist = makeNode()
  tablist.classList.add('zone-nav-tabs')

  for (const item of zn.items) {
    const tab = makeNode()
    tab.classList.add('zone-nav-tab')
    if (item.active) tab.classList.add('is-active')
    tab.setAttribute('id', item.tabId)
    tab.setAttribute('data-zone-tab', item.key)
    tab.setAttribute('data-zone-panel-ref', item.panelId)
    tablist.children.push(tab)

    const panel = makeNode()
    panel.classList.add('zone-nav-panel')
    if (item.active) panel.classList.add('is-active')
    panel.setAttribute('id', item.panelId)
    panel.setAttribute('data-zone-panel', item.key)
    root.children.push(panel)
  }

  root.children.unshift(tablist)
  return { root, tablist }
}

function createZoneContext(presentations) {
  const dom = presentations.map(createZoneDom)
  const roots = dom.map(d => d.root)
  const documentStub = {
    activeElement: null,
    querySelectorAll(sel) { return sel === '[data-zone-nav]' ? roots : [] },
    querySelector() { return null }
  }
  const windowStub = {
    location: {
      _hash: '',
      get hash() { return this._hash },
      set hash(v) {
        // Browser normalizes location.hash to include the leading '#'.
        this._hash = String(v).startsWith('#') ? String(v) : '#' + v
      }
    },
    _listeners: {},
    addEventListener(type, fn) { (this._listeners[type] = this._listeners[type] || []).push(fn) }
  }
  return { dom, roots, documentStub, windowStub }
}

function runZoneEnhancement(html, ctx) {
  const scriptText = extractZoneNavScript(html)
  assert(scriptText.length > 0, 'Enhancement script extracted from SSR output')
  const fn = new Function('window', 'document', 'navigator', scriptText)
  fn(ctx.windowStub, ctx.documentStub, {})
}

function activeTabsOf(root) {
  return root.querySelectorAll('[data-zone-tab]').filter(t => t.classList.contains('is-active'))
}

async function testMultipleRootsEnhancedIndependently() {
  const corral = await renderApp('valdi.app', '/corral')
  const costa = await renderApp('valdi.app', '/costa')

  const corralZn = corral.result.presentation.zoneNavigation
  const costaZn = costa.result.presentation.zoneNavigation
  const corralKeys = corralZn.items.map(i => i.key)
  const costaKeys = costaZn.items.map(i => i.key)

  const ctx = createZoneContext([corral.result.presentation, costa.result.presentation])
  runZoneEnhancement(corral.html, ctx)

  const [corralRoot, costaRoot] = ctx.roots

  // Every root is enhanced independently.
  assert(corralRoot.classList.contains('is-enhanced'), 'Corral root enhanced')
  assert(costaRoot.classList.contains('is-enhanced'), 'Costa root enhanced')
  assertEqual(ctx.dom[0].tablist.getAttribute('role'), 'tablist', 'Corral tablist role applied')
  assertEqual(ctx.dom[1].tablist.getAttribute('role'), 'tablist', 'Costa tablist role applied')

  // Root-local discovery: each root resolves exactly its own tabs/panels.
  assertEqual(corralRoot.querySelectorAll('[data-zone-tab]').length, corralKeys.length,
    'Corral discovers only Corral tabs')
  assertEqual(costaRoot.querySelectorAll('[data-zone-tab]').length, costaKeys.length,
    'Costa discovers only Costa tabs')
  assertEqual(corralRoot.querySelectorAll('[data-zone-panel]').length, corralKeys.length,
    'Corral discovers only Corral panels')
  assertEqual(costaRoot.querySelectorAll('[data-zone-panel]').length, costaKeys.length,
    'Costa discovers only Costa panels')
  assertEqual(corralRoot.querySelector('.zone-nav-tabs'), ctx.dom[0].tablist,
    'Corral resolves its own tablist')
  assertEqual(costaRoot.querySelector('.zone-nav-tabs'), ctx.dom[1].tablist,
    'Costa resolves its own tablist')

  // Initial activation with empty hash: first tab of EACH root (no cross-talk).
  let corralActive = activeTabsOf(corralRoot)
  let costaActive = activeTabsOf(costaRoot)
  assertEqual(corralActive.length, 1, 'Corral has exactly one active tab')
  assertEqual(costaActive.length, 1, 'Costa has exactly one active tab')
  assertEqual(corralActive[0].getAttribute('data-zone-tab'), corralKeys[0], 'Corral active = its first key')
  assertEqual(costaActive[0].getAttribute('data-zone-tab'), costaKeys[0], 'Costa active = its first key')
  assertEqual(corralActive[0].getAttribute('aria-selected'), 'true', 'Corral first tab aria-selected=true')
  assertEqual(costaActive[0].getAttribute('aria-selected'), 'true', 'Costa first tab aria-selected=true')

  // hashchange to a Costa-only panel must not disturb the Corral root.
  const costaTargetKey = costaKeys[3]
  const costaTargetPanel = costaRoot.querySelectorAll('[data-zone-panel]')
    .find(p => p.getAttribute('data-zone-panel') === costaTargetKey)
  ctx.windowStub.location.hash = costaTargetPanel.id
  ctx.windowStub._listeners.hashchange.forEach(fn => fn())

  let costaActive2 = activeTabsOf(costaRoot)
  assertEqual(costaActive2.length, 1, 'Costa still exactly one active tab')
  assertEqual(costaActive2[0].getAttribute('data-zone-tab'), costaTargetKey,
    'Costa responded to its own hashchange')
  assertEqual(activeTabsOf(corralRoot)[0].getAttribute('data-zone-tab'), corralKeys[0],
    'Corral untouched by a Costa-only hashchange')

  // Click on a Corral tab must not disturb the Costa root.
  const corralTargetKey = corralKeys[2]
  const corralTargetTab = corralRoot.querySelectorAll('[data-zone-tab]')
    .find(t => t.getAttribute('data-zone-tab') === corralTargetKey)
  corralTargetTab.listeners.click.forEach(fn => fn({ preventDefault() {} }))

  const corralActive2 = activeTabsOf(corralRoot)
  assertEqual(corralActive2.length, 1, 'Corral still exactly one active tab')
  assertEqual(corralActive2[0].getAttribute('data-zone-tab'), corralTargetKey,
    'Corral responded to its own click')
  const costaAfterCorralClick = activeTabsOf(costaRoot)
  assertEqual(costaAfterCorralClick[0].getAttribute('data-zone-tab'), costaTargetKey,
    'Costa selection preserved after a Corral-local click')

  // aria-controls wiring stays root-local and matches the target panel.
  const corralTarget = corralZn.items.find(i => i.key === corralTargetKey)
  assertEqual(corralTargetTab.getAttribute('aria-controls'), corralTarget.panelId,
    'Corral tab points at its own panel')

  // Distinct server-derived ids (never a global literal).
  assert(corralRoot.id !== costaRoot.id, 'Root ids are distinct')
  assert(corralRoot.id.endsWith('-nav') && !corralRoot.id.includes('explorar'),
    'Corral root id is scoped, not a literal')
}

async function testSeoStillRendersForZones() {
  const { html } = await renderApp('valdi.app', '/corral')
  assert(html.includes('<title>'), 'Zone pages still render a document title')
  assert(html.includes('<main id="main-content">'), 'Zone pages still render main content')
  assert(html.includes('application/ld+json'), 'Zone pages still render JSON-LD')
}

async function runTests() {
  console.log('🧪 Running ZoneNavigation Web Integration / SSR Tests...\n')

  const tests = [
    testRouteConfigCarriesZoneNavigation,
    testCorralPipeline,
    testCostaPipeline,
    testTwoApplicationNoLeak,
    testNonZoneApplicationUnchanged,
    testSsrNoJsReadable,
    testSsrA11yWiringRelationships,
    testResponsiveNoPageOverflow,
    testRootCssSelectorMatchesSsrDom,
    testRootDomIdScopedDeterministic,
    testMultipleRootsEnhancedIndependently,
    testSeoStillRendersForZones
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
  console.log(`\nZoneNavigation Web Integration: ${result.passed}/${result.passed + result.failed} passed`)
  process.exit(result.failed > 0 ? 1 : 0)
}).catch(err => {
  console.error('Test error:', err)
  process.exit(1)
})