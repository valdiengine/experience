/**
 * BOOKING-EXPIRATION-TIMERS-1 — reservation expiration timers, focused tests.
 *
 * WHAT IS EXERCISED FOR REAL
 *   The real `ReservationTimer`, the real `ReservationManager`, the real
 *   `ReservationRepository` on the real writable `InMemoryRepositoryAdapter`, the
 *   real `ReservationConfig`, the real `ReservationWorkflow`, the real
 *   `SchedulerCapability` with its real `SchedulerManager` and real
 *   `SchedulerExecutor`, and the real `AvailabilityCapability` the repository
 *   consumes capacity through. Nothing is re-implemented here: the code under
 *   test is steered by what the context presents, never by asserting on source
 *   text.
 *
 * HOW THE SCHEDULER IS DRIVEN
 *   Jobs are run through the two REAL call paths that exist in the product, not
 *   by calling the handler directly:
 *     - `SchedulerCapability.manager.run(jobId)`     -> `handler(payload)`
 *     - `SchedulerCapability.executor.execute(job)`  -> `handler(payload, job)`
 *   `SchedulerCapability.activate()` is deliberately never called, so no
 *   `setInterval` is started: every test awaits an explicit run instead of
 *   waiting for wall-clock time.
 *
 * HOW TIME IS CONTROLLED
 *   No deadline is ever awaited. A timer is armed from a reservation whose
 *   state-entry timestamp is a fixed number of hours in the PAST, so
 *   `createdAt + 12h` is already due; a fresh reservation covers the "not due
 *   yet" cases. Assertions are arithmetic on the armed record's real
 *   `anchorAt`/`expiresAt`, not on a mocked clock.
 *
 * THE DOUBLES USED, AND ONLY THESE
 *   - A minimal `dataManager` (the real `DataManager` needs a provider), used
 *     exactly as production uses it: `get`/`set` per key.
 *   - A repository proxy, in the release-failure cases only, whose
 *     `expireReservationWithRelease` rejects, so the failure branch is reachable
 *     deterministically.
 *   - A scheduler stub, in the scheduling-failure cases only, because "no
 *     scheduler / a scheduler that rejects / a scheduler that lies" has no
 *     successful real instance.
 *
 * HOW PHYSICAL DATABASE ACCESS IS PREVENTED
 *   Identical to reservation.expiration-atomic.test.js: the module-customization
 *   hooks in test-support/pg-fail-closed-hooks.mjs are registered BEFORE any
 *   module importing the `pg` driver is loaded, so every bare `pg` specifier
 *   resolves to a double and the genuine driver is never loaded, constructed or
 *   contacted. `assertPgIsDoubled()` positively verifies this. Nothing here
 *   performs a query, opens a socket, or touches Stage.
 *
 * THE CLAIM BOUNDARY
 *   Timer state and scheduler jobs live in this process. These tests prove the
 *   ordering, guarding and reporting behaviour; they certify nothing about
 *   durability, a restart, a second process, or a real PostgreSQL server.
 *
 * Framework-free. No database, network, provisioning or dependency installation.
 * Invoked standalone; not wired into a repository-wide runner.
 *
 * Run: node capabilities/reservation/reservation.timers-1.test.js
 */

import { InMemoryRepositoryAdapter } from '../../tests/capability/capability.mock.repositories.js'
import { AvailabilityCapability } from '../availability/availability.capability.js'
import {
  installPgDouble,
  assertPgIsDoubled,
  civilRange,
  addDays,
  REPOSITORY_URL,
} from '../persistence/repositories/reservation/test-support/reservation.repository.test-support.mjs'

installPgDouble()
const { ReservationRepository } = await import(REPOSITORY_URL)
const { default: ReservationManager } = await import('./reservation.manager.js')
const { ReservationTimer } = await import('./reservation.timer.js')
const { ReservationConfig } = await import('./reservation.config.js')
const { RESERVATION_STATUS } = await import('./reservation.status.js')
const { RESERVATION_EVENTS } = await import('./reservation.events.js')
const { SchedulerCapability } = await import('../scheduler/scheduler.capability.js')
const { default: ReservationCapability } = await import('./reservation.capability.js')

