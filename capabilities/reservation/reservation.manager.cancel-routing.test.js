/**
 * BOOKING-CANCEL-ROUTING-1 - cancellation routing focused tests.
 *
 * THIS EXERCISES THE REAL ReservationManager, the REAL ReservationRepository and
 * the REAL writable InMemoryRepositoryAdapter. Nothing is re-implemented here:
 * the modules are imported from their own files and their real public methods
 * are called. The managers' own private routing decision is exercised by
 * changing what the context presents, not by asserting on source text.
 *
 * HOW PHYSICAL DATABASE ACCESS IS PREVENTED
 * Identical to reservation.repository.occupied-nights.test.js: the
 * module-customization hooks in test-support/pg-fail-closed-hooks.mjs are
 * registered BEFORE any module importing the `pg` driver is loaded, so every bare
 * `pg` specifier resolves to a double and the genuine driver is never loaded,
 * constructed or contacted. `assertPgIsDoubled()` positively verifies this
 * rather than assuming it. The guarantee is narrow: it intercepts the bare
 * specifier `pg` and nothing else, and it is not a general network sandbox. This
 * file performs no real Pool.connect, no query, no socket, no bootstrap, no HTTP
 * request and no Stage access, and prints no configuration or credential.
 *
 * WHAT IS AND IS NOT CERTIFIED
 * Certified here: which code path manager cancellation takes, under mock and
 * PostgreSQL configuration and under a deliberate configuration/adapter
 * disagreement; that a manager-driven cancellation against the real Map-backed
 * repository changes status, recorded occupied-night capacity and releasedAt
 * together; that a null or rejected repository result produces no success, no
 * cancelled cache entry, no success event and no cancellation notification; that
 * the supported repo-less cache-backed cancellation still works; that business
 * cancellation no longer performs a second availability release; that the
 * BusinessAvailabilityManager hold-release delegation is still reachable; and
 * that permission and transition behaviour is unchanged.
 * NOT certified: anything about a PostgreSQL server — no SQL parsing, no
 * constraints, no locking, no isolation, no concurrency, no physical rollback.
 * The PostgreSQL branch is reached through the repository's real adapter gate
 * with a client double, which orchesrates the connection manager's control flow.
 * The Map cancellation path is synchronously atomic for store-write failures
 * within one process; that is not a physical database transaction and buys no
 * crash durability or cross-process isolation.
 *
 * Tenant forwarding is asserted, not tenant isolation: this file proves which
 * tenant id reaches the repository, nothing about cross-tenant enforcement.
 *
 * Framework-free. No database, network, provisioning or dependency installation.
 * This suite is invoked standalone; it is not wired into a repository-wide
 * runner.
 *
 * Run: node capabilities/reservation/reservation.manager.cancel-routing.test.js
 */

import { InMemoryRepositoryAdapter } from '../../tests/capability/capability.mock.repositories.js'
import { AvailabilityCapability } from '../availability/availability.capability.js'
import {
  installPgDouble,
  assertPgIsDoubled,
  addDays,
  civilRange,
  PostgresAdapter,
  createClientDouble,
  installClient,
  uninstallClient,
  rows,
  REPOSITORY_URL,
} from '../persistence/repositories/reservation/test-support/reservation.repository.test-support.mjs'

installPgDouble()
const { ReservationRepository } = await import(REPOSITORY_URL)
const { default: ReservationManager } = await import('./reservation.manager.js')
const { RESERVATION_STATUS } = await import('./reservation.status.js')
const { RESERVATION_PERMISSIONS } = await import('./reservation.permissions.js')
const { RESERVATION_EVENTS } = await import('./reservation.events.js')
const { BusinessReservationManager } = await import('../business/manager/business-reservation.manager.js')
const { BUSINESS_RESERVATION_EVENTS, BUSINESS_AVAILABILITY_EVENTS } = await import('../business/business.events.js')

let passed = 0
let failed = 0
const failures = []

async function test(name, fn) {
  try {
    await fn()
    passed++
    console.log(`  PASS ${name}`)
  } catch (error) {
    failed++
    failures.push({ name, error })
    console.log(`  FAIL ${name}: ${error && error.message}`)
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'assertion failed')
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
  }
}

function assertDeep(actual, expected, message) {
  const a = JSON.stringify(actual)
  const b = JSON.stringify(expected)
  if (a !== b) throw new Error(`${message}: expected ${b}, got ${a}`)
}

