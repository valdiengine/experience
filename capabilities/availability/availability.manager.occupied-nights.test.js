/**
 * BOOKING-OCCUPIED-NIGHTS-1A — focused test for the availability read path.
 *
 * Purpose: narrowly verify that AvailabilityManager.checkAvailability derives
 * its occupied dates from the UTC occupied-night helper instead of the previous
 * local-time checkout-minus-one calculation, and that the invalid-range and
 * capacity-decision behaviour around that derivation is correct.
 *
 * Scope limits, deliberately:
 *  - It constructs the real AvailabilityManager with a stub in-memory
 *    availability repository, because the full capability bundle is not needed
 *    and its persistence bootstrap would drag in external packages.
 *  - checkAvailability is a READ path. It is not the authoritative public
 *    reservation POST capacity gate, which is the transactional conditional
 *    UPDATE inside the reservation repository. Nothing here certifies
 *    persistence consumption, create/release symmetry, or historical release.
 *
 * Framework-free, matching capabilities/pricing/pricing.test.js. No database,
 * no network, no provisioning, no application bootstrap, no dependency
 * installation. The availability module graph is entirely relative imports, so
 * the real manager is exercised without external packages.
 *
 * Timezone coverage runs the real manager in isolated child processes, one per
 * timezone, with TZ set before the process starts, because in-process mutation
 * of process.env.TZ is unreliable on Windows.
 *
 * Run:  node capabilities/availability/availability.manager.occupied-nights.test.js
 */

import { execFileSync } from 'node:child_process'
import { AvailabilityManager } from './availability.manager.js'
import { expandOccupiedNights } from './availability.occupied-nights.js'
import { AvailabilityDateRangeError, AvailabilityValidationError } from './availability.errors.js'

let passed = 0
let failed = 0
const failures = []

function test(name, fn) {
  try {
    const result = fn()
    if (result && typeof result.then === 'function') {
      return result.then(
        () => { passed++; console.log(`  PASS ${name}`) },
        (error) => { failed++; failures.push({ name, error }); console.log(`  FAIL ${name}: ${error.message}`) }
      )
    }
    passed++
    console.log(`  PASS ${name}`)
  } catch (error) {
    failed++
    failures.push({ name, error })
    console.log(`  FAIL ${name}: ${error.message}`)
  }
  return Promise.resolve()
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'assertion failed')
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message || 'assertion failed'}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
  }
}

function assertDeepEqual(actual, expected, message) {
  const a = JSON.stringify(actual)
  const b = JSON.stringify(expected)
  if (a !== b) throw new Error(`${message || 'assertion failed'}: expected ${b}, got ${a}`)
}

/** Builds the real manager over a stub repository, recording every call. */
function buildManager(rows = []) {
  const calls = []
  const repo = {
    async findMany(query) {
      calls.push(query)
      return rows
    },
  }
  const manager = new AvailabilityManager({
    tenant: { id: 'commercial' },
    repositories: { availability: repo },
  })
  return { manager, calls }
}

const ACC = 'acc-1'

console.log('\nBOOKING-OCCUPIED-NIGHTS-1A — availability read path\n')

// ---------------------------------------------------------------------------
// Response shape is preserved
// ---------------------------------------------------------------------------

await test('preserves the public response structure', async () => {
  const { manager } = buildManager([])
  const result = await manager.checkAvailability(ACC, '2026-05-10', '2026-05-13', null)
  assertDeepEqual(
    Object.keys(result).sort(),
    ['available', 'blockedDates', 'checkIn', 'checkOut', 'details', 'totalNights'],
    'response keys must be unchanged'
  )
  assertEqual(result.available, true)
  assertEqual(result.checkIn, '2026-05-10')
  assertEqual(result.checkOut, '2026-05-13')
  assertEqual(result.totalNights, 3)
  assertDeepEqual(result.blockedDates, [])
  assertDeepEqual(result.details.map((d) => d.date), ['2026-05-10', '2026-05-11', '2026-05-12'])
  assertDeepEqual(result.details.map((d) => d.status), ['available', 'available', 'available'])
})

