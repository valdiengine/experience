/**
 * PRICING-CALCULATOR-1A — Pure accommodation pricing calculation
 *
 * Deterministic, dependency-free calculation of a stay price from a validated
 * policy, a selected option, a guest count, and an explicit occupied-date list.
 *
 * Constraints for this slice:
 *   - Pure. No DB, no network, no filesystem, no clock, no side effects.
 *   - The occupied dates arrive already validated. This module re-validates them
 *     but does not derive them, and it does not touch the repository/calendar
 *     date algorithm. Occupied nights only; checkout is the caller's exclusive
 *     bound and is never part of the list.
 *   - All date validation is UTC-only. Local-time accessors are never used, so
 *     results cannot shift with the host timezone or a DST transition.
 *   - Guest and option inputs are validated BEFORE any coercion: booleans,
 *     arrays, objects, fractions, and out-of-range counts are rejected. A
 *     canonical numeric string ("3") is accepted; nothing else is coerced.
 *   - No client-controlled monetary override: the result is derived solely from
 *     the policy passed in. No amount, currency, or policy fragment is read
 *     from the caller beyond the option id and guest count.
 *   - No tax inclusion/exclusion is asserted and no tax is computed. Tax
 *     treatment is unknown and is therefore left unstated.
 *
 * Implemented model: nightly occupancy tiers with an optional additional-guest
 * charge above a declared threshold. No per-person activity mode is introduced.
 *
 * MONEY CONTRACT
 *   Every amount produced here is an integer count of CURRENCY UNITS in the
 *   policy's declared currency, not minor units. The active declaration is in
 *   CLP, a currency with no minor unit, so `nightlyTotal` denotes whole pesos.
 *   There is no minor-unit scaling, decimal exponent, or currency conversion in
 *   this module: `unitPrice` and `lineTotal` are the literal whole-currency
 *   totals for the stay. (No specific figure is written here on purpose; every
 *   amount arrives from the policy.)
 *
 *   Not claimed here, and still open for the activation slice: the persistence
 *   type for these integers (for example a DECIMAL column) and any validation
 *   that the chosen column range or conversion preserves their exact value. No
 *   other currency is assumed to work; the policy validator checks only the
 *   three-uppercase-letter shape of a currency code, not that the code is a
 *   supported ISO currency or that its exponent matches these amounts.
 */

import {
  PRICING_BASIS,
  PRICING_MAX_SAFE_AMOUNT,
  PricingPolicyError,
  validatePolicy,
  canonicalPolicyForm,
  policyFingerprint,
} from './pricing.policy.js'

/** Snapshot contract version, independent of the policy declaration version. */
export const PRICING_SNAPSHOT_SCHEMA_VERSION = 1

/**
 * Line pricing semantics exposed for later integration:
 * one occupied unit consumes one inventory unit, so the complete-stay amount is
 * both the unit amount and the line total. The caller persists this; nothing
 * here claims it was persisted.
 */
export const PRICING_LINE_SEMANTICS = Object.freeze({
  QUANTITY: 1,
  UNIT_PRICE_BASIS: 'complete_stay_per_unit',
})

