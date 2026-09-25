/**
 * ZoneNavigation Tabs Presentation Strategy Tests
 *
 * APP-ZONE-TABS-1 - ZoneNavigation (tabs)
 *
 * Verifies content/presentation separation (same content, presentation adds
 * layout-only fields and never mutates content), Application isolation via
 * engine scope, resolvability of zone components, and the tabs component.
 */

import { presentZoneNavigationTabs } from './zone.navigation.tabs.js'
import { ZoneNavigationTabsComponent } from './components/zone-navigation-tabs.component.js'
import { ComponentRegistry } from './component.registry.js'
import {
  ZONE_NAVIGATION_COMPONENTS,
  ZONE_NAVIGATION_LAYOUTS
} from '../navigation/zone.navigation.js'

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

const CORRAL_CONTENT = {
  scopeId: 'corral-main',
  items: [
    { key: 'descubre', label: 'Descubre', component: 'zone.intro', contentRef: 'valdi:corral:descubre' },
    { key: 'gastronomia', label: 'Gastronomía', component: 'zone.list', contentRef: 'valdi:corral:gastronomia' },
    { key: 'alojamientos', label: 'Alojamientos', component: 'zone.list', contentRef: 'valdi:corral:alojamientos' },
    { key: 'actividades', label: 'Actividades', component: 'zone.list', contentRef: 'valdi:corral:actividades' },
    { key: 'comercio', label: 'Comercio', component: 'zone.list', contentRef: 'valdi:corral:comercio' },
    { key: 'mapa', label: 'Mapa', component: 'zone.map', contentRef: 'valdi:corral:mapa' }
  ]
}

const CORRAL_SCOPE = {
  applicationId: 'valdi.app/corral',
  scopeId: 'corral-main',
  scope: 'valdi.app/corral::corral-main',
  cssScope: 'zn-valdi-app-corral-corral-main'
}

const COSTA_CONTENT = {
  scopeId: 'costa-main',
  items: [
    { key: 'descubre', label: 'Descubre', component: 'zone.intro', contentRef: 'valdi:costa:descubre' },
    { key: 'gastronomia', label: 'Gastronomía', component: 'zone.list', contentRef: 'valdi:costa:gastronomia' },
    { key: 'mapa', label: 'Mapa', component: 'zone.map', contentRef: 'valdi:costa:mapa' }
  ]
}

const COSTA_SCOPE = {
  applicationId: 'valdi.app/costa',
  scopeId: 'costa-main',
  scope: 'valdi.app/costa::costa-main',
  cssScope: 'zn-valdi-app-costa-costa-main'
}

function testTabsPresentationFromContent() {
  const tabs = presentZoneNavigationTabs({ content: CORRAL_CONTENT, scope: CORRAL_SCOPE })
  assert(tabs !== null, 'Strategy should produce a descriptor')
  assertEqual(tabs.layout, 'tabs', 'Layout is tabs')
  assertEqual(tabs.items.length, 6, 'All items presented')
  assertEqual(tabs.activeKey, 'descubre', 'First item active by default')

  const first = tabs.items[0]
  assertEqual(first.key, 'descubre', 'Content key preserved')
  assertEqual(first.label, 'Descubre', 'Content label preserved')
  assertEqual(first.component, 'zone.intro', 'Content component preserved')
  assertEqual(first.contentRef, 'valdi:corral:descubre', 'Content contentRef preserved')
  assertEqual(first.tabId, 'zn-valdi-app-corral-corral-main-tab-descubre', 'tabId derived from scope')
  assertEqual(first.panelId, 'zn-valdi-app-corral-corral-main-panel-descubre', 'panelId derived from scope')
  assert(first.active === true, 'First item active in presentation')
}

function testContentNotMutatedByPresentation() {
  const snapshot = JSON.stringify(CORRAL_CONTENT)
  const frozen = JSON.parse(snapshot)
  Object.freeze(frozen)
  frozen.items.forEach(Object.freeze)

  const tabs = presentZoneNavigationTabs({ content: frozen, scope: CORRAL_SCOPE })
  assertEqual(tabs.items.length, 6, 'Strategy still renders frozen content')
  assertEqual(JSON.stringify(frozen), snapshot, 'Content must not be mutated by presentation')
  assert(!('tabId' in (frozen.items[0])), 'Content must not gain presentation ids')
  assert(!('layout' in frozen), 'Content must not gain presentation layout')
}

function testSameContentDifferentPresentationSeam() {
  // The content has zero presentation fields; the exact same content can feed
  // any future layout. Verify presentation identity does not exist in content.
  for (const item of CORRAL_CONTENT.items) {
    assert(!('tabId' in item), 'Content item has no tabId')
    assert(!('panelId' in item), 'Content item has no panelId')
    assert(!('active' in item), 'Content item has no active state')
  }
  const tabs = presentZoneNavigationTabs({ content: CORRAL_CONTENT, scope: CORRAL_SCOPE })
  assertEqual(tabs.layout, ZONE_NAVIGATION_LAYOUTS[0], 'Layout comes from the presentation strategy registry')
}

