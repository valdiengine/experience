/**
 * TRAVELER-PRICING-AUTH-1 — real traveler authorization boundary + identity
 * propagation through the pricing chain.
 *
 * The physical defect: BookingAdapter -> BusinessManager ->
 * BusinessReservationManager -> ReservationService.calculateReservationPrice
 * received the real `booking-traveler` identity but ReservationService dropped
 * it. ReservationManager.calculatePrice then handed `null` to
 * availability.service.getCalendar(...), which the real
 * createTravelerAuthFacade() rejects — so under a REAL traveler context pricing
 * fell back to 0/USD instead of the Ensueño 90000 CLP/night authority, and a
 * legitimate zero was later nulled by truthy persistence fallbacks.
 *
 * This regression deliberately does NOT rely on createTestBundle's mock
 * authorization: it builds the real traveler boundary via
 * buildTravelerContext() + createTravelerAuthFacade() and proves that a
 * `booking-traveler` identity carrying `availability:read` reaches availability
 * pricing with authoritative values, while null/missing traveler identity is
 * not silently authorized.
 *
 * Run: node tests/booking/traveler-pricing-auth-boundary.test.js
 */
import { test } from 'node:test'
import assert from 'node:assert'
import { createTestBundle } from '../../tests/capability/capability.context.factory.js'
import { InMemoryRepositoryAdapter } from '../../tests/capability/capability.mock.repositories.js'
import { buildTravelerContext } from '../../experience/booking/traveler-context.js'
import { ReservationManager } from '../../capabilities/reservation/reservation.manager.js'
import { ReservationService } from '../../capabilities/reservation/reservation.service.js'
import { AvailabilityManager } from '../../capabilities/availability/availability.manager.js'

const TENANT = { id: 'tenant-ensueno-1', name: 'Ensueño Curiñanco', slug: 'ensueno-curinanco' }
const BUSINESS = 'biz-ensueno-curinanco'
const ACCOMMODATION = 'acc-ensueno'
const GUESTS = 2
const CHECK_IN = '2026-12-15'
const CHECK_OUT = '2026-12-17'
const NIGHTS = 2
const PRICE_PER_NIGHT = 90000
const TOTAL = PRICE_PER_NIGHT * NIGHTS

const TARGET = {
  companySlug: 'ensueno-curinanco',
  tenantId: TENANT.id,
  tenantName: TENANT.name,
  tenantSlug: TENANT.slug,
  businessId: BUSINESS,
  accommodationId: ACCOMMODATION,
  currency: 'CLP',
}

function seedFixtures() {
  InMemoryRepositoryAdapter.seed('business', [
    { id: BUSINESS, tenantId: TENANT.id, name: 'Negocio Ensueño Curiñanco', status: 'published', deletedAt: null },
  ])
  InMemoryRepositoryAdapter.seed('accommodation', [
    { id: ACCOMMODATION, tenantId: TENANT.id, businessId: BUSINESS, name: 'Alojamiento Ensueño Curiñanco', deletedAt: null },
  ])
  InMemoryRepositoryAdapter.seed('availability', [
    { id: 'avail-ensueno-1', tenantId: TENANT.id, accommodationId: ACCOMMODATION, date: '2026-12-15', status: 'available', capacity: 4, available: 4, price: PRICE_PER_NIGHT, currency: 'CLP' },
    { id: 'avail-ensueno-2', tenantId: TENANT.id, accommodationId: ACCOMMODATION, date: '2026-12-16', status: 'available', capacity: 4, available: 4, price: PRICE_PER_NIGHT, currency: 'CLP' },
  ])
}

async function assertRejects(fn, expectedName, label) {
  let thrown = null
  try {
    await fn()
  } catch (error) {
    thrown = error
  }
  assert.ok(thrown, `${label}: expected a throw, but nothing was thrown`)
  assert.equal(typeof thrown.name, 'string', `${label}: thrown object must have a name`)
  assert.equal(thrown.name, expectedName, `${label}: expected ${expectedName}, got ${thrown.name || thrown.constructor?.name}: ${thrown.message}`)
  return thrown
}

