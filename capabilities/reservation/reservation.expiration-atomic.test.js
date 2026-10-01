/**
 * BOOKING-EXPIRATION-ATOMIC-1 — atomic expiration + recorded release, focused tests.
 *
 * THIS EXERCISES THE REAL ReservationManager, the REAL ReservationRepository, the
 * REAL writable InMemoryRepositoryAdapter, the REAL ReservationWorkflow, the REAL
 * ReservationCapability (for the search-index wiring), the REAL
 * BusinessReservationManager and the REAL events/status modules. Nothing is
 * re-implemented here: modules are imported from their own files and their real
 * public methods are called. The code under test is steered by what the context
 * presents, never by asserting on source text.
 *
 * HOW PHYSICAL DATABASE ACCESS IS PREVENTED
 * Identical to reservation.manager.cancel-routing.test.js: the
 * module-customization hooks in test-support/pg-fail-closed-hooks.mjs are
 * registered BEFORE any module importing the `pg` driver is loaded, so every bare
 * `pg` specifier resolves to a double and the genuine driver is never loaded,
 * constructed or contacted. `assertPgIsDoubled()` positively verifies this rather
 * than assuming it. The guarantee is narrow — it intercepts the bare specifier
 * `pg` and nothing else, and it is not a general network sandbox. This file
 * performs no real Pool.connect, no query, no socket, no bootstrap, no HTTP
 * request and no Stage access, and prints no configuration or credential.
 *
 * THE THREE CLAIM BOUNDARIES — KEEP THEM APART
 *
 *  1. MAP STATE ASSERTIONS (real state, one process).
 *     Tests marked "Map:" read and write the actual `Map` stores the repository
 *     reads. Status, `reservedCount`, `available`, availability `status` and each
 *     line's `releasedAt` are compared against pre-call snapshots. This is real
 *     in-process state and the refusals genuinely leave the stores untouched.
 *     It is still single-process and turn-bounded: no crash durability, no
 *     cross-process isolation, not a database transaction.
 *
 *  2. PG DOUBLE ORCHESTRATION (recorded control flow, no server).
 *     Tests marked "PG orchestration:" run the repository's real PostgreSQL
 *     adapter gate and its real `transaction()`, against a programmable client
 *     double. They prove statement ordering, bound parameters, the
 *     BEGIN/COMMIT/ROLLBACK sequence, the conditional capacity guard and
 *     pre-mutation validation. A "ROLLBACK requested" assertion is the DOUBLE
 *     recording that ROLLBACK was issued and COMMIT was not — it is not the
 *     database discarding anything.
 *
 *  3. OUTSTANDING PHYSICAL CERTIFICATION (not attempted here).
 *     Nothing here certifies a PostgreSQL server: not SQL parsing, not column
 *     constraints, not JSONB round trips, not row-level locking, not isolation,
 *     not cross-process concurrency, and not physical rollback. The
 *     `expectedStatus` predicate guards COMPETING WRITES TO THE SAME
 *     RESERVATION — a row that moved on between the caller's read and this
 *     write. Two DIFFERENT reservations expiring at the same moment are not what
 *     it guards, and nothing here is tested against a real server.
 *
 * Framework-free. No database, network, provisioning or dependency installation.
 * Invoked standalone; not wired into a repository-wide runner.
 *
 * Run: node capabilities/reservation/reservation.expiration-atomic.test.js
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
const { default: ReservationCapability } = await import('./reservation.capability.js')
const { RESERVATION_STATUS } = await import('./reservation.status.js')
const { RESERVATION_EVENTS } = await import('./reservation.events.js')
const { ReservationWorkflow } = await import('./reservation.workflow.js')
const { AvailabilityConsumptionRecordError } = await import('../availability/availability.errors.js')
const { BusinessReservationManager } = await import('../business/manager/business-reservation.manager.js')
const { BUSINESS_RESERVATION_EVENTS } = await import('../business/business.events.js')

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
const RES_ID = 'res-exp-1'
const START = '2026-05-04'
const NIGHTS = 2
const END = addDays(START, NIGHTS)

const RESERVATION_TABLE = 'reservation'
const AVAILABILITY_TABLE = 'availability'
const LINE_TABLE = 'reservation_lines'

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
            return withNotifications ? { send: async (payload) => { notifications.push(payload) } } : null
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

/** A reservation in `status`, with a customer and dates, deliberately populated
 *  with unrelated fields so field preservation can be asserted for real. */
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
    guests: 2,
    notes: 'late arrival',
    metadata: { source: 'web', campaign: 'spring' },
    specialRequests: 'high floor',
    cancelledAt: null,
    ...overrides,
  }
}

/**
 * Seed the writable Map store.
 *
 * `lines` entries are merged into the single default line unless a test supplies
 * its own set, so most cases read plainly while the record-less / malformed /
 * mixed cases can express themselves.
 */
function seedStore({
  status = RESERVATION_STATUS.REQUESTED,
  reservationOverrides = {},
  lines,
  reservedCount = 1,
  inventory = 4,
  lineQuantity = 1,
  withLine = true,
  dropAvailabilityRow = false,
  dropAvailabilityTable = false,
} = {}) {
  InMemoryRepositoryAdapter.reset()
  const store = InMemoryRepositoryAdapter.store
  store.set(RESERVATION_TABLE, new Map())
  store.set(LINE_TABLE, new Map())
  if (!dropAvailabilityTable) store.set(AVAILABILITY_TABLE, new Map())

  const row = { ...reservationPayload({ status }), deletedAt: null, ...reservationOverrides }
  store.get(RESERVATION_TABLE).set(row.id, row)

  if (!dropAvailabilityTable) {
    for (const date of civilRange(START, NIGHTS)) {
      if (dropAvailabilityRow && date === civilRange(START, NIGHTS)[1]) continue
      const capacity = {
        id: `av-${CABIN}-${date}`,
        tenantId: TENANT,
        accommodationId: CABIN,
        date,
        inventory,
        reservedCount,
        available: inventory - reservedCount,
        status: reservedCount >= inventory ? 'reserved' : 'available',
        isBlocked: false,
      }
      store.get(AVAILABILITY_TABLE).set(capacity.id, capacity)
    }
  }

  if (lines) {
    for (const line of lines) store.get(LINE_TABLE).set(line.id, line)
  } else if (withLine) {
    store.get(LINE_TABLE).set('line-1', recordedLine({ quantity: lineQuantity }))
  }

  return store
}

/**
 * A recorded DATE_RANGE line.
 *
 * `quantity` is the number of units held on EACH recorded date, not the number
 * of nights: the repository decrements `reserved_count` by the line quantity once
 * per recorded date, and the accommodation caller passes 1 per unit regardless of
 * guest count (reservation.repository.js:196-201). A 2-night stay of one unit is
 * therefore `quantity: 1` with two recorded dates, which is what the default
 * `reservedCount: 1` per night in seedStore models.
 */
function recordedLine({ quantity = 1, ...overrides } = {}) {
  return {
    id: 'line-1',
    reservationId: RES_ID,
    lineOrder: 1,
    targetType: 'accommodation',
    targetId: CABIN,
    temporal: { mode: 'DATE_RANGE', startDate: START, endDate: END },
    quantity,
    metadata: { __occupiedNights: { version: 1, dates: [...civilRange(START, NIGHTS)], quantity } },
    releasedAt: null,
    ...overrides,
  }
}

/** A DATE_RANGE line with NO versioned record: refused by the legacy gate. */
function recordLessDateRangeLine(overrides = {}) {
  return {
    id: 'line-norecord',
    reservationId: RES_ID,
    lineOrder: 1,
    targetType: 'accommodation',
    targetId: CABIN,
    temporal: { mode: 'DATE_RANGE', startDate: START, endDate: END },
    quantity: 1,
    metadata: {},
    releasedAt: null,
    ...overrides,
  }
}

/** A DATE_RANGE line carrying a record that is present but malformed. */
function malformedRecordLine(overrides = {}) {
  return {
    id: 'line-malformed',
    reservationId: RES_ID,
    lineOrder: 1,
    targetType: 'accommodation',
    targetId: CABIN,
    temporal: { mode: 'DATE_RANGE', startDate: START, endDate: END },
    quantity: 1,
    // version 7 is not a member of SUPPORTED_CONSUMPTION_RECORD_VERSIONS
    metadata: { __occupiedNights: { version: 7, dates: [...civilRange(START, NIGHTS)], quantity: 1 } },
    releasedAt: null,
    ...overrides,
  }
}

/** A record-less NON-DATE_RANGE line: not-applicable, still marked released. */
function recordLessNonDateRangeLine(overrides = {}) {
  return {
    id: 'line-nondaterange',
    reservationId: RES_ID,
    lineOrder: 1,
    targetType: 'accommodation',
    targetId: CABIN,
    temporal: { mode: 'NIGHTLY', quantity: 1 },
    quantity: 1,
    metadata: {},
    releasedAt: null,
    ...overrides,
  }
}

const reservedCounts = (store) =>
  [...(store.get(AVAILABILITY_TABLE)?.values() ?? [])]
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((r) => r.reservedCount)

const availabilityStatuses = (store) =>
  [...(store.get(AVAILABILITY_TABLE)?.values() ?? [])]
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((r) => r.status)

const storedStatus = (store) => store.get(RESERVATION_TABLE).get(RES_ID).status
const storedReservation = (store) => store.get(RESERVATION_TABLE).get(RES_ID)
const lineReleasedAt = (store, id = 'line-1') => store.get(LINE_TABLE).get(id)?.releasedAt ?? null

/** Deep, order-independent snapshot of every store, for byte-equality refusals. */
function snapshot(store) {
  const out = {}
  for (const [name, table] of store.entries()) {
    out[name] = Array.from(table.entries()).sort((a, b) => (a[0] < b[0] ? -1 : 1))
  }
  return JSON.stringify(out)
}

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

/** A manager wired to the real Map-backed repository. */
async function mapManager({ store, contextOptions = {}, withNotifications = false } = {}) {
  const { repo } = await mapRepository(store)
  const { context, events, notifications } = managerContext({ repo, withNotifications, ...contextOptions })
  const manager = new ReservationManager(context)
  return { manager, repo, events, notifications }
}

/** A repository double exposing only `expireReservationWithRelease`. */
function expirationSpyRepository({ result, throws, omitMethod = false, status, absentIds = [] } = {}) {
  const calls = []
  const repo = {
    calls,
    async findById(id) {
      if (absentIds.includes(id)) return null
      return reservationPayload(status === undefined ? {} : { status })
    },
  }
  if (!omitMethod) {
    repo.expireReservationWithRelease = async (data, tenantId, options) => {
      calls.push({ data, tenantId, options })
      if (throws) throw throws
      return result
    }
  }
  return repo
}

