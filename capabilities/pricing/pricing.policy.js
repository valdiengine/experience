/**
 * PRICING-POLICY-1A — Declarative accommodation pricing policy
 *
 * Pure, dependency-free, side-effect-free contract handling for a declarative
 * accommodation pricing policy:
 *
 *   normalizePolicy  field-by-field normalization (unknown keys dropped)
 *   validatePolicy   structural + commercial validation
 *   freezePolicy     recursive immutable copy
 *   policyFingerprint stable canonical fingerprint over price-relevant fields
 *   resolvePolicy    absent vs malformed distinction
 *
 * Design constraints for this slice:
 *   - No DB, no network, no filesystem, no runtime startup, no side effects.
 *   - No product names, slugs, or monetary literals: every product-specific
 *     value (including all tariff amounts) is supplied by the caller.
 *   - Present-but-malformed is a hard failure and is never silently degraded
 *     into an "absent" (unpriced) policy.
 *   - Absence is representable and distinguishable from malformed input.
 *
 * MONEY CONTRACT
 *   Amounts are integer CURRENCY UNITS, not minor units. The current Ensueño
 *   declaration is in CLP, a currency with no minor unit, so an amount denotes
 *   whole pesos. There is no minor-unit scaling, no decimal exponent, and no
 *   currency conversion anywhere in this module: a `rates` entry is the literal
 *   per-night figure in the policy's declared currency. (No specific figure is
 *   written here on purpose; every amount is supplied by the caller.)
 *
 *   What this module does NOT claim, and what activation must still settle:
 *     - No persistence type is chosen here. Storing these integers in a DECIMAL
 *       column, and validating that a chosen range/conversion cannot lose
 *       precision, remains an activation concern.
 *     - No other currency is assumed to work. The engine validates only the
 *       three-uppercase-letter shape of a currency code; it does not verify
 *       that the code is a supported ISO currency, and it does not verify that
 *       the currency has the exponent the amount implies.
 *
 *   PRICING_MAX_SAFE_AMOUNT is an arithmetic guard (Number.MAX_SAFE_INTEGER),
 *   not a monetary scale.
 */

export const PRICING_BASIS = Object.freeze({
  ACCOMMODATION_PER_NIGHT: 'accommodation_per_night',
})

export const PRICING_SCHEMA_VERSION = 1

/** Guards every monetary/total computation. */
export const PRICING_MAX_SAFE_AMOUNT = Number.MAX_SAFE_INTEGER

export class PricingPolicyError extends Error {
  constructor(message, code = 'INVALID_PRICING_POLICY') {
    super(message)
    this.name = 'PricingPolicyError'
    this.code = code
  }
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Number.isInteger alone accepts magnitudes far beyond 2^53-1 (for example
 * 1e300 is an "integer"), which would then lose precision in arithmetic.
 * Every count, bound, and amount therefore has to be a SAFE integer.
 */
function isNonNegativeInteger(value) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

function isPositiveInteger(value) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
}

/**
 * Keys that would either mutate an object prototype or resolve to an inherited
 * property rather than a declared rate. They are refused as identifiers, and
 * rate maps are built prototype-free so a `__proto__` tier key is captured as
 * data (and then rejected by validation) instead of silently reassigning a
 * prototype.
 */
const FORBIDDEN_IDENTIFIER_KEYS = Object.freeze(['__proto__', 'constructor', 'prototype'])

function isForbiddenIdentifier(value) {
  return typeof value === 'string' && FORBIDDEN_IDENTIFIER_KEYS.includes(value)
}

/** Assigns an own data property, so a "__proto__" key cannot hit the setter. */
function setOwn(target, key, value) {
  Object.defineProperty(target, key, {
    value,
    writable: true,
    enumerable: true,
    configurable: true,
  })
}

function hasOwn(target, key) {
  return Object.prototype.hasOwnProperty.call(target, key)
}

const CURRENCY_PATTERN = /^[A-Z]{3}$/
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

/** A real 24-hour HH:MM clock value: 00-23 hours, 00-59 minutes. */
function isValidClockTime(value) {
  return typeof value === 'string' && TIME_PATTERN.test(value)
}

/**
 * Recursively freezes a value in place and returns it.
 * Used only on structures this module itself created via normalizePolicy, so no
 * caller-owned object is ever mutated or frozen.
 */
