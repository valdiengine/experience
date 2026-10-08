import { test } from 'node:test'
import assert from 'node:assert'
import { createTestBundle } from '../../tests/capability/capability.context.factory.js'
import { InMemoryRepositoryAdapter } from '../../tests/capability/capability.mock.repositories.js'
import { BusinessReservationManager } from '../../capabilities/business/manager/business-reservation.manager.js'
import { installPermissionDenial } from './booking.gate-helpers.js'

const TEST_TENANT = { id: 'commercial', name: 'Commercial', slug: 'commercial' }
const BUSINESS_A = 'biz-a'
const BUSINESS_B = 'biz-b'
const ACCOMMODATION_A = 'acc-a'
const ACCOMMODATION_B = 'acc-b'

function seedTestData(bundle) {
  InMemoryRepositoryAdapter.seed('business', [
    { id: BUSINESS_A, tenantId: TEST_TENANT.id, name: 'Business A', status: 'published', deletedAt: null },
    { id: BUSINESS_B, tenantId: TEST_TENANT.id, name: 'Business B', status: 'published', deletedAt: null },
  ])
  InMemoryRepositoryAdapter.seed('accommodation', [
    { id: ACCOMMODATION_A, tenantId: TEST_TENANT.id, businessId: BUSINESS_A, name: 'Acc A', deletedAt: null },
    { id: ACCOMMODATION_B, tenantId: TEST_TENANT.id, businessId: BUSINESS_B, name: 'Acc B', deletedAt: null },
  ])
  const availabilityRows = []
  const cursor = new Date('2026-10-30')
  const end = new Date('2026-11-06')
  end.setDate(end.getDate() - 1)
  while (cursor <= end) {
    const dateStr = cursor.toISOString().slice(0, 10)
    availabilityRows.push({
      id: `avail-${TEST_TENANT.id}-${ACCOMMODATION_A}-${dateStr}`,
      tenantId: TEST_TENANT.id,
      accommodationId: ACCOMMODATION_A,
      date: dateStr,
      status: 'available',
      isBlocked: false,
      inventory: 4,
      reservedCount: 0,
      available: 4,
      price: 90000,
      currency: 'CLP',
    })
    availabilityRows.push({
      id: `avail-${TEST_TENANT.id}-${ACCOMMODATION_B}-${dateStr}`,
      tenantId: TEST_TENANT.id,
      accommodationId: ACCOMMODATION_B,
      date: dateStr,
      status: 'available',
      isBlocked: false,
      inventory: 4,
      reservedCount: 0,
      available: 4,
      price: 90000,
      currency: 'CLP',
    })
    cursor.setDate(cursor.getDate() + 1)
  }
  InMemoryRepositoryAdapter.seed('availability', availabilityRows)
}

test('C1 - OWNERSHIP MISMATCH: accommodation belongs to business A, request through business B is rejected', async () => {
  const bundle = await createTestBundle({ tenant: TEST_TENANT })
  seedTestData(bundle)
  
  const brm = new BusinessReservationManager(bundle.context)
  const identity = bundle.identity
  
  // Accommodation A belongs to Business A, but we request pricing through Business B
  let thrown = false
  try {
    await brm.calculateReservationPrice(BUSINESS_B, ACCOMMODATION_A, '2026-10-30', '2026-11-06', 2, identity)
  } catch (e) {
    thrown = true
    assert.ok(e.message.includes('Accommodation does not belong'), 'should have ownership error: ' + e.message)
  }
  assert.ok(thrown, 'should throw on ownership mismatch')
  
  await bundle.teardown()
})

test('C2 - PERMISSION DENIAL: valid relationship but authorization denies READ', async () => {
  const bundle = await createTestBundle({ tenant: TEST_TENANT })
  seedTestData(bundle)
  
  const brm = new BusinessReservationManager(bundle.context)
  const denial = installPermissionDenial(bundle, 'business:read')
  
  let thrown = false
  try {
    await brm.calculateReservationPrice(BUSINESS_A, ACCOMMODATION_A, '2026-10-30', '2026-11-06', 2, bundle.identity)
  } catch (e) {
    thrown = true
    assert.ok(e.message.includes('Missing permission'), 'should have permission error: ' + e.message)
  } finally {
    denial.restore()
  }
  assert.ok(thrown, 'should throw on permission denial')
  
  await bundle.teardown()
})

test('C3 - VALID DELEGATION: valid business/accommodation and permission reaches pricing service', async () => {
  const bundle = await createTestBundle({ tenant: TEST_TENANT })
  seedTestData(bundle)
  
  const brm = new BusinessReservationManager(bundle.context)
  const identity = bundle.identity
  
  const result = await brm.calculateReservationPrice(BUSINESS_A, ACCOMMODATION_A, '2026-10-30', '2026-11-06', 2, identity)
  
  console.log('Result:', JSON.stringify(result, null, 2))
  assert.equal(result.success, true, 'should succeed with valid relationship and permission')
  assert.ok(result.price && result.price > 0, 'should receive authoritative pricing')
  assert.equal(result.currency, 'CLP', 'currency must propagate from availability records')
  assert.equal(result.nights, 7, 'should have correct nights')
  assert.equal(result.pricePerNight, 90000, 'should have correct pricePerNight')
  
  await bundle.teardown()
})