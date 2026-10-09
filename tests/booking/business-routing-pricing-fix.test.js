/**
 * BOOKING-TRAVELER-PRICING-ROUTING-FIX-1 — production pricing routing regression.
 *
 * The physical defect: BookingAdapter -> BusinessManager.calculateReservationPrice
 * -> BusinessReservationManager.calculateReservationPrice routed pricing through the
 * BASE registered 'reservation' capability and IGNORED the scoped reservation manager
 * the adapter injects. Under a real traveler context the base capability is bound to
 * the default (commercial) tenant, so the Ensueño 90000 CLP/night availability
 * authority was invisible and the caller received 0/USD instead of 180000/CLP.
 *
 * This regression exercises the ACTUAL production entry point
 * `BusinessManager.calculateReservationPrice(...)` assembled exactly like the
 * adapter: `new BusinessManager(scopedContext, new ReservationManager(scopedContext))`.
 * It proves tenant isolation, traveler identity propagation, no fallback to the
 * commercial tenant, and that unauthorized contexts never bypass validation.
 *
 * Run: node --test tests/booking/business-routing-pricing-fix.test.js
 */
import { test } from 'node:test'
import assert from 'node:assert'
import { createTestBundle } from '../../tests/capability/capability.context.factory.js'
import { InMemoryRepositoryAdapter } from '../../tests/capability/capability.mock.repositories.js'
import { buildTravelerContext } from '../../experience/booking/traveler-context.js'
import { BusinessManager } from '../../capabilities/business/business.manager.js'
import { ReservationManager } from '../../capabilities/reservation/reservation.manager.js'

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

// createTestBundle() defaults the base context tenant to 'commercial' (TEST_TENANT),
// exactly like the runtime's base capability registration. The Ensueño records are
// seeded for TENANT only, so any routing through the base commercial capability sees
// no availability rows — the tenant-isolation signal is observable as 0/USD.
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

async function assertMissingPermission(fn, label) {
  let thrown = null
  try {
    await fn()
  } catch (error) {
    thrown = error
  }
  assert.ok(thrown, `${label}: expected a throw, but nothing was thrown`)
  assert.ok(
    thrown.message && thrown.message.startsWith('Missing permission:'),
    `${label}: expected a Missing permission rejection, got ${thrown.name || thrown.constructor?.name}: ${thrown?.message}`
  )
  return thrown
}

test('production entry point routes pricing through the scoped reservation manager (180000 CLP, traveler identity, tenant isolation)', async () => {
  InMemoryRepositoryAdapter.reset()
  seedFixtures()
  const bundle = await createTestBundle()
  try {
    const base = { ...bundle.context, repositories: bundle.repositoryRuntime }
    const { scopedContext, identity } = buildTravelerContext(base, TARGET)
    assert.equal(identity.provider, 'booking-traveler', 'identity must be a real booking-traveler identity')
    assert.equal(scopedContext.tenant.id, TENANT.id, 'scoped context must be bound to the Ensueño tenant')

    // Exact production assembly (experience/booking/booking.adapter.js):
    const business = new BusinessManager(scopedContext, new ReservationManager(scopedContext))
    const result = await business.calculateReservationPrice(BUSINESS, ACCOMMODATION, CHECK_IN, CHECK_OUT, GUESTS, identity)

    assert.equal(result.success, true, `pricing must succeed via the scoped manager: ${JSON.stringify(result)}`)
    assert.equal(result.pricePerNight, PRICE_PER_NIGHT, `pricePerNight must be the Ensueño authority ${PRICE_PER_NIGHT}`)
    assert.equal(result.price, TOTAL, `total must be ${TOTAL} (${NIGHTS} * ${PRICE_PER_NIGHT})`)
    assert.equal(result.currency, 'CLP', 'currency must be CLP from the Ensueño availability record')
    assert.equal(result.nights, NIGHTS, `nights must be ${NIGHTS} (checkout exclusive)`)
  } finally {
    await bundle.teardown()
  }
})

test('no fallback to the commercial tenant: without the injected scoped manager the neutral 0/USD default is returned, never the Ensueño authority', async () => {
  InMemoryRepositoryAdapter.reset()
  seedFixtures()
  const bundle = await createTestBundle()
  try {
    const base = { ...bundle.context, repositories: bundle.repositoryRuntime }
    const { scopedContext, identity } = buildTravelerContext(base, TARGET)

    const business = new BusinessManager(scopedContext)
    const result = await business.calculateReservationPrice(BUSINESS, ACCOMMODATION, CHECK_IN, CHECK_OUT, GUESTS, identity)

    assert.equal(result.success, true, 'fallback path reports success (a neutral default, not an authz bypass)')
    assert.notEqual(result.price, TOTAL, 'commercial-tenant fallback must never yield the Ensueño authoritative total')
    assert.notEqual(result.currency, 'CLP', 'commercial-tenant fallback must never yield authoritative CLP pricing')
  } finally {
    await bundle.teardown()
  }
})

test('unauthorized contexts never bypass validation at the production entry point', async () => {
  InMemoryRepositoryAdapter.reset()
  seedFixtures()
  const bundle = await createTestBundle()
  try {
    const base = { ...bundle.context, repositories: bundle.repositoryRuntime }
    const { scopedContext } = buildTravelerContext(base, TARGET)
    const business = new BusinessManager(scopedContext, new ReservationManager(scopedContext))

    await assertMissingPermission(
      () => business.calculateReservationPrice(BUSINESS, ACCOMMODATION, CHECK_IN, CHECK_OUT, GUESTS, null),
      'null identity'
    )

    const foreign = {
      id: 'traveler-other',
      provider: 'booking-traveler',
      tenantId: 'tenant-other',
      tenant: { id: 'tenant-other' },
      permissions: ['business:read'],
    }
    await assertMissingPermission(
      () => business.calculateReservationPrice(BUSINESS, ACCOMMODATION, CHECK_IN, CHECK_OUT, GUESTS, foreign),
      'foreign-tenant traveler identity'
    )
  } finally {
    await bundle.teardown()
  }
})