const eventNames = (events) => events.map((e) => e.event)

/** A PostgreSQL-shaped adapter; only the pre-write read is a double. */
class PostgresShapedAdapter extends PostgresAdapter {
  async findOne() {
    return this.storedRow || null
  }
}

/** A pg-double line row carrying a valid record. */
function pgLine(overrides = {}) {
  return {
    id: 'line-1',
    reservation_id: RES_ID,
    target_id: CABIN,
    quantity: 1,
    released_at: null,
    temporal: { mode: 'DATE_RANGE', startDate: START, endDate: END },
    metadata: JSON.stringify({
      __occupiedNights: { version: 1, dates: civilRange(START, NIGHTS), quantity: 1 },
    }),
    ...overrides,
  }
}

console.log('\nBOOKING-EXPIRATION-ATOMIC-1 - atomic expiration and recorded release\n')

// ---------------------------------------------------------------------------
// 1. Fail-closed database boundary
// ---------------------------------------------------------------------------

await test('bare specifier "pg" resolves to the fail-closed double, not the real driver', async () => {
  assertEqual(await assertPgIsDoubled(), true, 'pg double must be installed')
})

// ---------------------------------------------------------------------------
// 2. Workflow table (real ReservationWorkflow)
// ---------------------------------------------------------------------------

await test('workflow: the three approved targets are declared and CONFIRMED is not expirable', async () => {
  assertEqual(ReservationWorkflow.getExpirationTarget(RESERVATION_STATUS.REQUESTED), RESERVATION_STATUS.EXPIRED, 'REQUESTED -> EXPIRED')
  assertEqual(ReservationWorkflow.getExpirationTarget(RESERVATION_STATUS.OWNER_PENDING), RESERVATION_STATUS.NO_RESPONSE, 'OWNER_PENDING -> NO_RESPONSE')
  assertEqual(ReservationWorkflow.getExpirationTarget(RESERVATION_STATUS.PAYMENT_PENDING), RESERVATION_STATUS.EXPIRED, 'PAYMENT_PENDING -> EXPIRED')
  assertEqual(ReservationWorkflow.getExpirationTarget(RESERVATION_STATUS.CONFIRMED), null, 'CONFIRMED is not expirable')
})

await test('workflow: REQUESTED -> EXPIRED was unreachable before this slice and every other REQUESTED transition survives', async () => {
  assertEqual(ReservationWorkflow.canTransition(RESERVATION_STATUS.REQUESTED, RESERVATION_STATUS.EXPIRED), true, 'requested -> expired must now be declared')
  const allowed = ReservationWorkflow.getValidTransitions(RESERVATION_STATUS.REQUESTED)
  for (const retained of [
    RESERVATION_STATUS.OWNER_PENDING,
    RESERVATION_STATUS.REJECTED,
    RESERVATION_STATUS.CANCELLED,
    RESERVATION_STATUS.ARCHIVED,
  ]) {
    assert(allowed.includes(retained), `pre-existing REQUESTED -> ${retained} must be retained`)
  }
})

await test('workflow: a transition that is not declared still throws (invalid-transition behaviour preserved)', async () => {
  await assertRejects(
    () => ReservationWorkflow.transition(reservationPayload({ status: RESERVATION_STATUS.CONFIRMED }), RESERVATION_STATUS.EXPIRED),
    'Invalid transition',
    'confirmed -> expired must throw'
  )
})

// ---------------------------------------------------------------------------
// 3. The three approved source-to-target transitions, end to end (Map state)
// ---------------------------------------------------------------------------

await test('Map: REQUESTED -> EXPIRED moves the terminal status AND releases recorded capacity', async () => {
  const store = seedStore({ status: RESERVATION_STATUS.REQUESTED })
  const { manager } = await mapManager({ store, withNotifications: true })

  const result = await manager.expireReservation(RES_ID)

  assertEqual(result.success, true, 'expiration must succeed')
  assertEqual(result.status, RESERVATION_STATUS.EXPIRED, 'the result must report the landed status')
  assertEqual(storedStatus(store), RESERVATION_STATUS.EXPIRED, 'the stored status must be expired')
  assertDeep(reservedCounts(store), [0, 0], 'both recorded nights must be released')
  assertDeep(availabilityStatuses(store), ['available', 'available'], 'availability status must recompute')
  assert(lineReleasedAt(store) !== null, 'the line must be marked released')
})

await test('Map: OWNER_PENDING -> NO_RESPONSE moves the terminal status AND releases recorded capacity', async () => {
  const store = seedStore({ status: RESERVATION_STATUS.OWNER_PENDING })
  const { manager } = await mapManager({ store, withNotifications: true })

  const result = await manager.expireReservation(RES_ID)

  assertEqual(result.success, true, 'expiration must succeed')
  assertEqual(result.status, RESERVATION_STATUS.NO_RESPONSE, 'an unanswered owner must land on no_response')
  assertEqual(storedStatus(store), RESERVATION_STATUS.NO_RESPONSE, 'the stored status must be no_response')
  assertDeep(reservedCounts(store), [0, 0], 'both recorded nights must be released')
  assert(lineReleasedAt(store) !== null, 'the line must be marked released')
})

await test('Map: PAYMENT_PENDING -> EXPIRED moves the terminal status AND releases recorded capacity', async () => {
  const store = seedStore({ status: RESERVATION_STATUS.PAYMENT_PENDING })
  const { manager } = await mapManager({ store, withNotifications: true })

  const result = await manager.expireReservation(RES_ID)

  assertEqual(result.success, true, 'expiration must succeed')
  assertEqual(result.status, RESERVATION_STATUS.EXPIRED, 'the result must report the landed status')
  assertEqual(storedStatus(store), RESERVATION_STATUS.EXPIRED, 'the stored status must be expired')
  assertDeep(reservedCounts(store), [0, 0], 'both recorded nights must be released')
  assert(lineReleasedAt(store) !== null, 'the line must be marked released')
})

// ---------------------------------------------------------------------------
// 4. Outcome-specific event and notification (with positive controls)
// ---------------------------------------------------------------------------

await test('Map: an EXPIRED outcome emits the existing EXPIRED event and the pre-existing notification sentence', async () => {
  const store = seedStore({ status: RESERVATION_STATUS.REQUESTED })
  const { manager, events, notifications } = await mapManager({ store, withNotifications: true })

  await manager.expireReservation(RES_ID)

  assert(events.some((e) => e.event === RESERVATION_EVENTS.EXPIRED), 'the EXPIRED event must be emitted')
  assert(!events.some((e) => e.event === RESERVATION_EVENTS.NO_RESPONSE), 'an EXPIRED outcome must not emit NO_RESPONSE')
  const payload = events.find((e) => e.event === RESERVATION_EVENTS.EXPIRED).data
  assertEqual(payload.reservationId, RES_ID, 'the event must carry the reservationId')
  assertEqual(payload.toStatus, RESERVATION_STATUS.EXPIRED, 'the event must carry the landed status')

  // Positive control: the notification path is reachable, and its body is the
  // pre-existing EXPIRED sentence, unchanged.
  assertEqual(notifications.length, 1, 'exactly one notification must be sent')
  assertEqual(
    notifications[0].body,
    `Su solicitud de reserva para ${START} al ${END} ha expirado.`,
    'the EXPIRED notification sentence must be unchanged'
  )
  assertEqual(notifications[0].recipient, 'ana@test.example', 'the notification recipient must be honoured')
})

await test('Map: a NO_RESPONSE outcome emits NO_RESPONSE (not EXPIRED) and describes the actual outcome', async () => {
  const store = seedStore({ status: RESERVATION_STATUS.OWNER_PENDING })
  const { manager, events, notifications } = await mapManager({ store, withNotifications: true })

  await manager.expireReservation(RES_ID)

  assert(events.some((e) => e.event === RESERVATION_EVENTS.NO_RESPONSE), 'the NO_RESPONSE event must be emitted')
  assert(!events.some((e) => e.event === RESERVATION_EVENTS.EXPIRED), 'a NO_RESPONSE outcome must not be reported as EXPIRED')
  const payload = events.find((e) => e.event === RESERVATION_EVENTS.NO_RESPONSE).data
  assertEqual(payload.toStatus, RESERVATION_STATUS.NO_RESPONSE, 'the event must carry the landed status')
  assertEqual(payload.fromStatus, RESERVATION_STATUS.OWNER_PENDING, 'the event must carry the source status')

  // The body must name the real cause rather than assert a generic expiry.
  assertEqual(notifications.length, 1, 'exactly one notification must be sent')
  assert(notifications[0].body.includes('propietario no respondió'), 'the NO_RESPONSE body must describe the absent owner reply')
  assert(notifications[0].body !== `Su solicitud de reserva para ${START} al ${END} ha expirado.`, 'a NO_RESPONSE outcome must not reuse the EXPIRED sentence')
})

await test('the new NO_RESPONSE event is a distinct string from EXPIRED (subscriptions can tell them apart)', async () => {
  assertEqual(RESERVATION_EVENTS.NO_RESPONSE, 'reservation:no_response', 'the NO_RESPONSE event name')
  assert(RESERVATION_EVENTS.NO_RESPONSE !== RESERVATION_EVENTS.EXPIRED, 'NO_RESPONSE must not alias EXPIRED')
})

