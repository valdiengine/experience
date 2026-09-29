/**
 * Occupied nights — pure, UTC-only, checkout-exclusive expansion.
 *
 * A reservation occupies every night from check-in (inclusive) to check-out
 * (exclusive). This module states that occupied-night contract and is the
 * implementation adopted by `AvailabilityManager.checkAvailability` for its
 * read-path derivation. It is not, and does not claim to be, the derivation
 * already used by every reservation consumer: the persistence consumption and
 * release path in
 * `capabilities/persistence/repositories/reservation/reservation.repository.js`
 * still performs its own local-time expansion and is unchanged by this slice.
 * The module is intentionally free of persistence, repository, capability
 * and configuration concerns.
 *
 * All arithmetic is UTC. The legacy derivation mixed `new Date(string)` (which
 * parses as UTC midnight) with local-time `getDate()`/`setDate()` accessors.
 * A fixed non-zero offset does not by itself make that arithmetic wrong: with
 * a constant offset the local civil day still maps one-to-one onto the UTC day.
 * The defect is the mixing itself. A local-time step is re-anchored to the
 * host's current offset while the result is formatted in UTC, so the two can
 * disagree across the offset transitions relevant to the evaluated window,
 * and near a transition a civil-day step can advance by a sub-day amount.
 * This module uses UTC accessors exclusively, so the result does not depend on
 * the host timezone or on where a transition falls.
 *
 * Contract:
 *  - Input bounds are strict `YYYY-MM-DD` strings. No trimming, no coercion,
 *    no timestamps, no `new Date(string)`, no local-time parsing.
 *  - Missing, non-string, empty, malformed, impossible, equal and reversed
 *    bounds all throw a typed AvailabilityDateRangeError. An empty array is
 *    not a reachable success value.
 *  - Success returns a non-empty, ascending, unique, consecutive array.
 *  - The input object is never mutated.
 *
 * Scope: this slice corrects date derivation only. It is NOT wired to
 * persistence consumption, and the default bound below is an engineering
 * ceiling for bounded expansion, not a commercial stay policy and not a
 * performance certification for the number of SQL statements a future
 * consumer would issue. The appropriate persistence transaction budget still
 * has to be assessed before this helper drives SQL consumption.
 */
import { AvailabilityDateRangeError } from './availability.errors.js'

/**
 * Version of the occupied-night derivation contract. Persisted alongside any
 * future consumption record so a later algorithm revision can be detected
 * rather than silently re-deriving a different set.
 */
export const OCCUPIED_NIGHTS_EXPANSION_VERSION = 1

/**
 * Technical default ceiling on the number of nights a single expansion may
 * produce. Chosen as a generous engineering bound (roughly ten years) that
 * still prevents an unbounded allocation from unvalidated input.
 *
 * This is deliberately NOT a commercial maximum-stay policy, and it is NOT
 * justified by any transaction budget: connecting this helper to SQL
 * consumption issues one statement per night inside a single transaction, and
 * that budget is still to be assessed. No commercial restriction is
 * introduced here.
 */
export const OCCUPIED_NIGHTS_MAX_NIGHTS_DEFAULT = 3660

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

const MILLISECONDS_PER_DAY = 86400000

const MIN_YEAR = 1
const MAX_YEAR = 9999

/**
 * Parse a strict YYYY-MM-DD civil date to a UTC-midnight Date.
 *
 * Uses setUTCFullYear rather than Date.UTC because Date.UTC remaps years 0-99
 * into the 20th century, which would silently rewrite two-digit-era input.
 * setUTCFullYear does not remap. Every component is then re-read so overflow
 * dates such as 2026-02-30 are rejected instead of rolled forward.
 *
 * @param {unknown} value
 * @param {string} field - name used in the error, for diagnosability
 * @returns {Date} UTC midnight of the parsed civil date
 */
function parseCivilDate(value, field) {
  if (typeof value !== 'string' || value.length === 0 || !DATE_PATTERN.test(value)) {
    throw new AvailabilityDateRangeError(
      `${field} must be a strict YYYY-MM-DD string`,
      { field, value }
    )
  }

  const year = Number(value.slice(0, 4))
  const month = Number(value.slice(5, 7))
  const day = Number(value.slice(8, 10))

  if (year < MIN_YEAR || year > MAX_YEAR) {
    throw new AvailabilityDateRangeError(
      `${field} year must be between ${MIN_YEAR} and ${MAX_YEAR}`,
      { field, value }
    )
  }
  if (month < 1 || month > 12) {
    throw new AvailabilityDateRangeError(
      `${field} month must be between 01 and 12`,
      { field, value }
    )
  }
  if (day < 1 || day > 31) {
    throw new AvailabilityDateRangeError(
      `${field} day must be between 01 and 31`,
      { field, value }
    )
  }

  const date = new Date(0)
  date.setUTCHours(0, 0, 0, 0)
  date.setUTCFullYear(year, month - 1, day)

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new AvailabilityDateRangeError(
      `${field} is not a real calendar date`,
      { field, value }
    )
  }

  return date
}

/**
 * Resolve and validate the caller-supplied bound.
 *
 * An absent override selects the exported technical default. Anything else
 * must be a positive safe integer, which rejects zero, negatives, fractions,
 * NaN, Infinity, unsafe integers and non-numeric values.
 */
function resolveMaxNights(maxNights) {
  if (maxNights === undefined) return OCCUPIED_NIGHTS_MAX_NIGHTS_DEFAULT

  if (typeof maxNights !== 'number' || !Number.isSafeInteger(maxNights) || maxNights <= 0) {
    throw new AvailabilityDateRangeError(
      'maxNights must be a positive safe integer',
      { field: 'maxNights', value: maxNights }
    )
  }

  return maxNights
}

/**
 * Expand a checkout-exclusive range into the nights it occupies.
 *
 * @param {{ startDate: string, endDate: string, maxNights?: number }} input
 * @returns {string[]} ascending, unique, consecutive YYYY-MM-DD occupied dates
 * @throws {AvailabilityDateRangeError} for any invalid bound or exceeded limit
 */
export function expandOccupiedNights(input = {}) {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    throw new AvailabilityDateRangeError(
      'expandOccupiedNights requires an object with startDate and endDate',
      { field: 'input', value: input }
    )
  }

  const { startDate, endDate, maxNights } = input
  const limit = resolveMaxNights(maxNights)

  const start = parseCivilDate(startDate, 'startDate')
  const end = parseCivilDate(endDate, 'endDate')

  // Difference is computed and bounded before any array is allocated or any
  // night is iterated, so an oversized range cannot allocate.
  const nights = Math.round((end.getTime() - start.getTime()) / MILLISECONDS_PER_DAY)

  if (!(nights > 0)) {
    throw new AvailabilityDateRangeError(
      'endDate must be after startDate (checkout is exclusive, at least one night is required)',
      { field: 'endDate', startDate, endDate }
    )
  }
  if (nights > limit) {
    throw new AvailabilityDateRangeError(
      `range of ${nights} nights exceeds the maximum of ${limit} nights`,
      { field: 'maxNights', nights, limit }
    )
  }

  const dates = new Array(nights)
  for (let index = 0; index < nights; index++) {
    const current = new Date(start.getTime())
    current.setUTCDate(current.getUTCDate() + index)
    dates[index] = current.toISOString().slice(0, 10)
  }

  return dates
}
