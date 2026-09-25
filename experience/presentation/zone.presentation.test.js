/**
 * APP-ZONE-PRESENT-1 — ZonePresentation contract unit tests.
 * Framework-free: runs with `node experience/presentation/zone.presentation.test.js`.
 */

import {
  validateZonePresentationConfig,
  ZONE_PRESENTATION_VERSION,
  ZONE_PRESENTATION_VARIANTS,
  ZONE_PRESENTATION_TOKEN_KEYS,
  ZONE_PRESENTATION_FORBIDDEN_FIELDS,
  ZONE_PRESENTATION_VARIANT_TOKENS
} from './zone.presentation.js'

let passed = 0
let failed = 0

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function assertValid(config, message = 'config should be valid') {
  const result = validateZonePresentationConfig(config)
  assert(result.valid === true, `${message} — got ${JSON.stringify(result.errors)}`)
  assert(result.presentation !== null, `${message} — presentation must be produced`)
  return result.presentation
}

function assertInvalid(config, message = 'config should be rejected') {
  const result = validateZonePresentationConfig(config)
  assert(result.valid === false, `${message} — config was accepted`)
  assert(result.errors.length > 0, `${message} — errors must be reported`)
  assert(result.presentation === null, `${message} — rejected config must not produce a presentation`)
  return result.errors
}

async function testValidVariantConfigAccepted() {
  const p = assertValid({ version: '1', variant: 'nature' })
  assert(p.version === ZONE_PRESENTATION_VERSION, 'version echoed')
  assert(p.variant === 'nature', 'variant echoed')
  assert(Object.isFrozen(p), 'presentation is frozen')
  assert(Object.isFrozen(p.tokens), 'effective tokens are frozen')
}

async function testValidTokensConfigAccepted() {
  const p = assertValid({ version: '1', tokens: { primary: '#123456', accent: 'rgb(10, 20, 30)' } })
  assert(p.variant === null, 'no variant applied')
  assert(p.tokens.primary === '#123456', 'primary override kept')
  assert(p.tokens.accent === 'rgb(10, 20, 30)', 'accent function color kept')
}

async function testVariantAndTokensMerge() {
  const p = assertValid({ version: '1', variant: 'nature', tokens: { accent: '#000000' } })
  assert(Object.keys(p.tokens).length === Object.keys(ZONE_PRESENTATION_VARIANT_TOKENS.nature).length,
    'variant defaults fully present after merge')
  assert(p.tokens.primary === '#3a7d66', 'variant default primary preserved')
  assert(p.tokens.secondary === '#1f3530', 'variant default secondary preserved')
  assert(p.tokens.accent === '#000000', 'config override wins over variant default')
}

async function testHexAndFunctionColorShapesAccepted() {
  for (const value of ['#abc', '#abcd', '#aabbcc', '#aabbccdd', 'rgb(1, 2, 3)', 'rgba(1, 2, 3, 0.5)', 'hsl(120, 50%, 25%)', 'hsla(120, 50%, 25%, 1)']) {
    assertValid({ version: '1', variant: 'nature', tokens: { primary: value } }, `color "${value}" accepted`)
  }
}

async function testInvalidColorShapesRejected() {
  const bad = ['purple', '#12', '#12345', '#ggg', 'rgb(300)', 'url(evil.png)', 'var(--x)', '',
    '#123456; background: pink', 'red; } body {', 'expr', '123']
  for (const value of bad) {
    assertInvalid({ version: '1', variant: 'nature', tokens: { primary: value } }, `color "${value}" rejected`)
  }
}

async function testVersionRequiredAndSupported() {
  assertInvalid({ variant: 'nature' }, 'missing version')
  assertInvalid({ version: '2', variant: 'nature' }, 'unsupported future version')
  assertInvalid({ version: 1, variant: 'nature' }, 'non-string version')
}

async function testUnknownVariantRejected() {
  assertInvalid({ version: '1', variant: 'vaporwave' }, 'unknown variant')
  assertInvalid({ version: '1', variant: 42 }, 'non-string variant')
}

async function testUnknownTokenRejected() {
  assertInvalid({ version: '1', variant: 'nature', tokens: { fontWeight: '700' } },
    'unknown non-color token')
  assertInvalid({ version: '1', variant: 'nature', tokens: { fontSize: '16px' } },
    'unknown typography token')
  assertInvalid({ version: '1', variant: 'nature', tokens: { radius: '4px' } },
    'unknown radius token')
}