await test('Map: the capability removes a NO_RESPONSE reservation from the search index', async () => {
  // The real capability, driven through its real init/activate lifecycle against a
  // context whose eventBus records subscriptions and whose runtime.search records
  // deletes. No re-implementation, and no fake receiver: `activate` binds private
  // methods, so it must run on an actual instance.
  const listeners = new Map()
  const searches = []
  const context = {
    tenant: { id: TENANT },
    eventBus: { on: (event, fn) => { listeners.set(event, fn); return () => {} } },
    runtime: {
      search: {
        index: async () => { searches.push({ op: 'index' }) },
        delete: async (entity, id) => { searches.push({ op: 'delete', entity, id }) },
      },
    },
    repositories: {},
    capabilities: { get: () => null },
  }
  const capability = new ReservationCapability()
  await capability.init(context)
  await capability.activate()

  assert(listeners.has(RESERVATION_EVENTS.NO_RESPONSE), 'activate() must subscribe a NO_RESPONSE listener')

  // Positive control: the EXPIRED subscription already present behaves the same way.
  assert(listeners.has(RESERVATION_EVENTS.EXPIRED), 'activate() must still subscribe EXPIRED')
  // Positive control: a NON-terminal subscription still indexes, so the assertion
  // below is about the terminal outcome and not about search being broken.
  assert(listeners.has(RESERVATION_EVENTS.CREATED), 'activate() must still subscribe CREATED')

  listeners.get(RESERVATION_EVENTS.NO_RESPONSE)({ reservationId: RES_ID, reservation: reservationPayload({ status: RESERVATION_STATUS.NO_RESPONSE }) })
  listeners.get(RESERVATION_EVENTS.EXPIRED)({ reservationId: RES_ID, reservation: reservationPayload({ status: RESERVATION_STATUS.EXPIRED }) })
  listeners.get(RESERVATION_EVENTS.CREATED)({ reservationId: RES_ID, reservation: reservationPayload({ status: RESERVATION_STATUS.REQUESTED }) })
  await new Promise((r) => setTimeout(r, 0))

  assertDeep(searches, [
    { op: 'delete', entity: 'reservation', id: RES_ID },
    { op: 'delete', entity: 'reservation', id: RES_ID },
    { op: 'index' },
  ], 'both terminal outcomes must remove the reservation from the index, and a non-terminal one must still index it')
})

// ---------------------------------------------------------------------------
// 5. CONFIRMED and repeated expiry (Map state)
// ---------------------------------------------------------------------------

await test('Map: CONFIRMED is rejected as non-expirable and nothing is released', async () => {
  const store = seedStore({ status: RESERVATION_STATUS.CONFIRMED })
  const before = snapshot(store)
  const { manager, events, notifications } = await mapManager({ store, withNotifications: true })

  await assertRejects(() => manager.expireReservation(RES_ID), 'Invalid transition', 'expiring a CONFIRMED reservation')

  assertEqual(storedStatus(store), RESERVATION_STATUS.CONFIRMED, 'a confirmed reservation must stay confirmed')
  assertEqual(snapshot(store), before, 'every store must be byte-identical')
  assertDeep(events, [], 'no event may be emitted')
  assertDeep(notifications, [], 'no notification may be sent')
})

await test('Map: repeated manager expiry of an EXPIRED reservation still throws and does not release twice', async () => {
  const store = seedStore({ status: RESERVATION_STATUS.REQUESTED })
  const { manager } = await mapManager({ store })

  await manager.expireReservation(RES_ID)
  const afterFirst = snapshot(store)

  await assertRejects(
    () => manager.expireReservation(RES_ID),
    'Invalid transition',
    'repeated expiry of an expired reservation'
  )

  assertEqual(snapshot(store), afterFirst, 'the second attempt must change nothing')
  assertDeep(reservedCounts(store), [0, 0], 'capacity must not be decremented a second time')
})

await test('Map: repeated manager expiry of a NO_RESPONSE reservation still throws and does not release twice', async () => {
  const store = seedStore({ status: RESERVATION_STATUS.OWNER_PENDING })
  const { manager } = await mapManager({ store })

  await manager.expireReservation(RES_ID)
  const afterFirst = snapshot(store)

  await assertRejects(
    () => manager.expireReservation(RES_ID),
    'Invalid transition',
    'repeated expiry of a no_response reservation'
  )

  assertEqual(snapshot(store), afterFirst, 'the second attempt must change nothing')
  assertDeep(reservedCounts(store), [0, 0], 'capacity must not be decremented a second time')
})

// ---------------------------------------------------------------------------
// 6. Field preservation
// ---------------------------------------------------------------------------

await test('Map: expiration preserves cancelledAt exactly, and never clears it to null', async () => {
  const storedCancelledAt = '2026-01-02T03:04:05.000Z'
  const store = seedStore({
    status: RESERVATION_STATUS.REQUESTED,
    reservationOverrides: { cancelledAt: storedCancelledAt },
  })
  const { manager } = await mapManager({ store })

  await manager.expireReservation(RES_ID)

  const row = storedReservation(store)
  assertEqual(row.cancelledAt, storedCancelledAt, 'a pre-existing cancelledAt must survive expiration untouched')
  assert(row.cancelledAt !== null, 'expiration must never null out cancelledAt')
})

await test('Map: a null cancelledAt is left null rather than being stamped with an expiry time', async () => {
  const store = seedStore({ status: RESERVATION_STATUS.REQUESTED })
  const { manager } = await mapManager({ store })

  await manager.expireReservation(RES_ID)

  const row = storedReservation(store)
  assertEqual(row.cancelledAt, null, 'expiration must not invent a cancellation timestamp')
})

await test('Map: expiration preserves unrelated reservation fields', async () => {
  const store = seedStore({ status: RESERVATION_STATUS.OWNER_PENDING })
  const { manager } = await mapManager({ store })

  await manager.expireReservation(RES_ID)

  const row = storedReservation(store)
  assertEqual(row.notes, 'late arrival', 'notes must be preserved')
  assertEqual(row.guests, 2, 'guests must be preserved')
  assertEqual(row.businessId, 'biz-1', 'businessId must be preserved')
  assertEqual(row.accommodationId, CABIN, 'accommodationId must be preserved')
  assertEqual(row.resourceId, 'unit-1', 'resourceId must be preserved')
  assertDeep(row.customer, { name: 'Ana', email: 'ana@test.example', channelPreference: 'email' }, 'customer must be preserved')
  assertDeep(row.metadata, { source: 'web', campaign: 'spring' }, 'metadata must be preserved')
  assertEqual(row.specialRequests, 'high floor', 'specialRequests must be preserved (cancellation would overwrite it)')
  assertEqual(row.tenantId, TENANT, 'tenantId must be preserved')
  assert(typeof row.updatedAt === 'string' && row.updatedAt.length > 0, 'updatedAt must be maintained')
})

// ---------------------------------------------------------------------------
// 6b. Preservation is enforced by the REPOSITORY, not by caller restraint
// ---------------------------------------------------------------------------

await test('repository: expiration preserves every unrelated stored field against a conflicting payload', async () => {
  // The defect this pins: expiration published its replacement row by merging the
  // CALLER payload over the stored row, so preservation depended on the caller
  // omitting keys. A payload that carries values for unrelated fields silently
  // overwrote the stored ones. The replacement is now built from the stored row,
  // so this payload must have no effect on the store beyond status and updatedAt.
  const storedCancelledAt = '2026-01-02T03:04:05.000Z'
  const store = seedStore({
    status: RESERVATION_STATUS.REQUESTED,
    reservationOverrides: {
      cancelledAt: storedCancelledAt,
      cancelled_at: storedCancelledAt,
      notes: 'stored notes',
      metadata: { stored: true, nested: { keep: 1 } },
      specialRequests: 'stored special request',
      accommodationId: CABIN,
      tenantId: TENANT,
    },
  })
  const before = storedReservation(store)
  const { repo } = await mapRepository(store)

  // A payload that conflicts with EVERY unrelated stored field. It also claims a
  // different accommodation, which must not become the row's accommodation.
  const result = await repo.expireReservationWithRelease(
    {
      ...reservationPayload(),
      status: RESERVATION_STATUS.EXPIRED,
      cancelledAt: 'payload-would-stamp-2026-09-09T09:09:09.000Z',
      cancelled_at: 'payload-would-stamp-2026-09-09T09:09:09.000Z',
      notes: 'payload notes',
      metadata: { payload: true },
      specialRequests: 'payload special request',
      accommodationId: 'cab-not-the-stored-one',
      tenantId: 'a-different-tenant',
    },
    TENANT,
    { expectedStatus: RESERVATION_STATUS.REQUESTED }
  )

  assert(result !== null, 'a valid pair must resolve the stored row')

  const after = storedReservation(store)

  // The two fields expiration owns.
  assertEqual(after.status, RESERVATION_STATUS.EXPIRED, 'status is the field expiration owns')
  assert(typeof after.updatedAt === 'string' && after.updatedAt.length > 0, 'updatedAt must be maintained')
  assert(after.updatedAt !== before.updatedAt, 'updatedAt must actually advance')

  // Every unrelated field survives EXACTLY, including a non-null cancelledAt.
  assertEqual(after.cancelledAt, storedCancelledAt, 'a stored cancelledAt must not be overwritten by the payload')
  assertEqual(after.cancelled_at, storedCancelledAt, 'a stored cancelled_at must not be overwritten by the payload')
  assertEqual(after.notes, 'stored notes', 'stored notes must survive')
  assertDeep(after.metadata, { stored: true, nested: { keep: 1 } }, 'stored metadata must survive byte-for-byte')
  assertEqual(after.specialRequests, 'stored special request', 'stored specialRequests must survive')
  assertEqual(after.accommodationId, CABIN, 'the stored accommodation must survive a payload claiming another')
  assertEqual(after.tenantId, TENANT, 'the stored tenant must survive a payload claiming another')
  assertEqual(after.businessId, before.businessId, 'businessId must survive')
  assertEqual(after.resourceId, before.resourceId, 'resourceId must survive')
  assertEqual(after.guests, before.guests, 'guests must survive')
  assertDeep(after.customer, before.customer, 'customer must survive')
  assertDeep(after.dates, before.dates, 'dates must survive')
  assertEqual(after.deletedAt, before.deletedAt, 'deletedAt must survive')

  // And the release used the STORED accommodation as its authority: the stored
  // cabin's two nights were released, and nothing else exists to release.
  assertDeep(reservedCounts(store), [0, 0], 'the stored accommodation’s recorded nights must be released')
  assert(lineReleasedAt(store) !== null, 'the line must be marked released')
  assertEqual(lineReleasedAt(store, 'line-1') !== null, true, 'the released line is line-1')
})

