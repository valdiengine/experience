/**
 * BOOKING-EXPIRATION-RECOVERY-1 — restart recovery + commercial scheduler wiring
 *
 * Every test here runs against the REAL commercial wiring: `registerCapabilities()`
 * (runtime/startup/capability.bootstrap.js) with the writable in-memory repository
 * adapter. No bespoke context, no stubbed registry. That is deliberate — the slice
 * is precisely about the commercial runtime having no scheduler, and a test that
 * hand-assembles its own registry cannot see that.
 *
 * "Restart" is simulated honestly: every capability (and therefore every timer map
 * and every scheduler job) is deactivated and destroyed, and a fresh capability
 * context is built over the SAME repository store. The store is what survives a
 * restart; everything else is rebuilt. Nothing is re-seeded by hand after a restart,
 * so the state recovery reads is genuinely the state the previous process wrote.
 */
import { createTestBundle } from '../../tests/capability/capability.context.factory.js'
import { InMemoryRepositoryAdapter } from '../../tests/capability/capability.mock.repositories.js'
import { createReservationData } from '../../tests/fixtures/reservation.fixture.js'
import { dateOffset } from '../../tests/fixtures/availability.fixture.js'
import { COMMERCIAL_CAPABILITIES } from '../../runtime/startup/capability.bootstrap.js'
import { RESERVATION_STATUS } from './reservation.status.js'
import { ReservationTimer } from './reservation.timer.js'

/**
 * BOOKING-EXPIRATION-STAGE-1. The tenant this suite recovers under.
 *
 * This suite asserts that a PERSISTED tenant's reservations are reconstructed at
 * startup, so it must run under a persisted-tenant identity. It previously used
 * the shared `TEST_TENANT`, whose id is the literal string `commercial` - which is
 * the synthetic bootstrap tenant, not a persisted one.
 *
 * `application.start.js` already states that the capability-level boot recovers
 * under the synthetic tenant "which owns no real reservations", and real
 * reservations belong to the BookingRegistry tenants handled by
 * `startTenantReservationRecovery()`. After Stage proved that a synthetic tenant
 * must never reach a uuid `tenant_id` predicate, reusing `commercial` here would
 * have this suite assert the impossible: recovery of persisted rows for a tenant
 * that by construction owns none.
 *
 * Nothing else about the suite changes. Every behavioural assertion - original
 * anchor preservation, the offline sweep, no_response, idempotency, unusable
 * anchors, autoExpiration off and tenant isolation - is unchanged and still runs
 * through the same production code paths.
 */
const PERSISTED_TENANT = {
  id: '6f1c2a80-5d3e-4f17-9b64-2c8e0a71d4f5',
  name: 'Persisted Booking Tenant',
  slug: 'ensueno-curinanco',
}

/** Build a bundle under the persisted tenant this suite recovers for. */
function createPersistedTenantBundle() {
  return createTestBundle({ tenant: PERSISTED_TENANT })
}

const RESERVATION_TABLE = 'reservation'
const AVAILABILITY_TABLE = 'availability'
const LINE_TABLE = 'reservation_lines'
const HOUR = 60 * 60 * 1000

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

let passed = 0
let failed = 0
const failures = []

