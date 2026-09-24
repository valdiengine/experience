/**
 * P15.12.1 — Booking Capability Core
 *
 * Error types for booking operations.
 */

export const BOOKING_ERROR_CODES = Object.freeze({
  VALIDATION_ERROR: 'BOOKING_VALIDATION_ERROR',
  AVAILABILITY_ERROR: 'BOOKING_AVAILABILITY_ERROR',
  CONFLICT: 'BOOKING_CONFLICT'
})

export class BookingError extends Error {
  constructor(message, code = 'BOOKING_ERROR') {
    super(message)
    this.name = 'BookingError'
    this.code = code
  }
}

export class BookingValidationError extends BookingError {
  constructor(message) {
    super(message, BOOKING_ERROR_CODES.VALIDATION_ERROR)
    this.name = 'BookingValidationError'
  }
}

export class BookingAvailabilityError extends BookingError {
  constructor(message) {
    super(message, BOOKING_ERROR_CODES.AVAILABILITY_ERROR)
    this.name = 'BookingAvailabilityError'
  }
}

export default {
  BOOKING_ERROR_CODES,
  BookingError,
  BookingValidationError,
  BookingAvailabilityError
}