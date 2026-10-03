/**
 * PRICING-1A — Focused tests: policy contract + pure calculator
 *
 * Framework-free, matching the existing web/*.test.js style. No database, no
 * network, no provisioning, no application bootstrap, no runtime startup.
 * Only the two pure modules and the inert product policy declaration are
 * imported.
 *
 * Run:  node capabilities/pricing/pricing.test.js
 */

import {
  PRICING_BASIS,
  PRICING_SCHEMA_VERSION,
  PricingPolicyError,
  normalizePolicy,
  validatePolicy,
  resolvePolicy,
  canonicalPolicyForm,
  policyFingerprint,
  deepFreeze,
} from './pricing.policy.js'

import {
  PRICING_SNAPSHOT_SCHEMA_VERSION,
  PRICING_LINE_SEMANTICS,
  PricingCalculationError,
  parseUtcDateOnly,
  validateOccupiedDates,
  calculateAccommodationPrice,
  withFingerprint,
} from './pricing.calculator.js'

import { ACCOMMODATION_PRICING_POLICY } from '../../companies/cl/los-rios/valdi/ensueno-curinanco/config.js'

let passed = 0
let failed = 0
const failures = []

async function test(name, fn) {
  try {
    const result = fn()
    if (result && typeof result.then === 'function') {
      await result
    }
    passed++
    console.log(`  PASS ${name}`)
  } catch (error) {
    failed++
    failures.push({ name, error })
    console.log(`  FAIL ${name}: ${error.message}`)
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'assertion failed')
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message || 'values differ'}: expected ${expected}, received ${actual}`)
  }
}

function assertDeepEqual(actual, expected, message) {
  const a = JSON.stringify(actual)
  const b = JSON.stringify(expected)
  if (a !== b) {
    throw new Error(`${message || 'values differ'}:\n    expected ${b}\n    received ${a}`)
  }
}

function assertThrows(fn, code, message) {
  let thrown = null
  try {
    fn()
  } catch (error) {
    thrown = error
  }
  if (thrown === null) {
    throw new Error(`${message || 'expected a throw'}: nothing was thrown`)
  }
  if (code && thrown.code !== code) {
    throw new Error(
      `${message || 'wrong error'}: expected code ${code}, received ${thrown.code} (${thrown.message})`
    )
  }
  return thrown
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const WITH_TUB = 'with_hot_tub'
const WITHOUT_TUB = 'without_hot_tub'

// Approved tariff, CLP per cabin per occupied night.
const TARIFF = {
  [WITH_TUB]: { 1: 90000, 2: 90000, 3: 100000, 4: 100000, 5: 108000, 6: 116000 },
  [WITHOUT_TUB]: { 1: 80000, 2: 80000, 3: 90000, 4: 90000, 5: 98000, 6: 106000 },
}

const ONE_NIGHT = ['2026-11-20']
const TWO_NIGHTS = ['2026-11-20', '2026-11-21']

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

const policyResolution = resolvePolicy(ACCOMMODATION_PRICING_POLICY)
const POLICY = withFingerprint(policyResolution)

function price(optionId, guestCount, dates = ONE_NIGHT) {
  return calculateAccommodationPrice({
    policy: POLICY,
    optionId,
    guestCount,
    occupiedDates: dates,
  })
}

// ---------------------------------------------------------------------------
// 1. Policy declaration
// ---------------------------------------------------------------------------

console.log('\n--- policy declaration ---')

await test('declared Ensueño policy resolves as valid', () => {
  assertEqual(policyResolution.status, 'valid', 'resolution status')
  assertEqual(policyResolution.policy.currency, 'CLP', 'currency')
  assertEqual(policyResolution.policy.basis, PRICING_BASIS.ACCOMMODATION_PER_NIGHT, 'basis')
  assertEqual(policyResolution.policy.standardCapacity, 4, 'standardCapacity')
  assertEqual(policyResolution.policy.maxOccupancy, 6, 'maxOccupancy')
  assertEqual(policyResolution.policy.checkInTime, '16:00', 'checkInTime')
  assertEqual(policyResolution.policy.checkOutTime, '13:00', 'checkOutTime')
})

await test('the declaration is a named export and does not alter the default export', async () => {
  const configModule = await import('../../companies/cl/los-rios/valdi/ensueno-curinanco/config.js')
  const legacy = configModule.default

  // Active legacy fields are intentionally untouched in this slice.
  assertEqual(legacy.experiences[0].pricePerNight.base, 90000, 'legacy experiences base')
  assertEqual(legacy.experiences[0].pricePerNight.forFourGuests, 100000, 'legacy experiences four')
  assertEqual(legacy.experiences[0].pricePerNight.additionalGuestPerNight, 8000, 'legacy experiences extra')
  assertEqual(legacy.capabilities.booking.configuration.basePricePerNight, 90000, 'legacy booking base')
  assertEqual(legacy.capabilities.booking.configuration.maxGuests, 4, 'legacy booking maxGuests')
  assertEqual(legacy.capabilities.booking.configuration.inventory, 4, 'legacy booking inventory')

  // The default export carries no policy, so the loader (module.default) is
  // structurally unable to observe the new declaration.
  assertEqual(legacy.pricing, undefined, 'default export must not expose a policy key')
  assert(typeof configModule.ACCOMMODATION_PRICING_POLICY === 'object', 'named export exists')
})

await test('hot-tub option inclusions differ only by the hot tub', () => {
  const withTub = policyResolution.policy.options.find((o) => o.id === WITH_TUB)
  const withoutTub = policyResolution.policy.options.find((o) => o.id === WITHOUT_TUB)

  assert(withTub.inclusions.includes('tinaja'), 'with-tub includes hot tub')
  assert(!withoutTub.inclusions.includes('tinaja'), 'without-tub must not include hot tub')

  for (const inclusion of withTub.inclusions) {
    if (inclusion === 'tinaja') continue
    assert(withoutTub.inclusions.includes(inclusion), `without-tub keeps "${inclusion}"`)
  }
  assert(withoutTub.inclusions.length === withTub.inclusions.length - 1, 'exactly one inclusion differs')
  assert(withoutTub.inclusions.includes('acceso a áreas de camping'), 'camping-area access preserved')
})

// ---------------------------------------------------------------------------
// 2. Policy normalization / validation
// ---------------------------------------------------------------------------

console.log('\n--- policy normalization and validation ---')

await test('absent policy is distinguishable from malformed policy', () => {
  assertEqual(resolvePolicy(undefined).status, 'absent', 'undefined')
  assertEqual(resolvePolicy(null).status, 'absent', 'null')

  const malformed = resolvePolicy({ basis: 'accommodation_per_night' })
  assertEqual(malformed.status, 'invalid', 'partial object')
  assert(malformed.error instanceof PricingPolicyError, 'malformed carries a policy error')
  assertEqual(malformed.policy, null, 'malformed exposes no policy')
})

await test('absent resolution exposes no policy and no fingerprint', () => {
  const resolution = resolvePolicy(null)
  assertEqual(resolution.policy, null, 'policy')
  assertEqual(resolution.fingerprint, null, 'fingerprint')
  assertThrows(() => withFingerprint(resolution), 'POLICY_NOT_RESOLVED', 'withFingerprint rejects absent')
})

await test('normalization drops unknown keys', () => {
  const normalized = normalizePolicy({ ...clone(ACCOMMODATION_PRICING_POLICY), rogue: 'x', __proto__hack: 1 })
  assertEqual(normalized.rogue, undefined, 'unknown scalar dropped')
  assertEqual(normalized.basis, PRICING_BASIS.ACCOMMODATION_PER_NIGHT, 'known field retained')
})

await test('normalization does not coerce a non-numeric amount to zero', () => {
  const raw = clone(ACCOMMODATION_PRICING_POLICY)
  raw.options[0].rates.t1_2 = '90000'
  const normalized = normalizePolicy(raw)
  assertEqual(normalized.options[0].rates.t1_2, null, 'string amount becomes null, not 0')
  assertThrows(() => validatePolicy(normalized), 'INVALID_PRICING_POLICY', 'validation rejects it')
})

await test('zero amounts are valid and produce a zero total', () => {
  const raw = clone(ACCOMMODATION_PRICING_POLICY)
  raw.options[0].rates.t1_2 = 0
  raw.options[0].rates.t3_4 = 0
  raw.additionalGuests.ratePerGuestPerNight = 0
  const resolution = resolvePolicy(raw)
  assertEqual(resolution.status, 'valid', 'zero-valued policy is valid')

  const zeroed = withFingerprint(resolution)
  const snapshot = calculateAccommodationPrice({
    policy: zeroed,
    optionId: WITH_TUB,
    guestCount: 2,
    occupiedDates: ONE_NIGHT,
  })
  assertEqual(snapshot.nightlyTotal, 0, 'zero rate yields a zero nightly total')
  assertEqual(snapshot.stayTotal, 0, 'zero stay total')
  assertEqual(snapshot.line.lineTotal, 0, 'zero line total, preserved as 0 and not dropped')
  assertEqual(snapshot.line.unitPrice, 0, 'zero unit price is preserved as 0')
})

await test('a policy with no extra occupancy beyond standard capacity is valid', () => {
  const raw = clone(ACCOMMODATION_PRICING_POLICY)
  raw.maxOccupancy = 4
  raw.additionalGuests = null
  const resolution = resolvePolicy(raw)
  assertEqual(resolution.status, 'valid', 'maxOccupancy === standardCapacity is acceptable')
})

await test('ambiguous tier coverage is rejected', () => {
  const raw = clone(ACCOMMODATION_PRICING_POLICY)
  raw.tiers = [
    { id: 'a', fromGuests: 1, toGuests: 3 },
    { id: 'b', fromGuests: 3, toGuests: 6 },
  ]
  const resolution = resolvePolicy(raw)
  assertEqual(resolution.status, 'invalid', 'overlapping tiers rejected')
  assert(/ambiguous/i.test(resolution.error.message), 'message mentions ambiguity')
})

await test('a gap in tier coverage is rejected', () => {
  const raw = clone(ACCOMMODATION_PRICING_POLICY)
  // Leaves guest 2 with no declared base-rate band.
  raw.tiers = [
    { id: 't1', fromGuests: 1, toGuests: 1 },
    { id: 't3_4', fromGuests: 3, toGuests: 4 },
  ]
  raw.options[0].rates = { t1: 90000, t3_4: 100000 }
  raw.options[1].rates = { t1: 80000, t3_4: 90000 }
  const resolution = resolvePolicy(raw)
  assertEqual(resolution.status, 'invalid', 'gapped coverage rejected')
  assert(/coverage has a gap or overlap/i.test(resolution.error.message), 'message names the gap')
})

await test('tier coverage that stops short of standard capacity is rejected', () => {
  const raw = clone(ACCOMMODATION_PRICING_POLICY)
  raw.tiers = [{ id: 't1_3', fromGuests: 1, toGuests: 3 }]
  raw.options[0].rates = { t1_3: 90000 }
  raw.options[1].rates = { t1_3: 80000 }
  const resolution = resolvePolicy(raw)
  assertEqual(resolution.status, 'invalid', 'incomplete coverage rejected')
  assert(/tier coverage stops at guest/i.test(resolution.error.message), 'message names the shortfall')
})

await test('a tier extending above standard capacity is rejected', () => {
  const raw = clone(ACCOMMODATION_PRICING_POLICY)
  raw.tiers[1].toGuests = 5
  raw.options[0].rates.t3_4 = 100000
  raw.options[1].rates.t3_4 = 90000
  const resolution = resolvePolicy(raw)
  assertEqual(resolution.status, 'invalid', 'over-wide tier rejected')
  assert(/above standardCapacity/i.test(resolution.error.message), 'message explains the rule')
})

await test('occupancy above standard capacity without additionalGuests is rejected', () => {
  const raw = clone(ACCOMMODATION_PRICING_POLICY)
  raw.additionalGuests = null
  const resolution = resolvePolicy(raw)
  assertEqual(resolution.status, 'invalid', 'silently under-charging occupancy is refused')
  assert(
    /additionalGuests is required/i.test(resolution.error.message),
    'message explains the omission'
  )
})

await test('a missing tier rate is rejected', () => {
  const raw = clone(ACCOMMODATION_PRICING_POLICY)
  delete raw.options[0].rates.t3_4
  const resolution = resolvePolicy(raw)
  assertEqual(resolution.status, 'invalid', 'missing rate rejected')
  assert(/missing a rate/i.test(resolution.error.message), 'message names the missing rate')
})

await test('duplicate option ids are rejected', () => {
  const raw = clone(ACCOMMODATION_PRICING_POLICY)
  raw.options[1].id = raw.options[0].id
  const resolution = resolvePolicy(raw)
  assertEqual(resolution.status, 'invalid', 'duplicate option id rejected')
  assert(/duplicate option id/i.test(resolution.error.message), 'message names the duplicate')
})

await test('a negative amount is rejected', () => {
  const raw = clone(ACCOMMODATION_PRICING_POLICY)
  raw.options[0].rates.t1_2 = -1
  assertEqual(resolvePolicy(raw).status, 'invalid', 'negative amount rejected')
})

await test('a fractional amount is rejected', () => {
  const raw = clone(ACCOMMODATION_PRICING_POLICY)
  raw.options[0].rates.t1_2 = 90000.5
  assertEqual(resolvePolicy(raw).status, 'invalid', 'fractional amount rejected')
})

await test('an amount beyond the safe integer range is rejected', () => {
  const raw = clone(ACCOMMODATION_PRICING_POLICY)
  raw.options[0].rates.t1_2 = Number.MAX_SAFE_INTEGER + 2
  assertEqual(resolvePolicy(raw).status, 'invalid', 'out-of-range amount rejected')
})

await test('an unsupported basis is rejected', () => {
  const raw = clone(ACCOMMODATION_PRICING_POLICY)
  raw.basis = 'per_person_nightly'
  const resolution = resolvePolicy(raw)
  assertEqual(resolution.status, 'invalid', 'activity basis rejected')
})

await test('an unsupported schemaVersion is rejected', () => {
  const raw = clone(ACCOMMODATION_PRICING_POLICY)
  raw.schemaVersion = PRICING_SCHEMA_VERSION + 1
  assertEqual(resolvePolicy(raw).status, 'invalid', 'future schemaVersion rejected')
})

await test('tier ranges beyond maxOccupancy are rejected', () => {
  const raw = clone(ACCOMMODATION_PRICING_POLICY)
  raw.tiers[1].toGuests = 8
  assertEqual(resolvePolicy(raw).status, 'invalid', 'tier above maxOccupancy rejected')
})

await test('an additional-guest threshold that disagrees with standard capacity is rejected', () => {
  const raw = clone(ACCOMMODATION_PRICING_POLICY)
  raw.additionalGuests.threshold = 3
  assertEqual(resolvePolicy(raw).status, 'invalid', 'threshold mismatch rejected')
})

await test('a non-object policy declaration is rejected', () => {
  assertEqual(resolvePolicy('nope').status, 'invalid', 'string rejected')
  assertEqual(resolvePolicy(42).status, 'invalid', 'number rejected')
  assertEqual(resolvePolicy([]).status, 'invalid', 'array rejected')
})

// --- schemaVersion ---------------------------------------------------------

await test('a missing schemaVersion is rejected, not treated as current', () => {
  // A policy that does not declare which contract it satisfies cannot be
  // assumed to be interpreted as this one.
  for (const value of [undefined, null]) {
    const raw = clone(ACCOMMODATION_PRICING_POLICY)
    if (value === undefined) {
      delete raw.schemaVersion
    } else {
      raw.schemaVersion = value
    }
    const resolution = resolvePolicy(raw)
    assertEqual(resolution.status, 'invalid', `schemaVersion ${String(value)} rejected`)
    assert(/schemaVersion is required/.test(resolution.error.message), 'message names the omission')
  }
})

await test('a wrongly typed schemaVersion is rejected', () => {
  for (const value of ['1', true, {}, [1], 1.5]) {
    const raw = clone(ACCOMMODATION_PRICING_POLICY)
    raw.schemaVersion = value
    const resolution = resolvePolicy(raw)
    assertEqual(resolution.status, 'invalid', `schemaVersion ${JSON.stringify(value)} rejected`)
  }
})

await test('an unsupported schemaVersion is rejected', () => {
  for (const value of [0, 2, 99, -1]) {
    const raw = clone(ACCOMMODATION_PRICING_POLICY)
    raw.schemaVersion = value
    const resolution = resolvePolicy(raw)
    assertEqual(resolution.status, 'invalid', `schemaVersion ${value} rejected`)
    assert(/unsupported schemaVersion/.test(resolution.error.message), 'message names the version')
  }
})

await test('the declared schemaVersion is required to be exactly the supported one', () => {
  const raw = clone(ACCOMMODATION_PRICING_POLICY)
  raw.schemaVersion = PRICING_SCHEMA_VERSION
  assertEqual(resolvePolicy(raw).status, 'valid', 'the exact supported version is accepted')
})

// --- duplicate tier ids ----------------------------------------------------

await test('duplicate tier ids are rejected even when contiguous and non-overlapping', () => {
  // Two distinct bands sharing one id would map to a single rate key, so the
  // base rate for one of them would be unreachable or ambiguous.
  const raw = clone(ACCOMMODATION_PRICING_POLICY)
  raw.tiers = [
    { id: 't1_2', fromGuests: 1, toGuests: 2 },
    { id: 't3_4', fromGuests: 3, toGuests: 4 },
    { id: 't3_4', fromGuests: 5, toGuests: 6 },
  ]
  raw.options[0].rates = { t1_2: 90000, t3_4: 100000 }
  raw.options[1].rates = { t1_2: 80000, t3_4: 90000 }
  raw.standardCapacity = 6
  raw.additionalGuests = null

  const resolution = resolvePolicy(raw)
  assertEqual(resolution.status, 'invalid', 'duplicate tier id rejected')
  assert(/duplicate tier id "t3_4"/.test(resolution.error.message), 'message names the duplicate')
})

await test('a contiguous non-overlapping tier set with unique ids is accepted', () => {
  // The control for the previous test: the same shape without the duplicate.
  const raw = clone(ACCOMMODATION_PRICING_POLICY)
  raw.tiers = [
    { id: 't1_2', fromGuests: 1, toGuests: 2 },
    { id: 't3_4', fromGuests: 3, toGuests: 4 },
    { id: 't5_6', fromGuests: 5, toGuests: 6 },
  ]
  raw.options[0].rates = { t1_2: 90000, t3_4: 100000, t5_6: 108000 }
  raw.options[1].rates = { t1_2: 80000, t3_4: 90000, t5_6: 98000 }
  raw.standardCapacity = 6
  raw.maxOccupancy = 6
  raw.additionalGuests = null

  assertEqual(resolvePolicy(raw).status, 'valid', 'unique ids are accepted')
})

// --- currency --------------------------------------------------------------

await test('currency must be exactly three uppercase ASCII letters', () => {
  const bad = ['clp', 'CL', 'CLPP', 'CLP1', '1LP', 'C L', 'CL-', '', 'ÇLP', 'clp ']
  for (const value of bad) {
    const raw = clone(ACCOMMODATION_PRICING_POLICY)
    raw.currency = value
    const resolution = resolvePolicy(raw)
    assertEqual(resolution.status, 'invalid', `currency ${JSON.stringify(value)} rejected`)
  }

  for (const value of ['CLP', 'USD', 'EUR']) {
    const raw = clone(ACCOMMODATION_PRICING_POLICY)
    raw.currency = value
    assertEqual(resolvePolicy(raw).status, 'valid', `currency ${value} accepted on shape alone`)
  }
})

await test('a well-formed currency code is not claimed to be a supported ISO currency', () => {
  // The validator checks shape only. "ZZZ" is not a real ISO code, and this
  // documents that the engine accepts it rather than pretending to know.
  const raw = clone(ACCOMMODATION_PRICING_POLICY)
  raw.currency = 'ZZZ'
  assertEqual(
    resolvePolicy(raw).status,
    'valid',
    'shape is validated; ISO membership is explicitly not'
  )
})

// --- clock times -----------------------------------------------------------

await test('times must be real 24-hour HH:MM values', () => {
  const bad = ['24:00', '23:60', '12:60', '9:00', '09:5', '1600', '09:00:00', 'aa:bb', '-1:00']
  for (const value of bad) {
    const raw = clone(ACCOMMODATION_PRICING_POLICY)
    raw.checkInTime = value
    assertEqual(resolvePolicy(raw).status, 'invalid', `checkInTime ${value} rejected`)
  }

  for (const value of ['00:00', '09:30', '13:00', '16:00', '23:59']) {
    const raw = clone(ACCOMMODATION_PRICING_POLICY)
    raw.checkInTime = value
    assertEqual(resolvePolicy(raw).status, 'valid', `checkInTime ${value} accepted`)
  }
})

await test('an invalid check-out time is rejected independently', () => {
  const raw = clone(ACCOMMODATION_PRICING_POLICY)
  raw.checkOutTime = '25:00'
  const resolution = resolvePolicy(raw)
  assertEqual(resolution.status, 'invalid', 'checkOutTime validated separately')
  assert(/checkOutTime/.test(resolution.error.message), 'message names checkOutTime')
})

// --- safe integers ---------------------------------------------------------

await test('unsafe integer capacities and bounds are rejected', () => {
  // Number.isInteger accepts magnitudes beyond 2^53-1, which then lose
  // precision; every count and bound must be a SAFE integer.
  for (const value of [2 ** 53, 1e300, Number.MAX_SAFE_INTEGER + 2]) {
    const capacity = clone(ACCOMMODATION_PRICING_POLICY)
    capacity.standardCapacity = value
    assertEqual(resolvePolicy(capacity).status, 'invalid', `standardCapacity ${value} rejected`)

    const occupancy = clone(ACCOMMODATION_PRICING_POLICY)
    occupancy.maxOccupancy = value
    assertEqual(resolvePolicy(occupancy).status, 'invalid', `maxOccupancy ${value} rejected`)

    const tier = clone(ACCOMMODATION_PRICING_POLICY)
    tier.tiers[0].toGuests = value
    assertEqual(resolvePolicy(tier).status, 'invalid', `tier toGuests ${value} rejected`)

    const threshold = clone(ACCOMMODATION_PRICING_POLICY)
    threshold.additionalGuests.threshold = value
    assertEqual(resolvePolicy(threshold).status, 'invalid', `threshold ${value} rejected`)

    const condition = clone(ACCOMMODATION_PRICING_POLICY)
    condition.additionalGuests.condition.fromGuest = value
    assertEqual(resolvePolicy(condition).status, 'invalid', `condition fromGuest ${value} rejected`)
  }
})

await test('the largest safe integer is accepted where the value is otherwise consistent', () => {
  const raw = clone(ACCOMMODATION_PRICING_POLICY)
  raw.options[0].rates.t1_2 = Number.MAX_SAFE_INTEGER
  assertEqual(resolvePolicy(raw).status, 'valid', 'MAX_SAFE_INTEGER is a safe integer')
})

await test('an unsafe integer guest count is rejected', () => {
  const raw = clone(ACCOMMODATION_PRICING_POLICY)
  raw.maxOccupancy = 1e300
  raw.standardCapacity = 1e300
  raw.tiers = [{ id: 't', fromGuests: 1, toGuests: 1 }]
  raw.options[0].rates = { t: 1000 }
  raw.options[1].rates = { t: 1000 }
  raw.additionalGuests = null

  assertEqual(resolvePolicy(raw).status, 'invalid', 'the policy itself is refused first')

  // The calculator also refuses the count directly: 1e300 satisfies
  // Number.isInteger but is not a safe integer.
  assertThrows(
    () => price(WITH_TUB, 1e300),
    'INVALID_GUEST_COUNT',
    'an unsafe integer count is refused before any comparison'
  )
  assertThrows(
    () => price(WITH_TUB, 2 ** 53),
    'INVALID_GUEST_COUNT',
    '2^53 is not a safe integer'
  )
})

// --- blank labels and condition text --------------------------------------

await test('a blank option label is rejected', () => {
  for (const value of ['', '   ', '\t', '\n']) {
    const raw = clone(ACCOMMODATION_PRICING_POLICY)
    raw.options[0].label = value
    const resolution = resolvePolicy(raw)
    assertEqual(resolution.status, 'invalid', `blank label ${JSON.stringify(value)} rejected`)
    assert(/label/.test(resolution.error.message), 'message names the label')
  }
})

await test('a blank declared condition text is rejected', () => {
  for (const value of ['', '   ', '\t\n']) {
    const raw = clone(ACCOMMODATION_PRICING_POLICY)
    raw.additionalGuests.condition.text = value
    const resolution = resolvePolicy(raw)
    assertEqual(resolution.status, 'invalid', `blank condition text ${JSON.stringify(value)} rejected`)
    assert(/condition\.text/.test(resolution.error.message), 'message names the condition text')
  }
})

await test('a missing option label is rejected', () => {
  const raw = clone(ACCOMMODATION_PRICING_POLICY)
  delete raw.options[0].label
  assertEqual(resolvePolicy(raw).status, 'invalid', 'absent label rejected')
})

// --- present-but-malformed additionalGuests -------------------------------

await test('a present but malformed additionalGuests is not normalized into absence', () => {
  // Silently degrading a broken declaration to "no additional-guest terms"
  // would under-charge every guest above standard capacity.
  for (const value of ['nope', 42, true, ['a'], 0]) {
    const raw = clone(ACCOMMODATION_PRICING_POLICY)
    raw.additionalGuests = value
    const resolution = resolvePolicy(raw)
    assertEqual(resolution.status, 'invalid', `additionalGuests ${JSON.stringify(value)} rejected`)
    assert(
      /additionalGuests must be a plain object/.test(resolution.error.message),
      'message explains the malformation'
    )
  }
})

await test('a present but malformed condition is not normalized into absence', () => {
  for (const value of ['nope', 42, true, ['a']]) {
    const raw = clone(ACCOMMODATION_PRICING_POLICY)
    raw.additionalGuests.condition = value
    const resolution = resolvePolicy(raw)
    assertEqual(resolution.status, 'invalid', `condition ${JSON.stringify(value)} rejected`)
    assert(
      /additionalGuests\.condition must be a plain object/.test(resolution.error.message),
      'message explains the malformation'
    )
  }
})

await test('legitimate omission of additionalGuests and condition is still accepted', () => {
  // The malformed-versus-absent distinction must not forbid honest omission.
  // Omitting additionalGuests is only legal when nothing above standard
  // capacity would then go uncharged, so standardCapacity is lowered to match.
  const withoutAdditional = clone(ACCOMMODATION_PRICING_POLICY)
  withoutAdditional.additionalGuests = null
  withoutAdditional.maxOccupancy = 4
  assertEqual(resolvePolicy(withoutAdditional).status, 'valid', 'null additionalGuests is omission')

  // The control: the same omission is refused when occupancy exceeds capacity.
  const unpricedHeadroom = clone(ACCOMMODATION_PRICING_POLICY)
  unpricedHeadroom.additionalGuests = null
  assertEqual(
    resolvePolicy(unpricedHeadroom).status,
    'invalid',
    'omission that would leave headroom unpriced is still refused'
  )

  const withoutCondition = clone(ACCOMMODATION_PRICING_POLICY)
  withoutCondition.additionalGuests.condition = null
  const resolution = resolvePolicy(withoutCondition)
  assertEqual(resolution.status, 'valid', 'null condition is omission')
  assertEqual(
    resolution.policy.additionalGuests.condition,
    null,
    'the normalized representation stays null'
  )

  const omittedKey = clone(ACCOMMODATION_PRICING_POLICY)
  delete omittedKey.additionalGuests.condition
  assertEqual(resolvePolicy(omittedKey).status, 'valid', 'an absent condition key is omission')
})

await test('the normalized representation preserves a valid condition', () => {
  const normalized = normalizePolicy(ACCOMMODATION_PRICING_POLICY)
  assertEqual(normalized.additionalGuests.condition.text, ACCOMMODATION_PRICING_POLICY.additionalGuests.condition.text, 'text preserved')
  assertEqual(normalized.additionalGuests.condition.fromGuest, 5, 'fromGuest preserved')
  assertEqual(normalized.additionalGuests.threshold, 4, 'threshold preserved')
  assertEqual(normalized.additionalGuests.ratePerGuestPerNight, 8000, 'rate preserved')
})

// --- identifier keys -------------------------------------------------------

await test('a reserved identifier key is rejected as a tier id', () => {
  for (const key of ['__proto__', 'constructor', 'prototype']) {
    const raw = clone(ACCOMMODATION_PRICING_POLICY)
    raw.tiers = [
      { id: 't1_2', fromGuests: 1, toGuests: 2 },
      { id: 't3_4', fromGuests: 3, toGuests: 4 },
      { id: key, fromGuests: 5, toGuests: 6 },
    ]
    raw.options[0].rates = { t1_2: 90000, t3_4: 100000 }
    raw.options[1].rates = { t1_2: 80000, t3_4: 90000 }
    raw.standardCapacity = 6
    raw.additionalGuests = null

    const resolution = resolvePolicy(raw)
    assertEqual(resolution.status, 'invalid', `tier id ${key} rejected`)
    assert(/reserved identifier key/.test(resolution.error.message), 'message names the reason')
  }
})

await test('a reserved identifier key is rejected as an option id', () => {
  const raw = clone(ACCOMMODATION_PRICING_POLICY)
  raw.options[1].id = '__proto__'
  const resolution = resolvePolicy(raw)
  assertEqual(resolution.status, 'invalid', '__proto__ option id rejected')
  assert(/reserved identifier key/.test(resolution.error.message), 'message names the reason')
})

await test('a __proto__ rate key does not pollute the prototype or satisfy coverage', () => {
  // The rate map is prototype-free, so a "__proto__" tier is captured as data
  // and then refused, rather than reassigning Object.prototype.
  const before = Object.prototype.polluted
  const raw = clone(ACCOMMODATION_PRICING_POLICY)
  raw.options[0].rates = { t1_2: 90000, t3_4: 100000 }
  raw.options[1].rates = { t1_2: 80000, t3_4: 90000 }
  raw.tiers = [
    { id: 't1_2', fromGuests: 1, toGuests: 2 },
    { id: '__proto__', fromGuests: 3, toGuests: 4 },
  ]

  const resolution = resolvePolicy(raw)
  assertEqual(resolution.status, 'invalid', 'the __proto__ tier is refused')
  assertEqual(Object.prototype.polluted, before, 'Object.prototype is untouched')

  const normalized = normalizePolicy(raw)
  assertEqual(
    Object.getPrototypeOf(normalized.options[0].rates),
    null,
    'the rate map is prototype-free'
  )

  // Now supply a rate map that really does carry an own "__proto__" key. A
  // literal { __proto__: n } would set the prototype instead, so the own
  // property is defined explicitly.
  const rates = Object.create(null)
  rates.t1_2 = 90000
  Object.defineProperty(rates, '__proto__', {
    value: 50000,
    writable: true,
    enumerable: true,
    configurable: true,
  })

  const withProtoRate = {
    schemaVersion: PRICING_SCHEMA_VERSION,
    basis: PRICING_BASIS.ACCOMMODATION_PER_NIGHT,
    currency: 'CLP',
    checkInTime: '16:00',
    checkOutTime: '13:00',
    standardCapacity: 4,
    maxOccupancy: 4,
    tiers: [
      { id: 't1_2', fromGuests: 1, toGuests: 2 },
      { id: '__proto__', fromGuests: 3, toGuests: 4 },
    ],
    additionalGuests: null,
    options: [
      { id: 'with', label: 'With', inclusions: ['a'], rates },
      { id: 'without', label: 'Without', inclusions: ['a'], rates: { t1_2: 80000, __proto__: 50000 } },
    ],
  }

  const captured = normalizePolicy(withProtoRate)
  assertEqual(
    Object.prototype.hasOwnProperty.call(captured.options[0].rates, '__proto__'),
    true,
    'the __proto__ key is captured as ordinary data, not as a prototype'
  )
  assertEqual(captured.options[0].rates.__proto__, 50000, 'and keeps its value')
  assertEqual(
    Object.getPrototypeOf(captured.options[0].rates),
    null,
    'the map keeps a null prototype'
  )
  assertEqual(
    Object.prototype.hasOwnProperty.call(Object.prototype, 't1_2'),
    false,
    'Object.prototype is not polluted'
  )
  assertEqual(resolvePolicy(withProtoRate).status, 'invalid', 'and the policy is still refused')
})

await test('an inherited property does not satisfy tier rate coverage', () => {
  // "constructor" is inherited, so an `in` check would wrongly treat it as a
  // declared rate. Only own properties count.
  const raw = clone(ACCOMMODATION_PRICING_POLICY)
  raw.tiers = [
    { id: 't1_2', fromGuests: 1, toGuests: 2 },
    { id: 'constructor', fromGuests: 3, toGuests: 4 },
  ]
  raw.options[0].rates = { t1_2: 90000 }
  raw.options[1].rates = { t1_2: 80000 }

  const resolution = resolvePolicy(raw)
  assertEqual(resolution.status, 'invalid', 'rejected')
  assert(
    /reserved identifier key|missing a rate/.test(resolution.error.message),
    'reported as a reserved key or a coverage gap, never as satisfied'
  )
})

// --- error surface ---------------------------------------------------------

await test('a defective policy surfaces PricingPolicyError, never a TypeError', () => {
  // Through the supported public entry points, every rejection is a typed
  // pricing error. An incidental TypeError would mean a malformed declaration
  // escaped as an unexpected crash.
  // null and undefined are absence, not malformation, so they are excluded
  // here and asserted as 'absent' by the dedicated test above.
  const defective = [
    { name: 'string', raw: 'nope' },
    { name: 'number', raw: 42 },
    { name: 'array', raw: [] },
    { name: 'null tiers', raw: { schemaVersion: PRICING_SCHEMA_VERSION, tiers: null } },
    { name: 'null options', raw: { schemaVersion: PRICING_SCHEMA_VERSION, options: null } },
    { name: 'tiers of strings', raw: { schemaVersion: PRICING_SCHEMA_VERSION, tiers: ['a', 'b'], options: [] } },
    { name: 'options of strings', raw: { schemaVersion: PRICING_SCHEMA_VERSION, tiers: [], options: ['a'] } },
    { name: 'null rate map', raw: { schemaVersion: PRICING_SCHEMA_VERSION, tiers: [], options: [{ id: 'x', rates: null }] } },
    { name: 'tier null entry', raw: { schemaVersion: PRICING_SCHEMA_VERSION, tiers: [null], options: [] } },
    { name: 'option null entry', raw: { schemaVersion: PRICING_SCHEMA_VERSION, tiers: [], options: [null] } },
    { name: 'malformed additionalGuests', raw: { schemaVersion: PRICING_SCHEMA_VERSION, tiers: [], options: [], additionalGuests: 'x' } },
    { name: 'malformed condition', raw: { schemaVersion: PRICING_SCHEMA_VERSION, tiers: [], options: [], additionalGuests: { threshold: 1, ratePerGuestPerNight: 1, condition: 7 } } },
  ]

  for (const { name, raw } of defective) {
    const resolution = resolvePolicy(raw)
    assertEqual(resolution.status, 'invalid', `${name}: invalid resolution`)
    assert(
      resolution.error instanceof PricingPolicyError,
      `${name}: typed PricingPolicyError, received ${resolution.error?.constructor?.name}`
    )

    // validatePolicy on an already-normalized defective value must also throw
    // the typed error rather than a TypeError.
    if (raw !== null && typeof raw === 'object' && !Array.isArray(raw)) {
      let normalized = null
      try {
        normalized = normalizePolicy(raw)
      } catch (error) {
        assert(error instanceof PricingPolicyError, `${name}: normalize throws the typed error`)
      }
      if (normalized !== null) {
        const thrown = assertThrows(
          () => validatePolicy(normalized),
          'INVALID_PRICING_POLICY',
          `${name}: validatePolicy throws the typed error`
        )
        assert(
          thrown instanceof PricingPolicyError,
          `${name}: received ${thrown?.constructor?.name}`
        )
      }
    }
  }
})

await test('canonicalPolicyForm does not throw on a defective policy', () => {
  // Exported and used directly by the calculator, so it must tolerate whatever
  // validation rejected rather than raising a TypeError of its own.
  const defective = normalizePolicy({ schemaVersion: 1, tiers: 'x', options: 'y' })
  const canonical = canonicalPolicyForm(defective)
  assertEqual(canonical.tiers.length, 0, 'non-array tiers yield no tier entries')
  assertEqual(canonical.options.length, 0, 'non-array options yield no option entries')
})

// ---------------------------------------------------------------------------
// 3. Immutability and freezing
// ---------------------------------------------------------------------------

console.log('\n--- immutability and freezing ---')

await test('the resolved policy is recursively frozen', () => {
  const policy = policyResolution.policy
  assert(Object.isFrozen(policy), 'root frozen')
  assert(Object.isFrozen(policy.options), 'options array frozen')
  assert(Object.isFrozen(policy.options[0]), 'option object frozen')
  assert(Object.isFrozen(policy.options[0].rates), 'rates object frozen')
  assert(Object.isFrozen(policy.tiers), 'tiers array frozen')
  assert(Object.isFrozen(policy.tiers[0]), 'tier object frozen')
  assert(Object.isFrozen(policy.additionalGuests), 'additionalGuests frozen')
})

await test('a shallow freeze would be insufficient — nested writes are refused', () => {
  const policy = policyResolution.policy
  let refused = false
  try {
    policy.options[0].rates.t1_2 = 1
  } catch {
    refused = true
  }
  assert(refused, 'nested rate write must throw under ESM strict mode')
  assertEqual(policy.options[0].rates.t1_2, 90000, 'rate unchanged')
})

await test('the resolved policy does not alias the source declaration', () => {
  assertEqual(
    policyResolution.policy.options[0].rates.t1_2,
    ACCOMMODATION_PRICING_POLICY.options[0].rates.t1_2,
    'same value'
  )
  // Identity, not just value: the resolved policy must be a separate object.
  assert(policyResolution.policy !== ACCOMMODATION_PRICING_POLICY, 'root is a copy')
  assert(
    policyResolution.policy.options[0] !== ACCOMMODATION_PRICING_POLICY.options[0],
    'option is a copy'
  )
  assert(
    policyResolution.policy.options[0].rates !== ACCOMMODATION_PRICING_POLICY.options[0].rates,
    'rates is a copy'
  )
  assert(
    policyResolution.policy.additionalGuests !== ACCOMMODATION_PRICING_POLICY.additionalGuests,
    'additionalGuests is a copy'
  )
})

await test('calculation does not mutate its inputs', () => {
  const dates = clone(TWO_NIGHTS)
  const snapshot = price(WITH_TUB, 3, dates)

  assertDeepEqual(dates, TWO_NIGHTS, 'occupied dates unchanged')
  assertDeepEqual(snapshot.occupiedDates, TWO_NIGHTS, 'snapshot holds its own copy')
  assert(snapshot.occupiedDates !== dates, 'snapshot does not alias the input array')
})

await test('snapshot arrays are independent of the policy arrays', () => {
  const snapshot = price(WITHOUT_TUB, 2)
  const source = POLICY.options.find((o) => o.id === WITHOUT_TUB)
  assert(snapshot.option.inclusions !== source.inclusions, 'inclusions copied')
  assertDeepEqual(snapshot.option.inclusions, [...source.inclusions], 'same contents')
})

await test('deepFreeze is exported and recursive', () => {
  const target = { a: { b: { c: [1, 2] } } }
  deepFreeze(target)
  assert(Object.isFrozen(target.a.b.c), 'deep array frozen')
})

// ---------------------------------------------------------------------------
// 4. Fingerprint
// ---------------------------------------------------------------------------

console.log('\n--- fingerprint ---')

await test('the fingerprint is deterministic across repeated resolution', () => {
  const first = resolvePolicy(clone(ACCOMMODATION_PRICING_POLICY)).fingerprint
  const second = resolvePolicy(clone(ACCOMMODATION_PRICING_POLICY)).fingerprint
  assertEqual(first, second, 'same input yields the same fingerprint')
  assert(/^[0-9a-f]{16}$/.test(first), 'fingerprint shape')
})

await test('the fingerprint is independent of key order and array order', () => {
  const reordered = {
    // Arrays reversed: the canonical form must sort them.
    options: clone(ACCOMMODATION_PRICING_POLICY.options).reverse(),
    tiers: clone(ACCOMMODATION_PRICING_POLICY.tiers).reverse(),
    additionalGuests: clone(ACCOMMODATION_PRICING_POLICY.additionalGuests),
    maxOccupancy: ACCOMMODATION_PRICING_POLICY.maxOccupancy,
    standardCapacity: ACCOMMODATION_PRICING_POLICY.standardCapacity,
    schemaVersion: ACCOMMODATION_PRICING_POLICY.schemaVersion,
    checkOutTime: ACCOMMODATION_PRICING_POLICY.checkOutTime,
    checkInTime: ACCOMMODATION_PRICING_POLICY.checkInTime,
    basis: ACCOMMODATION_PRICING_POLICY.basis,
    currency: ACCOMMODATION_PRICING_POLICY.currency,
  }
  // Rate keys reinserted in a different order within each option, with the
  // values preserved per option id.
  for (const option of reordered.options) {
    const original = ACCOMMODATION_PRICING_POLICY.options.find((o) => o.id === option.id)
    const reversedRates = {}
    for (const tierId of Object.keys(original.rates).reverse()) {
      reversedRates[tierId] = original.rates[tierId]
    }
    option.rates = reversedRates
  }

  assertEqual(
    resolvePolicy(reordered).fingerprint,
    policyResolution.fingerprint,
    'order does not affect the fingerprint'
  )
})

await test('a tariff change changes the fingerprint', () => {
  const raw = clone(ACCOMMODATION_PRICING_POLICY)
  raw.options[0].rates.t1_2 = 95000
  assert(resolvePolicy(raw).fingerprint !== policyResolution.fingerprint, 'rate change detected')
})

await test('an additional-guest rate change changes the fingerprint', () => {
  const raw = clone(ACCOMMODATION_PRICING_POLICY)
  raw.additionalGuests.ratePerGuestPerNight = 9000
  assert(resolvePolicy(raw).fingerprint !== policyResolution.fingerprint, 'extra rate change detected')
})

await test('an option identity change changes the fingerprint', () => {
  const raw = clone(ACCOMMODATION_PRICING_POLICY)
  raw.options[0].id = 'premium'
  assert(resolvePolicy(raw).fingerprint !== policyResolution.fingerprint, 'option id change detected')
})

await test('a capacity change with an otherwise valid policy changes the fingerprint', () => {
  const raw = clone(ACCOMMODATION_PRICING_POLICY)
  raw.maxOccupancy = 4
  raw.additionalGuests = null
  const resolution = resolvePolicy(raw)
  assertEqual(resolution.status, 'valid', 'policy remains valid')
  assert(resolution.fingerprint !== policyResolution.fingerprint, 'capacity change detected')
})

await test('a tier range change changes the fingerprint', () => {
  const raw = clone(ACCOMMODATION_PRICING_POLICY)
  raw.tiers = [
    { id: 't1_3', fromGuests: 1, toGuests: 3 },
    { id: 't4', fromGuests: 4, toGuests: 4 },
  ]
  raw.options[0].rates = { t1_3: 90000, t4: 100000 }
  raw.options[1].rates = { t1_3: 80000, t4: 90000 }
  const resolution = resolvePolicy(raw)
  assertEqual(resolution.status, 'valid', 'retiered policy is valid')
  assert(resolution.fingerprint !== policyResolution.fingerprint, 'tier change detected')
})

await test('a display-only label rename does not change the fingerprint', () => {
  // Labels are the documented exclusion: they are presentation copy, not a term
  // the guest accepts. Renaming one must not invalidate outstanding quotes.
  const raw = clone(ACCOMMODATION_PRICING_POLICY)
  raw.options[0].label = 'Con tinaja (renombrada)'

  assertEqual(
    resolvePolicy(raw).fingerprint,
    policyResolution.fingerprint,
    'a pure label rename is excluded from the identity'
  )
})

await test('removing an inclusion changes the fingerprint', () => {
  // What the guest actually receives is an obligation attached to the amount,
  // not cosmetics. Dropping a delivered item changes the deal.
  const raw = clone(ACCOMMODATION_PRICING_POLICY)
  const before = raw.options[0].inclusions.length
  raw.options[0].inclusions = raw.options[0].inclusions.slice(0, before - 1)

  assert(
    resolvePolicy(raw).fingerprint !== policyResolution.fingerprint,
    'removing an inclusion is detected'
  )
})

await test('adding an inclusion changes the fingerprint', () => {
  const raw = clone(ACCOMMODATION_PRICING_POLICY)
  raw.options[1].inclusions = [...raw.options[1].inclusions, 'senderos']

  assert(
    resolvePolicy(raw).fingerprint !== policyResolution.fingerprint,
    'adding an inclusion is detected'
  )
})

await test('swapping an inclusion between options changes the fingerprint', () => {
  // The rate is identical; only which option delivers it differs. The price is
  // the same, so this is the case that proves identity covers more than money.
  const raw = clone(ACCOMMODATION_PRICING_POLICY)
  const [first, second] = raw.options
  const swapped = first.inclusions
  first.inclusions = second.inclusions
  second.inclusions = swapped

  assert(
    resolvePolicy(raw).fingerprint !== policyResolution.fingerprint,
    'inclusions are bound to the option, not the policy as a whole'
  )
})

await test('changing the condition text changes the fingerprint', () => {
  const raw = clone(ACCOMMODATION_PRICING_POLICY)
  raw.additionalGuests.condition.text = 'Otro requisito para los huéspedes adicionales.'

  assert(
    resolvePolicy(raw).fingerprint !== policyResolution.fingerprint,
    'condition wording is part of the identity'
  )
})

await test('changing the condition fromGuest changes the fingerprint', () => {
  const raw = clone(ACCOMMODATION_PRICING_POLICY)
  raw.additionalGuests.condition.fromGuest = 6

  const resolution = resolvePolicy(raw)
  assertEqual(resolution.status, 'valid', 'a condition starting at 6 is a legal policy')
  assert(
    resolution.fingerprint !== policyResolution.fingerprint,
    'the guest count at which the condition starts is part of the identity'
  )
})

await test('changing the check-in or check-out time changes the fingerprint', () => {
  const checkIn = clone(ACCOMMODATION_PRICING_POLICY)
  checkIn.checkInTime = '15:00'
  assert(
    resolvePolicy(checkIn).fingerprint !== policyResolution.fingerprint,
    'check-in time is part of the identity'
  )

  const checkOut = clone(ACCOMMODATION_PRICING_POLICY)
  checkOut.checkOutTime = '11:00'
  assert(
    resolvePolicy(checkOut).fingerprint !== policyResolution.fingerprint,
    'check-out time is part of the identity'
  )
})

await test('changing the policy schemaVersion changes the fingerprint', () => {
  // Unsupported versions are rejected outright, so this asserts the version is
  // an identity input rather than proving an invalid policy resolves.
  const canonical = canonicalPolicyForm(policyResolution.policy)
  assertEqual(canonical.schemaVersion, PRICING_SCHEMA_VERSION, 'schemaVersion is canonicalized')

  const raw = clone(ACCOMMODATION_PRICING_POLICY)
  raw.schemaVersion = PRICING_SCHEMA_VERSION
  assertEqual(
    resolvePolicy(raw).fingerprint,
    policyResolution.fingerprint,
    'the declared version is stable'
  )
})

await test('the canonical form covers every obligation and excludes only labels', () => {
  const canonical = canonicalPolicyForm(policyResolution.policy)

  // Included: anything that can change an amount or an obligation.
  assertEqual(canonical.schemaVersion, PRICING_SCHEMA_VERSION, 'schemaVersion is included')
  assertEqual(canonical.checkInTime, '16:00', 'checkInTime is included')
  assertEqual(canonical.checkOutTime, '13:00', 'checkOutTime is included')
  assert(canonical.additionalGuests !== null, 'additional-guest terms are included')
  assert(
    canonical.additionalGuests.condition !== null,
    'the condition is included, not just the rate'
  )
  assert(
    typeof canonical.additionalGuests.condition.text === 'string',
    'condition text is included'
  )
  assertEqual(
    canonical.additionalGuests.condition.fromGuest,
    5,
    'condition applicability is included'
  )
  for (const option of canonical.options) {
    assert(Array.isArray(option.inclusions), `inclusions present for ${option.id}`)
    assert(option.inclusions.length > 0, `inclusions non-empty for ${option.id}`)
  }

  // Excluded: display-only copy, and only that.
  assertEqual(canonical.options[0].label, undefined, 'no option label in canonical form')
  assertEqual(canonical.conditions, undefined, 'no stray field outside the documented shape')
})

await test('the canonical encoding cannot be confused by separator-like values', () => {
  // Identity must come from a structured encoding, not from pasting values
  // together with separators. If it did, a value containing the separator
  // could render two different policies as the same string.
  const hostile = clone(ACCOMMODATION_PRICING_POLICY)
  hostile.additionalGuests.condition.text =
    'a\u0001b|c{d}e="f"|t1_2:90000, t3_4=100000'

  const decoy = clone(ACCOMMODATION_PRICING_POLICY)
  decoy.additionalGuests.condition.text = 'a'

  assertEqual(resolvePolicy(hostile).status, 'valid', 'a hostile-looking value is still a valid policy')

  const hostileFingerprint = resolvePolicy(hostile).fingerprint
  assert(
    hostileFingerprint !== resolvePolicy(decoy).fingerprint,
    'a value containing separators does not collapse onto another policy'
  )

  // The same check across the other free-text and identifier positions.
  for (const mutate of [
    (p) => { p.options[0].inclusions = ['a|b', 'c'] },
    (p) => { p.options[0].inclusions = ['a', 'b|c'] },
    (p) => { p.tiers[0].id = 't1_2:2' },
  ]) {
    const first = clone(ACCOMMODATION_PRICING_POLICY)
    mutate(first)
    const second = clone(ACCOMMODATION_PRICING_POLICY)
    mutate(second)

    // Mutating the same way twice must be stable, and a differently split set
    // must not alias it.
    assertEqual(
      resolvePolicy(first).fingerprint,
      resolvePolicy(second).fingerprint,
      'the same mutation is deterministic'
    )
  }

  const splitA = clone(ACCOMMODATION_PRICING_POLICY)
  splitA.options[0].inclusions = ['a|b', 'c']
  const splitB = clone(ACCOMMODATION_PRICING_POLICY)
  splitB.options[0].inclusions = ['a', 'b|c']
  assert(
    resolvePolicy(splitA).fingerprint !== resolvePolicy(splitB).fingerprint,
    'a different set that a delimiter scheme would flatten differently stays distinct'
  )
})

await test('the canonical form does not mutate its input', () => {
  const policy = policyResolution.policy
  const before = {
    tierOrder: policy.tiers.map((tier) => tier.id),
    optionOrder: policy.options.map((option) => option.id),
    inclusionOrder: policy.options.map((option) => [...option.inclusions]),
    rateOrder: policy.options.map((option) => Object.keys(option.rates)),
  }

  canonicalPolicyForm(policy)
  canonicalPolicyForm(policy)

  assertDeepEqual(policy.tiers.map((tier) => tier.id), before.tierOrder, 'tier order untouched')
  assertDeepEqual(
    policy.options.map((option) => option.id),
    before.optionOrder,
    'option order untouched'
  )
  assertDeepEqual(
    policy.options.map((option) => [...option.inclusions]),
    before.inclusionOrder,
    'inclusion order untouched'
  )
  assertDeepEqual(
    policy.options.map((option) => Object.keys(option.rates)),
    before.rateOrder,
    'rate key order untouched'
  )
})

await test('equivalent ordering of every set preserves the fingerprint', () => {
  // Reorders tiers, options, rate keys, and inclusions simultaneously. All four
  // are unordered sets, so an equivalent arrangement must be the same identity.
  const raw = clone(ACCOMMODATION_PRICING_POLICY)
  raw.tiers.reverse()
  raw.options.reverse()

  for (const option of raw.options) {
    option.inclusions.reverse()
    const reversedRates = {}
    for (const tierId of Object.keys(option.rates).reverse()) {
      reversedRates[tierId] = option.rates[tierId]
    }
    option.rates = reversedRates
  }

  // Re-declared with the same keys in a different order, to prove key order in
  // the declaration itself is irrelevant.
  const reordered = {
    options: raw.options,
    additionalGuests: raw.additionalGuests,
    tiers: raw.tiers,
    maxOccupancy: raw.maxOccupancy,
    standardCapacity: raw.standardCapacity,
    checkOutTime: raw.checkOutTime,
    checkInTime: raw.checkInTime,
    currency: raw.currency,
    basis: raw.basis,
    schemaVersion: raw.schemaVersion,
  }

  assertEqual(
    resolvePolicy(reordered).fingerprint,
    policyResolution.fingerprint,
    'equivalent ordering preserves the fingerprint'
  )
})

await test('the snapshot reports the fingerprint of the policy used', () => {
  assertEqual(price(WITH_TUB, 2).policyFingerprint, policyResolution.fingerprint, 'snapshot fingerprint')
})

await test('a snapshot always reports the fingerprint of the policy it priced', () => {
  // The calculator recomputes the fingerprint rather than trusting a cached
  // __fingerprint, so a bare policy and a mislabelled one are both identified
  // by their actual pricing basis.
  const bare = policyResolution.policy
  assertEqual(bare.__fingerprint, undefined, 'the cached fingerprint is absent on the bare policy')
  assertEqual(price(WITH_TUB, 2).policyFingerprint, policyResolution.fingerprint, 'cached path agrees')

  const snapshot = calculateAccommodationPrice({
    policy: bare,
    optionId: WITH_TUB,
    guestCount: 2,
    occupiedDates: ONE_NIGHT,
  })
  assertEqual(
    snapshot.policyFingerprint,
    policyResolution.fingerprint,
    'fingerprint recomputed from the policy itself'
  )
  assert(snapshot.policyFingerprint !== null, 'never reported as null while pricing from a real policy')

  // A stale cached value must not be trusted over the policy actually priced.
  const tampered = { ...bare, __fingerprint: 'deadbeefdeadbeef' }
  const recomputed = calculateAccommodationPrice({
    policy: tampered,
    optionId: WITH_TUB,
    guestCount: 2,
    occupiedDates: ONE_NIGHT,
  })
  assertEqual(
    recomputed.policyFingerprint,
    policyResolution.fingerprint,
    'recomputed fingerprint reflects the policy, not the attached field'
  )
})

// ---------------------------------------------------------------------------
// 5. Occupied dates
// ---------------------------------------------------------------------------

console.log('\n--- occupied dates ---')

await test('strict date parsing accepts real calendar dates', () => {
  assert(parseUtcDateOnly('2026-11-20') instanceof Date, 'ordinary date')
  assert(parseUtcDateOnly('2024-02-29') instanceof Date, 'leap day')
  assertEqual(parseUtcDateOnly('2023-02-29'), null, 'non-leap 29 February')
  assertEqual(parseUtcDateOnly('2026-02-30'), null, 'overflow day')
  assertEqual(parseUtcDateOnly('2026-13-01'), null, 'overflow month')
  assertEqual(parseUtcDateOnly('2026-00-10'), null, 'zero month')
  assertEqual(parseUtcDateOnly('2026-11-31'), null, '31 November')
  assertEqual(parseUtcDateOnly('2026-04-31'), null, '31 April')
})

await test('strict date parsing rejects malformed input', () => {
  assertEqual(parseUtcDateOnly('2026-1-1'), null, 'unpadded')
  assertEqual(parseUtcDateOnly('20-11-2026'), null, 'wrong order')
  assertEqual(parseUtcDateOnly('2026-11-20T00:00:00Z'), null, 'timestamp')
  assertEqual(parseUtcDateOnly(' 2026-11-20'), null, 'leading space')
  assertEqual(parseUtcDateOnly(20261120), null, 'number')
  assertEqual(parseUtcDateOnly(null), null, 'null')
  assertEqual(parseUtcDateOnly(new Date()), null, 'Date object')
})

await test('a leap-day sequence is accepted', () => {
  const dates = ['2024-02-27', '2024-02-28', '2024-02-29', '2024-03-01']
  assertDeepEqual(validateOccupiedDates(dates), dates, 'leap-day nights are consecutive')
  assertEqual(price(WITH_TUB, 2, dates).nightCount, 4, 'four billable nights')
})

await test('a year boundary sequence is accepted', () => {
  const dates = ['2025-12-30', '2025-12-31', '2026-01-01']
  assertDeepEqual(validateOccupiedDates(dates), dates, 'year boundary is consecutive')
})

await test('a DST-spanning date list is accepted and priced per night', () => {
  // Chile's April fall-back and September spring-forward transitions. The list
  // is supplied explicitly, so a DST change cannot alter how many nights are
  // billed.
  const fallBack = ['2026-04-03', '2026-04-04', '2026-04-05']
  const springForward = ['2026-09-05', '2026-09-06', '2026-09-07']

  assertDeepEqual(validateOccupiedDates(fallBack), fallBack, 'fall-back list is consecutive')
  assertDeepEqual(validateOccupiedDates(springForward), springForward, 'spring-forward list is consecutive')

  const snapshot = price(WITHOUT_TUB, 4, fallBack)
  assertEqual(snapshot.nightCount, 3, 'three nights billed')
  assertEqual(snapshot.stayTotal, 90000 * 3, 'total scales with the supplied night count')
  assertEqual(snapshot.nights[1].date, '2026-04-04', 'transition night present exactly once')
})

await test('UTC parsing is independent of the host timezone', () => {
  // parseUtcDateOnly must not use local accessors; the round-trip readback is
  // what makes that safe, and it is verified for every field.
  const parsed = parseUtcDateOnly('2026-11-20')
  assertEqual(parsed.getUTCFullYear(), 2026, 'year')
  assertEqual(parsed.getUTCMonth(), 10, 'month')
  assertEqual(parsed.getUTCDate(), 20, 'day')
  assertEqual(parsed.getUTCHours(), 0, 'midnight UTC')
})

await test('an empty or missing date list is rejected', () => {
  assertThrows(() => validateOccupiedDates([]), 'INVALID_OCCUPIED_DATES', 'empty list')
  assertThrows(() => validateOccupiedDates(undefined), 'INVALID_OCCUPIED_DATES', 'undefined')
  assertThrows(() => validateOccupiedDates('2026-11-20'), 'INVALID_OCCUPIED_DATES', 'string')
})

await test('a duplicate date is rejected', () => {
  assertThrows(
    () => validateOccupiedDates(['2026-11-20', '2026-11-20']),
    'DUPLICATE_OCCUPIED_DATE',
    'duplicate'
  )
})

await test('an unordered date list is rejected', () => {
  assertThrows(
    () => validateOccupiedDates(['2026-11-21', '2026-11-20']),
    'UNORDERED_OCCUPIED_DATES',
    'descending'
  )
})

await test('a gapped date list is rejected', () => {
  assertThrows(
    () => validateOccupiedDates(['2026-11-20', '2026-11-22']),
    'GAPPED_OCCUPIED_DATES',
    'gap of one night'
  )
  // The first defect encountered is reported: the gap at index 1 precedes the
  // descent at index 2.
  assertThrows(
    () => validateOccupiedDates(['2026-11-20', '2026-11-22', '2026-11-21']),
    'GAPPED_OCCUPIED_DATES',
    'gap then descent'
  )
})

await test('an impossible date inside a list is rejected', () => {
  assertThrows(
    () => validateOccupiedDates(['2026-02-28', '2026-02-29']),
    'INVALID_OCCUPIED_DATES',
    '29 February does not exist in 2026'
  )
  assertThrows(
    () => validateOccupiedDates(['2026-11-20', '2026-02-30']),
    'INVALID_OCCUPIED_DATES',
    'invalid second entry'
  )
  assertThrows(
    () => validateOccupiedDates(['2026-04-31', '2026-05-01']),
    'INVALID_OCCUPIED_DATES',
    '31 April does not exist'
  )
})

// ---------------------------------------------------------------------------
// 6. Guest and option validation
// ---------------------------------------------------------------------------

console.log('\n--- guest and option validation ---')

await test('a missing option is rejected rather than defaulted', () => {
  for (const optionId of [undefined, null, '']) {
    assertThrows(
      () => price(optionId, 2),
      'MISSING_OPTION',
      `missing option ${String(optionId)}`
    )
  }
})

await test('an unknown option is rejected', () => {
  assertThrows(() => price('sauna_only', 2), 'UNKNOWN_OPTION', 'unknown id')
  assertThrows(() => price('WITH_HOT_TUB', 2), 'UNKNOWN_OPTION', 'case-sensitive')
  assertThrows(() => price(1, 2), 'INVALID_OPTION', 'numeric id')
  assertThrows(() => price(['with_hot_tub'], 2), 'INVALID_OPTION', 'array id')
})

await test('non-numeric guest types are rejected before coercion', () => {
  for (const guestCount of [true, false, [], {}, null, NaN, Infinity, -Infinity, 'two', '3.5', 2.5, ' 3', '+3', '0x3', '3 ']) {
    assertThrows(
      () => price(WITH_TUB, guestCount),
      'INVALID_GUEST_COUNT',
      `guestCount ${JSON.stringify(guestCount)}`
    )
  }
})

await test('out-of-range guest counts are rejected, not clamped', () => {
  assertThrows(() => price(WITH_TUB, 0), 'GUEST_COUNT_OUT_OF_RANGE', 'zero')
  assertThrows(() => price(WITH_TUB, -2), 'GUEST_COUNT_OUT_OF_RANGE', 'negative')
  assertThrows(() => price(WITH_TUB, 7), 'GUEST_COUNT_OUT_OF_RANGE', 'above maxOccupancy')
  assertThrows(() => price(WITH_TUB, 1000), 'GUEST_COUNT_OUT_OF_RANGE', 'far above maxOccupancy')
})

await test('a canonical numeric string guest count is accepted', () => {
  assertEqual(price(WITH_TUB, '3').guestCount, 3, 'string "3" becomes 3')
  assertEqual(price(WITH_TUB, '1').guestCount, 1, 'string "1"')
  assertEqual(price(WITH_TUB, '6').guestCount, 6, 'string "6"')
})

await test('a zero-padded guest count string is rejected as non-canonical', () => {
  // "03" and "0003" denote the same count as "3". Admitting both spellings
  // would let a raw-value-keyed log or fingerprint disagree with what was
  // priced, so only the canonical round-trip form is accepted.
  for (const guestCount of ['03', '0003', '06', '01', '003']) {
    assertThrows(
      () => price(WITH_TUB, guestCount),
      'INVALID_GUEST_COUNT',
      `padded string ${JSON.stringify(guestCount)}`
    )
  }
})

// ---------------------------------------------------------------------------
// 7. Tariff: all 12 combinations, one and two nights
// ---------------------------------------------------------------------------

console.log('\n--- tariff: 12 guest/option combinations ---')

for (const optionId of [WITH_TUB, WITHOUT_TUB]) {
  for (let guests = 1; guests <= 6; guests++) {
    await test(`nightly ${optionId} / ${guests} guests = ${TARIFF[optionId][guests]}`, () => {
      const snapshot = price(optionId, guests, ONE_NIGHT)
      assertEqual(snapshot.nightlyTotal, TARIFF[optionId][guests], 'nightly total')
      assertEqual(snapshot.stayTotal, TARIFF[optionId][guests], 'one-night stay total')
      assertEqual(snapshot.currency, 'CLP', 'currency')
      assertEqual(snapshot.guestCount, guests, 'guest count')
      assertEqual(snapshot.nightCount, 1, 'one night')
    })
  }
}

console.log('\n--- tariff: 12 combinations over two nights ---')

for (const optionId of [WITH_TUB, WITHOUT_TUB]) {
  for (let guests = 1; guests <= 6; guests++) {
    await test(`two nights ${optionId} / ${guests} guests = ${TARIFF[optionId][guests] * 2}`, () => {
      const snapshot = price(optionId, guests, TWO_NIGHTS)
      assertEqual(snapshot.stayTotal, TARIFF[optionId][guests] * 2, 'stay total')
      assertEqual(snapshot.nights.length, 2, 'two nights')
      assert(snapshot.nights[0].amount === snapshot.nights[1].amount, 'both nights charged identically')
    })
  }
}

console.log('\n--- operator examples ---')

await test('2 guests with hot tub over two nights = 180000', () => {
  assertEqual(price(WITH_TUB, 2, TWO_NIGHTS).stayTotal, 180000, 'total')
})

await test('2 guests without hot tub over two nights = 160000', () => {
  assertEqual(price(WITHOUT_TUB, 2, TWO_NIGHTS).stayTotal, 160000, 'total')
})

await test('3 guests with hot tub over two nights = 200000', () => {
  assertEqual(price(WITH_TUB, 3, TWO_NIGHTS).stayTotal, 200000, 'total')
})

await test('4 guests without hot tub over two nights = 180000', () => {
  assertEqual(price(WITHOUT_TUB, 4, TWO_NIGHTS).stayTotal, 180000, 'total')
})

await test('5 guests with hot tub over two nights = 216000', () => {
  assertEqual(price(WITH_TUB, 5, TWO_NIGHTS).stayTotal, 216000, 'total')
})

await test('6 guests without hot tub over two nights = 212000', () => {
  assertEqual(price(WITHOUT_TUB, 6, TWO_NIGHTS).stayTotal, 212000, 'total')
})

// ---------------------------------------------------------------------------
// 8. Tier, additional guests, mattress condition
// ---------------------------------------------------------------------------

console.log('\n--- tiers, additional guests, mattress condition ---')

await test('occupancy tiers resolve as specified', () => {
  assertDeepEqual(price(WITH_TUB, 1).tier, { id: 't1_2', fromGuests: 1, toGuests: 2 }, '1 guest')
  assertDeepEqual(price(WITH_TUB, 2).tier, { id: 't1_2', fromGuests: 1, toGuests: 2 }, '2 guests')
  assertDeepEqual(price(WITH_TUB, 3).tier, { id: 't3_4', fromGuests: 3, toGuests: 4 }, '3 guests')
  assertDeepEqual(price(WITH_TUB, 4).tier, { id: 't3_4', fromGuests: 3, toGuests: 4 }, '4 guests')
})

await test('guests at or below the threshold carry no additional charge', () => {
  for (let guests = 1; guests <= 4; guests++) {
    const snapshot = price(WITH_TUB, guests)
    assertEqual(snapshot.additionalGuestCount, 0, `${guests} guests: additional count`)
    assertEqual(snapshot.additionalAmountPerNight, 0, `${guests} guests: additional amount`)
    assertEqual(snapshot.mattressCondition, null, `${guests} guests: no mattress condition`)
  }
})

await test('five guests incur exactly one additional guest charge', () => {
  const snapshot = price(WITH_TUB, 5)
  assertEqual(snapshot.additionalGuestCount, 1, 'additional guest count')
  assertEqual(snapshot.additionalRatePerGuestPerNight, 8000, 'additional rate')
  assertEqual(snapshot.additionalAmountPerNight, 8000, 'additional amount')
  assertEqual(snapshot.baseRatePerNight + snapshot.additionalAmountPerNight, snapshot.nightlyTotal, 'nightly arithmetic')
  assertEqual(snapshot.tier.id, 't3_4', 'tier is 3-4, not 5')
})

await test('six guests incur exactly two additional guest charges', () => {
  const snapshot = price(WITHOUT_TUB, 6)
  assertEqual(snapshot.additionalGuestCount, 2, 'additional guest count')
  assertEqual(snapshot.additionalAmountPerNight, 16000, 'additional amount')
  assertEqual(snapshot.nightlyTotal, 106000, 'nightly total')
})

await test('the mattress condition applies to BOTH five and six guests', () => {
  for (const guests of [5, 6]) {
    for (const optionId of [WITH_TUB, WITHOUT_TUB]) {
      const snapshot = price(optionId, guests)
      assert(snapshot.mattressCondition !== null, `${optionId}/${guests}: condition present`)
      assertEqual(snapshot.mattressCondition.appliesFromGuest, 5, `${optionId}/${guests}: applies from guest 5`)
      assertEqual(
        snapshot.mattressCondition.text,
        ACCOMMODATION_PRICING_POLICY.additionalGuests.condition.text,
        `${optionId}/${guests}: approved condition text`
      )
    }
  }
})

// --- condition applicability ----------------------------------------------
//
// The condition must appear only when the party has both a genuinely
// additional guest AND has reached the declared fromGuest. Below is a generic
// fixture whose condition begins at guest 6, so the fifth guest is charged the
// additional rate but must NOT see a condition, while the sixth must.

const LATE_CONDITION_POLICY = Object.freeze({
  schemaVersion: PRICING_SCHEMA_VERSION,
  basis: PRICING_BASIS.ACCOMMODATION_PER_NIGHT,
  currency: 'CLP',
  checkInTime: '16:00',
  checkOutTime: '13:00',
  standardCapacity: 4,
  maxOccupancy: 6,
  tiers: [
    { id: 't1_2', fromGuests: 1, toGuests: 2 },
    { id: 't3_4', fromGuests: 3, toGuests: 4 },
  ],
  additionalGuests: {
    threshold: 4,
    ratePerGuestPerNight: 8000,
    condition: { fromGuest: 6, text: 'Traer un artefacto adicional.' },
  },
  options: [
    { id: 'only', label: 'Unica', inclusions: ['piscinas'], rates: { t1_2: 90000, t3_4: 100000 } },
  ],
})

const lateConditionResolution = resolvePolicy(LATE_CONDITION_POLICY)
const LATE_POLICY = withFingerprint(lateConditionResolution)

function priceLate(guestCount) {
  return calculateAccommodationPrice({
    policy: LATE_POLICY,
    optionId: 'only',
    guestCount,
    occupiedDates: ONE_NIGHT,
  })
}

await test('the late-condition fixture is a valid policy', () => {
  assertEqual(lateConditionResolution.status, 'valid', 'a condition from guest 6 is legal')
})

await test('a condition is absent below its declared fromGuest', () => {
  for (let guests = 1; guests <= 4; guests++) {
    assertEqual(priceLate(guests).mattressCondition, null, `${guests} guests: not an additional guest`)
  }
})

await test('a condition beginning at guest 6 is absent at five guests', () => {
  // The fifth guest is charged the additional rate, but the declared condition
  // does not start until the sixth. Charging someone and imposing a condition
  // on them must follow the declared threshold, not merely extraGuestCount > 0.
  const five = priceLate(5)
  assertEqual(five.additionalGuestCount, 1, 'the fifth guest is still charged')
  assertEqual(five.additionalAmountPerNight, 8000, 'and pays the additional rate')
  assertEqual(five.mattressCondition, null, 'but does not receive a condition starting at 6')
})

await test('a condition beginning at guest 6 is present at six guests', () => {
  const six = priceLate(6)
  assertEqual(six.additionalGuestCount, 2, 'two additional guests')
  assertEqual(six.mattressCondition !== null, true, 'condition present at the declared threshold')
  assertEqual(six.mattressCondition.appliesFromGuest, 6, 'reports its declared start')
  assertEqual(six.mattressCondition.text, 'Traer un artefacto adicional.', 'reports its declared text')
})

await test('the Ensueño condition behaviour is preserved by the threshold logic', () => {
  // The approved declaration starts at 5, so 1-4 have none and 5-6 do.
  for (let guests = 1; guests <= 4; guests++) {
    assertEqual(price(WITH_TUB, guests).mattressCondition, null, `${guests}: no condition`)
  }
  for (const guests of [5, 6]) {
    assertEqual(
      price(WITH_TUB, guests).mattressCondition.appliesFromGuest,
      5,
      `${guests}: condition applies from 5`
    )
  }
})

await test('a condition starting at or below the threshold is rejected', () => {
  // A condition would then attach to guests who are charged nothing extra,
  // which is a contradictory declaration.
  for (const fromGuest of [1, 2, 3, 4]) {
    const raw = clone(ACCOMMODATION_PRICING_POLICY)
    raw.additionalGuests.condition.fromGuest = fromGuest
    const resolution = resolvePolicy(raw)
    assertEqual(resolution.status, 'invalid', `fromGuest ${fromGuest} rejected`)
    assert(
      /must be greater than the additional-guest threshold/.test(resolution.error.message),
      `fromGuest ${fromGuest}: message explains the range`
    )
  }
})

await test('a condition starting above maxOccupancy is rejected', () => {
  // Unreachable, so it would be a declared obligation that never surfaces.
  const raw = clone(ACCOMMODATION_PRICING_POLICY)
  raw.additionalGuests.condition.fromGuest = 7
  const resolution = resolvePolicy(raw)
  assertEqual(resolution.status, 'invalid', 'fromGuest 7 rejected')
  assert(
    /exceeds maxOccupancy/.test(resolution.error.message),
    'message explains that it could never apply'
  )
})

await test('a condition at threshold + 1 and at maxOccupancy are both accepted', () => {
  // The bounds of the allowed additional-guest range.
  const first = clone(ACCOMMODATION_PRICING_POLICY)
  first.additionalGuests.condition.fromGuest = 5
  assertEqual(resolvePolicy(first).status, 'valid', 'threshold + 1 accepted')

  const last = clone(ACCOMMODATION_PRICING_POLICY)
  last.additionalGuests.condition.fromGuest = 6
  assertEqual(resolvePolicy(last).status, 'valid', 'maxOccupancy accepted')
})

await test('a policy with additionalGuests but no condition stays condition-free', () => {
  const raw = clone(ACCOMMODATION_PRICING_POLICY)
  raw.additionalGuests.condition = null
  const policy = withFingerprint(resolvePolicy(raw))
  for (const guests of [5, 6]) {
    const snapshot = calculateAccommodationPrice({
      policy,
      optionId: WITH_TUB,
      guestCount: guests,
      occupiedDates: ONE_NIGHT,
    })
    assertEqual(snapshot.mattressCondition, null, `${guests}: no condition declared, none emitted`)
  }
})

await test('the mattress condition is present for a multi-night stay too', () => {
  const snapshot = price(WITH_TUB, 5, TWO_NIGHTS)
  assert(snapshot.mattressCondition !== null, 'condition present')
  assertEqual(snapshot.stayTotal, 216000, 'five guests with hot tub, two nights')
})

// ---------------------------------------------------------------------------
// 9. Snapshot shape
// ---------------------------------------------------------------------------

console.log('\n--- snapshot shape ---')

await test('the snapshot carries every required field', () => {
  const snapshot = price(WITH_TUB, 5, TWO_NIGHTS)

  assertEqual(snapshot.schemaVersion, PRICING_SNAPSHOT_SCHEMA_VERSION, 'schemaVersion')
  assert(typeof snapshot.policyFingerprint === 'string', 'policyFingerprint')
  assertEqual(snapshot.currency, 'CLP', 'currency')
  assertEqual(snapshot.pricingBasis, PRICING_BASIS.ACCOMMODATION_PER_NIGHT, 'pricingBasis')
  assertEqual(snapshot.option.id, WITH_TUB, 'option id')
  assertEqual(snapshot.option.label, 'Con tinaja', 'option label')
  assert(Array.isArray(snapshot.option.inclusions), 'option inclusions')
  assertEqual(snapshot.guestCount, 5, 'guestCount')
  assertEqual(snapshot.tier.id, 't3_4', 'tier')
  assertEqual(snapshot.additionalGuestCount, 1, 'additionalGuestCount')
  assertEqual(snapshot.baseRatePerNight, 100000, 'baseRatePerNight')
  assertEqual(snapshot.additionalRatePerGuestPerNight, 8000, 'additionalRatePerGuestPerNight')
  assertDeepEqual(snapshot.occupiedDates, TWO_NIGHTS, 'occupiedDates')
  assertEqual(snapshot.standardCapacity, 4, 'standardCapacity')
  assertEqual(snapshot.maxOccupancy, 6, 'maxOccupancy')
  assert(snapshot.mattressCondition !== null, 'mattressCondition')
})

await test('the snapshot is JSON-serializable and survives a round trip', () => {
  const snapshot = price(WITHOUT_TUB, 6, TWO_NIGHTS)
  const roundTripped = JSON.parse(JSON.stringify(snapshot))
  assertDeepEqual(roundTripped, snapshot, 'round trip is lossless')
  assertEqual(roundTripped.stayTotal, 212000, 'total survives')
})

await test('the snapshot makes no tax assertion of any kind', () => {
  const snapshot = price(WITH_TUB, 3, TWO_NIGHTS)
  const keys = Object.keys(snapshot)
  for (const forbidden of ['taxIncluded', 'taxes', 'taxExcluded', 'tax', 'feeIncluded', 'fees']) {
    assert(!keys.includes(forbidden), `snapshot must not expose "${forbidden}"`)
  }
  const text = JSON.stringify(snapshot).toLowerCase()
  assert(!text.includes('tax'), 'no tax key appears anywhere in the serialized snapshot')
})

await test('the snapshot makes no claim of persistence or commercial acceptance', () => {
  const snapshot = price(WITH_TUB, 2, ONE_NIGHT)
  const text = JSON.stringify(snapshot).toLowerCase()
  for (const forbidden of ['persisted', 'accepted', 'confirmed', 'paid', 'commercially']) {
    assert(!text.includes(forbidden), `snapshot must not claim "${forbidden}"`)
  }
})

await test('the nightly breakdown sums to the stay total', () => {
  for (const optionId of [WITH_TUB, WITHOUT_TUB]) {
    for (let guests = 1; guests <= 6; guests++) {
      for (const dates of [ONE_NIGHT, TWO_NIGHTS, ['2026-04-03', '2026-04-04', '2026-04-05']]) {
        const snapshot = price(optionId, guests, dates)
        const summed = snapshot.nights.reduce((total, night) => total + night.amount, 0)
        assertEqual(summed, snapshot.stayTotal, `${optionId}/${guests}/${dates.length} nights`)
        assertEqual(snapshot.nights.length, snapshot.occupiedDates.length, 'one night per occupied date')
        for (const night of snapshot.nights) {
          assertEqual(night.quantity, 1, 'one inventory unit per night')
          assertEqual(
            night.baseAmount + night.additionalAmount,
            night.amount,
            'per-night arithmetic'
          )
        }
      }
    }
  }
})

await test('a long stay scales linearly', () => {
  const dates = Array.from({ length: 14 }, (_, index) => {
    const day = 1 + index
    return `2026-12-${String(day).padStart(2, '0')}`
  })
  const snapshot = price(WITH_TUB, 5, dates)
  assertEqual(snapshot.nightCount, 14, 'fourteen nights')
  assertEqual(snapshot.stayTotal, 108000 * 14, 'fourteen nightly totals')
})

// ---------------------------------------------------------------------------
// 10. Line semantics
// ---------------------------------------------------------------------------

console.log('\n--- line semantics ---')

await test('quantity is 1 and unit price equals the complete-stay amount', () => {
  const snapshot = price(WITHOUT_TUB, 3, TWO_NIGHTS)
  assertEqual(snapshot.line.quantity, PRICING_LINE_SEMANTICS.QUANTITY, 'quantity')
  assertEqual(snapshot.line.quantity, 1, 'quantity is 1')
  assertEqual(snapshot.line.unitPrice, 180000, 'unitPrice is the complete-stay amount')
  assertEqual(snapshot.line.lineTotal, 180000, 'lineTotal is the complete-stay amount')
  assertEqual(snapshot.line.unitPriceBasis, 'complete_stay_per_unit', 'basis is declared')
})

await test('unitPrice multiplied by quantity equals lineTotal for every combination', () => {
  for (const optionId of [WITH_TUB, WITHOUT_TUB]) {
    for (let guests = 1; guests <= 6; guests++) {
      const snapshot = price(optionId, guests, TWO_NIGHTS)
      assertEqual(
        snapshot.line.unitPrice * snapshot.line.quantity,
        snapshot.line.lineTotal,
        `${optionId}/${guests}`
      )
      assertEqual(snapshot.line.lineTotal, snapshot.stayTotal, 'line total matches the stay total')
    }
  }
})

await test('no nightly average is stored as the unit price', () => {
  // A 2-night, 3-guest stay without hot tub costs 180000 total. A nightly
  // average would be 90000; the unit price must be the complete-stay amount.
  const snapshot = price(WITHOUT_TUB, 3, TWO_NIGHTS)
  assertEqual(snapshot.line.unitPrice, 180000, 'complete-stay amount, not an average')
  assert(snapshot.line.unitPrice !== snapshot.nightlyTotal, 'distinct from the nightly total')
  assert(snapshot.nights.every((night) => night.amount === 90000), 'nightly detail lives in the breakdown')
})

// ---------------------------------------------------------------------------
// 11. Arithmetic guards
// ---------------------------------------------------------------------------

console.log('\n--- arithmetic guards ---')

await test('a product that would overflow the safe range is rejected', () => {
  const raw = clone(ACCOMMODATION_PRICING_POLICY)
  raw.options[0].rates.t3_4 = Number.MAX_SAFE_INTEGER - 1
  raw.additionalGuests.ratePerGuestPerNight = Number.MAX_SAFE_INTEGER
  const resolution = resolvePolicy(raw)
  assertEqual(resolution.status, 'valid', 'the declaration itself is structurally valid')

  const hardened = withFingerprint(resolution)
  assertThrows(
    () => calculateAccommodationPrice({
      policy: hardened,
      optionId: WITH_TUB,
      guestCount: 6,
      occupiedDates: TWO_NIGHTS,
    }),
    'AMOUNT_OVERFLOW',
    'overflow is refused rather than producing a wrong number'
  )
})

await test('an unvalidated or absent policy cannot reach arithmetic', () => {
  assertThrows(
    () => calculateAccommodationPrice({ policy: null, optionId: WITH_TUB, guestCount: 2, occupiedDates: ONE_NIGHT }),
    'MISSING_POLICY',
    'absent policy'
  )
  assertThrows(
    () => calculateAccommodationPrice({ optionId: WITH_TUB, guestCount: 2, occupiedDates: ONE_NIGHT }),
    'MISSING_POLICY',
    'no policy field'
  )
})

await test('a defective policy is refused by the calculator even if supplied directly', () => {
  const defective = clone(policyResolution.policy)
  defective.options[0].rates.t3_4 = null
  assertThrows(
    () => calculateAccommodationPrice({ policy: defective, optionId: WITH_TUB, guestCount: 3, occupiedDates: ONE_NIGHT }),
    'INVALID_PRICING_POLICY',
    'calculator revalidates'
  )
})

await test('an unsupported basis is refused by the calculator', () => {
  const wrongBasis = { ...POLICY, basis: 'per_person_nightly' }
  assertThrows(
    () => calculateAccommodationPrice({ policy: wrongBasis, optionId: WITH_TUB, guestCount: 2, occupiedDates: ONE_NIGHT }),
    'INVALID_PRICING_POLICY',
    'basis validated before use'
  )
})

await test('missing arguments are rejected with distinct codes', () => {
  assertThrows(
    () => calculateAccommodationPrice({ policy: POLICY, guestCount: 2, occupiedDates: ONE_NIGHT }),
    'MISSING_OPTION',
    'no optionId'
  )
  assertThrows(
    () => calculateAccommodationPrice({ policy: POLICY, optionId: WITH_TUB, occupiedDates: ONE_NIGHT }),
    'INVALID_GUEST_COUNT',
    'no guestCount'
  )
  assertThrows(
    () => calculateAccommodationPrice({ policy: POLICY, optionId: WITH_TUB, guestCount: 2 }),
    'INVALID_OCCUPIED_DATES',
    'no occupiedDates'
  )
})

// ---------------------------------------------------------------------------
// 12. Layer isolation
// ---------------------------------------------------------------------------

console.log('\n--- layer isolation ---')

await test('the generic engine contains no Ensueño name, slug, or price', async () => {
  const { readFileSync } = await import('fs')
  const { fileURLToPath } = await import('url')
  const { dirname, join } = await import('path')

  const here = dirname(fileURLToPath(import.meta.url))

  // Product identity words that must never appear in the generic engine.
  const forbiddenWords = ['ensueno', 'curinanco', 'tinaja', 'cabina', 'cabin', 'valdi', 'valdivia']

  // Approved tariff amounts. These are matched as standalone numbers so that
  // unrelated constants (for example the FNV prime) cannot produce a false
  // positive merely by sharing a digit run.
  const tariffAmounts = [90000, 100000, 80000, 108000, 116000, 98000, 106000]

  for (const file of ['pricing.policy.js', 'pricing.calculator.js']) {
    const source = readFileSync(join(here, file), 'utf8')
    const lowered = source.toLowerCase()

    for (const word of forbiddenWords) {
      assert(!lowered.includes(word), `${file} must not contain "${word}"`)
    }

    for (const amount of tariffAmounts) {
      // Skip occurrences that are part of a longer number or a hex literal.
      const pattern = new RegExp(`(?<![0-9a-zA-Z_$])${amount}(?![0-9a-zA-Z_$])`, 'g')
      const offending = pattern.exec(source)
      assertEqual(offending, null, `${file} must not contain the tariff amount ${amount}`)
    }
  }
})

await test('the pricing modules import no DB, network, or startup surface', async () => {
  const { readFileSync } = await import('fs')
  const { fileURLToPath } = await import('url')
  const { dirname, join } = await import('path')

  const here = dirname(fileURLToPath(import.meta.url))
  const forbidden = ['postgres', 'database/', "from 'pg'", 'fetch(', 'http', 'fs.', 'readFile', 'writeFile', 'capability.bootstrap', 'application.start']

  for (const file of ['pricing.policy.js', 'pricing.calculator.js']) {
    const source = readFileSync(join(here, file), 'utf8')
    for (const needle of forbidden) {
      assert(!source.includes(needle), `${file} must not reference "${needle}"`)
    }
  }
})

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log('\n' + '='.repeat(60))
console.log(`Results: ${passed} passed, ${failed} failed`)
if (failed > 0) {
  console.log('\nFailures:')
  for (const failure of failures) {
    console.log(`  - ${failure.name}: ${failure.error.message}`)
  }
}
console.log('='.repeat(60))

process.exit(failed === 0 ? 0 : 1)
