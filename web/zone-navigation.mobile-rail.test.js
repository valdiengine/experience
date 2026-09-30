/**
 * ZoneNavigation Mobile Rail Geometry Tests
 *
 * APP-ZONE-TABS-MOBILE-1B - Isla Teja physical-device remediation
 *
 * Locks the MOBILE CSS CONTRACT for .zone-nav-rail after the D1 remediation.
 *
 * Proven defect (D1): at <= 767px the rail carried
 *   margin-left: calc(var(--spacing-md) * -2);
 *   margin-right: calc(var(--spacing-md) * -2);
 * while the BASE rail rule carried max-width: 100%. Those are mutually
 * unsatisfiable: the negative margins request 422px of width inside a 358px
 * content box, max-width clamps the rail back to 358px, and the over-constrained
 * block is resolved by CSS dropping margin-right to +32px. The rail's left edge
 * then sits 16px OUTSIDE the viewport (x = -16) with a 48px dead gutter right.
 *
 * LIMITATION, stated up front: these are string/declaration-level assertions over
 * the emitted stylesheet. There is no layout engine in this repository (no
 * jsdom, Playwright, Puppeteer, or CSS layout engine), so NOTHING here proves
 * physical browser rendering. FINAL CAUSAL CERTIFICATION REQUIRES A PHYSICAL
 * STAGE RETEST on the device that reproduces the defect.
 *
 * What these tests DO guarantee is that the contradictory geometry cannot come
 * back unnoticed, and that the rest of the mobile contract (rail scrolls, tabs
 * reachable, nothing hidden, desktop intact, scope still Application-specific)
 * is preserved.
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

/** Strip /* ... *\/ comments so assertion text cannot hide in a comment. */
function stripCssComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '')
}

/**
 * Every @media block body for a given query.
 *
 * NOTE: this stylesheet contains more than one `@media (max-width: 767px)` block
 * - zoneContentStyles contributes its own before the ZoneNavigation one. A
 * helper that returned only the FIRST match would inspect the wrong block and
 * pass vacuously, so callers must select explicitly via mediaBlockContaining.
 */
function mediaBlocks(css, query) {
  const out = []
  const needle = `@media ${query}`
  let from = 0
  for (;;) {
    const start = css.indexOf(needle, from)
    if (start === -1) break
    const open = css.indexOf('{', start)
    if (open === -1) break
    let depth = 0
    let end = -1
    for (let i = open; i < css.length; i++) {
      if (css[i] === '{') depth++
      else if (css[i] === '}') {
        depth--
        if (depth === 0) { end = i; break }
      }
    }
    if (end === -1) break
    out.push(css.slice(open + 1, end))
    from = end + 1
  }
  return out
}

/** The single @media block for `query` that contains `selector`. */
function mediaBlockContaining(css, query, selector) {
  const matches = mediaBlocks(css, query).filter(b => b.includes(selector))
  assert(matches.length === 1,
    `Expected exactly one \`@media ${query}\` block containing ${selector}, found ${matches.length}`)
  return matches[0]
}

/** All declarations of the (last) rule whose selector list contains `selector`. */
function declarationsFor(css, selector) {
  const out = []
  const re = /([^{}]+)\{([^{}]*)\}/g
  let m
  while ((m = re.exec(css)) !== null) {
    const selectors = m[1].split(',').map(s => s.trim())
    if (!selectors.includes(selector)) continue
    for (const decl of m[2].split(';')) {
      const d = decl.trim()
      if (d) out.push(d)
    }
  }
  return out
}

function declValue(decls, property) {
  for (const d of decls) {
    const idx = d.indexOf(':')
    if (idx === -1) continue
    if (d.slice(0, idx).trim().toLowerCase() === property) {
      return d.slice(idx + 1).trim()
    }
  }
  return undefined
}

