/**
 * P15.12.1 — Booking Public Client API (pure, DOM-free)
 *
 * Pure traveler-booking client used by the interactive booking widget
 * (public traveler mini-app) and by the Phase B-UI regression test.
 *
 * Design invariants (server-authoritative, recoverable, no codegen):
 *  1. Availability is ALWAYS queried through the server availability
 *     capability (GET .../companies/:slug/availability) — the client
 *     NEVER fabricates confirmation codes or availability results.
 *  2. Reservation confirmation (confirmationCode) is ALWAYS taken from
 *     the server reservation response — the client NEVER generates a
 *     confirmation code locally and NEVER invents a confirmation.
 *  3. The traveler payload sent to the server contains ONLY public
 *     traveler fields (checkIn, checkOut, traveler name, email, phone,
 *     guest count, notes). Internal identifiers (tenantId, businessId,
 *     accommodationId, destinationId) are NEVER built, echoed, sent, or
 *     rendered in traveler state.
 *  4. A 409 AVAILABILITY_CONFLICT from the server is RECOVERABLE: the
 *     widget returns to a re-usable availability state so the traveler
 *     can pick new dates / re-check — never a dead-end or fabricated retry.
 *
 * Mirrors web/business/quote/api/quote.api.js (QuoteAPI) which is the
 * committed, Node-importable pattern for public widget clients. This
 * module has NO browser/DOM/window references at module scope and is
 * importable directly from Node (used by web/mvp-booking-ui-1.test.js).
 */

import { createBookingCapability, BOOKING_CAPABILITY_NAME } from '../booking.capability.js'
import { BookingValidationError, BookingAvailabilityError } from '../booking.errors.js'

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function toSlug(value) {
  if (typeof value === 'string' && value) {
    return value
  }
  return null
}

function normalizeDates(dates) {
  if (!isObject(dates)) return null
  const checkIn = typeof dates.checkIn === 'string' ? dates.checkIn : null
  const checkOut = typeof dates.checkOut === 'string' ? dates.checkOut : null
  if (!checkIn || !checkOut) return null
  return { checkIn, checkOut }
}

function parsePrice(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return Number(value)
  }
  return null
}

function splitComment(comment = '') {
  const text = typeof comment === 'string' ? comment.trim() : ''
  return text.split(',')
    .map((part) => part.trim())
    .filter(Boolean)
}

export class BookingAPI {
  #capabilityFactory
  #options

  constructor(options = {}) {
    this.#options = Object.freeze({ ...options })
    this.#capabilityFactory = options.capabilityFactory ||
      ((config) => createBookingCapability({ configuration: config }))
  }

  /**
   * Query availability through the server capability.
   * state: available | unavailable | conflict | error
   */
  async handleAvailability(request) {
    const { applicationId, domain, route, company, destination, slug, dates, configuration } = request

    if (!applicationId) {
      return {
        success: false,
        error: 'Application ID is required',
        status: 400
      }
    }

    if (!configuration || typeof configuration !== 'object') {
      return {
        success: false,
        error: 'Booking configuration is required',
        status: 400
      }
    }

    if (!configuration.enabled) {
      return {
        success: false,
        error: 'Booking capability is not enabled',
        status: 403
      }
    }

    const resolvedSlug = toSlug(slug)
    if (!resolvedSlug) {
      return {
        success: false,
        error: 'Company slug is required',
        status: 400
      }
    }

    const normalizedDates = normalizeDates(dates)
    if (!normalizedDates) {
      return {
        success: false,
        error: 'Check-in and check-out dates are required',
        status: 400
      }
    }

    try {
      const capability = this.#capabilityFactory(configuration)

      if (!capability.isEnabled()) {
        return {
          success: false,
          error: 'Booking capability is not enabled',
          status: 403
        }
      }

      const context = {
        ...this.#contextPortion({ applicationId, domain, route, company, destination }),
        slug: resolvedSlug,
        source: 'booking-public-api'
      }

      const result = capability.queryAvailability({
        slug: resolvedSlug,
        checkIn: normalizedDates.checkIn,
        checkOut: normalizedDates.checkOut
      }, context)

      if (!result.ok) {
        return {
          success: false,
          ...this.#availabilityFailure(result),
          status: result.status || 503
        }
      }

      const data = result.data || {}
      const availability = {
        state: data.available === true ? 'available' : 'unavailable',
        slug: resolvedSlug,
        checkIn: normalizedDates.checkIn,
        checkOut: normalizedDates.checkOut,
        guestCount: data.guestCount || null,
        capacity: data.capacity || null,
        price: parsePrice(data.price),
        currency: typeof data.currency === 'string' ? data.currency : null
      }

      return {
        success: true,
        data: availability,
        status: 200
      }
    } catch (error) {
      if (error instanceof BookingValidationError) {
        return {
          success: false,
          error: error.message,
          status: 400
        }
      }
      if (error instanceof BookingAvailabilityError) {
        return {
          success: false,
          error: error.message,
          status: 503
        }
      }
      throw error
    }
  }