assertPgIsDoubled()

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
    throw new Error(
      `${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    )
  }
}

async function assertRejects(fn, matcher, label) {
  let thrown = null
  try {
    await fn()
  } catch (error) {
    thrown = error
  }
  if (thrown === null) throw new Error(`${label}: expected a throw, but nothing was thrown`)
  const name = thrown?.constructor?.name || thrown?.name
  if (String(name) !== matcher && !String(thrown?.message || '').includes(matcher)) {
    throw new Error(`${label}: expected ${matcher}, got ${name}: ${thrown.message}`)
  }
  return thrown
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const HOUR = 60 * 60 * 1000
const START = '2026-05-04'
const NIGHTS = 2
const DATES = civilRange(START, NIGHTS)
const END_DATE = addDays(START, NIGHTS)

const TENANT = 'tenant-1'
const CABIN = 'cab-1'
const RES_ID = 'res-timer-1'
const OTHER_ID = 'res-timer-2'

const RES_TABLE = 'reservation'
const AVAIL_TABLE = 'availability'
const LINE_TABLE = 'reservation_lines'

const iso = (ms) => new Date(ms).toISOString()

/** A reservation whose state entry was `hoursOld` hours ago. */
function reservationRow({
  id = RES_ID,
  status = RESERVATION_STATUS.REQUESTED,
  hoursOld = 0,
  tenantId = TENANT,
} = {}) {
  const entered = Date.now() - hoursOld * HOUR
  return {
    id,
    tenantId,
    businessId: 'biz-1',
    accommodationId: CABIN,
    resourceId: 'unit-1',
    status,
    customer: { name: 'Ana', email: 'ana@test.example', channelPreference: 'email' },
    dates: { checkIn: START, checkOut: END_DATE },
    guests: 2,
    notes: '',
    metadata: {},
    createdAt: iso(entered),
    ...(status === RESERVATION_STATUS.REQUESTED ? {} : { updatedAt: iso(entered) }),
    deletedAt: null,
  }
}

/**
 * A recorded DATE_RANGE line, so expiration has real capacity to release.
 *
 * `quantity` is the units held on EACH recorded date, which is why the seeded
 * `reservedCount` is one per night for a two-night stay of a single unit.
 */
function recordedLine(reservationId, lineId) {
  return {
    id: lineId,
    reservationId,
    lineOrder: 1,
    targetType: 'accommodation',
    targetId: CABIN,
    temporal: { mode: 'DATE_RANGE', startDate: START, endDate: END_DATE },
    quantity: 1,
    metadata: { __occupiedNights: { version: 1, dates: [...DATES], quantity: 1 } },
    releasedAt: null,
  }
}

/**
 * Seed the writable Map store with capacity, and one line per seeded
 * reservation. `reservedCount` defaults to the number of seeded reservations, so
 * the fixture is self-consistent without every test restating it.
 */
function seedStore({ rows = [], inventory = 4 } = {}) {
  InMemoryRepositoryAdapter.reset()
  const store = InMemoryRepositoryAdapter.store
  store.set(RES_TABLE, new Map())
  store.set(LINE_TABLE, new Map())
  store.set(AVAIL_TABLE, new Map())

  const reservedCount = rows.length

  for (const date of DATES) {
    const id = `av-${CABIN}-${date}`
    store.get(AVAIL_TABLE).set(id, {
      id,
      tenantId: TENANT,
      accommodationId: CABIN,
      date,
      inventory,
      reservedCount,
      available: inventory - reservedCount,
      status: reservedCount >= inventory ? 'reserved' : 'available',
      isBlocked: false,
    })
  }

  for (const row of rows) {
    store.get(RES_TABLE).set(row.id, row)
    const line = recordedLine(row.id, `line-${row.id}`)
    store.get(LINE_TABLE).set(line.id, line)
  }

  return store
}

const storedRow = (store, id = RES_ID) => store.get(RES_TABLE).get(id) ?? null
const storedStatus = (store, id = RES_ID) => storedRow(store, id)?.status ?? null
const reservedCounts = (store) =>
  [...(store.get(AVAIL_TABLE)?.values() ?? [])]
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((r) => r.reservedCount)
    .join(',')
const lineReleasedAt = (store, id = RES_ID) => store.get(LINE_TABLE).get(`line-${id}`)?.releasedAt ?? null

/** The minimal `dataManager` surface the scheduler and config actually use. */
function dataManagerDouble(initial = {}) {
  const store = new Map(Object.entries(initial))
  return {
    store,
    get: (path) => store.get(path),
    set: (path, value) => store.set(path, value),
  }
}

/** A real `SchedulerCapability`, initialised but never activated (no intervals). */
async function schedulerCapabilityFor(dataManager, eventBus) {
  const scheduler = new SchedulerCapability()
  await scheduler.init(
    { tenant: { id: TENANT }, dataManager, eventBus, capabilities: { get: () => null } },
    {}
  )
  return scheduler
}

/**
 * A complete, real timer + manager + repository + scheduler system.
 *
 * `rows` seeds the store; pass `[]` for the tests that create a reservation
 * through the real `createRequest`. `schedulerOverride` replaces the real
 * scheduler (the cases where the scheduler itself is under test) and
 * `repoWrapper` wraps the real repository (the release-failure cases).
 */
async function makeSystem({
  rows = [reservationRow()],
  tenantReservationConfig = null,
  schedulerOverride = null,
  notificationsOverride = null,
  communicationOverride = null,
  repoWrapper = (repo) => repo,
  withNotifications = true,
} = {}) {
  const store = seedStore({ rows })

  const adapter = new InMemoryRepositoryAdapter({ name: 'mock' }, { entityName: RES_TABLE })
  const repository = new ReservationRepository(adapter, {
    tenant: { id: TENANT },
    capabilities: { get: (id) => (id === 'availability' ? new AvailabilityCapability() : null) },
  })
  await repository.initialize()
  const repo = repoWrapper(repository)

  const events = []
  const notifications = []
  const eventBus = { emit: (event, data) => events.push({ event, data }) }

  const dataManager = dataManagerDouble()
  if (tenantReservationConfig) {
    dataManager.set(`tenantConfig.${TENANT}.reservation`, tenantReservationConfig)
  }

  const scheduler = schedulerOverride ?? (await schedulerCapabilityFor(dataManager, eventBus))

  const context = {
    tenant: { id: TENANT },
    config: { persistenceProvider: 'mock' },
    repositories: { reservation: repo },
    capabilities: {
      get: (id) => {
        if (id === 'scheduler') return scheduler
        if (id === 'communication' && communicationOverride) return communicationOverride
        if (id === 'notifications') {
          if (notificationsOverride) return notificationsOverride
          return withNotifications ? { send: async (payload) => { notifications.push(payload) } } : null
        }
        return null
      },
    },
    dataManager,
    runtime: null,
    eventBus,
  }

  const manager = new ReservationManager(context)
  const timer = new ReservationTimer(context, { manager })
  const registration = await timer.activate()

  return { manager, timer, repo, scheduler, store, events, notifications, context, dataManager, registration }
}

/**
 * A SECOND real manager + timer over the SAME context, so both share one
 * repository, one dataManager and one scheduler capability: exactly the situation
 * a fixed handler name would break.
 */
async function attachSecondInstance(system) {
  const manager = new ReservationManager(system.context)
  const timer = new ReservationTimer(system.context, { manager })
  const registration = await timer.activate()
  return { manager, timer, registration }
}

const countEvents = (events, name) => events.filter((e) => e.event === name).length
const expirationJobs = (scheduler) =>
  scheduler.getJobs().filter((j) => String(j.handler).startsWith('reservationExpiration'))
const jobFor = (scheduler, reservationId, status) =>
  scheduler.getJobs().find(
    (j) => j.payload?.reservationId === reservationId && j.payload?.expectedStatus === status
  ) || null

/** Run a stored job through the real SchedulerManager -> handler(payload). */
const runViaManager = (scheduler, jobId) => scheduler.manager.run(jobId)

/** Run a stored job through the real SchedulerExecutor -> handler(payload, job). */
const runViaExecutor = (scheduler, jobId) => scheduler.executor.execute(scheduler.manager.getJob(jobId))

/** Let every already-settled promise chain finish. */
const drain = async () => {
  for (let i = 0; i < 5; i++) await new Promise((resolve) => setImmediate(resolve))
}

/**
 * Deliver a payload to a named handler through the real executor and return the
 * handler's own result. This is the production resolution path, so it also
 * proves the handler is actually registered under that name.
 */
async function deliver(scheduler, handlerName, payload, jobId) {
  const outcome = await scheduler.executor.execute({
    id: jobId || `probe-${handlerName}`,
    handler: handlerName,
    status: 'pending',
    payload,
    createdAt: iso(Date.now()),
  })
  if (outcome.success !== true) {
    throw new Error(`deliver: the handler did not run: ${JSON.stringify(outcome)}`)
  }
  return outcome.result
}

const requestPayload = (overrides = {}) => ({
  resourceId: 'unit-1',
  accommodationId: CABIN,
  customer: { name: 'Ana', email: 'ana@test.example', channelPreference: 'email' },
  dates: { checkIn: START, checkOut: END_DATE },
  guests: 2,
  ...overrides,
})

const createRequest = (manager, extra = {}) => manager.createRequest(requestPayload(extra))

/** The `eventBus` surface the capabilities actually touch: `emit`, `on`, `off`. */
function eventBusDouble(sink = []) {
  const subscriptions = []
  return {
    subscriptions,
    emit: (event, data) => sink.push({ event, data }),
    on: (event) => {
      subscriptions.push(event)
      return () => {}
    },
    off: () => {},
  }
}

console.log('\nBOOKING-EXPIRATION-TIMERS-1 — reservation expiration timers\n')

// ---------------------------------------------------------------------------
// 1. Config: status-keyed timeouts, no silent 24h
// ---------------------------------------------------------------------------

console.log('config:')

await test('the three approved defaults resolve by their own lowercase status', () => {
  const config = new ReservationConfig({ tenant: { id: TENANT } })
  assertEqual(config.getTimeout(RESERVATION_STATUS.REQUESTED), 12 * HOUR, 'requested must be 12h')
  assertEqual(config.getTimeout(RESERVATION_STATUS.OWNER_PENDING), 24 * HOUR, 'owner_pending must be 24h')
  assertEqual(config.getTimeout(RESERVATION_STATUS.PAYMENT_PENDING), 6 * HOUR, 'payment_pending must be 6h')
})

await test('no other state inherits the owner-pending timeout', () => {
  const config = new ReservationConfig({ tenant: { id: TENANT } })
  for (const status of [
    RESERVATION_STATUS.OWNER_CONFIRMED,
    RESERVATION_STATUS.CONFIRMED,
    RESERVATION_STATUS.CHECKED_IN,
    RESERVATION_STATUS.CHECKED_OUT,
    RESERVATION_STATUS.COMPLETED,
    RESERVATION_STATUS.EXPIRED,
    RESERVATION_STATUS.NO_RESPONSE,
    RESERVATION_STATUS.REJECTED,
    RESERVATION_STATUS.CANCELLED,
    RESERVATION_STATUS.NO_SHOW,
    RESERVATION_STATUS.ARCHIVED,
    'nonsense',
    undefined,
  ]) {
    assertEqual(config.getTimeout(status), null, `${status} must have no timeout`)
  }
})

await test('an invalid timeout override is reported instead of becoming 24h', () => {
  const config = new ReservationConfig({
    tenant: { id: TENANT },
    dataManager: {
      get: (key) =>
        key === `tenantConfig.${TENANT}.reservation` ? { requestedTimeout: 'soon' } : undefined,
    },
  })
  const resolution = config.resolveTimeout(RESERVATION_STATUS.REQUESTED)
  assertEqual(resolution.timerState, 'invalid_setting', 'an unusable override must be reported')
  assertEqual(resolution.timeoutMs, null, 'no timeout may be substituted')
  assert(String(resolution.error).includes('requestedTimeout'), 'the error must name the setting')
})

await test('an invalid autoExpiration switch is reported and fails closed', () => {
  const config = new ReservationConfig({
    tenant: { id: TENANT },
    dataManager: {
      get: (key) =>
        key === `tenantConfig.${TENANT}.reservation` ? { autoExpiration: 'yes' } : undefined,
    },
  })
  const settings = config.getAutoExpirationSettings()
  assertEqual(settings.supported, false, 'the switch must be reported as unusable')
  assertEqual(settings.enabled, false, 'nothing may be armed from an unusable switch')
  assert(String(settings.error).includes('autoExpiration'), 'the error must name the setting')
})

await test('an unusable override arms nothing rather than arming a wrong deadline', async () => {
  const system = await makeSystem({
    tenantReservationConfig: { requestedTimeout: 'soon' },
  })
  const outcome = await system.timer.startReservationTimer(RES_ID, RESERVATION_STATUS.REQUESTED, {
    reservation: storedRow(system.store),
  })
  assertEqual(outcome.status, 'failed', 'the arming must fail explicitly')
  assertEqual(outcome.reason, 'invalid_timeout_setting', 'the reason must name the setting')
  assert(String(outcome.error).includes('requestedTimeout'), 'the error must be reported')
  assertEqual(system.timer.getActiveTimers().length, 0, 'nothing may be armed')
  assertEqual(expirationJobs(system.scheduler).length, 0, 'no job may be queued')
})

await test('autoExpiration off is honoured as a skip, not an error', async () => {
  const system = await makeSystem({ tenantReservationConfig: { autoExpiration: false } })
  const outcome = await system.timer.startReservationTimer(RES_ID, RESERVATION_STATUS.REQUESTED, {
    reservation: storedRow(system.store),
  })
  assertEqual(outcome.status, 'skipped', 'a disabled feature is not a failure')
  assertEqual(outcome.reason, 'auto_expiration_disabled', 'the reason must name the switch')
  assertEqual(expirationJobs(system.scheduler).length, 0, 'no job may be queued')
})

// ---------------------------------------------------------------------------
// 2. Scheduling is verified, not assumed
// ---------------------------------------------------------------------------

console.log('\nscheduling:')

await test('the handler is registered before anything can be scheduled', async () => {
  const { timer, store, registration, scheduler } = await makeSystem()
  assertEqual(registration.status, 'registered', 'activation must report the registration')
  assert(
    String(timer.handlerName).startsWith('reservationExpiration'),
    'the handler keeps its established name'
  )

  const armed = await timer.startReservationTimer(RES_ID, RESERVATION_STATUS.REQUESTED, {
    reservation: storedRow(store),
  })
  assertEqual(armed.status, 'armed', 'the timer must arm once the handler is registered')
  assert(
    String(scheduler.getJobs()[0].handler).startsWith('reservationExpiration'),
    'the queued job must name the registered handler'
  )
})

await test('activation without a scheduler fails loudly instead of arming', async () => {
  const store = seedStore({ rows: [reservationRow()] })
  const manager = new ReservationManager({
    tenant: { id: TENANT },
    repositories: { reservation: null },
    capabilities: { get: () => null },
    dataManager: dataManagerDouble(),
    runtime: null,
    eventBus: { emit: () => {} },
  })
  const timer = new ReservationTimer({ tenant: { id: TENANT }, capabilities: { get: () => null }, dataManager: dataManagerDouble() }, { manager })

  const registration = await timer.activate()
  assertEqual(registration.status, 'failed', 'the missing handler must be reported')
  assert(
    String(registration.error).includes('not registered'),
    'the failure must say the handler is not registered'
  )

  const outcome = await timer.startReservationTimer(RES_ID, RESERVATION_STATUS.REQUESTED, {
    reservation: storedRow(store),
  })
  assertEqual(outcome.status, 'failed', 'arming must fail without a handler')
  assertEqual(outcome.reason, 'timer_inactive', 'the reason must name the missing handler')
})

await test('with no scheduler capability nothing is armed and the failure is explicit', async () => {
  const system = await makeSystem()
  system.context.capabilities.get = () => null

  const outcome = await system.timer.startReservationTimer(RES_ID, RESERVATION_STATUS.REQUESTED, {
    reservation: storedRow(system.store),
  })
  assertEqual(outcome.status, 'failed', 'arming must fail explicitly')
  assertEqual(outcome.reason, 'scheduler_unavailable', 'the reason must name the missing scheduler')
  assertEqual(system.timer.getActiveTimers().length, 0, 'no timer may be left armed')
})

await test('a scheduling rejection leaves no armed timer', async () => {
  const system = await makeSystem({
    schedulerOverride: {
      registerHandler: () => {},
      schedule: async () => ({ success: false, errors: ['scheduler said no'] }),
      cancel: async () => ({ success: true }),
      getJobs: () => [],
    },
  })
  const outcome = await system.timer.startReservationTimer(RES_ID, RESERVATION_STATUS.REQUESTED, {
    reservation: storedRow(system.store),
  })
  assertEqual(outcome.status, 'failed', 'a rejected schedule must fail')
  assertEqual(outcome.reason, 'schedule_rejected', 'the reason must be the rejection')
  assert(String(outcome.error).includes('scheduler said no'), 'the scheduler reason must be reported')
  assertEqual(system.timer.getActiveTimers().length, 0, 'nothing may be reported as armed')
  assertEqual(system.timer.getTimer(RES_ID, RESERVATION_STATUS.REQUESTED), null, 'no record may survive')
})

await test('a scheduler that reports success without storing the job is not trusted', async () => {
  const system = await makeSystem({
    schedulerOverride: {
      registerHandler: () => {},
      schedule: async (def) => ({ success: true, jobId: def.id }),
      cancel: async () => ({ success: true }),
      getJobs: () => [],
    },
  })
  const outcome = await system.timer.startReservationTimer(RES_ID, RESERVATION_STATUS.REQUESTED, {
    reservation: storedRow(system.store),
  })
  assertEqual(outcome.status, 'failed', 'success without a stored job must fail')
  assertEqual(outcome.reason, 'schedule_not_stored', 'the reason must name the missing job')
  assertEqual(system.timer.getActiveTimers().length, 0, 'nothing may be reported as armed')
})

await test('a throwing scheduler leaves no armed timer', async () => {
  const system = await makeSystem({
    schedulerOverride: {
      registerHandler: () => {},
      schedule: async () => {
        throw new Error('scheduler exploded')
      },
      cancel: async () => ({ success: true }),
      getJobs: () => [],
    },
  })
  const outcome = await system.timer.startReservationTimer(RES_ID, RESERVATION_STATUS.REQUESTED, {
    reservation: storedRow(system.store),
  })
  assertEqual(outcome.status, 'failed', 'a throwing scheduler must fail the arming')
  assert(String(outcome.error).includes('scheduler exploded'), 'the scheduler error must be reported')
  assertEqual(system.timer.getActiveTimers().length, 0, 'nothing may be reported as armed')
})

await test('arming without a registered handler fails instead of queueing a dead job', async () => {
  const system = await makeSystem()
  await system.timer.deactivate()
  const outcome = await system.timer.startReservationTimer(RES_ID, RESERVATION_STATUS.REQUESTED, {
    reservation: storedRow(system.store),
  })
  assertEqual(outcome.status, 'failed', 'a dead handler must not be reported as armed')
  assertEqual(outcome.reason, 'timer_inactive', 'the reason must name the missing handler')
  assertEqual(expirationJobs(system.scheduler).length, 0, 'no job may be queued')
})

await test('each arming gets a distinct job id', async () => {
  const { timer, scheduler, store } = await makeSystem()
  await timer.startReservationTimer(RES_ID, RESERVATION_STATUS.REQUESTED, {
    reservation: storedRow(store),
  })
  await timer.startReservationTimer(RES_ID, RESERVATION_STATUS.OWNER_PENDING, {
    reservation: { ...storedRow(store), status: RESERVATION_STATUS.OWNER_PENDING },
  })
  const ids = expirationJobs(scheduler).map((j) => j.id)
  assertEqual(ids.length, 2, 'both armings must be queued')
  assertEqual(new Set(ids).size, 2, 'two armings must not collide')
})

// ---------------------------------------------------------------------------
// 3. Deadlines are anchored to the successful state entry
// ---------------------------------------------------------------------------

console.log('\ndeadline anchoring:')

await test('createRequest arms requested at createdAt + 12h', async () => {
  const { manager, timer, store, events } = await makeSystem({ rows: [] })
  const result = await createRequest(manager)

  assertEqual(result.success, true, 'the reservation must be created')
  assertEqual(result.timer.status, 'armed', 'the requested timer must be armed')
  assertEqual(result.timer.reservationStatus, RESERVATION_STATUS.REQUESTED, 'the armed state must be requested')
  assertEqual(reservedCounts(store), '1,1', 'creating must consume the recorded capacity')

  const row = storedRow(store, result.reservationId)
  const armed = timer.getTimer(result.reservationId, RESERVATION_STATUS.REQUESTED)
  assertEqual(armed.anchorAt, row.createdAt, 'the deadline must anchor to the state entry, not to arming time')
  assertEqual(
    armed.expiresAtMs - Date.parse(row.createdAt),
    12 * HOUR,
    'requested must expire 12h after creation'
  )
  assertEqual(countEvents(events, RESERVATION_EVENTS.CREATED), 1, 'creation must still emit exactly once')
})

await test('requestOwnerConfirmation re-anchors to the transition and cancels the requested job', async () => {
  const system = await makeSystem({ rows: [] })
  const created = await createRequest(system.manager)
  const requestedJob = jobFor(system.scheduler, created.reservationId, RESERVATION_STATUS.REQUESTED)
  const requestedExpiry = system.timer.getTimer(created.reservationId, RESERVATION_STATUS.REQUESTED).expiresAtMs

  const result = await system.manager.requestOwnerConfirmation(created.reservationId)
  assertEqual(result.success, true, 'the transition must succeed')

  const armed = system.timer.getTimer(created.reservationId, RESERVATION_STATUS.OWNER_PENDING)
  assert(armed, 'the owner_pending timer must be armed')
  assertEqual(
    armed.expiresAtMs - Date.parse(armed.anchorAt),
    24 * HOUR,
    'owner_pending must expire 24h after the transition'
  )
  assert(
    armed.expiresAtMs !== requestedExpiry,
    'the new state must get its own deadline, not the old one'
  )

  assertEqual(
    system.scheduler.manager.getJob(requestedJob.id).status,
    'cancelled',
    'the requested job must be cancelled'
  )
  assertEqual(
    system.timer.getTimer(created.reservationId, RESERVATION_STATUS.REQUESTED),
    null,
    'the requested timer must be gone'
  )
})

await test('confirmReservation arms payment_pending at 6h and drops owner_pending', async () => {
  const system = await makeSystem({ rows: [] })
  const created = await createRequest(system.manager)
  await system.manager.requestOwnerConfirmation(created.reservationId)
  const ownerJob = jobFor(system.scheduler, created.reservationId, RESERVATION_STATUS.OWNER_PENDING)

  const result = await system.manager.confirmReservation(created.reservationId)
  assertEqual(result.success, true, 'confirmation must succeed')
  assertEqual(
    storedStatus(system.store, created.reservationId),
    RESERVATION_STATUS.PAYMENT_PENDING,
    'the state must move'
  )

  const armed = system.timer.getTimer(created.reservationId, RESERVATION_STATUS.PAYMENT_PENDING)
  assert(armed, 'the payment_pending timer must be armed')
  assertEqual(
    armed.expiresAtMs - Date.parse(armed.anchorAt),
    6 * HOUR,
    'payment_pending must expire 6h after the transition'
  )

  assertEqual(
    system.scheduler.manager.getJob(ownerJob.id).status,
    'cancelled',
    'the owner_pending job must be cancelled'
  )
  assertEqual(
    system.timer.getTimer(created.reservationId, RESERVATION_STATUS.OWNER_PENDING),
    null,
    'the owner_pending timer must be gone'
  )
})

await test('a duplicate sync in an unchanged state keeps the existing deadline', async () => {
  const { timer, store } = await makeSystem()
  const row = storedRow(store)
  const first = await timer.startReservationTimer(RES_ID, RESERVATION_STATUS.REQUESTED, {
    reservation: row,
  })
  assertEqual(first.status, 'armed', 'the first arming must succeed')

  const again = await timer.syncReservationState(RES_ID, row, { onStateChange: false })
  assertEqual(again.status, 'kept', 'a duplicate sync must keep the timer, not re-arm it')
  assertEqual(again.expiresAt, first.expiresAt, 'the deadline must not restart')

  const third = await timer.startReservationTimer(RES_ID, RESERVATION_STATUS.REQUESTED, {
    reservation: row,
  })
  assertEqual(third.status, 'skipped', 'a duplicate arming must be reported as skipped')
  assertEqual(third.reason, 'duplicate_arming', 'the duplicate must be named')
  assertEqual(third.expiresAt, first.expiresAt, 'the deadline must not restart on a duplicate')
})

await test('a re-arm after a real transition is a new generation with a new deadline', async () => {
  const { timer, scheduler, store } = await makeSystem()
  const row = storedRow(store)
  const first = await timer.startReservationTimer(RES_ID, RESERVATION_STATUS.REQUESTED, {
    reservation: row,
  })
  await timer.stopTimer(RES_ID, RESERVATION_STATUS.REQUESTED)

  const second = await timer.startReservationTimer(RES_ID, RESERVATION_STATUS.REQUESTED, {
    reservation: row,
    anchor: iso(Date.now() + 3600 * 1000),
  })
  assert(second.generation > first.generation, 'a new arming must be a new generation')
  assertEqual(
    Date.parse(second.expiresAt) - Date.parse(second.anchorAt),
    12 * HOUR,
    'the deadline must use the new anchor'
  )
  assertEqual(
    expirationJobs(scheduler).filter((j) => j.status === 'pending').length,
    1,
    'only one live job may remain'
  )
})

await test('a terminal state is not armed at all', async () => {
  const { timer, scheduler, store } = await makeSystem()
  const row = storedRow(store)
  const outcome = await timer.syncReservationState(
    RES_ID,
    { ...row, status: RESERVATION_STATUS.CONFIRMED },
    {}
  )
  assertEqual(outcome.status, 'not_expirable', 'a confirmed reservation must not be armed')
  assertEqual(expirationJobs(scheduler).length, 0, 'no job may be queued')
})

// ---------------------------------------------------------------------------
// 4. Handler scope: instance, tenant, generation
// ---------------------------------------------------------------------------

console.log('\nhandler scope:')

await test('two instances sharing one scheduler keep separate handlers and route their own jobs', async () => {
  const system = await makeSystem({
    rows: [reservationRow({ id: RES_ID, hoursOld: 13 }), reservationRow({ id: OTHER_ID, hoursOld: 13 })],
  })
  const second = await attachSecondInstance(system)

  assert(second.timer.handlerName !== system.timer.handlerName, 'two instances must not share one handler name')

  await system.timer.syncReservationState(RES_ID, storedRow(system.store, RES_ID), { onStateChange: true })
  await second.timer.syncReservationState(OTHER_ID, storedRow(system.store, OTHER_ID), { onStateChange: true })

  const jobA = jobFor(system.scheduler, RES_ID, RESERVATION_STATUS.REQUESTED)
  const jobB = jobFor(system.scheduler, OTHER_ID, RESERVATION_STATUS.REQUESTED)
  assert(jobA && jobB, 'both instances must have queued their own job')
  assertEqual(jobA.handler, system.timer.handlerName, "job A must name the first instance's handler")
  assertEqual(jobB.handler, second.timer.handlerName, "job B must name the second instance's handler")
  assertEqual(reservedCounts(system.store), '2,2', 'the fixture must start with both units held')

  const outcome = await runViaManager(system.scheduler, jobB.id)
  assertEqual(outcome.success, true, 'the job must complete')
  assertEqual(
    storedStatus(system.store, OTHER_ID),
    RESERVATION_STATUS.EXPIRED,
    "the owning instance's handler must expire its own reservation"
  )
  assertEqual(
    storedStatus(system.store, RES_ID),
    RESERVATION_STATUS.REQUESTED,
    'the other reservation must be untouched'
  )
  assertEqual(
    reservedCounts(system.store),
    '1,1',
    'only the expired reservation releases its unit'
  )
})

await test("a payload armed by another instance is a no-op", async () => {
  const system = await makeSystem({
    rows: [reservationRow({ id: RES_ID, hoursOld: 13 }), reservationRow({ id: OTHER_ID, hoursOld: 13 })],
  })
  const second = await attachSecondInstance(system)

  await system.timer.syncReservationState(RES_ID, storedRow(system.store, RES_ID), { onStateChange: true })
  const jobA = jobFor(system.scheduler, RES_ID, RESERVATION_STATUS.REQUESTED)

  const outcome = await deliver(system.scheduler, second.timer.handlerName, jobA.payload)
  assertEqual(outcome.status, 'skipped', 'a foreign payload must be skipped')
  assertEqual(outcome.reason, 'foreign_handler', 'the payload must name a different handler')
  assertEqual(
    storedStatus(system.store, RES_ID),
    RESERVATION_STATUS.REQUESTED,
    'no reservation may be expired by a foreign payload'
  )
})

await test('a payload re-labelled with another tenant is a no-op', async () => {
  const { timer, scheduler, store } = await makeSystem({ rows: [reservationRow({ hoursOld: 13 })] })
  await timer.syncReservationState(RES_ID, storedRow(store), { onStateChange: true })
  const job = jobFor(scheduler, RES_ID, RESERVATION_STATUS.REQUESTED)

  const foreign = { ...job.payload, tenantId: 'tenant-other' }
  const outcome = await deliver(scheduler, timer.handlerName, foreign, job.id)
  assertEqual(outcome.status, 'skipped', 'a foreign-tenant payload must be skipped')
  assertEqual(outcome.reason, 'foreign_tenant', 'the payload must name another tenant')
  assertEqual(
    storedStatus(store),
    RESERVATION_STATUS.REQUESTED,
    'this tenant reservation must not be expired by a payload labelled for another tenant'
  )
})

await test('a superseded job cannot expire the newer timer', async () => {
  const { timer, scheduler, store } = await makeSystem()
  const row = storedRow(store)
  const first = await timer.startReservationTimer(RES_ID, RESERVATION_STATUS.REQUESTED, { reservation: row })
  const stalePayload = { ...jobFor(scheduler, RES_ID, RESERVATION_STATUS.REQUESTED).payload }
  await timer.stopTimer(RES_ID, RESERVATION_STATUS.REQUESTED)
  await timer.startReservationTimer(RES_ID, RESERVATION_STATUS.REQUESTED, { reservation: row })

  const outcome = await deliver(scheduler, timer.handlerName, stalePayload, first.jobId)
  assertEqual(outcome.status, 'skipped', 'the replaced job must be skipped')
  assertEqual(outcome.reason, 'job_id_mismatch', 'a replaced job must not match the new record')
  assertEqual(
    storedStatus(store),
    RESERVATION_STATUS.REQUESTED,
    'the live reservation must not be expired by an obsolete job'
  )
})

await test('a job delivered after its timer was stopped is a no-op', async () => {
  const { timer, scheduler, store } = await makeSystem({ rows: [reservationRow({ hoursOld: 13 })] })
  await timer.syncReservationState(RES_ID, storedRow(store), { onStateChange: true })
  const job = jobFor(scheduler, RES_ID, RESERVATION_STATUS.REQUESTED)

  await timer.stopTimer(RES_ID, RESERVATION_STATUS.REQUESTED)

  const outcome = await deliver(scheduler, timer.handlerName, job.payload, job.id)
  assertEqual(outcome.status, 'skipped', 'a stopped job must be skipped')
  assertEqual(outcome.reason, 'already_handled', 'the stop must be remembered')
  assertEqual(storedStatus(store), RESERVATION_STATUS.REQUESTED, 'a stopped timer must not expire anything')
})

await test('a job with no record at all is a no-op', async () => {
  const { timer, scheduler, store } = await makeSystem()
  const outcome = await deliver(scheduler, timer.handlerName, {
    jobId: 'ghost',
    handler: timer.handlerName,
    instanceId: timer.instanceId,
    tenantId: TENANT,
    reservationId: 'never-armed',
    expectedStatus: RESERVATION_STATUS.REQUESTED,
    generation: 1,
    expiresAt: iso(Date.now() - HOUR),
  })
  assertEqual(outcome.status, 'skipped', 'an unknown reservation must be skipped')
  assertEqual(outcome.reason, 'no_timer', 'the payload must name a reservation this instance never armed')
  assertEqual(storedStatus(store), RESERVATION_STATUS.REQUESTED, 'nothing may be expired')
})

// ---------------------------------------------------------------------------
// 5. Scheduled expiration over the real scheduler, both call signatures
// ---------------------------------------------------------------------------

console.log('\nscheduled expiration (real scheduler):')

for (const [label, run] of [
  ['SchedulerManager.run', runViaManager],
  ['SchedulerExecutor.execute', runViaExecutor],
]) {
  await test(`a due job expires and releases through the atomic manager path via ${label}`, async () => {
    // 13h old, so createdAt + 12h is already due.
    const system = await makeSystem({ rows: [reservationRow({ hoursOld: 13 })] })
    const armed = await system.timer.syncReservationState(RES_ID, storedRow(system.store), {
      onStateChange: true,
    })
    assertEqual(armed.status, 'armed', 'the timer must arm')
    assertEqual(reservedCounts(system.store), '1,1', 'the fixture must start with capacity held')

    const job = jobFor(system.scheduler, RES_ID, RESERVATION_STATUS.REQUESTED)
    const outcome = await run(system.scheduler, job.id)
    assertEqual(outcome.success, true, `the job must complete: ${JSON.stringify(outcome)}`)

    assertEqual(storedStatus(system.store), RESERVATION_STATUS.EXPIRED, 'the stored status must be expired')
    assertEqual(reservedCounts(system.store), '0,0', 'the scheduled expiration must release the capacity')
    assert(lineReleasedAt(system.store), 'the recorded line must be marked released')
    assertEqual(
      countEvents(system.events, RESERVATION_EVENTS.EXPIRED),
      1,
      'expiration must be emitted exactly once'
    )
    assertEqual(system.timer.getActiveTimers().length, 0, 'the settled timer must be dropped')
  })
}

await test('a repeated delivery of the same job does not expire twice', async () => {
  const { timer, scheduler, store, events } = await makeSystem({
    rows: [reservationRow({ hoursOld: 13 })],
  })
  await timer.syncReservationState(RES_ID, storedRow(store), { onStateChange: true })
  const job = jobFor(scheduler, RES_ID, RESERVATION_STATUS.REQUESTED)

  await runViaManager(scheduler, job.id)
  const releasedAt = lineReleasedAt(store)

  const outcome = await deliver(scheduler, timer.handlerName, job.payload, job.id)
  assertEqual(outcome.status, 'skipped', 'the settled job must be a no-op')
  assertEqual(outcome.reason, 'already_handled', 'the settled job must be remembered')
  assertEqual(lineReleasedAt(store), releasedAt, 'the release must happen exactly once')
  assertEqual(countEvents(events, RESERVATION_EVENTS.EXPIRED), 1, 'expiration must be emitted exactly once')
})

await test('a job that fires before its deadline expires nothing', async () => {
  const { timer, scheduler, store } = await makeSystem()
  await timer.startReservationTimer(RES_ID, RESERVATION_STATUS.REQUESTED, {
    reservation: storedRow(store),
  })
  const job = jobFor(scheduler, RES_ID, RESERVATION_STATUS.REQUESTED)

  const outcome = await runViaManager(scheduler, job.id)
  assertEqual(outcome.success, true, 'an early job must complete as an ordinary no-op')
  assertEqual(
    storedStatus(store),
    RESERVATION_STATUS.REQUESTED,
    'an early job must not expire a fresh reservation'
  )
  assertEqual(reservedCounts(store), '1,1', 'an early job must not release anything')
})

// ---------------------------------------------------------------------------
// 6. The manager validates the timer's expectation
// ---------------------------------------------------------------------------

console.log('\nmanager expectation:')

await test('expireReservationFromTimer refuses a stale state without writing', async () => {
  const { manager, store, events } = await makeSystem()
  const before = JSON.stringify(storedRow(store))
  const result = await manager.expireReservationFromTimer(RES_ID, RESERVATION_STATUS.OWNER_PENDING)

  assertEqual(result.success, false, 'a mismatched state must be refused')
  assertEqual(result.reason, 'stale_state', 'the refusal must name the mismatch')
  assertEqual(JSON.stringify(storedRow(store)), before, 'nothing may be written')
  assertEqual(reservedCounts(store), '1,1', 'nothing may be released')
  assertEqual(countEvents(events, RESERVATION_EVENTS.EXPIRED), 0, 'no success may be emitted')
})

await test('expireReservationFromTimer passes the expected state into the repository CAS', async () => {
  const calls = []
  const system = await makeSystem({
    repoWrapper: (repo) => {
      const original = repo.expireReservationWithRelease.bind(repo)
      repo.expireReservationWithRelease = async (data, tenantId, options) => {
        calls.push(options)
        return original(data, tenantId, options)
      }
      return repo
    },
  })
  const result = await system.manager.expireReservationFromTimer(RES_ID, RESERVATION_STATUS.REQUESTED)

  assertEqual(result.success, true, 'the expiration must succeed')
  assertEqual(result.status, RESERVATION_STATUS.EXPIRED, 'the landed status must be reported')
  assertEqual(calls.length, 1, 'the atomic operation must run exactly once')
  assertEqual(calls[0].expectedStatus, RESERVATION_STATUS.REQUESTED, 'the CAS must carry the expected state')
  assertEqual(storedStatus(system.store), RESERVATION_STATUS.EXPIRED, 'the expiration must land')
})

await test('an unsupported source state keeps the thrown invalid transition', async () => {
  const { manager, store, events } = await makeSystem()
  store.get(RES_TABLE).set(RES_ID, { ...storedRow(store), status: RESERVATION_STATUS.CONFIRMED })

  await assertRejects(
    () => manager.expireReservationFromTimer(RES_ID, RESERVATION_STATUS.CONFIRMED),
    'Invalid transition',
    'a confirmed reservation must not expire'
  )
  assertEqual(
    storedStatus(store),
    RESERVATION_STATUS.CONFIRMED,
    'the status must not move'
  )
  assertEqual(reservedCounts(store), '1,1', 'nothing may be released')
  assertEqual(countEvents(events, RESERVATION_EVENTS.EXPIRED), 0, 'no success may be emitted')
})

await test('ordinary expireReservation keeps its thrown invalid transition', async () => {
  const { manager, store } = await makeSystem()
  await manager.expireReservation(RES_ID)
  assertEqual(storedStatus(store), RESERVATION_STATUS.EXPIRED, 'the first expiration must land')
  await assertRejects(
    () => manager.expireReservation(RES_ID),
    'Invalid transition',
    'repeated expiration must still throw'
  )
})

// ---------------------------------------------------------------------------
// 7. checkExpiration awaits and reports
// ---------------------------------------------------------------------------

console.log('\ncheckExpiration:')

await test('a timer that is not due is neither expired nor failed', async () => {
  const { timer, store } = await makeSystem()
  await timer.startReservationTimer(RES_ID, RESERVATION_STATUS.REQUESTED, {
    reservation: storedRow(store),
  })

  const result = await timer.checkExpiration()
  assertEqual(result.expired.length, 0, 'nothing may expire')
  assertEqual(result.failed.length, 0, 'nothing may be reported as failed')
  assertEqual(result.skipped.length, 1, 'the not-due timer must be reported as skipped')
  assertEqual(result.skipped[0].reason, 'not_due', 'the skip must say it is not due')
  assertEqual(storedStatus(store), RESERVATION_STATUS.REQUESTED, 'the status must not move')
})

await test('a due timer is expired exactly once and awaited', async () => {
  const { timer, store } = await makeSystem({ rows: [reservationRow({ hoursOld: 13 })] })
  await timer.syncReservationState(RES_ID, storedRow(store), { onStateChange: true })

  const result = await timer.checkExpiration()
  assertEqual(result.expired.length, 1, 'the due timer must be reported expired')
  assertEqual(result.expired[0].reservationId, RES_ID, 'the report must name the reservation')
  assertEqual(
    result.expired[0].toStatus,
    RESERVATION_STATUS.EXPIRED,
    'the landed status must be reported'
  )
  assertEqual(result.failed.length, 0, 'nothing may be reported as failed')
  assertEqual(storedStatus(store), RESERVATION_STATUS.EXPIRED, 'the status must move')
  assertEqual(reservedCounts(store), '0,0', 'the capacity must be released')
})

await test('two concurrent sweeps expire the timer only once', async () => {
  const { timer, store, events } = await makeSystem({ rows: [reservationRow({ hoursOld: 13 })] })
  await timer.syncReservationState(RES_ID, storedRow(store), { onStateChange: true })

  const [first, second] = await Promise.all([timer.checkExpiration(), timer.checkExpiration()])
  assertEqual(first.expired.length + second.expired.length, 1, 'only one sweep may expire')
  assertEqual(countEvents(events, RESERVATION_EVENTS.EXPIRED), 1, 'expiration must be emitted exactly once')
})

await test('a sweep never reports a moved-on reservation as expired', async () => {
  const { timer, store } = await makeSystem({ rows: [reservationRow({ hoursOld: 13 })] })
  await timer.syncReservationState(RES_ID, storedRow(store), { onStateChange: true })

  // Confirmed out of band while the deadline stands.
  store.get(RES_TABLE).set(RES_ID, { ...storedRow(store), status: RESERVATION_STATUS.CONFIRMED })

  const result = await timer.checkExpiration()
  assertEqual(result.expired.length, 0, 'a moved-on reservation must never be reported expired')
  assertEqual(result.failed.length, 0, 'a moved-on reservation is not a failure')
  assertEqual(result.skipped.length, 1, 'the work must be reported as skipped')
  assertEqual(result.skipped[0].reason, 'stale_state', 'the skip must name the stale state')
  assertEqual(storedStatus(store), RESERVATION_STATUS.CONFIRMED, 'the moved-on status must stand')
  assertEqual(reservedCounts(store), '1,1', 'nothing may be released')
})

await test('a sweep over a deleted reservation is a skip, not a failure', async () => {
  const { timer, store } = await makeSystem({ rows: [reservationRow({ hoursOld: 13 })] })
  await timer.syncReservationState(RES_ID, storedRow(store), { onStateChange: true })
  store.get(RES_TABLE).delete(RES_ID)

  const result = await timer.checkExpiration()
  assertEqual(result.expired.length, 0, 'a deleted reservation must not expire')
  assertEqual(result.failed.length, 0, 'a deleted reservation is not a failure')
  assertEqual(result.skipped.length, 1, 'the work must be reported as skipped')
  assertEqual(result.skipped[0].reason, 'not_found', 'the skip must name the missing reservation')
})

// ---------------------------------------------------------------------------
// 8. A release failure stays observable and retryable
// ---------------------------------------------------------------------------

console.log('\nrelease failure:')

await test('a rejecting release reports a failure, emits no success and keeps the timer', async () => {
  let fail = true
  const system = await makeSystem({
    rows: [reservationRow({ hoursOld: 13 })],
    repoWrapper: (repo) => {
      const original = repo.expireReservationWithRelease.bind(repo)
      repo.expireReservationWithRelease = async (data, tenantId, options) => {
        if (fail) throw new Error('release rejected by storage')
        return original(data, tenantId, options)
      }
      return repo
    },
  })

  await system.timer.syncReservationState(RES_ID, storedRow(system.store), { onStateChange: true })
  const result = await system.timer.checkExpiration()

  assertEqual(result.expired.length, 0, 'a failure must never be reported as expired')
  assertEqual(result.failed.length, 1, 'the failure must be reported')
  assertEqual(result.failed[0].retryable, true, 'the failure must be marked retryable')
  assert(
    String(result.failed[0].error).includes('release rejected by storage'),
    'the reason must be reported'
  )
  assertEqual(storedStatus(system.store), RESERVATION_STATUS.REQUESTED, 'the status must not move')
  assertEqual(reservedCounts(system.store), '1,1', 'nothing may be released')
  assertEqual(
    countEvents(system.events, RESERVATION_EVENTS.EXPIRED),
    0,
    'no expiration success may be emitted'
  )

  const retained = system.timer.getTimer(RES_ID, RESERVATION_STATUS.REQUESTED)
  assert(retained, 'the timer must be retained for an explicit retry')
  assertEqual(retained.failedAttempts, 1, 'the failed attempt must be recorded')
  assert(
    jobFor(system.scheduler, RES_ID, RESERVATION_STATUS.REQUESTED),
    'the job must remain available'
  )

  fail = false
  const retry = await system.timer.retryTimer(RES_ID, RESERVATION_STATUS.REQUESTED)
  assertEqual(retry.status, 'expired', 'the retry must succeed once storage recovers')
  assertEqual(storedStatus(system.store), RESERVATION_STATUS.EXPIRED, 'the retry must land the expiration')
  assertEqual(reservedCounts(system.store), '0,0', 'the retry must release the capacity')
  assertEqual(
    countEvents(system.events, RESERVATION_EVENTS.EXPIRED),
    1,
    'the retry must emit exactly one success'
  )
})

await test('a release failure on the scheduled path fails the job instead of completing it', async () => {
  const system = await makeSystem({
    rows: [reservationRow({ hoursOld: 13 })],
    repoWrapper: (repo) => {
      repo.expireReservationWithRelease = async () => {
        throw new Error('release rejected by storage')
      }
      return repo
    },
  })
  await system.timer.syncReservationState(RES_ID, storedRow(system.store), { onStateChange: true })
  const job = jobFor(system.scheduler, RES_ID, RESERVATION_STATUS.REQUESTED)

  const outcome = await runViaManager(system.scheduler, job.id)
  assertEqual(outcome.success, false, 'a real failure must not be reported as a completed job')
  assert(
    String(outcome.result).includes('release rejected by storage'),
    'the failure must reach the scheduler'
  )
  assertEqual(storedStatus(system.store), RESERVATION_STATUS.REQUESTED, 'the status must not move')
  assertEqual(reservedCounts(system.store), '1,1', 'nothing may be released')
})

// ---------------------------------------------------------------------------
// 9. Lifecycle wiring on the real manager entry paths
// ---------------------------------------------------------------------------

console.log('\nlifecycle wiring:')

await test('cancelling a requested reservation cancels its job', async () => {
  const system = await makeSystem({ rows: [] })
  const created = await createRequest(system.manager)
  const job = jobFor(system.scheduler, created.reservationId, RESERVATION_STATUS.REQUESTED)

  const result = await system.manager.cancelReservation(created.reservationId, 'guest changed their mind')
  assertEqual(result.success, true, 'the cancellation must succeed')
  assertEqual(
    system.scheduler.manager.getJob(job.id).status,
    'cancelled',
    'the requested job must be cancelled'
  )
  assertEqual(system.timer.getActiveTimers().length, 0, 'no timer may remain armed')
})

await test('rejecting an owner_pending reservation drops its timer', async () => {
  const system = await makeSystem({ rows: [] })
  const created = await createRequest(system.manager)
  await system.manager.requestOwnerConfirmation(created.reservationId)
  const job = jobFor(system.scheduler, created.reservationId, RESERVATION_STATUS.OWNER_PENDING)

  const result = await system.manager.rejectReservation(created.reservationId, 'not available')
  assertEqual(result.success, true, 'the rejection must succeed')
  assertEqual(
    system.scheduler.manager.getJob(job.id).status,
    'cancelled',
    'the owner_pending job must be cancelled'
  )
  assertEqual(system.timer.getActiveTimers().length, 0, 'no timer may remain armed')
})

await test('an identity-carrying caller arms the same timer as the owner path', async () => {
  const system = await makeSystem({ rows: [] })

  const owner = await system.manager.createRequest(requestPayload())
  assertEqual(owner.timer.status, 'armed', 'the owner path must arm the timer')

  const withIdentity = await system.manager.createRequest(requestPayload(), { id: 'user-1' })
  assertEqual(withIdentity.success, true, 'the identity-carrying call must succeed')
  assertEqual(
    withIdentity.timer.status,
    'armed',
    'the timer must be armed from the manager, not only from a wrapper'
  )
  assertEqual(
    expirationJobs(system.scheduler).length,
    2,
    'both reservations must have their own queued job'
  )
})

await test('a raw patch that changes status reconciles the timers', async () => {
  const system = await makeSystem({ rows: [] })
  const created = await createRequest(system.manager)
  const job = jobFor(system.scheduler, created.reservationId, RESERVATION_STATUS.REQUESTED)

  const result = await system.manager.updateReservation(created.reservationId, {
    status: RESERVATION_STATUS.CONFIRMED,
  })
  assertEqual(result.success, true, 'the patch must succeed')
  assertEqual(
    storedStatus(system.store, created.reservationId),
    RESERVATION_STATUS.CONFIRMED,
    'the patched status must be stored'
  )
  assertEqual(
    system.scheduler.manager.getJob(job.id).status,
    'cancelled',
    'the stale requested job must be cancelled'
  )
  assertEqual(system.timer.getActiveTimers().length, 0, 'a confirmed reservation must have no timer')
})

await test('a raw patch that does not touch status keeps the deadline', async () => {
  const system = await makeSystem({ rows: [] })
  const created = await createRequest(system.manager)
  const before = system.timer.getTimer(created.reservationId, RESERVATION_STATUS.REQUESTED).expiresAt

  await system.manager.updateReservation(created.reservationId, { notes: 'late arrival' })
  const after = system.timer.getTimer(created.reservationId, RESERVATION_STATUS.REQUESTED)

  assert(after, 'the timer must still be armed')
  assertEqual(after.expiresAt, before, 'an unrelated write must not restart the deadline')
})

await test('a reservation that moved on is never expired by its old timer', async () => {
  const system = await makeSystem({ rows: [reservationRow({ hoursOld: 13 })] })
  await system.timer.syncReservationState(RES_ID, storedRow(system.store), { onStateChange: true })
  const job = jobFor(system.scheduler, RES_ID, RESERVATION_STATUS.REQUESTED)

  // Confirmed out of band while the job is still queued.
  system.store.get(RES_TABLE).set(RES_ID, { ...storedRow(system.store), status: RESERVATION_STATUS.CONFIRMED })

  const outcome = await runViaManager(system.scheduler, job.id)
  assertEqual(outcome.success, true, `the job must complete as a no-op: ${JSON.stringify(outcome)}`)
  assertEqual(
    storedStatus(system.store),
    RESERVATION_STATUS.CONFIRMED,
    'the moved-on status must stand'
  )
  assertEqual(reservedCounts(system.store), '1,1', 'nothing may be released')
})

await test('deleting a reservation drops its timer', async () => {
  const { manager, timer, scheduler, store } = await makeSystem()
  await timer.syncReservationState(RES_ID, storedRow(store), { onStateChange: true })
  const job = jobFor(scheduler, RES_ID, RESERVATION_STATUS.REQUESTED)

  await manager.deleteReservation(RES_ID)
  assertEqual(
    scheduler.manager.getJob(job.id).status,
    'cancelled',
    'the job must be cancelled'
  )
  assertEqual(timer.getActiveTimers().length, 0, 'no timer may remain armed for a deleted reservation')
})

// ---------------------------------------------------------------------------
// 10. Lifecycle cleanup is instance-scoped
// ---------------------------------------------------------------------------

console.log('\ncleanup:')

await test('deactivate cancels this instance jobs and makes them inert', async () => {
  const { timer, scheduler, store } = await makeSystem({ rows: [reservationRow({ hoursOld: 13 })] })
  await timer.syncReservationState(RES_ID, storedRow(store), { onStateChange: true })
  const job = jobFor(scheduler, RES_ID, RESERVATION_STATUS.REQUESTED)

  const result = await timer.deactivate()
  assertEqual(result.cancelled.length, 1, 'the queued job must be cancelled')
  assertEqual(
    scheduler.manager.getJob(job.id).status,
    'cancelled',
    'the scheduler must agree it is cancelled'
  )

  const outcome = await runViaManager(scheduler, job.id)
  assertEqual(outcome.success, true, 'a deactivated handler must not throw')
  assertEqual(
    storedStatus(store),
    RESERVATION_STATUS.REQUESTED,
    'a deactivated timer must not expire anything'
  )
})

await test("destroying one instance leaves another instance's timers working", async () => {
  const system = await makeSystem({
    rows: [reservationRow({ id: RES_ID, hoursOld: 13 }), reservationRow({ id: OTHER_ID, hoursOld: 13 })],
  })
  const second = await attachSecondInstance(system)

  await system.timer.syncReservationState(RES_ID, storedRow(system.store, RES_ID), { onStateChange: true })
  await second.timer.syncReservationState(OTHER_ID, storedRow(system.store, OTHER_ID), { onStateChange: true })

  await system.timer.destroy()

  const jobB = jobFor(system.scheduler, OTHER_ID, RESERVATION_STATUS.REQUESTED)
  assertEqual(jobB.status, 'pending', "the other instance's job must be untouched")

  const outcome = await runViaManager(system.scheduler, jobB.id)
  assertEqual(outcome.success, true, "the other instance's handler must still run")
  assertEqual(
    storedStatus(system.store, OTHER_ID),
    RESERVATION_STATUS.EXPIRED,
    "the other instance's timer must still work"
  )
  assertEqual(
    storedStatus(system.store, RES_ID),
    RESERVATION_STATUS.REQUESTED,
    "the destroyed instance's reservation must be untouched"
  )
})

await test('destroying removes only this instance handler registration', async () => {
  const system = await makeSystem({ rows: [] })
  const second = await attachSecondInstance(system)
  const firstHandler = system.timer.handlerName

  await system.timer.destroy()

  const gone = await system.scheduler.executor.execute({
    id: 'probe-after-destroy',
    handler: firstHandler,
    status: 'pending',
    payload: {},
  })
  assertEqual(gone.success, false, 'the destroyed instance handler must be gone')

  const alive = await system.scheduler.executor.execute({
    id: 'probe-other-instance',
    handler: second.timer.handlerName,
    status: 'pending',
    payload: {},
  })
  assertEqual(alive.success, true, "the other instance's handler must be untouched")
})

// ---------------------------------------------------------------------------
// 11. The scheduler cancellation defect this slice had to fix
// ---------------------------------------------------------------------------

console.log('\nscheduler capability:')

await test('cancelling marks the stored job cancelled so a tick does not run it', async () => {
  const scheduler = await schedulerCapabilityFor(dataManagerDouble(), { emit: () => {} })
  const scheduled = await scheduler.schedule({
    type: 'delayed',
    id: 'job-x',
    handler: 'noop',
    payload: {},
    delayMs: 60000,
  })
  assertEqual(scheduled.success, true, 'the job must be schedulable')

  const ran = []
  scheduler.registerHandler('noop', () => ran.push(true))

  const cancelled = await scheduler.cancel('job-x')
  assertEqual(cancelled.success, true, 'the cancellation must be reported')
  assertEqual(
    scheduler.manager.getJob('job-x').status,
    'cancelled',
    'the stored job must be cancelled, not left pending'
  )

  scheduler.manager.tick()
  await drain()
  assertEqual(ran.length, 0, 'a cancelled job must not run on the next tick')
})

await test('unregisterHandler removes the registration from both registries', async () => {
  const scheduler = await schedulerCapabilityFor(dataManagerDouble(), { emit: () => {} })
  scheduler.registerHandler('probe', () => 'ok')
  assertEqual(scheduler.unregisterHandler('probe').success, true, 'the removal must be reported')

  const outcome = await scheduler.executor.execute({
    id: 'job-y',
    handler: 'probe',
    status: 'pending',
    payload: {},
  })
  assertEqual(outcome.success, false, 'an unregistered handler must not run')
  assert(String(outcome.error).includes('Handler not found'), 'the executor must say the handler is gone')
})

// ---------------------------------------------------------------------------
// 12. Review regressions — in-flight arming ownership
//
// Every test here suspends the real code at a real `await` (the scheduler's
// `schedule()`, the repository's read) with a deferred promise, so the ordering
// being proved is the production ordering, not a simulation of it. The deferred
// gate is the ONLY thing doubled: scheduling, cancelling, running and the
// executor behind them are all real.
// ---------------------------------------------------------------------------

console.log('\narming ownership:')

/** A promise whose settlement the test controls. */
function deferred() {
  let resolve
  let reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

/**
 * The REAL scheduler capability, with its FIRST `schedule()` suspended until the
 * returned gate is released. Everything else — `cancel`, `getJobs`, `manager.run`,
 * `executor.execute` — is the real object, reached through delegating accessors
 * rather than a subclass, because the capability keeps its state in private
 * fields that only the real class may touch.
 */
async function schedulerPausedOnFirstSchedule(dataManager) {
  const real = await schedulerCapabilityFor(dataManager, { emit: () => {} })
  const gate = deferred()
  const entered = deferred()
  let paused = false

  const pausedCapability = {
    get manager() {
      return real.manager
    },
    get executor() {
      return real.executor
    },
    get handlerNames() {
      return real.handlerNames
    },
    schedule: async (def) => {
      if (!paused) {
        paused = true
        entered.resolve(true)
        await gate.promise
      }
      return real.schedule(def)
    },
    cancel: (jobId) => real.cancel(jobId),
    getJobs: () => real.getJobs(),
    remove: (jobId) => real.remove(jobId),
    registerHandler: (name, fn) => real.registerHandler(name, fn),
    unregisterHandler: (name) => real.unregisterHandler(name),
  }

  return { scheduler: pausedCapability, real, entered, release: () => gate.resolve(true) }
}

/** Every stored expiration job, whatever its status. */
const allExpirationJobs = (scheduler) => expirationJobs(scheduler)

/** The only non-cancelled expiration job for one reservation and state. */
const liveJobFor = (scheduler, reservationId, status) =>
  allExpirationJobs(scheduler).find(
    (j) =>
      j.status === 'pending' &&
      j.payload?.reservationId === reservationId &&
      j.payload?.expectedStatus === status
  ) || null

await test('a stop while the arming is still awaiting the scheduler wins', async () => {
  const paused = await schedulerPausedOnFirstSchedule(dataManagerDouble())
  const system = await makeSystem({ schedulerOverride: paused.scheduler })

  const arming = system.timer.syncReservationState(RES_ID, storedRow(system.store), {
    onStateChange: true,
  })
  await paused.entered.promise

  const stopped = await system.timer.stopTimer(RES_ID, RESERVATION_STATUS.REQUESTED)
  assertEqual(
    stopped.status,
    'skipped',
    `the stop had no published timer to cancel, and must say so: ${JSON.stringify(stopped)}`
  )
  assertEqual(stopped.reason, 'no_timer', 'nothing was published yet, so nothing could be cancelled')

  paused.release()
  const outcome = await arming

  assertEqual(outcome.status, 'skipped', `the obsolete arming must be discarded: ${JSON.stringify(outcome)}`)
  assertEqual(
    system.timer.getActiveTimers().length,
    0,
    'an arming stopped mid-flight must not publish a timer'
  )
  const queued = allExpirationJobs(paused.scheduler).filter(
    (j) => j.payload?.reservationId === RES_ID
  )
  for (const job of queued) {
    assertEqual(job.status, 'cancelled', `the job it queued must be withdrawn: ${job.id}`)
  }
})

await test('an arming stopped mid-flight cannot expire anything when its job is delivered', async () => {
  const paused = await schedulerPausedOnFirstSchedule(dataManagerDouble())
  const system = await makeSystem({
    rows: [reservationRow({ hoursOld: 13 })],
    schedulerOverride: paused.scheduler,
  })

  const arming = system.timer.syncReservationState(RES_ID, storedRow(system.store), {
    onStateChange: true,
  })
  await paused.entered.promise
  await system.timer.stopTimer(RES_ID, RESERVATION_STATUS.REQUESTED)
  paused.release()
  await arming

  const queued = allExpirationJobs(paused.scheduler).filter(
    (j) => j.payload?.reservationId === RES_ID
  )
  assertEqual(queued.length, 1, 'the scheduler must have accepted the job before it was withdrawn')

  const outcome = await runViaManager(paused.scheduler, queued[0].id)
  assertEqual(outcome.success, true, `the withdrawn delivery must be a no-op: ${JSON.stringify(outcome)}`)
  assertEqual(
    storedStatus(system.store),
    RESERVATION_STATUS.REQUESTED,
    'a stopped mid-flight arming must never expire its reservation'
  )
  assertEqual(reservedCounts(system.store), '1,1', 'no capacity may be released')
})

await test('deactivating mid-arming prevents the arming from publishing', async () => {
  const paused = await schedulerPausedOnFirstSchedule(dataManagerDouble())
  const system = await makeSystem({ schedulerOverride: paused.scheduler })

  const arming = system.timer.syncReservationState(RES_ID, storedRow(system.store), {
    onStateChange: true,
  })
  await paused.entered.promise
  await system.timer.deactivate()
  paused.release()
  const outcome = await arming

  assertEqual(outcome.status, 'skipped', 'the arming must be discarded')
  assertEqual(system.timer.getActiveTimers().length, 0, 'a deactivated instance must arm nothing')
})

await test('destroying mid-arming prevents the arming from publishing', async () => {
  const paused = await schedulerPausedOnFirstSchedule(dataManagerDouble())
  const system = await makeSystem({ schedulerOverride: paused.scheduler })

  const arming = system.timer.syncReservationState(RES_ID, storedRow(system.store), {
    onStateChange: true,
  })
  await paused.entered.promise
  await system.timer.destroy()
  paused.release()
  const outcome = await arming

  assertEqual(outcome.status, 'skipped', 'the arming must be discarded')
  assertEqual(system.timer.getActiveTimers().length, 0, 'a destroyed instance must arm nothing')
})

await test('a newer arming for the same key wins over the one already awaiting the scheduler', async () => {
  const paused = await schedulerPausedOnFirstSchedule(dataManagerDouble())
  const system = await makeSystem({ schedulerOverride: paused.scheduler })

  const older = system.timer.syncReservationState(RES_ID, storedRow(system.store), {
    onStateChange: true,
  })
  await paused.entered.promise

  const newer = await system.timer.syncReservationState(RES_ID, storedRow(system.store), {
    onStateChange: true,
  })
  paused.release()
  const olderOutcome = await older

  assertEqual(olderOutcome.status, 'skipped', 'the superseded arming must be discarded')
  assertEqual(newer.status, 'armed', `the newer arming must be armed: ${JSON.stringify(newer)}`)
  assertEqual(
    system.timer.getActiveTimers().length,
    1,
    'exactly one timer may own the key afterwards'
  )

  const live = liveJobFor(paused.scheduler, RES_ID, RESERVATION_STATUS.REQUESTED)
  assert(live, 'the surviving arming must own the only live job')
  assertEqual(live.id, newer.jobId, 'the live job must be the newer arming job')
  const withdrawn = allExpirationJobs(paused.scheduler).filter((j) => j.id !== newer.jobId)
  for (const job of withdrawn) {
    assertEqual(job.status, 'cancelled', 'only the superseded arming own job may be withdrawn')
  }
})

await test('a state change while the arming is in flight does not arm the new state', async () => {
  const paused = await schedulerPausedOnFirstSchedule(dataManagerDouble())
  const system = await makeSystem({ schedulerOverride: paused.scheduler })

  const arming = system.timer.syncReservationState(RES_ID, storedRow(system.store), {
    onStateChange: true,
  })
  await paused.entered.promise

  // The approved `owner_pending` entry replaces `requested` while the arming is
  // suspended. Only the requested arming exists, so nothing can stop it by state.
  await system.manager.requestOwnerConfirmation(RES_ID)

  paused.release()
  await arming

  const requested = liveJobFor(paused.scheduler, RES_ID, RESERVATION_STATUS.REQUESTED)
  assertEqual(requested, null, 'the stale requested arming must not survive the state change')
})

// ---------------------------------------------------------------------------
// 13. Review regressions — the shared admission guard and the ownership token
// ---------------------------------------------------------------------------

console.log('\nadmission and ownership:')

await test('the manager re-checks timer ownership immediately before the write', async () => {
  const held = deferred()
  const read = deferred()
  let writes = 0

  const system = await makeSystem({
    rows: [reservationRow({ hoursOld: 13 })],
    repoWrapper: (repo) =>
      new Proxy(repo, {
        get(target, prop) {
          if (prop === 'expireReservationWithRelease') {
            return async (...args) => {
              writes += 1
              return target.expireReservationWithRelease(...args)
            }
          }
          if (prop === 'findById') {
            return async (id) => {
              // The manager is inside its own asynchronous pre-write phase here.
              held.resolve(true)
              await read.promise
              return target.findById(id)
            }
          }
          const value = target[prop]
          return typeof value === 'function' ? value.bind(target) : value
        },
      }),
  })

  await system.timer.syncReservationState(RES_ID, storedRow(system.store), {
    onStateChange: true,
  })
  const job = jobFor(system.scheduler, RES_ID, RESERVATION_STATUS.REQUESTED)

  const delivery = runViaManager(system.scheduler, job.id)
  await held.promise

  // The timer is stopped while the attempt is suspended inside the manager, so
  // `expectedStatus` alone can no longer distinguish the two attempts.
  await system.timer.stopTimer(RES_ID, RESERVATION_STATUS.REQUESTED)
  read.resolve(true)

  const outcome = await delivery
  assertEqual(writes, 0, 'an attempt that lost its timer must not reach the repository write')
  assertEqual(
    storedStatus(system.store),
    RESERVATION_STATUS.REQUESTED,
    'the reservation must be untouched'
  )
  assertEqual(outcome.success, true, `the job must complete as a no-op: ${JSON.stringify(outcome)}`)
})

await test('an ownership token from another reservation or state is refused', async () => {
  const system = await makeSystem({ rows: [reservationRow({ hoursOld: 13 })] })
  await system.timer.syncReservationState(RES_ID, storedRow(system.store), {
    onStateChange: true,
  })

  const refusedWrongReservation = await system.manager.expireReservationFromTimer(RES_ID, RESERVATION_STATUS.REQUESTED, {
    ownership: { reservationId: OTHER_ID, expectedStatus: RESERVATION_STATUS.REQUESTED, isCurrent: () => true },
  })
  assertEqual(refusedWrongReservation.reason, 'timer_invalidated', 'the wrong reservation must be refused')
  assertEqual(
    storedStatus(system.store),
    RESERVATION_STATUS.REQUESTED,
    'a refused attempt must write nothing'
  )

  const refusedWrongState = await system.manager.expireReservationFromTimer(RES_ID, RESERVATION_STATUS.REQUESTED, {
    ownership: {
      reservationId: RES_ID,
      expectedStatus: RESERVATION_STATUS.OWNER_PENDING,
      isCurrent: () => true,
    },
  })
  assertEqual(refusedWrongState.reason, 'timer_invalidated', 'the wrong state must be refused')

  const refusedDeadToken = await system.manager.expireReservationFromTimer(RES_ID, RESERVATION_STATUS.REQUESTED, {
    ownership: {
      reservationId: RES_ID,
      expectedStatus: RESERVATION_STATUS.REQUESTED,
      isCurrent: () => false,
    },
  })
  assertEqual(refusedDeadToken.reason, 'timer_invalidated', 'a token that is no longer current must be refused')
  assertEqual(
    storedStatus(system.store),
    RESERVATION_STATUS.REQUESTED,
    'nothing may be expired by any refused attempt'
  )
  assertEqual(reservedCounts(system.store), '1,1', 'no capacity may be released by a refused attempt')
})

await test('an explicit retry cannot double-expire an attempt that is already in flight', async () => {
  const held = deferred()
  const read = deferred()
  let writes = 0

  const system = await makeSystem({
    rows: [reservationRow({ hoursOld: 13 })],
    repoWrapper: (repo) =>
      new Proxy(repo, {
        get(target, prop) {
          if (prop === 'expireReservationWithRelease') {
            return async (...args) => {
              writes += 1
              return target.expireReservationWithRelease(...args)
            }
          }
          if (prop === 'findById') {
            return async (id) => {
              if (held.settled !== true) {
                held.settled = true
                held.resolve(true)
                await read.promise
              }
              return target.findById(id)
            }
          }
          const value = target[prop]
          return typeof value === 'function' ? value.bind(target) : value
        },
      }),
  })

  await system.timer.syncReservationState(RES_ID, storedRow(system.store), {
    onStateChange: true,
  })
  const job = jobFor(system.scheduler, RES_ID, RESERVATION_STATUS.REQUESTED)

  const delivery = runViaManager(system.scheduler, job.id)
  await held.promise

  const retry = await system.timer.retryTimer(RES_ID, RESERVATION_STATUS.REQUESTED)
  assertEqual(retry.status, 'skipped', `the overlapping retry must be refused: ${JSON.stringify(retry)}`)
  assert(
    String(retry.reason).startsWith('already_in_flight'),
    `the refusal must name the in-flight attempt: ${JSON.stringify(retry)}`
  )

  const sweep = await system.timer.checkExpiration()
  assertEqual(sweep.skipped.length, 1, 'the sweep must skip the in-flight record')
  assertEqual(sweep.expired.length, 0, 'the sweep must not start a second attempt')

  read.resolve(true)
  const outcome = await delivery

  assertEqual(writes, 1, 'exactly one write may be submitted for one state')
  assertEqual(outcome.success, true, 'the single attempt must complete')
  assertEqual(storedStatus(system.store), RESERVATION_STATUS.EXPIRED, 'the reservation must be expired once')
})

// ---------------------------------------------------------------------------
// 14. Review regressions — timers are reconciled before fallible side effects
// ---------------------------------------------------------------------------

console.log('\nsync ordering:')

await test('a throwing communication send cannot leave a committed owner_pending without its timer', async () => {
  const system = await makeSystem({
    rows: [],
    communicationOverride: {
      send: async () => {
        throw new Error('communication transport is down')
      },
    },
  })

  const created = await createRequest(system.manager)
  const reservationId = created.reservationId

  // `communication.send` is the fallible step that runs AFTER the owner_pending
  // write. Its failure must propagate and must not undo the reconciliation.
  await assertRejects(
    () => system.manager.requestOwnerConfirmation(reservationId),
    'communication transport is down',
    'the side-effect failure must still propagate'
  )

  assertEqual(
    storedStatus(system.store, reservationId),
    RESERVATION_STATUS.OWNER_PENDING,
    'the write must stand'
  )
  const armed = system.timer.getActiveTimers().filter((t) => t.reservationId === reservationId)
  assertEqual(
    armed.map((t) => t.expectedStatus).join(','),
    RESERVATION_STATUS.OWNER_PENDING,
    'the owner_pending deadline must be armed and the requested one dropped'
  )
  assertEqual(
    liveJobFor(system.scheduler, reservationId, RESERVATION_STATUS.REQUESTED),
    null,
    'the obsolete requested job must not remain pending'
  )
  assert(
    liveJobFor(system.scheduler, reservationId, RESERVATION_STATUS.OWNER_PENDING),
    'the owner_pending deadline must be backed by a queued job'
  )
})

await test('a throwing event subscriber cannot leave a committed owner_pending without its timer', async () => {
  const system = await makeSystem({ rows: [], withNotifications: false })
  const created = await createRequest(system.manager)
  const reservationId = created.reservationId
  assertEqual(
    storedStatus(system.store, reservationId),
    RESERVATION_STATUS.REQUESTED,
    'the request must be committed'
  )

  // The owner_requested emit is the last fallible step, after the write and the sync.
  system.context.eventBus = {
    emit: (event, data) => {
      system.events.push({ event, data })
      if (event === RESERVATION_EVENTS.OWNER_REQUESTED) throw new Error('subscriber blew up')
    },
  }

  await assertRejects(
    () => system.manager.requestOwnerConfirmation(reservationId),
    'subscriber blew up',
    'the subscriber failure must propagate'
  )

  assertEqual(
    storedStatus(system.store, reservationId),
    RESERVATION_STATUS.OWNER_PENDING,
    'the write must stand'
  )
  const armed = system.timer.getActiveTimers().filter((t) => t.reservationId === reservationId)
  assertEqual(
    armed.map((t) => t.expectedStatus).join(','),
    RESERVATION_STATUS.OWNER_PENDING,
    'the owner_pending deadline must be armed and the requested one dropped'
  )
})

await test('restoring an archived reservation reports its timer outcome instead of discarding it', async () => {
  const system = await makeSystem({
    rows: [reservationRow({ status: RESERVATION_STATUS.ARCHIVED, hoursOld: 26 })],
  })
  system.store.get(RES_TABLE).set(RES_ID, {
    ...storedRow(system.store),
    previousStatus: RESERVATION_STATUS.OWNER_PENDING,
  })

  const restored = await system.manager.restoreReservation(RES_ID)
  assertEqual(restored.success, true, 'the restore must succeed')
  assert(restored.timer, `the timer outcome must be returned: ${JSON.stringify(restored)}`)
  assertEqual(
    storedStatus(system.store),
    RESERVATION_STATUS.OWNER_PENDING,
    'the reservation must be restored to its previous state'
  )
})

// ---------------------------------------------------------------------------
// 15. Review regressions — an early delivery keeps the scheduled execution
// ---------------------------------------------------------------------------

console.log('\nearly delivery:')

await test('a delivery before the deadline leaves the job pending at its original runAt', async () => {
  const system = await makeSystem({ rows: [reservationRow({ hoursOld: 0 })] })
  await system.timer.syncReservationState(RES_ID, storedRow(system.store), { onStateChange: true })
  const job = jobFor(system.scheduler, RES_ID, RESERVATION_STATUS.REQUESTED)
  const runAtBefore = job.runAt

  const outcome = await runViaManager(system.scheduler, job.id)

  assertEqual(outcome.success, true, `the early delivery must be a clean skip: ${JSON.stringify(outcome)}`)
  assertEqual(outcome.result.status, 'requeued', 'the delivery must ask to be requeued')

  const after = system.scheduler.manager.getJob(job.id)
  assertEqual(after.status, 'pending', 'the job must still be pending afterwards')
  assertEqual(after.runAt, runAtBefore, 'the original deadline must be preserved')
  assertEqual(
    storedStatus(system.store),
    RESERVATION_STATUS.REQUESTED,
    'an early delivery must expire nothing'
  )
  assertEqual(reservedCounts(system.store), '1,1', 'an early delivery must release nothing')
  assertEqual(system.timer.getActiveTimers().length, 1, 'the timer must still be armed')
})

await test('the deadline is numeric and exactly the configured timeout from the anchor', async () => {
  const system = await makeSystem({ rows: [reservationRow({ hoursOld: 5 })] })
  const armed = await system.timer.syncReservationState(RES_ID, storedRow(system.store), {
    onStateChange: true,
  })

  const record = system.timer.getActiveTimers()[0]
  assertEqual(typeof record.expiresAtMs, 'number', 'the armed record must expose a numeric deadline')
  assertEqual(
    record.expiresAtMs,
    Date.parse(record.anchorAt) + 12 * HOUR,
    'the numeric deadline must be the anchor plus the configured timeout'
  )
  assertEqual(armed.expiresAt, iso(record.expiresAtMs), 'the reported ISO deadline must agree with it')
})

await test('a stopped due job expires nothing while an untouched due job does', async () => {
  const system = await makeSystem({
    rows: [reservationRow({ id: RES_ID, hoursOld: 13 }), reservationRow({ id: OTHER_ID, hoursOld: 13 })],
  })

  await system.timer.syncReservationState(RES_ID, storedRow(system.store, RES_ID), { onStateChange: true })
  await system.timer.syncReservationState(OTHER_ID, storedRow(system.store, OTHER_ID), {
    onStateChange: true,
  })

  const stoppedJob = jobFor(system.scheduler, RES_ID, RESERVATION_STATUS.REQUESTED)
  const controlJob = jobFor(system.scheduler, OTHER_ID, RESERVATION_STATUS.REQUESTED)
  assert(stoppedJob && controlJob, 'both jobs must be queued')
  assertEqual(controlJob.status, 'pending', 'the control job must start pending')
  assertEqual(stoppedJob.status, 'pending', 'the stopped job must start pending')

  // Cancelled through the product API, which cancels the queued job AND drops the
  // timer that would otherwise let the job expire anything.
  await system.timer.stopTimer(RES_ID, RESERVATION_STATUS.REQUESTED)
  assertEqual(
    system.scheduler.manager.getJob(stoppedJob.id).status,
    'cancelled',
    'the stopped reservation own job must be cancelled'
  )

  // Both are due and both are delivered, which is what makes this a control: the
  // only difference between them is the cancellation.
  const stoppedOutcome = await runViaManager(system.scheduler, stoppedJob.id)
  const controlOutcome = await runViaManager(system.scheduler, controlJob.id)

  assertEqual(stoppedOutcome.success, true, `the cancelled delivery must be a no-op: ${JSON.stringify(stoppedOutcome)}`)
  assertEqual(controlOutcome.success, true, `the control delivery must succeed: ${JSON.stringify(controlOutcome)}`)
  assertEqual(
    storedStatus(system.store, RES_ID),
    RESERVATION_STATUS.REQUESTED,
    'the stopped reservation must not be expired'
  )
  assertEqual(
    storedStatus(system.store, OTHER_ID),
    RESERVATION_STATUS.EXPIRED,
    'the untouched due reservation must be expired'
  )
})

await test('the two other approved outcomes land with their own event and release', async () => {
  const system = await makeSystem({
    rows: [
      reservationRow({ id: RES_ID, status: RESERVATION_STATUS.OWNER_PENDING, hoursOld: 25 }),
      reservationRow({ id: OTHER_ID, status: RESERVATION_STATUS.PAYMENT_PENDING, hoursOld: 7 }),
    ],
  })

  await system.timer.syncReservationState(RES_ID, storedRow(system.store, RES_ID), {
    onStateChange: true,
  })
  await system.timer.syncReservationState(OTHER_ID, storedRow(system.store, OTHER_ID), {
    onStateChange: true,
  })

  await runViaManager(system.scheduler, jobFor(system.scheduler, RES_ID, RESERVATION_STATUS.OWNER_PENDING).id)
  await runViaManager(
    system.scheduler,
    jobFor(system.scheduler, OTHER_ID, RESERVATION_STATUS.PAYMENT_PENDING).id
  )

  assertEqual(
    storedStatus(system.store, RES_ID),
    RESERVATION_STATUS.NO_RESPONSE,
    'an unanswered owner_pending must become no_response'
  )
  assertEqual(
    storedStatus(system.store, OTHER_ID),
    RESERVATION_STATUS.EXPIRED,
    'an unpaid payment_pending must become expired'
  )
  assertEqual(countEvents(system.events, RESERVATION_EVENTS.NO_RESPONSE), 1, 'no_response must be emitted once')
  assertEqual(countEvents(system.events, RESERVATION_EVENTS.EXPIRED), 1, 'expired must be emitted once')
  assertEqual(reservedCounts(system.store), '0,0', 'both reservations must release their capacity')
})

// ---------------------------------------------------------------------------
// 16. Review regressions — tenant isolation with genuinely distinct contexts
// ---------------------------------------------------------------------------

console.log('\ntenant isolation:')

await test('two tenants share one scheduler and expire only their own reservations', async () => {
  const OTHER_TENANT = 'tenant-2'
  const store = seedStore({ rows: [] })

  // Two accommodations, one per tenant, so capacity never crosses between them.
  for (const [tenant, cabin] of [[TENANT, CABIN], [OTHER_TENANT, 'cab-2']]) {
    for (const date of DATES) {
      store.get(AVAIL_TABLE).set(`av-${cabin}-${date}`, {
        id: `av-${cabin}-${date}`,
        tenantId: tenant,
        accommodationId: cabin,
        date,
        inventory: 2,
        reservedCount: 1,
        available: 1,
        status: 'available',
        isBlocked: false,
      })
    }
  }

  const rows = [
    { ...reservationRow({ id: RES_ID, hoursOld: 13 }), tenantId: TENANT },
    {
      ...reservationRow({ id: OTHER_ID, hoursOld: 13, tenantId: OTHER_TENANT }),
      tenantId: OTHER_TENANT,
      accommodationId: 'cab-2',
    },
  ]
  for (const row of rows) store.get(RES_TABLE).set(row.id, row)
  for (const row of rows) {
    const line = recordedLine(row.id, `line-${row.id}`)
    line.tenantId = row.tenantId
    line.targetId = row.accommodationId
    store.get(LINE_TABLE).set(line.id, line)
  }

  const shared = await schedulerCapabilityFor(dataManagerDouble(), { emit: () => {} })

  const build = async (tenantId) => {
    const adapter = new InMemoryRepositoryAdapter({ name: 'mock' }, { entityName: RES_TABLE })
    const repo = new ReservationRepository(adapter, {
      tenant: { id: tenantId },
      capabilities: { get: () => new AvailabilityCapability() },
    })
    await repo.initialize()

    const dataManager = dataManagerDouble()
    const context = {
      tenant: { id: tenantId },
      config: { persistenceProvider: 'mock' },
      repositories: { reservation: repo },
      capabilities: { get: (id) => (id === 'scheduler' ? shared : null) },
      dataManager,
      runtime: null,
      eventBus: { emit: () => {} },
    }
    const manager = new ReservationManager(context)
    const timer = new ReservationTimer(context, { manager })
    await timer.activate()
    return { manager, timer }
  }

  const first = await build(TENANT)
  const second = await build(OTHER_TENANT)

  assert(first.timer.handlerName !== second.timer.handlerName, 'the two tenants must not share a handler name')

  await first.timer.syncReservationState(RES_ID, storedRow(store, RES_ID), { onStateChange: true })
  await second.timer.syncReservationState(OTHER_ID, storedRow(store, OTHER_ID), { onStateChange: true })

  const jobs = allExpirationJobs(shared)
  assertEqual(jobs.length, 2, 'both tenants must have queued on the one shared scheduler')
  assertEqual(
    new Set(jobs.map((j) => j.payload.tenantId)).size,
    2,
    'the shared scheduler must carry both tenants'
  )

  // Each tenant's repository is tenant-scoped: the other tenant's reservation is
  // simply not visible, which is what makes the isolation real rather than a
  // payload convention.
  const crossed = await second.manager.expireReservationFromTimer(RES_ID, RESERVATION_STATUS.REQUESTED)
  assertEqual(crossed.reason, 'not_found', `a cross-tenant read must find nothing: ${JSON.stringify(crossed)}`)
  assertEqual(
    storedStatus(store, RES_ID),
    RESERVATION_STATUS.REQUESTED,
    'a cross-tenant attempt must write nothing'
  )

  // A payload relabelled with the other tenant is refused by the handler.
  const foreign = await deliver(
    shared,
    first.timer.handlerName,
    { ...jobs[0].payload, tenantId: OTHER_TENANT },
    'probe-foreign-tenant'
  )
  assertEqual(foreign.reason, 'foreign_tenant', `a relabelled payload must be refused: ${JSON.stringify(foreign)}`)
  assertEqual(
    storedStatus(store, RES_ID),
    RESERVATION_STATUS.REQUESTED,
    'a relabelled payload must expire nothing'
  )

  const firstRun = await runViaManager(shared, jobFor(shared, RES_ID, RESERVATION_STATUS.REQUESTED).id)
  const secondRun = await runViaManager(shared, jobFor(shared, OTHER_ID, RESERVATION_STATUS.REQUESTED).id)
  assertEqual(firstRun.success, true, `tenant one's delivery must succeed: ${JSON.stringify(firstRun)}`)
  assertEqual(secondRun.success, true, `tenant two's delivery must succeed: ${JSON.stringify(secondRun)}`)

  assertEqual(storedStatus(store, RES_ID), RESERVATION_STATUS.EXPIRED, 'tenant one must expire its own reservation')
  assertEqual(
    storedStatus(store, OTHER_ID),
    RESERVATION_STATUS.EXPIRED,
    'tenant two must expire its own reservation'
  )
  assertEqual(
    store.get(AVAIL_TABLE).get(`av-${CABIN}-${START}`).reservedCount,
    0,
    "tenant one's own capacity must be released"
  )
  assertEqual(
    store.get(AVAIL_TABLE).get(`av-cab-2-${START}`).reservedCount,
    0,
    "tenant two's own capacity must be released"
  )
})