export class PricingCalculationError extends Error {
  constructor(message, code = 'PRICING_CALCULATION_FAILED') {
    super(message)
    this.name = 'PricingCalculationError'
    this.code = code
  }
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

const MILLISECONDS_PER_DAY = 86400000

/**
 * Parses a strict YYYY-MM-DD calendar date at UTC midnight.
 * Returns null when the value is not a strict, real calendar date.
 *
 * Uses setUTCFullYear rather than Date.UTC so that years 0-99 are not silently
 * remapped into the 20th century, and re-reads every component to reject
 * overflow dates such as 2026-02-30.
 */
export function parseUtcDateOnly(value) {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return null

  const year = Number(value.slice(0, 4))
  const month = Number(value.slice(5, 7))
  const day = Number(value.slice(8, 10))

  if (month < 1 || month > 12) return null
  if (day < 1 || day > 31) return null

  const date = new Date(0)
  date.setUTCHours(0, 0, 0, 0)
  date.setUTCFullYear(year, month - 1, day)

  if (date.getUTCFullYear() !== year) return null
  if (date.getUTCMonth() !== month - 1) return null
  if (date.getUTCDate() !== day) return null

  return date
}

/**
 * Validates an explicit occupied-date list.
 *
 * Requires: nonempty, strict YYYY-MM-DD, real calendar dates, unique,
 * ascending, and consecutive (no gaps). Returns a normalized copy so the
 * caller's array is never aliased or mutated.
 */
export function validateOccupiedDates(dates) {
  if (!Array.isArray(dates) || dates.length === 0) {
    throw new PricingCalculationError(
      'occupiedDates must be a non-empty array of YYYY-MM-DD strings',
      'INVALID_OCCUPIED_DATES'
    )
  }

  const normalized = []
  const seen = new Set()
  let previous = null

  for (let index = 0; index < dates.length; index++) {
    const value = dates[index]
    const parsed = parseUtcDateOnly(value)

    if (parsed === null) {
      throw new PricingCalculationError(
        `occupiedDates[${index}] "${String(value)}" is not a valid YYYY-MM-DD calendar date`,
        'INVALID_OCCUPIED_DATES'
      )
    }
    if (seen.has(value)) {
      throw new PricingCalculationError(
        `occupiedDates[${index}] "${value}" is duplicated`,
        'DUPLICATE_OCCUPIED_DATE'
      )
    }
    if (previous !== null) {
      const delta = parsed.getTime() - previous.getTime()
      if (delta <= 0) {
        throw new PricingCalculationError(
          `occupiedDates[${index}] "${value}" is out of order`,
          'UNORDERED_OCCUPIED_DATES'
        )
      }
      if (delta !== MILLISECONDS_PER_DAY) {
        throw new PricingCalculationError(
          `occupiedDates[${index}] "${value}" is not consecutive with the previous night`,
          'GAPPED_OCCUPIED_DATES'
        )
      }
    }

    seen.add(value)
    normalized.push(value)
    previous = parsed
  }

  return normalized
}

/**
 * Validates a raw guest count before any coercion.
 *
 * Rejects booleans, arrays, objects, null, NaN, Infinity, fractions, zero,
 * negatives, and counts above maxOccupancy. A canonical decimal-digit string
 * such as "3" is accepted because HTML form controls submit strings; no other
 * string form (padding, sign, exponent, "3.0", "0x3") is coerced.
 *
 * "Canonical" is enforced strictly: the accepted string must equal its own
 * decimal round trip, so "03" and "0003" are refused while "3" is accepted.
 * Two spellings of the same count must not both be admitted, otherwise a
 * fingerprint or log keyed on the raw value could disagree with the priced one.
 */
export function validateGuestCount(raw, maxOccupancy) {
  let count

  if (typeof raw === 'number') {
    count = raw
  } else if (typeof raw === 'string' && /^\d+$/.test(raw) && String(Number(raw)) === raw) {
    count = Number(raw)
  } else {
    throw new PricingCalculationError(
      `guestCount must be a positive integer, received ${describe(raw)}`,
      'INVALID_GUEST_COUNT'
    )
  }

  // A SAFE integer, not merely Number.isInteger: 1e300 is an "integer" to
  // Number.isInteger but has already lost precision, and a count that cannot be
  // represented exactly must not reach a comparison or an amount.
  if (!Number.isSafeInteger(count)) {
    throw new PricingCalculationError(
      `guestCount must be a whole number within the safe integer range, received ${describe(raw)}`,
      'INVALID_GUEST_COUNT'
    )
  }
  if (count < 1) {
    throw new PricingCalculationError(
      `guestCount must be at least 1, received ${count}`,
      'GUEST_COUNT_OUT_OF_RANGE'
    )
  }
  if (count > maxOccupancy) {
    throw new PricingCalculationError(
      `guestCount ${count} exceeds the maximum occupancy of ${maxOccupancy}`,
      'GUEST_COUNT_OUT_OF_RANGE'
    )
  }

  return count
}

function describe(value) {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'an array'
  if (typeof value === 'boolean') return `boolean ${value}`
  if (typeof value === 'object') return 'an object'
  if (typeof value === 'string') return `string ${JSON.stringify(value)}`
  if (typeof value === 'number') return String(value)
  return typeof value
}

/**
 * Resolves a declared option by id. An absent or unknown id is an error: an
 * unselected option is never silently promoted to a surcharge or a default.
 */
export function resolveOption(policy, optionId) {
  if (optionId === undefined || optionId === null || optionId === '') {
    throw new PricingCalculationError('An option must be selected', 'MISSING_OPTION')
  }
  if (typeof optionId !== 'string') {
    throw new PricingCalculationError(
      `option must be a string id, received ${describe(optionId)}`,
      'INVALID_OPTION'
    )
  }

  const match = policy.options.find((option) => option.id === optionId)
  if (!match) {
    throw new PricingCalculationError(
      `Unknown option "${optionId}"`,
      'UNKNOWN_OPTION'
    )
  }
  return match
}

/**
 * Finds the tier covering a guest count. Throws when coverage is missing or
 * ambiguous rather than falling back to a neighbouring tier.
 *
 * The caller passes the *base-rate* guest count, already capped at the
 * additional-guest threshold. Tiers describe base-rate bands; occupancy above
 * the threshold is priced by the additional-guest rule, not by a wider tier.
 */
export function resolveTier(policy, guestCount) {
  const matches = policy.tiers.filter(
    (tier) => guestCount >= tier.fromGuests && guestCount <= tier.toGuests
  )

  if (matches.length === 0) {
    throw new PricingCalculationError(
      `No occupancy tier covers ${guestCount} guests`,
      'NO_TIER_COVERAGE'
    )
  }
  if (matches.length > 1) {
    throw new PricingCalculationError(
      `Ambiguous occupancy tier coverage for ${guestCount} guests: ` +
      matches.map((tier) => tier.id).join(', '),
      'AMBIGUOUS_TIER_COVERAGE'
    )
  }
  return matches[0]
}

function assertAmount(value, context) {
  if (!Number.isInteger(value) || value < 0) {
    throw new PricingCalculationError(
      `${context} produced an invalid amount`,
      'INVALID_ARITHMETIC'
    )
  }
  if (value > PRICING_MAX_SAFE_AMOUNT) {
    throw new PricingCalculationError(
      `${context} overflowed the safe integer range`,
      'AMOUNT_OVERFLOW'
    )
  }
  return value
}

function addAmounts(a, b, context) {
  const sum = a + b
  if (!Number.isFinite(sum)) {
    throw new PricingCalculationError(
      `${context} overflowed the safe integer range`,
      'AMOUNT_OVERFLOW'
    )
  }
  return assertAmount(sum, context)
}

function multiplyAmounts(a, b, context) {
  const product = a * b
  if (!Number.isFinite(product)) {
    throw new PricingCalculationError(
      `${context} overflowed the safe integer range`,
      'AMOUNT_OVERFLOW'
    )
  }
  return assertAmount(product, context)
}

/**
 * Calculates a stay price.
 *
 * @param {object} params
 * @param {object} params.policy              validated pricing policy
 * @param {string} params.optionId            selected commercial option
 * @param {number|string} params.guestCount   raw guest count, validated pre-coercion
 * @param {string[]} params.occupiedDates     explicit, validated occupied nights
 * @returns {object} JSON-serializable pricing snapshot
 */
export function calculateAccommodationPrice({ policy, optionId, guestCount, occupiedDates }) {
  if (!policy || typeof policy !== 'object') {
    throw new PricingCalculationError('A pricing policy is required', 'MISSING_POLICY')
  }

  // The caller may hand a normalized-but-unvalidated policy; revalidate so a
  // defect can never reach arithmetic.
  validatePolicy(policy)

  if (policy.basis !== PRICING_BASIS.ACCOMMODATION_PER_NIGHT) {
    throw new PricingCalculationError(
      `Unsupported pricing basis "${policy.basis}"`,
      'UNSUPPORTED_BASIS'
    )
  }

  const option = resolveOption(policy, optionId)
  const guests = validateGuestCount(guestCount, policy.maxOccupancy)
  const dates = validateOccupiedDates(occupiedDates)

  const additionalGuests = policy.additionalGuests
  const threshold = additionalGuests ? additionalGuests.threshold : policy.standardCapacity

  // The base rate is selected by the guest count capped at the threshold, so
  // guests five and six price on the top declared tier and are charged
  // separately as additional guests.
  const baseTierGuests = Math.min(guests, threshold)
  const tier = resolveTier(policy, baseTierGuests)
  const baseRate = option.rates[tier.id]
  if (!Number.isInteger(baseRate) || baseRate < 0) {
    throw new PricingCalculationError(
      `Option "${option.id}" has no usable rate for tier "${tier.id}"`,
      'MISSING_RATE'
    )
  }

  const extraGuestCount = Math.max(0, guests - threshold)
  const extraRate = additionalGuests ? additionalGuests.ratePerGuestPerNight : 0

  const extraPerNight = extraGuestCount > 0
    ? multiplyAmounts(extraGuestCount, extraRate, 'additional guest charge')
    : 0

  const nightlyTotal = addAmounts(baseRate, extraPerNight, 'nightly total')

  const nights = dates.map((date) => ({
    date,
    quantity: PRICING_LINE_SEMANTICS.QUANTITY,
    baseAmount: baseRate,
    additionalGuestCount: extraGuestCount,
    additionalAmount: extraPerNight,
    amount: nightlyTotal,
  }))

  let stayTotal = 0
  for (const night of nights) {
    stayTotal = addAmounts(stayTotal, night.amount, 'stay total')
  }

  // A declared condition applies only when the guest is genuinely an additional
  // guest AND the party has reached the guest count from which the condition
  // starts. Both conditions matter: a condition beginning at guest 6 must not
  // surface for a party of five, even though the fifth guest is charged the
  // additional-guest rate. Validation constrains fromGuest to the additional
  // range (threshold + 1 .. maxOccupancy), so a declared condition is always
  // reachable, and an omitted condition stays omitted.
  const declaredCondition = additionalGuests ? additionalGuests.condition : null
  const conditionApplies =
    extraGuestCount > 0 &&
    declaredCondition !== null &&
    guests >= declaredCondition.fromGuest

  const mattressCondition = conditionApplies
    ? {
        text: declaredCondition.text,
        appliesFromGuest: declaredCondition.fromGuest,
      }
    : null

  // The fingerprint is always recomputed from the policy being priced. A cached
  // __fingerprint on the instance is ignored on purpose: it can be stale or
  // altered independently of the policy, and a snapshot that misidentifies its
  // pricing basis is worse than one that costs a few extra microseconds.
  const fingerprint = policyFingerprint(policy)

  return {
    schemaVersion: PRICING_SNAPSHOT_SCHEMA_VERSION,
    policyFingerprint: fingerprint,
    currency: policy.currency,
    pricingBasis: policy.basis,
    checkInTime: policy.checkInTime,
    checkOutTime: policy.checkOutTime,

    option: {
      id: option.id,
      label: option.label,
      inclusions: [...option.inclusions],
    },

    guestCount: guests,
    tier: { id: tier.id, fromGuests: tier.fromGuests, toGuests: tier.toGuests },
    additionalGuestCount: extraGuestCount,

    baseRatePerNight: baseRate,
    additionalRatePerGuestPerNight: extraRate,
    additionalAmountPerNight: extraPerNight,
    nightlyTotal,

    occupiedDates: [...dates],
    nights,
    stayTotal,
    nightCount: nights.length,

    standardCapacity: policy.standardCapacity,
    maxOccupancy: policy.maxOccupancy,
    mattressCondition,

    line: {
      quantity: PRICING_LINE_SEMANTICS.QUANTITY,
      unitPrice: stayTotal,
      lineTotal: stayTotal,
      unitPriceBasis: PRICING_LINE_SEMANTICS.UNIT_PRICE_BASIS,
    },

    /**
     * Deliberately absent: any tax inclusion/exclusion flag, any tax amount, and
     * any statement that this price was persisted, accepted, or commercially
     * confirmed. Tax treatment is unknown and unstated by design.
     */
  }
}

/**
 * Attaches the revision identifier to a validated policy object so callers can
 * carry a self-identifying policy. Returns a frozen copy; the input is never
 * mutated.
 *
 * The calculator does not depend on this field: it recomputes the fingerprint
 * from the policy it is pricing, so a stale or altered __fingerprint can never
 * misidentify a snapshot. Use this when a policy object needs to advertise its
 * own identity, not to make calculation cheaper.
 *
 * The fingerprint is an unkeyed content hash: it is a revision id, not a
 * signature or an authorization, and must never be treated as evidence that a
 * quote or booking is authentic or approved.
 */
export function withFingerprint(resolution) {
  if (resolution.status !== 'valid') {
    throw new PricingPolicyError(
      'A validated policy resolution is required',
      'POLICY_NOT_RESOLVED'
    )
  }
  return Object.freeze({ ...resolution.policy, __fingerprint: resolution.fingerprint })
}

export { canonicalPolicyForm, policyFingerprint }

export default {
  PRICING_SNAPSHOT_SCHEMA_VERSION,
  PRICING_LINE_SEMANTICS,
  PricingCalculationError,
  parseUtcDateOnly,
  validateOccupiedDates,
  validateGuestCount,
  resolveOption,
  resolveTier,
  calculateAccommodationPrice,
  withFingerprint,
  policyFingerprint,
}
