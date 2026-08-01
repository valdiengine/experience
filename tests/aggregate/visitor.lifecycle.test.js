/**
 * Visitor Lifecycle Suite (P13.5.7)
 *
 * Exercises the visitor capability: create → lookup → profile/preferences
 * update → archive → restore → delete, asserting repository state, events,
 * and outbound search/sync payloads.
 */
import { BaseCapabilityTest, runIfMain } from '../capability/capability.base.test.js'
import { assertEvent, assertSearchIndexed, assertSearchDeleted, assertSyncPushed, assertAuthorization, storeRows } from '../capability/capability.assertions.js'
import { createVisitorData } from '../fixtures/visitor.fixture.js'
import { VISITOR_EVENTS } from '../../capabilities/visitor/visitor.events.js'
import { VISITOR_PERMISSIONS } from '../../capabilities/visitor/visitor.permissions.js'

class VisitorLifecycleTest extends BaseCapabilityTest {
  constructor() {
    super('visitor.lifecycle')
  }

  async runScenario(bundle) {
    const { identity } = bundle
    const visitor = bundle.capability('visitor')
    const manager = visitor.manager

    // 1. Create
    const created = await manager.createVisitor(createVisitorData(), identity)
    this.check('created', created.success === true && created.data?.status === 'anonymous', 'createVisitor succeeded')
    const visitorId = created.data.id
    this.check('row', storeRows(bundle, 'visitor').some((r) => r.id === visitorId), 'visitor row persisted')
    await this.checkAsync(assertEvent(bundle, VISITOR_EVENTS.CREATED, 'visitor:created emitted'), 'created-event')
    await this.checkAsync(assertSearchIndexed(bundle, 'visitor', 'search.index(visitor) recorded'), 'search-indexed')
    await this.checkAsync(assertSyncPushed(bundle, 'visitor', 'sync.push(visitor) recorded'), 'sync-pushed')
    await this.checkAsync(assertAuthorization(bundle, VISITOR_PERMISSIONS.CREATE, 'authorize(visitor:create) recorded'), 'auth-create')
    // 2. Lookup by email
    const found = await manager.findByEmail('ana@test.example', identity)
    this.check('findByEmail', found.id === visitorId, 'findByEmail returned created visitor')

    // 3. Update profile
    const updated = await manager.updateVisitor(visitorId, { profile: { fullName: 'Ana Test Updated' } }, identity)
    this.check('update-profile', updated.success === true, 'updateVisitor succeeded')
    const row = storeRows(bundle, 'visitor').find((r) => r.id === visitorId)
    this.check('profile-persisted', row.profile.fullName === 'Ana Test Updated', 'profile change persisted')
    await this.checkAsync(assertEvent(bundle, VISITOR_EVENTS.PROFILE_UPDATED, 'visitor:profile.updated emitted'), 'profile-event')
    await this.checkAsync(assertSearchIndexed(bundle, 'visitor', 'search.index(visitor) recorded after profile update'), 'search-reindexed')
    // 4. Update preferences
    const prefs = await manager.updatePreferences(visitorId, { marketingConsent: true, language: 'en' }, identity)
    this.check('update-preferences', prefs.success === true, 'updatePreferences succeeded')
    await this.checkAsync(assertEvent(bundle, VISITOR_EVENTS.PREFERENCES_UPDATED, 'visitor:preferences.updated emitted'), 'prefs-event')
    // 5. Archive
    const archived = await manager.archiveVisitor(visitorId, identity)
    this.check('archived', archived.success === true && archived.data.status === 'archived', 'archiveVisitor succeeded')
    this.check('archived-row', storeRows(bundle, 'visitor').find((r) => r.id === visitorId).status === 'archived', 'visitor row archived')
    await this.checkAsync(assertEvent(bundle, VISITOR_EVENTS.ARCHIVED, 'visitor:archived emitted'), 'archived-event')
    await this.checkAsync(assertSearchDeleted(bundle, 'visitor', visitorId, 'search.delete(visitor, id) recorded'), 'search-deleted')
    // 6. Restore
    const restored = await manager.restoreVisitor(visitorId, identity)
    this.check('restored', restored.success === true && restored.data.status === 'inactive', 'restoreVisitor succeeded')
    await this.checkAsync(assertEvent(bundle, VISITOR_EVENTS.RESTORED, 'visitor:restored emitted'), 'restored-event')
    await this.checkAsync(assertSearchIndexed(bundle, 'visitor', 'search.index(visitor) recorded after restore'), 'search-restored')
    // 7. Delete
    const deleted = await manager.deleteVisitor(visitorId, identity)
    this.check('deleted', deleted.success === true, 'deleteVisitor succeeded')
    this.check('deleted-row', storeRows(bundle, 'visitor').find((r) => r.id === visitorId).status === 'deleted', 'visitor row deleted')
    await this.checkAsync(assertEvent(bundle, VISITOR_EVENTS.DELETED, 'visitor:deleted emitted'), 'deleted-event')
  }
}

const test = new VisitorLifecycleTest()
runIfMain(test, import.meta.url)

export const run = () => test.run()
export default run