// ---------------------------------------------------------------------------
// 17. Review regressions — the real capability lifecycle
// ---------------------------------------------------------------------------

console.log('\ncapability lifecycle:')

await test('activation without a scheduler is reported instead of silently succeeding', async () => {
  const events = []
  const bus = eventBusDouble(events)
  const capability = new ReservationCapability()
  await capability.init(
    {
      tenant: { id: TENANT },
      config: { persistenceProvider: 'mock' },
      dataManager: dataManagerDouble(),
      eventBus: bus,
      // No scheduler capability: `capabilities.get('scheduler')` is null.
      capabilities: { get: () => null },
    },
    {}
  )

  await capability.activate()

  const activation = capability.timerActivation
  assert(activation, 'the timer activation outcome must be retained')
  assertEqual(activation.status, 'failed', 'the registration failure must be reported, not discarded')
  assert(
    String(activation.error).includes('not registered'),
    `the reason must name the missing registration: ${JSON.stringify(activation)}`
  )

  // Reported, not thrown: the rest of the capability still subscribes and works.
  assert(
    bus.subscriptions.includes(RESERVATION_EVENTS.EXPIRED) &&
      bus.subscriptions.includes(RESERVATION_EVENTS.NO_RESPONSE),
    `the capability must still subscribe its own listeners: ${JSON.stringify(bus.subscriptions)}`
  )
  assertEqual(events.length, 0, 'nothing may be emitted merely by activating')

  await capability.destroy()
})

