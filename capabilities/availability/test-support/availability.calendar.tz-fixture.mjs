/**
 * TEST-ONLY timezone fixture for the inclusive availability calendar.
 *
 * It is a child process, not an in-process loop, because in-process mutation of
 * `process.env.TZ` is unreliable on Windows: Node caches the local timezone, so
 * setting process.env.TZ after startup does not reliably change local-time
 * arithmetic. A fresh child started with TZ set in its environment is the only
 * way to be sure the zone under test is the zone actually in effect.
 *
 * The fixture imports the REAL AvailabilityCalendar. It does not reimplement
 * any date logic, and it does not accept an expected answer from the caller: it
 * prints what the implementation actually produced, and the parent test asserts
 * the exact expected dates.
 *
 * It exercises three methods: expandRange (ranges), detectGaps (gap pairs) and
 * splitRange (split cases). For detectGaps it reports the whole returned object
 * including the `days` field, so the parent can assert that the bounds and the
 * count agree with each other rather than only that each looks plausible.
 *
 * Effective zone and offsets are reported alongside the results. That is
 * deliberate. A run whose TZ was silently ignored would still print a plausible
 * list of dates, and would otherwise count as coverage of a zone that was never
 * actually exercised. The parent asserts the reported zone and offsets, so an
 * ignored TZ fails the test instead of quietly passing it.
 *
 * Which module to exercise is selected by MODULE_URL, so the same fixture can be
 * pointed at an isolated copy of the original implementation to demonstrate the
 * regression (see the parent test). No file in the worktree is written.
 *
 * This fixture is shared between two suites. BOOKING-CALENDAR-UTC-1 added the
 * `year-366` range, which is what feeds the `expansions` payload. This suite,
 * BOOKING-CALENDAR-GAPS-1, added the `gaps` and `splits` payloads.
 */

// Resolved relative to this file, so the fixture works from any checkout path and
// on any platform. The parent always passes CALENDAR_MODULE_URL explicitly; this
// default exists so the fixture can also be run by hand.
const MODULE_URL =
  process.env.CALENDAR_MODULE_URL ||
  new URL('../availability.calendar.js', import.meta.url).href

const RANGES = [
  ['same-day', '2026-04-03', '2026-04-03'],
  ['two-day', '2026-04-03', '2026-04-04'],
  ['plain-4d', '2026-04-03', '2026-04-06'],
  ['month-boundary', '2026-01-30', '2026-02-02'],
  ['year-boundary', '2025-12-30', '2026-01-02'],
  ['leap-day-span', '2024-02-28', '2024-03-01'],
  ['leap-day-same', '2024-02-29', '2024-02-29'],
  ['non-leap-0229-span', '2023-02-28', '2023-03-01'],
  ['santiago-dst-end', '2026-04-03', '2026-04-06'],
  ['santiago-dst-start', '2026-09-04', '2026-09-07'],
  ['lordhowe-dst-start', '2026-10-02', '2026-10-05'],
  ['lordhowe-dst-end', '2026-04-04', '2026-04-07'],
  ['reversed', '2026-04-06', '2026-04-03'],
  // Long enough to span both DST transitions in every zone under test, including
  // the 23-hour and 25-hour local days that broke the original implementation.
  ['year-366', '2026-01-01', '2027-01-01'],
]

