/**
 * Commercial Aggregate Suite (P13.5.7)
 *
 * End-to-end cross-entity scenario: business → accommodation → availability
 * → visitor → reservation, then business deletion cascade. Verifies that the
 * entities reference each other consistently and that cascades propagate.
 *
 * NOTE: reservation confirm/cancel attempt an `availability.updateAvailability`
 * call on the availability capability, which does not exist there (the
 * availability surface is `reserve`/`release`/`checkAvailability`). The source
 * guards those calls, so the flows complete without crashing; availability
 * blocking for confirmed reservations remains a known integration gap.
 */
import { BaseCapabilityTest, runIfMain } from '../capability/capability.base.test.js'
import { assertEvent, assertAuthorization, storeRows } from '../capability/capability.assertions.js'
import { createBusinessData } from '../fixtures/business.fixture.js'
import { createAccommodationData } from '../fixtures/accommodation.fixture.js'
import { createVisitorData } from '../fixtures/visitor.fixture.js'
import { createReservationData } from '../fixtures/reservation.fixture.js'
import { createAvailabilityDayData, createAvailabilityWindowData } from '../fixtures/availability.fixture.js'
import { BUSINESS_EVENTS, BUSINESS_ACCOMMODATION_EVENTS, BUSINESS_RESERVATION_EVENTS } from '../../capabilities/business/business.events.js'
import { RESERVATION_EVENTS } from '../../capabilities/reservation/reservation.events.js'
import { BUSINESS_PERMISSIONS } from '../../capabilities/business/business.permissions.js'
import { AVAILABILITY_PERMISSIONS } from '../../capabilities/availability/availability.permissions.js'
import { VISITOR_PERMISSIONS } from '../../capabilities/visitor/visitor.permissions.js'

const DAY = '2032-03-15'

class CommercialAggregateTest extends BaseCapabilityTest {
  constructor() {
    super('commercial.aggregate')
  }

  async runScenario(bundle) {
    const { identity } = bundle
    const businessCap = bundle.capability('business')
    const business = businessCap.manager
    const availability = bundle.capability('availability').manager
    const visitorManager = bundle.capability('visitor').manager
    const reservationManager = business.getReservationManager()

    // 1. Business: create + publish
    const bizCreated = await business.createBusiness(createBusinessData(), identity)
    this.check('biz-created', bizCreated.success === true, 'createBusiness succeeded')
    const bizId = bizCreated.data.id
    await this.checkAsync(assertEvent(bundle, BUSINESS_EVENTS.CREATED, 'business:created emitted'), 'biz-created-event')
    await bundle.context.repositories.business.update({ id: bizId }, { status: 'pending_review' })
    const bizPublished = await business.publishBusiness(bizId, identity)
    this.check('biz-published', bizPublished.success === true, 'publishBusiness succeeded')
    this.check('biz-row', storeRows(bundle, 'business').find((r) => r.id === bizId).status === 'published', 'business row published')
    await this.checkAsync(assertEvent(bundle, BUSINESS_EVENTS.PUBLISHED, 'business:published emitted'), 'biz-published-event')
    await this.checkAsync(assertAuthorization(bundle, BUSINESS_PERMISSIONS.CREATE, 'authorize(business:create) recorded'), 'auth-biz')
    // 2. Accommodation: create + publish under the business
    const accCreated = await business.createAccommodation(bizId, createAccommodationData(), identity)
    this.check('acc-created', accCreated.success === true, 'createAccommodation succeeded')
    const accId = accCreated.data.id
    await this.checkAsync(assertEvent(bundle, BUSINESS_ACCOMMODATION_EVENTS.ACCOMMODATION_CREATED, 'business.accommodation:created emitted'), 'acc-created-event')
    await business.publishAccommodation(bizId, accId, identity)
    const accRow = storeRows(bundle, 'accommodation').find((r) => r.id === accId)
    this.check('acc-row', accRow.businessId === bizId && accRow.status === 'published', 'accommodation row owned by business and published')
    const listed = await business.listAccommodations(bizId)
    this.check('acc-listed', listed.some((a) => a.id === accId), 'listAccommodations returns the accommodation')

    // 3. Availability: window + day for the accommodation
    const windowData = createAvailabilityWindowData(accId)
    const windowCreated = await availability.createWindow(windowData, identity)
    this.check('window-created', windowCreated.success === true, 'createWindow succeeded')
    const dayCreated = await availability.createDay(createAvailabilityDayData(accId, DAY), identity)
    this.check('day-created', dayCreated.success === true, 'createDay succeeded')
    this.check('day-rows', storeRows(bundle, 'availability').filter((r) => r.accommodationId === accId && r.date === DAY).length === 1, 'availability day row exists for the accommodation')
    await this.checkAsync(assertAuthorization(bundle, AVAILABILITY_PERMISSIONS.WRITE, 'authorize(availability:write) recorded'), 'auth-avail')
    // 4. Visitor: create
    const visitorCreated = await visitorManager.createVisitor(createVisitorData(), identity)
    this.check('visitor-created', visitorCreated.success === true, 'createVisitor succeeded')
    const visitorId = visitorCreated.data.id
    await this.checkAsync(assertAuthorization(bundle, VISITOR_PERMISSIONS.CREATE, 'authorize(visitor:create) recorded'), 'auth-visitor')
    // 5. Reservation: create referencing business + accommodation + visitor
    const resCreated = await reservationManager.createReservation(bizId, createReservationData({ id: 'res-commercial-1', businessId: bizId, accommodationId: accId, visitorId }), identity)
    this.check('res-created', resCreated.success === true, 'createReservation succeeded')
    await this.checkAsync(assertEvent(bundle, RESERVATION_EVENTS.CREATED, 'reservation:created emitted'), 'res-created-event')
    await this.checkAsync(assertEvent(bundle, BUSINESS_RESERVATION_EVENTS.RESERVATION_CREATED, 'business.reservation:created emitted'), 'res-facade-event')
    // 6. Cross-entity integrity
    const resRow = storeRows(bundle, 'reservation').find((r) => r.id === 'res-commercial-1')
    this.check('res-references', resRow.businessId === bizId && resRow.accommodationId === accId && resRow.visitorId === visitorId, 'reservation references business, accommodation and visitor')
    const bizReservations = await reservationManager.findByBusiness(bizId, identity)
    this.check('biz-res-scoped', bizReservations.some((r) => r.id === 'res-commercial-1'), 'business-scoped reservation lookup works')

    // 7. Business deletion cascade (published → archived → deleted)
    await business.archiveBusiness(bizId, identity)
    await business.deleteBusiness(bizId, identity)
    this.check('biz-deleted-row', storeRows(bundle, 'business').find((r) => r.id === bizId).status === 'deleted', 'business row deleted')
    this.check('acc-cascaded', storeRows(bundle, 'accommodation').find((r) => r.id === accId).status === 'hidden', 'accommodation hidden by cascade')
    this.check('res-cascaded', storeRows(bundle, 'reservation').find((r) => r.id === 'res-commercial-1').status === 'cancelled', 'requested reservation cancelled by business-archive cascade')
    await this.checkAsync(assertEvent(bundle, BUSINESS_RESERVATION_EVENTS.RESERVATION_ARCHIVED, 'business.reservation:archived emitted'), 'res-cascade-event')
  }
}

const test = new CommercialAggregateTest()
runIfMain(test, import.meta.url)

export const run = () => test.run()
export default run