await test('the real capability arms, delivers and stops its own deadlines', async () => {
  const store = seedStore({ rows: [reservationRow({ hoursOld: 13 })] })
  const adapter = new InMemoryRepositoryAdapter({ name: 'mock' }, { entityName: RES_TABLE })
  const repo = new ReservationRepository(adapter, {
    tenant: { id: TENANT },
    capabilities: { get: () => new AvailabilityCapability() },
  })
  await repo.initialize()

  const scheduler = await schedulerCapabilityFor(dataManagerDouble(), { emit: () => {} })
  const events = []
  const capability = new ReservationCapability()
  await capability.init(
    {
      tenant: { id: TENANT },
      config: { persistenceProvider: 'mock' },
      repositories: { reservation: repo },
      capabilities: { get: (id) => (id === 'scheduler' ? scheduler : null) },
      dataManager: dataManagerDouble(),
      runtime: null,
      eventBus: { ...eventBusDouble(), emit: (event, data) => events.push({ event, data }) },
    },
    {}
  )
  await capability.activate()

  assert(capability.timer, 'the capability must own a timer')
  await capability.timer.syncReservationState(RES_ID, storedRow(store), { onStateChange: true })

  const job = jobFor(scheduler, RES_ID, RESERVATION_STATUS.REQUESTED)
  assert(job, 'the capability must have queued a real job')

  const outcome = await runViaManager(scheduler, job.id)
  assertEqual(outcome.success, true, `the delivery must succeed: ${JSON.stringify(outcome)}`)
  assertEqual(storedStatus(store), RESERVATION_STATUS.EXPIRED, 'the capability must expire its reservation')
  assertEqual(countEvents(events, RESERVATION_EVENTS.EXPIRED), 1, 'the expiration event must be emitted once')

  await capability.deactivate()
  assertEqual(capability.timer.getActiveTimers().length, 0, 'deactivating must stop the timers')
  await capability.destroy()
})

