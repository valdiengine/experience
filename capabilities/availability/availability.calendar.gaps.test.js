/**
 * BOOKING-CALENDAR-GAPS-1 — focused tests for detectGaps and splitRange.
 *
 * Framework-free, matching availability.calendar.utc.test.js. No database, no
 * network, no application bootstrap, no dependency installation. This file
 * imports the real AvailabilityCalendar and nothing else.
 *
 * Both methods compute an inclusive span and then step one civil day from a UTC
 * midnight to find its other bound, so both are sensitive to the same defect
 * class: mixing a local-time setDate() into a UTC sequence. A daylight-saving
 * transition inside the span makes the local step drift by a day, and the
 * returned span silently loses (or gains) a day.
 *
 * Timezone coverage runs the REAL module in child processes, one per zone, with
 * TZ set in the child's environment before the process starts. In-process
 * mutation of process.env.TZ is unreliable on Windows, so it is not used. Each
 * child reports its effective zone and its January and July UTC offsets, and the
 * parent asserts them, so a silently-ignored TZ fails instead of quietly
 * counting as coverage of a zone never exercised.
 *
 * The regression section reconstructs the ORIGINAL detectGaps and splitRange
 * from a pinned baseline commit into an isolated temp directory and shows the
 * same assertions fail there. The worktree is never written to and HEAD is never
 * moved.
 *
 * Run:  node capabilities/availability/availability.calendar.gaps.test.js
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

const HERE = fileURLToPath(new URL('.', import.meta.url))
const REPO_ROOT = join(HERE, '..', '..')
const CALENDAR_REL = 'capabilities/availability/availability.calendar.js'
const CALENDAR_URL = new URL(`../../${CALENDAR_REL}`, import.meta.url).href
const FIXTURE = new URL('./test-support/availability.calendar.tz-fixture.mjs', import.meta.url)

/**
 * The revision that contains the ORIGINAL, local-time detectGaps/splitRange.
 *
 * Pinned to an explicit commit rather than `HEAD` on purpose. Once this fix is
 * committed, HEAD will hold the corrected implementation and the regression
 * proof would silently compare the fix against itself and pass vacuously.
 */
const BASELINE_REVISION = '97b9958af8726f59130357ad2a9271fea4443353'

/** Runs the shared fixture in a child process with an explicit TZ. */
function runFixture(tz, moduleUrl) {
  const raw = execFileSync(process.execPath, [fileURLToPath(FIXTURE)], {
    encoding: 'utf8',
    env: { ...process.env, TZ: tz, CALENDAR_MODULE_URL: moduleUrl || CALENDAR_URL },
  })
  return JSON.parse(raw)
}

/**
 * Exact detectGaps output for every fixture, as literal objects. These are the
 * values the corrected implementation must produce in EVERY zone.
 */
const EXPECTED_GAPS = {
  'gap-empty': [],
  'gap-single': [],
  'gap-adjacent': [],
  'gap-overlapping': [],
  'gap-one-day': [{ start: '2026-01-06', end: '2026-01-06', days: 1 }],
  'gap-multi-day': [{ start: '2026-01-06', end: '2026-01-07', days: 2 }],
  'gap-month-boundary': [{ start: '2026-02-01', end: '2026-02-02', days: 2 }],
  'gap-year-boundary': [{ start: '2026-01-01', end: '2026-01-02', days: 2 }],
  'gap-leap-day': [{ start: '2024-02-29', end: '2024-02-29', days: 1 }],
  // The reported defect: a one-day gap after the Lord Howe October transition.
  'gap-lordhowe-dst-start': [{ start: '2026-10-04', end: '2026-10-04', days: 1 }],
  'gap-lordhowe-dst-end': [{ start: '2026-04-04', end: '2026-04-04', days: 1 }],
  'gap-santiago-dst-start': [{ start: '2026-09-07', end: '2026-09-07', days: 1 }],
  'gap-santiago-dst-end': [{ start: '2026-04-05', end: '2026-04-05', days: 1 }],
  'gap-across-lordhowe-dst-start': [{ start: '2026-10-02', end: '2026-10-05', days: 4 }],
  'gap-lordhowe-dst-start-next-year': [{ start: '2027-10-03', end: '2027-10-03', days: 1 }],
  'gap-santiago-dst-start-next-year': [{ start: '2027-09-06', end: '2027-09-06', days: 1 }],
  'gap-three-ranges': [
    { start: '2026-01-06', end: '2026-01-07', days: 2 },
    { start: '2026-01-11', end: '2026-01-14', days: 4 },
  ],
}

