/**
 * BOOKING-4.3: Atomic Capacity and Double-Booking Protection
 *
 * Adds released_at column to reservation_lines table for idempotent release tracking.
 * This enables safe, non-destructive release of committed availability capacity
 * within a single PostgreSQL transaction.
 *
 * Migration: 0009_reservation_lines_release_tracking
 * Layer: business
 * Order: 8
 * Tables: reservation_lines
 * Dependencies: 0008_booking_availability_target_identity
 */

export async function up(provider) {
  await provider.execute(`
    ALTER TABLE reservation_lines
    ADD COLUMN released_at TIMESTAMPTZ NULL;
  `)

  await provider.execute(`
    INSERT INTO _drizzle_migrations (name, hash, executed_at)
    VALUES ('0009_reservation_lines_release_tracking', gen_random_uuid(), NOW())
    ON CONFLICT DO NOTHING
  `)
}

export async function down(provider) {
  await provider.execute(`
    DELETE FROM _drizzle_migrations WHERE name = '0009_reservation_lines_release_tracking'
  `)

  await provider.execute(`
    ALTER TABLE reservation_lines DROP COLUMN IF EXISTS released_at;
  `)
}
