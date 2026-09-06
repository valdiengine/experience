/**
 * Availability Lifecycle Suite (P13.5.7)
 *
 * Exercises the availability capability: window/day creation → block →
 * availability check → reserve → release → archive → restore, asserting
 * repository state, events, and outbound search/sync payloads.
 */
import { BaseCapabilityTest, runIfMain } from '../capability/capability.base.test.js'
import { assertEvent, assertSearchIndexed, assertSearchDeleted, assertSyncPushed, assertAuthorization, storeRows } from '../capability/capability.assertions.js'
import { createAvailabilityDayData, createAvailabilityWindowData } from '../fixtures/availability.fixture.js'
import { AVAILABILITY_EVENTS } from '../../capabilities/availability/availability.events.js'
import { AVAILABILITY_PERMISSIONS } from '../../capabilities/availability/availability.permissions.js'
import { InMemoryRepositoryAdapter } from '../capability/capability.mock.repositories.js'

const ACC_ID = 'acc-avail-1'
const DAY = '2031-06-10'
const BLOCK_START = '2031-06-01'
const BLOCK_END = '2031-06-03'

class AvailabilityLifecycleTest extends BaseCapabilityTest {
  constructor() {
    super('availability.lifecycle')
  }

  async runScenario(bundle) {
    const { identity } = bundle
    const availability = bundle.capability('availability')
    const manager = availability.manager

    InMemoryRepositoryAdapter.seed('accommodation', [
      { id: ACC_ID, tenantId: 'commercial', name: 'Test Accommodation', deletedAt: null },
    ])

    // 1. Create a date window
    const windowData = createAvailabilityWindowData(ACC_ID)
    const window = await manager.createWindow(windowData, identity)
    this.check('window-created', window.success === true, 'createWindow succeeded')
    this.check('window-row', storeRows(bundle, 'availability').some((r) => r.startDate === windowData.startDate), 'window row persisted')
    await this.checkAsync(assertEvent(bundle, AVAILABILITY_EVENTS.CALENDAR_UPDATED, 'availability:calendar.updated emitted'), 'window-event')
    // 2. Create a day-level record (triggers search + sync via capability handler)
    const day = await manager.createDay(createAvailabilityDayData(ACC_ID, DAY), identity)
    this.check('day-created', day.success === true, 'createDay succeeded')
    const dayRow = storeRows(bundle, 'availability').find((r) => r.date === DAY)
    this.check('day-row', Boolean(dayRow) && dayRow.status === 'available', 'day row persisted as available')
    await this.checkAsync(assertEvent(bundle, AVAILABILITY_EVENTS.CREATED, 'availability:created emitted'), 'day-created-event')
    await this.checkAsync(assertSearchIndexed(bundle, 'availability', 'search.index(availability) recorded'), 'search-indexed')
    await this.checkAsync(assertSyncPushed(bundle, 'availability', 'sync.push(availability) recorded'), 'sync-pushed')
    await this.checkAsync(assertAuthorization(bundle, AVAILABILITY_PERMISSIONS.WRITE, 'authorize(availability:write) recorded'), 'auth-write')
    // 3. Block a range
    const blocked = await manager.block(ACC_ID, BLOCK_START, BLOCK_END, 'Maintenance', identity)
    this.check('block-success', blocked.success === true, 'block succeeded')
    this.check('blocked-rows', storeRows(bundle, 'availability').filter((r) => r.status === 'blocked').length === 3, '3 day rows blocked')
    await this.checkAsync(assertEvent(bundle, AVAILABILITY_EVENTS.BLOCKED, 'availability:blocked emitted'), 'blocked-event')
    // 4. Availability check on blocked range
    const check = await manager.checkAvailability(ACC_ID, BLOCK_START, BLOCK_END, identity)
    this.check('blocked-not-available', check.available === false && check.blockedDates.length > 0, 'blocked range reported unavailable')

    // 5. Reserve the day
    const reserved = await manager.reserve(ACC_ID, DAY, '2031-06-11', 'res-avail-1', identity)
    this.check('reserve-success', reserved.success === true, 'reserve succeeded')
    this.check('reserved-row', storeRows(bundle, 'availability').find((r) => r.date === DAY).status === 'reserved', 'day row reserved')
    await this.checkAsync(assertEvent(bundle, AVAILABILITY_EVENTS.RESERVED, 'availability:reserved emitted'), 'reserved-event')
    // 6. Release the day
    const released = await manager.release(ACC_ID, DAY, '2031-06-11', identity)
    this.check('release-success', released.success === true, 'release succeeded')
    this.check('released-row', storeRows(bundle, 'availability').find((r) => r.date === DAY).status === 'available', 'day row released to available')
    await this.checkAsync(assertEvent(bundle, AVAILABILITY_EVENTS.RELEASED, 'availability:released emitted'), 'released-event')
    // 7. Archive the day (search remove + sync push)
    const dayId = storeRows(bundle, 'availability').find((r) => r.date === DAY).id
    const archived = await manager.archiveDay(dayId, identity)
    this.check('archive-success', archived.success === true, 'archiveDay succeeded')
    this.check('archived-row', storeRows(bundle, 'availability').find((r) => r.date === DAY).status === 'archived', 'day row archived')
    await this.checkAsync(assertEvent(bundle, AVAILABILITY_EVENTS.ARCHIVED, 'availability:archived emitted'), 'archived-event')
    await this.checkAsync(assertSearchDeleted(bundle, 'availability', dayId, 'search.delete(availability, id) recorded'), 'search-deleted')
    // 8. Restore the day (search index again)
    const restored = await manager.restoreDay(dayId, identity)
    this.check('restore-success', restored.success === true, 'restoreDay succeeded')
    this.check('restored-row', storeRows(bundle, 'availability').find((r) => r.date === DAY).status === 'available', 'day row restored to available')
    await this.checkAsync(assertSearchIndexed(bundle, 'availability', 'search.index(availability) recorded after restore'), 'search-reindexed')
  }
}

const test = new AvailabilityLifecycleTest()
runIfMain(test, import.meta.url)

export const run = () => test.run()
export default run