await test('Map: a same-status stale manager snapshot cannot overwrite unrelated stored fields', async () => {
  // A NARROWER race than the status guard: the stored status still matches what
  // the manager read, so the status precondition is satisfied and the expiration
  // proceeds — but the caller is holding a STALE snapshot whose unrelated fields
  // have since been changed by someone else. Those changes must survive.
  //
  // Scope: this is about the STORE. The manager's in-memory cache is a different
  // question and is asserted separately below.
  const store = seedStore({
    status: RESERVATION_STATUS.REQUESTED,
    reservationOverrides: {
      notes: 'stored notes',
      metadata: { stored: true },
      specialRequests: 'stored special request',
    },
  })
  // Someone else edits unrelated fields while the manager is holding a snapshot.
  const live = storedReservation(store)
  live.notes = 'written by another writer'
  live.metadata = { stored: false, winner: 'other-writer' }
  live.specialRequests = 'another writer’s request'

  // The manager's snapshot: same status, stale unrelated fields.
  const staleSnapshot = {
    ...reservationPayload(),
    notes: 'stale notes from my snapshot',
    metadata: { stored: true, stale: true },
    specialRequests: 'stale special request',
  }

  const { repo } = await mapRepository(store)
  const result = await repo.expireReservationWithRelease(
    { ...staleSnapshot, status: RESERVATION_STATUS.EXPIRED },
    TENANT,
    { expectedStatus: RESERVATION_STATUS.REQUESTED }
  )

  assert(result !== null, 'a same-status snapshot must not be refused: the pair is approved and the status matches')

  const after = storedReservation(store)
  assertEqual(after.status, RESERVATION_STATUS.EXPIRED, 'status is the field expiration owns')
  assertEqual(after.notes, 'written by another writer', 'the other writer’s notes must survive a stale snapshot')
  assertDeep(after.metadata, { stored: false, winner: 'other-writer' }, 'the other writer’s metadata must survive a stale snapshot')
  assertEqual(after.specialRequests, 'another writer’s request', 'the other writer’s specialRequests must survive a stale snapshot')

  // The release still happened, and used the stored accommodation.
  assertDeep(reservedCounts(store), [0, 0], 'the recorded nights must still be released')
  assert(lineReleasedAt(store) !== null, 'the line must still be marked released')
})

await test('Map: the manager CACHE is the manager snapshot and is not claimed to be refreshed from the store', async () => {
  // Honest scope statement for the cache, asserted as a fact rather than assumed.
  //
  // What IS guaranteed: the STORE keeps the winning values (asserted in the test
  // above), and the repository returns the authoritative stored row.
  //
  // What is NOT guaranteed: the manager's in-memory cache. `#cacheReservation`
  // writes the transitioned DOMAIN object — the manager's own snapshot — not a
  // re-read of the stored row. So after a same-status stale expiration the cache
  // can carry stale unrelated fields even though the store is correct. That is a
  // pre-existing cache-coherency limitation of the manager, distinct from the
  // store, and this test records it as a known limit instead of implying the
  // cache is authoritative.
  const store = seedStore({
    status: RESERVATION_STATUS.REQUESTED,
    reservationOverrides: { notes: 'notes as originally read', metadata: { original: true } },
  })
  const { manager } = await mapManager({ store })

  // Prime the manager cache from the store.
  const hydrated = await manager.hydrate()
  assert(hydrated >= 1, 'the manager cache must have been primed')
  const cached = manager.getById(RES_ID)
  assert(cached !== null, 'the primed cache must hold the reservation')

  // Another writer REPLACES the stored row with unrelated-field changes. The
  // status is deliberately unchanged, so the status precondition is satisfied.
  const otherWriterRow = { ...storedReservation(store) }
  otherWriterRow.notes = 'written by another writer'
  otherWriterRow.metadata = { writtenBy: 'other-writer' }
  store.get(RESERVATION_TABLE).set(RES_ID, otherWriterRow)

  // The manager's cached snapshot is now stale for unrelated fields.
  cached.notes = 'stale notes from my snapshot'
  cached.metadata = { original: true, stale: true }

  await manager.expireReservation(RES_ID)

  // The STORE is authoritative and keeps the other writer's values.
  assertEqual(storedReservation(store).notes, 'written by another writer', 'the store must keep the other writer’s notes')
  assertDeep(storedReservation(store).metadata, { writtenBy: 'other-writer' }, 'the store must keep the other writer’s metadata')

  // The CACHE is the manager's transitioned snapshot, so it does NOT reflect the
  // store. Recorded as the known limit, not as a guarantee.
  assertEqual(
    manager.getById(RES_ID).notes,
    'stale notes from my snapshot',
    'the cache is the manager’s own snapshot, not a re-read of the store'
  )
  assertDeep(
    manager.getById(RES_ID).metadata,
    { original: true, stale: true },
    'the cache does not re-read unrelated fields from the store'
  )
})

// ---------------------------------------------------------------------------
// 7. Legacy refusal, malformed records and mixed reservations (Map state)
// ---------------------------------------------------------------------------

await test('Map: a record-less DATE_RANGE line aborts expiration, leaving every store untouched', async () => {
  const store = seedStore({
    status: RESERVATION_STATUS.REQUESTED,
    lines: [recordLessDateRangeLine()],
  })
  const before = snapshot(store)
  const { manager, events, notifications } = await mapManager({ store, withNotifications: true })

  await assertRejects(
    () => manager.expireReservation(RES_ID),
    'AvailabilityConsumptionRecordError',
    'record-less DATE_RANGE expiration'
  )

  assertEqual(storedStatus(store), RESERVATION_STATUS.REQUESTED, 'the status must not move')
  assertEqual(snapshot(store), before, 'every store must be byte-identical')
  assertDeep(reservedCounts(store), [1, 1], 'no capacity may be released')
  assertDeep(events, [], 'no event may be emitted')
  assertDeep(notifications, [], 'no notification may be sent')
})

await test('Map: a malformed consumption record aborts expiration, leaving every store untouched', async () => {
  const store = seedStore({
    status: RESERVATION_STATUS.REQUESTED,
    lines: [malformedRecordLine()],
  })
  const before = snapshot(store)
  const { manager } = await mapManager({ store })

  await assertRejects(
    () => manager.expireReservation(RES_ID),
    'AvailabilityConsumptionRecordError',
    'malformed-record expiration'
  )

  assertEqual(storedStatus(store), RESERVATION_STATUS.REQUESTED, 'the status must not move')
  assertEqual(snapshot(store), before, 'every store must be byte-identical')
  assertDeep(reservedCounts(store), [1, 1], 'no capacity may be released')
})

await test('Map: a valid line first and a record-less line second releases NOTHING, not even the valid line', async () => {
  const store = seedStore({
    status: RESERVATION_STATUS.REQUESTED,
    lines: [
      recordedLine({ id: 'line-valid', lineOrder: 1 }),
      recordLessDateRangeLine({ id: 'line-legacy', lineOrder: 2 }),
    ],
  })
  const before = snapshot(store)
  const { manager } = await mapManager({ store })

  await assertRejects(
    () => manager.expireReservation(RES_ID),
    'AvailabilityConsumptionRecordError',
    'mixed valid-first / legacy-second expiration'
  )

  assertEqual(storedStatus(store), RESERVATION_STATUS.REQUESTED, 'the status must not move')
  assertEqual(snapshot(store), before, 'no partial publication, including for the valid line')
  assertEqual(lineReleasedAt(store, 'line-valid'), null, 'the valid line must not be marked released')
  assertEqual(lineReleasedAt(store, 'line-legacy'), null, 'the record-less line must not be marked released')
  assertDeep(reservedCounts(store), [1, 1], 'no capacity may be released')
})

await test('Map: a record-less NON-DATE_RANGE line is not the same case and still expires', async () => {
  // Guards the correction that "no lines" and "a non-DATE_RANGE line" are
  // distinct: this line has no record, but it is not a DATE_RANGE line, so the
  // legacy refusal does not apply. It has nothing to release, so the nights stay
  // consumed by the rows seeded for it.
  const store = seedStore({
    status: RESERVATION_STATUS.REQUESTED,
    lines: [recordLessNonDateRangeLine()],
  })
  const { manager } = await mapManager({ store })

  const result = await manager.expireReservation(RES_ID)

  assertEqual(result.success, true, 'a record-less non-DATE_RANGE line must not block expiration')
  assertEqual(storedStatus(store), RESERVATION_STATUS.EXPIRED, 'the status must move')
  assert(lineReleasedAt(store, 'line-nondaterange') !== null, 'the not-applicable line is still marked released')
  assertDeep(reservedCounts(store), [1, 1], 'it has no recorded dates, so no capacity is released')
})

await test('Map: a reservation with no lines at all expires and releases nothing it never held', async () => {
  const store = seedStore({ status: RESERVATION_STATUS.REQUESTED, withLine: false })
  const { manager } = await mapManager({ store })

  const result = await manager.expireReservation(RES_ID)

  assertEqual(result.success, true, 'a line-less reservation must still expire')
  assertEqual(storedStatus(store), RESERVATION_STATUS.EXPIRED, 'the status must move')
  assertDeep(reservedCounts(store), [1, 1], 'no capacity was ever consumed by this reservation')
})

// ---------------------------------------------------------------------------
// 8. Missing capacity and shortfall (Map state: no partial publication)
// ---------------------------------------------------------------------------

await test('Map: a missing availability row aborts expiration with no partial publication', async () => {
  const store = seedStore({ status: RESERVATION_STATUS.REQUESTED, dropAvailabilityRow: true })
  const before = snapshot(store)
  const { manager } = await mapManager({ store })

  await assertRejects(
    () => manager.expireReservation(RES_ID),
    'AvailabilityConflictError',
    'missing capacity row'
  )

  assertEqual(snapshot(store), before, 'the first night must not have been released on its own')
  assertEqual(storedStatus(store), RESERVATION_STATUS.REQUESTED, 'the status must not move')
  assertEqual(lineReleasedAt(store), null, 'the line must not be marked released')
})

await test('Map: an aggregate capacity shortfall aborts expiration with no partial publication', async () => {
  // Each night holds 1 reserved unit, but the line records quantity 2 (two units
  // per night): releasing it would take the count below zero, so the aggregate
  // precondition refuses before any publication.
  const store = seedStore({ status: RESERVATION_STATUS.REQUESTED, reservedCount: 1, lineQuantity: 2 })
  const before = snapshot(store)
  const { manager } = await mapManager({ store })

  await assertRejects(
    () => manager.expireReservation(RES_ID),
    'insufficient reservedCount',
    'aggregate shortfall'
  )

  assertEqual(snapshot(store), before, 'every store must be byte-identical')
  assertEqual(storedStatus(store), RESERVATION_STATUS.REQUESTED, 'the status must not move')
  assertDeep(reservedCounts(store), [1, 1], 'no capacity may be released')
})

await test('Map: an absent availability table is refused rather than silently skipped', async () => {
  const store = seedStore({ status: RESERVATION_STATUS.REQUESTED, dropAvailabilityTable: true })
  const { manager } = await mapManager({ store })

  await assertRejects(
    () => manager.expireReservation(RES_ID),
    'AvailabilityConflictError',
    'absent availability table'
  )

  assertEqual(storedStatus(store), RESERVATION_STATUS.REQUESTED, 'the status must not move')
  assertEqual(lineReleasedAt(store), null, 'the line must not be marked released')
})

// ---------------------------------------------------------------------------
// 9. Repository refusal contract
// ---------------------------------------------------------------------------

