/**
 * Reservation Schema — Business-agnostic data validation
 *
 * Uses createSchema() from core
 */
import { createSchema } from '../core/schema.js'
import { RESERVATION_STATUS_LIST } from './reservation.status.js'

export const RESERVATION_SCHEMA = createSchema({
  id: 'reservation',
  name: 'Reservation',
  description: 'A reservation entity',
  fields: {
    id: { type: 'string', required: true },
    tenantId: { type: 'string', required: true },
    businessId: { type: 'string', required: false },
    accommodationId: { type: 'string', required: false },
    visitorId: { type: 'string', required: false },
    resourceId: { type: 'string', required: true },
    status: { type: 'string', required: true, values: RESERVATION_STATUS_LIST },
    customer: {
      type: 'object',
      required: true,
      fields: {
        name: { type: 'string', required: true },
        email: { type: 'string', required: false },
        phone: { type: 'string', required: false },
        channelPreference: { type: 'string', required: false },
      },
    },
    dates: {
      type: 'object',
      required: true,
      fields: {
        checkIn: { type: 'string', required: true },
        checkOut: { type: 'string', required: true },
      },
    },
    guests: { type: 'number', required: false, min: 1 },
    totalPrice: { type: 'number', required: false, min: 0 },
    currency: { type: 'string', required: false },
    source: { type: 'string', required: false },
    channel: { type: 'string', required: false },
    confirmationCode: { type: 'string', required: false },
    notes: { type: 'string', required: false },
    metadata: { type: 'object', required: false },
    createdAt: { type: 'string', required: true },
    updatedAt: { type: 'string', required: false },
    confirmedAt: { type: 'string', required: false },
    checkedInAt: { type: 'string', required: false },
    checkedOutAt: { type: 'string', required: false },
    completedAt: { type: 'string', required: false },
    cancelledAt: { type: 'string', required: false },
  },
})

export const CUSTOMER_SCHEMA = createSchema({
  id: 'customer',
  name: 'Customer',
  description: 'Customer information',
  fields: {
    name: { type: 'string', required: true },
    email: { type: 'string', required: false },
    phone: { type: 'string', required: false },
    country: { type: 'string', required: false },
    notes: { type: 'string', required: false },
    channelPreference: { type: 'string', required: false },
  },
})

export const DATES_SCHEMA = createSchema({
  id: 'dates',
  name: 'Dates',
  description: 'Reservation date range',
  fields: {
    checkIn: { type: 'string', required: true },
    checkOut: { type: 'string', required: true },
  },
})

export function validateReservation(data) {
  return RESERVATION_SCHEMA.validate(data)
}

export function validateCustomer(data) {
  return CUSTOMER_SCHEMA.validate(data)
}

export function validateDates(data) {
  return DATES_SCHEMA.validate(data)
}