  /**
   * Create a reservation. confirmationCode comes ONLY from the server.
   * state: confirmed (server) | unavailable | conflict (recoverable)
   */
  async handleReservation(request) {
    const { applicationId, domain, route, company, destination, slug, dates, traveler, configuration, requestId } = request

    if (!applicationId) {
      return {
        success: false,
        error: 'Application ID is required',
        status: 400
      }
    }

    if (!configuration || typeof configuration !== 'object') {
      return {
        success: false,
        error: 'Booking configuration is required',
        status: 400
      }
    }

    if (!configuration.enabled) {
      return {
        success: false,
        error: 'Booking capability is not enabled',
        status: 403
      }
    }

    const resolvedSlug = toSlug(slug)
    if (!resolvedSlug) {
      return {
        success: false,
        error: 'Company slug is required',
        status: 400
      }
    }

    const normalizedDates = normalizeDates(dates)
    if (!normalizedDates) {
      return {
        success: false,
        error: 'Check-in and check-out dates are required',
        status: 400
      }
    }

    if (!isObject(traveler)) {
      return {
        success: false,
        error: 'Traveler data is required',
        status: 400
      }
    }

    const travelerField = this.#normalizeTraveler(traveler)
    if (travelerField instanceof BookingValidationError) {
      return {
        success: false,
        error: travelerField.message,
        status: 400
      }
    }

    try {
      const capability = this.#capabilityFactory(configuration)

      if (!capability.isEnabled()) {
        return {
          success: false,
          error: 'Booking capability is not enabled',
          status: 403
        }
      }

      const context = {
        ...this.#contextPortion({ applicationId, domain, route, company, destination }),
        slug: resolvedSlug,
        source: 'booking-public-api',
        travelerId: this.#travelerResourceId(travelerField)
      }

      const result = capability.createReservation({
        slug: resolvedSlug,
        checkIn: normalizedDates.checkIn,
        checkOut: normalizedDates.checkOut,
        traveler: travelerField
      }, context)

      if (!result.ok) {
        if (result.isConflict === true || result.status === 409) {
          return {
            success: false,
            recoverable: true,
            state: 'conflict',
            error: result.error || 'La disponibilidad cambió. Reintenta con otras fechas.',
            status: 409
          }
        }
        if (result.status === 400) {
          return {
            success: false,
            error: result.error || 'Solicitud de reserva inválida',
            status: 400
          }
        }
        return {
          success: false,
          firstnameUnavailable: result.unavailable === true,
          state: result.unavailable === true ? 'unavailable' : null,
          error: result.error || 'No se pudo completar la reserva',
          status: result.status || 503
        }
      }

      const data = result.data || {}
      const confirmationCode = typeof data.confirmationCode === 'string' ? data.confirmationCode : null
      if (!confirmationCode) {
        return {
          success: false,
          error: 'El servidor no devolvió una confirmación válida',
          status: 502
        }
      }

      return {
        success: true,
        data: {
          confirmationCode,
          state: 'confirmed',
          slug: resolvedSlug,
          checkIn: normalizedDates.checkIn,
          checkOut: normalizedDates.checkOut,
          guestCount: travelerField.guestCount || null,
          travelerName: travelerField.name || null,
          status: data.status || 'confirmed'
        },
        status: result.status || 201
      }
    } catch (error) {
      if (error instanceof BookingValidationError) {
        return {
          success: false,
          error: error.message,
          status: 400
        }
      }
      throw error
    }
  }

  #contextPortion({ applicationId, domain, route, company, destination }) {
    return {
      applicationId: typeof applicationId === 'string' ? applicationId : null,
      domain: typeof domain === 'string' ? domain : null,
      route: typeof route === 'string' ? route : null,
      company: typeof company === 'string' ? company : null,
      destination: typeof destination === 'string' ? destination : null
    }
  }

  #availabilityFailure(result) {
    const parts = splitComment(result.error)
    const isConflict = result.status === 409 || parts.includes('AVAILABILITY_CONFLICT') ||
      parts.includes('UNSETTLED') || parts.some((p) => p.includes('conflict'))
    return {
      recoverable: result.recoverable === true || isConflict,
      state: isConflict ? 'conflict' : 'error',
      code: typeof result.code === 'string' ? result.code : null
    }
  }

  #normalizeTraveler(traveler) {
    const name = typeof traveler.name === 'string' && traveler.name.trim() ? traveler.name.trim() : null
    const email = typeof traveler.email === 'string' && traveler.email.trim() ? traveler.email.trim() : null
    const phone = typeof traveler.phone === 'string' && traveler.phone.trim() ? traveler.phone.trim() : null
    const guestCountRaw = typeof traveler.guestCount === 'number'
      ? traveler.guestCount
      : (typeof traveler.guestCount === 'string' ? Number(traveler.guestCount) : NaN)
    const guestCount = Number.isFinite(guestCountRaw) && guestCountRaw >= 1 ? Math.floor(guestCountRaw) : null
    const notes = typeof traveler.notes === 'string' ? traveler.notes.trim() : null

    if (!name) {
      return new BookingValidationError('El nombre del viajero es obligatorio')
    }
    if (!email && !phone) {
      return new BookingValidationError('Se requiere email o teléfono del viajero')
    }
    if (!guestCount) {
      return new BookingValidationError('El número de viajeros debe ser al menos 1')
    }

    return {
      name,
      email,
      phone,
      guestCount,
      notes: notes || null
    }
  }

  #travelerResourceId(traveler) {
    // Identifier for the booking row keyed by a public contact mechanism,
    // NEVER by tenant/business/accommodation/destination internal id.
    return traveler.email && /@/.test(traveler.email) ? `traveler:${traveler.email}` : `traveler:${traveler.phone || ''}`
  }
}

export function createBookingAPI(options = {}) {
  return new BookingAPI(options)
}

export default {
  BookingAPI,
  createBookingAPI,
  BOOKING_CAPABILITY_NAME
}