async function assertRejects(fn, matcher, label) {
  let thrown = null
  try {
    await fn()
  } catch (error) {
    thrown = error
  }
  if (thrown === null) throw new Error(`${label}: expected a throw, but nothing was thrown`)
  if (typeof matcher === 'string') {
    const name = thrown?.constructor?.name || thrown?.name
    if (name !== matcher && !String(thrown?.message || '').includes(matcher)) {
      throw new Error(`${label}: expected ${matcher}, got ${name}: ${thrown.message}`)
    }
  } else if (matcher) {
    matcher(thrown, label)
  }
  return thrown
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const TENANT = 'tenant-1'
const CABIN = 'cab-1'
const RES_ID = 'res-route-1'
const START = '2026-04-03'
const NIGHTS = 2
const END = addDays(START, NIGHTS)

const RESERVATION_TABLE = 'reservation'
const AVAILABILITY_TABLE = 'availability'
const LINE_TABLE = 'reservation_lines'

/** A manager context: real eventBus, real auth double, configurable everything. */
function managerContext({
  repo = null,
  persistenceProvider = 'mock',
  tenantId = TENANT,
  capabilities = {},
  dataManager = null,
  auth = null,
  withNotifications = false,
} = {}) {
  const events = []
  // `send` is the method the manager actually calls on the notifications
  // capability for a cancellation.
  const notifications = []
  return {
    events,
    notifications,
    context: {
      tenant: { id: tenantId },
      config: { persistenceProvider },
      repositories: { reservation: repo },
      capabilities: {
        get: (id) => {
          if (id === 'availability') return capabilities.availability || null
          if (id === 'notifications') {
            return withNotifications
              ? { send: async (payload) => { notifications.push(payload) } }
              : null
          }
          return null
        },
      },
      dataManager,
      runtime: auth ? { auth } : null,
      eventBus: { emit: (event, data) => events.push({ event, data }) },
    },
  }
}

/** An auth double that records calls and can deny. */
function authDouble({ allow = true } = {}) {
  const calls = []
  return {
    calls,
    authorize: async (identity, permission) => {
      calls.push({ identity, permission })
      if (!allow) throw new Error(`denied ${permission}`)
    },
  }
}

/** A reservation in a cancellable state with a customer and dates. */
function reservationPayload(overrides = {}) {
  return {
    id: RES_ID,
    tenantId: TENANT,
    businessId: 'biz-1',
    accommodationId: CABIN,
    resourceId: 'unit-1',
    status: RESERVATION_STATUS.REQUESTED,
    customer: { name: 'Ana', email: 'ana@test.example', channelPreference: 'email' },
    dates: { checkIn: START, checkOut: END },
    guests: 1,
    notes: '',
    cancelledAt: null,
    ...overrides,
  }
}

function seedStore({ withLine = true, reservedCount = NIGHTS } = {}) {
  InMemoryRepositoryAdapter.reset()
  const store = InMemoryRepositoryAdapter.store
  store.set(RESERVATION_TABLE, new Map())
  store.set(AVAILABILITY_TABLE, new Map())
  store.set(LINE_TABLE, new Map())

  const row = { ...reservationPayload(), deletedAt: null }
  store.get(RESERVATION_TABLE).set(row.id, row)

  for (const date of civilRange(START, NIGHTS)) {
    const capacity = {
      id: `av-${CABIN}-${date}`,
      tenantId: TENANT,
      accommodationId: CABIN,
      date,
      inventory: 4,
      reservedCount,
      available: 4 - reservedCount,
      status: 'reserved',
      isBlocked: false,
    }
    store.get(AVAILABILITY_TABLE).set(capacity.id, capacity)
  }

  if (withLine) {
    const dates = civilRange(START, NIGHTS)
    const line = {
      id: 'line-1',
      reservationId: RES_ID,
      lineOrder: 1,
      targetType: 'accommodation',
      targetId: CABIN,
      temporal: { mode: 'DATE_RANGE', startDate: START, endDate: END },
      quantity: NIGHTS,
      metadata: { __occupiedNights: { version: 1, dates: [...dates], quantity: NIGHTS } },
      releasedAt: null,
    }
    store.get(LINE_TABLE).set(line.id, line)
  }

  return store
}

const reservedCounts = (store) =>
  [...store.get(AVAILABILITY_TABLE).values()].sort((a, b) => (a.date < b.date ? -1 : 1)).map((r) => r.reservedCount)

/** The real repository on the real writable in-memory adapter. */
async function mapRepository(store, provider = new AvailabilityCapability()) {
  const adapter = new InMemoryRepositoryAdapter({ name: 'mock' }, { entityName: RESERVATION_TABLE })
  const repo = new ReservationRepository(adapter, {
    tenant: { id: TENANT },
    capabilities: { get: (id) => (id === 'availability' ? provider : null) },
  })
  await repo.initialize()
  return { repo, store }
}

/** A repository double that records whether the routing method was reached. */
function spyRepository({ result, throws, omitMethod = false } = {}) {
  const calls = []
  const repo = {
    calls,
    async findById() {
      return reservationPayload()
    },
  }
  if (!omitMethod) {
    repo.cancelReservationWithRelease = async (data, tenantId) => {
      calls.push({ data, tenantId })
      if (throws) throw throws
      return result
    }
  }
  return repo
}

console.log('\nBOOKING-CANCEL-ROUTING-1 - cancellation routing\n')

// ---------------------------------------------------------------------------
// 1. Fail-closed database boundary
// ---------------------------------------------------------------------------

await test('bare specifier "pg" resolves to the fail-closed double, not the real driver', async () => {
  assertEqual(await assertPgIsDoubled(), true, 'pg double must be installed')
})

// ---------------------------------------------------------------------------
// 2. Routing follows the repository, not the config string
// ---------------------------------------------------------------------------

await test('manager cancellation reaches the repository under mock configuration', async () => {
  const repo = spyRepository({ result: reservationPayload({ status: RESERVATION_STATUS.CANCELLED }) })
  const { context, events } = managerContext({ repo, persistenceProvider: 'mock' })
  const manager = new ReservationManager(context)

  const result = await manager.cancelReservation(RES_ID, 'guest request')

  assertEqual(result.success, true, 'cancellation must succeed')
  assertEqual(repo.calls.length, 1, 'the repository release method must be reached exactly once')
  assertEqual(repo.calls[0].tenantId, TENANT, 'the reservation tenant must be passed to the repository')
  assertEqual(repo.calls[0].data.status, RESERVATION_STATUS.CANCELLED, 'the transitioned status must be passed')
  assert(events.some((e) => e.event === RESERVATION_EVENTS.CANCELLED), 'the cancelled event must be emitted')
})

await test('manager cancellation reaches the repository under PostgreSQL configuration', async () => {
  const repo = spyRepository({ result: reservationPayload({ status: RESERVATION_STATUS.CANCELLED }) })
  const { context } = managerContext({ repo, persistenceProvider: 'postgres' })
  const manager = new ReservationManager(context)

  const result = await manager.cancelReservation(RES_ID)

  assertEqual(result.success, true, 'cancellation must succeed')
  assertEqual(repo.calls.length, 1, 'the repository release method must be reached exactly once')
})

await test('a PostgreSQL-configured context with a Map repository still routes to the repository', async () => {
  // Configuration/adapter disagreement, in the direction that used to be safe.
  const store = seedStore()
  const { repo } = await mapRepository(store)
  const { context } = managerContext({ repo, persistenceProvider: 'postgres' })
  const manager = new ReservationManager(context)

  const result = await manager.cancelReservation(RES_ID)

  assertEqual(result.success, true, 'cancellation must succeed')
  assertEqual(store.get(RESERVATION_TABLE).get(RES_ID).status, RESERVATION_STATUS.CANCELLED, 'status must persist')
  assertDeep(reservedCounts(store), [0, 0], 'capacity must be released')
})

/**
 * A PostgreSQL-shaped adapter: the shared test-support PostgresAdapter plus the
 * one read method the manager needs before it can reach the write path. The read
 * is served by the same programmed client double as the writes, because the
 * shared pg double deliberately refuses pool.query() (the real adapters' read
 * path) and only supports the connect() -> client.query() flow. The repository's
 * own findById/findOne orchestration is still the real one; only the row the
 * lookup resolves is a double.
 */
class PostgresShapedAdapter extends PostgresAdapter {
  async findOne() {
    return this.storedRow || null
  }
}

await test('a mock-configured context with a PostgreSQL-shaped repository still routes to the repository', async () => {
  // The regression this slice exists for: previously this shape took the
  // status-only branch and released no capacity at all. The repository still
  // runs its real PostgreSQL adapter gate and its real transaction.
  const line = {
    id: 'line-1',
    reservation_id: RES_ID,
    target_id: CABIN,
    quantity: NIGHTS,
    released_at: null,
    temporal: { mode: 'DATE_RANGE', startDate: START, endDate: END },
    metadata: JSON.stringify({ __occupiedNights: { version: 1, dates: civilRange(START, NIGHTS), quantity: NIGHTS } }),
  }
  const client = createClientDouble({
    updateReservation: (params) => rows([{ id: params[3], tenant_id: TENANT, status: params[0], cancelled_at: params[1] }]),
    selectLines: () => rows([line]),
    markLineReleased: (params) => rows([{ id: params[0], quantity: NIGHTS }]),
    releaseCapacity: () => rows([{ id: `av-${CABIN}` }]),
  })
  installClient(client)
  try {
    const adapter = new PostgresShapedAdapter()
    adapter.storedRow = { ...reservationPayload() }
    const repo = new ReservationRepository(adapter, { tenant: { id: TENANT } })
    await repo.initialize()
    const { context } = managerContext({ repo, persistenceProvider: 'mock' })
    const manager = new ReservationManager(context)

    const result = await manager.cancelReservation(RES_ID, 'guest request')

    assertEqual(result.success, true, 'cancellation must succeed through the PostgreSQL-shaped repository')
    assertEqual(client.callsOf('updateReservation').length, 1, 'the status update must be issued exactly once')
    assertEqual(client.callsOf('selectLines').length, 1, 'the lines must be read inside the transaction')
    assertEqual(client.callsOf('markLineReleased').length, 1, 'the line must be compare-and-set released')
    assertEqual(client.callsOf('releaseCapacity').length, NIGHTS, 'capacity must be released for each occupied night')
    assertEqual(client.callsOf('begin').length, 1, 'the real transaction() must have issued BEGIN')
    assertEqual(client.callsOf('commit').length, 1, 'the transaction must be committed')
    assertEqual(client.callsOf('rollback').length, 0, 'no rollback may occur')
    assertEqual(manager.getById(RES_ID).status, RESERVATION_STATUS.CANCELLED, 'the cache must read cancelled')
  } finally {
    uninstallClient()
  }
})

// ---------------------------------------------------------------------------
// 3. Manager cancellation against the real Map-backed repository
// ---------------------------------------------------------------------------

await test('manager cancellation changes status, recorded capacity and releasedAt together', async () => {
  const store = seedStore()
  const { repo } = await mapRepository(store)
  const { context } = managerContext({ repo, persistenceProvider: 'mock' })
  const manager = new ReservationManager(context)

  const before = {
    status: store.get(RESERVATION_TABLE).get(RES_ID).status,
    counts: reservedCounts(store),
    releasedAt: store.get(LINE_TABLE).get('line-1').releasedAt,
  }
  assertEqual(before.status, RESERVATION_STATUS.REQUESTED, 'precondition: the row is not cancelled')
  assertDeep(before.counts, [NIGHTS, NIGHTS], 'precondition: capacity is held')
  assertEqual(before.releasedAt, null, 'precondition: the line is not released')

  const result = await manager.cancelReservation(RES_ID, 'guest request')

  assertEqual(result.success, true, 'cancellation must succeed')
  const stored = store.get(RESERVATION_TABLE).get(RES_ID)
  assertEqual(stored.status, RESERVATION_STATUS.CANCELLED, 'the stored status must be cancelled')
  assert(typeof stored.cancelledAt === 'string' && stored.cancelledAt.length > 0, 'cancelledAt must be persisted')
  assert(/guest request/.test(stored.notes || ''), 'the reason must be recorded in notes')
  assertDeep(reservedCounts(store), [0, 0], 'the recorded occupied nights must be released')
  assert(
    [...store.get(AVAILABILITY_TABLE).values()].every((r) => r.status === 'available'),
    'availability status must be recomputed'
  )
  const line = store.get(LINE_TABLE).get('line-1')
  assert(typeof line.releasedAt === 'string' && line.releasedAt.length > 0, 'the line must be marked released')
  assertEqual(manager.getById(RES_ID).status, RESERVATION_STATUS.CANCELLED, 'the manager cache must read cancelled')
})

await test('a repeated manager cancellation does not release the same nights twice', async () => {
  const store = seedStore()
  const { repo } = await mapRepository(store)
  const { context } = managerContext({ repo, persistenceProvider: 'mock' })
  const manager = new ReservationManager(context)

  await manager.cancelReservation(RES_ID)
  const firstReleasedAt = store.get(LINE_TABLE).get('line-1').releasedAt
  const afterFirst = JSON.stringify([
    reservedCounts(store),
    store.get(LINE_TABLE).get('line-1').releasedAt,
  ])

  // CANCELLED is terminal, so the second call must be refused by the workflow
  // rather than releasing again.
  await assertRejects(
    () => manager.cancelReservation(RES_ID),
    'Invalid transition',
    'a second cancellation of a terminal reservation'
  )

  assertDeep(JSON.stringify([reservedCounts(store), store.get(LINE_TABLE).get('line-1').releasedAt]), afterFirst, 'the store must be unchanged by the refused second call')
  assertEqual(store.get(LINE_TABLE).get('line-1').releasedAt, firstReleasedAt, 'the first releasedAt must be preserved')
})

// ---------------------------------------------------------------------------
// 4. A missing method never degrades to status-only persistence
// ---------------------------------------------------------------------------

await test('a repository without cancelReservationWithRelease throws instead of persisting status only', async () => {
  const repo = spyRepository({ omitMethod: true })
  let statusOnlyCalls = 0
  repo.update = async () => { statusOnlyCalls += 1; return reservationPayload() }
  repo.create = async () => { statusOnlyCalls += 1; return reservationPayload() }
  const { context, events } = managerContext({ repo, persistenceProvider: 'mock' })
  const manager = new ReservationManager(context)

  await assertRejects(
    () => manager.cancelReservation(RES_ID),
    'cancelReservationWithRelease is unavailable',
    'a repository lacking the release method'
  )

  assertEqual(statusOnlyCalls, 0, 'no status-only persistence may be attempted')
  assert(!events.some((e) => e.event === RESERVATION_EVENTS.CANCELLED), 'no success event may be emitted')
})

// ---------------------------------------------------------------------------
// 5. Null / rejected repository result is a failure
// ---------------------------------------------------------------------------

await test('a null repository result produces no success, no cancelled cache, no event and no notification', async () => {
  const repo = spyRepository({ result: null })
  const { context, events, notifications } = managerContext({ repo, persistenceProvider: 'mock', withNotifications: true })
  const manager = new ReservationManager(context)

  await assertRejects(
    () => manager.cancelReservation(RES_ID),
    'repository returned no row',
    'a null repository result'
  )

  assert(!events.some((e) => e.event === RESERVATION_EVENTS.CANCELLED), 'no cancelled event may be emitted')
  assertEqual(notifications.length, 0, 'no cancellation notification may be sent')
  const cached = manager.getById(RES_ID)
  assertEqual(cached?.status, RESERVATION_STATUS.REQUESTED, 'the cache must not read cancelled')
})

await test('a rejected repository call propagates, with no event and no notification', async () => {
  const repo = spyRepository({ throws: new Error('ROLLBACK: release failed') })
  const { context, events, notifications } = managerContext({ repo, persistenceProvider: 'mock', withNotifications: true })
  const manager = new ReservationManager(context)

  await assertRejects(
    () => manager.cancelReservation(RES_ID),
    'ROLLBACK: release failed',
    'a rejected repository call'
  )

  assert(!events.some((e) => e.event === RESERVATION_EVENTS.CANCELLED), 'no cancelled event may be emitted')
  assertEqual(notifications.length, 0, 'no cancellation notification may be sent')
  assertEqual(manager.getById(RES_ID)?.status, RESERVATION_STATUS.REQUESTED, 'the cache must not read cancelled')
})

// A positive control for the spy above: the notification is reachable on this
// path, so "zero calls" means suppressed rather than unreachable.
await test('a successful repository cancellation does send the cancellation notification', async () => {
  const repo = spyRepository({ result: reservationPayload({ status: RESERVATION_STATUS.CANCELLED }) })
  const { context, notifications } = managerContext({ repo, persistenceProvider: 'mock', withNotifications: true })
  const manager = new ReservationManager(context)

  const result = await manager.cancelReservation(RES_ID)

  assertEqual(result.success, true, 'cancellation must succeed')
  assertEqual(notifications.length, 1, 'exactly one cancellation notification must be sent')
  assert(/cancelada/i.test(notifications[0].body), 'the notification must be the cancellation body')
})

await test('a real Map repository that cannot find the reservation does not report success', async () => {
  const store = seedStore()
  // Remove the authoritative stored row: the repository resolves null, while
  // the manager still finds the record through its dataManager fallback.
  store.get(RESERVATION_TABLE).delete(RES_ID)
  const { repo } = await mapRepository(store)
  const dataManager = {
    get: (collection) => (collection === 'reservations' ? [reservationPayload()] : undefined),
  }
  const { context, events } = managerContext({ repo, persistenceProvider: 'mock', dataManager })
  const manager = new ReservationManager(context)

  await assertRejects(
    () => manager.cancelReservation(RES_ID),
    'repository returned no row',
    'cancellation with no stored reservation row'
  )

  assert(!events.some((e) => e.event === RESERVATION_EVENTS.CANCELLED), 'no cancelled event may be emitted')
  assertDeep(reservedCounts(store), [NIGHTS, NIGHTS], 'capacity must be untouched')
  assertEqual(store.get(LINE_TABLE).get('line-1').releasedAt, null, 'the line must not be marked released')
})

// ---------------------------------------------------------------------------
// 6. Repo-less cache-backed cancellation is preserved
// ---------------------------------------------------------------------------

await test('repo-less cache-backed cancellation still succeeds and is cached', async () => {
  const reservations = [reservationPayload()]
  const dataManager = {
    store: new Map([['reservations', reservations]]),
    get(id) { return this.store.get(id) },
    set(id, value) { this.store.set(id, value) },
  }
  const { context, events } = managerContext({ repo: null, persistenceProvider: 'mock', dataManager })
  const manager = new ReservationManager(context)

  const result = await manager.cancelReservation(RES_ID, 'guest request')

  assertEqual(result.success, true, 'a repo-less cancellation must still succeed')
  assertEqual(manager.getById(RES_ID).status, RESERVATION_STATUS.CANCELLED, 'the cache must read cancelled')
  assert(
    dataManager.get('reservations').some((r) => r.id === RES_ID && r.status === RESERVATION_STATUS.CANCELLED),
    'the dataManager record must be cancelled'
  )
  assert(events.some((e) => e.event === RESERVATION_EVENTS.CANCELLED), 'the cancelled event must be emitted')
})

await test('repo-less cancellation does not require the availability capability', async () => {
  const reservations = [reservationPayload()]
  const dataManager = {
    store: new Map([['reservations', reservations]]),
    get(id) { return this.store.get(id) },
    set(id, value) { this.store.set(id, value) },
  }
  // A capability exposing updateAvailability, which used to be called on the
  // non-PostgreSQL branch and must no longer be.
  let updateAvailabilityCalls = 0
  const availability = { updateAvailability: async () => { updateAvailabilityCalls += 1 } }
  const { context } = managerContext({ repo: null, persistenceProvider: 'mock', dataManager, capabilities: { availability } })
  const manager = new ReservationManager(context)

  const result = await manager.cancelReservation(RES_ID)

  assertEqual(result.success, true, 'cancellation must succeed')
  assertEqual(updateAvailabilityCalls, 0, 'the dead updateAvailability call must not run')
})

// ---------------------------------------------------------------------------
// 7. Business cancellation performs no second availability release
// ---------------------------------------------------------------------------

/** A business manager whose delegated reservation capability is observable. */
function businessManagerContext({ delegateResult, availabilityManager, businessIds = ['biz-1'] }) {
  const events = []
  const delegateCalls = []
  const auth = authDouble()
  const businesses = new Map(
    businessIds.map((id) => [id, { id, status: 'active' }])
  )
  const reservations = new Map([[RES_ID, reservationPayload()]])
  const context = {
    tenant: { id: TENANT },
    repositories: {
      business: { findById: async (id) => businesses.get(id) },
      reservation: { findById: async (id) => reservations.get(id) },
    },
    capabilities: {
      get: (id) => {
        if (id === 'reservation') {
          return {
            cancelReservation: async (...args) => {
              delegateCalls.push({ method: 'cancelReservation', args })
              return delegateResult
            },
          }
        }
        if (id === 'business') {
          return { manager: { getAvailabilityManager: () => availabilityManager } }
        }
        return null
      },
    },
    runtime: { auth },
    eventBus: { emit: (event, data) => events.push({ event, data }) },
  }
  return { context, events, auth, delegateCalls }
}

await test('business cancellation performs no second availability release', async () => {
  let releaseCalls = 0
  const availabilityManager = {
    releaseReservation: async () => { releaseCalls += 1; return { success: true } },
  }
  const { context, events, delegateCalls } = businessManagerContext({
    delegateResult: { success: true },
    availabilityManager,
  })
  const manager = new BusinessReservationManager(context)

  const result = await manager.cancelReservation('biz-1', RES_ID, 'guest request', { id: 'u-1' })

  assertEqual(result.success, true, 'the delegated cancellation must succeed')
  assertEqual(releaseCalls, 0, 'no availability release may run after business cancellation')
  assertEqual(delegateCalls.length, 1, 'only the delegated cancellation may be called')
  assertEqual(delegateCalls[0].method, 'cancelReservation', 'the reservation capability must be the delegate')
  assertDeep(delegateCalls[0].args.slice(0, 2), [RES_ID, 'guest request'], 'id and reason must be forwarded')
  assert(
    events.some((e) => e.event === BUSINESS_RESERVATION_EVENTS.RESERVATION_CANCELLED),
    'the business cancelled event must still be emitted'
  )
})

await test('business cancellation performs no release even when an availability manager is wired', async () => {
  // A mis-wired deployment where the availability manager is reachable and
  // functional: the second release must still not happen, because the
  // reservation manager already released the recorded nights.
  const { BusinessAvailabilityManager } = await import('../business/manager/business-availability.manager.js')
  const availabilityCalls = []
  const availabilityManager = new BusinessAvailabilityManager({
    tenant: { id: TENANT },
    runtime: { auth: authDouble() },
    repositories: {},
    capabilities: {
      get: () => ({
        service: {
          release: async (...args) => { availabilityCalls.push({ method: 'release', args }); return { success: true } },
        },
      }),
    },
    eventBus: { emit: () => {} },
  })
  const { context } = businessManagerContext({ delegateResult: { success: true }, availabilityManager })
  const manager = new BusinessReservationManager(context)

  const result = await manager.cancelReservation('biz-1', RES_ID, 'guest request', { id: 'u-1' })

  assertEqual(result.success, true, 'the delegated cancellation must succeed')
  assertEqual(availabilityCalls.length, 0, 'the availability service release must not be reached')
})

await test('business cancellation propagates a delegate failure without releasing', async () => {
  let releaseCalls = 0
  const { context, events } = businessManagerContext({
    delegateResult: { success: false, errors: ['cancellation failed'] },
    availabilityManager: { releaseReservation: async () => { releaseCalls += 1; return { success: true } } },
  })
  const manager = new BusinessReservationManager(context)

  const result = await manager.cancelReservation('biz-1', RES_ID, 'guest request', { id: 'u-1' })

  assertEqual(result.success, false, 'the delegate failure must be surfaced')
  assertEqual(releaseCalls, 0, 'no release may run when the delegate did not succeed')
  assert(
    !events.some((e) => e.event === BUSINESS_RESERVATION_EVENTS.RESERVATION_CANCELLED),
    'no cancelled event may be emitted when the delegate failed'
  )
})

await test('business cancellation still refuses a reservation owned by another business', async () => {
  let releaseCalls = 0
  // biz-2 is active, so the business-active gate passes; the reservation is
  // owned by biz-1. This asserts the ownership rejection itself.
  const { context, events, delegateCalls } = businessManagerContext({
    delegateResult: { success: true },
    availabilityManager: { releaseReservation: async () => { releaseCalls += 1; return { success: true } } },
    businessIds: ['biz-1', 'biz-2'],
  })
  const manager = new BusinessReservationManager(context)

  await assertRejects(
    () => manager.cancelReservation('biz-2', RES_ID, 'nope', { id: 'u-1' }),
    'Reservation does not belong to this business',
    'cancellation for a reservation owned by biz-1'
  )

  assertEqual(delegateCalls.length, 0, 'the delegate must not be reached')
  assertEqual(releaseCalls, 0, 'no release may run')
  assert(
    !events.some((e) => e.event === BUSINESS_RESERVATION_EVENTS.RESERVATION_CANCELLED),
    'no cancelled event may be emitted'
  )
})

await test('business cancellation still refuses an unknown business', async () => {
  let releaseCalls = 0
  const { context, events, delegateCalls } = businessManagerContext({
    delegateResult: { success: true },
    availabilityManager: { releaseReservation: async () => { releaseCalls += 1; return { success: true } } },
    businessIds: ['biz-1'],
  })
  const manager = new BusinessReservationManager(context)

  await assertRejects(
    () => manager.cancelReservation('biz-2', RES_ID, 'nope', { id: 'u-1' }),
    'Business not found',
    'cancellation for an unknown business'
  )

  assertEqual(delegateCalls.length, 0, 'the delegate must not be reached')
  assertEqual(releaseCalls, 0, 'no release may run')
  assert(
    !events.some((e) => e.event === BUSINESS_RESERVATION_EVENTS.RESERVATION_CANCELLED),
    'no cancelled event may be emitted'
  )
})

// ---------------------------------------------------------------------------
// 8. BusinessAvailabilityManager hold-release/reserve delegation remains available
//    (delegation only, not the full HTTP/API chain)
// ---------------------------------------------------------------------------

await test('the explicit hold-release operation still delegates release', async () => {
  const { BusinessAvailabilityManager } = await import('../business/manager/business-availability.manager.js')
  const delegateCalls = []
  const emitted = []
  const context = {
    tenant: { id: TENANT },
    runtime: { auth: authDouble() },
    repositories: {},
    capabilities: {
      get: () => ({
        service: {
          release: async (...args) => { delegateCalls.push({ method: 'release', args }); return { success: true } },
        },
      }),
    },
    eventBus: { emit: (event, data) => emitted.push({ event, data }) },
  }
  const manager = new BusinessAvailabilityManager(context)

  const result = await manager.releaseReservation(CABIN, START, END, { id: 'u-1' })

  assertEqual(result.success, true, 'the explicit release must still succeed')
  assertEqual(delegateCalls.length, 1, 'exactly one delegation must occur')
  assertEqual(delegateCalls[0].method, 'release', 'it must delegate the release operation')
  assertDeep(delegateCalls[0].args.slice(0, 3), [CABIN, START, END], 'accommodation and range must be forwarded')
  assert(
    emitted.some((e) => e.event === BUSINESS_AVAILABILITY_EVENTS.DAY_RELEASED),
    'the day-released event must still be emitted'
  )
})

await test('the explicit reserve operation remains available alongside it', async () => {
  const { BusinessAvailabilityManager } = await import('../business/manager/business-availability.manager.js')
  const delegateCalls = []
  const context = {
    tenant: { id: TENANT },
    runtime: { auth: authDouble() },
    repositories: {},
    capabilities: {
      get: () => ({
        service: {
          reserve: async (...args) => { delegateCalls.push({ method: 'reserve', args }); return { success: true } },
        },
      }),
    },
    eventBus: { emit: () => {} },
  }
  const manager = new BusinessAvailabilityManager(context)

  const result = await manager.reserveAccommodation(CABIN, START, END, RES_ID, { id: 'u-1' })

  assertEqual(result.success, true, 'the explicit reserve must still succeed')
  assertEqual(delegateCalls[0].method, 'reserve', 'it must delegate the reserve operation')
  assertDeep(delegateCalls[0].args.slice(0, 4), [CABIN, START, END, RES_ID], 'accommodation, range and reservation must be forwarded')
})

// ---------------------------------------------------------------------------
// 9. Permission and transition behaviour preserved
// ---------------------------------------------------------------------------

await test('a denied permission blocks cancellation before any persistence', async () => {
  const repo = spyRepository({ result: reservationPayload({ status: RESERVATION_STATUS.CANCELLED }) })
  const auth = authDouble({ allow: false })
  const { context, events } = managerContext({ repo, auth })
  const manager = new ReservationManager(context)

  await assertRejects(
    () => manager.cancelReservation(RES_ID, 'nope', { id: 'u-1' }),
    `Missing permission: ${RESERVATION_PERMISSIONS.CANCEL}`,
    'a denied cancellation permission'
  )

  assertEqual(auth.calls.length, 1, 'authorization must be consulted')
  assertEqual(auth.calls[0].permission, RESERVATION_PERMISSIONS.CANCEL, 'the cancel permission must be required')
  assertEqual(repo.calls.length, 0, 'the repository must not be reached')
  assert(!events.some((e) => e.event === RESERVATION_EVENTS.CANCELLED), 'no event may be emitted')
})

await test('the cancel permission is the one required, and a granted permission proceeds', async () => {
  const repo = spyRepository({ result: reservationPayload({ status: RESERVATION_STATUS.CANCELLED }) })
  const auth = authDouble({ allow: true })
  const { context } = managerContext({ repo, auth })
  const manager = new ReservationManager(context)

  const result = await manager.cancelReservation(RES_ID, 'ok', { id: 'u-1' })

  assertEqual(result.success, true, 'a granted permission must allow cancellation')
  assertEqual(auth.calls[0].permission, RESERVATION_PERMISSIONS.CANCEL, 'the cancel permission must be checked')
  assertEqual(repo.calls.length, 1, 'the repository must be reached')
})

await test('an unknown reservation is reported as not found without touching the repository', async () => {
  const repo = spyRepository({ result: reservationPayload({ status: RESERVATION_STATUS.CANCELLED }) })
  repo.findById = async () => null
  const { context, events } = managerContext({ repo })
  const manager = new ReservationManager(context)

  const result = await manager.cancelReservation('res-missing')

  assertEqual(result.success, false, 'a missing reservation must not succeed')
  assert(/not found/i.test(result.errors?.[0] || ''), 'a not-found error must be reported')
  assertEqual(repo.calls.length, 0, 'the release method must not be reached')
  assert(!events.some((e) => e.event === RESERVATION_EVENTS.CANCELLED), 'no event may be emitted')
})

await test('an invalid transition to cancelled is still refused', async () => {
  const repo = spyRepository({ result: reservationPayload({ status: RESERVATION_STATUS.CANCELLED }) })
  repo.findById = async () => reservationPayload({ status: RESERVATION_STATUS.COMPLETED })
  const { context } = managerContext({ repo })
  const manager = new ReservationManager(context)

  await assertRejects(
    () => manager.cancelReservation(RES_ID),
    'Invalid transition',
    'COMPLETED cannot transition to CANCELLED'
  )

  assertEqual(repo.calls.length, 0, 'the release method must not be reached')
})

// ---------------------------------------------------------------------------
// 10. Tenant id forwarded. Not a tenant-isolation proof.
// ---------------------------------------------------------------------------

await test('the repository receives the reservation tenant, not the context tenant', async () => {
  const repo = spyRepository({ result: reservationPayload({ status: RESERVATION_STATUS.CANCELLED }) })
  repo.findById = async () => reservationPayload({ tenantId: 'tenant-other' })
  const { context } = managerContext({ repo, tenantId: TENANT })
  const manager = new ReservationManager(context)

  await manager.cancelReservation(RES_ID)

  assertEqual(repo.calls.length, 1, 'the repository must be reached')
  assertEqual(repo.calls[0].tenantId, 'tenant-other', "the reservation's own tenant must be forwarded unchanged")
})

// ---------------------------------------------------------------------------

console.log(`\ntotal: ${passed + failed}   passed: ${passed}   failed: ${failed}`)
if (failed > 0) {
  for (const f of failures) console.log(`\n--- ${f.name}\n${f.error && f.error.stack}`)
  process.exitCode = 1
}