await test('autoExpiration disabled arms nothing and leaves the reservation working', async () => {
  const system = await makeSystem({
    rows: [],
    tenantReservationConfig: { autoExpiration: false },
  })

  const created = await createRequest(system.manager)
  assertEqual(created.success, true, 'a disabled switch must not break the request')
  const reservationId = created.reservationId

  assertEqual(
    storedStatus(system.store, reservationId),
    RESERVATION_STATUS.REQUESTED,
    'the reservation must still be committed'
  )
  assertEqual(
    system.timer.getActiveTimers().filter((t) => t.reservationId === reservationId).length,
    0,
    'no deadline may be armed while the switch is off'
  )
  assertEqual(
    expirationJobs(system.scheduler).filter((j) => j.payload?.reservationId === reservationId).length,
    0,
    'no job may be queued while the switch is off'
  )
  assert(
    created.timer?.reason === 'auto_expiration_disabled',
    `the disabled switch must be reported: ${JSON.stringify(created.timer)}`
  )

  const approved = await system.manager.requestOwnerConfirmation(reservationId)
  assertEqual(approved.success, true, 'the reservation must remain fully usable')
  assertEqual(
    storedStatus(system.store, reservationId),
    RESERVATION_STATUS.OWNER_PENDING,
    'the approved state must be committed'
  )
})