// ---------------------------------------------------------------------------
// Capacity decision uses occupied dates only
// ---------------------------------------------------------------------------

await test('an unavailable checkout date does not reject an otherwise available stay', async () => {
  const { manager, calls } = buildManager([
    { date: '2026-05-13', status: 'blocked' },
  ])
  const result = await manager.checkAvailability(ACC, '2026-05-10', '2026-05-13', null)
  assertEqual(result.available, true, 'checkout is not occupied, so a blocked checkout must not reject the stay')
  assertEqual(result.totalNights, 3)
  assertDeepEqual(result.blockedDates, [])
  assertDeepEqual(result.details.map((d) => d.date), ['2026-05-10', '2026-05-11', '2026-05-12'],
    'the checkout date must not appear in the evaluated nights')
  assertEqual(calls.length, 1, 'exactly one availability query is expected')
})

await test('an unavailable occupied night rejects the stay', async () => {
  const { manager } = buildManager([
    { date: '2026-05-11', status: 'reserved' },
  ])
  const result = await manager.checkAvailability(ACC, '2026-05-10', '2026-05-13', null)
  assertEqual(result.available, false, 'a blocked occupied night must reject the stay')
  assertDeepEqual(result.blockedDates, ['2026-05-11'])
  assertEqual(result.totalNights, 3)
})

await test('an unavailable check-in night rejects the stay', async () => {
  const { manager } = buildManager([
    { date: '2026-05-10', status: 'blocked' },
  ])
  const result = await manager.checkAvailability(ACC, '2026-05-10', '2026-05-13', null)
  assertEqual(result.available, false)
  assertDeepEqual(result.blockedDates, ['2026-05-10'])
})

await test('the last occupied night rejects but the checkout does not', async () => {
  const { manager } = buildManager([
    { date: '2026-05-12', status: 'reserved' },
    { date: '2026-05-13', status: 'reserved' },
  ])
  const result = await manager.checkAvailability(ACC, '2026-05-10', '2026-05-13', null)
  assertEqual(result.available, false)
  assertDeepEqual(result.blockedDates, ['2026-05-12'], 'only the occupied night is reported as blocking')
})

// ---------------------------------------------------------------------------
// Derivation matches the helper exactly
// ---------------------------------------------------------------------------

await test('evaluated nights match the helper for representative ranges', async () => {
  const ranges = [
    ['2026-05-10', '2026-05-11'],
    ['2026-05-10', '2026-05-13'],
    ['2026-04-04', '2026-04-06'],
    ['2026-10-03', '2026-10-05'],
    ['2025-12-30', '2026-01-02'],
    ['2028-02-28', '2028-03-01'],
    ['2026-01-01', '2026-04-01'],
  ]
  for (const [checkIn, checkOut] of ranges) {
    const { manager } = buildManager([])
    const result = await manager.checkAvailability(ACC, checkIn, checkOut, null)
    assertDeepEqual(
      result.details.map((d) => d.date),
      expandOccupiedNights({ startDate: checkIn, endDate: checkOut }),
      `nights for ${checkIn} to ${checkOut}`
    )
    assertEqual(result.totalNights, result.details.length, 'totalNights must equal the evaluated night count')
  }
})

await test('the availability query window is unchanged by this slice', async () => {
  const { manager, calls } = buildManager([])
  await manager.checkAvailability(ACC, '2026-05-10', '2026-05-13', null)
  assertEqual(calls.length, 1)
  assertDeepEqual(calls[0], { accommodationId: ACC, date: { gte: '2026-05-10', lte: '2026-05-13' } },
    'the repository query is not modified by this slice')
})

// ---------------------------------------------------------------------------
// Invalid ranges
// ---------------------------------------------------------------------------

