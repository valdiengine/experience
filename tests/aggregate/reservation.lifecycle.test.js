/**
 * Reservation Lifecycle Suite (P13.5.7)
 *
 * Exercises the reservation capability: request → validate → owner
 * confirmation request → reject → archive → restore → delete.
 *
 * NOTE: confirmReservation/cancelReservation call
 * `availability.updateAvailability(...)`, which does NOT exist on the
 * availability capability (known latent defect — P13.5.7 scope note). Those
 * two paths are intentionally not exercised here.
 */
import { BaseCapabilityTest, runIfMain } from '../capability/capability.base.test.js'
import { assertEvent, assertAuthorization, storeRows } from '../capability/capability.assertions.js'
import { createReservationData } from '../fixtures/reservation.fixture.js'
import { RESERVATION_EVENTS } from '../../capabilities/reservation/reservation.events.js'
import { RESERVATION_STATUS } from '../../capabilities/reservation/reservation.status.js'
import { RESERVATION_PERMISSIONS } from '../../capabilities/reservation/reservation.permissions.js'

class ReservationLifecycleTest extends BaseCapabilityTest {
  constructor() {
    super('reservation.lifecycle')
  }

  async runScenario(bundle) {
    const { identity } = bundle
    const reservation = bundle.capability('reservation')
    const manager = reservation.manager

    // 1. Create request
    const created = await manager.createRequest(createReservationData({ id: 'res-1' }), identity)
    this.check('created', created.success === true && created.status === 'requested', 'createRequest succeeded')
    this.check('row', storeRows(bundle, 'reservation').some((r) => r.id === 'res-1'), 'reservation row persisted')
    await this.checkAsync(assertEvent(bundle, RESERVATION_EVENTS.CREATED, 'reservation:created emitted'), 'created-event')
    await this.checkAsync(assertAuthorization(bundle, RESERVATION_PERMISSIONS.CREATE, 'authorize(reservation:create) recorded'), 'auth-create')
    // 2. Validate
    const validation = await manager.validateReservation('res-1', identity)
    this.check('validated', validation.valid === true, 'validateReservation valid')
    await this.checkAsync(assertEvent(bundle, RESERVATION_EVENTS.VALIDATED, 'reservation:validated emitted'), 'validated-event')
    // 3. Request owner confirmation
    const requested = await manager.requestOwnerConfirmation('res-1', identity)
    this.check('owner-pending', requested.success === true && manager.getById('res-1').status === 'owner_pending', 'requestOwnerConfirmation succeeded')
    await this.checkAsync(assertEvent(bundle, RESERVATION_EVENTS.OWNER_REQUESTED, 'reservation:owner_requested emitted'), 'owner-requested-event')
    // 4. Archive
    const archived = await manager.archiveReservation('res-1', identity)
    this.check('archived', archived.success === true && manager.getById('res-1').status === 'archived', 'archiveReservation succeeded')
    await this.checkAsync(assertEvent(bundle, RESERVATION_EVENTS.ARCHIVED, 'reservation:archived emitted'), 'archived-event')
    // 5. Restore
    const restored = await manager.restoreReservation('res-1', identity)
    this.check('restored', restored.success === true && restored.data.status === 'owner_pending', 'restoreReservation restored to owner_pending')
    await this.checkAsync(assertEvent(bundle, RESERVATION_EVENTS.RESTORED, 'reservation:restored emitted'), 'restored-event')
    // 6. Reject path (second reservation)
    await manager.createRequest(createReservationData({ id: 'res-2' }), identity)
    const rejected = await manager.rejectReservation('res-2', 'Owner unavailable', identity)
    this.check('rejected', rejected.success === true && manager.getById('res-2').status === 'rejected', 'rejectReservation succeeded')
    await this.checkAsync(assertEvent(bundle, RESERVATION_EVENTS.REJECTED, 'reservation:rejected emitted'), 'rejected-event')
    this.check('rejected-status', RESERVATION_STATUS.REJECTED === 'rejected', 'rejected is a terminal status')

    // 7. Delete
    const deleted = await manager.deleteReservation('res-1', identity)
    this.check('deleted', deleted.success === true, 'deleteReservation succeeded')
    this.check('row-removed', !storeRows(bundle, 'reservation').some((r) => r.id === 'res-1'), 'reservation row removed from store')
  }
}

const test = new ReservationLifecycleTest()
runIfMain(test, import.meta.url)

export const run = () => test.run()
export default run