// ---------------------------------------------------------------------------
// 18. Review regressions — operational failures reject, and a recorded line the
//     repository cannot release is refused rather than guessed
// ---------------------------------------------------------------------------

console.log('\nfailure semantics:')

/** Overwrite the seeded recorded line's shape, keeping the same line id. */
function rewriteLine(store, id, mutate) {
  const line = store.get(LINE_TABLE).get(`line-${id}`)
  store.get(LINE_TABLE).set(`line-${id}`, mutate({ ...line }))
  return store.get(LINE_TABLE).get(`line-${id}`)
}

for (const [label, mutate] of [
  [
    'a legacy line with no versioned consumption record',
    (line) => {
      delete line.metadata.__occupiedNights
      return line
    },
  ],
  [
    'a consumption record whose version this repository cannot release',
    (line) => {
      line.metadata.__occupiedNights = { version: 2, dates: [...DATES], quantity: 1 }
      return line
    },
  ],
  [
    'a consumption record with malformed dates',
    (line) => {
      line.metadata.__occupiedNights = { version: 1, dates: ['2026-13-45', 'soon'], quantity: 1 }
      return line
    },
  ],
  [
    'a malformed temporal range',
    (line) => {
      line.temporal = { mode: 'DATE_RANGE' }
      return line
    },
  ],
]) {
  await test(`${label} is refused instead of releasing guessed dates`, async () => {
    const system = await makeSystem({ rows: [reservationRow({ hoursOld: 13 })] })
    rewriteLine(system.store, RES_ID, mutate)

    await system.timer.syncReservationState(RES_ID, storedRow(system.store), { onStateChange: true })
    const job = jobFor(system.scheduler, RES_ID, RESERVATION_STATUS.REQUESTED)

    const outcome = await runViaManager(system.scheduler, job.id)

    assertEqual(
      outcome.success,
      false,
      `an unreleasable line must fail the job, not report success: ${JSON.stringify(outcome)}`
    )
    assertEqual(
      storedStatus(system.store),
      RESERVATION_STATUS.REQUESTED,
      'the reservation must be untouched when the release is refused'
    )
    assertEqual(reservedCounts(system.store), '1,1', 'no capacity may be invented or double-released')
    assertEqual(lineReleasedAt(system.store), null, 'the line must not be marked released')

    // The timer stays armed and observable, and the sweep reports the failure
    // rather than hiding it as a skip.
    const armed = system.timer.getActiveTimers().filter((t) => t.reservationId === RES_ID)
    assertEqual(armed.length, 1, 'the failed attempt must remain observable')
    assert(armed[0].lastError, 'the failure must be recorded on the timer')

    const sweep = await system.timer.checkExpiration()
    assertEqual(sweep.expired.length, 0, 'a refused release is never reported as expired')
    assertEqual(sweep.failed.length, 1, 'the sweep must report the operational failure')
    assertEqual(sweep.skipped.length, 0, 'an operational failure is not a benign skip')
  })
}