/** Exact splitRange output for every fixture, as literal objects. */
const EXPECTED_SPLITS = {
  'split-none': [{ start: '2026-01-01', end: '2026-01-10' }],
  'split-plain': [
    { start: '2026-01-01', end: '2026-01-04' },
    { start: '2026-01-05', end: '2026-01-10' },
  ],
  'split-two': [
    { start: '2026-01-01', end: '2026-01-03' },
    { start: '2026-01-04', end: '2026-01-06' },
    { start: '2026-01-07', end: '2026-01-10' },
  ],
  'split-at-start': [{ start: '2026-01-05', end: '2026-01-10' }],
  'split-at-end': [
    { start: '2026-01-01', end: '2026-01-04' },
    { start: '2026-01-05', end: '2026-01-05' },
  ],
  'split-beyond-end': [{ start: '2026-01-01', end: '2026-01-05' }],
  'split-unsorted': [
    { start: '2026-01-01', end: '2026-01-03' },
    { start: '2026-01-04', end: '2026-01-06' },
    { start: '2026-01-07', end: '2026-01-10' },
  ],
  'split-month-boundary': [
    { start: '2026-01-28', end: '2026-01-31' },
    { start: '2026-02-01', end: '2026-02-03' },
  ],
  'split-year-boundary': [
    { start: '2025-12-29', end: '2025-12-31' },
    { start: '2026-01-01', end: '2026-01-03' },
  ],
  'split-leap-day': [
    { start: '2024-02-26', end: '2024-02-28' },
    { start: '2024-02-29', end: '2024-03-02' },
  ],
  'split-common-feb-29-absent': [
    { start: '2023-02-26', end: '2023-02-28' },
    { start: '2023-03-01', end: '2023-03-02' },
  ],
  // The demonstrated splitRange defect: the first segment lost 2026-04-04.
  'split-lordhowe-dst-end': [
    { start: '2026-04-01', end: '2026-04-04' },
    { start: '2026-04-05', end: '2026-04-07' },
  ],
  'split-lordhowe-dst-end-next-year': [
    { start: '2027-04-01', end: '2027-04-03' },
    { start: '2027-04-04', end: '2027-04-07' },
  ],
  'split-santiago-dst-end': [
    { start: '2026-04-01', end: '2026-04-05' },
    { start: '2026-04-06', end: '2026-04-07' },
  ],
  'split-santiago-dst-end-next-year': [
    { start: '2027-04-01', end: '2027-04-04' },
    { start: '2027-04-05', end: '2027-04-07' },
  ],
  // Controls: identical in every zone, before and after the fix.
  'split-lordhowe-dst-start-control': [
    { start: '2026-10-01', end: '2026-10-03' },
    { start: '2026-10-04', end: '2026-10-07' },
  ],
  'split-santiago-dst-start-control': [
    { start: '2026-09-03', end: '2026-09-05' },
    { start: '2026-09-06', end: '2026-09-09' },
  ],
}

/** Zone, and the January/July offsets that prove the zone was really in force. */
const ZONES = [
  ['UTC', 'UTC', 0, 0],
  ['America/Santiago', 'America/Santiago', 180, 240],
  ['Australia/Lord_Howe', 'Australia/Lord_Howe', -660, -630],
]

// ---------------------------------------------------------------------------
// detectGaps: preserved contract, no timezone involved
// ---------------------------------------------------------------------------

await test('detectGaps returns an empty array for fewer than two ranges', () => {
  assertDeepEqual(AvailabilityCalendar.detectGaps([]), [], 'empty input')
  assertDeepEqual(
    AvailabilityCalendar.detectGaps([{ start: '2026-01-01', end: '2026-01-05' }]),
    [],
    'a single range has no pair, so no gap'
  )
})

