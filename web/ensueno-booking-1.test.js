/**
 * ENSUENO-BOOKING-1 — Product Test: first real accommodation Application
 *
 * Complejo Ensueño Curiñanco is enrolled as the first REAL booking target on the
 * certified Valdi booking infrastructure (Business → Availability →
 * Reservation → repository confirmation). No fabricated Albasie entries:
 * dronesss writes nothing here except the built-in Ensueño enrollment.
 *
 * Covered contracts:
 *   - company config + /ensueno-curinanco route resolve a real Application
 *   - provisionEnsueñoBooking writes business/accommodation/availability rows
 *     and registers the BookingRegistry target
 *   - availability + reservation flow through the certified server adapters
 *   - no-overbooking after a confirmed reservation
 *   - G-A: certified widget payload contract + guestCount input in the SSR form
 */
import path from 'node:path'
import { createTestBundle } from '../tests/capability/capability.context.factory.js'
import { InMemoryRepositoryAdapter } from '../tests/capability/capability.mock.repositories.js'
import { ApiRouter } from '../api/routes/api.router.js'
import { setBookingRegistry, getBookingRegistry } from '../api/routes/booking.routes.js'
import { renderBookingSection } from './templates/component.templates.js'
import { provisionEnsueñoBooking, ENSUENO_SLUG, ENSUENO_TENANT, ENSUENO_BUSINESS_ID, ENSUENO_ACCOMMODATION_ID, ENSUENO_CABIN_PRICE } from '../experience/booking/ensueno.booking.provision.js'
import { createRouteOwnershipRegistry, OWNERSHIP } from './routing/route.registry.js'
import { ROUTE_CONFIG } from './routing/route.config.js'
import { createApplicationResolver } from './application/application.resolver.js'
import { ConfigurationLoader } from '../experience/loader/configuration.loader.js'

const CHECK_IN = '2026-10-20'
const CHECK_OUT = '2026-10-22'

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