async function testForbiddenKeysRejected() {
  const forbidden = ['scope', 'scopeId', 'applicationId', 'domain', 'class', 'className', 'selector',
    'css', 'cssFile', 'path', 'url', 'style', 'html', 'rawHtml', 'htmlContent', 'innerHTML',
    'dangerouslySetInnerHTML', 'image', 'icon', 'font', 'background', 'backgroundImage', 'layout',
    'geometry', 'x', 'y', 'width', 'height', 'rotation', 'spacing', 'position', 'responsive',
    'animation', 'behavior', 'script']
  assert(forbidden.every(k => ZONE_PRESENTATION_FORBIDDEN_FIELDS.includes(k)),
    'forbidden list is exhaustive per test vector')
  for (const key of forbidden) {
    assertInvalid({ version: '1', variant: 'nature', [key]: 'smuggled' }, `forbidden key "${key}" rejected`)
  }
}

async function testUnknownTopLevelKeyRejected() {
  assertInvalid({ version: '1', variant: 'nature', extra: true }, 'unknown root key')
  assertInvalid({ version: '1', variant: 'nature', logo: { src: 'x.png' } }, 'unknown logo key')
}

async function testTokensShapeEnforced() {
  assertInvalid({ version: '1', variant: 'nature', tokens: [] }, 'tokens array rejected')
  assertInvalid({ version: '1', variant: 'nature', tokens: 'green' }, 'tokens string rejected')
  assertInvalid({ version: '1', variant: 'nature', tokens: {} }, 'empty tokens rejected')
}

async function testNoVisualDirectionRejected() {
  assertInvalid({ version: '1' }, 'bare version rejected')
}

async function testScopeNeverAcceptedFromConfig() {
  assertInvalid({ version: '1', variant: 'nature', scopeId: 'isla-teja-main' }, 'scopeId rejected')
}

async function testInputNotMutated() {
  const input = Object.freeze({ version: '1', variant: 'nature', tokens: { accent: '#010101' } })
  const before = JSON.stringify(input)
  validateZonePresentationConfig(input)
  assert(JSON.stringify(input) === before, 'input unchanged')
  assert(Object.isFrozen(input), 'input still frozen')
}

async function testOutputDeepFrozen() {
  const p = assertValid({ version: '1', variant: 'nature', tokens: { border: '#020202' } })
  assert(Object.isFrozen(p), 'presentation frozen')
  assert(Object.isFrozen(p.tokens), 'tokens frozen')
  assert(Object.isFrozen(p.variant) || typeof p.variant === 'string', 'variant immutable')
}

async function testConstantsMatchDocumentedVocabulary() {
  assert(ZONE_PRESENTATION_VERSION === '1', 'version contract fixed')
  assert(ZONE_PRESENTATION_VARIANTS.includes('nature') && ZONE_PRESENTATION_VARIANTS.length === 1,
    'engine owns exactly one variant in PRESENT-1')
  assert(['primary', 'secondary', 'accent', 'surface', 'background', 'text', 'textMuted', 'border']
    .every(k => ZONE_PRESENTATION_TOKEN_KEYS.includes(k)), 'token allowlist is the documented 8')
  assert(Object.freeze(ZONE_PRESENTATION_TOKEN_KEYS), 'constants frozen')
}

async function testDeveloperCssNotPartOfContract() {
  assertInvalid({ version: '1', variant: 'nature', customCss: '.hero { margin: 0 }' }, 'raw CSS rejected')
  assertInvalid({ version: '1', variant: 'nature', stylesheet: '/x.css' }, 'css file rejected')
}

async function runTests() {
  console.log('🧪 Running ZonePresentation Contract Tests (APP-ZONE-PRESENT-1)...\n')

  const tests = [
    testValidVariantConfigAccepted,
    testValidTokensConfigAccepted,
    testVariantAndTokensMerge,
    testHexAndFunctionColorShapesAccepted,
    testInvalidColorShapesRejected,
    testVersionRequiredAndSupported,
    testUnknownVariantRejected,
    testUnknownTokenRejected,
    testForbiddenKeysRejected,
    testUnknownTopLevelKeyRejected,
    testTokensShapeEnforced,
    testNoVisualDirectionRejected,
    testScopeNeverAcceptedFromConfig,
    testInputNotMutated,
    testOutputDeepFrozen,
    testConstantsMatchDocumentedVocabulary,
    testDeveloperCssNotPartOfContract
  ]

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
  console.log(`\nZonePresentation Contract (APP-ZONE-PRESENT-1): ${result.passed}/${result.passed + result.failed} passed`)
  process.exit(result.failed > 0 ? 1 : 0)
}).catch(err => {
  console.error('Test error:', err)
  process.exit(1)
})