await test('a stale reservation is a skip while a broken release is a failure', async () => {
  const system = await makeSystem({ rows: [reservationRow({ hoursOld: 13 })] })
  await system.timer.syncReservationState(RES_ID, storedRow(system.store), { onStateChange: true })
  const job = jobFor(system.scheduler, RES_ID, RESERVATION_STATUS.REQUESTED)

  // Confirmed out of band: an intentional no-op, not a failure.
  system.store.get(RES_TABLE).set(RES_ID, {
    ...storedRow(system.store),
    status: RESERVATION_STATUS.CONFIRMED,
  })
  const staleOutcome = await runViaManager(system.scheduler, job.id)

  assertEqual(
    staleOutcome.success,
    true,
    `a stale delivery must resolve cleanly: ${JSON.stringify(staleOutcome)}`
  )
  assertEqual(
    system.scheduler.manager.getJob(job.id).status,
    'completed',
    'a stale delivery must not be reported as a failed job'
  )
  assertEqual(
    storedStatus(system.store),
    RESERVATION_STATUS.CONFIRMED,
    'the moved-on reservation must stand'
  )
})

// ---------------------------------------------------------------------------
// 19. Post-commit semantics — a side-effect failure is not a write failure
//
// Every case here has the SAME committed outcome: the write (and, for expiration,
// the capacity release) already happened before the fallible step ran. What is
// asserted is that the committed state is authoritative, that no timer or queued
// job survives, that no retryable expiration failure is retained, and that the
// original error is still observable.
// ---------------------------------------------------------------------------

console.log('\npost-commit side effects:')

/** An eventBus double that throws on one specific event. */
function throwingEventBus(system, throwingEvent) {
  return {
    emit: (event, data) => {
      system.events.push({ event, data })
      if (event === throwingEvent) throw new Error(`subscriber for ${event} blew up`)
    },
    on: () => () => {},
    off: () => {},
  }
}

/**
 * A notifications capability whose `send` always throws.
 *
 * `original` is the exact error instance, so a test can assert that the same
 * object survives all the way out to the caller.
 */
const throwsIn = (message) => {
  const original = new Error(message)
  return { send: async () => { throw original }, original }
}

