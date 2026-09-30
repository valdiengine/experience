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
 * Effective zone and offsets are reported alongside the results. That is
 * deliberate. A run whose TZ was silently ignored would still print a plausible
 * list of dates, and would otherwise count as coverage of a zone that was never
 * actually exercised. The parent asserts the reported zone and offsets, so an
 * ignored TZ fails the test instead of quietly passing it.
 *
 * Which module to exercise is selected by MODULE_URL, so the same fixture can be
 * pointed at an isolated copy of the original implementation to demonstrate the
 * regression (see the parent test). No file in the worktree is written.
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

const { AvailabilityCalendar } = await import(MODULE_URL)

const expansions = {}
for (const [label, start, end] of RANGES) {
  expansions[label] = AvailabilityCalendar.expandRange(start, end)
}

const payload = {
  requestedTz: process.env.TZ ?? null,
  effectiveZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  // getTimezoneOffset() is UTC - local, so it is negative east of Greenwich.
  offsetJanuary: new Date(2026, 0, 15).getTimezoneOffset(),
  offsetJuly: new Date(2026, 6, 15).getTimezoneOffset(),
  expansions,
}

process.stdout.write(JSON.stringify(payload))
