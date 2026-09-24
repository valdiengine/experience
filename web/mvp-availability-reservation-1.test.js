/**
 * MVP-AVAILABILITY-RESERVATION-1 — Phase A Product Test
 *
 * Generic server-authoritative bookable-context adapters:
 *   company slug -> BookingRegistry -> traveler-scoped context ->
 *   real Availability/BusinessAvailability managers ->
 *   certified BusinessReservationManager -> ReservationManager.createRequest ->
 *   ReservationRepository.createReservationWithLine -> confirmationCode read-back.
 *
 * No fabricated Albasie booking registry entries (Phase A default is empty).
 * Synthetic company/business/accommodation/inventory fixtures live only here.
 */
import { createTestBundle, TEST_TENANT } from '../tests/capability/capability.context.factory.js'
import { InMemoryRepositoryAdapter } from '../tests/capability/capability.mock.repositories.js'
import { ApiRouter } from '../api/routes/api.router.js'
import { BookingRegistry, createBookingRegistry } from '../experience/booking/booking.registry.js'
import { setBookingRegistry, getBookingRegistry } from '../api/routes/booking.routes.js'
import { createTravelerAuthFacade } from '../experience/booking/traveler-context.js'
import { resolveBusinessError } from '../experience/booking/booking.adapter.js'
import { renderBookingSection } from './templates/component.templates.js'

const SYNTHETIC_TENANT = { id: 'tenant-booking-1', name: 'Tenant Sintetico de Booking', slug: 'booking-synthetic' }
const REGISTRY_SLUG = 'destino-ejemplo'
const REGISTRY_TARGET = {
  companySlug: REGISTRY_SLUG,
  tenantId: SYNTHETIC_TENANT.id,
  tenantName: SYNTHETIC_TENANT.name,
  tenantSlug: SYNTHETIC_TENANT.slug,
  businessId: 'biz-booking-001',
  accommodationId: 'acc-booking-001',
  currency: 'CLP',
  title: 'Experiencia Ejemplo',
  description: 'Experiencia de ejemplo para la fase A del adaptador Product.',
}

const results = []

function record(category, id, pass, detail) {
  results.push({ category, id, pass, detail })
  console.log(`  [${category}] ${id}: ${pass ? 'PASS' : 'FAIL'} — ${detail}`)
}

function createTestRes() {
  return {
    statusCode: 0,
    body: null,
    setHeader() {},
    end(payload) {
      this.body = payload
    },
  }
}

function parseBody(res) {
  if (typeof res.body !== 'string') return null
  try {
    return JSON.parse(res.body)
  } catch {
    return null
  }
}

function seedFixtures() {
  InMemoryRepositoryAdapter.seed('business', [
    { id: 'biz-booking-001', tenantId: SYNTHETIC_TENANT.id, name: 'Negocio Ejemplo', status: 'published', deletedAt: null },
  ])
  InMemoryRepositoryAdapter.seed('accommodation', [
    { id: 'acc-booking-001', tenantId: SYNTHETIC_TENANT.id, businessId: 'biz-booking-001', name: 'Alojamiento Ejemplo', deletedAt: null },
  ])
  InMemoryRepositoryAdapter.seed('availability', [
    { id: 'avail-1', tenantId: SYNTHETIC_TENANT.id, accommodationId: 'acc-booking-001', date: '2026-10-10', status: 'available', capacity: 10, available: 5, price: 120000 },
    { id: 'avail-2', tenantId: SYNTHETIC_TENANT.id, accommodationId: 'acc-booking-001', date: '2026-10-11', status: 'available', capacity: 10, available: 3, price: 125000 },
  ])
  InMemoryRepositoryAdapter.seed('reservation', [])
  InMemoryRepositoryAdapter.seed('reservation_lines', [])
}

