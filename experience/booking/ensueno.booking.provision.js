/**
 * Ensueño Curiñanco — Booking Enrollment (ENSUENO_BOOKING_1)
 *
 * Provisions the FIRST real accommodation booking target on the certified
 * Valdi booking infrastructure:
 *
 *   1. tenants                      tenant "ensueno" (registers nothing new —
 *                                   only the business/accommodation rows the
 *                                   certified managers read).
 *   2. business/accommodation       created through the certified repositories
 *                                   (explicit tenantId: BaseRepository reads are
 *                                   tenant-scoped, so rows must carry it).
 *   3. availability days            written through the real AvailabilityManager
 *                                   (auth-less context: #checkPermission returns
 *                                   true when context.runtime.auth is null).
 *   4. BookingRegistry              target ensueno-curinanco -> traveler-scoped
 *                                   certified reservation flow + setBookingRegistry.
 *
 * NOT wired into the platform startup: the interface-only 'mock' provider of the
 * live server does not implement `create`, so auto-provisioning on boot would
 * break determinism. It is invoked explicitly wherever a writable repository
 * adapter is guaranteed (product test harness with InMemoryRepositoryAdapter;
 * future Postgres writes require adapter `create` support first).
 */
import { AvailabilityManager } from '../../capabilities/availability/availability.manager.js'
import { createRepositoriesFacade } from '../../runtime/startup/capability.bootstrap.js'
import { createBookingRegistry } from './booking.registry.js'
import { setBookingRegistry } from '../../api/routes/booking.routes.js'

export const ENSUENO_SLUG = 'ensueno-curinanco'
export const ENSUENO_TENANT = Object.freeze({
  id: 'ensueno',
  name: 'Complejo Ensueño Curiñanco',
  slug: ENSUENO_SLUG,
})
export const ENSUENO_BUSINESS_ID = 'biz-ensueno-cabina'
export const ENSUENO_ACCOMMODATION_ID = 'acc-ensueno-cabina'
export const ENSUENO_CABIN_PRICE = 90000
export const ENSUENO_OPEN_RANGE_START = '2026-10-01'
export const ENSUENO_OPEN_RANGE_DAYS = 90

export function addCalendarDays(isoDate, count) {
  const date = new Date(`${isoDate}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + count)
  return date.toISOString().slice(0, 10)
}

/**
 * Provision the Ensueño Curiñanco booking enrollment.
 * @param {object} params
 * @param {object} params.repositoryRuntime - Booted repository runtime (get(entityName, context))
 * @param {object} [params.eventBus]
 * @param {string} [params.rangeStart] - First available night (ISO yyyy-mm-dd)
 * @param {number} [params.rangeDays] - Number of nights to seed open
 * @param {boolean} [params.installRegistry] - Register + setBookingRegistry (default true)
 * @returns {Promise<object>} enrollment summary
 */
export async function provisionEnsueñoBooking({
  repositoryRuntime,
  eventBus = null,
  rangeStart = ENSUENO_OPEN_RANGE_START,
  rangeDays = ENSUENO_OPEN_RANGE_DAYS,
  installRegistry = true,
} = {}) {
  if (!repositoryRuntime || typeof repositoryRuntime.get !== 'function') {
    throw new Error('provisionEnsueñoBooking requires a repositoryRuntime')
  }

  const context = { tenant: ENSUENO_TENANT, eventBus }
  const repositories = createRepositoriesFacade(repositoryRuntime, context)

  const now = new Date().toISOString()

  let business = await repositories.business.findById(ENSUENO_BUSINESS_ID, { throwIfNotFound: false })
  if (!business) {
    business = await repositories.business.create({
      id: ENSUENO_BUSINESS_ID,
      tenantId: ENSUENO_TENANT.id,
      name: ENSUENO_TENANT.name,
      slug: ENSUENO_SLUG,
      status: 'active',
      category: 'cabins',
      destinationId: 'valdi',
      description: 'Cabañas en la costa de Curiñanco, comuna de Valdivia, Región de Los Ríos.',
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    })
  }
  if (!business) {
    return { provisioned: false, reason: 'persistence-unavailable', seededDates: [] }
  }

  let accommodation = await repositories.accommodation.findById(ENSUENO_ACCOMMODATION_ID, { throwIfNotFound: false })
  if (!accommodation) {
    accommodation = await repositories.accommodation.create({
      id: ENSUENO_ACCOMMODATION_ID,
      tenantId: ENSUENO_TENANT.id,
      businessId: ENSUENO_BUSINESS_ID,
      name: 'Cabaña Ensueño',
      type: 'cabins',
      description: 'Cabaña con tinaja, piscina de temporada y sauna entre el bosque costero de Curiñanco.',
      capacity: 2,
      maxGuests: 4,
      basePrice: ENSUENO_CABIN_PRICE,
      pricePerNight: ENSUENO_CABIN_PRICE,
      currency: 'CLP',
      status: 'active',
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    })
  }
  if (!accommodation) {
    return { provisioned: false, reason: 'persistence-unavailable', seededDates: [] }
  }

  const manager = new AvailabilityManager({
    tenant: ENSUENO_TENANT,
    repositories,
    eventBus,
    runtime: { auth: null },
  })

  const seededDates = []
  for (let i = 0; i < rangeDays; i++) {
    const date = addCalendarDays(rangeStart, i)
    const existing = await repositories.availability.findOne({ accommodationId: ENSUENO_ACCOMMODATION_ID, date })
    if (existing) {
      seededDates.push(date)
      continue
    }
    const created = await manager.createDay({
      accommodationId: ENSUENO_ACCOMMODATION_ID,
      date,
      status: 'available',
      capacity: 4,
      available: 4,
      price: ENSUENO_CABIN_PRICE,
      currency: 'CLP',
    })
    if (created?.success) seededDates.push(created.data?.date || date)
  }

  let registry = null
  if (installRegistry) {
    registry = createBookingRegistry({
      provision: {
        targets: {
          [ENSUENO_SLUG]: {
            tenantId: ENSUENO_TENANT.id,
            tenantName: ENSUENO_TENANT.name,
            tenantSlug: ENSUENO_TENANT.slug,
            businessId: ENSUENO_BUSINESS_ID,
            accommodationId: ENSUENO_ACCOMMODATION_ID,
            currency: 'CLP',
            title: ENSUENO_TENANT.name,
            description: 'Cabañas en la costa de Curiñanco, comuna de Valdivia, Región de Los Ríos.',
          },
        },
        noBooking: [],
      },
    })
    setBookingRegistry(registry)
  }

  return {
    provisioned: true,
    tenant: ENSUENO_TENANT,
    business,
    accommodation,
    registry,
    seededDates,
    rangeStart,
    rangeDays,
  }
}

export default provisionEnsueñoBooking