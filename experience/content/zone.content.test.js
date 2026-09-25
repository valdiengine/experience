/**
 * ZoneContent Core Content Contract Tests
 *
 * APP-ZONE-TABS-2 - Isla Teja visual integration
 *
 * Framework-free validator suite for experience/content/zone.content.js:
 * - contract validation (scopeId, contentRef, component, kind-specific bodies)
 * - forbidden presentation/visual fields and raw HTML rejection
 * - pairing against ZoneNavigation (coverage, orphan refs, component kinds,
 *   scopeId coherence)
 */

import {
  validateZoneContentConfig,
  validateZoneContentPairing,
  createZoneContent,
  ZoneContentError,
  ZONE_CONTENT_COMPONENTS,
  ZONE_CONTENT_FORBIDDEN_FIELDS
} from './zone.content.js'

import { ZONE_NAVIGATION_COMPONENTS } from '../navigation/zone.navigation.js'

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`)
  }
}

function assertInvalid(result, message) {
  assert(result && result.valid === false, `${message} (expected invalid, got valid)`)
  assert(result.errors && result.errors.length > 0, `${message} (expected errors)`)
}

const VALID_ISLA_TEJA = {
  scopeId: 'isla-teja-main',
  items: [
    {
      contentRef: 'valdi:isla-teja:descubre',
      component: 'zone.intro',
      lead: 'La isla fluvial de Valdivia',
      paragraphs: ['Un pÃƒÂ¡rrafo.', 'Otro pÃƒÂ¡rrafo.']
    },
    {
      contentRef: 'valdi:isla-teja:gastronomia',
      component: 'zone.list',
      lead: 'Costanera gastronÃƒÂ³mica',
      items: [
        { name: 'Cafe de prueba', description: 'Contenido semantico de prueba', note: 'Ejemplo' },
        { name: 'Restaurantes de la costanera', description: 'Cocina de mar' }
      ]
    },
    {
      contentRef: 'valdi:isla-teja:mapa',
      component: 'zone.map',
      title: 'Mapa de Isla Teja',
      location: 'Isla Teja Ã¢â‚¬â€ Valdivia, Chile',
      coordinates: [-39.8051, -73.2499],
      note: 'Puente Pedro de Valdivia'
    }
  ]
}

const VALID_NAVIGATION = {
  scopeId: 'isla-teja-main',
  items: [
    { key: 'descubre', label: 'Descubre', component: 'zone.intro', contentRef: 'valdi:isla-teja:descubre' },
    { key: 'gastronomia', label: 'GastronomÃƒÂ­a', component: 'zone.list', contentRef: 'valdi:isla-teja:gastronomia' },
    { key: 'mapa', label: 'Mapa', component: 'zone.map', contentRef: 'valdi:isla-teja:mapa' }
  ]
}

function testComponentVocabularyAligned() {
  assert(ZONE_CONTENT_COMPONENTS.length === ZONE_NAVIGATION_COMPONENTS.length,
    'Zone content component vocabulary must mirror the navigation vocabulary')
  for (const c of ZONE_NAVIGATION_COMPONENTS) {
    assert(ZONE_CONTENT_COMPONENTS.includes(c), `Shared vocabulary includes ${c}`)
  }
}

function testForbiddenFieldsDefined() {
  for (const field of ['css', 'colors', 'styles', 'background', 'color', 'zIndex', 'html', 'rawHtml', 'className', 'style']) {
    assert(ZONE_CONTENT_FORBIDDEN_FIELDS.includes(field), `Forbidden field declared: ${field}`)
  }
}

function testValidConfigAccepted() {
  const result = validateZoneContentConfig(VALID_ISLA_TEJA)
  assert(result.valid === true, 'Valid isla-teja content accepted')
  assert(result.content.scopeId === 'isla-teja-main', 'scopeId preserved')
  assert(result.content.items.length === 3, 'All items normalized')

  const intro = result.content.items[0]
  assert(intro.paragraphs.length === 2, 'intro paragraphs preserved')
  assert(!('paragraphs' in result.content.items[1]), 'list item has no intro paragraphs')

  const list = result.content.items[1]
  assert(list.items.length === 2, 'list entries preserved')
  assert(list.items[0].name === 'Cafe de prueba', 'list entry name preserved')
  assert(list.items[1].note === undefined, 'optional note omitted when absent')

  const map = result.content.items[2]
  assert(map.location === 'Isla Teja Ã¢â‚¬â€ Valdivia, Chile', 'map location preserved')
  assert(map.coordinates.length === 2, 'map coordinates preserved')
  assert(map.title === 'Mapa de Isla Teja', 'map title preserved')
}

function testCustomClassRejected() {
  const cfg = {
    scopeId: 'x',
    items: [{ contentRef: 'v:z:s', component: 'zone.list', items: [{ name: 'A' }], style: 'color:red' }]
  }
  assertInvalid(validateZoneContentConfig(cfg), 'style field must be rejected')
}

function testVisualFieldsRejected() {
  for (const field of ['x', 'y', 'width', 'height', 'rotation', 'circle', 'star', 'triangle', 'css', 'colors', 'styles', 'background', 'color', 'zIndex']) {
    const cfg = {
      scopeId: 'x',
      items: [{ contentRef: 'v:z:s', component: 'zone.list', items: [{ name: 'A' }], [field]: field === 'css' ? '.a{}' : 1 }]
    }
    assertInvalid(validateZoneContentConfig(cfg), `content field "${field}" must be rejected`)
  }
}

function testNestedForbiddenFieldsRejected() {
  const cases = [
    {
      name: 'nested style inside a list entry',
      cfg: {
        scopeId: 'x',
        items: [
          {
            contentRef: 'v:z:s',
            component: 'zone.list',
            items: [{ name: 'Example', style: 'color:red' }]
          }
        ]
      },
      needle: 'style'
    },
    {
      name: 'nested color inside a nested object (metadata)',
      cfg: {
        scopeId: 'x',
        items: [
          {
            contentRef: 'v:z:s',
            component: 'zone.list',
            items: [{ name: 'Example', metadata: { color: '#fff' } }]
          }
        ]
      },
      needle: 'color'
    },
    {
      name: 'nested className inside a list entry',
      cfg: {
        scopeId: 'x',
        items: [
          {
            contentRef: 'v:z:s',
            component: 'zone.list',
            items: [{ name: 'Example', className: 'highlight' }]
          }
        ]
      },
      needle: 'className'
    },
    {
      name: 'nested y inside an array of objects',
      cfg: {
        scopeId: 'x',
        items: [
          {
            contentRef: 'v:z:s',
            component: 'zone.list',
            items: [{ name: 'Example', history: [{ y: 5 }] }]
          }
        ]
      },
      needle: 'y'
    },
    {
      name: 'nested background inside a paragraph wrapper object',
      cfg: {
        scopeId: 'x',
        items: [
          {
            contentRef: 'v:z:s',
            component: 'zone.intro',
            paragraphs: ['ok'],
            extra: { background: 'url(evil)' }
          }
        ]
      },
      needle: 'background'
    }
  ]

  for (const c of cases) {
    assertInvalid(validateZoneContentConfig(c.cfg), `${c.name} must be rejected`)

    let threw = false
    try {
      createZoneContent(c.cfg)
    } catch (error) {
      threw = error instanceof ZoneContentError && error.errors.some(e => e.includes(c.needle))
    }
    assert(threw, `createZoneContent throws ZoneContentError mentioning "${c.needle}" for ${c.name}`)
  }

  const legit = validateZoneContentConfig(VALID_ISLA_TEJA)
  assert(legit.valid === true, 'Legitimate nested content fields (name/description/note) still pass')
}

function testRawHtmlRejected() {
  const cfg = {
    scopeId: 'x',
    items: [{ contentRef: 'v:z:s', component: 'zone.intro', paragraphs: ['<script>alert(1)</script>'] }]
  }
  assertInvalid(validateZoneContentConfig(cfg), 'raw HTML inside content must be rejected')
}

function testInvalidComponentRejected() {
  const cfg = {
    scopeId: 'x',
    items: [{ contentRef: 'v:z:s', component: 'not.a.component', items: [{ name: 'A' }] }]
  }
  assertInvalid(validateZoneContentConfig(cfg), 'unregistered component must be rejected')
}

function testUnstructuredContentRefRejected() {
  const cfg = {
    scopeId: 'x',
    items: [{ contentRef: 'plain-string', component: 'zone.list', items: [{ name: 'A' }] }]
  }
  assertInvalid(validateZoneContentConfig(cfg), 'unstructured contentRef must be rejected')
}

function testDuplicateContentRefRejected() {
  const cfg = {
    scopeId: 'x',
    items: [
      { contentRef: 'v:z:s', component: 'zone.list', items: [{ name: 'A' }] },
      { contentRef: 'v:z:s', component: 'zone.list', items: [{ name: 'B' }] }
    ]
  }
  assertInvalid(validateZoneContentConfig(cfg), 'duplicated contentRef must be rejected')
}

function testKindContractsEnforced() {
  const introNoParagraphs = {
    scopeId: 'x',
    items: [{ contentRef: 'v:z:s', component: 'zone.intro', lead: 'len' }]
  }
  assertInvalid(validateZoneContentConfig(introNoParagraphs), 'zone.intro requires paragraphs')

  const listNoItems = {
    scopeId: 'x',
    items: [{ contentRef: 'v:z:s', component: 'zone.list', lead: 'len' }]
  }
  assertInvalid(validateZoneContentConfig(listNoItems), 'zone.list requires items')

  const listBadEntry = {
    scopeId: 'x',
    items: [{ contentRef: 'v:z:s', component: 'zone.list', items: [{ description: 'no name' }] }]
  }
  assertInvalid(validateZoneContentConfig(listBadEntry), 'zone.list entry requires name')

  const mapNoCoord = {
    scopeId: 'x',
    items: [{ contentRef: 'v:z:s', component: 'zone.map', location: 'Where' }]
  }
  assertInvalid(validateZoneContentConfig(mapNoCoord), 'zone.map requires coordinates')

  const mapBadCoord = {
    scopeId: 'x',
    items: [{ contentRef: 'v:z:s', component: 'zone.map', location: 'Where', coordinates: [-39.8] }]
  }
  assertInvalid(validateZoneContentConfig(mapBadCoord), 'zone.map coordinates must be [lat, lng]')

  const introWithList = {
    scopeId: 'x',
    items: [
      {
        contentRef: 'v:z:s',
        component: 'zone.intro',
        paragraphs: ['p'],
        items: [{ name: 'nope' }]
      }
    ]
  }
  assertInvalid(validateZoneContentConfig(introWithList), 'zone.intro must not carry list fields')

  const mapWithList = {
    scopeId: 'x',
    items: [
      {
        contentRef: 'v:z:s',
        component: 'zone.map',
        location: 'Where',
        coordinates: [-39.8, -73.2],
        items: [{ name: 'nope' }]
      }
    ]
  }
  assertInvalid(validateZoneContentConfig(mapWithList), 'zone.map must not carry list fields')
}

function validatePairingError(navigation, content, needle) {
  const result = validateZoneContentPairing(navigation, content)
  assert(result.valid === false, `Pairing must be invalid when ${needle}`)
  assert(result.errors.some(e => e.includes(needle)), `Pairing error mentions: ${needle}`)
}

function testPairingCoherent() {
  const validContent = validateZoneContentConfig(VALID_ISLA_TEJA).content
  const result = validateZoneContentPairing(VALID_NAVIGATION, validContent)
  assert(result.valid === true, 'Coherent navigation/content pairing accepted')

  const missing = {
    scopeId: 'isla-teja-main',
    items: validContent.items.slice(0, 2)
  }
  validatePairingError(VALID_NAVIGATION, missing, 'has no paired ZoneContent')

  const orphan = {
    scopeId: 'isla-teja-main',
    items: [...validContent.items, {
      contentRef: 'valdi:isla-teja:extra',
      component: 'zone.list',
      items: [{ name: 'X' }]
    }]
  }
  validatePairingError(VALID_NAVIGATION, orphan, 'has no paired ZoneNavigation item')

  const wrongKind = {
    scopeId: 'isla-teja-main',
    items: validContent.items.map(item =>
      item.contentRef === 'valdi:isla-teja:mapa'
        ? { ...item, component: 'zone.list', items: [{ name: 'X' }] }
        : item
    )
  }
  validatePairingError(VALID_NAVIGATION, wrongKind, 'declares')

  const wrongScope = {
    scopeId: 'other-main',
    items: validContent.items
  }
  validatePairingError(VALID_NAVIGATION, wrongScope, 'does not match navigation scopeId')
}

function testZoneContentClass() {
  const content = createZoneContent(VALID_ISLA_TEJA)
  assert(content.scopeId === 'isla-teja-main', 'class scopeId')
  assert(content.size === 3, 'class size')
  assert(content.hasItem('valdi:isla-teja:mapa'), 'hasItem')
  assert(!content.hasItem('valdi:isla-teja:missing'), 'missing item')
  const map = content.getItem('valdi:isla-teja:mapa')
  assert(map && map.location, 'getItem returns the item')
  const json = content.toJSON()
  assert(json.items.length === 3, 'toJSON serializes items')

  const bad = { scopeId: 'x', items: [] }
  let threw = false
  try {
    createZoneContent(bad)
  } catch (error) {
    threw = error instanceof ZoneContentError
  }
  assert(threw, 'invalid config throws ZoneContentError')
}

function testImmutability() {
  const content = createZoneContent(VALID_ISLA_TEJA)
  let mutated = false
  const items = content.items
  try {
    items[0].paragraphs.push('x')
  } catch (error) {
    mutated = true
  }
  assert(mutated, 'normalized items are frozen')
}

async function runTests() {
  console.log('Ã°Å¸Â§Âª Running ZoneContent Core Content Contract Tests...\n')

  const tests = [
    testComponentVocabularyAligned,
    testForbiddenFieldsDefined,
    testValidConfigAccepted,
    testCustomClassRejected,
    testVisualFieldsRejected,
    testNestedForbiddenFieldsRejected,
    testRawHtmlRejected,
    testInvalidComponentRejected,
    testUnstructuredContentRefRejected,
    testDuplicateContentRefRejected,
    testKindContractsEnforced,
    testPairingCoherent,
    testZoneContentClass,
    testImmutability
  ]

  let passed = 0
  let failed = 0

  for (const test of tests) {
    try {
      await test()
      console.log(`Ã¢Å“â€¦ ${test.name}`)
      passed++
    } catch (error) {
      console.log(`Ã¢ÂÅ’ ${test.name}: ${error.message}`)
      failed++
    }
  }

  console.log(`\nÃ°Å¸â€œÅ  Results: ${passed} passed, ${failed} failed`)
  return { passed, failed }
}

export { runTests }

runTests().then(result => {
  console.log(`\nZoneContent Contract: ${result.passed}/${result.passed + result.failed} passed`)
  process.exit(result.failed > 0 ? 1 : 0)
}).catch(err => {
  console.error('Test error:', err)
  process.exit(1)
})
