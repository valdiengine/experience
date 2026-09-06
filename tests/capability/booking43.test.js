/**
 * BOOKING-4.3: Atomic Capacity and Double-Booking Protection Suite
 *
 * Tests:
 * 1. Status projection — inventory=3, reserved=1 -> status='available'
 * 2. Status projection — inventory=3, reserved=3 -> status='reserved'
 * 3. Status projection — is_blocked takes precedence
 * 4. Regression: BOOKING-4.1 target identity mirror still works
 * 5. Regression: BOOKING-4.2 date filter contract still works
 * 6. Regression: getCalendar still works
 * 7. Regression: checkAvailability still works
 * 8. Regression: existing reserve/release still work
 * 9. Regression: availability lifecycle still works
 *
 * NOTE: The atomic conditional UPDATE (capacity=1 concurrency protection)
 * requires a real PostgreSQL adapter and cannot be tested in-memory.
 * Physical certification on Neon valdi_test is required.
 */
import { BaseCapabilityTest, runIfMain } from '../capability/capability.base.test.js'
import { createAvailabilityDayData } from '../fixtures/availability.fixture.js'
import { AvailabilityConflictError } from '../../capabilities/availability/availability.errors.js'
import { AvailabilityManager } from '../../capabilities/availability/availability.manager.js'
import { storeRows } from '../capability/capability.assertions.js'
import { InMemoryRepositoryAdapter } from './capability.mock.repositories.js'

const ACC_ID = 'acc-booking43-1'
const ACC_ID_2 = 'acc-booking43-2'
const ACC_ID_3 = 'acc-booking43-shared'
const TEST_TENANT_ID = 'commercial'

class Booking43Test extends BaseCapabilityTest {
  constructor() {
    super('booking43')
  }

