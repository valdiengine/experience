/**
 * P15.12.1 — Booking Capability Core
 *
 * Pure, DOM-free booking capability used by the booking public client
 * (web/business/booking/api/booking.api.js). Mirrors the quote capability
 * (web/business/quote/quote.capability.js) style: enabled flag, isolated
 * in-memory availability/reservation behavior, server-authoritative
 * confirmation codes, no internal-identifier handling at this layer.
 */

import { BookingValidationError } from './booking.errors.js'

export const BOOKING_CAPABILITY_NAME = 'booking'
export const BOOKING_CAPABILITY_VERSION = '1.0.0'

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== ''
}

export class BookingCapability {
  #configuration
  #enabled

  constructor(options = {}) {
    this.#configuration = options.configuration || { enabled: true }
    this.#enabled = this.#configuration.enabled !== false
  }

  isEnabled() {
    return this.#enabled
  }

  getConfiguration() {
    return { ...this.#configuration }
  }

  getCapabilityInfo() {
    return {
      name: BOOKING_CAPABILITY_NAME,
      version: BOOKING_CAPABILITY_VERSION,
      type: 'business',
      enabled: this.#enabled,
      configuration: this.getConfiguration()
    }
  }

  queryAvailability(request = {}) {
    const config = this.#configuration
    const slug = request.slug
    const checkIn = request.checkIn
    const checkOut = request.checkOut

    if (!isNonEmptyString(slug)) {
      throw new BookingValidationError('Company slug is required')
    }
    if (!isNonEmptyString(checkIn) || !isNonEmptyString(checkOut)) {
      throw new BookingValidationError('Check-in and check-out dates are required')
    }

    if (config.availabilityConflict === true) {
      return {
        ok: false,
        status: 409,
        code: 'AVAILABILITY_CONFLICT',
        error: 'AVAILABILITY_CONFLICT: No hay disponibilidad para las fechas solicitadas',
        recoverable: true
      }
    }

    return {
      ok: true,
      status: 200,
      data: {
        available: config.available !== false,
        price: typeof config.price === 'number' ? config.price : null,
        currency: isNonEmptyString(config.currency) ? config.currency : null,
        guestCount: typeof config.capacity === 'number' ? config.capacity : null,
        capacity: typeof config.capacity === 'number' ? config.capacity : null
      }
    }
  }

  createReservation(request = {}) {
    const config = this.#configuration
    const slug = request.slug
    const checkIn = request.checkIn
    const checkOut = request.checkOut
    const traveler = request.traveler || {}

    if (!isNonEmptyString(slug)) {
      throw new BookingValidationError('Company slug is required')
    }
    if (!isNonEmptyString(checkIn) || !isNonEmptyString(checkOut)) {
      throw new BookingValidationError('Check-in and check-out dates are required')
    }
    if (!isNonEmptyString(traveler.name)) {
      throw new BookingValidationError('El nombre del viajero es obligatorio')
    }

    if (config.reservationConflict === true) {
      return {
        ok: false,
        status: 409,
        code: 'AVAILABILITY_CONFLICT',
        error: 'AVAILABILITY_CONFLICT: La disponibilidad cambió. Elige otras fechas.',
        recoverable: true,
        isConflict: true
      }
    }

    const confirmationCode = isNonEmptyString(config.confirmationCode)
      ? config.confirmationCode
      : null

    return {
      ok: true,
      status: 201,
      data: {
        status: 'confirmed',
        ...(confirmationCode ? { confirmationCode } : {})
      }
    }
  }

  static getName() {
    return BOOKING_CAPABILITY_NAME
  }

  static getVersion() {
    return BOOKING_CAPABILITY_VERSION
  }
}

export function createBookingCapability(options = {}) {
  return new BookingCapability(options)
}

export default {
  BookingCapability,
  createBookingCapability,
  BOOKING_CAPABILITY_NAME,
  BOOKING_CAPABILITY_VERSION
}