await test('repository: an unapproved target for the stated source is refused (expiration is not cancellation)', async () => {
  const store = seedStore({ status: RESERVATION_STATUS.REQUESTED })
  const { repo } = await mapRepository(store)

  // `requested` is approved for `expired` ONLY, so each of these is refused on the
  // strength of the pair, not on the strength of the target alone.
  for (const target of [RESERVATION_STATUS.CANCELLED, RESERVATION_STATUS.CONFIRMED, RESERVATION_STATUS.REJECTED, 'nonsense', undefined]) {
    await assertRejects(
      () => repo.expireReservationWithRelease({ ...reservationPayload(), status: target }, TENANT, { expectedStatus: RESERVATION_STATUS.REQUESTED }),
      'the approved outcome for requested is expired',
      `target ${JSON.stringify(target)} must be refused`
    )
  }

  assertEqual(storedStatus(store), RESERVATION_STATUS.REQUESTED, 'no refused attempt may move the status')
  assertDeep(reservedCounts(store), [1, 1], 'no refused attempt may release capacity')
  assertEqual(lineReleasedAt(store), null, 'no refused attempt may mark a line released')
})

await test('repository: an unsupported or missing expected source status is refused', async () => {
  const store = seedStore({ status: RESERVATION_STATUS.REQUESTED })
  const { repo } = await mapRepository(store)
  const expiring = { ...reservationPayload(), status: RESERVATION_STATUS.EXPIRED }

  await assertRejects(
    () => repo.expireReservationWithRelease(expiring, TENANT, { expectedStatus: RESERVATION_STATUS.CONFIRMED }),
    'is not a supported expiration source status',
    'confirmed is not a supported expiration source'
  )
  await assertRejects(
    () => repo.expireReservationWithRelease(expiring, TENANT, {}),
    'is not a supported expiration source status',
    'a missing expectedStatus must be refused, not trusted'
  )
  await assertRejects(
    () => repo.expireReservationWithRelease(expiring, TENANT, { expectedStatus: undefined }),
    'is not a supported expiration source status',
    'an undefined expectedStatus must be refused'
  )

  assertEqual(storedStatus(store), RESERVATION_STATUS.REQUESTED, 'nothing may move')
})

// ---------------------------------------------------------------------------
// 9b. The APPROVED PAIR is validated, not two independent allow-lists
// ---------------------------------------------------------------------------

await test('repository: each approved source/target pair is accepted (pair-valid controls)', async () => {
  const APPROVED = [
    [RESERVATION_STATUS.REQUESTED, RESERVATION_STATUS.EXPIRED],
    [RESERVATION_STATUS.OWNER_PENDING, RESERVATION_STATUS.NO_RESPONSE],
    [RESERVATION_STATUS.PAYMENT_PENDING, RESERVATION_STATUS.EXPIRED],
  ]

  for (const [source, target] of APPROVED) {
    // Fresh state per pair, so the stored status matches the stated source and
    // the precondition is genuinely satisfied rather than bypassed.
    const store = seedStore({ status: source })
    const { repo } = await mapRepository(store)

    const result = await repo.expireReservationWithRelease(
      { ...reservationPayload(), status: target },
      TENANT,
      { expectedStatus: source }
    )

    assert(result !== null, `${source} -> ${target} must resolve a stored row`)
    assertEqual(storedStatus(store), target, `${source} -> ${target} must be published`)
    assertDeep(reservedCounts(store), [0, 0], `${source} -> ${target} must release both recorded nights`)
    assert(lineReleasedAt(store) !== null, `${source} -> ${target} must mark the line released`)
  }
})

await test('repository: requested -> no_response is refused (unapproved pair of individually valid statuses)', async () => {
  const store = seedStore({ status: RESERVATION_STATUS.REQUESTED })
  const { repo } = await mapRepository(store)

  await assertRejects(
    () => repo.expireReservationWithRelease(
      { ...reservationPayload(), status: RESERVATION_STATUS.NO_RESPONSE },
      TENANT,
      { expectedStatus: RESERVATION_STATUS.REQUESTED }
    ),
    'the approved outcome for requested is expired',
    'requested may not land on no_response: that is the owner-pending outcome'
  )

  assertEqual(storedStatus(store), RESERVATION_STATUS.REQUESTED, 'the status must not move')
  assertDeep(reservedCounts(store), [1, 1], 'no capacity may be released')
  assertEqual(lineReleasedAt(store), null, 'no line may be marked released')
})

await test('repository: payment_pending -> no_response is refused (unapproved pair of individually valid statuses)', async () => {
  const store = seedStore({ status: RESERVATION_STATUS.PAYMENT_PENDING })
  const { repo } = await mapRepository(store)

  await assertRejects(
    () => repo.expireReservationWithRelease(
      { ...reservationPayload(), status: RESERVATION_STATUS.NO_RESPONSE },
      TENANT,
      { expectedStatus: RESERVATION_STATUS.PAYMENT_PENDING }
    ),
    'the approved outcome for payment_pending is expired',
    'payment_pending may not land on no_response'
  )

  assertEqual(storedStatus(store), RESERVATION_STATUS.PAYMENT_PENDING, 'the status must not move')
  assertDeep(reservedCounts(store), [1, 1], 'no capacity may be released')
  assertEqual(lineReleasedAt(store), null, 'no line may be marked released')
})

await test('repository: owner_pending -> expired is refused (unapproved pair of individually valid statuses)', async () => {
  const store = seedStore({ status: RESERVATION_STATUS.OWNER_PENDING })
  const { repo } = await mapRepository(store)

  await assertRejects(
    () => repo.expireReservationWithRelease(
      { ...reservationPayload(), status: RESERVATION_STATUS.EXPIRED },
      TENANT,
      { expectedStatus: RESERVATION_STATUS.OWNER_PENDING }
    ),
    'the approved outcome for owner_pending is no_response',
    'owner_pending may not land on expired: an unanswered owner is not a customer expiry'
  )

  assertEqual(storedStatus(store), RESERVATION_STATUS.OWNER_PENDING, 'the status must not move')
  assertDeep(reservedCounts(store), [1, 1], 'no capacity may be released')
  assertEqual(lineReleasedAt(store), null, 'no line may be marked released')
})

await test('repository: the unapproved-pair refusal is identical on the PostgreSQL path and precedes every statement', async () => {
  // The pair check runs before adapter dispatch, so the PostgreSQL path must
  // refuse with the SAME condition and issue NO statement at all — not even
  // BEGIN. That is the observable difference from the Map path's refusal, which
  // also touches no store.
  const client = createClientDouble({})
  installClient(client)
  try {
    const adapter = new PostgresShapedAdapter()
    adapter.storedRow = reservationPayload({ status: RESERVATION_STATUS.OWNER_PENDING })
    const repo = new ReservationRepository(adapter, { tenant: { id: TENANT } })
    await repo.initialize()

    await assertRejects(
      () => repo.expireReservationWithRelease(
        { ...reservationPayload(), status: RESERVATION_STATUS.EXPIRED },
        TENANT,
        { expectedStatus: RESERVATION_STATUS.OWNER_PENDING }
      ),
      'the approved outcome for owner_pending is no_response',
      'the unapproved pair is refused on the PostgreSQL path too'
    )

    assertDeep(client.statements, [], 'the refusal must precede every statement, including BEGIN')
  } finally {
    uninstallClient()
  }
})

await test('repository: a missing stored row resolves to null before any release work', async () => {
  const store = seedStore({ status: RESERVATION_STATUS.REQUESTED })
  store.get(RESERVATION_TABLE).delete(RES_ID)
  const { repo } = await mapRepository(store)

  const result = await repo.expireReservationWithRelease(
    { ...reservationPayload(), status: RESERVATION_STATUS.EXPIRED },
    TENANT,
    { expectedStatus: RESERVATION_STATUS.REQUESTED }
  )

  assertEqual(result, null, 'a missing stored row must resolve to null, like cancellation')
  assertDeep(reservedCounts(store), [1, 1], 'no capacity may be released')
})

// ---------------------------------------------------------------------------
// 10. Stale expiration cannot overwrite a now-CONFIRMED stored reservation
// ---------------------------------------------------------------------------

await test('Map: a stale expiration cannot expire a stored reservation that has become CONFIRMED', async () => {
  // The race this guards: the caller read REQUESTED, and the stored row is now
  // CONFIRMED. The payload is not authority; the stored row is.
  const store = seedStore({ status: RESERVATION_STATUS.CONFIRMED })
  const before = snapshot(store)
  const { repo } = await mapRepository(store)

  await assertRejects(
    () => repo.expireReservationWithRelease(
      { ...reservationPayload({ status: RESERVATION_STATUS.REQUESTED }), status: RESERVATION_STATUS.EXPIRED },
      TENANT,
      { expectedStatus: RESERVATION_STATUS.REQUESTED }
    ),
    'not requested; refusing to expireReservationWithRelease',
    'a stale expiration must be refused'
  )

  assertEqual(storedStatus(store), RESERVATION_STATUS.CONFIRMED, 'the confirmed reservation must stay confirmed')
  assertEqual(snapshot(store), before, 'every store must be byte-identical')
  assertDeep(reservedCounts(store), [1, 1], 'a confirmed reservation keeps its capacity')
})

await test('Map: a stale expiration refuses even when the stale payload claims a different status', async () => {
  // The stored row is PAYMENT_PENDING, but the caller payload claims CONFIRMED.
  // The payload is not authority: the precondition is checked against the stored
  // row, and it is the *supported* source status the caller stated (REQUESTED)
  // that fails to match. Claiming CONFIRMED in the payload changes nothing.
  const store = seedStore({ status: RESERVATION_STATUS.PAYMENT_PENDING })
  const before = snapshot(store)
  const { repo } = await mapRepository(store)

  await assertRejects(
    () => repo.expireReservationWithRelease(
      { ...reservationPayload({ status: RESERVATION_STATUS.CONFIRMED }), status: RESERVATION_STATUS.EXPIRED },
      TENANT,
      { expectedStatus: RESERVATION_STATUS.REQUESTED }
    ),
    'is payment_pending, not requested; refusing to expireReservationWithRelease',
    'the stored row, not the payload, decides'
  )

  assertEqual(storedStatus(store), RESERVATION_STATUS.PAYMENT_PENDING, 'the stored status must be untouched')
  assertEqual(snapshot(store), before, 'every store must be byte-identical')
  assertDeep(reservedCounts(store), [1, 1], 'no capacity may be released')
})

