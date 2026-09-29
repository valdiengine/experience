/**
 * BOOKING-OCCUPIED-NIGHTS-1A — focused tests for the UTC occupied-night helper.
 *
 * Framework-free, matching capabilities/pricing/pricing.test.js and web/*.test.js.
 * No database, no network, no provisioning, no application bootstrap, no runtime
 * startup, no dependency installation. This file imports only the helper and
 * the availability errors module, so it exercises exactly those two modules.
 * It does not exercise the availability manager, the calendar primitive, the
 * repository layer, or the wider availability graph; the manager read path is
 * covered separately by availability.manager.occupied-nights.test.js.
 *
 * The real module is imported and exercised; nothing is re-implemented here.
 *
 * Timezone coverage runs the REAL module in isolated child processes, one per
 * timezone, with TZ set in the child's environment before the process starts.
 * In-process mutation of process.env.TZ is unreliable on Windows, so it is not
 * used. Each child reports its effective timezone and UTC offsets so a
 * mislabeled run cannot pass unnoticed.
 *
 * Run:  node capabilities/availability/availability.occupied-nights.test.js
 */

import { execFileSync } from 'node:child_process'
import { expandOccupiedNights, OCCUPIED_NIGHTS_EXPANSION_VERSION, OCCUPIED_NIGHTS_MAX_NIGHTS_DEFAULT } from './availability.occupied-nights.js'
import { AvailabilityDateRangeError, AvailabilityError } from './availability.errors.js'

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
  if (a !== b) {
    throw new Error(`${message || 'assertion failed'}: expected ${b}, got ${a}`)
  }
}

/** Asserts a typed AvailabilityDateRangeError is thrown, and returns it. */
function assertThrowsTyped(fn, label) {
  let thrown = null
  try {
    fn()
  } catch (error) {
    thrown = error
  }
  if (thrown === null) throw new Error(`${label}: expected a throw, but nothing was thrown`)
  if (thrown.name !== 'AvailabilityDateRangeError') {
    throw new Error(`${label}: expected AvailabilityDateRangeError, got ${thrown.name}`)
  }
  if (!(thrown instanceof AvailabilityError)) {
    throw new Error(`${label}: expected the error to extend AvailabilityError`)
  }
  if (thrown.code !== 'INVALID_DATE_RANGE') {
    throw new Error(`${label}: expected code INVALID_DATE_RANGE, got ${thrown.code}`)
  }
  if (thrown.statusCode !== 422) {
    throw new Error(`${label}: expected statusCode 422, got ${thrown.statusCode}`)
  }
  return thrown
}

/** Asserts a range is rejected and never yields an empty array. */
function assertRejected(input, label) {
  const error = assertThrowsTyped(() => expandOccupiedNights(input), label)
  return error
}

/**
 * Independent fixture arithmetic used only to build test inputs. Uses Date.UTC,
 * which is safe here because every fixture year is far outside the 0-99
 * remapping range.
 */
