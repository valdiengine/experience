/**
 * BOOKING-4.2: Generic Availability Read Contract Suite
 *
 * Tests:
 * 1. Target ownership hardening for createDay, block, reserve
 * 2. getByTarget() generic read contract
 * 3. Cross-tenant ownership enforcement
 * 4. No regression on existing APIs
 */
import { BaseCapabilityTest, runIfMain } from '../capability/capability.base.test.js'
import { createAvailabilityDayData } from '../fixtures/availability.fixture.js'
import { AvailabilityConflictError, AvailabilityNotFoundError } from '../../capabilities/availability/availability.errors.js'
import { AvailabilityManager } from '../../capabilities/availability/availability.manager.js'
import { storeRows } from '../capability/capability.assertions.js'
import { InMemoryRepositoryAdapter } from './capability.mock.repositories.js'

const ACC_ID = 'acc-booking42-owned'
const ACC_ID_FOREIGN = 'acc-booking42-foreign'
const DAY = '2026-09-10'
const TEST_TENANT_ID = 'commercial'
const FOREIGN_TENANT_ID = 'foreign-tenant'

function createMockAccommodationRepo(accommodations) {
  const repo = {
    findById: async (id) => {
      const acc = accommodations.get(id)
      return acc || null
    },
    findOne: async (query) => {
      for (const acc of accommodations.values()) {
        let match = true
        for (const [k, v] of Object.entries(query)) {
          if (acc[k] !== v) { match = false; break }
        }
        if (match) return acc
      }
      return null
    },
    findMany: async (query) => {
      const results = []
      for (const acc of accommodations.values()) {
        let match = true
        for (const [k, v] of Object.entries(query)) {
          if (Array.isArray(v)) {
            if (!v.includes(acc[k])) { match = false; break }
          } else if (typeof v === 'object' && v !== null) {
            if (v.gte !== undefined && acc[k] < v.gte) { match = false; break }
            if (v.lte !== undefined && acc[k] > v.lte) { match = false; break }
          } else if (acc[k] !== v) { match = false; break }
        }
        if (match) results.push(acc)
      }
      return results
    },
  }
  return repo
}

function createMockRepoFacade(accommodations, availabilityAdapter) {
  return {
    accommodation: createMockAccommodationRepo(accommodations),
    availability: availabilityAdapter,
  }
}

class Booking42Test extends BaseCapabilityTest {
  constructor() {
    super('booking42')
  }