async function main() {
  console.log('=== MVP-AVAILABILITY-RESERVATION-1: Phase A Product Booking Adapter ===\n')

  InMemoryRepositoryAdapter.reset()
  seedFixtures()

  const bundle = await createTestBundle({ tenant: TEST_TENANT })
  const apiContext = {
    ...bundle.context,
    repositories: bundle.repositoryRuntime,
    capabilities: bundle.context.capabilities,
  }

  const originalRuntimeContext = global.runtimeContext
  global.runtimeContext = apiContext

  const originalRegistry = getBookingRegistry()
  const registry = createBookingRegistry()
  registry.register(REGISTRY_SLUG, REGISTRY_TARGET)
  setBookingRegistry(registry)

  const api = new ApiRouter()
  const router = api.getRouter()

  const apiGet = async (pathname, query = {}) => {
    const req = { method: 'GET', pathname, query, headers: {}, body: undefined }
    const res = createTestRes()
    await router.handle(req, res)
    return { status: res.statusCode, payload: parseBody(res) }
  }

  const apiPost = async (pathname, body) => {
    const req = { method: 'POST', pathname, query: {}, headers: { 'content-type': 'application/json' }, body }
    const res = createTestRes()
    await router.handle(req, res)
    return { status: res.statusCode, payload: parseBody(res) }
  }

  console.log('[REGISTRY] Resolution states...\n')

  const unknown = await apiGet('/api/v1/booking/companies/empresa-inexistente/availability', {
    checkIn: '2026-10-10',
    checkOut: '2026-10-12',
  })
  record('registry', 'registry-1-unknown-company-404',
    unknown.status === 404 && unknown.payload?.code === 'UNKNOWN_COMPANY',
    `status=${unknown.status} code=${unknown.payload?.code}`)

  registry.disableBooking('sin-config')
  const noConfig = await apiGet('/api/v1/booking/companies/sin-config/availability', {
    checkIn: '2026-10-10',
    checkOut: '2026-10-12',
  })
  record('registry', 'registry-2-no-booking-config-404',
    noConfig.status === 404 && noConfig.payload?.code === 'NO_BOOKING_CONFIG',
    `status=${noConfig.status} code=${noConfig.payload?.code}`)

  registry.register('registro-invalido', {
    companySlug: 'registro-invalido',
    tenantId: SYNTHETIC_TENANT.id,
    businessId: '',
    accommodationId: '',
  })
  const invalid = await apiGet('/api/v1/booking/companies/registro-invalido/availability', {
    checkIn: '2026-10-10',
    checkOut: '2026-10-12',
  })
  record('registry', 'registry-3-invalid-registration-409',
    invalid.status === 409 && invalid.payload?.code === 'INVALID_REGISTRATION',
    `status=${invalid.status} code=${invalid.payload?.code}`)

  const resolved = registry.resolveBookingTarget(REGISTRY_SLUG)
  record('registry', 'registry-4-valid-target-shape',
    resolved.ok && resolved.state === 'registered' &&
      resolved.target?.companySlug === REGISTRY_SLUG &&
      resolved.target.tenantId === SYNTHETIC_TENANT.id &&
      resolved.target.businessId === 'biz-booking-001' &&
      resolved.target.accommodationId === 'acc-booking-001',
    `ok=${resolved.ok} state=${resolved.state}`)

  console.log('\n[AVAILABILITY] Tenant-scoped real manager queries...\n')

  const availability = await apiGet('/api/v1/booking/companies/destino-ejemplo/availability', {
    checkIn: '2026-10-10',
    checkOut: '2026-10-12',
  })
  const data = availability.payload?.data || {}
  const dateMap = {}
  for (const day of data.dates || []) dateMap[day.date] = day
  record('availability', 'availability-1-ok-200',
    availability.status === 200 && data.company === REGISTRY_SLUG &&
      data.checkIn === '2026-10-10' && data.checkOut === '2026-10-12' &&
      data.nights === 3 &&
      Array.isArray(data.dates) && data.dates.length === 3 &&
      dateMap['2026-10-10']?.price === 120000 &&
      dateMap['2026-10-11']?.price === 125000 &&
      dateMap['2026-10-12']?.status === 'available',
    `status=${availability.status} nights=${data.nights} prices=${dateMap['2026-10-10']?.price}/${dateMap['2026-10-11']?.price}`)

  const bodyText = typeof availability.payload !== 'string' ? JSON.stringify(availability.payload) : availability.payload
  record('availability', 'availability-2-no-internal-id-leak',
    !bodyText.includes('tenantId') && !bodyText.includes('businessId') && !bodyText.includes('accommodationId'),
    'response must not contain tenantId/businessId/accommodationId keys')

  const missingDates = await apiGet('/api/v1/booking/companies/destino-ejemplo/availability', {})
  record('availability', 'availability-3-missing-dates-400',
    missingDates.status === 400 && missingDates.payload?.code === 'INVALID_REQUEST',
    `status=${missingDates.status} code=${missingDates.payload?.code}`)

  const legacy = await apiGet('/api/v1/availability', {})
  record('availability', 'availability-4-legacy-availability-route-untouched',
    legacy.status === 200 && legacy.payload?.code !== 'UNKNOWN_COMPANY',
    `status=${legacy.status} (booking adapter must not hijack /api/v1/availability)`)

  console.log('\n[RESERVATION] Certified create path with repository confirmationCode...\n')

  const baseBody = {
    checkIn: '2026-10-10',
    checkOut: '2026-10-12',
    guestName: 'Viajero Ejemplo',
    guestEmail: 'viajero@example.com',
    guestPhone: '+56912345678',
    guestCount: 2,
    notes: 'Ventana hacia el mar',
  }

  const created = await apiPost('/api/v1/booking/companies/destino-ejemplo/reservations', { ...baseBody })
  const createdData = created.payload?.data || {}
  record('reservation', 'reservation-1-ok-201',
    created.status === 201 && created.payload?.success === true &&
      typeof createdData.confirmationCode === 'string' && /^CONF-/.test(createdData.confirmationCode) &&
      typeof createdData.reservationId === 'string' &&
      createdData.status === 'requested' &&
      createdData.dates?.checkIn === '2026-10-10' &&
      createdData.customer?.name === 'Viajero Ejemplo',
    `status=${created.status} reservationId=${createdData.reservationId} confirmation=${createdData.confirmationCode}`)

  const store = InMemoryRepositoryAdapter.store
  const reservationRows = [...store.get('reservation').values()]
  const persisted = reservationRows.find((r) => r.id === createdData.reservationId)
  record('reservation', 'reservation-2-confirmation-generated-by-repository',
    Boolean(persisted?.confirmationCode) && /^CONF-/.test(persisted.confirmationCode) && persisted.status === 'requested',
    `row confirmation=${persisted?.confirmationCode} status=${persisted?.status}`)

  record('reservation', 'reservation-3-persisted-tenant-certified-path',
    Boolean(persisted) &&
      persisted.tenantId === SYNTHETIC_TENANT.id &&
      persisted.businessId === 'biz-booking-001' &&
      persisted.accommodationId === 'acc-booking-001' &&
      persisted.checkInDate === '2026-10-10' &&
      persisted.checkOutDate === '2026-10-12' &&
      persisted.guestCount === 2,
    `row tenantId=${persisted?.tenantId} businessId=${persisted?.businessId} guestCount=${persisted?.guestCount} (enriched fields prove createReservationWithLine ran)`)

  const spoof = await apiPost('/api/v1/booking/companies/destino-ejemplo/reservations', {
    ...baseBody,
    guestName: 'Spoof Intento',
    tenantId: TEST_TENANT.id,
    businessId: 'biz-spoofed-999',
    accommodationId: 'acc-spoofed-999',
    visitorId: 'visitor-spoofed-999',
  })
  const spoofData = spoof.payload?.data || {}
  const spoofRow = [...store.get('reservation').values()].find((r) => r.id === spoofData.reservationId)
  record('reservation', 'reservation-4-body-spoof-ignored',
    spoof.status === 201 && Boolean(spoofRow) &&
      spoofRow.tenantId === SYNTHETIC_TENANT.id &&
      spoofRow.businessId === 'biz-booking-001' &&
      spoofRow.accommodationId === 'acc-booking-001',
    `row tenantId=${spoofRow?.tenantId} businessId=${spoofRow?.businessId} (server must win over body)`)

  const missingGuest = await apiPost('/api/v1/booking/companies/destino-ejemplo/reservations', {
    checkIn: '2026-10-10',
    checkOut: '2026-10-12',
  })
  record('reservation', 'reservation-5-missing-fields-400',
    missingGuest.status === 400 && missingGuest.payload?.code === 'INVALID_REQUEST',
    `status=${missingGuest.status} code=${missingGuest.payload?.code}`)

  const badOrder = await apiPost('/api/v1/booking/companies/destino-ejemplo/reservations', {
    checkIn: '2026-10-12',
    checkOut: '2026-10-10',
    guestName: 'Viajera Inversa',
  })
  record('reservation', 'reservation-6-invalid-date-order-400',
    badOrder.status === 400 && badOrder.payload?.code === 'INVALID_REQUEST',
    `status=${badOrder.status} code=${badOrder.payload?.code}`)

  record('reservation', 'reservation-7-confirmation-no-id-leak',
    !JSON.stringify(created.payload).includes('tenantId') &&
      !JSON.stringify(created.payload).includes('businessId') &&
      !JSON.stringify(created.payload).includes('accommodationId'),
    'confirmation payload must not contain internal ids')

  console.log('\n[TENANT] Cross-tenant isolation of persisted rows...\n')

  const allReservations = [...store.get('reservation').values()]
  record('tenant', 'tenant-1-no-reservation-cross-tenant',
    allReservations.length === 2 &&
      allReservations.every((r) => r.tenantId === SYNTHETIC_TENANT.id) &&
      allReservations.some((r) => r.businessId === 'biz-booking-001'),
    `rows=${allReservations.length} tenants=${[...new Set(allReservations.map(r => r.tenantId))].join(',')}`)

  console.log('\n[AUTH] Fail-closed traveler facade...\n')

  const facade = createTravelerAuthFacade(SYNTHETIC_TENANT.id)
  const travelerIdentity = {
    id: `traveler-${REGISTRY_SLUG}`,
    provider: 'booking-traveler',
    tenantId: SYNTHETIC_TENANT.id,
  }
  const forgedIdentity = { id: 'owner-1', provider: 'local', roles: ['business:owner'], tenantId: SYNTHETIC_TENANT.id }
  const foreignTraveler = { id: 'traveler-otro', provider: 'booking-traveler', tenantId: 'tenant-otro' }

  let nonTravelerThrew = false
  try { await facade.authorize(forgedIdentity, 'business:read') } catch { nonTravelerThrew = true }
  record('auth', 'auth-1-non-traveler-denied', nonTravelerThrew, `forged local owner rejected=${nonTravelerThrew}`)

  let foreignTenantThrew = false
  try { await facade.authorize(foreignTraveler, 'business:read') } catch { foreignTenantThrew = true }
  record('auth', 'auth-2-wrong-tenant-denied', foreignTenantThrew, `foreign traveler rejected=${foreignTenantThrew}`)

  let allowedRead = true
  try { await facade.authorize(travelerIdentity, 'business:read') } catch { allowedRead = false }
  let allowedCreate = true
  try { await facade.authorize(travelerIdentity, 'reservation:create') } catch { allowedCreate = false }
  const cannotRead = await facade.cannot(travelerIdentity, 'reservation:read')
  record('auth', 'auth-3-allowlist-passes',
    allowedRead && allowedCreate && cannotRead === true &&
      facade.can(travelerIdentity, 'availability:read') === true,
    `read=${allowedRead} create=${allowedCreate} cannotRead=${cannotRead}`)

  const forbidden = resolveBusinessError(new Error('Missing permission: reservation:read'))
  record('auth', 'auth-4-missing-permission-403-mapping',
    forbidden.ok === false && forbidden.status === 403 && forbidden.code === 'FORBIDDEN',
    `status=${forbidden.status} code=${forbidden.code}`)

  console.log('\n[PRESENTATION] Booking section rendering...\n')

  const disabledVm = { booking: { enabled: false } }
  const disabledHtml = renderBookingSection(disabledVm)
  record('presentation', 'presentation-1-disabled-no-section',
    disabledHtml === '' && !disabledHtml.includes('Reservar'),
    `disabled renders empty: ${disabledHtml === ''}`)

  const enabledVm = { booking: { enabled: true, slug: REGISTRY_SLUG, title: 'Reserva tu viaje' } }
  const enabledHtml = renderBookingSection(enabledVm)
  record('presentation', 'presentation-2-enabled-cta',
    enabledHtml.includes(`/api/v1/booking/companies/${REGISTRY_SLUG}/availability`) &&
      enabledHtml.includes('Reservar') &&
      enabledHtml.includes('Reserva tu viaje'),
    'enabled renders section with CTA endpoint and Reservar')

  record('presentation', 'presentation-3-enabled-no-slug-no-render',
    renderBookingSection({ booking: { enabled: true } }) === '' &&
      renderBookingSection({}) === '',
    'no slug / no booking omit the section')

  global.runtimeContext = originalRuntimeContext
  setBookingRegistry(originalRegistry)
  try { await bundle.teardown() } catch { InMemoryRepositoryAdapter.reset() }
  InMemoryRepositoryAdapter.reset()
}

async function runAllTests() {
  try {
    await main()
  } catch (err) {
    console.error('Main suite error:', err)
    global.runtimeContext = undefined
    InMemoryRepositoryAdapter.reset()
    process.exit(1)
  }
  console.log('\n=== RESULTS ===')
  const passed = results.filter((r) => r.pass).length
  const failed = results.filter((r) => !r.pass).length
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`)
  if (failed > 0) {
    console.log('\n=== FAILED ===')
    for (const r of results.filter((r) => !r.pass)) {
      console.log(`  [${r.category}] ${r.id}: ${r.detail}`)
    }
  }
  process.exit(failed > 0 ? 1 : 0)
}

runAllTests().catch((err) => {
  console.error('Test runner error:', err)
  process.exit(1)
})