await test('an invalid range performs no availability operation', async () => {
  const invalid = [
    // The pre-existing validateDateRange guard runs first and keeps its own error
    // type for reversed bounds and for strings the lenient `new Date(string)`
    // parser cannot read at all. This slice does not override that convention.
    { checkIn: '2026-05-12', checkOut: '2026-05-10', expect: 'AvailabilityValidationError' },
    { checkIn: 'not-a-date', checkOut: '2026-01-05', expect: 'AvailabilityValidationError' },
    { checkIn: '', checkOut: '2026-01-05', expect: 'AvailabilityValidationError' },
    // The helper is strictly stricter than `new Date(string)`, so these inputs
    // that the legacy lenient parser used to accept are now typed 4xx errors:
    // non-padded fields, year 0000, equal bounds, and impossible dates.
    { checkIn: '2026-1-1', checkOut: '2026-01-05', expect: 'AvailabilityDateRangeError' },
    { checkIn: '0000-01-01', checkOut: '0000-01-05', expect: 'AvailabilityDateRangeError' },
    { checkIn: '2026-05-10', checkOut: '2026-05-10', expect: 'AvailabilityDateRangeError' },
    { checkIn: '2026-02-30', checkOut: '2026-03-05', expect: 'AvailabilityDateRangeError' },
  ]

  for (const entry of invalid) {
    const { manager, calls } = buildManager([])
    let thrown = null
    try {
      await manager.checkAvailability(ACC, entry.checkIn, entry.checkOut, null)
    } catch (error) {
      thrown = error
    }
    assert(thrown !== null, `range ${entry.checkIn} to ${entry.checkOut} must be rejected`)
    assertEqual(thrown.name, entry.expect, `error type for ${entry.checkIn} to ${entry.checkOut}`)
    assert(
      thrown instanceof AvailabilityDateRangeError || thrown instanceof AvailabilityValidationError,
      'the error must be a typed availability error'
    )
    assertEqual(calls.length, 0, `no availability query may run for ${entry.checkIn} to ${entry.checkOut}`)
  }
})

await test('an invalid range is never reported as available', async () => {
  const { manager, calls } = buildManager([])
  let result = null
  let thrown = null
  try {
    result = await manager.checkAvailability(ACC, '2026-05-10', '2026-05-10', null)
  } catch (error) {
    thrown = error
  }
  assert(thrown !== null, 'a zero-night range must throw')
  assertEqual(result, null, 'no result may be returned for an invalid range')
  assertEqual(calls.length, 0, 'no availability query may run')
})

await test('a range beyond the technical bound is rejected without a query', async () => {
  const { manager, calls } = buildManager([])
  let thrown = null
  try {
    // 2016-01-01 to 2030-01-01 is 5114 nights, well beyond the exported
    // technical default of 3660.
    await manager.checkAvailability(ACC, '2016-01-01', '2030-01-01', null)
  } catch (error) {
    thrown = error
  }
  assert(thrown !== null, 'a range beyond the technical bound must throw')
  assertEqual(thrown.name, 'AvailabilityDateRangeError')
  assertEqual(calls.length, 0, 'no availability query may run')
})

// ---------------------------------------------------------------------------
// Timezone coverage — real manager, isolated child processes
// ---------------------------------------------------------------------------

const MANAGER_URL = new URL('./availability.manager.js', import.meta.url).href

const CHILD_SOURCE = `
import { AvailabilityManager } from ${JSON.stringify(MANAGER_URL)}
const offset = (iso) => new Date(iso).getTimezoneOffset()
const calls = []
const repo = { async findMany(query) { calls.push(query); return [{ date: '2026-04-05', status: 'reserved' }] } }
const manager = new AvailabilityManager({ tenant: { id: 'commercial' }, repositories: { availability: repo } })
const santiago = await manager.checkAvailability('acc-1', '2026-04-04', '2026-04-06', null)
const lordHowe = await manager.checkAvailability('acc-1', '2026-10-03', '2026-10-05', null)
const leap = await manager.checkAvailability('acc-1', '2028-02-28', '2028-03-01', null)
process.stdout.write(JSON.stringify({
  requestedTZ: process.env.TZ ?? null,
  effectiveZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  offsets: {
    jan: offset('2026-01-15T12:00:00Z'),
    jul: offset('2026-07-15T12:00:00Z'),
    apr5: offset('2026-04-05T12:00:00Z'),
    oct4: offset('2026-10-04T12:00:00Z'),
  },
  santiago: { totalNights: santiago.totalNights, dates: santiago.details.map((d) => d.date), available: santiago.available, blocked: santiago.blockedDates },
  lordHowe: { totalNights: lordHowe.totalNights, dates: lordHowe.details.map((d) => d.date), available: lordHowe.available, blocked: lordHowe.blockedDates },
  leap: { totalNights: leap.totalNights, dates: leap.details.map((d) => d.date) },
}))
`

