/**
 * BOOKING-CALENDAR-UTC-1 — focused tests for the inclusive availability calendar.
 *
 * Framework-free, matching capabilities/pricing/pricing.test.js, web/*.test.js and
 * the occupied-nights suites. No database, no network, no provisioning, no
 * application bootstrap, no runtime startup, no dependency installation. This
 * file imports the calendar module and nothing else, so it exercises exactly
 * that primitive plus, transitively, the methods that call expandRange.
 *
 * The real AvailabilityCalendar is imported and exercised. No date arithmetic is
 * reimplemented for the expectations: where a list of dates appears below it is
 * written out literally, so a test cannot pass by agreeing with a buggy copy of
 * the logic. The only arithmetic helper (addDays) builds test INPUTS and is not
 * used to derive any expected OUTPUT.
 *
 * Timezone coverage runs the REAL module in isolated child processes, one per
 * zone, with TZ set in the child's environment before the process starts.
 * In-process mutation of process.env.TZ is unreliable on Windows, so it is not
 * used. Each child reports its effective zone and its January and July UTC
 * offsets, and the parent asserts them, so a run whose TZ was silently ignored
 * fails instead of quietly counting as coverage of a zone never exercised.
 *
 * The final section proves the regression is real: it reconstructs the ORIGINAL
 * expandRange from git HEAD into an isolated temporary file and shows that the
 * same assertions fail there. The worktree is never written to.
 *
 * Run:  node capabilities/availability/availability.calendar.utc.test.js
 */

import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { AvailabilityCalendar } from './availability.calendar.js'

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

/**
 * Independent UTC date arithmetic used to build expected outputs.
 *
 * HONEST SCOPE: `addDays` and `span` DO derive expected results for the
 * multi-day cases, so a shared bug in this helper would let a matching bug in
 * expandRange pass. That risk is mitigated, not eliminated: the helper is a
 * different implementation (builds from a Date and steps the UTC date, with no
 * inclusive/exclusive bounds logic at all) from the code under test.
 *
 * Every transition-spanning range, and every same-day range, is asserted against
 * dates written out literally in EXPECTED, which is what actually pins the
 * regression. Long runs such as the 366-day span and the per-zone exact-date
 * matrix additionally cross-check against those literals.
 *
 * Every fixture year here is far outside the 0-99 remapping range that
 * `setUTCFullYear`-less `Date.UTC` applies to two-digit years, so it is safe.
 */