await test('detectGaps emits no gap for adjacent or overlapping ranges', () => {
  assertDeepEqual(
    AvailabilityCalendar.detectGaps([
      { start: '2026-01-01', end: '2026-01-05' },
      { start: '2026-01-06', end: '2026-01-10' },
    ]),
    [],
    'consecutive ranges leave no gap'
  )
  assertDeepEqual(
    AvailabilityCalendar.detectGaps([
      { start: '2026-01-01', end: '2026-01-08' },
      { start: '2026-01-05', end: '2026-01-10' },
    ]),
    [],
    'overlapping ranges leave no gap'
  )
  assertDeepEqual(
    AvailabilityCalendar.detectGaps([
      { start: '2026-01-01', end: '2026-01-10' },
      { start: '2026-01-01', end: '2026-01-05' },
    ]),
    [],
    'identical ranges leave no gap'
  )
})

await test('detectGaps returns one-day and multi-day gaps with literal bounds', () => {
  const inputs = [
    [
      'gap-one-day',
      [{ start: '2026-01-01', end: '2026-01-05' }, { start: '2026-01-07', end: '2026-01-10' }],
    ],
    [
      'gap-multi-day',
      [{ start: '2026-01-01', end: '2026-01-05' }, { start: '2026-01-08', end: '2026-01-10' }],
    ],
    [
      'gap-lordhowe-dst-start',
      [{ start: '2026-10-03', end: '2026-10-03' }, { start: '2026-10-05', end: '2026-10-05' }],
    ],
    [
      'gap-lordhowe-dst-end',
      [{ start: '2026-04-03', end: '2026-04-03' }, { start: '2026-04-05', end: '2026-04-05' }],
    ],
    [
      'gap-santiago-dst-start',
      [{ start: '2026-09-06', end: '2026-09-06' }, { start: '2026-09-08', end: '2026-09-08' }],
    ],
    [
      'gap-santiago-dst-end',
      [{ start: '2026-04-04', end: '2026-04-04' }, { start: '2026-04-06', end: '2026-04-06' }],
    ],
    [
      'gap-across-lordhowe-dst-start',
      [{ start: '2026-10-01', end: '2026-10-01' }, { start: '2026-10-06', end: '2026-10-10' }],
    ],
  ]
  for (const [label, ranges] of inputs) {
    assertDeepEqual(AvailabilityCalendar.detectGaps(ranges), EXPECTED_GAPS[label], label)
  }
})

await test('detectGaps reports days as the inclusive length of the gap it returns', () => {
  const inputs = [
    [{ start: '2026-01-01', end: '2026-01-05' }, { start: '2026-01-07', end: '2026-01-10' }],
    [{ start: '2026-01-01', end: '2026-01-05' }, { start: '2026-01-08', end: '2026-01-10' }],
    [{ start: '2026-10-03', end: '2026-10-03' }, { start: '2026-10-05', end: '2026-10-05' }],
    [{ start: '2026-09-06', end: '2026-09-06' }, { start: '2026-09-08', end: '2026-09-08' }],
    [{ start: '2024-02-26', end: '2024-02-28' }, { start: '2024-03-01', end: '2024-03-05' }],
  ]
  for (const ranges of inputs) {
    for (const gap of AvailabilityCalendar.detectGaps(ranges)) {
      assertEqual(
        gap.days,
        AvailabilityCalendar.expandRange(gap.start, gap.end).length,
        `days must equal the inclusive span length for ${gap.start}..${gap.end}`
      )
    }
  }
})

await test('detectGaps covers month, year and leap-day boundaries', () => {
  assertDeepEqual(
    AvailabilityCalendar.detectGaps([
      { start: '2026-01-28', end: '2026-01-31' },
      { start: '2026-02-03', end: '2026-02-10' },
    ]),
    [{ start: '2026-02-01', end: '2026-02-02', days: 2 }],
    'month boundary gap'
  )
  assertDeepEqual(
    AvailabilityCalendar.detectGaps([
      { start: '2025-12-29', end: '2025-12-31' },
      { start: '2026-01-03', end: '2026-01-10' },
    ]),
    [{ start: '2026-01-01', end: '2026-01-02', days: 2 }],
    'year boundary gap'
  )
  assertDeepEqual(
    AvailabilityCalendar.detectGaps([
      { start: '2024-02-26', end: '2024-02-28' },
      { start: '2024-03-01', end: '2024-03-05' },
    ]),
    [{ start: '2024-02-29', end: '2024-02-29', days: 1 }],
    'leap day appears as a one-day gap'
  )
  assertDeepEqual(
    AvailabilityCalendar.detectGaps([
      { start: '2023-02-26', end: '2023-02-28' },
      { start: '2023-03-01', end: '2023-03-05' },
    ]),
    [],
    '2023 has no Feb 29, so there is no gap there'
  )
})

