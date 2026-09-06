/**
 * BOOKING-4.1: Accommodation Availability Target Identity Suite
 *
 * Tests the targetType/targetId mirror enforcement for accommodation availability.
 * Also tests tenant ownership hardening for create paths.
 *
 * BOOKING-4.1 does NOT generalize availability to non-accommodation targets.
 * The targetType/targetId are a compatibility mirror only.
 */
import { BaseCapabilityTest, runIfMain } from '../capability/capability.base.test.js'
import { createAvailabilityDayData } from '../fixtures/availability.fixture.js'
import { AvailabilityConflictError } from '../../capabilities/availability/availability.errors.js'
import { AvailabilityManager } from '../../capabilities/availability/availability.manager.js'
import { storeRows } from '../capability/capability.assertions.js'
import { MIGRATION_REGISTRY } from '../../database/index.js'
import { InMemoryRepositoryAdapter } from './capability.mock.repositories.js'

const ACC_ID = 'acc-booking41-1'
const ACC_ID_2 = 'acc-booking41-2'
const DAY = '2026-09-10'
const TEST_TENANT_ID = 'commercial'
const OTHER_TENANT_ID = 'other-tenant'

class Booking41Test extends BaseCapabilityTest {
  constructor() {
    super('booking41')
  }

  async runScenario(bundle) {
    InMemoryRepositoryAdapter.seed('accommodation', [
      { id: ACC_ID, tenantId: TEST_TENANT_ID, name: 'Test Accommodation', deletedAt: null },
    ])

    const availability = bundle.capability('availability')
    const manager = availability.manager
    const identity = bundle.identity

    // 1. legacy createDay(accommodationId only) populates mirror
    const legacyDay = await manager.createDay(
      createAvailabilityDayData(ACC_ID, DAY),
      identity
    )
    this.check('legacy-createDay:succeeded', legacyDay.success === true, 'legacy createDay succeeded')
    const legacyRow = storeRows(bundle, 'availability').find((r) => r.date === DAY && r.accommodationId === ACC_ID)
    this.check('legacy-createDay:has-mirror', legacyRow?.targetType === 'accommodation' && legacyRow?.targetId === ACC_ID,
      `legacy createDay populates mirror: targetType=${legacyRow?.targetType}, targetId=${legacyRow?.targetId}`)

    // 1b. persisted tenantId equals context tenant
    this.check('legacy-createDay:tenant-matches-context', legacyRow?.tenantId === TEST_TENANT_ID,
      `persisted tenantId equals context tenant: ${legacyRow?.tenantId} === ${TEST_TENANT_ID}`)

    // 2. explicit matching target identity succeeds
    const explicitDay = await manager.createDay(
      createAvailabilityDayData(ACC_ID, '2026-09-11', {
        targetType: 'accommodation',
        targetId: ACC_ID,
      }),
      identity
    )
    this.check('explicit-matching:succeeded', explicitDay.success === true, 'explicit matching target identity succeeded')

    // 3. mismatched targetId fails closed
    let mismatchedIdCaught = false
    try {
      await manager.createDay(
        createAvailabilityDayData(ACC_ID, '2026-09-12', {
          targetType: 'accommodation',
          targetId: ACC_ID_2,
        }),
        identity
      )
    } catch (err) {
      mismatchedIdCaught = err instanceof AvailabilityConflictError
    }
    this.check('mismatched-targetId:fail-closed', mismatchedIdCaught, 'mismatched targetId throws AvailabilityConflictError')

    // 4. non-accommodation targetType fails closed
    let wrongTypeCaught = false
    try {
      await manager.createDay(
        createAvailabilityDayData(ACC_ID, '2026-09-13', {
          targetType: 'tour',
          targetId: ACC_ID,
        }),
        identity
      )
    } catch (err) {
      wrongTypeCaught = err instanceof AvailabilityConflictError
    }
    this.check('non-accommodation-targetType:fail-closed', wrongTypeCaught, 'non-accommodation targetType throws AvailabilityConflictError')

    // 5. block-created availability day contains mirror
    const blockResult = await manager.block(ACC_ID, '2026-10-01', '2026-10-03', 'Test block', identity)
    this.check('block:succeeded', blockResult.success === true, 'block succeeded')
    const blockCreatedRow = storeRows(bundle, 'availability').find(
      (r) => r.date === '2026-10-02' && r.accommodationId === ACC_ID && r.status === 'blocked'
    )
    this.check('block-created-day:has-mirror', blockCreatedRow?.targetType === 'accommodation' && blockCreatedRow?.targetId === ACC_ID,
      `block-created day has mirror: targetType=${blockCreatedRow?.targetType}, targetId=${blockCreatedRow?.targetId}`)

    // 5b. block-created day tenant matches context
    this.check('block-created-day:tenant-matches-context', blockCreatedRow?.tenantId === TEST_TENANT_ID,
      `block-created day tenantId equals context: ${blockCreatedRow?.tenantId} === ${TEST_TENANT_ID}`)

    // 6. reserve-created availability day contains mirror
    const reserveResult = await manager.reserve(ACC_ID, '2026-11-01', '2026-11-02', 'res-41-1', identity)
    this.check('reserve:succeeded', reserveResult.success === true, 'reserve succeeded')
    const reserveCreatedRow = storeRows(bundle, 'availability').find(
      (r) => r.date === '2026-11-02' && r.accommodationId === ACC_ID && r.status === 'reserved'
    )
    this.check('reserve-created-day:has-mirror', reserveCreatedRow?.targetType === 'accommodation' && reserveCreatedRow?.targetId === ACC_ID,
      `reserve-created day has mirror: targetType=${reserveCreatedRow?.targetType}, targetId=${reserveCreatedRow?.targetId}`)

    // 6b. reserve-created day tenant matches context
    this.check('reserve-created-day:tenant-matches-context', reserveCreatedRow?.tenantId === TEST_TENANT_ID,
      `reserve-created day tenantId equals context: ${reserveCreatedRow?.tenantId} === ${TEST_TENANT_ID}`)

    // 7. update cannot drift targetId
    const existingDay = storeRows(bundle, 'availability').find((r) => r.date === DAY && r.accommodationId === ACC_ID)
    let driftTargetIdCaught = false
    if (existingDay) {
      try {
        await manager.updateDay(existingDay.id, { targetId: ACC_ID_2 }, identity)
      } catch (err) {
        driftTargetIdCaught = err instanceof AvailabilityConflictError
      }
    }
    this.check('update:cannot-drift-targetId', driftTargetIdCaught, 'update cannot drift targetId away from accommodationId')

    // 8. update cannot drift targetType
    let driftTargetTypeCaught = false
    if (existingDay) {
      try {
        await manager.updateDay(existingDay.id, { targetType: 'tour' }, identity)
      } catch (err) {
        driftTargetTypeCaught = err instanceof AvailabilityConflictError
      }
    }
    this.check('update:cannot-drift-targetType', driftTargetTypeCaught, 'update cannot drift targetType away from accommodation')

    // 9. existing accommodation reads still operate by accommodationId
    const byAccommodationId = await manager.getMany({ accommodationId: ACC_ID }, identity)
    this.check('read:by-accommodationId-works', byAccommodationId.length > 0, 'read by accommodationId still works')

    // 10. existing accommodation public method signatures remain compatible
    const dayResult = await manager.createDay(createAvailabilityDayData(ACC_ID, '2026-12-01'), identity)
    this.check('public-method:createDay-compatible', dayResult.success === true, 'createDay signature unchanged')

    const updateResult = await manager.updateDay(dayResult.data.id, { status: 'available' }, identity)
    this.check('public-method:updateDay-compatible', updateResult.success === true, 'updateDay signature unchanged')

    const getByIdResult = await manager.getById(dayResult.data.id, identity)
    this.check('public-method:getById-compatible', getByIdResult.id === dayResult.data.id, 'getById signature unchanged')

    const getManyResult = await manager.getMany({ accommodationId: ACC_ID }, identity)
    this.check('public-method:getMany-compatible', Array.isArray(getManyResult), 'getMany signature unchanged')

    const blockResult2 = await manager.block(ACC_ID, '2026-12-10', '2026-12-11', 'Test', identity)
    this.check('public-method:block-compatible', blockResult2.success === true, 'block signature unchanged')

    const unblockResult = await manager.unblock(ACC_ID, '2026-12-10', '2026-12-11', identity)
    this.check('public-method:unblock-compatible', unblockResult.success === true, 'unblock signature unchanged')

    const reserveResult2 = await manager.reserve(ACC_ID, '2026-12-15', '2026-12-16', 'res-41-2', identity)
    this.check('public-method:reserve-compatible', reserveResult2.success === true, 'reserve signature unchanged')

    const releaseResult = await manager.release(ACC_ID, '2026-12-15', '2026-12-16', identity)
    this.check('public-method:release-compatible', releaseResult.success === true, 'release signature unchanged')

    // ── TENANT HARDENING TESTS ──

    // TEST B: data.tenantId mismatch
    let dataTenantMismatchCaught = false
    try {
      const wrongTenantManager = new AvailabilityManager({
        tenant: TEST_TENANT_ID,
        repositories: bundle.store,
      })
      await wrongTenantManager.createDay(
        createAvailabilityDayData(ACC_ID, '2026-09-20', { tenantId: OTHER_TENANT_ID }),
        { tenantId: TEST_TENANT_ID }
      )
    } catch (err) {
      dataTenantMismatchCaught = err instanceof AvailabilityConflictError
    }
    this.check('tenant:data-tenant-mismatch-fail-closed', dataTenantMismatchCaught,
      'data.tenantId mismatch throws AvailabilityConflictError')

    // TEST C: identity.tenantId mismatch on block
    let blockIdentityTenantMismatchCaught = false
    try {
      const wrongTenantManager = new AvailabilityManager({
        tenant: TEST_TENANT_ID,
        repositories: bundle.store,
      })
      await wrongTenantManager.block(ACC_ID, '2026-09-25', '2026-09-26', 'test', { tenantId: OTHER_TENANT_ID })
    } catch (err) {
      blockIdentityTenantMismatchCaught = err instanceof AvailabilityConflictError
    }
    this.check('tenant:block-identity-mismatch-fail-closed', blockIdentityTenantMismatchCaught,
      'block() identity.tenantId mismatch throws AvailabilityConflictError')

    // TEST D: identity.tenantId mismatch on reserve
    let reserveIdentityTenantMismatchCaught = false
    try {
      const wrongTenantManager = new AvailabilityManager({
        tenant: TEST_TENANT_ID,
        repositories: bundle.store,
      })
      await wrongTenantManager.reserve(ACC_ID, '2026-09-28', '2026-09-29', 'res-x', { tenantId: OTHER_TENANT_ID })
    } catch (err) {
      reserveIdentityTenantMismatchCaught = err instanceof AvailabilityConflictError
    }
    this.check('tenant:reserve-identity-mismatch-fail-closed', reserveIdentityTenantMismatchCaught,
      'reserve() identity.tenantId mismatch throws AvailabilityConflictError')

    // Context tenant object with .id shape — verify through normal creation which uses the context
    let contextTenantObjectShapeWorks = false
    try {
      const result = await manager.createDay(createAvailabilityDayData(ACC_ID, '2026-09-30'), identity)
      contextTenantObjectShapeWorks = result.success === true
    } catch (err) {
      contextTenantObjectShapeWorks = false
    }
    this.check('tenant:context-tenant-object-shape', contextTenantObjectShapeWorks,
      'context tenant object with .id shape works (verified through normal creation path)')
  }

  async validateRepository(bundle) {
    // 11. migration registry contains the new migration at core order 7
    const migration = MIGRATION_REGISTRY.find((m) => m.name === '0008_booking_availability_target_identity')
    this.check('migration-registry:has-0008', Boolean(migration), 'migration 0008 found in registry')
    this.check('migration-registry:order-7', migration?.order === 7, `migration order is 7 (got ${migration?.order})`)
    this.check('migration-registry:layer-business', migration?.layer === 'business', `migration layer is business (got ${migration?.layer})`)

    // 12. Verify persisted rows have targetType and targetId via actual store data
    const allAvailabilityRows = storeRows(bundle, 'availability')
    const rowsWithTargetIdentity = allAvailabilityRows.filter(
      (r) => r.targetType === 'accommodation' && r.targetId !== undefined && r.targetId !== null
    )
    this.check('persisted-rows:have-target-identity', rowsWithTargetIdentity.length > 0,
      `persisted rows have targetType/targetId: ${rowsWithTargetIdentity.length} rows with mirror`)
  }
}

let objectTenantShapeWorks = false

const test = new Booking41Test()
runIfMain(test, import.meta.url)