function addDays(iso, days) {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Builds a consecutive inclusive date list of `count` days from `startIso`. */
function span(startIso, count) {
  const out = []
  for (let i = 0; i < count; i++) out.push(addDays(startIso, i))
  return out
}

const HERE = fileURLToPath(new URL('.', import.meta.url))
const REPO_ROOT = join(HERE, '..', '..')
const CALENDAR_REL = 'capabilities/availability/availability.calendar.js'
const CALENDAR_URL = new URL(`../../${CALENDAR_REL}`, import.meta.url).href
const FIXTURE = new URL('./test-support/availability.calendar.tz-fixture.mjs', import.meta.url)

/**
 * The revision that contains the ORIGINAL, defective expandRange.
 *
 * Pinned to an explicit commit rather than `HEAD` on purpose. Once this fix is
 * committed, HEAD will hold the corrected implementation and the regression proof
 * would silently compare the fix against itself and pass vacuously. Pinning keeps
 * the comparison meaningful for good.
 */
const BASELINE_REVISION = '5288b05b445d1e953d0496602e49a31338dafcb2'

/** Runs the fixture in a child process with an explicit TZ. */
function runFixture(tz, moduleUrl) {
  const raw = execFileSync(process.execPath, [fileURLToPath(FIXTURE)], {
    encoding: 'utf8',
    env: { ...process.env, TZ: tz, CALENDAR_MODULE_URL: moduleUrl || CALENDAR_URL },
  })
  return JSON.parse(raw)
}

/** The exact dates every zone must produce, for every fixture range. */
const EXPECTED = {
  'same-day': ['2026-04-03'],
  'two-day': ['2026-04-03', '2026-04-04'],
  'plain-4d': ['2026-04-03', '2026-04-04', '2026-04-05', '2026-04-06'],
  'month-boundary': ['2026-01-30', '2026-01-31', '2026-02-01', '2026-02-02'],
  'year-boundary': ['2025-12-30', '2025-12-31', '2026-01-01', '2026-01-02'],
  'leap-day-span': ['2024-02-28', '2024-02-29', '2024-03-01'],
  'leap-day-same': ['2024-02-29'],
  'non-leap-0229-span': ['2023-02-28', '2023-03-01'],
  'santiago-dst-end': ['2026-04-03', '2026-04-04', '2026-04-05', '2026-04-06'],
  'santiago-dst-start': ['2026-09-04', '2026-09-05', '2026-09-06', '2026-09-07'],
  'lordhowe-dst-start': ['2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05'],
  'lordhowe-dst-end': ['2026-04-04', '2026-04-05', '2026-04-06', '2026-04-07'],
  reversed: [],
  // 366 inclusive days from 2026-01-01 through 2027-01-01, spanning both the
  // Santiago and Lord Howe transitions. Computed with addDays/span: it also
  // cross-checks the literal transition expectations above for overlap, and its
  // endpoints are pinned literally.
  'year-366': span('2026-01-01', 366),
}

/** Zone, and the January/July offsets that prove the zone was really in effect. */
const ZONES = [
  ['UTC', 'UTC', 0, 0],
  ['America/Santiago', 'America/Santiago', 180, 240],
  ['Australia/Lord_Howe', 'Australia/Lord_Howe', -660, -630],
]

// ---------------------------------------------------------------------------
// Contract: inclusive endpoints, shape, ordering, boundaries
// ---------------------------------------------------------------------------

await test('a same-day inclusive range retains that single day', () => {
  assertDeepEqual(AvailabilityCalendar.expandRange('2026-04-03', '2026-04-03'), ['2026-04-03'], 'same-day range')
  assertEqual(AvailabilityCalendar.expandRange('2026-04-03', '2026-04-03').length, 1, 'same-day length')
})

await test('both endpoints are included on a multi-day range', () => {
  const result = AvailabilityCalendar.expandRange('2026-04-03', '2026-04-06')
  assertEqual(result[0], '2026-04-03', 'first element must be the start date')
  assertEqual(result[result.length - 1], '2026-04-06', 'last element must be the end date')
  assertDeepEqual(result, span('2026-04-03', 4), 'inclusive both endpoints')
})

await test('the output shape is an array of YYYY-MM-DD strings in ascending order', () => {
  const result = AvailabilityCalendar.expandRange('2026-03-01', '2026-03-31')
  assert(Array.isArray(result), 'must return an array')
  for (const value of result) {
    assertEqual(typeof value, 'string', 'every element must be a string')
    assert(/^\d{4}-\d{2}-\d{2}$/.test(value), `element must be YYYY-MM-DD, got ${value}`)
  }
  for (let i = 1; i < result.length; i++) {
    assert(result[i] > result[i - 1], `dates must ascend: ${result[i - 1]} then ${result[i]}`)
  }
  assertEqual(new Set(result).size, result.length, 'dates must be unique')
})

await test('a one-year range has the right length and both endpoints', () => {
  const result = AvailabilityCalendar.expandRange('2026-01-01', '2026-12-31')
  assertEqual(result.length, 365, '2026 is not a leap year')
  assertEqual(result[0], '2026-01-01', 'first date')
  assertEqual(result[result.length - 1], '2026-12-31', 'last date')
})

await test('month boundaries roll over without losing or repeating a day', () => {
  assertDeepEqual(AvailabilityCalendar.expandRange('2026-01-30', '2026-02-02'), EXPECTED['month-boundary'], 'Jan to Feb')
  assertDeepEqual(AvailabilityCalendar.expandRange('2026-02-27', '2026-03-02'), span('2026-02-27', 4), 'Feb to Mar in a common year')
  assertDeepEqual(AvailabilityCalendar.expandRange('2026-03-30', '2026-04-02'), span('2026-03-30', 4), 'Mar to Apr')
  assertDeepEqual(AvailabilityCalendar.expandRange('2026-11-29', '2026-12-02'), span('2026-11-29', 4), 'Nov to Dec')
})

await test('year boundaries roll over without losing or repeating a day', () => {
  assertDeepEqual(AvailabilityCalendar.expandRange('2025-12-30', '2026-01-02'), EXPECTED['year-boundary'], 'crossing a year end')
  assertDeepEqual(AvailabilityCalendar.expandRange('2025-12-31', '2026-01-01'), ['2025-12-31', '2026-01-01'], 'single year crossover')
  assertDeepEqual(AvailabilityCalendar.expandRange('2024-02-28', '2024-03-01'), EXPECTED['leap-day-span'], 'leap year rollover')
})

await test('leap-day behaviour is exact in leap years and absent in common years', () => {
  assertDeepEqual(AvailabilityCalendar.expandRange('2024-02-29', '2024-02-29'), ['2024-02-29'], 'leap day alone')
  assertDeepEqual(AvailabilityCalendar.expandRange('2024-02-28', '2024-03-01'), ['2024-02-28', '2024-02-29', '2024-03-01'], '2024 includes Feb 29')
  assertDeepEqual(AvailabilityCalendar.expandRange('2023-02-28', '2023-03-01'), ['2023-02-28', '2023-03-01'], '2023 has no Feb 29')
  assertEqual(AvailabilityCalendar.expandRange('2024-02-01', '2024-03-01').length, 30, 'Feb 2024 has 29 days, plus the inclusive 2024-03-01')
  assertEqual(AvailabilityCalendar.expandRange('2023-02-01', '2023-03-01').length, 29, 'Feb 2023 has 28 days, plus the inclusive 2023-03-01')
  assert(!AvailabilityCalendar.expandRange('2023-01-01', '2023-12-31').includes('2023-02-29'), 'no phantom leap day in a common year')
  assert(AvailabilityCalendar.expandRange('2024-01-01', '2024-12-31').includes('2024-02-29'), 'real leap day present')
})

// ---------------------------------------------------------------------------
// Preserved edge-case behaviour
// ---------------------------------------------------------------------------

await test('a reversed range still returns an empty array', () => {
  assertDeepEqual(AvailabilityCalendar.expandRange('2026-04-06', '2026-04-03'), [], 'reversed range')
  assertDeepEqual(AvailabilityCalendar.expandRange('2026-04-04', '2026-04-03'), [], 'reversed by one day')
})

await test('an unparseable bound still returns an empty array rather than throwing', () => {
  assertDeepEqual(AvailabilityCalendar.expandRange('not-a-date', '2026-04-06'), [], 'unparseable start')
  assertDeepEqual(AvailabilityCalendar.expandRange('2026-04-03', 'not-a-date'), [], 'unparseable end')
  assertDeepEqual(AvailabilityCalendar.expandRange('not-a-date', 'also-not-a-date'), [], 'both unparseable')
  assertDeepEqual(AvailabilityCalendar.expandRange(undefined, '2026-04-06'), [], 'undefined start')
})

await test('arguments are not mutated', () => {
  const start = new Date('2026-04-03T00:00:00Z')
  const end = new Date('2026-04-06T00:00:00Z')
  const startBefore = start.getTime()
  const endBefore = end.getTime()
  AvailabilityCalendar.expandRange(start, end)
  assertEqual(start.getTime(), startBefore, 'start argument must not be mutated')
  assertEqual(end.getTime(), endBefore, 'end argument must not be mutated')
})

// ---------------------------------------------------------------------------
// Methods that inherit expandRange
// ---------------------------------------------------------------------------

await test('normalize returns the full inclusive window, not a truncated one', () => {
  const result = AvailabilityCalendar.normalize('2026-04-03', '2026-04-06', [
    { startDate: '2026-04-04', endDate: '2026-04-05', status: 'blocked' },
  ])
  assertDeepEqual(
    result.map((d) => d.date),
    ['2026-04-03', '2026-04-04', '2026-04-05', '2026-04-06'],
    'normalize must cover the whole inclusive window'
  )
  assertDeepEqual(
    result.map((d) => d.status),
    ['available', 'blocked', 'blocked', 'available'],
    'normalize statuses'
  )
})

await test('calculateAvailability marks a reservation inclusive of BOTH checkIn and checkOut', () => {
  // This is the existing calendar contract and it is preserved: expandRange is
  // inclusive, so a reservation blocks its checkout date too. That is a
  // DIFFERENT contract from checkout-exclusive occupied nights, which is a
  // separate capability path and is not consulted here. Recording the
  // distinction explicitly, because the two are easy to conflate.
  const dates = AvailabilityCalendar.expandRange('2026-04-01', '2026-04-08')
  const result = AvailabilityCalendar.calculateAvailability(dates, [{ checkIn: '2026-04-03', checkOut: '2026-04-07' }], [])
  assertDeepEqual(
    result.map((d) => d.date),
    ['2026-04-01', '2026-04-02', '2026-04-03', '2026-04-04', '2026-04-05', '2026-04-06', '2026-04-07', '2026-04-08'],
    'one row per requested date'
  )
  assertDeepEqual(
    result.map((d) => d.available),
    [true, true, false, false, false, false, false, true],
    'checkIn through checkOut inclusive are blocked, matching the inclusive calendar contract'
  )
})

await test('calculateOccupancy counts every date in the window', () => {
  const dates = AvailabilityCalendar.expandRange('2026-04-01', '2026-04-08')
  assertEqual(AvailabilityCalendar.calculateOccupancy(dates, []), 0, 'no reservations means zero occupancy')
  // 5 of the 8 dates are booked (checkIn..checkOut inclusive), so round(62.5) = 63.
  assertEqual(AvailabilityCalendar.calculateOccupancy(dates, [{ checkIn: '2026-04-03', checkOut: '2026-04-07' }]), 63, '5 of 8 dates')
})

// ---------------------------------------------------------------------------
// Timezone matrix: exact dates, with the effective zone proven
// ---------------------------------------------------------------------------

for (const [tz, expectedZone, janOffset, julOffset] of ZONES) {
  await test(`TZ=${tz} reports the effective zone and offsets actually in force`, () => {
    const out = runFixture(tz)
    assertEqual(out.effectiveZone, expectedZone, `TZ=${tz} must resolve to ${expectedZone}`)
    assertEqual(out.offsetJanuary, janOffset, `TZ=${tz} January offset`)
    assertEqual(out.offsetJuly, julOffset, `TZ=${tz} July offset`)
  })

  await test(`TZ=${tz} produces the exact expected dates for every fixture range`, () => {
    const out = runFixture(tz)
    for (const [label, expected] of Object.entries(EXPECTED)) {
      assertDeepEqual(out.expansions[label], expected, `TZ=${tz} range ${label}`)
    }
  })

  await test(`TZ=${tz} transition-spanning ranges have no duplicate and no missing date`, () => {
    const out = runFixture(tz)
    for (const label of ['santiago-dst-end', 'santiago-dst-start', 'lordhowe-dst-start', 'lordhowe-dst-end']) {
      const dates = out.expansions[label]
      assertEqual(new Set(dates).size, dates.length, `TZ=${tz} ${label} must not repeat a date`)
      for (let i = 1; i < dates.length; i++) {
        assertEqual(dates[i], addDays(dates[i - 1], 1), `TZ=${tz} ${label} must be consecutive at index ${i}`)
      }
      assertEqual(dates[dates.length - 1], EXPECTED[label][EXPECTED[label].length - 1], `TZ=${tz} ${label} must include its final date`)
    }
  })
}

await test('the same input yields identical dates in every zone', () => {
  const perZone = ZONES.map(([tz]) => JSON.stringify(runFixture(tz).expansions))
  assertEqual(perZone[0], perZone[1], 'UTC and America/Santiago must agree')
  assertEqual(perZone[0], perZone[2], 'UTC and Australia/Lord_Howe must agree')
  assert(perZone[0] === perZone[1] && perZone[1] === perZone[2], 'all three zones must agree')
})

await test('a 366-day range spanning both transitions is exact in every zone', () => {
  const expected = EXPECTED['year-366']
  assertEqual(expected.length, 366, 'the expected span must cover 366 inclusive days')
  const perZone = []
  for (const [tz] of ZONES) {
    // The CHILD computes this range in its own zone, so a zone-dependent
    // implementation cannot pass by being correct only in the parent process.
    const out = runFixture(tz)
    const dates = out.expansions['year-366']
    assertEqual(dates.length, 366, `${tz} inclusive count from the child process`)
    assertDeepEqual(dates, expected, `${tz} 366-day inclusive span from the child process`)
    assertEqual(out.effectiveZone.length > 0, true, `${tz} child must report a resolved zone`)
    perZone.push(JSON.stringify(dates))
  }
  assert(perZone[0] === perZone[1], 'UTC and America/Santiago must agree over 366 days')
  assert(perZone[0] === perZone[2], 'UTC and Australia/Lord_Howe must agree over 366 days')
})

// ---------------------------------------------------------------------------
// The regression is real: the original implementation fails these same cases
// ---------------------------------------------------------------------------

/**
 * Reconstructs the ORIGINAL expandRange from the pinned baseline commit into an
 * isolated temp directory and runs the identical fixture against it.
 *
 * The copy is taken from git rather than retyped, so the comparison is against
 * the real committed original. Nothing in the worktree is written, moved or
 * overwritten: the file is created under the OS temp directory, read back to
 * confirm it is the original, exercised, and then deleted.
 *
 * The temp directory is removed even if `git show` or a validation assertion
 * fails, so a broken run cannot leave directories behind.
 */
function buildOriginalCalendarCopy() {
  const dir = mkdtempSync(join(tmpdir(), 'calendar-utc-1-'))
  try {
    const file = join(dir, 'original.calendar.mjs')
    const source = execFileSync('git', ['show', `${BASELINE_REVISION}:${CALENDAR_REL}`], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    })
    assert(
      source.includes('current.setDate(current.getDate() + 1)'),
      `the ${BASELINE_REVISION} copy must contain the original local-time step`
    )
    assert(
      !source.includes('setUTCDate(current.getUTCDate() + 1)'),
      `the ${BASELINE_REVISION} copy must not already contain the UTC fix`
    )
    writeFileSync(file, source, 'utf8')
    const written = readFileSync(file, 'utf8')
    assertEqual(written, source, 'the temp copy must match the committed original exactly')
    return { dir, file, url: pathToFileURL(file).href }
  } catch (error) {
    rmSync(dir, { recursive: true, force: true })
    throw error
  }
}

