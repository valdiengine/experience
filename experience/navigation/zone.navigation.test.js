/**
 * ZoneNavigation Core Content Contract Tests
 *
 * APP-ZONE-TABS-1 - ZoneNavigation (tabs)
 *
 * Validates the content contract: valid accepted, empty/duplicate/unresolvable
 * rejected, no raw HTML, no presentation/placement fields, structured
 * contentRef, and engine-generated scope isolation.
 */

import {
  validateZoneNavigationConfig,
  createZoneNavigation,
  ZoneNavigation,
  ZoneNavigationError,
  ZONE_NAVIGATION_LAYOUTS,
  ZONE_NAVIGATION_COMPONENTS,
  ZONE_NAVIGATION_FORBIDDEN_FIELDS
} from './zone.navigation.js'

import {
  generateZoneNavigationScope,
  sanitizeScopeSegment
} from './zone.navigation.scope.js'

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

function assertInvalid(validation, message) {
  assert(typeof validation === 'object' && validation.valid === false, message)
  assert(Array.isArray(validation.errors) && validation.errors.length > 0, `${message} (errors missing)`)
}

const VALID_CORRAL = {
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

function testValidZoneNavigationConfigAccepted() {
  const result = validateZoneNavigationConfig(VALID_CORRAL)
  assert(result.valid === true, 'Valid corral config should validate')
  assertEqual(result.errors.length, 0, 'Valid config should have no errors')
  assertEqual(result.navigation.scopeId, 'corral-main', 'scopeId should be preserved')
  assertEqual(result.navigation.items.length, 6, 'All 6 items preserved')
  const first = result.navigation.items[0]
  assertEqual(first.key, 'descubre', 'First key preserved')
  assertEqual(first.contentRef, 'valdi:corral:descubre', 'contentRef preserved')
  assertEqual(first.component, 'zone.intro', 'component preserved')
  assert(!('tabId' in first), 'Content must not carry presentation ids (tabId)')
  assert(!('layout' in first), 'Content must not carry presentation layout')
}

function testEmptyItemsRejected() {
  const result = validateZoneNavigationConfig({ scopeId: 'x', items: [] })
  assertInvalid(result, 'Empty items must be rejected')
}

function testMissingItemsRejected() {
  const result = validateZoneNavigationConfig({ scopeId: 'x' })
  assertInvalid(result, 'Missing items must be rejected')
}

function testDuplicateKeysRejected() {
  const cfg = { scopeId: 'x', items: [
    { key: 'a', label: 'A', component: 'zone.list', contentRef: 'v:z:a' },
    { key: 'a', label: 'A2', component: 'zone.list', contentRef: 'v:z:a2' }
  ] }
  const result = validateZoneNavigationConfig(cfg)
  assertInvalid(result, 'Duplicate item keys must be rejected')
  assert(result.errors.some(e => e.includes('duplicated')), 'Duplicate error should mention duplicated key')
}

function testMissingFieldsRejected() {
  const result = validateZoneNavigationConfig({ scopeId: 'x', items: [{ key: 'a' }] })
  assertInvalid(result, 'Item missing label/component/contentRef must be rejected')
}

function testInvalidScopeIdRejected() {
  const cfg = { scopeId: 'NOT VALID!!', items: [{ key: 'a', label: 'A', component: 'zone.list', contentRef: 'v:z:a' }] }
  const result = validateZoneNavigationConfig(cfg)
  assertInvalid(result, 'Invalid scopeId must be rejected')
}

function testForbiddenPresentationFieldsRejected() {
  const forbidden = ['x', 'y', 'width', 'height', 'rotation', 'circle', 'star', 'triangle', 'css', 'colors', 'styles']
  for (const field of forbidden) {
    const item = { key: 'a', label: 'A', component: 'zone.list', contentRef: 'v:z:a' }
    item[field] = 1
    const result = validateZoneNavigationConfig({ scopeId: 'x', items: [item] })
    assertInvalid(result, `Forbidden presentation field "${field}" must be rejected`)
    assert(result.errors.some(e => e.includes(field)), `Error should mention "${field}"`)
  }
  assert(FORBIDDEN_PRESENTATION_EXISTS(), 'ZONE_NAVIGATION_FORBIDDEN_FIELDS exported')
}

function FORBIDDEN_PRESENTATION_EXISTS() {
  return Array.isArray(ZONE_NAVIGATION_FORBIDDEN_FIELDS) && ZONE_NAVIGATION_FORBIDDEN_FIELDS.length > 0
}

function testRawHtmlRejected() {
  const label = { key: 'a', label: '<script>alert(1)</script>', component: 'zone.list', contentRef: 'v:z:a' }
  const htmlField = { key: 'a', label: 'A', component: 'zone.list', contentRef: 'v:z:a', html: '<div>x</div>' }
  const rawHtml = { key: 'a', label: 'A', component: 'zone.list', contentRef: 'v:z:a', rawHtml: '<b>y</b>' }

  assertInvalid(validateZoneNavigationConfig({ scopeId: 'x', items: [label] }), 'Raw HTML in label must be rejected')
  assertInvalid(validateZoneNavigationConfig({ scopeId: 'x', items: [htmlField] }), 'html field must be rejected')
  assertInvalid(validateZoneNavigationConfig({ scopeId: 'x', items: [rawHtml] }), 'rawHtml field must be rejected')
}

function testUnresolvableComponentRejected() {
  const cfg = { scopeId: 'x', items: [{ key: 'a', label: 'A', component: 'nope.missing', contentRef: 'v:z:a' }] }
  const result = validateZoneNavigationConfig(cfg)
  assertInvalid(result, 'Unregistered component must be rejected')
  assert(result.errors.some(e => e.includes('nope.missing')), 'Error should mention the component id')
}

function testContentRefStructurallyRequired() {
  const bad = { scopeId: 'x', items: [{ key: 'a', label: 'A', component: 'zone.list', contentRef: 'plain-string' }] }
  assertInvalid(validateZoneNavigationConfig(bad), 'Non-structured contentRef must be rejected')
  const good = { scopeId: 'x', items: [{ key: 'a', label: 'A', component: 'zone.list', contentRef: 'valdi:corral:gastronomia' }] }
  assert(validateZoneNavigationConfig(good).valid === true, 'Structured contentRef accepted')
}

function testZoneNavigationClass() {
  const nav = createZoneNavigation(VALID_CORRAL)
  assert(nav instanceof ZoneNavigation, 'createZoneNavigation should build ZoneNavigation')
  assertEqual(nav.scopeId, 'corral-main', 'scopeId getter')
  assertEqual(nav.size, 6, 'size getter')
  assert(nav.hasItem('mapa'), 'hasItem true')
  assert(!nav.hasItem('nope'), 'hasItem false')
  assertEqual(nav.getItem('mapa').contentRef, 'valdi:corral:mapa', 'getItem')
  assertEqual(nav.toJSON().items.length, 6, 'toJSON items')

  let threw = false
  try {
    createZoneNavigation({ scopeId: 'x', items: [] })
  } catch (error) {
    threw = error instanceof ZoneNavigationError
  }
  assert(threw, 'createZoneNavigation should throw ZoneNavigationError for invalid config')
}

function testContentDeepFrozen() {
  const nav = createZoneNavigation(VALID_CORRAL)
  const json = nav.toJSON()
  assert(Object.isFrozen(json.items), 'Navigation items should be frozen')
  assert(Object.isFrozen(json.items[0]), 'Navigation item should be frozen')
  const mutable = { scopeId: 'x', items: [{ key: 'a', label: 'A', component: 'zone.list', contentRef: 'v:z:a' }] }
  const nav2 = ZoneNavigation.create(mutable)
  assertEqual(nav2.size, 1, 'ZoneNavigation.create works')
}

function testLayoutsOnlyTabsForNow() {
  assertEqual(ZONE_NAVIGATION_LAYOUTS[0], 'tabs', 'First presentation strategy is tabs')
}

function testGenerateScopeSanitization() {
  const corral = generateZoneNavigationScope('valdi.app/corral', 'corral-main')
  assertEqual(corral.scope, 'valdi.app/corral::corral-main', 'Engine scope string')
  assertEqual(corral.cssScope, 'zn-valdi-app-corral-corral-main', 'CSS scope namespacing')
  assertEqual(corral.applicationId, 'valdi.app/corral', 'applicationId preserved')

  const costa = generateZoneNavigationScope('valdi.app/costa', 'costa-main')
  assertEqual(costa.cssScope, 'zn-valdi-app-costa-costa-main', 'Second app has distinct CSS scope')
  assert(corral.cssScope !== costa.cssScope, 'Scopes must not collide across applications')
  assert(corral.scope !== costa.scope, 'Scopes must be distinct across applications')
}

function testSanitizeScopeSegment() {
  assertEqual(sanitizeScopeSegment('Valdi.App/Corral'), 'valdi-app-corral', 'Sanitization lowercases and normalizes')
  assertEqual(sanitizeScopeSegment('corral-main'), 'corral-main', 'Already-safe segment unchanged')
  assertEqual(sanitizeScopeSegment(''), 'app', 'Empty segment falls back')
}

function testGenerateScopeRejectsInvalidInput() {
  let threw = false
  try {
    generateZoneNavigationScope('', 'x')
  } catch (error) {
    threw = true
  }
  assert(threw, 'Missing applicationId must throw')
  threw = false
  try {
    generateZoneNavigationScope('valdi.app/corral', '')
  } catch (error) {
    threw = true
  }
  assert(threw, 'Missing scopeId must throw')
}

function testValidateDoesNotMutateInput() {
  const snapshot = JSON.stringify(VALID_CORRAL)
  validateZoneNavigationConfig(VALID_CORRAL)
  assertEqual(JSON.stringify(VALID_CORRAL), snapshot, 'Validation must not mutate the input config')
}

async function runTests() {
  console.log('🧪 Running ZoneNavigation Core Content Contract Tests...\n')

  const tests = [
    testValidZoneNavigationConfigAccepted,
    testEmptyItemsRejected,
    testMissingItemsRejected,
    testDuplicateKeysRejected,
    testMissingFieldsRejected,
    testInvalidScopeIdRejected,
    testForbiddenPresentationFieldsRejected,
    testRawHtmlRejected,
    testUnresolvableComponentRejected,
    testContentRefStructurallyRequired,
    testZoneNavigationClass,
    testContentDeepFrozen,
    testLayoutsOnlyTabsForNow,
    testGenerateScopeSanitization,
    testSanitizeScopeSegment,
    testGenerateScopeRejectsInvalidInput,
    testValidateDoesNotMutateInput
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
  console.log(`\nZoneNavigation Core Contract: ${result.passed}/${result.passed + result.failed} passed`)
  process.exit(result.failed > 0 ? 1 : 0)
}).catch(err => {
  console.error('Test error:', err)
  process.exit(1)
})