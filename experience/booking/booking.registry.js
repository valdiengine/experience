export const BOOKING_RESOLUTION_STATE = {
  REGISTERED: 'registered',
  UNKNOWN_COMPANY: 'unknown_company',
  NO_BOOKING_CONFIG: 'no_booking_config',
  INVALID_REGISTRATION: 'invalid_registration',
}

const REQUIRED_TARGET_FIELDS = ['tenantId', 'businessId', 'accommodationId']

function normalizeTarget(companySlug, target) {
  if (!target || typeof target !== 'object') return null
  return {
    companySlug,
    tenantId: typeof target.tenantId === 'string' ? target.tenantId : '',
    tenantName: typeof target.tenantName === 'string' ? target.tenantName : null,
    tenantSlug: typeof target.tenantSlug === 'string' ? target.tenantSlug : null,
    businessId: typeof target.businessId === 'string' ? target.businessId : '',
    accommodationId: typeof target.accommodationId === 'string' ? target.accommodationId : '',
    currency: typeof target.currency === 'string' ? target.currency : null,
    title: typeof target.title === 'string' ? target.title : null,
    description: typeof target.description === 'string' ? target.description : null,
  }
}

export class BookingRegistry {
  #targets = new Map()
  #noBooking = new Set()

  constructor(options = {}) {
    this.#provision(options.provision || {})
  }

  #provision(provision) {
    for (const [slug, target] of Object.entries(provision.targets || {})) {
      this.#registerTarget(slug, target)
    }
    for (const slug of provision.noBooking || []) {
      if (typeof slug === 'string') this.#noBooking.add(slug)
    }
  }

  #registerTarget(companySlug, target) {
    if (typeof companySlug !== 'string' || !companySlug) throw new Error('Booking registration requires a company slug')
    const normalized = normalizeTarget(companySlug, target)
    if (!normalized) throw new Error(`Invalid booking registration for company "${companySlug}"`)
    this.#targets.set(companySlug, normalized)
    this.#noBooking.delete(companySlug)
  }

  #validateTarget(target) {
    const errors = []
    for (const field of REQUIRED_TARGET_FIELDS) {
      if (!target[field]) errors.push(`Missing booking registration field: ${field}`)
    }
    return errors
  }

  register(companySlug, target) {
    this.#registerTarget(companySlug, target)
    return this
  }

  unregister(companySlug) {
    this.#targets.delete(companySlug)
    this.#noBooking.delete(companySlug)
    return this
  }

  disableBooking(companySlug) {
    this.#targets.delete(companySlug)
    this.#noBooking.add(companySlug)
    return this
  }

  hasBookingTarget(companySlug) {
    const target = this.#targets.get(companySlug)
    if (!target) return false
    return this.#validateTarget(target).length === 0
  }

  resolveBookingTarget(companySlug) {
    const target = this.#targets.get(companySlug)

    if (!target) {
      if (this.#noBooking.has(companySlug)) {
        return {
          ok: false,
          state: BOOKING_RESOLUTION_STATE.NO_BOOKING_CONFIG,
          status: 404,
          error: 'This company does not offer online booking yet',
        }
      }
      return {
        ok: false,
        state: BOOKING_RESOLUTION_STATE.UNKNOWN_COMPANY,
        status: 404,
        error: 'Unknown company',
      }
    }

    const errors = this.#validateTarget(target)
    if (errors.length > 0) {
      return {
        ok: false,
        state: BOOKING_RESOLUTION_STATE.INVALID_REGISTRATION,
        status: 409,
        error: 'Invalid booking registration',
        errors,
      }
    }

    return {
      ok: true,
      state: BOOKING_RESOLUTION_STATE.REGISTERED,
      status: 200,
      target: Object.freeze({ ...target }),
    }
  }

  list() {
    return Array.from(this.#targets.values()).map((target) => ({ ...target }))
  }
}

export function createBookingRegistry(options = {}) {
  return new BookingRegistry(options)
}

export default createBookingRegistry