test('booking-traveler identity with availability:read reaches availability pricing with the Ensueño authority', async () => {
  InMemoryRepositoryAdapter.reset()
  seedFixtures()
  const bundle = await createTestBundle({ tenant: TENANT })
  try {
    // Real traveler boundary: buildTravelerContext constructs the scoped
    // context whose runtime.auth is createTravelerAuthFacade(tenantId) and a
    // booking-traveler identity carrying availability:read + reservation:create.
    const base = { ...bundle.context, repositories: bundle.repositoryRuntime }
    const { scopedContext, identity } = buildTravelerContext(base, TARGET)
    assert.equal(identity.provider, 'booking-traveler', 'identity must be a real booking-traveler identity')
    assert.ok(identity.permissions.includes('availability:read'), 'traveler must carry availability:read')
    assert.equal(scopedContext.runtime.auth && typeof scopedContext.runtime.auth.authorize, 'function', 'scoped runtime must expose the real traveler auth facade')

    // The exact fixed chain: ReservationService -> ReservationManager.calculatePrice
    // -> AvailabilityService.getCalendar with the SAME identity.
    const service = new ReservationService(new ReservationManager(scopedContext))
    const result = await service.calculateReservationPrice(ACCOMMODATION, CHECK_IN, CHECK_OUT, GUESTS, identity)

    assert.equal(result.success, true, `pricing must succeed: ${JSON.stringify(result)}`)
    assert.equal(result.price, TOTAL, `total price must be ${TOTAL} (${NIGHTS} * ${PRICE_PER_NIGHT})`)
    assert.equal(result.pricePerNight, PRICE_PER_NIGHT, `pricePerNight must be the availability authority ${PRICE_PER_NIGHT}`)
    assert.equal(result.currency, 'CLP', 'currency must propagate as CLP from the availability record')
    assert.equal(result.nights, NIGHTS, `nights must be the exclusive-night count ${NIGHTS} (checkout is exclusive)`)
  } finally {
    bundle.teardown()
  }
})

test('null/missing traveler identity is NOT silently authorized at the threshold of the real traveler facade', async () => {
  InMemoryRepositoryAdapter.reset()
  seedFixtures()
  const bundle = await createTestBundle({ tenant: TENANT })
  try {
    const base = { ...bundle.context, repositories: bundle.repositoryRuntime }
    const { scopedContext } = buildTravelerContext(base, TARGET)
    const auth = scopedContext.runtime.auth

    // The facade itself refuses a missing identity, exactly the rejection the
    // old `getCalendar(..., null)` hit.
    await assertRejects(
      () => auth.authorize(null, 'availability:read', 'availability'),
      'BookingTravelerAuthException',
      'authorize(null, availability:read)'
    )

    // A traveler scoped to a DIFFERENT tenant is refused too — tenant isolation.
    const foreign = {
      id: 'traveler-other',
      provider: 'booking-traveler',
      tenantId: 'tenant-other',
      tenant: { id: 'tenant-other' },
      roles: [],
      permissions: ['availability:read', 'business:read', 'business:update', 'reservation:create'],
    }
    await assertRejects(
      () => auth.authorize(foreign, 'availability:read', 'availability'),
      'BookingTravelerAuthException',
      'authorize(foreign-tenant traveler, availability:read)'
    )

    // The availability manager (the exact receiver that used to get `null`)
    // refuses a missing identity as an unavailable permission.
    const availability = new AvailabilityManager(scopedContext)
    await assertRejects(
      () => availability.getCalendar(ACCOMMODATION, CHECK_IN, CHECK_OUT, null),
      'AvailabilityPermissionError',
      'getCalendar with null identity'
    )
  } finally {
    bundle.teardown()
  }
})

test('a missing traveler identity must never reach the authoritative Ensueño price', async () => {
  InMemoryRepositoryAdapter.reset()
  seedFixtures()
  const bundle = await createTestBundle({ tenant: TENANT })
  try {
    const base = { ...bundle.context, repositories: bundle.repositoryRuntime }
    const { scopedContext } = buildTravelerContext(base, TARGET)

    const service = new ReservationService(new ReservationManager(scopedContext))
    const nullResult = await service.calculateReservationPrice(ACCOMMODATION, CHECK_IN, CHECK_OUT, GUESTS, null)

    // The reservation manager's availability read is refused for null, so the
    // silent fallback must NOT have produced the authoritative price. This
    // proves the previous behavior (authored prices under a null identity) is
    // gone and the identity must flow from the caller.
    assert.equal(nullResult.success, true, 'fallback still reports success (not an auth bypass)')
    assert.notEqual(nullResult.price, TOTAL, `null identity must never yield the authoritative total ${TOTAL}`)
    assert.notEqual(nullResult.currency, 'CLP', 'null identity must never yield authoritative CLP pricing')
    assert.equal(nullResult.price, 0, 'null-identity fallback produces the neutral 0 price')
    assert.equal(nullResult.currency, 'USD', 'null-identity fallback produces the neutral USD default')
  } finally {
    bundle.teardown()
  }
})