await test('a CREATED subscriber that throws leaves the reservation persisted and its timer armed', async () => {
  const system = await makeSystem({ rows: [] })
  system.context.eventBus = throwingEventBus(system, RESERVATION_EVENTS.CREATED)

  await assertRejects(
    () => createRequest(system.manager),
    `subscriber for ${RESERVATION_EVENTS.CREATED} blew up`,
    'the original subscriber error must remain observable'
  )

  const reservationId = system.events.find((e) => e.event === RESERVATION_EVENTS.CREATED)?.data?.reservation?.id
  assert(reservationId, 'the created reservation must be identifiable')
  assertEqual(
    storedStatus(system.store, reservationId),
    RESERVATION_STATUS.REQUESTED,
    'the committed create must stand'
  )

  const armed = system.timer.getActiveTimers().filter((t) => t.reservationId === reservationId)
  assertEqual(armed.length, 1, 'the requested deadline must be armed despite the subscriber failure')
  assertEqual(armed[0].expectedStatus, RESERVATION_STATUS.REQUESTED, 'the armed deadline must be the requested one')
  assert(
    liveJobFor(system.scheduler, reservationId, RESERVATION_STATUS.REQUESTED),
    'the deadline must be backed by a queued job'
  )
})

await test('an expiration notification that throws is reported post-commit, not as a release failure', async () => {
  const system = await makeSystem({
    rows: [reservationRow({ hoursOld: 13 })],
    notificationsOverride: throwsIn('notification transport is down'),
  })
  await system.timer.syncReservationState(RES_ID, storedRow(system.store), { onStateChange: true })

  // Direct call: the classification itself.
  const result = await system.manager.expireReservationFromTimer(RES_ID, RESERVATION_STATUS.REQUESTED)

  assertEqual(result.success, true, 'the committed transition must be reported as a success')
  assertEqual(result.status, RESERVATION_STATUS.EXPIRED, 'the landed status must be reported')
  assertEqual(result.postCommit.status, 'failed', 'the post-commit failure must be reported')
  assertEqual(result.postCommit.phase, 'post_commit', 'it must be labelled post-commit')
  assertEqual(result.postCommit.retryable, false, 'a post-commit failure is not retryable')
  assertEqual(
    result.postCommit.error?.message,
    'notification transport is down',
    'the original error must be carried through unchanged'
  )
  assert(
    !String(result.reason || '').includes('manager'),
    `it must not be reported as a manager failure: ${JSON.stringify(result)}`
  )

  assertEqual(storedStatus(system.store), RESERVATION_STATUS.EXPIRED, 'the terminal state must stand')
  assertEqual(reservedCounts(system.store), '0,0', 'the released capacity must remain released')
  assertEqual(
    system.timer.getActiveTimers().filter((t) => t.reservationId === RES_ID).length,
    0,
    'no timer may remain armed for a committed terminal reservation'
  )
})

await test('the scheduled expiration fails as post-commit and keeps no retryable failure or armed job', async () => {
  const system = await makeSystem({
    rows: [reservationRow({ hoursOld: 13 })],
    notificationsOverride: throwsIn('notification transport is down'),
  })
  await system.timer.syncReservationState(RES_ID, storedRow(system.store), { onStateChange: true })
  const job = jobFor(system.scheduler, RES_ID, RESERVATION_STATUS.REQUESTED)

  const outcome = await runViaManager(system.scheduler, job.id)

  assertEqual(outcome.success, false, 'the scheduled job must still fail')
  assert(String(outcome.result).includes('post-commit'), `the failure must say what it is: ${outcome.result}`)
  assert(
    String(outcome.result).includes('notification transport is down'),
    'the original error must reach the job result'
  )
  assert(
    !String(outcome.result).includes('manager_threw'),
    `it must not be reported as a manager failure: ${outcome.result}`
  )

  // Committed outcome is authoritative.
  assertEqual(storedStatus(system.store), RESERVATION_STATUS.EXPIRED, 'the terminal state must stand')
  assertEqual(reservedCounts(system.store), '0,0', 'the release must stand')

  // Nothing is retained that could be retried.
  assertEqual(system.timer.getActiveTimers().length, 0, 'no timer may remain armed')
  assertEqual(liveJobFor(system.scheduler, RES_ID, RESERVATION_STATUS.REQUESTED), null, 'no live job may remain')
  assertEqual(
    system.scheduler.manager.getJob(job.id).status,
    'failed',
    'a committed post-commit failure must not be returned to pending for another attempt'
  )

  // Even a forced re-delivery is a no-op: the release is not repeated.
  const again = await runViaManager(system.scheduler, job.id)
  assertEqual(again.success, true, `a repeat delivery must be a clean no-op: ${JSON.stringify(again)}`)
  assertEqual(storedStatus(system.store), RESERVATION_STATUS.EXPIRED, 'the terminal state must still stand')
  assertEqual(reservedCounts(system.store), '0,0', 'capacity must never be released twice')
})

await test('an EXPIRED subscriber that throws keeps the same guarantees', async () => {
  const system = await makeSystem({ rows: [reservationRow({ hoursOld: 13 })] })
  await system.timer.syncReservationState(RES_ID, storedRow(system.store), { onStateChange: true })
  const job = jobFor(system.scheduler, RES_ID, RESERVATION_STATUS.REQUESTED)
  system.context.eventBus = throwingEventBus(system, RESERVATION_EVENTS.EXPIRED)

  const outcome = await runViaManager(system.scheduler, job.id)

  assertEqual(outcome.success, false, 'the scheduled job must still fail')
  assert(String(outcome.result).includes('post-commit'), `the failure must say what it is: ${outcome.result}`)
  assert(
    String(outcome.result).includes(`subscriber for ${RESERVATION_EVENTS.EXPIRED} blew up`),
    'the original subscriber error must reach the job result'
  )

  assertEqual(storedStatus(system.store), RESERVATION_STATUS.EXPIRED, 'the terminal state must stand')
  assertEqual(reservedCounts(system.store), '0,0', 'the release must stand')
  assertEqual(system.timer.getActiveTimers().length, 0, 'no timer may remain armed')
  assertEqual(liveJobFor(system.scheduler, RES_ID, RESERVATION_STATUS.REQUESTED), null, 'no live job may remain')
  assertEqual(
    system.scheduler.manager.getJob(job.id).status,
    'failed',
    'a committed post-commit failure must not be returned to pending for another attempt'
  )

  const again = await runViaManager(system.scheduler, job.id)
  assertEqual(again.success, true, 'a repeat delivery must be a clean no-op')
  assertEqual(reservedCounts(system.store), '0,0', 'capacity must never be released twice')
})

await test('a delete subscriber that throws leaves the timer and its job already removed', async () => {
  const system = await makeSystem({ rows: [reservationRow({ hoursOld: 13 })] })
  await system.timer.syncReservationState(RES_ID, storedRow(system.store), { onStateChange: true })
  const job = jobFor(system.scheduler, RES_ID, RESERVATION_STATUS.REQUESTED)
  system.context.eventBus = throwingEventBus(system, RESERVATION_EVENTS.UPDATED)

  await assertRejects(
    () => system.manager.deleteReservation(RES_ID),
    `subscriber for ${RESERVATION_EVENTS.UPDATED} blew up`,
    'the original subscriber error must remain observable'
  )

  assertEqual(storedRow(system.store), null, 'the committed deletion must stand')
  assertEqual(
    system.timer.getActiveTimers().filter((t) => t.reservationId === RES_ID).length,
    0,
    'no timer may remain armed for a deleted reservation'
  )
  assertEqual(
    system.scheduler.manager.getJob(job.id).status,
    'cancelled',
    'the queued job must already be cancelled before the subscriber ran'
  )

  // Nothing left to fire: the cancelled job cannot expire anything.
  const delivery = await runViaManager(system.scheduler, job.id)
  assertEqual(delivery.success, true, `the cancelled delivery must be a no-op: ${JSON.stringify(delivery)}`)
  assertEqual(storedRow(system.store), null, 'the deletion must still stand')
})

await test('failed persistence arms nothing on create and removes nothing on delete', async () => {
  // Create: the repository writes nothing, so nothing may be armed.
  const createSystem = await makeSystem({
    rows: [],
    repoWrapper: (repo) =>
      new Proxy(repo, {
        get(target, prop) {
          if (prop === 'createReservationWithLine') return async () => null
          const value = target[prop]
          return typeof value === 'function' ? value.bind(target) : value
        },
      }),
  })

  await assertRejects(
    () => createRequest(createSystem.manager),
    'was not persisted',
    'a create that was not persisted must still throw'
  )
  assertEqual(createSystem.timer.getActiveTimers().length, 0, 'an unpersisted request must arm nothing')
  assertEqual(expirationJobs(createSystem.scheduler).length, 0, 'an unpersisted request must queue no job')

  // Delete: the repository removes nothing, so the timer must be left armed.
  const deleteSystem = await makeSystem({
    rows: [reservationRow({ hoursOld: 13 })],
    repoWrapper: (repo) =>
      new Proxy(repo, {
        get(target, prop) {
          if (prop === 'delete') return async () => null
          const value = target[prop]
          return typeof value === 'function' ? value.bind(target) : value
        },
      }),
  })
  await deleteSystem.timer.syncReservationState(RES_ID, storedRow(deleteSystem.store), {
    onStateChange: true,
  })
  const job = jobFor(deleteSystem.scheduler, RES_ID, RESERVATION_STATUS.REQUESTED)

  await assertRejects(
    () => deleteSystem.manager.deleteReservation(RES_ID),
    'deletion did not persist',
    'a delete that was not persisted must throw'
  )

  assertEqual(
    storedStatus(deleteSystem.store),
    RESERVATION_STATUS.REQUESTED,
    'the reservation must still be there'
  )
  assertEqual(
    deleteSystem.timer.getActiveTimers().filter((t) => t.reservationId === RES_ID).length,
    1,
    'a reservation that was not deleted must keep its deadline'
  )
  assertEqual(
    deleteSystem.scheduler.manager.getJob(job.id).status,
    'pending',
    'its queued job must not be cancelled'
  )
  assertEqual(reservedCounts(deleteSystem.store), '1,1', 'capacity must remain held')
})

// ---------------------------------------------------------------------------
// 20. The sweep report keeps the thrown error's own classification
// ---------------------------------------------------------------------------

console.log('\nsweep report classification:')

await test('checkExpiration reports a post-commit notification failure as committed and non-retryable', async () => {
  const thrown = throwsIn('the post-commit notification failed', ['send'])
  const system = await makeSystem({
    rows: [reservationRow({ hoursOld: 13 })],
    notificationsOverride: thrown,
  })

  await system.timer.syncReservationState(RES_ID, storedRow(system.store), { onStateChange: true })
  const job = jobFor(system.scheduler, RES_ID, RESERVATION_STATUS.REQUESTED)
  const result = await system.timer.checkExpiration()

  assertEqual(result.expired.length, 0, 'the transition landed, so it is not reported as expired')
  assertEqual(result.failed.length, 1, 'the post-commit failure must be reported')
  const entry = result.failed[0]
  assertEqual(entry.reason, 'post_commit_failed', 'the reason must not be rewritten to a manager failure')
  assertEqual(entry.phase, 'post_commit', 'the phase must survive the report')
  assertEqual(entry.committed, true, 'the entry must say the transition and release committed')
  assertEqual(entry.retryable, false, 'a committed expiration must not be reported as retryable')
  assertEqual(
    entry.postCommitError,
    thrown.original,
    'the original side-effect error must remain available through postCommitError'
  )
  assert(
    String(entry.error).includes('the post-commit notification failed'),
    'the report must name the original failure'
  )

  // The committed transition and release stand.
  assertEqual(storedStatus(system.store), RESERVATION_STATUS.EXPIRED, 'the terminal state must stand')
  assertEqual(reservedCounts(system.store), '0,0', 'the release must stand')

  // Nothing survives that could be retried.
  assertEqual(system.timer.getActiveTimers().length, 0, 'no timer may remain armed')
  assertEqual(liveJobFor(system.scheduler, RES_ID, RESERVATION_STATUS.REQUESTED), null, 'no live job may remain')
  assertEqual(
    system.scheduler.manager.getJob(job.id).status,
    'cancelled',
    'the queued job must have been cancelled by the post-commit reconciliation'
  )

  const retry = await system.timer.retryTimer(RES_ID, RESERVATION_STATUS.REQUESTED)
  assertEqual(retry.reason, 'no_timer', 'a committed expiration must not be retryable')
  assertEqual(reservedCounts(system.store), '0,0', 'a retry must never release the capacity twice')
})

await test('checkExpiration keeps a pre-commit release failure retryable and its timer armed', async () => {
  const system = await makeSystem({
    rows: [reservationRow({ hoursOld: 13 })],
    repoWrapper: (repo) => {
      const original = repo.expireReservationWithRelease.bind(repo)
      repo.expireReservationWithRelease = async () => {
        throw new Error('release rejected by storage before the write')
      }
      return repo
    },
  })

  await system.timer.syncReservationState(RES_ID, storedRow(system.store), { onStateChange: true })
  const job = jobFor(system.scheduler, RES_ID, RESERVATION_STATUS.REQUESTED)
  const result = await system.timer.checkExpiration()

  assertEqual(result.failed.length, 1, 'the failure must be reported')
  const entry = result.failed[0]
  assertEqual(entry.retryable, true, 'a pre-commit failure must stay retryable')
  assertEqual(entry.committed, false, 'a pre-commit failure must not claim to have committed')
  assertEqual(entry.phase, null, 'a pre-commit failure has no post-commit phase')
  assertEqual(entry.postCommitError, null, 'a pre-commit failure carries no side-effect error')
  assertEqual(storedStatus(system.store), RESERVATION_STATUS.REQUESTED, 'the status must not move')
  assertEqual(reservedCounts(system.store), '1,1', 'nothing may be released')

  // The timer and its job stay, so an explicit retry remains possible.
  const retained = system.timer.getTimer(RES_ID, RESERVATION_STATUS.REQUESTED)
  assert(retained, 'a retryable failure must keep its timer record')
  assertEqual(retained.failedAttempts, 1, 'the failed attempt must be recorded')
  assertEqual(
    system.scheduler.manager.getJob(job.id).status,
    'pending',
    'a retryable failure must keep its queued job pending'
  )
})

// ---------------------------------------------------------------------------

console.log('')
console.log(`total: ${passed + failed}  passed: ${passed}  failed: ${failed}`)
if (failed > 0) {
  for (const { name, error } of failures) {
    console.log(
      `\n  ${name}\n    ${String(error?.stack || error)
        .split('\n')
        .slice(0, 6)
        .join('\n    ')}`
    )
  }
  process.exitCode = 1
}