await test('PG orchestration: the expiration UPDATE carries the expected status in its WHERE clause', async () => {
  const client = createClientDouble({
    // The double returns no row: exactly what a real database would do when the
    // stored status no longer matches the predicate.
    updateReservation: () => rows([]),
  })
  installClient(client)
  try {
    const adapter = new PostgresShapedAdapter()
    adapter.storedRow = reservationPayload({ status: RESERVATION_STATUS.REQUESTED })
    const repo = new ReservationRepository(adapter, { tenant: { id: TENANT } })
    await repo.initialize()

    await assertRejects(
      () => repo.expireReservationWithRelease(
        { ...reservationPayload(), status: RESERVATION_STATUS.EXPIRED },
        TENANT,
        { expectedStatus: RESERVATION_STATUS.REQUESTED }
      ),
      'no longer requested',
      'a zero-row expiration UPDATE must be an error'
    )

    const update = client.callsOf('updateReservation')[0]
    assert(update.sql.includes('AND status = $4'), `the predicate must carry the expected status: ${update.sql}`)
    assertDeep(update.params, [RESERVATION_STATUS.EXPIRED, RES_ID, TENANT, RESERVATION_STATUS.REQUESTED], 'the bound parameters')
    const kinds = client.kindsSeen()
    assertEqual(kinds.begin ?? 0, 1, 'BEGIN is issued once')
    assertEqual(kinds.updateReservation ?? 0, 1, 'the status UPDATE is issued once')
    assertEqual(kinds.rollback ?? 0, 1, 'ROLLBACK is requested once')
    assertEqual(kinds.commit ?? 0, 0, 'COMMIT is never requested')
    assertEqual(kinds.selectLines ?? 0, 0, 'no line is even selected, because the status write already failed')
  } finally {
    uninstallClient()
  }
})

// ---------------------------------------------------------------------------
// 11. Missing method, null result and rejection produce no success at all
// ---------------------------------------------------------------------------

await test('manager: a repository without the expiration method fails loudly instead of degrading to status-only', async () => {
  const repo = expirationSpyRepository({ omitMethod: true })
  const { context, events, notifications } = managerContext({ repo, withNotifications: true })
  const manager = new ReservationManager(context)

  await assertRejects(
    () => manager.expireReservation(RES_ID),
    'expireReservationWithRelease is unavailable',
    'a repository without the atomic expiration method'
  )

  assertDeep(events, [], 'no success event may be emitted')
  assertDeep(notifications, [], 'no notification may be sent')
  // The load populated the cache with the SOURCE status it read; what must never
  // appear is a terminal status, because the write never happened.
  assertEqual(manager.getById(RES_ID).status, RESERVATION_STATUS.REQUESTED, 'the cached status must remain the source status')
  assertEqual(repo.calls.length, 0, 'the expiration method must not be reached at all')
})

await test('manager: a null repository result produces no success, no cache state, no event and no notification', async () => {
  const repo = expirationSpyRepository({ result: null })
  const { context, events, notifications } = managerContext({ repo, withNotifications: true })
  const manager = new ReservationManager(context)

  await assertRejects(
    () => manager.expireReservation(RES_ID),
    'did not persist: repository returned no row',
    'a null repository result'
  )

  assertDeep(events, [], 'no success event may be emitted')
  assertDeep(notifications, [], 'no notification may be sent')
})

await test('manager: a repository rejection propagates and produces no success, event or notification', async () => {
  const repo = expirationSpyRepository({ throws: new AvailabilityConsumptionRecordError('refused') })
  const { context, events, notifications } = managerContext({ repo, withNotifications: true })
  const manager = new ReservationManager(context)

  await assertRejects(
    () => manager.expireReservation(RES_ID),
    'refused',
    'a repository rejection'
  )

  assertDeep(events, [], 'no success event may be emitted')
  assertDeep(notifications, [], 'no notification may be sent')
})

await test('manager: the source status is passed to the repository as its precondition', async () => {
  for (const [status, expected] of [
    [RESERVATION_STATUS.REQUESTED, RESERVATION_STATUS.EXPIRED],
    [RESERVATION_STATUS.OWNER_PENDING, RESERVATION_STATUS.NO_RESPONSE],
    [RESERVATION_STATUS.PAYMENT_PENDING, RESERVATION_STATUS.EXPIRED],
  ]) {
    const repo = expirationSpyRepository({ result: reservationPayload({ status: expected }), status })
    const { context } = managerContext({ repo })
    const manager = new ReservationManager(context)

    const result = await manager.expireReservation(RES_ID)

    assertEqual(result.status, expected, `${status} must land on ${expected}`)
    assertEqual(repo.calls.length, 1, 'the repository must be reached exactly once')
    assertEqual(repo.calls[0].options.expectedStatus, status, 'the source status must be the precondition')
    assertEqual(repo.calls[0].data.status, expected, 'the transitioned status must be passed')
    assertEqual(repo.calls[0].tenantId, TENANT, 'the reservation tenant must be forwarded')
  }
})

// ---------------------------------------------------------------------------
// 12. Preserved paths: repo-less cache, permissions, ownership, unknown id
// ---------------------------------------------------------------------------

await test('manager: the supported repo-less cache-backed expiration still works', async () => {
  // No repository at all, and no accommodationId, so createRequest takes its
  // line-less branch: it wrote no line, so no capacity was ever consumed and
  // mutating the cache is consistent. This path is preserved, and is not
  // reported as a failure merely for lacking a repository.
  const { context, events } = managerContext({ repo: null, persistenceProvider: 'mock' })
  const manager = new ReservationManager(context)

  const created = await manager.createRequest({
    customer: { name: 'Ana', email: 'ana@test.example', channelPreference: 'email' },
    resourceId: 'unit-1',
    dates: { checkIn: START, checkOut: END },
  })
  assertEqual(created.success, true, `a repo-less request must be creatable: ${JSON.stringify(created.errors)}`)

  const result = await manager.expireReservation(created.reservationId)

  assertEqual(result.success, true, 'repo-less expiration must still succeed')
  assertEqual(result.status, RESERVATION_STATUS.EXPIRED, 'a freshly requested reservation expires')
  assertEqual(manager.getById(created.reservationId).status, RESERVATION_STATUS.EXPIRED, 'the cache must hold the terminal status')
  assertDeep(eventNames(events), [RESERVATION_EVENTS.CREATED, RESERVATION_EVENTS.EXPIRED], 'CREATED then EXPIRED, in that order')
})

await test('manager: a denied permission aborts expiration before any write', async () => {
  const store = seedStore({ status: RESERVATION_STATUS.REQUESTED })
  const before = snapshot(store)
  const auth = authDouble({ allow: false })
  const { manager, events } = await mapManager({ store, contextOptions: { auth } })

  await assertRejects(() => manager.expireReservation(RES_ID, { id: 'someone' }), 'Missing permission', 'a denied expiration')

  assertEqual(snapshot(store), before, 'every store must be byte-identical')
  assertDeep(events, [], 'no event may be emitted')
  assertEqual(auth.calls.length, 1, 'the permission check must have been reached')
})

await test('manager: a granted permission proceeds through the full path', async () => {
  const store = seedStore({ status: RESERVATION_STATUS.REQUESTED })
  const auth = authDouble({ allow: true })
  const { manager, events } = await mapManager({ store, contextOptions: { auth } })

  const result = await manager.expireReservation(RES_ID, { id: 'someone' })

  assertEqual(result.success, true, 'a granted permission must allow expiration')
  assertDeep(reservedCounts(store), [0, 0], 'capacity must be released')
  assertDeep(eventNames(events), [RESERVATION_EVENTS.EXPIRED], 'the EXPIRED event must be emitted')
})

await test('manager: an unknown reservation returns the existing not-found result, not a throw', async () => {
  const repo = expirationSpyRepository({ result: reservationPayload(), absentIds: ['no-such-id'] })
  const { context, events } = managerContext({ repo })
  const manager = new ReservationManager(context)

  const result = await manager.expireReservation('no-such-id')

  assertEqual(result.success, false, 'an unknown reservation must fail')
  assertDeep(result.errors, ['Reservation not found'], 'the pre-existing not-found message')
  assertEqual(repo.calls.length, 0, 'the repository must not be reached')
  assertDeep(events, [], 'no event may be emitted')
})

// ---------------------------------------------------------------------------
// 13. Shared-night ownership and release idempotency (Map state)
// ---------------------------------------------------------------------------

await test('Map: a night shared with another reservation keeps that reservation consumption', async () => {
  // reservedCount 2 with inventory 2: reservation A holds one unit and another
  // reservation holds the other. Expiring A must leave one unit consumed.
  const store = seedStore({ status: RESERVATION_STATUS.REQUESTED, reservedCount: 2, inventory: 2 })
  const { manager } = await mapManager({ store })

  await manager.expireReservation(RES_ID)

  assertDeep(reservedCounts(store), [1, 1], 'only this reservation’s own unit may be released')
  assertDeep(availabilityStatuses(store), ['available', 'available'], 'the derived availability must recompute for the remaining unit')
  const row = [...store.get(AVAILABILITY_TABLE).values()].find((r) => r.date === START)
  assertEqual(row.available, 1, 'one unit must remain sellable capacity, owned by the other reservation')
  assert(lineReleasedAt(store) !== null, 'this reservation line is released')
})

await test('Map: a repeated repository release never decrements capacity twice', async () => {
  const store = seedStore({ status: RESERVATION_STATUS.REQUESTED })
  const { repo } = await mapRepository(store)

  const first = await repo.expireReservationWithRelease(
    { ...reservationPayload(), status: RESERVATION_STATUS.EXPIRED },
    TENANT,
    { expectedStatus: RESERVATION_STATUS.REQUESTED }
  )
  assert(first !== null, 'the first expiration must resolve a row')
  assertDeep(reservedCounts(store), [0, 0], 'the first release must decrement once')

  // A second identical attempt is refused by the status precondition, so it never
  // reaches line selection or capacity work at all.
  await assertRejects(
    () => repo.expireReservationWithRelease(
      { ...reservationPayload(), status: RESERVATION_STATUS.EXPIRED },
      TENANT,
      { expectedStatus: RESERVATION_STATUS.REQUESTED }
    ),
    'is expired, not requested; refusing to expireReservationWithRelease',
    'a repeated repository expiration'
  )
  assertDeep(reservedCounts(store), [0, 0], 'no capacity may be decremented a second time')
  assertEqual(lineReleasedAt(store) !== null, true, 'the line stays released exactly once')

  // Cancelling afterwards must be a no-op for capacity: the line is already
  // released and the released_at compare-and-set forbids a second decrement.
  await repo.cancelReservationWithRelease(
    { ...reservationPayload({ status: RESERVATION_STATUS.CONFIRMED }), status: RESERVATION_STATUS.CANCELLED, notes: 'later', cancelledAt: new Date().toISOString() },
    TENANT
  )

  assertDeep(reservedCounts(store), [0, 0], 'a later cancellation must not decrement released capacity again')
  assertEqual(storedStatus(store), RESERVATION_STATUS.CANCELLED, 'the later cancellation still moves the status')
})