  async runScenario(bundle) {
    InMemoryRepositoryAdapter.seed('accommodation', [
      { id: ACC_ID, tenantId: TEST_TENANT_ID, name: 'Owned Accommodation', deletedAt: null },
    ])

    const accommodationStore = new Map([
      [ACC_ID, { id: ACC_ID, tenantId: TEST_TENANT_ID, name: 'Owned Accommodation', deletedAt: null }],
      [ACC_ID_FOREIGN, { id: ACC_ID_FOREIGN, tenantId: FOREIGN_TENANT_ID, name: 'Foreign Accommodation', deletedAt: null }],
    ])

    const availability = bundle.capability('availability')
    const manager = availability.manager
    const identity = bundle.identity

    // TEST 1: Tenant A creates availability for owned Accommodation A — succeeds
    const ownedDay = await manager.createDay(
      createAvailabilityDayData(ACC_ID, DAY),
      identity
    )
    this.check('create:owned-accommodation:succeeds', ownedDay.success === true,
      'createDay for owned accommodation succeeds')
    const ownedRow = storeRows(bundle, 'availability').find(
      (r) => r.date === DAY && r.accommodationId === ACC_ID
    )
    this.check('create:owned-accommodation:persisted', Boolean(ownedRow),
      'availability row persisted for owned accommodation')
    this.check('create:owned-accommodation:tenant-matches', ownedRow?.tenantId === TEST_TENANT_ID,
      `tenantId matches context: ${ownedRow?.tenantId} === ${TEST_TENANT_ID}`)
    this.check('create:owned-accommodation:has-mirror', ownedRow?.targetType === 'accommodation' && ownedRow?.targetId === ACC_ID,
      'targetType/targetId mirror populated correctly')

    // TEST 2: Tenant A attempts createDay using Accommodation B owned by Tenant B — fails closed
    let crossTenantCreateCaught = false
    try {
      const foreignManager = new AvailabilityManager({
        tenant: TEST_TENANT_ID,
        repositories: createMockRepoFacade(accommodationStore, bundle.store),
      })
      await foreignManager.createDay(
        createAvailabilityDayData(ACC_ID_FOREIGN, '2026-09-11'),
        { tenantId: TEST_TENANT_ID }
      )
    } catch (err) {
      crossTenantCreateCaught = err instanceof AvailabilityNotFoundError || err instanceof AvailabilityConflictError
    }
    this.check('create:foreign-accommodation:fail-closed', crossTenantCreateCaught,
      'createDay for foreign accommodation fails closed')

    // TEST 3: Tenant A attempts block() using Accommodation B — fails closed before creating rows
    let crossTenantBlockCaught = false
    try {
      const foreignManager = new AvailabilityManager({
        tenant: TEST_TENANT_ID,
        repositories: createMockRepoFacade(accommodationStore, bundle.store),
      })
      await foreignManager.block(ACC_ID_FOREIGN, '2026-09-15', '2026-09-16', 'test', { tenantId: TEST_TENANT_ID })
    } catch (err) {
      crossTenantBlockCaught = err instanceof AvailabilityNotFoundError || err instanceof AvailabilityConflictError
    }
    this.check('block:foreign-accommodation:fail-closed', crossTenantBlockCaught,
      'block() for foreign accommodation fails closed')

    // TEST 4: Tenant A attempts reserve() using Accommodation B — fails closed
    let crossTenantReserveCaught = false
    try {
      const foreignManager = new AvailabilityManager({
        tenant: TEST_TENANT_ID,
        repositories: createMockRepoFacade(accommodationStore, bundle.store),
      })
      await foreignManager.reserve(ACC_ID_FOREIGN, '2026-09-18', '2026-09-19', 'res-x', { tenantId: TEST_TENANT_ID })
    } catch (err) {
      crossTenantReserveCaught = err instanceof AvailabilityNotFoundError || err instanceof AvailabilityConflictError
    }
    this.check('reserve:foreign-accommodation:fail-closed', crossTenantReserveCaught,
      'reserve() for foreign accommodation fails closed')

    // TEST 5: getByTarget with owned accommodation returns data
    const byTarget = await manager.getByTarget({
      targetType: 'accommodation',
      targetId: ACC_ID,
      startDate: '2026-09-01',
      endDate: '2026-09-30',
    }, identity)
    this.check('getByTarget:owned-accommodation:returns-data', Array.isArray(byTarget) && byTarget.length > 0,
      'getByTarget returns availability data for owned accommodation')
    const targetRow = byTarget.find((r) => r.date === DAY)
    this.check('getByTarget:owned-accommodation:has-correct-date', Boolean(targetRow),
      'getByTarget returns correct date')

    // TEST 6: getByTarget with non-accommodation targetType fails closed
    let wrongTargetTypeCaught = false
    try {
      await manager.getByTarget({
        targetType: 'tour',
        targetId: ACC_ID,
        startDate: '2026-09-01',
        endDate: '2026-09-30',
      }, identity)
    } catch (err) {
      wrongTargetTypeCaught = err instanceof AvailabilityConflictError
    }
    this.check('getByTarget:wrong-targetType:fail-closed', wrongTargetTypeCaught,
      'getByTarget with non-accommodation targetType fails closed')

    // TEST 7: getByTarget with foreign targetId fails closed
    let foreignTargetIdCaught = false
    try {
      await manager.getByTarget({
        targetType: 'accommodation',
        targetId: ACC_ID_FOREIGN,
        startDate: '2026-09-01',
        endDate: '2026-09-30',
      }, identity)
    } catch (err) {
      foreignTargetIdCaught = err instanceof AvailabilityNotFoundError || err instanceof AvailabilityConflictError
    }
    this.check('getByTarget:foreign-targetId:fail-closed', foreignTargetIdCaught,
      'getByTarget with foreign targetId fails closed')

    // TEST 8: getByTarget without targetType fails
    let missingTargetTypeCaught = false
    try {
      await manager.getByTarget({ targetId: ACC_ID }, identity)
    } catch (err) {
      missingTargetTypeCaught = err instanceof AvailabilityConflictError
    }
    this.check('getByTarget:missing-targetType:fail-closed', missingTargetTypeCaught,
      'getByTarget without targetType fails closed')

    // TEST 9: getByTarget without targetId fails
    let missingTargetIdCaught = false
    try {
      await manager.getByTarget({ targetType: 'accommodation' }, identity)
    } catch (err) {
      missingTargetIdCaught = err instanceof AvailabilityConflictError
    }
    this.check('getByTarget:missing-targetId:fail-closed', missingTargetIdCaught,
      'getByTarget without targetId fails closed')

    // TEST 10: getByTarget returns flat array when no date range
    const flatResult = await manager.getByTarget({
      targetType: 'accommodation',
      targetId: ACC_ID,
    }, identity)
    this.check('getByTarget:no-date-range:returns-array', Array.isArray(flatResult),
      'getByTarget without date range returns flat array')

    // TEST 10b: getByTarget with startDate only fails closed
    let startDateOnlyCaught = false
    try {
      await manager.getByTarget({
        targetType: 'accommodation',
        targetId: ACC_ID,
        startDate: '2026-09-01',
      }, identity)
    } catch (err) {
      startDateOnlyCaught = err instanceof AvailabilityConflictError
    }
    this.check('getByTarget:startDate-only:fail-closed', startDateOnlyCaught,
      'getByTarget with startDate only fails closed')

    // TEST 10c: getByTarget with endDate only fails closed
    let endDateOnlyCaught = false
    try {
      await manager.getByTarget({
        targetType: 'accommodation',
        targetId: ACC_ID,
        endDate: '2026-09-30',
      }, identity)
    } catch (err) {
      endDateOnlyCaught = err instanceof AvailabilityConflictError
    }
    this.check('getByTarget:endDate-only:fail-closed', endDateOnlyCaught,
      'getByTarget with endDate only fails closed')

    // TEST 10d: getByTarget with startDate > endDate fails closed
    let startAfterEndCaught = false
    try {
      await manager.getByTarget({
        targetType: 'accommodation',
        targetId: ACC_ID,
        startDate: '2026-09-30',
        endDate: '2026-09-01',
      }, identity)
    } catch (err) {
      startAfterEndCaught = err.name === 'AvailabilityValidationError' || err instanceof AvailabilityConflictError
    }
    this.check('getByTarget:startAfterEndDate:fail-closed', startAfterEndCaught,
      'getByTarget with startDate > endDate fails closed')

    // TEST 11: Existing getCalendar still works (regression)
    const calendar = await manager.getCalendar(ACC_ID, '2026-09-01', '2026-09-30', identity)
    this.check('regression:getCalendar:works', Array.isArray(calendar) && calendar.length > 0,
      'getCalendar still works after BOOKING-4.2')

    // TEST 12: Existing checkAvailability still works (regression)
    const checkAvail = await manager.checkAvailability(ACC_ID, '2026-09-01', '2026-09-30', identity)
    this.check('regression:checkAvailability:works', checkAvail && typeof checkAvail.available === 'boolean',
      'checkAvailability still works after BOOKING-4.2')

    // TEST 13: Existing block on owned accommodation still works (regression)
    const blockResult = await manager.block(ACC_ID, '2026-10-01', '2026-10-03', 'Test', identity)
    this.check('regression:block:owned-accommodation:works', blockResult.success === true,
      'block() on owned accommodation still works')

    // TEST 14: Existing reserve on owned accommodation still works (regression)
    const reserveResult = await manager.reserve(ACC_ID, '2026-11-01', '2026-11-02', 'res-42-1', identity)
    this.check('regression:reserve:owned-accommodation:works', reserveResult.success === true,
      'reserve() on owned accommodation still works')

    // TEST 15: getOccupancy still works (regression)
    const occupancy = await manager.getOccupancy(ACC_ID, '2026-09-01', '2026-09-30', identity)
    this.check('regression:getOccupancy:works', occupancy && typeof occupancy.total === 'number',
      'getOccupancy still works after BOOKING-4.2')

    // TEST 16: getCalendarSummary still works (regression)
    const summary = await manager.getCalendarSummary(ACC_ID, '2026-09-01', '2026-09-30', identity)
    this.check('regression:getCalendarSummary:works', summary !== undefined && summary !== null,
      'getCalendarSummary still works after BOOKING-4.2')

    // TEST 17: block creates day with correct target mirror (regression)
    const blockCreatedRow = storeRows(bundle, 'availability').find(
      (r) => r.date === '2026-10-02' && r.accommodationId === ACC_ID && r.status === 'blocked'
    )
    this.check('regression:block:has-target-mirror', blockCreatedRow?.targetType === 'accommodation' && blockCreatedRow?.targetId === ACC_ID,
      'block-created row has correct targetType/targetId mirror')

    // TEST 18: reserve creates day with correct target mirror (regression)
    const reserveCreatedRow = storeRows(bundle, 'availability').find(
      (r) => r.date === '2026-11-02' && r.accommodationId === ACC_ID && r.status === 'reserved'
    )
    this.check('regression:reserve:has-target-mirror', reserveCreatedRow?.targetType === 'accommodation' && reserveCreatedRow?.targetId === ACC_ID,
      'reserve-created row has correct targetType/targetId mirror')
  }
}

const test = new Booking42Test()
runIfMain(test, import.meta.url)
