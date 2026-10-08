import { BookingRegistry } from './booking.registry.js'
import { buildTravelerContext } from './traveler-context.js'
import { ReservationManager } from '../../capabilities/reservation/reservation.manager.js'
import { BusinessManager } from '../../capabilities/business/business.manager.js'
import { getTenantReservationRecovery } from '../../runtime/startup/reservation.recovery.bootstrap.js'
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

// The public availability calendar (dates[]) is an inclusive display range: it
// lists the checkout day so the traveler sees every day of the stay. Persisted
// reservation occupancy is checkout-exclusive, so the night count is derived
// from the bounds instead of the array length. These helpers are module-local
// and pure.
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const MILLISECONDS_PER_DAY = 86400000

// UTC midnight timestamp for a strict YYYY-MM-DD string, or null.
// `new Date('YYYY-MM-DD')` is deliberately avoided because it silently
// normalizes impossible dates (2026-02-30 -> 2026-03-02). The year is applied
// through setUTCFullYear rather than Date.UTC or a numeric-component
// constructor, both of which remap years 0000-0099 onto 1900-1999.
// Round-trip equality rejects every normalized value.
function parseIsoDateOnly(value) {
  if (typeof value !== 'string' || !ISO_DATE_PATTERN.test(value)) return null
  const year = Number(value.slice(0, 4))
  const month = Number(value.slice(5, 7))
  const day = Number(value.slice(8, 10))
  const date = new Date(0)
  date.setUTCHours(0, 0, 0, 0)
  date.setUTCFullYear(year, month - 1, day)
  const timestamp = date.getTime()
  if (!Number.isFinite(timestamp)) return null
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null
  return timestamp
}

// Checkout-exclusive night count. Invalid, equal and reversed ranges all yield
// 0 rather than a negative or NaN value.
function countExclusiveNights(checkIn, checkOut) {
  const from = parseIsoDateOnly(checkIn)
  const to = parseIsoDateOnly(checkOut)
  if (from === null || to === null) return 0
  const nights = Math.round((to - from) / MILLISECONDS_PER_DAY)
  return Number.isFinite(nights) && nights > 0 ? nights : 0
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

    // Compute pricing server-side before creating reservation (traveler path)
    let pricingResult
    try {
      pricingResult = await scopedBusinessManager.calculateReservationPrice(
        resolved.target.businessId,
        resolved.target.accommodationId,
        traveler.checkIn,
        traveler.checkOut,
        traveler.guestCount,
        identity
      )
    } catch {
      return {
        ok: false,
        status: 400,
        code: 'PRICING_UNAVAILABLE',
        error: 'No se pudo calcular el precio de la reserva',
      }
    }
    if (!pricingResult?.success) {
      return {
        ok: false,
        status: 400,
        code: 'PRICING_UNAVAILABLE',
        error: 'No se pudo calcular el precio de la reserva',
      }
    }
    if (pricingResult.price == null || !Number.isFinite(pricingResult.price) || pricingResult.price < 0) {
      return {
        ok: false,
        status: 400,
        code: 'PRICING_INVALID',
        error: 'Precio de reserva inv\u00e1lido',
      }
    }
    request.totalPrice = pricingResult.price
    if (pricingResult.currency != null) {
      request.currency = pricingResult.currency
    }
    request.pricing = {
      pricePerNight: pricingResult.pricePerNight ?? null,
      nights: pricingResult.nights ?? null,
      totalPrice: pricingResult.price,
      currency: pricingResult.currency ?? request.currency ?? null,
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

    // BOOKING-EXPIRATION-LIVE-ARM-1. The request-scoped ReservationManager built
    // above owns no timer (`#syncTimers` reports `not_configured`), and nothing
    // else in a live process would arm this reservation: without this hand-off it
    // stays `requested` with its capacity held until a Passenger restart performs
    // startup recovery. The process-lifetime tenant runtime established by
    // `startTenantReservationRecovery()` is the single authoritative timer owner
    // for real Booking tenants, so the persisted reservation is handed to it for
    // immediate arming - no per-request timer, no second timer authority, and the
    // atomic expire+release path downstream is untouched.
    //
    // Failure contract: a reservation already durably persisted is NEVER rolled
    // back and never throws back into the traveler response. The failure is
    // reported through bounded server-side operational logging only - the
    // public confirmation payload keeps its pre-existing contract and never
    // carries timer, scheduler or recovery implementation state; internal
    // reasons and errors never leave this process.
    try {
      const recovery = getTenantReservationRecovery()
      const arm = recovery && persisted
        ? await recovery.armReservationTimer(resolved.target.tenantId, persisted)
        : { status: 'unavailable', reason: persisted ? 'tenant_recovery_not_initialized' : 'persisted_state_unavailable' }
      if (arm?.armed !== true) {
        console.error(
          `[BookingAdapter] Expiration timer NOT armed for reservation ${result.reservationId} (tenant ${resolved.target.tenantId}): ${arm?.reason || arm?.status || 'unknown'}`
        )
      }
    } catch {
      // Sanitized boundary log: reservation id + tenant id only. Raw error
      // messages, stacks and provider/DB exception text never enter the log
      // from here and never reach the traveler response.
      console.error(
        `[BookingAdapter] Expiration timer arm failed unexpectedly for reservation ${result.reservationId} (tenant ${resolved.target.tenantId})`
      )
    }

    // BOOKING-EXPIRATION-LIVE-ARM-1 public contract: the confirmation payload
    // is the pre-existing serializeConfirmationPayload shape - timer arming
    // state is process-internal and never serialized into the HTTP response.
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
    nights: countExclusiveNights(checkIn, checkOut),
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