await test('detectGaps handles more than two ranges and does not mutate its input', () => {
  const ranges = [
    { start: '2026-01-01', end: '2026-01-05' },
    { start: '2026-01-08', end: '2026-01-10' },
    { start: '2026-01-15', end: '2026-01-20' },
  ]
  const snapshot = JSON.stringify(ranges)
  assertDeepEqual(
    AvailabilityCalendar.detectGaps(ranges),
    EXPECTED_GAPS['gap-three-ranges'],
    'two gaps from three ranges'
  )
  assertEqual(JSON.stringify(ranges), snapshot, 'input ranges must not be mutated')
})

// ---------------------------------------------------------------------------
// splitRange: preserved contract, no timezone involved
// ---------------------------------------------------------------------------

await test('splitRange returns the whole range when there are no splits', () => {
  assertDeepEqual(
    AvailabilityCalendar.splitRange('2026-01-01', '2026-01-10', []),
    [{ start: '2026-01-01', end: '2026-01-10' }],
    'no splits'
  )
})

await test('splitRange ignores a split at the range start or beyond its end', () => {
  assertDeepEqual(
    AvailabilityCalendar.splitRange('2026-01-05', '2026-01-10', ['2026-01-05']),
    [{ start: '2026-01-05', end: '2026-01-10' }],
    'a split equal to start produces no empty leading segment'
  )
  assertDeepEqual(
    AvailabilityCalendar.splitRange('2026-01-01', '2026-01-05', ['2026-01-09']),
    [{ start: '2026-01-01', end: '2026-01-05' }],
    'a split past the end is ignored'
  )
})

await test('splitRange sorts unsorted split dates', () => {
  assertDeepEqual(
    AvailabilityCalendar.splitRange('2026-01-01', '2026-01-10', ['2026-01-07', '2026-01-04']),
    EXPECTED_SPLITS['split-unsorted'],
    'caller need not pre-sort'
  )
})

await test('splitRange tiles the range exactly with no gap and no overlap', () => {
  const cases = [
    ['2026-01-01', '2026-01-10', ['2026-01-04', '2026-01-07']],
    // Both split dates that actually drift in the original implementation.
    ['2026-04-01', '2026-04-07', ['2026-04-05']],
    ['2026-04-01', '2026-04-07', ['2026-04-06']],
    ['2027-04-01', '2027-04-07', ['2027-04-04']],
    ['2027-04-01', '2027-04-07', ['2027-04-05']],
    // Controls that do not drift, so the invariant is checked on them too.
    ['2026-10-01', '2026-10-07', ['2026-10-04']],
    ['2026-09-03', '2026-09-09', ['2026-09-06']],
    ['2024-02-26', '2024-03-02', ['2024-02-29']],
    ['2026-01-28', '2026-02-03', ['2026-02-01']],
    ['2025-12-29', '2026-01-03', ['2026-01-01']],
    ['2026-01-05', '2026-01-10', ['2026-01-07', '2026-01-08']],
  ]
  for (const [start, end, splitDates] of cases) {
    const segments = AvailabilityCalendar.splitRange(start, end, splitDates)
    assert(segments.length > 0, `${start}..${end} must yield at least one segment`)
    assertEqual(segments[0].start, start, `first segment must start at ${start}`)
    assertEqual(segments[segments.length - 1].end, end, `last segment must end at ${end}`)
    // Segments must be consecutive: the day after each segment end is the next start.
    for (let i = 1; i < segments.length; i++) {
      const nextDay = new Date(`${segments[i - 1].end}T00:00:00Z`)
      nextDay.setUTCDate(nextDay.getUTCDate() + 1)
      assertEqual(
        segments[i].start,
        nextDay.toISOString().slice(0, 10),
        `segment ${i} must start the day after the previous segment ends (${start}..${end})`
      )
    }
    // And the segments must cover exactly the original inclusive range.
    const covered = segments.reduce((sum, s) => sum + AvailabilityCalendar.expandRange(s.start, s.end).length, 0)
    assertEqual(covered, AvailabilityCalendar.expandRange(start, end).length, `${start}..${end} must be covered exactly once`)
  }
})

