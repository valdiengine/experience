import { BookingRegistry } from './booking.registry.js'
import { buildTravelerContext } from './traveler-context.js'
import { ReservationManager } from '../../capabilities/reservation/reservation.manager.js'
import { BusinessManager } from '../../capabilities/business/business.manager.js'
import { AvailabilityConflictError } from '../../capabilities/availability/availability.errors.js'

export class BookingValidationError extends Error {
  constructor(message) {
    super(message)
    this.name = 'BookingValidationError'
  }
}

function assertString(value, label) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new BookingValidationError(`${label} is required`)
  }
  return value.trim()
}

function serializeTraveler(data) {
  return {
    checkIn: typeof data.checkIn === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.checkIn) ? data.checkIn : null,
    checkOut: typeof data.checkOut === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.checkOut) ? data.checkOut : null,
    guestName: typeof data.guestName === 'string' ? data.guestName.trim() : '',
    guestEmail: typeof data.guestEmail === 'string' ? data.guestEmail.trim() : '',
    guestPhone: typeof data.guestPhone === 'string' ? data.guestPhone.trim() : '',
    guestCount: Number.isFinite(Number(data.guestCount)) && Number(data.guestCount) >= 1 ? Math.floor(Number(data.guestCount)) : 1,
    notes: typeof data.notes === 'string' ? data.notes.trim() : '',
  }
}

function validateTraveler(traveler) {
  if (!traveler.checkIn) throw new BookingValidationError('checkIn (YYYY-MM-DD) is required')
  if (!traveler.checkOut) throw new BookingValidationError('checkOut (YYYY-MM-DD) is required')
  if (!traveler.guestName) throw new BookingValidationError('guestName is required')
  if (traveler.checkIn >= traveler.checkOut) throw new BookingValidationError('checkOut must be after checkIn')
}

export function resolveBusinessError(error) {
  if (error instanceof AvailabilityConflictError || error?.name === 'AvailabilityConflictError') {
    return { ok: false, status: 409, code: 'AVAILABILITY_CONFLICT', error: error.message }
  }
  if (error instanceof BookingValidationError || error?.name === 'BookingValidationError') {
    return { ok: false, status: 400, code: 'INVALID_REQUEST', error: error.message }
  }
  if (error && typeof error.message === 'string' && error.message.startsWith('Missing permission:')) {
    return { ok: false, status: 403, code: 'FORBIDDEN', error: error.message }
  }
  throw error
}

export class BookingAdapter {
  #registry
  #baseContext

  constructor(baseContext, registry = null) {
    this.#baseContext = baseContext
    this.#registry = registry
  }

  get #bookingRegistry() {
    return this.#registry || new BookingRegistry()
  }

  resolveCompany(companySlug) {
    return this.#bookingRegistry.resolveBookingTarget(companySlug)
  }

  async queryAvailability(companySlug, { checkIn, checkOut } = {}) {
    const resolved = this.resolveCompany(companySlug)
    if (!resolved.ok) {
      return { ok: false, status: resolved.status, code: resolved.state.toUpperCase(), error: resolved.error }
    }

    if (typeof checkIn !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(checkIn)) {
      throw new BookingValidationError('checkIn (YYYY-MM-DD) is required')
    }
    if (typeof checkOut !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(checkOut)) {
      throw new BookingValidationError('checkOut (YYYY-MM-DD) is required')
    }

    const { scopedContext, identity } = buildTravelerContext(this.#baseContext, resolved.target)
    const scopedReservationManager = new ReservationManager(scopedContext)
    const scopedBusinessManager = new BusinessManager(scopedContext, scopedReservationManager)

    let availability
    try {
      availability = await scopedBusinessManager.getBusinessAvailability(resolved.target.businessId, checkIn, checkOut, identity)
    } catch (error) {
      return resolveBusinessError(error)
    }

    const calendar = Array.isArray(availability?.results?.[resolved.target.accommodationId])
      ? availability.results[resolved.target.accommodationId]
      : []

    return {
      ok: true,
      status: 200,
      data: serializeAvailabilityPayload(companySlug, { checkIn, checkOut }, calendar),
    }
  }

  async createReservation(companySlug, rawData = {}) {
    const resolved = this.resolveCompany(companySlug)
    if (!resolved.ok) {
      return { ok: false, status: resolved.status, code: resolved.state.toUpperCase(), error: resolved.error }
    }

    const traveler = serializeTraveler(rawData)
    validateTraveler(traveler)

    const { scopedContext, identity } = buildTravelerContext(this.#baseContext, resolved.target)
    const scopedReservationManager = new ReservationManager(scopedContext)
    const scopedBusinessManager = new BusinessManager(scopedContext, scopedReservationManager)

    const request = {
      accommodationId: resolved.target.accommodationId,
      customer: {
        name: traveler.guestName,
        email: traveler.guestEmail || null,
        phone: traveler.guestPhone || null,
        channelPreference: traveler.guestEmail ? 'email' : 'whatsapp',
      },
      dates: { checkIn: traveler.checkIn, checkOut: traveler.checkOut },
      guests: traveler.guestCount,
      source: 'traveler-booking',
      notes: traveler.notes,
      resourceId: traveler.guestEmail || traveler.guestPhone || null,
      currency: resolved.target.currency || null,
    }

    let result
    try {
      result = await scopedBusinessManager.createReservation(resolved.target.businessId, request, identity)
    } catch (error) {
      return resolveBusinessError(error)
    }

    if (!result?.success) {
      return {
        ok: false,
        status: 400,
        code: 'RESERVATION_REJECTED',
        error: Array.isArray(result?.errors) ? result.errors.join('; ') : 'Reservation could not be created',
      }
    }

    let persisted = null
    try {
      persisted = await scopedReservationManager.findById(result.reservationId)
    } catch {
      persisted = null
    }

    return {
      ok: true,
      status: 201,
      data: serializeConfirmationPayload(companySlug, result, persisted),
    }
  }
}

export function serializeAvailabilityPayload(companySlug, { checkIn, checkOut }, calendar) {
  return {
    company: companySlug,
    checkIn,
    checkOut,
    nights: Array.isArray(calendar) ? calendar.length : 0,
    dates: Array.isArray(calendar)
      ? calendar.map((day) => ({
          date: day?.date || null,
          status: day?.status || 'unknown',
          available: day?.available ?? null,
          capacity: day?.capacity ?? null,
          price: day?.price ?? null,
          notes: day?.notes || null,
        }))
      : [],
  }
}

export function serializeConfirmationPayload(companySlug, result, persisted) {
  const source = persisted || result || {}
  const dates = source.dates || {}
  const customer = source.customer || {}
  return {
    company: companySlug,
    confirmationCode: source.confirmationCode || null,
    reservationId: source.id || result?.reservationId || null,
    status: source.status || result?.status || null,
    dates: dates.checkIn ? { checkIn: dates.checkIn, checkOut: dates.checkOut || null } : null,
    guests: source.guests ?? null,
    customer: customer.name ? { name: customer.name, email: customer.email || null, phone: customer.phone || null } : null,
    totalPrice: source.totalPrice ?? null,
    currency: source.currency || null,
  }
}

export function createBookingAdapter(baseContext, registry = null) {
  return new BookingAdapter(baseContext, registry)
}

export default BookingAdapter