function testActiveKeySelection() {
  const tabs = presentZoneNavigationTabs({ content: CORRAL_CONTENT, scope: CORRAL_SCOPE, activeKey: 'mapa' })
  assertEqual(tabs.activeKey, 'mapa', 'Requested active key honored')
  assert(tabs.items.find(i => i.key === 'mapa').active === true, 'Mapa item active')
  assert(tabs.items.find(i => i.key === 'descubre').active === false, 'Descubre inactive')

  const invalid = presentZoneNavigationTabs({ content: CORRAL_CONTENT, scope: CORRAL_SCOPE, activeKey: 'nope' })
  assertEqual(invalid.activeKey, 'descubre', 'Unknown active key falls back to first')
}

function testApplicationIsolationByScope() {
  const corral = presentZoneNavigationTabs({ content: CORRAL_CONTENT, scope: CORRAL_SCOPE })
  const costa = presentZoneNavigationTabs({ content: COSTA_CONTENT, scope: COSTA_SCOPE })

  assert(corral.scope.cssScope !== costa.scope.cssScope, 'CSS scopes differ per Application')
  assertEqual(corral.scope.applicationId, 'valdi.app/corral', 'Corral scope carries its Application id')
  assertEqual(costa.scope.applicationId, 'valdi.app/costa', 'Costa scope carries its Application id')

  const corralIds = corral.items.flatMap(i => [i.tabId, i.panelId])
  const costaIds = costa.items.flatMap(i => [i.tabId, i.panelId])
  for (const id of corralIds) {
    assert(!costaIds.includes(id), `Cross-application id collision: ${id}`)
  }

  for (const item of costa.items) {
    assert(!corralIds.includes(item.tabId), `Costa tabId leaks into corral scope: ${item.tabId}`)
  }
}

function testZoneComponentsResolvableInRegistry() {
  const registry = new ComponentRegistry()
  for (const id of ZONE_NAVIGATION_COMPONENTS) {
    assert(registry.hasSection(id), `Component "${id}" must be registered`)
    const section = registry.getSection(id)
    assertEqual(section.id, id, `getSection("${id}") resolves the exact component`)
    assertEqual(section.type, 'section', `Component "${id}" is a section`)
  }
  assert(registry.hasSection('zone.navigation'), 'zone.navigation section registered')
}

function testZoneNavigationTabsComponent() {
  const tabs = presentZoneNavigationTabs({ content: CORRAL_CONTENT, scope: CORRAL_SCOPE })
  const vm = { zoneNavigation: tabs }
  const component = new ZoneNavigationTabsComponent(vm)
  assertEqual(component.componentId, 'zonenavigationtabs', 'Component id derives from class name per BaseComponent convention')
  const result = component.render()
  assert(result !== null, 'Component renders when zoneNavigation present')
  assertEqual(result.layout, 'tabs', 'Component exposes layout')
  assertEqual(result.items.length, 6, 'Component exposes all presented items')
  assert(result.events.select === 'zone:tabs:select', 'Component exposes tabs select event')
  assert(result.events.navigate === 'component:navigate', 'Component reuses base navigate event')
}

function testZoneNavigationTabsComponentValidation() {
  let threw = false
  try {
    new ZoneNavigationTabsComponent({}).render()
  } catch (error) {
    threw = String(error.message).includes('zoneNavigation')
  }
  assert(threw, 'Component must reject view models without zoneNavigation')
}

function testComponentDoesNotBypassContract() {
  const tabs = presentZoneNavigationTabs({ content: CORRAL_CONTENT, scope: CORRAL_SCOPE })
  const sections = tabs.items
  for (const item of sections) {
    assertEqual(item.component, CORRAL_CONTENT.items.find(c => c.key === item.key).component,
      'Presentation component id must come from content (resolvable), not presentation invention')
  }
}

async function runTests() {
  console.log('🧪 Running ZoneNavigation Tabs Presentation Strategy Tests...\n')

  const tests = [
    testTabsPresentationFromContent,
    testContentNotMutatedByPresentation,
    testSameContentDifferentPresentationSeam,
    testActiveKeySelection,
    testApplicationIsolationByScope,
    testZoneComponentsResolvableInRegistry,
    testZoneNavigationTabsComponent,
    testZoneNavigationTabsComponentValidation,
    testComponentDoesNotBypassContract
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
  console.log(`\nZoneNavigation Tabs Strategy: ${result.passed}/${result.passed + result.failed} passed`)
  process.exit(result.failed > 0 ? 1 : 0)
}).catch(err => {
  console.error('Test error:', err)
  process.exit(1)
})