// ---------------------------------------------------------------------------
// 14. Existing cancellation behaviour is intact after the extraction
// ---------------------------------------------------------------------------

await test('Map: cancellation still stamps cancelled_at, carries the reason and releases recorded capacity', async () => {
  const store = seedStore({ status: RESERVATION_STATUS.REQUESTED })
  const { manager, events } = await mapManager({ store, withNotifications: true })

  const result = await manager.cancelReservation(RES_ID, 'guest request')

  assertEqual(result.success, true, 'cancellation must still succeed')
  const row = storedReservation(store)
  assertEqual(row.status, RESERVATION_STATUS.CANCELLED, 'the status must be cancelled')
  assert(typeof row.cancelledAt === 'string' && row.cancelledAt.length > 0, 'cancelledAt must be stamped')
  assert(row.notes.includes('guest request'), 'the cancel reason must reach the stored notes')
  // Pre-existing asymmetry, asserted so the shared-core extraction cannot change
  // it silently: on the Map path the stored row is merged with the domain object,
  // which carries no `specialRequests` key for a cancel, so the stored value
  // survives; the PostgreSQL statement separately writes the reason into
  // special_requests (asserted in the PG orchestration block below). Neither
  // adapter's behaviour was altered by this slice.
  assertEqual(row.specialRequests, 'high floor', 'the Map merge must still preserve the stored special_requests')
  assertDeep(reservedCounts(store), [0, 0], 'capacity must be released')
  assert(lineReleasedAt(store) !== null, 'the line must be marked released')
  assertDeep(eventNames(events), [RESERVATION_EVENTS.CANCELLED], 'the CANCELLED event must still be emitted')
})

await test('Map: a repeated cancellation is refused by the workflow and does not release capacity twice', async () => {
  // Pre-existing behaviour, unchanged by this slice: cancelling an already
  // terminal reservation raises the established invalid-transition error rather
  // than returning a silent success. The capacity invariant is what matters here
  // and it holds either way.
  const store = seedStore({ status: RESERVATION_STATUS.REQUESTED })
  const { manager } = await mapManager({ store })

  await manager.cancelReservation(RES_ID, 'first')
  const afterFirst = snapshot(store)

  await assertRejects(
    () => manager.cancelReservation(RES_ID, 'second'),
    'Invalid transition',
    'cancelling an already cancelled reservation'
  )

  assertEqual(snapshot(store), afterFirst, 'the second attempt must change nothing')
  assertDeep(reservedCounts(store), [0, 0], 'capacity must be released exactly once across two cancellation attempts')
  assertEqual(storedStatus(store), RESERVATION_STATUS.CANCELLED, 'the status must remain cancelled')
})

await test('Map: the legacy DATE_RANGE refusal still applies to cancellation', async () => {
  const store = seedStore({
    status: RESERVATION_STATUS.REQUESTED,
    lines: [recordLessDateRangeLine()],
  })
  const before = snapshot(store)
  const { manager } = await mapManager({ store })

  await assertRejects(
    () => manager.cancelReservation(RES_ID, 'guest request'),
    'AvailabilityConsumptionRecordError',
    'record-less DATE_RANGE cancellation'
  )

  assertEqual(snapshot(store), before, 'cancellation must also leave every store untouched')
})

// ---------------------------------------------------------------------------
// 15. PG double orchestration for expiration (no server involved)
// ---------------------------------------------------------------------------

await test('PG orchestration: expiration issues status update then line select, then marks released and releases capacity, inside one transaction', async () => {
  const client = createClientDouble({
    updateReservation: (params) => rows([{ id: params[1], status: params[0], cancelled_at: 'stored-value' }]),
    selectLines: () => rows([pgLine()]),
    markLineReleased: (params) => rows([{ id: params[0], quantity: 1 }]),
    releaseCapacity: () => rows([{ id: `av-${CABIN}` }]),
  })
  installClient(client)
  try {
    const adapter = new PostgresShapedAdapter()
    adapter.storedRow = reservationPayload({ status: RESERVATION_STATUS.REQUESTED })
    const repo = new ReservationRepository(adapter, { tenant: { id: TENANT } })
    await repo.initialize()

    const result = await repo.expireReservationWithRelease(
      { ...reservationPayload(), status: RESERVATION_STATUS.EXPIRED, cancelledAt: 'should-never-be-written' },
      TENANT,
      { expectedStatus: RESERVATION_STATUS.REQUESTED }
    )

    assertEqual(result.reservation.status, RESERVATION_STATUS.EXPIRED, 'the transaction must resolve the updated row')
    assertEqual(result.reservation.cancelled_at, 'stored-value', 'the returned row keeps the stored cancelled_at')
    assertDeep(
      client.businessStatements().filter((s) => s.kind !== 'clientRelease').map((s) => s.kind),
      [
        'updateReservation',
        'selectLines',
        'markLineReleased',
        'releaseCapacity',
        'releaseCapacity',
      ],
      'two recorded nights means two capacity releases, after the line is marked'
    )
    const kinds = client.kindsSeen()
    assertEqual(kinds.begin ?? 0, 1, 'BEGIN is issued once')
    assertEqual(kinds.commit ?? 0, 1, 'COMMIT is issued exactly once')
    assertEqual(kinds.rollback ?? 0, 0, 'ROLLBACK is never requested on success')
    assertEqual(kinds.selectLines ?? 0, 1, 'the unreleased lines are selected once')
    assertEqual(kinds.markLineReleased ?? 0, 1, 'the single line is marked released once')
    assertEqual(kinds.releaseCapacity ?? 0, 2, 'one capacity release per recorded night')

    const update = client.callsOf('updateReservation')[0]
    assert(!update.sql.includes('cancelled_at'), `expiration must not write cancelled_at: ${update.sql}`)
    assert(!update.sql.includes('special_requests'), `expiration must not write special_requests: ${update.sql}`)
    assert(update.sql.includes('updated_at = NOW()'), 'expiration must maintain updated_at')
    assertDeep(update.params, [RESERVATION_STATUS.EXPIRED, RES_ID, TENANT, RESERVATION_STATUS.REQUESTED], 'bound parameters')
  } finally {
    uninstallClient()
  }
})

await test('PG orchestration: a record-less DATE_RANGE refusal requests ROLLBACK and never COMMIT', async () => {
  const client = createClientDouble({
    updateReservation: (params) => rows([{ id: params[1], status: params[0] }]),
    selectLines: () => rows([pgLine({ metadata: JSON.stringify({}) })]),
    markLineReleased: () => rows([{ id: 'line-1', quantity: 1 }]),
    releaseCapacity: () => rows([{ id: 'av-row' }]),
  })
  installClient(client)
  try {
    const adapter = new PostgresShapedAdapter()
    adapter.storedRow = reservationPayload({ status: RESERVATION_STATUS.REQUESTED })
    const repo = new ReservationRepository(adapter, { tenant: { id: TENANT } })
    await repo.initialize()

    await assertRejects(
      () => repo.expireReservationWithRelease(
        { ...reservationPayload(), status: RESERVATION_STATUS.EXPIRED },
        TENANT,
        { expectedStatus: RESERVATION_STATUS.REQUESTED }
      ),
      'AvailabilityConsumptionRecordError',
      'record-less DATE_RANGE on the PostgreSQL path'
    )

    assertEqual(client.callsOf('rollback').length, 1, 'ROLLBACK must be requested')
    assertEqual(client.callsOf('commit').length, 0, 'COMMIT must never be requested')
    assertEqual(client.callsOf('markLineReleased').length, 0, 'no line may be marked released')
    assertEqual(client.callsOf('releaseCapacity').length, 0, 'no capacity may be released')
  } finally {
    uninstallClient()
  }
})

await test('PG orchestration: a mixed valid-first / legacy-second reservation releases nothing and requests ROLLBACK', async () => {
  const client = createClientDouble({
    updateReservation: (params) => rows([{ id: params[1], status: params[0] }]),
    selectLines: () => rows([
      pgLine({ id: 'line-valid', metadata: JSON.stringify({ __occupiedNights: { version: 1, dates: civilRange(START, NIGHTS), quantity: 1 } }) }),
      pgLine({ id: 'line-legacy', metadata: JSON.stringify({}) }),
    ]),
    markLineReleased: (params) => rows([{ id: params[0], quantity: 1 }]),
    releaseCapacity: () => rows([{ id: 'av-row' }]),
  })
  installClient(client)
  try {
    const adapter = new PostgresShapedAdapter()
    adapter.storedRow = reservationPayload({ status: RESERVATION_STATUS.REQUESTED })
    const repo = new ReservationRepository(adapter, { tenant: { id: TENANT } })
    await repo.initialize()

    await assertRejects(
      () => repo.expireReservationWithRelease(
        { ...reservationPayload(), status: RESERVATION_STATUS.EXPIRED },
        TENANT,
        { expectedStatus: RESERVATION_STATUS.REQUESTED }
      ),
      'AvailabilityConsumptionRecordError',
      'mixed reservation on the PostgreSQL path'
    )

    assertEqual(client.callsOf('rollback').length, 1, 'ROLLBACK must be requested')
    assertEqual(client.callsOf('commit').length, 0, 'COMMIT must never be requested')
    assertEqual(client.callsOf('markLineReleased').length, 0, 'the valid line must not be marked released either')
    assertEqual(client.callsOf('releaseCapacity').length, 0, 'no capacity may be released')
  } finally {
    uninstallClient()
  }
})

