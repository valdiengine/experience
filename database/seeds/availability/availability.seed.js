/**
 * Availability Seed — Ensueño Cabina (90 nights)
 *
 * ENSUEÑO POSTGRES — M3
 *
 * Generates exactly 90 availability nights for Cabaña Ensueño:
 *   2026-10-01 inclusive .. 2026-12-29 inclusive.
 *   (31 days October + 30 days November + 29 days December = 90)
 *
 * Idempotency contract (enforced by SeedRunner.processAvailability):
 * reruns must NEVER overwrite operational state on an existing row
 * (reserved_count, status, is_blocked). Existing rows are skipped.
 *
 * Schema mapping notes (source of truth: database/schema/business/index.js):
 *   - `tenantSlug` / `accommodationSlug` are resolved to persisted UUIDs by
 *     the SeedRunner; each inserted row sets tenant_id and
 *     accommodation_id/target_id to those real UUIDs. The availability `id`
 *     is left to PostgreSQL (gen_random_uuid default).
 *   - `price` maps to the jsonb price column ({raw, currency}); `capacity`
 *     maps to the jsonb metadata column.
 *   - UNIQUE(accommodation_id, date) is respected (one row per night).
 */

const ONE_DAY_MS = 86_400_000

export const ENSUENO_AVAILABILITY_ACCOMMODATION_SLUG = 'cabina-ensueno'
export const ENSUENO_AVAILABILITY_TENANT_SLUG = 'ensueno-curinanco'
export const ENSUENO_AVAILABILITY_START_DATE = '2026-10-01'
export const ENSUENO_AVAILABILITY_END_DATE = '2026-12-29'
export const ENSUENO_AVAILABILITY_NIGHT_COUNT = 90
export const ENSUENO_AVAILABILITY_INVENTORY = 4
export const ENSUENO_AVAILABILITY_RESERVED_COUNT = 0
export const ENSUENO_AVAILABILITY_PRICE = 90000
export const ENSUENO_AVAILABILITY_CURRENCY = 'CLP'

/**
 * Build the 90-night availability records.
 * UTC-based date loop: immune to local timezone drift.
 */
export function buildAvailabilitySeed() {
  const start = Date.parse(`${ENSUENO_AVAILABILITY_START_DATE}T00:00:00Z`)
  const records = []

  for (let i = 0; i < ENSUENO_AVAILABILITY_NIGHT_COUNT; i++) {
    const date = new Date(start + i * ONE_DAY_MS).toISOString().slice(0, 10)

    records.push({
      tenantSlug: ENSUENO_AVAILABILITY_TENANT_SLUG,
      accommodationSlug: ENSUENO_AVAILABILITY_ACCOMMODATION_SLUG,
      date,
      status: 'available',
      isBlocked: false,
      isReserved: false,
      inventory: ENSUENO_AVAILABILITY_INVENTORY,
      reservedCount: ENSUENO_AVAILABILITY_RESERVED_COUNT,
      targetType: 'accommodation',
      price: {
        raw: ENSUENO_AVAILABILITY_PRICE,
        currency: ENSUENO_AVAILABILITY_CURRENCY,
      },
      metadata: {
        capacity: ENSUENO_AVAILABILITY_INVENTORY,
      },
    })
  }

  return records
}

export const AVAILABILITY_SEED = buildAvailabilitySeed()

export default AVAILABILITY_SEED