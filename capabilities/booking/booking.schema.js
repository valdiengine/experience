/**
 * Booking Capability — Schemas & Validation
 *
 * Business-agnostic: works for tours, restaurants, professionals, retail, B2B
 * These are DATA SCHEMAS only — no UI, no form, no calendar
 */
import { createSchema } from '../core/schema.js'

/**
 * Booking status enum
 */
export const BOOKING_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
  NO_SHOW: 'no_show',
}

/**
 * Booking entity schema
 */
export const BOOKING_SCHEMA = createSchema({
  id: 'booking',
  name: 'Booking',
  description: 'A booking/reservation/order entity',
  fields: {
    id: { type: 'string', required: true },
    tenantId: { type: 'string', required: true },
    status: { type: 'string', required: true, values: Object.values(BOOKING_STATUS) },
    customer: {
      type: 'object',
      required: true,
      fields: {
        name: { type: 'string', required: true },
        email: { type: 'string', required: false },
        phone: { type: 'string', required: false },
      },
    },
    items: { type: 'array', required: true, items: { type: 'object' } },
    metadata: { type: 'object', required: false },
    createdAt: { type: 'string', required: true },
    updatedAt: { type: 'string', required: false },
  },
})

/**
 * Booking item schema (business-agnostic)
 */
export const BOOKING_ITEM_SCHEMA = createSchema({
  id: 'booking_item',
  name: 'Booking Item',
  description: 'An item within a booking (product, service, time slot, etc.)',
  fields: {
    id: { type: 'string', required: true },
    type: { type: 'string', required: true },
    name: { type: 'string', required: true },
    quantity: { type: 'number', required: true, min: 1 },
    price: { type: 'number', required: false, min: 0 },
    metadata: { type: 'object', required: false },
  },
})

/**
 * Validate booking data against schema
 * @param {object} data - Booking data to validate
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateBooking(data) {
  return BOOKING_SCHEMA.validate(data)
}
