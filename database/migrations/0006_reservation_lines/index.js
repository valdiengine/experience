/**
 * Migration: 0006_reservation_lines
 * Layer: Business (Layer 5)
 * Tables: reservation_lines
 * Dependencies: 0005_business_layer (reservations)
 */

export async function up(provider) {
  await provider.execute(`
    CREATE TABLE IF NOT EXISTS reservation_lines (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
      line_order INTEGER DEFAULT 1,
      target_type VARCHAR(50) NOT NULL,
      target_id UUID NOT NULL,
      temporal JSONB NOT NULL,
      quantity INTEGER DEFAULT 1,
      unit_price DECIMAL(12, 2),
      line_total DECIMAL(12, 2),
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_reservation_line_reservation ON reservation_lines(reservation_id);
    CREATE INDEX IF NOT EXISTS idx_reservation_line_target ON reservation_lines(target_type, target_id);
  `)
}

export async function down(provider) {
  await provider.execute(`
    DROP TABLE IF EXISTS reservation_lines;
  `)
}