async function test(name, fn) {
  try {
    await fn()
    passed += 1
    console.log(`  PASS ${name}`)
  } catch (error) {
    failed += 1
    failures.push({ name, error })
    console.log(`  FAIL ${name}: ${error?.message || error}`)
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function assertEqual(actual, expected, message) {
  const same = Object.is(actual, expected) ||
    JSON.stringify(actual) === JSON.stringify(expected)
  if (!same) {
    throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
  }
}

function assertDeep(actual, expected, message) {
  assertEqual(JSON.stringify(actual), JSON.stringify(expected), message)
}

const store = () => InMemoryRepositoryAdapter.store
const rows = (table) => Array.from(store().get(table)?.values() || [])
const reservationRow = (id) => store().get(RESERVATION_TABLE)?.get(id) || null
const reservedCounts = () =>
  rows(AVAILABILITY_TABLE)
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((r) => r.reservedCount)

/** Availability rows for a stay, in the tenant that owns them. */
function seedAvailability(tenantId, accommodationId, checkIn, checkOut, overrides = {}) {
  const end = new Date(checkOut)
  end.setDate(end.getDate() - 1)
  const nights = []
  const cursor = new Date(checkIn)
  while (cursor <= end) {
    nights.push(cursor.toISOString().slice(0, 10))
    cursor.setDate(cursor.getDate() + 1)
  }

  InMemoryRepositoryAdapter.seed(AVAILABILITY_TABLE, nights.map((date) => ({
    id: `avail-${tenantId}-${accommodationId}-${date}`,
    tenantId,
    accommodationId,
    date,
    status: 'available',
    isBlocked: false,
    inventory: 4,
    reservedCount: 0,
    available: 4,
    price: 120,
    currency: 'ARS',
    ...overrides,
  })))
}

/**
 * Drop every in-process object a restart would drop, and keep the store.
 *
 * This is the whole simulation. No timer map, no scheduler job and no manager cache
 * survives it; the repository rows do, because they are what a restart cannot lose.
 */
async function simulateRestart(bundle) {
  for (const capability of bundle.capabilities) {
    try { await capability.deactivate() } catch { /* best-effort */ }
    try { await capability.destroy() } catch { /* best-effort */ }
  }
  try { await bundle.engine.shutdown() } catch { /* best-effort */ }
  try { await bundle.engine.dispose() } catch { /* best-effort */ }
}

/**
 * Persist a reservation through the REAL manager, so the row, the reservation line
 * and the consumed capacity are all produced by the production write path.
 */
async function persistRequest(bundle, overrides = {}) {
  const checkIn = dateOffset(1)
  const checkOut = dateOffset(3)
  seedAvailability(bundle.tenant.id, 'acc-test', checkIn, checkOut)

  const created = await bundle.capability('reservation').manager.createRequest(
    createReservationData({ id: 'res-1', ...overrides }),
    bundle.identity
  )
  assert(created.success === true, `the fixture reservation must be persisted: ${JSON.stringify(created)}`)
  return { created, checkIn, checkOut }
}

/** Age a persisted row's timestamps, standing in for the time that passed while down. */
function agePersistedRow(id, fields) {
  const table = store().get(RESERVATION_TABLE)
  const row = table.get(id)
  table.set(id, { ...row, ...fields })
  return table.get(id)
}

const reportEntry = (report, reservationId) =>
  report?.reservations?.find((entry) => entry.reservationId === reservationId) || null

// ---------------------------------------------------------------------------

console.log('\nBOOKING-EXPIRATION-RECOVERY-1 — restart recovery + commercial scheduler wiring\n')

// ---------------------------------------------------------------------------
// 1. Commercial wiring
// ---------------------------------------------------------------------------

console.log('commercial wiring:')

await test('the commercial capability list contains SchedulerCapability before ReservationCapability', async () => {
  const ids = COMMERCIAL_CAPABILITIES.map((C) => C.id)
  assert(ids.includes('scheduler'), `the commercial list must contain the scheduler: ${ids.join(', ')}`)
  assert(
    ids.indexOf('scheduler') < ids.indexOf('reservation'),
    `the scheduler must be registered before the reservation capability: ${ids.join(', ')}`
  )
  // The other commercial capabilities are all still wired.
  for (const id of ['business', 'accommodation', 'availability', 'reservation', 'visitor', 'owner', 'booking', 'notifications', 'opportunity']) {
    assert(ids.includes(id), `the commercial list must still contain ${id}`)
  }
})

await test('the commercial registry exposes the scheduler and registers the expiration handler', async () => {
  const bundle = await createPersistedTenantBundle()

  try {
    assertEqual(bundle.registry.size, 10, 'the commercial registry must hold all ten capabilities')
    assert(bundle.registry.get('scheduler') !== null, 'the scheduler must be in the commercial registry')

    const reservation = bundle.capability('reservation')
    assertEqual(
      reservation.timerActivation?.status,
      'registered',
      `timer activation must succeed in the commercial runtime: ${JSON.stringify(reservation.timerActivation)}`
    )
    const handler = reservation.timerActivation.handler
    assert(typeof handler === 'string' && handler.startsWith('reservationExpiration:'), 'the expiration handler must be named per instance')

    // The handler is really registered: the scheduler's executor resolves it by name
    // and throws "Handler not found" when it is absent.
    const scheduler = bundle.registry.get('scheduler')
    const probe = await scheduler.executor.execute({
      id: 'probe',
      handler: 'no-such-handler',
      payload: {},
    })
    assert(
      String(probe.error || probe.reason || '').includes('Handler not found'),
      `the executor must refuse an unknown handler, otherwise it proves nothing: ${JSON.stringify(probe)}`
    )

    // Every other commercial capability is still active.
    for (const id of ['business', 'accommodation', 'availability', 'visitor', 'owner', 'booking', 'notifications', 'opportunity', 'scheduler']) {
      assert(bundle.registry.get(id).state === 'active', `${id} must be active in the commercial runtime`)
    }
  } finally {
    await bundle.teardown()
  }
})

await test('the expiration handler is registered before recovery schedules anything', async () => {
  // A recording scheduler capability: the order of the two calls is the claim under
  // test, so it is observed directly rather than inferred afterwards.
  const order = []
  const registryLike = {
    get: (id) => (id === 'scheduler'
      ? {
        registerHandler: (name) => order.push(`registerHandler:${name}`),
        unregisterHandler: () => ({ success: true }),
        schedule: async (job) => {
          order.push(`schedule:${job.id}`)
          return { success: true, jobId: job.id }
        },
      }
      : null),
  }

  const anchor = new Date(Date.now() - 13 * HOUR).toISOString()
  const context = {
    tenant: PERSISTED_TENANT,
    capabilities: registryLike,
    dataManager: null,
    eventBus: { emit: () => {} },
    repositories: { reservation: { findById: async () => null } },
  }

  const manager = {
    attachTimer: () => {},
    findReservationsByStatus: async () => ({
      status: 'ok',
      tenantId: PERSISTED_TENANT.id,
      rows: [{ id: 'res-order', tenantId: PERSISTED_TENANT.id, status: RESERVATION_STATUS.REQUESTED, createdAt: anchor }],
      foreignRows: 0,
    }),
    expireReservationFromTimer: async () => ({ success: true, status: RESERVATION_STATUS.EXPIRED }),
  }

  const timer = new ReservationTimer(context, { manager })
  const activation = await timer.activate()
  assertEqual(activation.status, 'registered', 'the handler must register')

  await timer.recoverFromPersistedState()

  assert(order.length >= 2, `recovery must have scheduled something: ${JSON.stringify(order)}`)
  assert(
    order[0].startsWith('registerHandler:'),
    `the handler must be registered before anything is scheduled: ${JSON.stringify(order)}`
  )
  assert(
    order.slice(1).every((entry) => entry.startsWith('schedule:')),
    `only scheduling may follow the registration: ${JSON.stringify(order)}`
  )
  await timer.destroy()
})

// ---------------------------------------------------------------------------
// 2. Restart reconstruction — every expirable state
// ---------------------------------------------------------------------------

console.log('\nrestart reconstruction:')

for (const [label, advance, persistedStatus, expectedAnchorField] of [
  ['requested', null, RESERVATION_STATUS.REQUESTED, 'createdAt'],
  ['owner_pending', 'requestOwnerConfirmation', RESERVATION_STATUS.OWNER_PENDING, 'updatedAt'],
  ['payment_pending', 'confirmReservation', RESERVATION_STATUS.PAYMENT_PENDING, 'updatedAt'],
]) {
  await test(`a ${label} reservation is re-armed after a restart with its original deadline`, async () => {
    const first = await createPersistedTenantBundle()
    let originalAnchor

    try {
      await persistRequest(first)
      const manager = first.capability('reservation').manager

      if (advance === 'requestOwnerConfirmation') {
        const moved = await manager.requestOwnerConfirmation('res-1', first.identity)
        assert(moved.success === true, `the ${label} transition must succeed: ${JSON.stringify(moved)}`)
      } else if (advance === 'confirmReservation') {
        const requested = await manager.requestOwnerConfirmation('res-1', first.identity)
        assert(requested.success === true, 'the owner_pending transition must succeed')
        const confirmed = await manager.confirmReservation('res-1', first.identity)
        assert(confirmed.success === true, `the ${label} transition must succeed: ${JSON.stringify(confirmed)}`)
      }

      const persisted = reservationRow('res-1')
      assertEqual(persisted.status, persistedStatus, `the persisted state must be ${persistedStatus}`)
      originalAnchor = persisted[expectedAnchorField]
      assert(typeof originalAnchor === 'string', `the persisted ${expectedAnchorField} must exist`)
      assertEqual(persisted.tenantId, PERSISTED_TENANT.id, 'the persisted row must belong to the tenant')

      // The live process really did arm it before the restart.
      assert(
        first.capability('reservation').timer.getTimer('res-1', persistedStatus) !== null,
        'the first process must have armed the timer'
      )
    } finally {
      await simulateRestart(first)
    }

    const second = await createPersistedTenantBundle()
    try {
      const report = second.capability('reservation').expirationRecovery
      assertEqual(report.status, 'ok', `recovery must succeed: ${JSON.stringify(report)}`)
      assertEqual(report.scanned, 1, 'recovery must see exactly the one expirable reservation')

      const entry = reportEntry(report, 'res-1')
      assert(entry, `recovery must report the reservation: ${JSON.stringify(report.reservations)}`)
      assertEqual(entry.outcome, 'armed', `the timer must be armed: ${JSON.stringify(entry)}`)
      assertEqual(entry.anchorAt, originalAnchor, 'the deadline must be anchored to the original persisted entry')
      assertEqual(entry.overdue, false, 'a freshly persisted reservation is not overdue')

      const record = second.capability('reservation').timer.getTimer('res-1', persistedStatus)
      assert(record, 'the recovered timer must be armed')
      assertEqual(record.tenantId, PERSISTED_TENANT.id, 'the recovered timer must carry the tenant')
      assert(
        second.registry.get('scheduler').manager.getJob(record.jobId),
        'the recovered timer must have a queued job'
      )
      assertEqual(reservationRow('res-1').status, persistedStatus, 'recovery must not change the reservation')
      assertDeep(reservedCounts(), [1, 1], 'recovery must not release capacity')
    } finally {
      await second.teardown()
    }
  })
}

// ---------------------------------------------------------------------------
// 3. Offline elapsed deadline
// ---------------------------------------------------------------------------

console.log('\noffline elapsed deadline:')

await test('a deadline that elapsed while offline expires through the atomic path exactly once', async () => {
  const first = await createPersistedTenantBundle()
  try {
    await persistRequest(first)
    // The process is down for longer than the 12h `requested` timeout.
    agePersistedRow('res-1', { createdAt: new Date(Date.now() - 13 * HOUR).toISOString() })
    assertDeep(reservedCounts(), [1, 1], 'the capacity must still be held before recovery')
  } finally {
    await simulateRestart(first)
  }

  const second = await createPersistedTenantBundle()
  try {
    const report = second.capability('reservation').expirationRecovery
    const entry = reportEntry(report, 'res-1')

    assertEqual(entry.outcome, 'expired', `an elapsed deadline must be driven through the expiry path: ${JSON.stringify(entry)}`)
    assertEqual(entry.overdue, true, 'the entry must report that the deadline had already elapsed')

    // The approved terminal state, produced by the atomic manager path.
    assertEqual(reservationRow('res-1').status, RESERVATION_STATUS.EXPIRED, 'the reservation must be expired')

    // Capacity released exactly once.
    assertDeep(reservedCounts(), [0, 0], 'the capacity must be released exactly once')
    const line = store().get(LINE_TABLE).get(
      rows(LINE_TABLE).find((l) => l.reservationId === 'res-1').id
    )
    assert(line.releasedAt !== null, 'the reservation line must be marked released')

    // No timer and no live job survive a committed expiration.
    const timer = second.capability('reservation').timer
    assertEqual(timer.getActiveTimers().length, 0, 'no timer may remain armed')
    const jobs = second.registry.get('scheduler').manager.getJobs()
      .filter((job) => job.payload?.reservationId === 'res-1' && job.status === 'pending')
    assertEqual(jobs.length, 0, 'no pending job may remain')

    // A second recovery finds nothing to do and cannot release again.
    const again = await second.capability('reservation').timer.recoverFromPersistedState()
    assertEqual(again.status, 'ok', 'a repeated recovery must succeed')
    assertEqual(again.scanned, 0, 'an expired reservation must no longer be a candidate')
    assertDeep(reservedCounts(), [0, 0], 'a repeated recovery must not release capacity again')
  } finally {
    await second.teardown()
  }
})

await test('an owner_pending deadline that elapsed while offline produces no_response', async () => {
  const first = await createPersistedTenantBundle()
  try {
    await persistRequest(first)
    const moved = await first.capability('reservation').manager.requestOwnerConfirmation('res-1', first.identity)
    assert(moved.success === true, 'the owner_pending transition must succeed')
    // The owner never answered, for longer than the 24h owner-pending timeout.
    agePersistedRow('res-1', { updatedAt: new Date(Date.now() - 25 * HOUR).toISOString() })
  } finally {
    await simulateRestart(first)
  }

  const second = await createPersistedTenantBundle()
  try {
    const entry = reportEntry(second.capability('reservation').expirationRecovery, 'res-1')
    assertEqual(entry.outcome, 'expired', `the elapsed owner_pending deadline must expire: ${JSON.stringify(entry)}`)
    assertEqual(
      reservationRow('res-1').status,
      RESERVATION_STATUS.NO_RESPONSE,
      'owner_pending must expire to no_response'
    )
    assertDeep(reservedCounts(), [0, 0], 'the capacity must be released exactly once')
  } finally {
    await second.teardown()
  }
})

// ---------------------------------------------------------------------------
// 4. Remaining deadline
// ---------------------------------------------------------------------------

console.log('\nremaining deadline:')

await test('a future deadline keeps the original anchor instead of the restart time', async () => {
  const first = await createPersistedTenantBundle()
  let createdAt
  try {
    await persistRequest(first)
    createdAt = reservationRow('res-1').createdAt
  } finally {
    await simulateRestart(first)
  }

  const second = await createPersistedTenantBundle()
  try {
    const entry = reportEntry(second.capability('reservation').expirationRecovery, 'res-1')
    const record = second.capability('reservation').timer.getTimer('res-1', RESERVATION_STATUS.REQUESTED)

    assertEqual(entry.anchorAt, createdAt, 'the anchor must be the original creation timestamp')
    assertEqual(record.timeoutMs, 12 * HOUR, 'the configured timeout must be used')

    // expiresAt = original anchor + configured timeout, not "now + timeout".
    assertEqual(
      record.expiresAtMs,
      Date.parse(createdAt) + 12 * HOUR,
      'the deadline must be the original anchor plus the configured timeout'
    )
    assert(record.expiresAtMs > Date.now(), 'a fresh reservation must still be in the future')
    assert(
      record.expiresAtMs < Date.now() + 12 * HOUR,
      'the deadline must not have been restarted from the recovery time'
    )
    assertDeep(reservedCounts(), [1, 1], 'a future deadline must release nothing')
  } finally {
    await second.teardown()
  }
})

// ---------------------------------------------------------------------------
// 5. Changed while offline
// ---------------------------------------------------------------------------

console.log('\nchanged while offline:')

await test('a reservation that reached a non-expirable state while offline is not expired', async () => {
  const first = await createPersistedTenantBundle()
  try {
    await persistRequest(first)
    // Something else finished the reservation while this process was down.
    agePersistedRow('res-1', { status: RESERVATION_STATUS.CONFIRMED, confirmedAt: new Date().toISOString() })
  } finally {
    await simulateRestart(first)
  }

  const second = await createPersistedTenantBundle()
  try {
    const timer = second.capability('reservation').timer
    const report = second.capability('reservation').expirationRecovery

    assertEqual(reportEntry(report, 'res-1'), null, 'a confirmed reservation must not be a recovery candidate')
    assertEqual(timer.getActiveTimers().length, 0, 'no timer may be armed for a confirmed reservation')
    assertEqual(reservationRow('res-1').status, RESERVATION_STATUS.CONFIRMED, 'the confirmed state must stand')

    // Even a stale delivery naming the old expected state is refused by the atomic
    // path, so nothing can expire a state the reservation has left.
    const stale = await second.capability('reservation').manager.expireReservationFromTimer(
      'res-1',
      RESERVATION_STATUS.REQUESTED
    )
    assertEqual(stale.success, false, `a stale expected state must be refused: ${JSON.stringify(stale)}`)
    assertEqual(reservationRow('res-1').status, RESERVATION_STATUS.CONFIRMED, 'the confirmed state must still stand')
  } finally {
    await second.teardown()
  }
})

await test('a reservation that no longer exists is reported, not resurrected', async () => {
  const first = await createPersistedTenantBundle()
  try {
    await persistRequest(first)
    store().get(RESERVATION_TABLE).delete('res-1')
  } finally {
    await simulateRestart(first)
  }

  const second = await createPersistedTenantBundle()
  try {
    const report = second.capability('reservation').expirationRecovery
    assertEqual(report.scanned, 0, 'a deleted reservation must not be recovered')
    assertEqual(second.capability('reservation').timer.getActiveTimers().length, 0, 'nothing may be armed')
    // Its capacity is still held by the store; recovery must not invent a release.
    assertDeep(reservedCounts(), [1, 1], 'a deleted reservation must not have its capacity released by recovery')
  } finally {
    await second.teardown()
  }
})

// ---------------------------------------------------------------------------
// 6. Repeated recovery
// ---------------------------------------------------------------------------

console.log('\nrepeated recovery:')

await test('recovering twice neither duplicates the timer nor resets the deadline', async () => {
  const first = await createPersistedTenantBundle()
  try {
    await persistRequest(first)
  } finally {
    await simulateRestart(first)
  }

  const second = await createPersistedTenantBundle()
  try {
    const timer = second.capability('reservation').timer
    const before = timer.getTimer('res-1', RESERVATION_STATUS.REQUESTED)
    assert(before, 'the first recovery must arm the timer')

    const again = await timer.recoverFromPersistedState()
    assertEqual(again.status, 'ok', 'a repeated recovery must succeed')
    assertEqual(again.scanned, 1, 'the reservation is still a candidate')

    const after = timer.getTimer('res-1', RESERVATION_STATUS.REQUESTED)
    assertEqual(timer.getActiveTimers().length, 1, 'there must still be exactly one active timer')
    assertEqual(after.generation, before.generation, 'no new generation may be minted')
    assertEqual(after.jobId, before.jobId, 'the same job must remain armed')
    assertEqual(after.expiresAtMs, before.expiresAtMs, 'the deadline must not be reset')
    assertEqual(reportEntry(again, 'res-1').outcome, 'armed', 'the repeated recovery must report the armed timer')

    const pending = second.registry.get('scheduler').manager.getJobs()
      .filter((job) => job.status === 'pending' && job.payload?.reservationId === 'res-1')
    assertEqual(pending.length, 1, 'exactly one pending job may exist')
  } finally {
    await second.teardown()
  }
})

// ---------------------------------------------------------------------------
// 7. autoExpiration disabled
// ---------------------------------------------------------------------------

console.log('\nautoExpiration disabled:')

await test('autoExpiration false reconstructs nothing', async () => {
  const bundle = await createPersistedTenantBundle()
  let disabledTimer = null
  try {
    // Seeded after the bundle came up, so the commercial (enabled) recovery already
    // ran and found nothing: from here the switch alone decides this row's fate.
    InMemoryRepositoryAdapter.seed(RESERVATION_TABLE, [{
      id: 'res-cfg',
      tenantId: PERSISTED_TENANT.id,
      accommodationId: 'acc-test',
      resourceId: 'unit-1',
      status: RESERVATION_STATUS.REQUESTED,
      customer: { name: 'Config' },
      dates: { checkIn: dateOffset(1), checkOut: dateOffset(3) },
      // Old enough that the 12h deadline has already passed.
      createdAt: new Date(Date.now() - 30 * HOUR).toISOString(),
    }])
    assertEqual(
      bundle.capability('reservation').expirationRecovery.scanned,
      0,
      'the commercial recovery at startup must not have seen this row'
    )

    const manager = bundle.capability('reservation').manager

    // The commercial context carries the tenant's own reservation configuration
    // through `dataManager`, exactly as the tenant-config load does in production.
    const disabledContext = {
      ...bundle.context,
      dataManager: {
        get: (key) => (key === `tenantConfig.${PERSISTED_TENANT.id}.reservation`
          ? { autoExpiration: false }
          : undefined),
      },
    }

    disabledTimer = new ReservationTimer(disabledContext, { manager })
    const activation = await disabledTimer.activate()
    assertEqual(activation.status, 'registered', 'the handler must still register when the switch is off')

    const report = await disabledTimer.recoverFromPersistedState()
    assertEqual(report.status, 'skipped', `recovery must be skipped: ${JSON.stringify(report)}`)
    assertEqual(report.reason, 'auto_expiration_disabled', 'the skip must name the configuration')

    assertEqual(disabledTimer.getActiveTimers().length, 0, 'no timer may be reconstructed')
    assertEqual(
      bundle.registry.get('scheduler').manager.getJobs().filter((j) => j.payload?.reservationId === 'res-cfg').length,
      0,
      'no job may be scheduled'
    )
    // The switch is respected even against an overdue reservation.
    assertEqual(reservationRow('res-cfg').status, RESERVATION_STATUS.REQUESTED, 'the reservation must not expire')

    // A/B: the very same row, in the very same bundle, IS recovered by the commercial
    // timer whose tenant has the switch on. Only the switch differs.
    const enabled = await bundle.capability('reservation').timer.recoverFromPersistedState()
    assertEqual(enabled.status, 'ok', 'the enabled recovery must run: only the switch should decide')
    assertEqual(reportEntry(enabled, 'res-cfg').outcome, 'expired', 'with the switch on, the same overdue row expires')
    assertEqual(reservationRow('res-cfg').status, RESERVATION_STATUS.EXPIRED, 'the row must now be expired')
  } finally {
    await disabledTimer?.destroy()
    await bundle.teardown()
  }
})

// ---------------------------------------------------------------------------
// 8. Malformed / legacy anchor
// ---------------------------------------------------------------------------

console.log('\nunusable anchor:')

await test('an unusable anchor is reported and no deadline is invented', async () => {
  // A legacy row with no usable state-entry timestamp at all.
  InMemoryRepositoryAdapter.seed(RESERVATION_TABLE, [{
    id: 'res-legacy',
    tenantId: PERSISTED_TENANT.id,
    accommodationId: 'acc-test',
    resourceId: 'unit-1',
    status: RESERVATION_STATUS.REQUESTED,
    customer: { name: 'Legacy' },
    dates: { checkIn: dateOffset(1), checkOut: dateOffset(3) },
    createdAt: null,
    updatedAt: null,
  }])

  const bundle = await createPersistedTenantBundle()
  try {
    const report = bundle.capability('reservation').expirationRecovery
    const entry = reportEntry(report, 'res-legacy')

    assertEqual(report.status, 'partial', `a failed recovery must not report success: ${JSON.stringify(report)}`)
    assertEqual(entry.outcome, 'failed', `the unusable anchor must be a failure: ${JSON.stringify(entry)}`)
    assertEqual(entry.reason, 'no_anchor_timestamp', 'the failure must name the cause')
    assert(
      typeof entry.error === 'string' && entry.error.includes('res-legacy'),
      `the failure must carry the detail: ${JSON.stringify(entry)}`
    )
    assertEqual(entry.expiresAt ?? null, null, 'no deadline may be invented')
    assertEqual(entry.jobId ?? null, null, 'no job may be invented')

    const timer = bundle.capability('reservation').timer
    assertEqual(timer.getTimer('res-legacy', RESERVATION_STATUS.REQUESTED), null, 'no timer may be armed')
    assertEqual(
      bundle.registry.get('scheduler').manager.getJobs().filter((j) => j.payload?.reservationId === 'res-legacy').length,
      0,
      'no job may be scheduled'
    )
    assertEqual(reservationRow('res-legacy').status, RESERVATION_STATUS.REQUESTED, 'the row must be untouched')
  } finally {
    await bundle.teardown()
  }
})

// ---------------------------------------------------------------------------
// 9. Tenant isolation
// ---------------------------------------------------------------------------

console.log('\ntenant isolation:')

await test('recovery for one tenant never arms or expires another tenant reservation', async () => {
  const tenantA = { id: 'tenant-a', name: 'Tenant A', slug: 'tenant-a' }
  const tenantB = { id: 'tenant-b', name: 'Tenant B', slug: 'tenant-b' }

  /** Persist an overdue reservation for one tenant, through that tenant's own manager. */
  async function seedOverdue(tenant, id, accommodationId) {
    const seed = await createTestBundle({ tenant })
    try {
      seedAvailability(tenant.id, accommodationId, dateOffset(1), dateOffset(3))
      const created = await seed.capability('reservation').manager.createRequest(
        createReservationData({ id, accommodationId }),
        seed.identity
      )
      assert(created.success === true, `${tenant.id} reservation must be persisted`)
      assertDeep(
        rows(AVAILABILITY_TABLE).filter((r) => r.tenantId === tenant.id).map((r) => r.reservedCount),
        [1, 1],
        `${tenant.id} must hold its own capacity`
      )
      // Down for longer than the `requested` timeout.
      agePersistedRow(id, { createdAt: new Date(Date.now() - 13 * HOUR).toISOString() })
    } finally {
      await simulateRestart(seed)
    }
  }

  await seedOverdue(tenantA, 'res-a', 'acc-a')
  await seedOverdue(tenantB, 'res-b', 'acc-b')

  // Both tenants now have an identical overdue reservation holding capacity, and the
  // store holds both. Tenant A comes up first.
  const a = await createTestBundle({ tenant: tenantA })
  let b = null
  try {
    const reportA = a.capability('reservation').expirationRecovery

    assertEqual(reportA.scanned, 1, `tenant A must see exactly its own reservation: ${JSON.stringify(reportA.reservations)}`)
    assertEqual(reportA.foreignRows, 0, 'the repository scope must exclude other tenants entirely')
    assert(reportEntry(reportA, 'res-b') === null, 'tenant B reservation must not appear in tenant A recovery')

    // Tenant A's own overdue reservation expired, through the atomic path.
    assertEqual(reservationRow('res-a').status, RESERVATION_STATUS.EXPIRED, 'tenant A reservation must expire')
    assertDeep(
      rows(AVAILABILITY_TABLE).filter((r) => r.tenantId === tenantA.id).map((r) => r.reservedCount),
      [0, 0],
      'tenant A capacity must be released once'
    )

    // Tenant B's identical overdue reservation is completely untouched by A's recovery.
    assertEqual(reservationRow('res-b').status, RESERVATION_STATUS.REQUESTED, 'tenant B reservation must not be expired')
    assertDeep(
      rows(AVAILABILITY_TABLE).filter((r) => r.tenantId === tenantB.id).map((r) => r.reservedCount),
      [1, 1],
      'tenant A must not release tenant B capacity'
    )
    assertEqual(
      a.capability('reservation').timer.getTimer('res-b', RESERVATION_STATUS.REQUESTED),
      null,
      'tenant A must not arm a timer for tenant B'
    )
    assertEqual(
      a.registry.get('scheduler').manager.getJobs().filter((j) => j.payload?.reservationId === 'res-b').length,
      0,
      'tenant A must not schedule work for tenant B'
    )

    // Tenant B recovers in its own context, and only touches its own state.
    b = await createTestBundle({ tenant: tenantB })
    const reportB = b.capability('reservation').expirationRecovery
    assertEqual(reportB.scanned, 1, `tenant B must see exactly its own reservation: ${JSON.stringify(reportB.reservations)}`)
    assertEqual(reservationRow('res-b').status, RESERVATION_STATUS.EXPIRED, 'tenant B reservation must expire on its own')
    assertDeep(
      rows(AVAILABILITY_TABLE).filter((r) => r.tenantId === tenantB.id).map((r) => r.reservedCount),
      [0, 0],
      'tenant B capacity must be released once, by tenant B'
    )
    // And tenant A's already-released capacity is not released a second time.
    assertDeep(
      rows(AVAILABILITY_TABLE).filter((r) => r.tenantId === tenantA.id).map((r) => r.reservedCount),
      [0, 0],
      "tenant B's recovery must not touch tenant A capacity"
    )
  } finally {
    await b?.teardown()
    await a.teardown()
  }
})

// ---------------------------------------------------------------------------
// 10. Scheduler unavailable
// ---------------------------------------------------------------------------

console.log('\nscheduler unavailable:')

await test('recovery without the scheduler capability fails explicitly', async () => {
  const bundle = await createPersistedTenantBundle()
  let detachedTimer = null
  try {
    await persistRequest(bundle)

    // The scheduler cannot be registered at all: activation must fail, and recovery
    // must not pretend a handler exists.
    bundle.registry.unregister('scheduler')
    const orphan = new ReservationTimer(bundle.context, { manager: null })
    const activation = await orphan.activate()
    assertEqual(activation.status, 'failed', `activation must fail without a scheduler: ${JSON.stringify(activation)}`)

    const orphanReport = await orphan.recoverFromPersistedState()
    assertEqual(orphanReport.status, 'skipped', 'an inactive timer must refuse to recover')
    assertEqual(orphanReport.reason, 'timer_inactive', 'the refusal must name the missing handler')
    await orphan.destroy()

    // The scheduler disappears after the handler was registered - the ordering hazard
    // the guard exists for. Recovery must fail loudly instead of arming work nothing
    // can run.
    const timer = bundle.capability('reservation').timer
    assertEqual(timer.getActiveTimers().length, 1, 'the commercial timer must have armed the pending reservation')

    const report = await timer.recoverFromPersistedState()
    assertEqual(report.status, 'failed', `recovery must fail, not silently succeed: ${JSON.stringify(report)}`)
    assertEqual(report.reason, 'scheduler_unavailable', 'the failure must name the missing scheduler')
    assert(
      typeof report.error === 'string' && report.error.length > 0,
      `the failure must carry the detail: ${JSON.stringify(report)}`
    )
    assertEqual(report.reservations.length, 0, 'nothing may be recovered without a scheduler')
    detachedTimer = timer
  } finally {
    detachedTimer?.destroy()
    await bundle.teardown()
  }
})

// ---------------------------------------------------------------------------

console.log('')
console.log(`total: ${passed + failed}  passed: ${passed}  failed: ${failed}`)
if (failed > 0) {
  for (const { name, error } of failures) {
    console.log(`\n  ${name}\n    ${String(error?.stack || error).split('\n').slice(0, 6).join('\n    ')}`)
  }
  process.exitCode = 1
}