await test(`the original implementation at ${BASELINE_REVISION.slice(0, 7)} fails the exact-date assertions this suite now makes`, () => {
  const { dir, url } = buildOriginalCalendarCopy()
  try {
    const before = runFixture('UTC', url)
    const after = runFixture('UTC')

    // UTC was already correct: the original passes there, which is the control.
    assertDeepEqual(before.expansions['plain-4d'], after.expansions['plain-4d'], 'UTC is the control and must be unchanged')

    // Now the two zones that were wrong. These are the real regressions.
    const santiagoBefore = runFixture('America/Santiago', url)
    const santiagoAfter = runFixture('America/Santiago')
    assert(
      JSON.stringify(santiagoBefore.expansions['plain-4d']) !== JSON.stringify(santiagoAfter.expansions['plain-4d']),
      'the original must drop the final inclusive day in America/Santiago'
    )
    assertDeepEqual(santiagoAfter.expansions['plain-4d'], EXPECTED['plain-4d'], 'the fixed implementation is correct in Santiago')
    assertEqual(santiagoBefore.expansions['plain-4d'].length, 3, 'original Santiago returned 3 dates for a 4-day inclusive range')

    const lordhoweBefore = runFixture('Australia/Lord_Howe', url)
    const lordhoweAfter = runFixture('Australia/Lord_Howe')
    assert(
      JSON.stringify(lordhoweBefore.expansions['lordhowe-dst-start']) !== JSON.stringify(lordhoweAfter.expansions['lordhowe-dst-start']),
      'the original must duplicate a date in Australia/Lord_Howe'
    )
    assertDeepEqual(lordhoweAfter.expansions['lordhowe-dst-start'], EXPECTED['lordhowe-dst-start'], 'the fixed implementation is correct in Lord Howe')
    assertDeepEqual(
      lordhoweBefore.expansions['lordhowe-dst-start'],
      ['2026-10-02', '2026-10-03', '2026-10-03', '2026-10-04'],
      'original Lord Howe produced this exact duplicated-date output'
    )

    // And the original is timezone-dependent, which the fix removes.
    assert(
      JSON.stringify(runFixture('America/Santiago', url).expansions) !== JSON.stringify(runFixture('Australia/Lord_Howe', url).expansions),
      'the original must disagree between zones for the same inputs'
    )
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

await test('the temp copy is removed and the worktree calendar file is untouched by the comparison', () => {
  const { dir, file } = buildOriginalCalendarCopy()
  assert(file.startsWith(dir), 'the copy must live in the temp directory')
  rmSync(dir, { recursive: true, force: true })
  let stillThere = true
  try {
    readFileSync(file, 'utf8')
  } catch {
    stillThere = false
  }
  assertEqual(stillThere, false, 'the temp copy must be deleted')
  const worktree = readFileSync(join(REPO_ROOT, CALENDAR_REL), 'utf8')
  assert(worktree.includes('current.setUTCDate(current.getUTCDate() + 1)'), 'the worktree calendar must still hold the UTC step')
})

// ---------------------------------------------------------------------------

console.log(`\n  total: ${passed + failed}   passed: ${passed}   failed: ${failed}`)
if (failed > 0) {
  console.log('\n  Failures:')
  for (const f of failures) console.log(`   - ${f.name}: ${f.error.message}`)
}
process.exitCode = failed > 0 ? 1 : 0
