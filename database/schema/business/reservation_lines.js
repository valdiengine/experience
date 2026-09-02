import { pgTable, uuid, varchar, jsonb, integer, decimal, timestamp, index } from 'drizzle-orm/pg-core'
import { reservations } from './index.js'

export const reservationLines = pgTable(
  'reservation_lines',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    reservationId: uuid('reservation_id').notNull().references(() => reservations.id, { onDelete: 'cascade' }),
    lineOrder: integer('line_order').default(1),
    targetType: varchar('target_type', { length: 50 }).notNull(),
    targetId: uuid('target_id').notNull(),
    temporal: jsonb('temporal').notNull(),
    quantity: integer('quantity').default(1),
    unitPrice: decimal('unit_price', { precision: 12, scale: 2 }),
    lineTotal: decimal('line_total', { precision: 12, scale: 2 }),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_reservation_line_reservation').on(table.reservationId),
    index('idx_reservation_line_target').on(table.targetType, table.targetId),
  ],
)