await test('splitRange covers month, year and leap-day boundaries', () => {
  assertDeepEqual(
    AvailabilityCalendar.splitRange('2026-01-28', '2026-02-03', ['2026-02-01']),
    EXPECTED_SPLITS['split-month-boundary'],
    'month boundary'
  )
  assertDeepEqual(
    AvailabilityCalendar.splitRange('2025-12-29', '2026-01-03', ['2026-01-01']),
    EXPECTED_SPLITS['split-year-boundary'],
    'year boundary'
  )
  assertDeepEqual(
    AvailabilityCalendar.splitRange('2024-02-26', '2024-03-02', ['2024-02-29']),
    EXPECTED_SPLITS['split-leap-day'],
    'leap day'
  )
  assertDeepEqual(
    AvailabilityCalendar.splitRange('2023-02-26', '2023-03-02', ['2023-03-01']),
    EXPECTED_SPLITS['split-common-feb-29-absent'],
    'common year has no Feb 29'
  )
})

// ---------------------------------------------------------------------------
// Timezone matrix: exact objects, with the effective zone proven
// ---------------------------------------------------------------------------

for (const [tz, expectedZone, janOffset, julOffset] of ZONES) {
  await test(`TZ=${tz} reports the effective zone and offsets actually in force`, () => {
    const out = runFixture(tz)
    assertEqual(out.effectiveZone, expectedZone, `TZ=${tz} must resolve to ${expectedZone}`)
    assertEqual(out.offsetJanuary, janOffset, `TZ=${tz} January offset`)
    assertEqual(out.offsetJuly, julOffset, `TZ=${tz} July offset`)
  })

  await test(`TZ=${tz} detectGaps returns the exact literal gaps`, () => {
    const out = runFixture(tz)
    for (const [label, expected] of Object.entries(EXPECTED_GAPS)) {
      assertDeepEqual(out.gaps[label], expected, `TZ=${tz} gap ${label}`)
    }
  })

  await test(`TZ=${tz} splitRange returns the exact literal segments`, () => {
    const out = runFixture(tz)
    for (const [label, expected] of Object.entries(EXPECTED_SPLITS)) {
      assertDeepEqual(out.splits[label], expected, `TZ=${tz} split ${label}`)
    }
  })

  await test(`TZ=${tz} every emitted gap's days matches its own inclusive span`, () => {
    const out = runFixture(tz)
    for (const [label, gaps] of Object.entries(out.gaps)) {
      for (const gap of gaps) {
        assertEqual(
          gap.days,
          AvailabilityCalendar.expandRange(gap.start, gap.end).length,
          `TZ=${tz} ${label}: days must equal the inclusive span length`
        )
      }
    }
  })
}

await test('the same inputs produce identical gaps and splits in every zone', () => {
  const ut = runFixture('UTC')
  const santiago = runFixture('America/Santiago')
  const lordhowe = runFixture('Australia/Lord_Howe')
  assertEqual(
    JSON.stringify(ut.gaps),
    JSON.stringify(santiago.gaps),
    'UTC and America/Santiago must agree on gaps'
  )
  assertEqual(
    JSON.stringify(ut.gaps),
    JSON.stringify(lordhowe.gaps),
    'UTC and Australia/Lord_Howe must agree on gaps'
  )
  assertEqual(
    JSON.stringify(ut.splits),
    JSON.stringify(santiago.splits),
    'UTC and America/Santiago must agree on splits'
  )
  assertEqual(
    JSON.stringify(ut.splits),
    JSON.stringify(lordhowe.splits),
    'UTC and Australia/Lord_Howe must agree on splits'
  )
})

// ---------------------------------------------------------------------------
// The regression is real: the baseline implementation fails these same cases
// ---------------------------------------------------------------------------

/**
 * Reconstructs the ORIGINAL detectGaps/splitRange from the pinned baseline
 * commit into an isolated temp directory and runs the identical fixture against
 * it.
 *
 * The temp directory is removed even if `git show` or a validation assertion
 * fails, so a broken run cannot leave directories behind.
 */