export function deepFreeze(value) {
  if (Array.isArray(value)) {
    for (const item of value) deepFreeze(item)
    return Object.freeze(value)
  }
  if (isPlainObject(value)) {
    for (const key of Object.keys(value)) deepFreeze(value[key])
    return Object.freeze(value)
  }
  return value
}

/**
 * Produces a fresh, deep, mutable copy so the returned policy never aliases
 * caller input and can be frozen without affecting the caller.
 */
export function copyPolicy(policy) {
  if (Array.isArray(policy)) return policy.map(copyPolicy)
  if (isPlainObject(policy)) {
    const copy = {}
    for (const key of Object.keys(policy)) setOwn(copy, key, copyPolicy(policy[key]))
    return copy
  }
  return policy
}

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : null
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return []
  const out = []
  for (const item of value) {
    const text = normalizeString(item)
    if (text !== null && text !== '' && !out.includes(text)) out.push(text)
  }
  return out
}

function normalizeTier(raw) {
  return {
    id: normalizeString(raw?.id),
    fromGuests: typeof raw?.fromGuests === 'number' ? raw.fromGuests : null,
    toGuests: typeof raw?.toGuests === 'number' ? raw.toGuests : null,
  }
}

function normalizeOption(raw) {
  // Prototype-free so a "__proto__" tier key is stored as ordinary data rather
  // than reassigning this object's prototype. Validation refuses it afterwards.
  const rates = Object.create(null)
  if (isPlainObject(raw?.rates)) {
    for (const tierId of Object.keys(raw.rates)) {
      if (!hasOwn(raw.rates, tierId)) continue
      const amount = raw.rates[tierId]
      setOwn(rates, tierId, typeof amount === 'number' ? amount : null)
    }
  }
  return {
    id: normalizeString(raw?.id),
    label: normalizeString(raw?.label),
    inclusions: normalizeStringArray(raw?.inclusions),
    rates,
  }
}

/**
 * Distinguishes a legitimately omitted optional object from one that was
 * present but structurally wrong.
 *
 * `undefined` and `null` are omission. Anything else that is not a plain object
 * (a string, number, array, boolean) is recorded as malformed rather than
 * degraded to null, so a broken declaration fails validation instead of
 * quietly becoming "no additional-guest terms" and under-charging occupancy.
 */
function normalizeOptionalObject(value, path) {
  if (value === undefined || value === null) return null
  if (!isPlainObject(value)) {
    return { __malformed: `${path} must be a plain object, received ${describeValue(value)}` }
  }
  return value
}

function describeValue(value) {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'an array'
  return typeof value
}

/**
 * Field-by-field normalization. Unknown keys are dropped; every monetary value
 * is type-preserving (a non-number stays null so validation reports it rather
 * than being silently coerced to 0).
 */