function addDaysUtc(iso, days) {
  const date = new Date(Date.UTC(
    Number(iso.slice(0, 4)),
    Number(iso.slice(5, 7)) - 1,
    Number(iso.slice(8, 10))
  ))
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

const HELPER_URL = new URL('./availability.occupied-nights.js', import.meta.url).href

console.log('\nBOOKING-OCCUPIED-NIGHTS-1A — occupied-night helper\n')

// ---------------------------------------------------------------------------
// Exported contract
// ---------------------------------------------------------------------------

await test('exports an explicit expansion version', () => {
  assertEqual(typeof OCCUPIED_NIGHTS_EXPANSION_VERSION, 'number')
  assert(OCCUPIED_NIGHTS_EXPANSION_VERSION >= 1, 'expansion version must be at least 1')
})

await test('exports a technical default bound of 3660 nights', () => {
  assertEqual(OCCUPIED_NIGHTS_MAX_NIGHTS_DEFAULT, 3660)
})

// ---------------------------------------------------------------------------
// Semantics
// ---------------------------------------------------------------------------

await test('includes check-in and excludes checkout', () => {
  assertDeepEqual(
    expandOccupiedNights({ startDate: '2026-05-10', endDate: '2026-05-11' }),
    ['2026-05-10'],
    'one-night stay occupies only the check-in date'
  )
  assertDeepEqual(
    expandOccupiedNights({ startDate: '2026-05-10', endDate: '2026-05-13' }),
    ['2026-05-10', '2026-05-11', '2026-05-12'],
    'three-night stay excludes the checkout date'
  )
})

await test('returns ascending, unique, consecutive dates', () => {
  const dates = expandOccupiedNights({ startDate: '2026-01-28', endDate: '2026-02-04' })
  assertDeepEqual(dates, ['2026-01-28', '2026-01-29', '2026-01-30', '2026-01-31', '2026-02-01', '2026-02-02', '2026-02-03'])
  assertEqual(new Set(dates).size, dates.length, 'dates must be unique')
  for (let i = 1; i < dates.length; i++) {
    assertEqual(addDaysUtc(dates[i - 1], 1), dates[i], `dates must be consecutive at index ${i}`)
  }
})

await test('crosses a year boundary', () => {
  assertDeepEqual(
    expandOccupiedNights({ startDate: '2025-12-30', endDate: '2026-01-02' }),
    ['2025-12-30', '2025-12-31', '2026-01-01'],
    'year rollover must not borrow or drop a night'
  )
})

await test('handles a leap day', () => {
  assertDeepEqual(
    expandOccupiedNights({ startDate: '2028-02-28', endDate: '2028-03-01' }),
    ['2028-02-28', '2028-02-29'],
    'leap day must be occupied'
  )
})

await test('handles a long range without drift', () => {
  const dates = expandOccupiedNights({ startDate: '2026-01-01', endDate: '2026-04-01' })
  assertEqual(dates.length, 90, 'Jan 1 to Apr 1 2026 is 90 nights')
  assertEqual(dates[0], '2026-01-01')
  assertEqual(dates[dates.length - 1], '2026-03-31')
})

// ---------------------------------------------------------------------------
// Supported years
// ---------------------------------------------------------------------------

await test('supports year 0001 and does not remap it into the 20th century', () => {
  assertDeepEqual(
    expandOccupiedNights({ startDate: '0001-01-01', endDate: '0001-01-03' }),
    ['0001-01-01', '0001-01-02'],
    'setUTCFullYear must not remap year 1 the way Date.UTC would'
  )
})

await test('supports years 0099, 0100 and 1900 without remapping', () => {
  assertDeepEqual(expandOccupiedNights({ startDate: '0099-01-01', endDate: '0099-01-02' }), ['0099-01-01'])
  assertDeepEqual(expandOccupiedNights({ startDate: '0100-01-01', endDate: '0100-01-02' }), ['0100-01-01'])
  assertDeepEqual(expandOccupiedNights({ startDate: '1900-01-01', endDate: '1900-01-02' }), ['1900-01-01'])
})

await test('supports year 2000 and a leap year at 2000', () => {
  assertDeepEqual(expandOccupiedNights({ startDate: '2000-02-28', endDate: '2000-03-01' }), ['2000-02-28', '2000-02-29'])
})

await test('supports year 9999 including a range ending 9999-12-31', () => {
  assertDeepEqual(expandOccupiedNights({ startDate: '9999-12-30', endDate: '9999-12-31' }), ['9999-12-30'])
  const dates = expandOccupiedNights({ startDate: '9998-12-30', endDate: '9999-12-31' })
  assertEqual(dates.length, 366, '9998-12-30 to 9999-12-31 spans 366 nights')
  assertEqual(dates[0], '9998-12-30')
  assertEqual(dates[dates.length - 1], '9999-12-30')
})

await test('rejects year 0000', () => {
  assertRejected({ startDate: '0000-01-01', endDate: '0000-01-02' }, 'year 0000 must be rejected')
  assertRejected({ startDate: '2026-01-01', endDate: '0000-01-01' }, 'year 0000 as checkout must be rejected')
})

await test('rejects five-digit years', () => {
  assertRejected({ startDate: '10000-01-01', endDate: '10000-01-02' }, 'five-digit start year must be rejected')
  assertRejected({ startDate: '2026-01-01', endDate: '10000-01-01' }, 'five-digit checkout year must be rejected')
})

// ---------------------------------------------------------------------------
// Invalid input
// ---------------------------------------------------------------------------

await test('rejects missing, null, undefined and non-object input', () => {
  assertRejected(undefined, 'no argument must be rejected')
  assertRejected({}, 'missing bounds must be rejected')
  assertRejected({ startDate: '2026-01-01' }, 'missing endDate must be rejected')
  assertRejected({ endDate: '2026-01-02' }, 'missing startDate must be rejected')
  assertRejected({ startDate: null, endDate: '2026-01-02' }, 'null startDate must be rejected')
  assertRejected({ startDate: '2026-01-01', endDate: undefined }, 'undefined endDate must be rejected')
  assertRejected(null, 'null input object must be rejected')
  assertRejected('2026-01-01', 'string input must be rejected')
  assertRejected([], 'array input must be rejected')
})

await test('rejects non-string bounds', () => {
  assertRejected({ startDate: 20260101, endDate: '2026-01-02' }, 'numeric startDate must be rejected')
  assertRejected({ startDate: '2026-01-01', endDate: 20260102 }, 'numeric endDate must be rejected')
  assertRejected({ startDate: new Date(), endDate: '2026-01-02' }, 'Date object startDate must be rejected')
  assertRejected({ startDate: ['2026-01-01'], endDate: '2026-01-02' }, 'array startDate must be rejected')
  assertRejected({ startDate: true, endDate: '2026-01-02' }, 'boolean startDate must be rejected')
})

await test('rejects empty strings', () => {
  assertRejected({ startDate: '', endDate: '2026-01-02' }, 'empty startDate must be rejected')
  assertRejected({ startDate: '2026-01-01', endDate: '' }, 'empty endDate must be rejected')
})

await test('rejects non-padded dates', () => {
  assertRejected({ startDate: '2026-1-1', endDate: '2026-01-03' }, 'non-padded start must be rejected')
  assertRejected({ startDate: '2026-01-01', endDate: '2026-1-3' }, 'non-padded end must be rejected')
  assertRejected({ startDate: '2026-01-1', endDate: '2026-01-03' }, 'single-digit day must be rejected')
  assertRejected({ startDate: '2026-01', endDate: '2026-01-03' }, 'missing day must be rejected')
})

await test('rejects whitespace and surrounding content', () => {
  assertRejected({ startDate: ' 2026-01-01', endDate: '2026-01-03' }, 'leading space must be rejected')
  assertRejected({ startDate: '2026-01-01 ', endDate: '2026-01-03' }, 'trailing space must be rejected')
  assertRejected({ startDate: '\t2026-01-01', endDate: '2026-01-03' }, 'leading tab must be rejected')
  assertRejected({ startDate: '2026-01-01\n', endDate: '2026-01-03' }, 'trailing newline must be rejected')
})

await test('rejects timestamps and other ISO forms', () => {
  assertRejected({ startDate: '2026-01-01T00:00:00Z', endDate: '2026-01-03' }, 'timestamp start must be rejected')
  assertRejected({ startDate: '2026-01-01', endDate: '2026-01-03T00:00:00.000Z' }, 'timestamp end must be rejected')
  assertRejected({ startDate: '2026-01-01T12:00:00-03:00', endDate: '2026-01-03' }, 'offset timestamp must be rejected')
  assertRejected({ startDate: '20260101', endDate: '20260103' }, 'basic format must be rejected')
  assertRejected({ startDate: '2026/01/01', endDate: '2026/01/03' }, 'slash format must be rejected')
})

await test('rejects garbage and trailing garbage', () => {
  assertRejected({ startDate: 'not-a-date', endDate: '2026-01-03' }, 'garbage start must be rejected')
  assertRejected({ startDate: '2026-01-01', endDate: 'not-a-date' }, 'garbage end must be rejected')
  assertRejected({ startDate: '2026-01-01abc', endDate: '2026-01-03' }, 'trailing garbage must be rejected')
  assertRejected({ startDate: '2026-01-01xx-01-02', endDate: '2026-01-03' }, 'embedded garbage must be rejected')
})

await test('rejects impossible months and days', () => {
  assertRejected({ startDate: '2026-13-01', endDate: '2026-13-02' }, 'month 13 must be rejected')
  assertRejected({ startDate: '2026-00-01', endDate: '2026-01-05' }, 'month 00 must be rejected')
  assertRejected({ startDate: '2026-01-32', endDate: '2026-02-02' }, 'day 32 must be rejected')
  assertRejected({ startDate: '2026-01-00', endDate: '2026-01-05' }, 'day 00 must be rejected')
  assertRejected({ startDate: '2026-02-30', endDate: '2026-03-05' }, 'Feb 30 must be rejected')
  assertRejected({ startDate: '2026-04-31', endDate: '2026-05-05' }, 'Apr 31 must be rejected')
  assertDeepEqual(
    expandOccupiedNights({ startDate: '2026-01-31', endDate: '2026-02-02' }),
    ['2026-01-31', '2026-02-01'],
    'a real month-boundary date must be accepted, not rejected'
  )
})

await test('rejects a non-leap February 29 and accepts a leap one', () => {
  assertRejected({ startDate: '2026-02-29', endDate: '2026-03-02' }, '2026 is not a leap year')
  assertDeepEqual(
    expandOccupiedNights({ startDate: '2024-02-29', endDate: '2024-03-01' }),
    ['2024-02-29'],
    '2024 is a leap year'
  )
  assertRejected({ startDate: '1900-02-29', endDate: '1900-03-02' }, '1900 is not a leap year (century rule)')
  assertDeepEqual(
    expandOccupiedNights({ startDate: '2000-02-29', endDate: '2000-03-01' }),
    ['2000-02-29'],
    '2000 is a leap year (400-year rule)'
  )
})

await test('rejects equal bounds (zero nights)', () => {
  const error = assertRejected({ startDate: '2026-05-10', endDate: '2026-05-10' }, 'equal bounds must be rejected')
  assert(/at least one night/.test(error.message), 'error message must state the one-night requirement')
})

await test('rejects reversed bounds', () => {
  assertRejected({ startDate: '2026-05-12', endDate: '2026-05-10' }, 'reversed bounds must be rejected')
  assertRejected({ startDate: '2026-05-12', endDate: '2026-05-11' }, 'adjacent reversed bounds must be rejected')
})

await test('never returns an empty array', () => {
  for (const input of [
    { startDate: '2026-05-10', endDate: '2026-05-10' },
    { startDate: '2026-05-12', endDate: '2026-05-10' },
    { startDate: '2026-02-30', endDate: '2026-03-01' },
    { startDate: 'not-a-date', endDate: '2026-03-01' },
    { startDate: '2026-01-01' },
  ]) {
    assertThrowsTyped(() => expandOccupiedNights(input), `input ${JSON.stringify(input)} must throw`)
  }
})

// ---------------------------------------------------------------------------
// Resource bound
// ---------------------------------------------------------------------------

await test('enforces the exported default bound before allocating', () => {
  const start = '2016-01-01'
  const exactEnd = addDaysUtc(start, OCCUPIED_NIGHTS_MAX_NIGHTS_DEFAULT)
  const overEnd = addDaysUtc(start, OCCUPIED_NIGHTS_MAX_NIGHTS_DEFAULT + 1)

  const atLimit = expandOccupiedNights({ startDate: start, endDate: exactEnd })
  assertEqual(atLimit.length, OCCUPIED_NIGHTS_MAX_NIGHTS_DEFAULT, 'a range exactly at the default must be accepted')
  assertEqual(atLimit[atLimit.length - 1], addDaysUtc(start, OCCUPIED_NIGHTS_MAX_NIGHTS_DEFAULT - 1))

  const error = assertThrowsTyped(
    () => expandOccupiedNights({ startDate: start, endDate: overEnd }),
    'a range one night over the default must be rejected'
  )
  assertEqual(error.details.nights, OCCUPIED_NIGHTS_MAX_NIGHTS_DEFAULT + 1)
})

await test('honours an overridden bound and its exact boundary', () => {
  const start = '2026-01-01'
  assertEqual(expandOccupiedNights({ startDate: start, endDate: '2026-01-03', maxNights: 2 }).length, 2, 'exactly at the override is accepted')
  assertThrowsTyped(
    () => expandOccupiedNights({ startDate: start, endDate: '2026-01-04', maxNights: 2 }),
    'one night over the override is rejected'
  )
  assertEqual(expandOccupiedNights({ startDate: start, endDate: '2026-01-03', maxNights: 10 }).length, 2, 'a loose override still succeeds')
  assertEqual(expandOccupiedNights({ startDate: start, endDate: '2026-01-02', maxNights: 1 }).length, 1, 'a bound of 1 allows a single night')
})

await test('rejects invalid maxNights values', () => {
  const base = { startDate: '2026-01-01', endDate: '2026-01-03' }
  for (const value of [0, -1, -3660, 1.5, 2.0001, Number.NaN, Infinity, -Infinity,
    Number.MAX_SAFE_INTEGER + 1, Number.MIN_SAFE_INTEGER - 1, '10', null, true, false, {}, [], 3660n]) {
    assertThrowsTyped(
      () => expandOccupiedNights({ ...base, maxNights: value }),
      `maxNights ${String(value)} must be rejected`
    )
  }
  assertEqual(expandOccupiedNights({ ...base, maxNights: Number.MAX_SAFE_INTEGER }).length, 2, 'the largest safe integer is a valid bound')
  assertEqual(expandOccupiedNights({ ...base, maxNights: undefined }).length, 2, 'an explicit undefined selects the default')
})

// ---------------------------------------------------------------------------
// Immutability
// ---------------------------------------------------------------------------

await test('does not mutate the input object', () => {
  const input = Object.freeze({ startDate: '2026-05-10', endDate: '2026-05-13', maxNights: 10 })
  const before = Object.keys(input).sort()
  const dates = expandOccupiedNights(input)
  assertDeepEqual(dates, ['2026-05-10', '2026-05-11', '2026-05-12'])
  assertDeepEqual(Object.keys(input).sort(), before, 'no keys may be added to the input')
  assertEqual(input.startDate, '2026-05-10', 'startDate must be unchanged')
  assertEqual(input.endDate, '2026-05-13', 'endDate must be unchanged')
  assertEqual(input.maxNights, 10, 'maxNights must be unchanged')
})

await test('does not alias or mutate the returned array on a second call', () => {
  const first = expandOccupiedNights({ startDate: '2026-05-10', endDate: '2026-05-13' })
  first[0] = 'mutated'
  const second = expandOccupiedNights({ startDate: '2026-05-10', endDate: '2026-05-13' })
  assertDeepEqual(second, ['2026-05-10', '2026-05-11', '2026-05-12'], 'a fresh array must be returned each call')
})

// ---------------------------------------------------------------------------
// Timezone coverage — real module, isolated child processes
// ---------------------------------------------------------------------------

/**
 * Expected UTC offsets in minutes (Date.getTimezoneOffset: UTC - local), measured
 * on this platform for 2026. A child whose effective timezone is not the
 * requested one cannot match these, which is what prevents a mislabeled run
 * from passing.
 */
const ZONE_EXPECTATIONS = [
  { zone: 'UTC', jan: 0, jul: 0, apr5: 0, oct4: 0, resolved: ['UTC'] },
  { zone: 'America/Santiago', jan: 180, jul: 240, apr5: 240, oct4: 180, resolved: ['America/Santiago'] },
  { zone: 'Australia/Lord_Howe', jan: -660, jul: -630, apr5: -630, oct4: -660, resolved: ['Australia/Lord_Howe'] },
  { zone: 'Pacific/Kiritimati', jan: -840, jul: -840, apr5: -840, oct4: -840, resolved: ['Pacific/Kiritimati'] },
  // ICU canonicalises this zone to the historical spelling "Asia/Katmandu".
  { zone: 'Asia/Kathmandu', jan: -345, jul: -345, apr5: -345, oct4: -345, resolved: ['Asia/Kathmandu', 'Asia/Katmandu'] },
]

const CHILD_SOURCE = `
import { expandOccupiedNights, OCCUPIED_NIGHTS_EXPANSION_VERSION, OCCUPIED_NIGHTS_MAX_NIGHTS_DEFAULT } from ${JSON.stringify(HELPER_URL)}
const offset = (iso) => new Date(iso).getTimezoneOffset()
const out = {
  requestedTZ: process.env.TZ ?? null,
  effectiveZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  offsets: {
    jan: offset('2026-01-15T12:00:00Z'),
    jul: offset('2026-07-15T12:00:00Z'),
    apr5: offset('2026-04-05T12:00:00Z'),
    oct4: offset('2026-10-04T12:00:00Z'),
  },
  version: OCCUPIED_NIGHTS_EXPANSION_VERSION,
  defaultMaxNights: OCCUPIED_NIGHTS_MAX_NIGHTS_DEFAULT,
  santiagoWindow: expandOccupiedNights({ startDate: '2026-04-04', endDate: '2026-04-06' }),
  lordHoweWindow: expandOccupiedNights({ startDate: '2026-10-03', endDate: '2026-10-05' }),
  yearBoundary: expandOccupiedNights({ startDate: '2025-12-30', endDate: '2026-01-02' }),
  leapDay: expandOccupiedNights({ startDate: '2028-02-28', endDate: '2028-03-01' }),
  oneNight: expandOccupiedNights({ startDate: '2026-05-10', endDate: '2026-05-11' }),
  rejected: (() => {
    try { expandOccupiedNights({ startDate: '2026-05-10', endDate: '2026-05-10' }); return null }
    catch (error) { return error.name }
  })(),
}
process.stdout.write(JSON.stringify(out))
`

for (const expectation of ZONE_EXPECTATIONS) {
  await test(`occupied nights are UTC-correct in ${expectation.zone}`, () => {
    const stdout = execFileSync(
      process.execPath,
      ['--input-type=module', '-e', CHILD_SOURCE],
      { env: { ...process.env, TZ: expectation.zone }, encoding: 'utf8' }
    )
    const report = JSON.parse(stdout)

    // Anti-mislabel evidence: the child must have honoured the requested zone.
    assert(
      expectation.resolved.includes(report.effectiveZone),
      `effective timezone must be one of ${JSON.stringify(expectation.resolved)}, got ${JSON.stringify(report.effectiveZone)}`
    )
    assertEqual(report.requestedTZ, expectation.zone, 'child must receive the requested TZ')
    assertEqual(report.offsets.jan, expectation.jan, `January offset in ${expectation.zone}`)
    assertEqual(report.offsets.jul, expectation.jul, `July offset in ${expectation.zone}`)
    assertEqual(report.offsets.apr5, expectation.apr5, `2026-04-05 offset in ${expectation.zone}`)
    assertEqual(report.offsets.oct4, expectation.oct4, `2026-10-04 offset in ${expectation.zone}`)

    // The DST windows that the legacy local-time arithmetic got wrong.
    assertDeepEqual(
      report.santiagoWindow,
      ['2026-04-04', '2026-04-05'],
      `2026-04-04 to 2026-04-06 in ${expectation.zone}`
    )
    assertDeepEqual(
      report.lordHoweWindow,
      ['2026-10-03', '2026-10-04'],
      `2026-10-03 to 2026-10-05 in ${expectation.zone}`
    )

    assertDeepEqual(report.yearBoundary, ['2025-12-30', '2025-12-31', '2026-01-01'], `year boundary in ${expectation.zone}`)
    assertDeepEqual(report.leapDay, ['2028-02-28', '2028-02-29'], `leap day in ${expectation.zone}`)
    assertDeepEqual(report.oneNight, ['2026-05-10'], `one night in ${expectation.zone}`)
    assertEqual(report.rejected, 'AvailabilityDateRangeError', `equal bounds must be rejected in ${expectation.zone}`)
    assertEqual(report.version, OCCUPIED_NIGHTS_EXPANSION_VERSION, 'version must match the parent process')
    assertEqual(report.defaultMaxNights, OCCUPIED_NIGHTS_MAX_NIGHTS_DEFAULT, 'default bound must match the parent process')

    console.log(`        evidence: TZ=${report.requestedTZ} effective=${report.effectiveZone} offsets(jan/jul/apr5/oct4)=${report.offsets.jan}/${report.offsets.jul}/${report.offsets.apr5}/${report.offsets.oct4}`)
  })
}

// ---------------------------------------------------------------------------
// Layer isolation
// ---------------------------------------------------------------------------

await test('the helper imports no DB, network or startup surface', async () => {
  const { readFileSync } = await import('fs')
  const source = readFileSync(new URL('./availability.occupied-nights.js', import.meta.url), 'utf8')
  for (const needle of ['postgres', 'database/', "from 'pg'", 'fetch(', 'http', 'fs.', 'capability.bootstrap', 'application.start', 'AvailabilityCalendar']) {
    assert(!source.includes(needle), `availability.occupied-nights.js must not reference ${needle}`)
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