async function main() {
  console.log('=== ENSUENO-BOOKING-1: Complejo Ensueño Curiñanco (cabañas) ===\n')

  InMemoryRepositoryAdapter.reset()

  const bundle = await createTestBundle({ tenant: ENSUENO_TENANT })

  console.log('\n[PROVISION] Seeding through the certified repositories + real AvailabilityManager...\n')

  const enrollment = await provisionEnsueñoBooking({
    repositoryRuntime: bundle.repositoryRuntime,
    eventBus: bundle.realBus,
    rangeStart: '2026-10-01',
    rangeDays: 90,
  })

  const bizRow = [...InMemoryRepositoryAdapter.store.get('business').values()].find((r) => r.id === ENSUENO_BUSINESS_ID)
  const accRow = [...InMemoryRepositoryAdapter.store.get('accommodation').values()].find((r) => r.id === ENSUENO_ACCOMMODATION_ID)
  const availRows = [...InMemoryRepositoryAdapter.store.get('availability').values()]

  record('provision', 'provision-1-enrollment-ok',
    enrollment.provisioned === true &&
      bizRow?.tenantId === ENSUENO_TENANT.id && bizRow?.status === 'active' &&
      accRow?.tenantId === ENSUENO_TENANT.id && accRow?.businessId === ENSUENO_BUSINESS_ID,
    `provisioned=${enrollment.provisioned} business=${bizRow?.id} accommodation=${accRow?.id}`)

  record('provision', 'provision-2-availability-open-range',
    availRows.length === 90 &&
      availRows.every((r) => r.tenantId === ENSUENO_TENANT.id && r.status === 'available' && r.price === ENSUENO_CABIN_PRICE),
    `rows=${availRows.length} tenant=${[...new Set(availRows.map((r) => r.tenantId))].join(',')}`)

  const apiContext = {
    ...bundle.context,
    repositories: bundle.repositoryRuntime,
    capabilities: bundle.context.capabilities,
  }

  const originalRuntimeContext = global.runtimeContext
  global.runtimeContext = apiContext

  const originalRegistry = getBookingRegistry()

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

  console.log('\n[ROUTE-RESOLUTION] Route config + ownership registry + Application resolver...\n')

  const routeEntry = ROUTE_CONFIG.routes.find((r) => r.domain === 'valdi.app' && r.path === '/ensueno-curinanco')
  record('route', 'route-1-config-entry',
    Boolean(routeEntry) &&
      routeEntry.company === 'ensueno-curinanco' &&
      routeEntry.ownership === OWNERSHIP.EXPERIENCE &&
      routeEntry.migrationState === 'EXPERIENCE' &&
      routeEntry.enabled === true,
    `company=${routeEntry?.company} ownership=${routeEntry?.ownership} state=${routeEntry?.migrationState}`)

  const ownershipRegistry = createRouteOwnershipRegistry(ROUTE_CONFIG)
  const ownershipResolved = ownershipRegistry.resolve('valdi.app', '/ensueno-curinanco')
  record('route', 'route-2-ownership-resolved',
    ownershipResolved.valid &&
      ownershipResolved.ownership === OWNERSHIP.EXPERIENCE &&
      ownershipResolved.company === 'ensueno-curinanco',
    `valid=${ownershipResolved.valid} ownership=${ownershipResolved.ownership} company=${ownershipResolved.company}`)

  const configurationLoader = new ConfigurationLoader({ root: path.resolve(process.cwd()), useFilesystem: true })
  await configurationLoader.initialize()
  const companyConfig = configurationLoader.getCompanyConfig('cl', 'los-rios', 'valdi', 'ensueno-curinanco')
  record('route', 'route-3-company-config-loaded',
    Boolean(companyConfig) &&
      companyConfig.experienceType === 'accommodation' &&
      companyConfig.capabilities?.booking?.enabled === true &&
      companyConfig.capabilities.booking.configuration?.slug === ENSUENO_SLUG,
    `loaded=${Boolean(companyConfig)} bookingEnabled=${companyConfig?.capabilities?.booking?.enabled} slug=${companyConfig?.capabilities?.booking?.configuration?.slug}`)

  const resolvedApplication = createApplicationResolver({ configurationLoader }).resolve({
    domain: 'valdi.app',
    path: '/ensueno-curinanco',
  })
  const bookingCapability = resolvedApplication.resolved?.composition?.capabilities?.find((c) => c.name === 'booking')
  record('route', 'route-4-application-resolution',
    resolvedApplication.success &&
      resolvedApplication.resolved.ownership.company === 'ensueno-curinanco' &&
      resolvedApplication.resolved.migrationState.state === 'EXPERIENCE_ACTIVE' &&
      Boolean(bookingCapability) &&
      bookingCapability.configuration?.enabled === true &&
      bookingCapability.configuration?.slug === ENSUENO_SLUG,
    `success=${resolvedApplication.success} company=${resolvedApplication.resolved?.ownership?.company} bookingSlug=${bookingCapability?.configuration?.slug}`)

  console.log('\n[REGISTRY] Ensueño Curiñanco target resolution...\n')

  const resolvedTarget = enrollment.registry.resolveBookingTarget(ENSUENO_SLUG)
  record('registry', 'registry-1-target-registered',
    resolvedTarget.ok && resolvedTarget.state === 'registered' &&
      resolvedTarget.target.tenantId === ENSUENO_TENANT.id &&
      resolvedTarget.target.businessId === ENSUENO_BUSINESS_ID &&
      resolvedTarget.target.accommodationId === ENSUENO_ACCOMMODATION_ID &&
      resolvedTarget.target.currency === 'CLP',
    `state=${resolvedTarget.state} tenant=${resolvedTarget.target?.tenantId} business=${resolvedTarget.target?.businessId}`)

  const unknown = await apiGet('/api/v1/booking/companies/empresa-inexistente/availability', {
    checkIn: CHECK_IN,
    checkOut: CHECK_OUT,
  })
  record('registry', 'registry-2-unknown-company-404',
    unknown.status === 404 && unknown.payload?.code === 'UNKNOWN_COMPANY',
    `status=${unknown.status} code=${unknown.payload?.code}`)

  console.log('\n[AVAILABILITY] Certified real-manager queries...\n')

  const availability = await apiGet(`/api/v1/booking/companies/${ENSUENO_SLUG}/availability`, {
    checkIn: CHECK_IN,
    checkOut: CHECK_OUT,
  })
  const data = availability.payload?.data || {}
  record('availability', 'availability-1-ok-200',
    availability.status === 200 &&
      data.company === ENSUENO_SLUG &&
      data.checkIn === CHECK_IN && data.checkOut === CHECK_OUT &&
      data.nights === 3 &&
      Array.isArray(data.dates) && data.dates.length === 3 &&
      data.dates.every((d) => d.status === 'available') &&
      data.dates[0]?.price === ENSUENO_CABIN_PRICE,
    `status=${availability.status} nights=${data.nights} allAvailable=${data.dates?.every((d) => d.status === 'available')} price=${data.dates?.[0]?.price}`)

  const bodyText = typeof availability.payload !== 'string' ? JSON.stringify(availability.payload) : availability.payload
  record('availability', 'availability-2-no-internal-id-leak',
    !bodyText.includes('tenantId') && !bodyText.includes('businessId') && !bodyText.includes('accommodationId'),
    'response must not contain tenantId/businessId/accommodationId keys')

  const missingDates = await apiGet(`/api/v1/booking/companies/${ENSUENO_SLUG}/availability`, {})
  record('availability', 'availability-3-missing-dates-400',
    missingDates.status === 400 && missingDates.payload?.code === 'INVALID_REQUEST',
    `status=${missingDates.status} code=${missingDates.payload?.code}`)

  console.log('\n[RESERVATION] Certified top-level payload → 201 CONF-...\n')

  const baseBody = {
    checkIn: CHECK_IN,
    checkOut: CHECK_OUT,
    guestName: 'Viajera Ensueño',
    guestEmail: 'viajera@example.com',
    guestPhone: '+56912345678',
    guestCount: 2,
    notes: 'Dos noches frente al bosque costero',
  }

  const created = await apiPost(`/api/v1/booking/companies/${ENSUENO_SLUG}/reservations`, { ...baseBody })
  const createdData = created.payload?.data || {}
  record('reservation', 'reservation-1-ok-201',
    created.status === 201 && created.payload?.success === true &&
      typeof createdData.confirmationCode === 'string' && /^CONF-/.test(createdData.confirmationCode) &&
      typeof createdData.reservationId === 'string' &&
      createdData.dates?.checkIn === CHECK_IN &&
      createdData.customer?.name === 'Viajera Ensueño',
    `status=${created.status} reservationId=${createdData.reservationId} confirmation=${createdData.confirmationCode}`)

  const store = InMemoryRepositoryAdapter.store
  const reservationRows = [...store.get('reservation').values()]
  const persisted = reservationRows.find((r) => r.id === createdData.reservationId)
  record('reservation', 'reservation-2-persisted-enrollment-path',
    Boolean(persisted) &&
      persisted.tenantId === ENSUENO_TENANT.id &&
      persisted.businessId === ENSUENO_BUSINESS_ID &&
      persisted.accommodationId === ENSUENO_ACCOMMODATION_ID &&
      persisted.confirmationCode === createdData.confirmationCode &&
      persisted.guestCount === 2 &&
      persisted.checkInDate === CHECK_IN,
    `row tenantId=${persisted?.tenantId} businessId=${persisted?.businessId} guestCount=${persisted?.guestCount}`)

  const spoof = await apiPost(`/api/v1/booking/companies/${ENSUENO_SLUG}/reservations`, {
    ...baseBody,
    guestName: 'Spoof Intento',
    tenantId: 'commercial',
    businessId: 'biz-spoofed-999',
    accommodationId: 'acc-spoofed-999',
    visitorId: 'visitor-spoofed-999',
  })
  const spoofData = spoof.payload?.data || {}
  const spoofRow = [...store.get('reservation').values()].find((r) => r.id === spoofData.reservationId)
  record('reservation', 'reservation-3-body-spoof-ignored',
    spoof.status === 201 && Boolean(spoofRow) &&
      spoofRow.tenantId === ENSUENO_TENANT.id &&
      spoofRow.businessId === ENSUENO_BUSINESS_ID &&
      spoofRow.accommodationId === ENSUENO_ACCOMMODATION_ID,
    `row tenantId=${spoofRow?.tenantId} businessId=${spoofRow?.businessId} (server must win over body)`)

  const missingGuest = await apiPost(`/api/v1/booking/companies/${ENSUENO_SLUG}/reservations`, {
    checkIn: CHECK_IN,
    checkOut: CHECK_OUT,
  })
  record('reservation', 'reservation-4-missing-fields-400',
    missingGuest.status === 400 && missingGuest.payload?.code === 'INVALID_REQUEST',
    `status=${missingGuest.status} code=${missingGuest.payload?.code}`)

  const badOrder = await apiPost(`/api/v1/booking/companies/${ENSUENO_SLUG}/reservations`, {
    checkIn: CHECK_OUT,
    checkOut: CHECK_IN,
    guestName: 'Viajera Inversa',
  })
  record('reservation', 'reservation-5-invalid-date-order-400',
    badOrder.status === 400 && badOrder.payload?.code === 'INVALID_REQUEST',
    `status=${badOrder.status} code=${badOrder.payload?.code}`)

  record('reservation', 'reservation-6-confirmation-no-id-leak',
    !JSON.stringify(created.payload).includes('tenantId') &&
      !JSON.stringify(created.payload).includes('businessId') &&
      !JSON.stringify(created.payload).includes('accommodationId'),
    'confirmation payload must not contain internal ids')

  console.log('\n[NO-OVERBOOK] 4 cabins: 1 unit per reservation, exhausted after the 4th...\n')

  const reservationRowsBefore = [...store.get('reservation').values()]
  const consumed = reservationRowsBefore.filter((r) => r.accommodationId === ENSUENO_ACCOMMODATION_ID).length

  const fills = []
  for (let i = 0; i < 4 - consumed; i++) {
    const res = await apiPost(`/api/v1/booking/companies/${ENSUENO_SLUG}/reservations`, {
      ...baseBody,
      guestName: `Llenado Ensueño ${i + 1}`,
    })
    fills.push(res.status)
  }

  const afterAvailability = await apiGet(`/api/v1/booking/companies/${ENSUENO_SLUG}/availability`, {
    checkIn: CHECK_IN,
    checkOut: CHECK_OUT,
  })
  const afterDates = afterAvailability.payload?.data?.dates || []
  record('no-overbook', 'capacity-1-nights-no-longer-all-available-after-inventory',
    fills.every((s) => s === 201) &&
      afterAvailability.status === 200 &&
      afterDates.length === 3 &&
      afterDates.some((d) => d.status !== 'available'),
    `fills=${fills.join(',')} statuses=${afterDates.map((d) => d.status).join(',')}`)

  const extraAttempt = await apiPost(`/api/v1/booking/companies/${ENSUENO_SLUG}/reservations`, { ...baseBody, guestName: 'Viajera Extra' })
  record('no-overbook', 'capacity-2-inventory-exhausted-next-rejected-409',
    extraAttempt.status === 409 && extraAttempt.payload?.code === 'AVAILABILITY_CONFLICT',
    `status=${extraAttempt.status} code=${extraAttempt.payload?.code}`)

  console.log('\n[TRAVELER-FORM] G-A certified widget form surface...\n')

  const enabledVm = {
    booking: {
      enabled: true,
      slug: ENSUENO_SLUG,
      title: 'Reserva tu cabaña en el Complejo Ensueño',
      description: 'Cabañas en Curiñanco',
    },
  }
  const enabledHtml = renderBookingSection(enabledVm)
  record('traveler-form', 'traveler-form-1-guest-count-input',
    enabledHtml.includes(`name="guestCount"`) &&
      enabledHtml.includes('Huéspedes') &&
      enabledHtml.includes(`/api/v1/booking/companies/${ENSUENO_SLUG}/availability`) &&
      enabledHtml.includes('Reservar'),
    'guestCount input + Huéspedes label + endpoints present in SSR')

  record('traveler-form', 'traveler-form-2-disabled-empty',
    renderBookingSection({ booking: { enabled: false } }) === '' &&
      renderBookingSection({ booking: { enabled: true } }) === '',
    'disabled / no-slug omit the section')

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