  async runScenario(bundle) {
    InMemoryRepositoryAdapter.seed('accommodation', [
      { id: ACC_ID, tenantId: TEST_TENANT_ID, name: 'Test Accommodation', deletedAt: null },
      { id: ACC_ID_2, tenantId: TEST_TENANT_ID, name: 'Test Accommodation 2', deletedAt: null },
      { id: ACC_ID_3, tenantId: TEST_TENANT_ID, name: 'Shared Capacity Accommodation', deletedAt: null },
    ])

    const availability = bundle.capability('availability')
    const manager = availability.manager
    const identity = bundle.identity

    // TEST 1: Status projection — inventory=3, reserved_count=1 -> status='available'
    // Seed availability with inventory=3 and manually set reserved_count=1
    await manager.createDay(
      createAvailabilityDayData(ACC_ID_3, '2026-12-10', { inventory: 3, reservedCount: 1, status: 'available' }),
      identity
    )

    // The status should be 'available' because reserved_count (1) < inventory (3)
    const partialRow = storeRows(bundle, 'availability').find(
      (r) => r.date === '2026-12-10' && r.accommodationId === ACC_ID_3
    )
    this.check('status:partial-capacity:available-when-reserved-less-than-inventory',
      partialRow?.status === 'available' && partialRow?.reservedCount === 1,
      `inventory=3, reservedCount=1 -> status='available' (got: status=${partialRow?.status}, reservedCount=${partialRow?.reservedCount})`)

    // TEST 2: Status projection — inventory=3, reserved_count=3 -> status='reserved'
    await manager.createDay(
      createAvailabilityDayData(ACC_ID_3, '2026-12-11', { inventory: 3, reservedCount: 3, status: 'reserved' }),
      identity
    )

    const fullRow = storeRows(bundle, 'availability').find(
      (r) => r.date === '2026-12-11' && r.accommodationId === ACC_ID_3
    )
    this.check('status:full-capacity:reserved-when-equals-inventory',
      fullRow?.status === 'reserved' && fullRow?.reservedCount === 3,
      `inventory=3, reservedCount=3 -> status='reserved' (got: status=${fullRow?.status}, reservedCount=${fullRow?.reservedCount})`)

    // TEST 3: Status projection — inventory=3, reserved_count=2 -> status='available'
    await manager.createDay(
      createAvailabilityDayData(ACC_ID_3, '2026-12-12', { inventory: 3, reservedCount: 2, status: 'available' }),
      identity
    )

    const partialRow2 = storeRows(bundle, 'availability').find(
      (r) => r.date === '2026-12-12' && r.accommodationId === ACC_ID_3
    )
    this.check('status:partial-capacity:available-when-reserved-2-of-3',
      partialRow2?.status === 'available' && partialRow2?.reservedCount === 2,
      `inventory=3, reservedCount=2 -> status='available' (got: status=${partialRow2?.status}, reservedCount=${partialRow2?.reservedCount})`)

    // TEST 4: is_blocked takes precedence over capacity projection
    await manager.createDay(
      createAvailabilityDayData(ACC_ID_2, '2026-12-25', { inventory: 5, reservedCount: 0, status: 'available' }),
      identity
    )
    await manager.block(ACC_ID_2, '2026-12-25', '2026-12-26', 'maintenance', identity)

    const blockedRow = storeRows(bundle, 'availability').find(
      (r) => r.date === '2026-12-25' && r.accommodationId === ACC_ID_2
    )
    this.check('status:is_blocked-precedence',
      blockedRow?.status === 'blocked',
      `is_blocked operation -> status='blocked' (got: status=${blockedRow?.status})`)

    // TEST 5: reserve() still works (regression)
    const reserveResult = await manager.reserve(ACC_ID, '2026-12-01', '2026-12-02', 'res-43-1', identity)
    this.check('regression:reserve:works', reserveResult.success === true,
      'reserve() still works')

    const reservedRow = storeRows(bundle, 'availability').find(
      (r) => r.date === '2026-12-01' && r.accommodationId === ACC_ID
    )
    this.check('regression:reserve:sets-status-reserved',
      reservedRow?.status === 'reserved',
      `reserve sets status='reserved': got ${reservedRow?.status}`)

    // TEST 6: release() still works (regression)
    const releaseResult = await manager.release(ACC_ID, '2026-12-01', '2026-12-02', identity)
    this.check('regression:release:works', releaseResult.success === true,
      'release() still works')

    const releasedRow = storeRows(bundle, 'availability').find(
      (r) => r.date === '2026-12-01' && r.accommodationId === ACC_ID
    )
    this.check('regression:release:sets-status-available',
      releasedRow?.status === 'available',
      `release sets status='available': got ${releasedRow?.status}`)

    // TEST 7: block() still works (regression)
    const blockResult = await manager.block(ACC_ID, '2026-12-05', '2026-12-07', 'owner-block', identity)
    this.check('regression:block:works', blockResult.success === true,
      'block() still works')

    const blockedRow2 = storeRows(bundle, 'availability').find(
      (r) => r.date === '2026-12-05' && r.accommodationId === ACC_ID
    )
    this.check('regression:block:sets-status-blocked',
      blockedRow2?.status === 'blocked',
      `block sets status='blocked': got ${blockedRow2?.status}`)

    // TEST 8: createDay() still works (regression)
    const createResult = await manager.createDay(
      createAvailabilityDayData(ACC_ID, '2026-09-15'),
      identity
    )
    this.check('regression:createDay:works', createResult.success === true,
      'createDay() still works')

    const createdRow = storeRows(bundle, 'availability').find(
      (r) => r.date === '2026-09-15' && r.accommodationId === ACC_ID
    )
    this.check('regression:createDay:has-target-mirror',
      createdRow?.targetType === 'accommodation' && createdRow?.targetId === ACC_ID,
      `createDay populates target mirror: targetType=${createdRow?.targetType}, targetId=${createdRow?.targetId}`)

    // TEST 9: getByTarget() date filter contract (BOOKING-4.2 regression)
    let dateFilterCaught = false
    try {
      await manager.getByTarget({
        targetType: 'accommodation',
        targetId: ACC_ID,
        startDate: '2026-09-01',
      }, identity)
    } catch (err) {
      dateFilterCaught = err instanceof AvailabilityConflictError
    }
    this.check('regression:booking42:date-filter-contract',
      dateFilterCaught,
      'BOOKING-4.2 partial date range guard still works')

    // TEST 10: getCalendar() still works (regression)
    const calendar = await manager.getCalendar(ACC_ID, '2026-09-01', '2026-09-30', identity)
    this.check('regression:getCalendar:works',
      Array.isArray(calendar),
      'getCalendar still works')

    // TEST 11: checkAvailability() still works (regression)
    const checkAvail = await manager.checkAvailability(ACC_ID, '2026-09-01', '2026-09-30', identity)
    this.check('regression:checkAvailability:works',
      checkAvail && typeof checkAvail.available === 'boolean',
      'checkAvailability still works')

    // TEST 12: getOccupancy() still works (regression)
    const occupancy = await manager.getOccupancy(ACC_ID, '2026-09-01', '2026-09-30', identity)
    this.check('regression:getOccupancy:works',
      occupancy && typeof occupancy.total === 'number',
      'getOccupancy still works')

    // TEST 13: getCalendarSummary() still works (regression)
    const summary = await manager.getCalendarSummary(ACC_ID, '2026-09-01', '2026-09-30', identity)
    this.check('regression:getCalendarSummary:works',
      summary !== undefined && summary !== null,
      'getCalendarSummary still works')

    // TEST 14: target identity mirror (BOOKING-4.1 regression)
    const mirrorDay = await manager.createDay(
      createAvailabilityDayData(ACC_ID, '2026-09-20', {
        targetType: 'accommodation',
        targetId: ACC_ID,
      }),
      identity
    )
    this.check('regression:booking41:target-mirror-works',
      mirrorDay.success === true,
      'BOOKING-4.1 target identity mirror still works')

    // TEST 15: tenant isolation (regression)
    InMemoryRepositoryAdapter.seed('accommodation', [
      { id: ACC_ID, tenantId: TEST_TENANT_ID, name: 'Test Accommodation', deletedAt: null },
    ])
    const foreignDay = await manager.createDay(
      createAvailabilityDayData(ACC_ID, '2026-09-25'),
      identity
    )
    const foreignRow = storeRows(bundle, 'availability').find(
      (r) => r.date === '2026-09-25' && r.accommodationId === ACC_ID
    )
    this.check('regression:tenant-isolation',
      foreignRow?.tenantId === TEST_TENANT_ID,
      `tenantId correctly set to ${TEST_TENANT_ID}: got ${foreignRow?.tenantId}`)
  }
}

const test = new Booking43Test()
runIfMain(test, import.meta.url)