function buildBaselineCalendarCopy() {
  const dir = mkdtempSync(join(tmpdir(), 'calendar-gaps-1-'))
  try {
    const file = join(dir, 'baseline.calendar.mjs')
    const source = execFileSync('git', ['show', `${BASELINE_REVISION}:${CALENDAR_REL}`], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    })
    assert(
      source.includes('gapStart.setDate(gapStart.getDate() + 1)'),
      `the ${BASELINE_REVISION} copy must contain the original local-time gap step`
    )
    assert(
      source.includes('segEnd.setDate(segEnd.getDate() - 1)'),
      `the ${BASELINE_REVISION} copy must contain the original local-time split step`
    )
    assert(
      !source.includes('gapStart.setUTCDate'),
      `the ${BASELINE_REVISION} copy must not already contain the UTC fix`
    )
    writeFileSync(file, source, 'utf8')
    assertEqual(readFileSync(file, 'utf8'), source, 'the temp copy must match the committed original exactly')
    return { dir, file, url: pathToFileURL(file).href }
  } catch (error) {
    rmSync(dir, { recursive: true, force: true })
    throw error
  }
}

await test(`the original implementation at ${BASELINE_REVISION.slice(0, 7)} returns a self-contradictory gap in Lord Howe`, () => {
  const { dir, url } = buildBaselineCalendarCopy()
  try {
    const before = runFixture('Australia/Lord_Howe', url)
    const after = runFixture('Australia/Lord_Howe')

    // The exact malformed output the earlier report described.
    assertDeepEqual(
      before.gaps['gap-lordhowe-dst-start'],
      [{ start: '2026-10-03', end: '2026-10-04', days: 1 }],
      'the original Lord Howe gap is start 2026-10-03, end 2026-10-04, days 1'
    )
    const malformed = before.gaps['gap-lordhowe-dst-start'][0]
    assert(
      malformed.days !== AvailabilityCalendar.expandRange(malformed.start, malformed.end).length,
      'the original object contradicts itself: days 1 over a two-day span'
    )
    assertDeepEqual(
      after.gaps['gap-lordhowe-dst-start'],
      [{ start: '2026-10-04', end: '2026-10-04', days: 1 }],
      'the fix returns the correct single-day gap'
    )

    // Santiago has the same defect on its own transition.
    const santiagoBefore = runFixture('America/Santiago', url)
    assertDeepEqual(
      santiagoBefore.gaps['gap-santiago-dst-start'],
      [{ start: '2026-09-06', end: '2026-09-07', days: 1 }],
      'the original Santiago gap is malformed too'
    )
    assertDeepEqual(
      santiagoBefore.gaps['gap-santiago-dst-start-next-year'],
      [{ start: '2027-09-05', end: '2027-09-06', days: 1 }],
      'the original Santiago gap is malformed in 2027 too'
    )

    // The 2027 second occurrence of the Lord Howe transition.
    assertDeepEqual(
      before.gaps['gap-lordhowe-dst-start-next-year'],
      [{ start: '2027-10-02', end: '2027-10-03', days: 1 }],
      'the original Lord Howe gap is malformed in 2027 too'
    )
    assertDeepEqual(
      after.gaps['gap-lordhowe-dst-start-next-year'],
      [{ start: '2027-10-03', end: '2027-10-03', days: 1 }],
      'the fix is correct in 2027 too'
    )

    // The April transition produces the mirror-image malformation: start AFTER end.
    assertDeepEqual(
      before.gaps['gap-lordhowe-dst-end'],
      [{ start: '2026-04-04', end: '2026-04-03', days: 1 }],
      'the original can even emit a gap whose start is after its end'
    )
    assertDeepEqual(
      santiagoBefore.gaps['gap-santiago-dst-end'],
      [{ start: '2026-04-05', end: '2026-04-04', days: 1 }],
      'the original Santiago April gap is reversed too'
    )
    // ...and it is correct in Lord Howe, whose April drifting date is the day before.
    assertDeepEqual(
      before.gaps['gap-santiago-dst-end'],
      EXPECTED_GAPS['gap-santiago-dst-end'],
      'the Santiago April gap date is correct in Lord Howe'
    )
    assertDeepEqual(
      after.gaps['gap-lordhowe-dst-end'],
      [{ start: '2026-04-04', end: '2026-04-04', days: 1 }],
      'the fix repairs the reversed gap'
    )

    // UTC was already correct: the control.
    const utcBefore = runFixture('UTC', url)
    assertDeepEqual(utcBefore.gaps['gap-one-day'], EXPECTED_GAPS['gap-one-day'], 'UTC is the control and must be unchanged')

    // And the original disagrees between zones for the same input, for both methods.
    const santiagoAll = runFixture('America/Santiago', url)
    assert(
      JSON.stringify(before.gaps) !== JSON.stringify(santiagoAll.gaps),
      'the original must disagree between zones on gaps'
    )
    assert(
      JSON.stringify(before.splits) !== JSON.stringify(santiagoAll.splits),
      'the original must disagree between zones on splits'
    )
    // The fixed implementation does not.
    assertEqual(
      JSON.stringify(after.gaps),
      JSON.stringify(runFixture('America/Santiago').gaps),
      'the fix makes gaps zone-independent'
    )
    assertEqual(
      JSON.stringify(after.splits),
      JSON.stringify(runFixture('America/Santiago').splits),
      'the fix makes splits zone-independent'
    )
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

await test(`the original implementation at ${BASELINE_REVISION.slice(0, 7)} loses a day from a splitRange segment`, () => {
  const { dir, url } = buildBaselineCalendarCopy()
  try {
    const before = runFixture('Australia/Lord_Howe', url)
    const after = runFixture('Australia/Lord_Howe')

    // The first segment ends a day early, so the segments no longer tile the range.
    assertDeepEqual(
      before.splits['split-lordhowe-dst-end'],
      [
        { start: '2026-04-01', end: '2026-04-03' },
        { start: '2026-04-05', end: '2026-04-07' },
      ],
      'the original loses 2026-04-04 from the first segment'
    )
    assertDeepEqual(
      after.splits['split-lordhowe-dst-end'],
      EXPECTED_SPLITS['split-lordhowe-dst-end'],
      'the fix returns consecutive segments that tile the range'
    )
    assertDeepEqual(
      before.splits['split-lordhowe-dst-end-next-year'],
      [
        { start: '2027-04-01', end: '2027-04-02' },
        { start: '2027-04-04', end: '2027-04-07' },
      ],
      'the original loses 2027-04-03 from the first segment'
    )

    const santiagoBefore = runFixture('America/Santiago', url)
    assertDeepEqual(
      santiagoBefore.splits['split-santiago-dst-end'],
      [
        { start: '2026-04-01', end: '2026-04-04' },
        { start: '2026-04-06', end: '2026-04-07' },
      ],
      'the original Santiago split loses 2026-04-05'
    )

    // The defect is zone-specific: each zone's drifting split date is correct in the
    // other zone, which is exactly why a narrow sweep missed it.
    assertDeepEqual(
      santiagoBefore.splits['split-lordhowe-dst-end'],
      EXPECTED_SPLITS['split-lordhowe-dst-end'],
      'the Lord Howe split date is correct in Santiago'
    )
    assertDeepEqual(
      before.splits['split-santiago-dst-end'],
      EXPECTED_SPLITS['split-santiago-dst-end'],
      'the Santiago split date is correct in Lord Howe'
    )

    const utcBefore = runFixture('UTC', url)
    assertDeepEqual(utcBefore.splits['split-plain'], EXPECTED_SPLITS['split-plain'], 'UTC is the control and must be unchanged')
    assertDeepEqual(
      utcBefore.splits['split-lordhowe-dst-end'],
      EXPECTED_SPLITS['split-lordhowe-dst-end'],
      'UTC must be correct for every split fixture, before the fix as well'
    )
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

await test('the temp copy is removed and the worktree calendar file is untouched', () => {
  const { dir, file } = buildBaselineCalendarCopy()
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
  assert(worktree.includes('gapStart.setUTCDate'), 'the worktree calendar must hold the UTC gap step')
  assert(worktree.includes('segEnd.setUTCDate'), 'the worktree calendar must hold the UTC split step')
})

// ---------------------------------------------------------------------------

console.log(`\n  total: ${passed + failed}   passed: ${passed}   failed: ${failed}`)
if (failed > 0) {
  console.log('\n  Failures:')
  for (const f of failures) console.log(`   - ${f.name}: ${f.error.message}`)
}
process.exitCode = failed > 0 ? 1 : 0