// detectGaps fixtures. Each entry is a pair of ranges; the fixture passes them
// straight to the real method and reports whatever it produced, including the
// `days` field, so the parent can assert the exact objects and catch the case
// where the bounds and the count disagree with each other.
const GAP_PAIRS = [
  ['gap-empty', []],
  ['gap-single', [{ start: '2026-01-01', end: '2026-01-05' }]],
  ['gap-adjacent', [{ start: '2026-01-01', end: '2026-01-05' }, { start: '2026-01-06', end: '2026-01-10' }]],
  ['gap-overlapping', [{ start: '2026-01-01', end: '2026-01-08' }, { start: '2026-01-05', end: '2026-01-10' }]],
  ['gap-one-day', [{ start: '2026-01-01', end: '2026-01-05' }, { start: '2026-01-07', end: '2026-01-10' }]],
  ['gap-multi-day', [{ start: '2026-01-01', end: '2026-01-05' }, { start: '2026-01-08', end: '2026-01-10' }]],
  ['gap-month-boundary', [{ start: '2026-01-28', end: '2026-01-31' }, { start: '2026-02-03', end: '2026-02-10' }]],
  ['gap-year-boundary', [{ start: '2025-12-29', end: '2025-12-31' }, { start: '2026-01-03', end: '2026-01-10' }]],
  ['gap-leap-day', [{ start: '2024-02-26', end: '2024-02-28' }, { start: '2024-03-01', end: '2024-03-05' }]],
  // The reported defect: a one-day gap immediately after the Lord Howe October
  // transition. The original returned start 2026-10-03, end 2026-10-04, days 1.
  ['gap-lordhowe-dst-start', [{ start: '2026-10-03', end: '2026-10-03' }, { start: '2026-10-05', end: '2026-10-05' }]],
  ['gap-lordhowe-dst-end', [{ start: '2026-04-03', end: '2026-04-03' }, { start: '2026-04-05', end: '2026-04-05' }]],
  ['gap-santiago-dst-start', [{ start: '2026-09-06', end: '2026-09-06' }, { start: '2026-09-08', end: '2026-09-08' }]],
  ['gap-santiago-dst-end', [{ start: '2026-04-04', end: '2026-04-04' }, { start: '2026-04-06', end: '2026-04-06' }]],
  // Long gaps that span a transition entirely, to pin the `days` count itself.
  ['gap-across-lordhowe-dst-start', [{ start: '2026-10-01', end: '2026-10-01' }, { start: '2026-10-06', end: '2026-10-10' }]],
  // The second occurrence of each transition in 2027. An exhaustive sweep of the
  // original implementation found exactly these two additional drifting dates per
  // zone, so both are pinned rather than assuming 2026 was representative.
  ['gap-lordhowe-dst-start-next-year', [{ start: '2027-10-02', end: '2027-10-02' }, { start: '2027-10-04', end: '2027-10-04' }]],
  ['gap-santiago-dst-start-next-year', [{ start: '2027-09-05', end: '2027-09-05' }, { start: '2027-09-07', end: '2027-09-07' }]],
  ['gap-three-ranges', [
    { start: '2026-01-01', end: '2026-01-05' },
    { start: '2026-01-08', end: '2026-01-10' },
    { start: '2026-01-15', end: '2026-01-20' },
  ]],
]

// splitRange fixtures: [start, end, [splitDates]].
const SPLIT_CASES = [
  ['split-none', '2026-01-01', '2026-01-10', []],
  ['split-plain', '2026-01-01', '2026-01-10', ['2026-01-05']],
  ['split-two', '2026-01-01', '2026-01-10', ['2026-01-04', '2026-01-07']],
  ['split-at-start', '2026-01-05', '2026-01-10', ['2026-01-05']],
  ['split-at-end', '2026-01-01', '2026-01-05', ['2026-01-05']],
  ['split-beyond-end', '2026-01-01', '2026-01-05', ['2026-01-09']],
  ['split-unsorted', '2026-01-01', '2026-01-10', ['2026-01-07', '2026-01-04']],
  ['split-month-boundary', '2026-01-28', '2026-02-03', ['2026-02-01']],
  ['split-year-boundary', '2025-12-29', '2026-01-03', ['2026-01-01']],
  ['split-leap-day', '2024-02-26', '2024-03-02', ['2024-02-29']],
  ['split-common-feb-29-absent', '2023-02-26', '2023-03-02', ['2023-03-01']],
  // The demonstrated splitRange defect. Note the split dates are the day AFTER the
  // transition day, not the transition day itself: stepping one local day back from
  // the split's UTC midnight crosses the offset change and lands on the wrong UTC
  // date. An exhaustive sweep of the original found exactly two drifting split dates
  // per zone across 2026-2027, all listed here, plus two control dates below that do
  // not drift.
  ['split-lordhowe-dst-end', '2026-04-01', '2026-04-07', ['2026-04-05']],
  ['split-lordhowe-dst-end-next-year', '2027-04-01', '2027-04-07', ['2027-04-04']],
  ['split-santiago-dst-end', '2026-04-01', '2026-04-07', ['2026-04-06']],
  ['split-santiago-dst-end-next-year', '2027-04-01', '2027-04-07', ['2027-04-05']],
  // Controls: transition dates where the split path does NOT drift. Without these
  // the suite would overstate how broad the defect is.
  ['split-lordhowe-dst-start-control', '2026-10-01', '2026-10-07', ['2026-10-04']],
  ['split-santiago-dst-start-control', '2026-09-03', '2026-09-09', ['2026-09-06']],
]

const { AvailabilityCalendar } = await import(MODULE_URL)

const expansions = {}
for (const [label, start, end] of RANGES) {
  expansions[label] = AvailabilityCalendar.expandRange(start, end)
}

const gaps = {}
for (const [label, ranges] of GAP_PAIRS) {
  gaps[label] = AvailabilityCalendar.detectGaps(ranges)
}

const splits = {}
for (const [label, start, end, splitDates] of SPLIT_CASES) {
  splits[label] = AvailabilityCalendar.splitRange(start, end, splitDates)
}

const payload = {
  requestedTz: process.env.TZ ?? null,
  effectiveZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  // getTimezoneOffset() is UTC - local, so it is negative east of Greenwich.
  offsetJanuary: new Date(2026, 0, 15).getTimezoneOffset(),
  offsetJuly: new Date(2026, 6, 15).getTimezoneOffset(),
  expansions,
  gaps,
  splits,
}

process.stdout.write(JSON.stringify(payload))
