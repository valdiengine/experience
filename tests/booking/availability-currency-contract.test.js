import { test } from 'node:test'
import assert from 'node:assert'
import { createTestBundle } from '../../tests/capability/capability.context.factory.js'
import { InMemoryRepositoryAdapter } from '../../tests/capability/capability.mock.repositories.js'
import { AvailabilityManager } from '../../capabilities/availability/availability.manager.js'

const TEST_TENANT = { id: 'commercial', name: 'Commercial', slug: 'commercial' }
const ACCOMMODATION_ID = 'acc-test-currency'

test('A1 - Availability contract: getCalendar preserves currency from records', async () => {
  const bundle = await createTestBundle({ tenant: TEST_TENANT })
  
  // Seed availability with currency
  InMemoryRepositoryAdapter.seed('availability', [
    { id: `avail-${TEST_TENANT.id}-${ACCOMMODATION_ID}-2026-10-30`, tenantId: TEST_TENANT.id, accommodationId: ACCOMMODATION_ID, date: '2026-10-30', status: 'available', isBlocked: false, capacity: 4, available: 4, price: 90000, currency: 'CLP' },
    { id: `avail-${TEST_TENANT.id}-${ACCOMMODATION_ID}-2026-10-31`, tenantId: TEST_TENANT.id, accommodationId: ACCOMMODATION_ID, date: '2026-10-31', status: 'available', isBlocked: false, capacity: 4, available: 4, price: 90000, currency: 'CLP' },
  ])
  
  const manager = new AvailabilityManager(bundle.context)
  const calendar = await manager.getCalendar(ACCOMMODATION_ID, '2026-10-30', '2026-10-31', bundle.identity)
  
  assert.equal(calendar.length, 2)
  assert.equal(calendar[0].price, 90000)
  assert.equal(calendar[0].currency, 'CLP', 'currency must be preserved from record')
  assert.equal(calendar[1].price, 90000)
  assert.equal(calendar[1].currency, 'CLP', 'currency must be preserved from record')
  
  await bundle.teardown()
})

test('A2 - Availability contract: getCalendar handles missing currency gracefully', async () => {
  const bundle = await createTestBundle({ tenant: TEST_TENANT })
  
  // Seed availability WITHOUT currency
  InMemoryRepositoryAdapter.seed('availability', [
    { id: `avail-${TEST_TENANT.id}-${ACCOMMODATION_ID}-2026-10-30`, tenantId: TEST_TENANT.id, accommodationId: ACCOMMODATION_ID, date: '2026-10-30', status: 'available', isBlocked: false, capacity: 4, available: 4, price: 90000 },
  ])
  
  const manager = new AvailabilityManager(bundle.context)
  const calendar = await manager.getCalendar(ACCOMMODATION_ID, '2026-10-30', '2026-10-30', bundle.identity)
  
  assert.equal(calendar.length, 1)
  assert.equal(calendar[0].price, 90000)
  assert.equal(calendar[0].currency, null, 'currency should be null when not present in record')
  
  await bundle.teardown()
})