const MANAGER_ZONES = [
  { zone: 'UTC', jan: 0, jul: 0, apr5: 0, oct4: 0, resolved: ['UTC'] },
  { zone: 'America/Santiago', jan: 180, jul: 240, apr5: 240, oct4: 180, resolved: ['America/Santiago'] },
  { zone: 'Australia/Lord_Howe', jan: -660, jul: -630, apr5: -630, oct4: -660, resolved: ['Australia/Lord_Howe'] },
  { zone: 'Pacific/Kiritimati', jan: -840, jul: -840, apr5: -840, oct4: -840, resolved: ['Pacific/Kiritimati'] },
  { zone: 'Asia/Kathmandu', jan: -345, jul: -345, apr5: -345, oct4: -345, resolved: ['Asia/Kathmandu', 'Asia/Katmandu'] },
]

for (const expectation of MANAGER_ZONES) {
  await test(`checkAvailability evaluates exactly the intended nights in ${expectation.zone}`, async () => {
    const stdout = execFileSync(
      process.execPath,
      ['--input-type=module', '-e', CHILD_SOURCE],
      { env: { ...process.env, TZ: expectation.zone }, encoding: 'utf8' }
    )
    const report = JSON.parse(stdout)

    assert(
      expectation.resolved.includes(report.effectiveZone),
      `effective timezone must be one of ${JSON.stringify(expectation.resolved)}, got ${JSON.stringify(report.effectiveZone)}`
    )
    assertEqual(report.requestedTZ, expectation.zone)
    assertEqual(report.offsets.jan, expectation.jan, `January offset in ${expectation.zone}`)
    assertEqual(report.offsets.jul, expectation.jul, `July offset in ${expectation.zone}`)
    assertEqual(report.offsets.apr5, expectation.apr5, `2026-04-05 offset in ${expectation.zone}`)
    assertEqual(report.offsets.oct4, expectation.oct4, `2026-10-04 offset in ${expectation.zone}`)

    // The two windows the legacy local-time arithmetic got wrong.
    assertEqual(report.santiago.totalNights, 2, `Santiago window night count in ${expectation.zone}`)
    assertDeepEqual(report.santiago.dates, ['2026-04-04', '2026-04-05'], `Santiago window nights in ${expectation.zone}`)
    assertEqual(report.lordHowe.totalNights, 2, `Lord Howe window night count in ${expectation.zone}`)
    assertDeepEqual(report.lordHowe.dates, ['2026-10-03', '2026-10-04'], `Lord Howe window nights in ${expectation.zone}`)

    // A blocked occupied night still rejects, proving the capacity decision works.
    assertEqual(report.santiago.available, false, 'a reserved occupied night must reject the stay')
    assertDeepEqual(report.santiago.blocked, ['2026-04-05'], 'the blocked occupied night must be reported')

    assertDeepEqual(report.leap.dates, ['2028-02-28', '2028-02-29'], `leap day nights in ${expectation.zone}`)

    console.log(`        evidence: TZ=${report.requestedTZ} effective=${report.effectiveZone} offsets(jan/jul/apr5/oct4)=${report.offsets.jan}/${report.offsets.jul}/${report.offsets.apr5}/${report.offsets.oct4}`)
  })
}

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