await test('PG orchestration: a capacity shortfall requests ROLLBACK and never COMMIT', async () => {
  const client = createClientDouble({
    updateReservation: (params) => rows([{ id: params[1], status: params[0] }]),
    selectLines: () => rows([pgLine()]),
    markLineReleased: (params) => rows([{ id: params[0], quantity: 1 }]),
    // Zero rows: the guarded UPDATE found no capacity to release.
    releaseCapacity: () => rows([]),
  })
  installClient(client)
  try {
    const adapter = new PostgresShapedAdapter()
    adapter.storedRow = reservationPayload({ status: RESERVATION_STATUS.REQUESTED })
    const repo = new ReservationRepository(adapter, { tenant: { id: TENANT } })
    await repo.initialize()

    await assertRejects(
      () => repo.expireReservationWithRelease(
        { ...reservationPayload(), status: RESERVATION_STATUS.EXPIRED },
        TENANT,
        { expectedStatus: RESERVATION_STATUS.REQUESTED }
      ),
      'insufficient reserved_count',
      'capacity shortfall on the PostgreSQL path'
    )

    assertEqual(client.callsOf('rollback').length, 1, 'ROLLBACK must be requested')
    assertEqual(client.callsOf('commit').length, 0, 'COMMIT must never be requested')
  } finally {
    uninstallClient()
  }
})

await test('PG orchestration: a missing capacity row requests ROLLBACK and never COMMIT', async () => {
  // On the Map path a missing row and an insufficient count are distinguished
  // (no availability row vs insufficient reservedCount) because the rows are real.
  // On PostgreSQL both are the same statement outcome — the guarded UPDATE matches
  // nothing — so this case is proven at the Map level above and here as the
  // zero-row guard that covers it: ROLLBACK requested, no COMMIT, and no later
  // night's release published after the first failure.
  const client = createClientDouble({
    updateReservation: (params) => rows([{ id: params[1], status: params[0] }]),
    selectLines: () => rows([pgLine()]),
    markLineReleased: (params) => rows([{ id: params[0], quantity: 1 }]),
    releaseCapacity: () => rows([]),
  })
  installClient(client)
  try {
    const adapter = new PostgresShapedAdapter()
    adapter.storedRow = reservationPayload({ status: RESERVATION_STATUS.REQUESTED })
    const repo = new ReservationRepository(adapter, { tenant: { id: TENANT } })
    await repo.initialize()

    await assertRejects(
      () => repo.expireReservationWithRelease(
        { ...reservationPayload(), status: RESERVATION_STATUS.EXPIRED },
        TENANT,
        { expectedStatus: RESERVATION_STATUS.REQUESTED }
      ),
      'insufficient reserved_count',
      'a missing capacity row on the PostgreSQL path'
    )

    assertEqual(client.callsOf('rollback').length, 1, 'ROLLBACK must be requested')
    assertEqual(client.callsOf('commit').length, 0, 'COMMIT must never be requested')
    assertEqual(client.callsOf('releaseCapacity').length, 1, 'the first missing row aborts before any further night')
  } finally {
    uninstallClient()
  }
})

await test('PG orchestration: cancellation keeps its cancelled_at and special_requests writes after the shared-core extraction', async () => {
  const client = createClientDouble({
    updateReservation: (params) => rows([{ id: params[3], status: params[0], cancelled_at: params[1], special_requests: params[2] }]),
    selectLines: () => rows([pgLine()]),
    markLineReleased: (params) => rows([{ id: params[0], quantity: 1 }]),
    releaseCapacity: () => rows([{ id: 'av-row' }]),
  })
  installClient(client)
  try {
    const adapter = new PostgresShapedAdapter()
    adapter.storedRow = reservationPayload({ status: RESERVATION_STATUS.REQUESTED })
    const repo = new ReservationRepository(adapter, { tenant: { id: TENANT } })
    await repo.initialize()

    const cancelledAt = '2026-06-01T00:00:00.000Z'
    await repo.cancelReservationWithRelease(
      { ...reservationPayload(), status: RESERVATION_STATUS.CANCELLED, notes: 'guest request', cancelledAt },
      TENANT
    )

    const update = client.callsOf('updateReservation')[0]
    assert(update.sql.includes('cancelled_at = $2'), `cancellation must still write cancelled_at: ${update.sql}`)
    assert(update.sql.includes('special_requests = $3'), 'cancellation must still write special_requests')
    assert(!update.sql.includes('AND status ='), 'cancellation must NOT gain the expiration expected-status predicate')
    assertDeep(update.params, [RESERVATION_STATUS.CANCELLED, cancelledAt, 'guest request', RES_ID, TENANT], 'bound parameters unchanged')
    assertEqual(client.callsOf('commit').length, 1, 'a successful cancellation must COMMIT')
  } finally {
    uninstallClient()
  }
})

// ---------------------------------------------------------------------------
// 16. Business integration: one delegation, no range release, consistent event
// ---------------------------------------------------------------------------

/**
 * A context for the real BusinessReservationManager.
 *
 * The manager resolves collaborators through the capability-context contract, so
 * the double is wired at exactly the places it looks: `repositories.business`
 * and `repositories.reservation` for the ownership/active assertions, and
 * `capabilities.get('business').manager.getAvailabilityManager()` for the range
 * release that this slice removed. The availability double exists so the
 * "no range release" assertions are meaningful: before the removal this is where
 * the manager obtained the object it called releaseReservation on.
 */
function businessContext({ delegateResult, businessStatus = 'active', reservation = null } = {}) {
  const events = []
  const availabilityCalls = []
  const availabilityManager = {
    releaseReservation: async (...args) => {
      availabilityCalls.push(args)
      return { success: true }
    },
  }
  return {
    events,
    availabilityCalls,
    delegateResult,
    reservation: reservation || reservationPayload({ businessId: 'biz-1' }),
    context: {
      tenant: { id: TENANT },
      eventBus: { emit: (event, data) => events.push({ event, data }) },
      runtime: {},
      repositories: {
        business: { findById: async (id) => (id === 'biz-1' ? { id, status: businessStatus } : null) },
        reservation: { findById: async () => reservationPayload({ businessId: 'biz-1' }) },
      },
      capabilities: {
        get: (id) => (id === 'business' ? { manager: { getAvailabilityManager: () => availabilityManager } } : null),
      },
      config: {},
    },
  }
}

await test('business: expireReservation delegates once and performs no availability range release', async () => {
  const fixture = businessContext({ delegateResult: { success: true, status: RESERVATION_STATUS.EXPIRED } })
  const delegations = []
  const scoped = {
    expireReservation: async (reservationId, identity) => {
      delegations.push({ reservationId, identity })
      return fixture.delegateResult
    },
  }
  const manager = new BusinessReservationManager(fixture.context, scoped)

  const result = await manager.expireReservation('biz-1', RES_ID, { id: 'someone' })

  assertEqual(result.success, true, 'the delegate result is returned unchanged')
  assertEqual(delegations.length, 1, 'the reservation manager must be delegated to exactly once')
  assertEqual(delegations[0].reservationId, RES_ID, 'the reservationId must be forwarded')
  assertDeep(eventNames(fixture.events), [BUSINESS_RESERVATION_EVENTS.RESERVATION_EXPIRED], 'the business expired event must be emitted')
  assertDeep(fixture.availabilityCalls, [], 'no availability range release may be issued')
})

await test('business: a NO_RESPONSE outcome emits the sibling business event, not the expired one', async () => {
  const fixture = businessContext({ delegateResult: { success: true, status: RESERVATION_STATUS.NO_RESPONSE } })
  const scoped = { expireReservation: async () => fixture.delegateResult }
  const manager = new BusinessReservationManager(fixture.context, scoped)

  await manager.expireReservation('biz-1', RES_ID)

  assertDeep(eventNames(fixture.events), [BUSINESS_RESERVATION_EVENTS.RESERVATION_NO_RESPONSE], 'the sibling event must be used')
  assert(!fixture.events.some((e) => e.event === BUSINESS_RESERVATION_EVENTS.RESERVATION_EXPIRED), 'an unanswered owner must not be reported as expired')
  const payload = fixture.events[0].data
  assertEqual(payload.status, RESERVATION_STATUS.NO_RESPONSE, 'the payload must carry the resulting status')
  assertDeep(fixture.availabilityCalls, [], 'no availability range release may be issued')
})

await test('business: an EXPIRED outcome keeps the existing business expired event and still issues no range release', async () => {
  const fixture = businessContext({ delegateResult: { success: true, status: RESERVATION_STATUS.EXPIRED } })
  const scoped = { expireReservation: async () => fixture.delegateResult }
  const manager = new BusinessReservationManager(fixture.context, scoped)

  await manager.expireReservation('biz-1', RES_ID)

  assertDeep(eventNames(fixture.events), [BUSINESS_RESERVATION_EVENTS.RESERVATION_EXPIRED], 'the existing event must be kept')
  assertDeep(fixture.availabilityCalls, [], 'no availability range release may be issued')
  assertEqual(fixture.events[0].data.status, RESERVATION_STATUS.EXPIRED, 'the payload must carry the resulting status')
})

await test('business: a failed delegation emits nothing', async () => {
  const fixture = businessContext({ delegateResult: { success: false, errors: ['Invalid transition'] } })
  const scoped = { expireReservation: async () => fixture.delegateResult }
  const manager = new BusinessReservationManager(fixture.context, scoped)

  const result = await manager.expireReservation('biz-1', RES_ID)

  assertEqual(result.success, false, 'the failed result is returned unchanged')
  assertDeep(fixture.events, [], 'no business event may be emitted on failure')
  assertDeep(fixture.availabilityCalls, [], 'no availability range release may be issued')
})

await test('business: a delegated failure propagates to the caller', async () => {
  // SCOPE CORRECTION. The removed range-based release ran inside a bare
  // `catch { }`, but the `await this.#delegateService(...)` call sat OUTSIDE that
  // try/catch. A delegation rejection was therefore already propagating to the
  // caller before this slice, and it still does. What the removal changed is that
  // a failure of the RANGE RELEASE ITSELF is no longer silently discarded — that
  // release is gone, and the delegated call now performs the real one, whose
  // failures propagate on their own terms.
  //
  // This test pins the surviving behaviour; it does not claim that this slice
  // introduced propagation.
  const fixture = businessContext({ delegateResult: null })
  const scoped = {
    expireReservation: async () => {
      throw new AvailabilityConsumptionRecordError('refused')
    },
  }
  const manager = new BusinessReservationManager(fixture.context, scoped)

  await assertRejects(
    () => manager.expireReservation('biz-1', RES_ID),
    'refused',
    'a propagating delegation failure'
  )
  assertDeep(fixture.events, [], 'no business event may be emitted when the delegation throws')
  assertDeep(fixture.availabilityCalls, [], 'no availability range release may be issued')
})

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(`\ntotal: ${passed + failed}  passed: ${passed}  failed: ${failed}\n`)
if (failed > 0) {
  for (const { name, error } of failures) {
    console.log(`FAILURE: ${name}`)
    console.log(`  ${error && error.stack ? error.stack.split('\n').slice(0, 3).join('\n  ') : error}`)
  }
  process.exitCode = 1
}