export function normalizePolicy(raw) {
  if (!isPlainObject(raw)) {
    throw new PricingPolicyError('Pricing policy must be a plain object', 'POLICY_NOT_OBJECT')
  }

  const rawAdditional = normalizeOptionalObject(raw.additionalGuests, 'additionalGuests')
  let additionalGuests = null

  if (rawAdditional !== null && rawAdditional.__malformed) {
    additionalGuests = { __malformed: rawAdditional.__malformed }
  } else if (rawAdditional !== null) {
    const rawCondition = normalizeOptionalObject(
      rawAdditional.condition,
      'additionalGuests.condition'
    )
    additionalGuests = {
      threshold: typeof rawAdditional.threshold === 'number' ? rawAdditional.threshold : null,
      ratePerGuestPerNight:
        typeof rawAdditional.ratePerGuestPerNight === 'number'
          ? rawAdditional.ratePerGuestPerNight
          : null,
      condition:
        rawCondition === null
          ? null
          : rawCondition.__malformed
            ? { __malformed: rawCondition.__malformed }
            : {
                text: normalizeString(rawCondition.text),
                fromGuest:
                  typeof rawCondition.fromGuest === 'number' ? rawCondition.fromGuest : null,
              },
    }
  }

  return {
    schemaVersion: typeof raw.schemaVersion === 'number' ? raw.schemaVersion : null,
    basis: normalizeString(raw.basis),
    currency: normalizeString(raw.currency),
    checkInTime: normalizeString(raw.checkInTime),
    checkOutTime: normalizeString(raw.checkOutTime),
    standardCapacity: typeof raw.standardCapacity === 'number' ? raw.standardCapacity : null,
    maxOccupancy: typeof raw.maxOccupancy === 'number' ? raw.maxOccupancy : null,
    tiers: Array.isArray(raw.tiers) ? raw.tiers.map(normalizeTier) : null,
    additionalGuests,
    options: Array.isArray(raw.options) ? raw.options.map(normalizeOption) : null,
  }
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validateTiers(tiers, errors) {
  if (!Array.isArray(tiers) || tiers.length === 0) {
    errors.push('tiers must be a non-empty array')
    return []
  }

  const seenTierIds = new Set()
  for (const tier of tiers) {
    if (!tier.id) {
      errors.push('every tier requires an id')
    } else if (isForbiddenIdentifier(tier.id)) {
      errors.push(`tier id "${tier.id}" is a reserved identifier key`)
    } else if (seenTierIds.has(tier.id)) {
      // Two tiers may share a name while remaining contiguous and
      // non-overlapping, but a shared id makes the rate map ambiguous: two
      // bands would map to one rate key.
      errors.push(`duplicate tier id "${tier.id}"`)
    } else {
      seenTierIds.add(tier.id)
    }
    if (!isPositiveInteger(tier.fromGuests)) errors.push(`tier "${tier.id}" requires a positive fromGuests`)
    if (!isPositiveInteger(tier.toGuests)) errors.push(`tier "${tier.id}" requires a positive toGuests`)
    if (isPositiveInteger(tier.fromGuests) && isPositiveInteger(tier.toGuests)) {
      if (tier.toGuests < tier.fromGuests) {
        errors.push(`tier "${tier.id}" has toGuests below fromGuests`)
      }
    }
  }

  // Ambiguity check: tiers must not overlap.
  const ordered = [...tiers]
    .filter((tier) => isPositiveInteger(tier.fromGuests) && isPositiveInteger(tier.toGuests))
    .sort((a, b) => a.fromGuests - b.fromGuests)

  for (let index = 1; index < ordered.length; index++) {
    const previous = ordered[index - 1]
    const current = ordered[index]
    if (current.fromGuests <= previous.toGuests) {
      errors.push(
        `tier coverage is ambiguous: "${current.id}" (${current.fromGuests}-${current.toGuests}) ` +
        `overlaps "${previous.id}" (${previous.fromGuests}-${previous.toGuests})`
      )
    }
  }

  return ordered
}

function validateOptions(options, orderedTiers, errors) {
  if (!Array.isArray(options) || options.length === 0) {
    errors.push('options must be a non-empty array')
    return []
  }

  const seen = new Set()
  for (const option of options) {
    if (!option.id) {
      errors.push('every option requires an id')
      continue
    }
    if (isForbiddenIdentifier(option.id)) {
      errors.push(`option id "${option.id}" is a reserved identifier key`)
    }
    if (seen.has(option.id)) errors.push(`duplicate option id "${option.id}"`)
    seen.add(option.id)

    if (option.label === null) {
      errors.push(`option "${option.id}" requires a label`)
    } else if (option.label.trim() === '') {
      errors.push(`option "${option.id}" requires a nonblank label`)
    }

    for (const tier of orderedTiers) {
      if (!tier.id) continue
      // Own-property check: an inherited member such as "constructor" is not a
      // declared rate and must not satisfy coverage.
      if (!hasOwn(option.rates, tier.id)) {
        errors.push(`option "${option.id}" is missing a rate for tier "${tier.id}"`)
        continue
      }
      const amount = option.rates[tier.id]
      if (amount === null || !isNonNegativeInteger(amount)) {
        errors.push(`option "${option.id}" tier "${tier.id}" rate must be a nonnegative integer`)
      } else if (amount > PRICING_MAX_SAFE_AMOUNT) {
        errors.push(`option "${option.id}" tier "${tier.id}" rate exceeds the safe integer range`)
      }
    }
  }

  return options
}

/**
 * Validates a normalized policy. Throws PricingPolicyError on any defect.
 * A policy that is structurally sound but commercially permissive (for example
 * maxOccupancy equal to standardCapacity) is accepted: this module implements
 * only the nightly occupancy-tier model and does not require extra-guest
 * headroom to exist.
 */
export function validatePolicy(policy) {
  const errors = []

  if (!isPlainObject(policy)) {
    throw new PricingPolicyError('Pricing policy must be a plain object', 'POLICY_NOT_OBJECT')
  }

  // schemaVersion is mandatory and must be exactly the supported version. A
  // missing, null, or wrongly typed value is a defect, never a wildcard: a
  // policy that does not declare which contract it satisfies cannot be trusted
  // to be interpreted as this one.
  if (policy.schemaVersion === null || policy.schemaVersion === undefined) {
    errors.push(`schemaVersion is required and must be ${PRICING_SCHEMA_VERSION}`)
  } else if (typeof policy.schemaVersion !== 'number') {
    errors.push('schemaVersion must be a number')
  } else if (policy.schemaVersion !== PRICING_SCHEMA_VERSION) {
    errors.push(`unsupported schemaVersion ${policy.schemaVersion}`)
  }
  if (policy.basis !== PRICING_BASIS.ACCOMMODATION_PER_NIGHT) {
    errors.push(`basis must be "${PRICING_BASIS.ACCOMMODATION_PER_NIGHT}"`)
  }
  if (!policy.currency) {
    errors.push('currency is required')
  } else if (!CURRENCY_PATTERN.test(policy.currency)) {
    // Shape only. This does not assert that the code is a supported ISO
    // currency, nor that the currency's exponent matches the amounts.
    errors.push('currency must be exactly three uppercase ASCII letters')
  }

  if (policy.checkInTime !== null && !isValidClockTime(policy.checkInTime)) {
    errors.push('checkInTime must be a 24-hour HH:MM value between 00:00 and 23:59')
  }
  if (policy.checkOutTime !== null && !isValidClockTime(policy.checkOutTime)) {
    errors.push('checkOutTime must be a 24-hour HH:MM value between 00:00 and 23:59')
  }

  if (!isPositiveInteger(policy.standardCapacity)) {
    errors.push('standardCapacity must be a positive integer')
  }
  if (!isPositiveInteger(policy.maxOccupancy)) {
    errors.push('maxOccupancy must be a positive integer')
  }
  if (
    isPositiveInteger(policy.standardCapacity) &&
    isPositiveInteger(policy.maxOccupancy) &&
    policy.maxOccupancy < policy.standardCapacity
  ) {
    errors.push('maxOccupancy must not be below standardCapacity')
  }

  const orderedTiers = validateTiers(policy.tiers, errors)

  // Tiers describe the base rate bands. Occupancy above the additional-guest
  // threshold is priced by the additional-guest rule, not by a wider tier, so
  // a tier must not extend past that threshold.
  if (isPositiveInteger(policy.standardCapacity)) {
    for (const tier of orderedTiers) {
      if (tier.toGuests > policy.standardCapacity) {
        errors.push(
          `tier "${tier.id}" extends above standardCapacity (${policy.standardCapacity}); ` +
          'occupancy above the threshold is priced by additionalGuests'
        )
      }
    }

    // Tiers must cover [1, standardCapacity] contiguously: the base rate must
    // be resolvable for every guest count up to the threshold.
    let expectedFrom = 1
    for (const tier of orderedTiers) {
      if (!isPositiveInteger(tier.fromGuests) || !isPositiveInteger(tier.toGuests)) continue
      if (tier.fromGuests !== expectedFrom) {
        errors.push(
          `tier coverage has a gap or overlap at guest ${expectedFrom}: ` +
          `next tier "${tier.id}" starts at ${tier.fromGuests}`
        )
        break
      }
      expectedFrom = tier.toGuests + 1
    }
    if (expectedFrom <= policy.standardCapacity) {
      errors.push(
        `tier coverage stops at guest ${expectedFrom - 1} but standardCapacity is ${policy.standardCapacity}`
      )
    }
  }

  // Permitting occupancy above the standard sleeping capacity without the
  // additional-guest mechanism would silently under-charge those guests.
  if (
    isPositiveInteger(policy.standardCapacity) &&
    isPositiveInteger(policy.maxOccupancy) &&
    policy.maxOccupancy > policy.standardCapacity &&
    policy.additionalGuests === null
  ) {
    errors.push(
      'additionalGuests is required when maxOccupancy exceeds standardCapacity'
    )
  }

  validateOptions(policy.options, orderedTiers, errors)

  // Additional-guest terms: optional as a whole, but validated atomically when
  // present. maxOccupancy above standardCapacity does not itself require it,
  // and its absence is not an error for an equal-capacity policy.
  if (policy.additionalGuests !== null && policy.additionalGuests.__malformed) {
    errors.push(policy.additionalGuests.__malformed)
  } else if (policy.additionalGuests !== null) {
    if (!isNonNegativeInteger(policy.additionalGuests.threshold)) {
      errors.push('additionalGuests.threshold must be a nonnegative integer')
    }
    if (!isNonNegativeInteger(policy.additionalGuests.ratePerGuestPerNight)) {
      errors.push('additionalGuests.ratePerGuestPerNight must be a nonnegative integer')
    } else if (policy.additionalGuests.ratePerGuestPerNight > PRICING_MAX_SAFE_AMOUNT) {
      errors.push('additionalGuests.ratePerGuestPerNight exceeds the safe integer range')
    }
    if (
      isPositiveInteger(policy.standardCapacity) &&
      isNonNegativeInteger(policy.additionalGuests.threshold) &&
      policy.additionalGuests.threshold !== policy.standardCapacity
    ) {
      errors.push('additionalGuests.threshold must match standardCapacity')
    }
    const condition = policy.additionalGuests.condition
    if (condition !== null && condition.__malformed) {
      errors.push(condition.__malformed)
    } else if (condition !== null) {
      if (condition.text === null) {
        errors.push('additionalGuests.condition.text is required when a condition is declared')
      } else if (condition.text.trim() === '') {
        errors.push('additionalGuests.condition.text must be nonblank when a condition is declared')
      }
      if (!isPositiveInteger(condition.fromGuest)) {
        errors.push('additionalGuests.condition.fromGuest must be a positive integer')
      } else if (
        isNonNegativeInteger(policy.additionalGuests.threshold) &&
        isPositiveInteger(policy.maxOccupancy)
      ) {
        // The condition must describe a guest who is actually an additional
        // guest, and it must be reachable within the declared occupancy range.
        // A condition starting at or below the threshold would apply to guests
        // who pay no additional charge; one above maxOccupancy could never
        // apply at all.
        if (condition.fromGuest <= policy.additionalGuests.threshold) {
          errors.push(
            `additionalGuests.condition.fromGuest (${condition.fromGuest}) must be greater than ` +
            `the additional-guest threshold (${policy.additionalGuests.threshold})`
          )
        }
        if (condition.fromGuest > policy.maxOccupancy) {
          errors.push(
            `additionalGuests.condition.fromGuest (${condition.fromGuest}) exceeds maxOccupancy ` +
            `(${policy.maxOccupancy}) and could never apply`
          )
        }
      }
    }
  }

  if (errors.length > 0) {
    throw new PricingPolicyError(
      `Invalid pricing policy: ${errors.join('; ')}`,
      'INVALID_PRICING_POLICY'
    )
  }

  return policy
}

/**
 * Resolves a raw declaration into a validated, recursively frozen policy.
 *
 * Returns a discriminated result so absence stays distinguishable from
 * malformation:
 *   { status: 'absent' }                     -> no policy declared
 *   { status: 'valid', policy, fingerprint } -> usable
 *   { status: 'invalid', error }             -> declared but defective
 */
export function resolvePolicy(raw) {
  if (raw === undefined || raw === null) {
    return Object.freeze({ status: 'absent', policy: null, fingerprint: null })
  }

  let normalized
  try {
    normalized = normalizePolicy(raw)
  } catch (error) {
    return Object.freeze({
      status: 'invalid',
      policy: null,
      fingerprint: null,
      error: error instanceof PricingPolicyError
        ? error
        : new PricingPolicyError(String(error?.message || error), 'INVALID_PRICING_POLICY'),
    })
  }

  try {
    validatePolicy(normalized)
  } catch (error) {
    return Object.freeze({
      status: 'invalid',
      policy: null,
      fingerprint: null,
      error: error instanceof PricingPolicyError
        ? error
        : new PricingPolicyError(String(error?.message || error), 'INVALID_PRICING_POLICY'),
    })
  }

  const frozen = deepFreeze(copyPolicy(normalized))
  return Object.freeze({
    status: 'valid',
    policy: frozen,
    fingerprint: policyFingerprint(frozen),
  })
}

// ---------------------------------------------------------------------------
// Fingerprint
// ---------------------------------------------------------------------------

/**
 * Canonical identity of a policy: every field that can change a computed amount
 * or an obligation attached to the resulting price.
 *
 * INCLUDED, because each can change the commercial terms without moving a rate:
 *   - schemaVersion: a different contract is a different commercial agreement,
 *     even at identical rates.
 *   - checkInTime / checkOutTime: arrival and departure deadlines are terms the
 *     guest accepts, so changing them is a change to the deal, not to cosmetics.
 *   - option inclusions: what the guest actually receives for the amount. This
 *     is the hot-tub distinction: the two options are priced differently and
 *     deliver differently, and the delivered set is the obligation.
 *   - additionalGuests.condition.text and .fromGuest: the stated requirement and
 *     the guest count from which it applies. A guest charged an extra rate is
 *     entitled to know under which condition.
 *
 * EXCLUDED, documented boundary: option `label` and the policy's human-facing
 * wording. A label is display-only copy used where the option is presented, is
 * not part of what is agreed, and is routinely restyled or renamed without
 * touching price or obligations. Excluding it keeps a pure rename from
 * invalidating outstanding quotes. If a label ever becomes legally or
 * commercially operative, it belongs in the identity and this boundary must be
 * revisited.
 *
 * Sets whose order is not meaningful (tiers, options, rates, inclusions) are
 * sorted here, and every array is copied first, so the input is never mutated.
 */
export function canonicalPolicyForm(policy) {
  const options = (policy.options || []).map((option) => ({
    id: option.id,
    inclusions: [...(option.inclusions || [])].sort(compareStrings),
    rates: Object.keys(option.rates || {})
      .sort(compareStrings)
      .map((tierId) => [tierId, option.rates[tierId]]),
  }))
  options.sort((a, b) => compareStrings(a.id, b.id))

  const tiers = (policy.tiers || []).map((tier) => [tier.id, tier.fromGuests, tier.toGuests])
  tiers.sort((a, b) => compareStrings(a[0], b[0]))

  const additional = policy.additionalGuests
    ? {
        threshold: policy.additionalGuests.threshold,
        ratePerGuestPerNight: policy.additionalGuests.ratePerGuestPerNight,
        condition: policy.additionalGuests.condition
          ? {
              text: policy.additionalGuests.condition.text,
              fromGuest: policy.additionalGuests.condition.fromGuest,
            }
          : null,
      }
    : null

  // Key order is fixed by the object literals below, so JSON.stringify renders
  // a byte-stable document regardless of the order fields arrived in.
  return {
    schemaVersion: policy.schemaVersion,
    basis: policy.basis,
    currency: policy.currency,
    checkInTime: policy.checkInTime ?? null,
    checkOutTime: policy.checkOutTime ?? null,
    standardCapacity: policy.standardCapacity,
    maxOccupancy: policy.maxOccupancy,
    tiers,
    additionalGuests: additional,
    options,
  }
}

function compareStrings(a, b) {
  if (a === b) return 0
  return a < b ? -1 : 1
}

/**
 * Deterministic revision identifier for a policy, rendered as 16 lowercase hex
 * characters.
 *
 * WHAT THIS IS: a stable content-derived id, so two processes can tell whether
 * they are looking at the same terms. Two policies with the same fingerprint
 * have the same canonical identity.
 *
 * WHAT THIS IS NOT: it is not a signature, a MAC, a token, or any form of
 * authorization or acceptance. FNV-1a is unkeyed and trivially recomputable by
 * anyone holding the policy, so it proves nothing about provenance and nothing
 * about who agreed to what. It must never be used to decide that a quote or
 * booking is authentic, unchanged since issuance, or approved. Anything with
 * those requirements needs a keyed construction in the activation slice; none is
 * introduced here.
 *
 * The hash is FNV-1a 64-bit over a canonical JSON document, using BigInt for
 * exact 64-bit arithmetic. The input is JSON.stringify of an explicitly ordered
 * canonical structure, never delimiter-concatenated identifiers: JSON quoting
 * and escaping keep a value that contains a separator from colliding with the
 * boundaries between fields.
 */
export function policyFingerprint(policy) {
  const text = JSON.stringify(canonicalPolicyForm(policy))

  // FNV-1a 64-bit using BigInt for exact 64-bit arithmetic.
  const PRIME = 0x100000001b3n
  const MASK = 0xffffffffffffffffn
  let hash = 0xcbf29ce484222325n
  for (let index = 0; index < text.length; index++) {
    hash ^= BigInt(text.charCodeAt(index))
    hash = (hash * PRIME) & MASK
  }

  return hash.toString(16).padStart(16, '0')
}

export default {
  PRICING_BASIS,
  PRICING_SCHEMA_VERSION,
  PRICING_MAX_SAFE_AMOUNT,
  PricingPolicyError,
  deepFreeze,
  copyPolicy,
  normalizePolicy,
  validatePolicy,
  resolvePolicy,
  canonicalPolicyForm,
  policyFingerprint,
}