/** All selector texts in the stylesheet, comma-separated lists preserved. */
function allSelectors(css) {
  const out = []
  const re = /([^{}]+)\{/g
  let m
  while ((m = re.exec(css)) !== null) {
    for (const sel of m[1].split(',')) {
      const s = sel.trim()
      if (s && !s.startsWith('@')) out.push(s)
    }
  }
  return out
}

async function renderIslaTeja() {
  const result = await renderer.render({ domain: 'valdi.app', path: '/isla-teja' })
  assert(result.success === true, `Pipeline must succeed: ${result.error || ''}`)
  const html = htmlRenderer.render(result.presentation, {
    domain: 'valdi.app',
    pathname: '/isla-teja',
    canonicalDomain: 'valdi.app',
  })
  return html
}

async function loadCss() {
  const html = await renderIslaTeja()
  const scope = 'zn-valdi-app-isla-teja-isla-teja-main'
  assert(html.includes(scope), `Application scope class must be emitted (${scope})`)

  // The banner comment is unique to the ZoneNavigation stylesheet. The opening
  // <style> tag sits BEFORE it, so search backwards.
  const marker = `/* Zone Navigation (tabs) - scope: ${scope} */`
  const at = html.indexOf(marker)
  assert(at !== -1, 'ZoneNavigation stylesheet banner must be present')
  const styleOpen = html.lastIndexOf('<style>', at)
  assert(styleOpen !== -1, 'ZoneNavigation stylesheet has an opening <style> tag')
  const bodyStart = html.indexOf('>', styleOpen) + 1
  const styleClose = html.indexOf('</style>', bodyStart)
  assert(styleClose > bodyStart, 'ZoneNavigation stylesheet is closed')
  const css = stripCssComments(html.slice(bodyStart, styleClose))

  assert(css.includes(`.${scope} .zone-nav-rail`),
    'Extracted stylesheet must actually contain the ZoneNavigation rules')
  return { css, html, scope }
}

// ---------------------------------------------------------------------------
// 1. The proven contradictory geometry is gone
// ---------------------------------------------------------------------------

async function testMobileRailHasNoNegativeBleedMargins() {
  const { css, scope } = await loadCss()
  const mobile = mediaBlockContaining(css, '(max-width: 767px)', `.${scope} .zone-nav-tabs`)

  const railDecls = declarationsFor(mobile, `.${scope} .zone-nav-rail`)

  for (const d of railDecls) {
    assert(!/margin-left/.test(d),
      `Mobile .zone-nav-rail must not declare margin-left (D1): "${d}"`)
    assert(!/margin-right/.test(d),
      `Mobile .zone-nav-rail must not declare margin-right (D1): "${d}"`)
  }

  // Belt and braces: the negative-margin idiom must be gone from the whole
  // mobile block, wherever it might be reintroduced.
  assert(!/margin-(left|right)\s*:\s*calc\(var\(--spacing-md\)\s*\*\s*-/.test(mobile),
    'No negative spacing-md bleed margin may exist in the mobile block')
}

async function testMobileRailKeepsNoOverconstraint() {
  const { css, scope } = await loadCss()
  const mobile = mediaBlockContaining(css, '(max-width: 767px)', `.${scope} .zone-nav-tabs`)

  // max-width is what made the combination unsatisfiable. It may remain on the
  // BASE rule (where it is non-binding: width:auto == containing block width),
  // but the mobile block must not re-add an independent max-width together with
  // any margin, which would reintroduce the over-constrained equation.
  const railDecls = declarationsFor(mobile, `.${scope} .zone-nav-rail`)
  const hasMaxWidth = railDecls.some(d => /^max-width\s*:/.test(d))
  const hasMargin = railDecls.some(d => /^margin/.test(d))
  assert(!(hasMaxWidth && hasMargin),
    'Mobile .zone-nav-rail must not combine max-width with margins (over-constrained box)')

  const base = declarationsFor(css, `.${scope} .zone-nav-rail`)
  const baseMaxWidth = declValue(base, 'max-width')
  assertEqual(baseMaxWidth, '100%',
    'Base .zone-nav-rail keeps max-width: 100%, non-binding while width is auto')
}

// ---------------------------------------------------------------------------
// 2. The rail is still the single horizontal scroll container
// ---------------------------------------------------------------------------

async function testRailRemainsHorizontallyScrollable() {
  const { css, scope } = await loadCss()
  const base = declarationsFor(css, `.${scope} .zone-nav-rail`)

  assertEqual(declValue(base, 'overflow-x'), 'auto',
    'Base .zone-nav-rail must keep overflow-x: auto')
  assertEqual(declValue(base, '-webkit-overflow-scrolling'), 'touch',
    'Base .zone-nav-rail must keep -webkit-overflow-scrolling: touch')

  const mobile = mediaBlockContaining(css, '(max-width: 767px)', `.${scope} .zone-nav-tabs`)
  const mobileRail = declarationsFor(mobile, `.${scope} .zone-nav-rail`)
  assert(!mobileRail.some(d => /^overflow/.test(d)),
    'Mobile block must not cancel or override the rail overflow model')

  // Desktop may still relax it, which is the pre-existing centred/wrapped model.
  const desktop = mediaBlockContaining(css, '(min-width: 768px)', `.${scope} .zone-nav-tabs`)
  assertEqual(declValue(declarationsFor(desktop, `.${scope} .zone-nav-rail`), 'overflow'), 'visible',
    'Desktop rail keeps overflow: visible')
}

async function testTabStripStaysAHorizontallyReachableStrip() {
  const { css, scope } = await loadCss()
  const tabs = declarationsFor(css, `.${scope} .zone-nav-tabs`)

  assertEqual(declValue(tabs, 'display'), 'flex', 'Tab strip remains a flex row')
  assertEqual(declValue(tabs, 'flex-wrap'), 'nowrap', 'Mobile tab strip does not wrap')
  assertEqual(declValue(tabs, 'min-width'), 'max-content',
    'Tab strip keeps min-width: max-content so all tabs stay reachable by rail scroll')

  // The strip keeps its own inline padding, which is what keeps the first tab
  // off the rail edge at scrollLeft 0 and the last tab off it at max scroll.
  const mobile = mediaBlockContaining(css, '(max-width: 767px)', `.${scope} .zone-nav-tabs`)
  const mobileTabs = declarationsFor(mobile, `.${scope} .zone-nav-tabs`)
  assertEqual(declValue(mobileTabs, 'padding-left'), 'var(--spacing-lg)',
    'Mobile tab strip keeps left inset padding')
  assertEqual(declValue(mobileTabs, 'padding-right'), 'var(--spacing-lg)',
    'Mobile tab strip keeps right inset padding')
}

// ---------------------------------------------------------------------------
// 3. No tab depends on JavaScript, and nothing hides the rail
// ---------------------------------------------------------------------------

async function testNoHidingTechniqueOnRailOrTabs() {
  const { css, scope } = await loadCss()

  for (const sel of [`.${scope} .zone-nav`, `.${scope} .zone-nav-container`,
    `.${scope} .zone-nav-rail`, `.${scope} .zone-nav-tabs`, `.${scope} .zone-nav-tab`]) {
    for (const d of declarationsFor(css, sel)) {
      assert(!/^display\s*:\s*none/.test(d), `${sel} must not use display:none - "${d}"`)
      assert(!/^visibility\s*:\s*hidden/.test(d), `${sel} must not use visibility:hidden - "${d}"`)
      assert(!/^opacity\s*:\s*0(\s|;|$)/.test(d), `${sel} must not use opacity:0 - "${d}"`)
      assert(!/^transform\s*:/.test(d), `${sel} must not use transform (no offscreen shifting) - "${d}"`)
      assert(!/^position\s*:\s*absolute/.test(d), `${sel} must not be absolutely positioned - "${d}"`)
      assert(!/^content-visibility\s*:/.test(d), `${sel} must not use content-visibility - "${d}"`)
      assert(!/^height\s*:\s*0/.test(d), `${sel} must not be collapsed to zero height - "${d}"`)
    }
  }

  // Progressive enhancement may still hide INACTIVE PANELS - that is the
  // pre-existing, contract-correct behaviour and is not what this test targets.
  const enhanced = declarationsFor(css, `.${scope}.zone-nav.is-enhanced .zone-nav-panel`)
  assertEqual(declValue(enhanced, 'display'), 'none',
    'Enhanced inactive panels remain hidden (pre-existing contract)')
}

async function testTabsAndRailSurviveWithoutJavaScript() {
  const html = await renderIslaTeja()

  assert(html.includes('data-zone-nav'), 'ZoneNavigation root emitted in SSR')
  assert(html.includes('class="zone-nav-rail"'), 'Rail present with no JS involved')
  assert(html.includes('<h2 class="zone-nav-title">Explora</h2>'),
    'Rail heading "Explora" present in SSR (no JS dependency)')

  for (const key of ['descubre', 'gastronomia', 'alojamientos', 'actividades', 'servicios', 'mapa']) {
    assert(html.includes(`data-zone-tab="${key}"`), `Tab ${key} present in SSR`)
  }

  // No hidden/aria-hidden/inert wrapper may gate the rail or the tabs.
  const railAt = html.indexOf('class="zone-nav-rail"')
  assert(railAt !== -1, 'Rail exists')
  const railOpen = html.lastIndexOf('<', railAt)
  const wrapper = html.slice(Math.max(0, railOpen - 400), railAt)
  assert(!/aria-hidden\s*=\s*"true"/.test(wrapper),
    'Rail is not inside an aria-hidden wrapper')
  assert(!/\shidden\s*=?/.test(wrapper), 'Rail is not inside a hidden wrapper')
  assert(!/\sinert\b/.test(wrapper), 'Rail is not inside an inert wrapper')
}

// ---------------------------------------------------------------------------
// 4. Desktop non-regression
// ---------------------------------------------------------------------------

async function testDesktopBehaviourIsUntouched() {
  const { css, scope } = await loadCss()
  const desktop = mediaBlockContaining(css, '(min-width: 768px)', `.${scope} .zone-nav-tabs`)

  assertEqual(declValue(declarationsFor(desktop, `.${scope} .zone-nav-tabs`), 'justify-content'), 'center',
    'Desktop tab strip stays centred')
  assertEqual(declValue(declarationsFor(desktop, `.${scope} .zone-nav-tabs`), 'flex-wrap'), 'wrap',
    'Desktop tab strip still wraps')
  assertEqual(declValue(declarationsFor(desktop, `.${scope} .zone-nav-tabs`), 'min-width'), '0',
    'Desktop tab strip still drops min-width: max-content')

  // The remediation must be mobile-only: the desktop block gains nothing.
  const desktopRail = declarationsFor(desktop, `.${scope} .zone-nav-rail`)
  assert(!desktopRail.some(d => /^margin/.test(d)),
    'Desktop block must not introduce rail margins')
}

// ---------------------------------------------------------------------------
// 5. Scope stays Application-specific, and the fix is generic
// ---------------------------------------------------------------------------

async function testScopeStaysApplicationSpecific() {
  const { css, scope } = await loadCss()
  assert(css.includes(`.${scope} .zone-nav-rail`), 'Zone nav CSS remains scoped to the Application')

  // Every zone-nav selector must still be qualified by the Application scope,
  // so no generic global .zone-nav-* rule can leak across Applications.
  const zoneNavSelectors = allSelectors(css).filter(s => s.includes('.zone-nav'))
  assert(zoneNavSelectors.length > 0, 'ZoneNavigation selectors were found')
  for (const sel of zoneNavSelectors) {
    assert(sel.includes(`.${scope}`),
      `Zone nav selector must stay Application-scoped, found unscoped: "${sel}"`)
  }

  // The remediation must be generic: no destination-specific class, and no
  // new mobile-only scope may appear.
  for (const sel of zoneNavSelectors) {
    assert(!/\.isla-teja-main\b/.test(sel),
      `No Isla-Teja-specific CSS class introduced: "${sel}"`)
    assert(!/mobile/i.test(sel),
      `No mobile-specific Application scope introduced: "${sel}"`)
  }
}

// ---------------------------------------------------------------------------
// 6. Progressive enhancement contract intact
// ---------------------------------------------------------------------------

async function testProgressiveEnhancementContractIntact() {
  const { html } = await loadCss()

  assert(html.includes('data-zone-nav'), 'Enhancement targets data-zone-nav')
  assert(html.includes('is-enhanced'), 'Enhancement still applies the is-enhanced class')
  assert(html.includes('aria-selected'), 'Enhancement still wires aria-selected')
  assert(html.includes('role="tablist"') || html.includes('.zone-nav-tabs'),
    'Tablist semantics still emitted')
}

async function runTests() {
  console.log('📱 Running ZoneNavigation Mobile Rail Geometry Tests (APP-ZONE-TABS-MOBILE-1B)...\n')

  const tests = [
    testMobileRailHasNoNegativeBleedMargins,
    testMobileRailKeepsNoOverconstraint,
    testRailRemainsHorizontallyScrollable,
    testTabStripStaysAHorizontallyReachableStrip,
    testNoHidingTechniqueOnRailOrTabs,
    testTabsAndRailSurviveWithoutJavaScript,
    testDesktopBehaviourIsUntouched,
    testScopeStaysApplicationSpecific,
    testProgressiveEnhancementContractIntact,
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
  console.log(`NOTE: string-level CSS assertions. They do NOT prove physical browser`)
  console.log(`      rendering. FINAL CAUSAL CERTIFICATION REQUIRES PHYSICAL STAGE RETEST.`)
  return { passed, failed }
}

export { runTests }

runTests().then(result => {
  console.log(`\nZone Navigation Mobile Rail (AZM-1B): ${result.passed}/${result.passed + result.failed} passed`)
  process.exit(result.failed > 0 ? 1 : 0)
}).catch(err => {
  console.error('Test error:', err)
  process.exit(1)
})
