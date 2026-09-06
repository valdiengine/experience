/**
 * BOOKING-4.1: Accommodation Availability Target Identity
 *
 * Adds target_type and target_id columns to availability table.
 * These columns serve as a compatibility mirror for accommodationId during
 * the BOOKING-4.x transition, enabling future generalization of availability
 * targets beyond accommodations.
 *
 * NOTE: The target_type DEFAULT 'accommodation' is transitional BOOKING-4.1 behavior.
 * This default is NOT the final generic availability default.
 * Future migrations will introduce a proper generic target system.
 *
 * Migration: 0008_booking_availability_target_identity
 * Layer: business
 * Order: 7
 * Tables: availability
 */

export async function up(provider) {
  // STEP 0: Fail-fast preflight checks BEFORE any schema mutation
  await provider.execute(`
    -- Check 1: No orphan accommodation_id references
    DO $$
    DECLARE
      orphan_count INTEGER;
    BEGIN
      SELECT COUNT(*) INTO orphan_count
      FROM availability a
      LEFT JOIN accommodations acc ON acc.id = a.accommodation_id
      WHERE acc.id IS NULL AND a.accommodation_id IS NOT NULL;

      IF orphan_count > 0 THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: Found % orphan accommodation_id references', orphan_count;
      END IF;
    END $$;
  `)

  await provider.execute(`
    -- Check 2: No NULL accommodation_id rows
    DO $$
    DECLARE
      null_count INTEGER;
    BEGIN
      SELECT COUNT(*) INTO null_count FROM availability WHERE accommodation_id IS NULL;
      IF null_count > 0 THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: Found % rows with NULL accommodation_id', null_count;
      END IF;
    END $$;
  `)

  await provider.execute(`
    -- Check 3: No duplicate (accommodation_id, date) groups
    DO $$
    DECLARE
      dup_count INTEGER;
    BEGIN
      SELECT COUNT(*) INTO dup_count
      FROM (
        SELECT accommodation_id, date, COUNT(*) as cnt
        FROM availability
        WHERE accommodation_id IS NOT NULL
        GROUP BY accommodation_id, date
        HAVING COUNT(*) > 1
      ) duplicates;

      IF dup_count > 0 THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: Found % duplicate (accommodation_id, date) groups', dup_count;
      END IF;
    END $$;
  `)

  await provider.execute(`
    -- Check 4: No date format violations (must be YYYY-MM-DD)
    DO $$
    DECLARE
      bad_date_count INTEGER;
    BEGIN
      SELECT COUNT(*) INTO bad_date_count
      FROM availability
      WHERE date IS NOT NULL
        AND date !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$';

      IF bad_date_count > 0 THEN
        RAISE EXCEPTION 'PREFLIGHT FAILED: Found % rows with invalid date format', bad_date_count;
      END IF;
    END $$;
  `)

  // STEP 1: Add columns with transitional default
  await provider.execute(`
    ALTER TABLE availability
    ADD COLUMN target_type VARCHAR(50) NOT NULL DEFAULT 'accommodation';
  `)

  await provider.execute(`
    ALTER TABLE availability
    ADD COLUMN target_id UUID NULL;
  `)

  // STEP 2: Backfill target identity mirror
  await provider.execute(`
    UPDATE availability
    SET target_type = 'accommodation',
        target_id = accommodation_id
    WHERE target_id IS NULL
      AND accommodation_id IS NOT NULL;
  `)

  // STEP 3: Verify backfill completeness
  await provider.execute(`
    -- Verify target_id NULL count = 0
    DO $$
    DECLARE
      null_target_id_count INTEGER;
    BEGIN
      SELECT COUNT(*) INTO null_target_id_count
      FROM availability
      WHERE target_id IS NULL AND accommodation_id IS NOT NULL;

      IF null_target_id_count > 0 THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: Found % rows with NULL target_id (expected 0)', null_target_id_count;
      END IF;
    END $$;
  `)

  await provider.execute(`
    -- Verify accommodation mirror matches (no mismatches)
    DO $$
    DECLARE
      mismatch_count INTEGER;
    BEGIN
      SELECT COUNT(*) INTO mismatch_count
      FROM availability
      WHERE target_type <> 'accommodation'
         OR target_id IS DISTINCT FROM accommodation_id;

      IF mismatch_count > 0 THEN
        RAISE EXCEPTION 'VERIFICATION FAILED: Found % accommodation mirror mismatches (expected 0)', mismatch_count;
      END IF;
    END $$;
  `)

  // STEP 4: Harden target_id to NOT NULL
  await provider.execute(`
    ALTER TABLE availability
    ALTER COLUMN target_id SET NOT NULL;
  `)
}

export async function down(provider) {
  // Safe schema rollback - do not alter accommodation data or historical availability rows
  await provider.execute(`
    ALTER TABLE availability
    DROP COLUMN IF EXISTS target_id;
  `)

  await provider.execute(`
    ALTER TABLE availability
    DROP COLUMN IF EXISTS target_type;
  `)
}

export async function validate(provider) {
  // Ensure columns exist with correct types
  const typeCol = await provider.execute(`
    SELECT data_type, column_default
    FROM information_schema.columns
    WHERE table_name = 'availability' AND column_name = 'target_type'
  `)

  const idCol = await provider.execute(`
    SELECT data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'availability' AND column_name = 'target_id'
  `)

  return {
    target_type: typeCol.rows?.[0] || null,
    target_id: idCol.rows?.[0] || null,
  }
}
