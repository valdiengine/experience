/**
 * Business Lifecycle Suite (P13.5.7)
 *
 * Exercises the business aggregate: create → own accommodation → link visitor →
 * create reservation → archive (cascade) → restore (cascade) → delete (cascade).
 *
 * NOTE: reservation manager confirm/cancel integration calls
 * `availability.updateAvailability(...)` which does not exist on the
 * availability capability (pre-existing latent defect, RB-class). This suite
 * therefore asserts the business/accommodation/visitor cascades only; the
 * reservation cascade is covered directly in reservation.lifecycle.
 */
import { BaseCapabilityTest, runIfMain } from '../capability/capability.base.test.js'
import { assertEvent, assertAuthorization, storeRows } from '../capability/capability.assertions.js'
import { createBusinessData } from '../fixtures/business.fixture.js'
import { createAccommodationData } from '../fixtures/accommodation.fixture.js'
import { createVisitorData } from '../fixtures/visitor.fixture.js'
import { createReservationData } from '../fixtures/reservation.fixture.js'
import { BUSINESS_EVENTS, BUSINESS_ACCOMMODATION_EVENTS, BUSINESS_VISITOR_EVENTS, BUSINESS_RESERVATION_EVENTS } from '../../capabilities/business/business.events.js'
import { VISITOR_EVENTS } from '../../capabilities/visitor/visitor.events.js'
import { RESERVATION_EVENTS } from '../../capabilities/reservation/reservation.events.js'

class BusinessLifecycleTest extends BaseCapabilityTest {
  constructor() {
    super('business.lifecycle')
  }

  async runScenario(bundle) {
    const { identity } = bundle
    const business = bundle.capability('business')

    // 1. Create business
    const created = await business.manager.createBusiness(createBusinessData(), identity)
    this.check('business-created', created.success === true, 'createBusiness succeeded')
    const businessRows = storeRows(bundle, 'business')
    this.check('business-created-row', businessRows.length === 1 && businessRows[0].status === 'draft', 'business row persisted with status draft')
    await this.checkAsync(assertEvent(bundle, BUSINESS_EVENTS.CREATED, 'business:created emitted'), 'business-created-event')
    await this.checkAsync(assertAuthorization(bundle, 'business:create', 'authorize(business:create) recorded'), 'auth-business-create')
    const businessId = businessRows[0].id

    // 2. Own an accommodation
    const acc = await business.manager.createAccommodation(businessId, createAccommodationData(), identity)
    this.check('accommodation-created', acc.success === true, 'createAccommodation succeeded')
    const accRows = storeRows(bundle, 'accommodation')
    this.check('accommodation-owned', accRows.length === 1 && accRows[0].businessId === businessId && accRows[0].tenantId === 'commercial', 'accommodation row owned by business + tenant')
    await this.checkAsync(assertEvent(bundle, BUSINESS_ACCOMMODATION_EVENTS.ACCOMMODATION_CREATED, 'accommodation:created emitted'), 'accommodation-created-event')
    // 3. Link a visitor
    const visitorData = createVisitorData({ travelHistory: { favoriteBusinesses: [businessId] } })
    const visitor = await bundle.capability('visitor').manager.createVisitor(visitorData, identity)
    this.check('visitor-created', visitor.success === true, 'createVisitor succeeded')
    const visitorRows = storeRows(bundle, 'visitor')
    this.check('visitor-created-row', visitorRows.length === 1, 'visitor row persisted')
    await this.checkAsync(assertEvent(bundle, VISITOR_EVENTS.CREATED, 'visitor:created emitted'), 'visitor-created-event')
    // 4. Create a reservation under the business
    const resManager = business.manager.getReservationManager()
    const reservation = await resManager.createReservation(businessId, createReservationData({ businessId, accommodationId: accRows[0].id, visitorId: visitorRows[0].id, id: 'res-biz-1' }), identity)
    this.check('reservation-created', reservation.success === true, 'createReservation succeeded')
    const resRows = storeRows(bundle, 'reservation')
    this.check('reservation-created-row', resRows.length === 1 && resRows[0].status === 'requested' && resRows[0].businessId === businessId, 'reservation row persisted as requested')
    await this.checkAsync(assertEvent(bundle, RESERVATION_EVENTS.CREATED, 'reservation:created emitted'), 'reservation-created-event')
    // 5. Archive (cascades to accommodation + visitor)
    const archived = await business.manager.archiveBusiness(businessId, identity)
    this.check('business-archived', archived.success === true, 'archiveBusiness succeeded')
    this.check('business-archived-row', storeRows(bundle, 'business')[0].status === 'archived', 'business row archived')
    this.check('accommodation-cascade-archived', storeRows(bundle, 'accommodation')[0].status === 'hidden' && storeRows(bundle, 'accommodation')[0].previousStatus === 'draft', 'accommodation cascade hidden')
    this.check('visitor-cascade-archived', storeRows(bundle, 'visitor')[0].status === 'archived', 'visitor cascade archived')
    await this.checkAsync(assertEvent(bundle, BUSINESS_EVENTS.ARCHIVED, 'business:archived emitted'), 'business-archived-event')
    await this.checkAsync(assertEvent(bundle, BUSINESS_VISITOR_EVENTS.VISITOR_ARCHIVED, 'visitor cascade archive event emitted'), 'visitor-cascade-archive-event')
    // 6. Restore (cascades back)
    const restored = await business.manager.restoreBusiness(businessId, identity)
    this.check('business-restored', restored.success === true, 'restoreBusiness succeeded')
    this.check('business-restored-row', storeRows(bundle, 'business')[0].status === 'draft', 'business row restored to draft')
    this.check('accommodation-cascade-restored', storeRows(bundle, 'accommodation')[0].status === 'draft' && storeRows(bundle, 'accommodation')[0].previousStatus === null, 'accommodation cascade restored')
    this.check('visitor-cascade-restored', storeRows(bundle, 'visitor')[0].status === 'inactive', 'visitor cascade restored to inactive')
    await this.checkAsync(assertEvent(bundle, BUSINESS_EVENTS.RESTORED, 'business:restored emitted'), 'business-restored-event')
    // 7. Delete (terminal cascade)
    const deleted = await business.manager.deleteBusiness(businessId, identity)
    this.check('business-deleted', deleted.success === true, 'deleteBusiness succeeded')
    this.check('business-deleted-row', storeRows(bundle, 'business')[0].status === 'deleted', 'business row deleted')
    this.check('visitor-cascade-deleted', storeRows(bundle, 'visitor')[0].status === 'archived', 'visitor cascade archived on delete')
    await this.checkAsync(assertEvent(bundle, BUSINESS_EVENTS.DELETED, 'business:deleted emitted'), 'business-deleted-event')
    await this.checkAsync(assertEvent(bundle, BUSINESS_RESERVATION_EVENTS.RESERVATION_ARCHIVED, 'reservation cascade archive event emitted'), 'reservation-cascade-event')
  }
}

const test = new BusinessLifecycleTest()
runIfMain(test, import.meta.url)

export const run = () => test.run()
export default run
