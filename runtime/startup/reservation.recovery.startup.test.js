/**
 * BOOKING-EXPIRATION-RECOVERY-1 (remediation) — REAL startup tenant recovery
 *
 * This suite exercises the actual production startup sequence from
 * `runtime/startup/application.start.js`:
 *
 *   bootstrapRuntime -> registerRepositories -> registerCapabilities
 *     -> setBookingRegistry (the shared registry public booking.routes.js resolves)
 *     -> startTenantReservationRecovery(...)
 *
 * It deliberately does NOT call `registerCapabilities()` once per test tenant. Tenant
 * recovery must happen because STARTUP enumerated the real BookingRegistry, so that is
 * the only thing this suite does. Every tenant in these tests reaches recovery solely
 * through `startTenantReservationRecovery()`.
 *
 * `application.start()` itself cannot be imported in this workspace — it pulls
 * `jsonwebtoken`, which is not installed (pre-existing, see the report). The harness
 * therefore calls the same production functions `start()` calls, in the same order,
 * and asserts the wiring contract the orchestrator depends on. That is recorded as a
 * limitation, not claimed as full `start()` coverage.
 *
 * "Restart" destroys every capability, every tenant runtime and the engine, and then
 * boots again over the SAME repository store: exactly what a Passenger restart loses
 * and keeps. No state is re-seeded after a restart.
 */
import { bootstrapRuntime } from './runtime.bootstrap.js'
import { registerRepositories } from './repository.bootstrap.js'
import { registerCapabilities } from './capability.bootstrap.js'
import { startTenantReservationRecovery } from './reservation.recovery.bootstrap.js'
import { createBookingRegistry, BookingRegistry } from '../../experience/booking/booking.registry.js'
import { createBookingAdapter } from '../../experience/booking/booking.adapter.js'
import { getBookingRegistry, setBookingRegistry } from '../../api/routes/booking.routes.js'
import { InMemoryRepositoryAdapter } from '../../tests/capability/capability.mock.repositories.js'
import { RESERVATION_STATUS } from '../../capabilities/reservation/reservation.status.js'
import { ReservationTimer } from '../../capabilities/reservation/reservation.timer.js'

const RESERVATION_TABLE = 'reservation'
const AVAILABILITY_TABLE = 'availability'
const HOUR = 60 * 60 * 1000

// `base.repository.js` still logs an unconditional per-query trace (pre-existing). This
// suite boots the platform many times, so the noise would bury the assertions; the trace
// is filtered, not removed from the source.
const rawLog = console.log.bind(console)
console.log = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('[RUNTIME-PERSISTENCE-1 TRACE]')) return
  rawLog(...args)
}

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
  const same = Object.is(actual, expected) || JSON.stringify(actual) === JSON.stringify(expected)
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
const reservedFor = (tenantId, accommodationId) =>
  rows(AVAILABILITY_TABLE)
    .filter((r) => r.tenantId === tenantId && r.accommodationId === accommodationId)
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((r) => r.reservedCount)

const dateOffset = (days) => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)))

/**
 * The catalog the public booking write path needs: a published business and its
 * accommodation, owned by the REAL tenant. `seed()` upserts by id, so this is idempotent
 * across restarts and does not disturb reservation or availability state.
 */
function seedBookingCatalog(tenant, businessId, accommodationId) {
  InMemoryRepositoryAdapter.seed('business', [{
    id: businessId,
    tenantId: tenant.id,
    name: tenant.name,
    status: 'published',
    deletedAt: null,
  }])
  InMemoryRepositoryAdapter.seed('accommodation', [{
    id: accommodationId,
    tenantId: tenant.id,
    businessId,
    name: `${tenant.name} accommodation`,
    deletedAt: null,
  }])
}

/** Availability rows for one stay, in the tenant that owns them. */
function seedAvailability(tenantId, accommodationId, checkIn, checkOut, inventory = 4) {
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
    inventory,
    reservedCount: 0,
    available: inventory,
    price: 120000,
    currency: 'CLP',
  })))
}

/**
 * Persist a `requested` reservation through the REAL public BookingAdapter, so the
 * row, its line and the consumed capacity all come from the production write path and
 * the reservation belongs to a REAL tenant id rather than the synthetic one.
 *
 * Returns the id PRODUCTION assigned — the public path mints its own reservation id, so
 * the tests must track the real one rather than assume one.
 */
async function bookThroughPublicAdapter(platform, companySlug, tenant, accommodationId, options = {}) {
  const checkIn = options.checkIn ?? dateOffset(1)
  const checkOut = options.checkOut ?? dateOffset(3)
  seedBookingCatalog(tenant, `biz-${companySlug}`, accommodationId)
  seedAvailability(tenant.id, accommodationId, checkIn, checkOut)

  const adapter = createBookingAdapter(platform.apiContext, getBookingRegistry())
  const result = await adapter.createReservation(companySlug, {
    guestName: 'Tenant Traveler',
    guestEmail: options.guestEmail ?? 'traveler@example.com',
    checkIn,
    checkOut,
    guestCount: 2,
  })

  assert(result.ok === true, `the public BookingAdapter must accept the booking: ${JSON.stringify(result)}`)
  const id = result.data?.reservationId
  assert(typeof id === 'string' && id.length > 0, `the booking must return a reservation id: ${JSON.stringify(result)}`)

  const persisted = reservationRow(id)
  assert(persisted, `the reservation must be persisted under ${id}`)
  assertEqual(persisted.tenantId, tenant.id, 'the persisted row must belong to the real tenant')
  assertEqual(persisted.status, RESERVATION_STATUS.REQUESTED, 'a new public reservation must be requested')
  assertDeep(reservedFor(tenant.id, accommodationId), [1, 1], 'the booking must consume capacity')
  return id
}

/** Age a persisted row's timestamps, standing in for the time that passed while down. */
function agePersistedRow(id, fields) {
  const table = store().get(RESERVATION_TABLE)
  table.set(id, { ...table.get(id), ...fields })
}

/**
 * The production startup sequence, in the same order `application.start()` runs it,
 * stopping after the tenant-recovery step.
 */
async function startPlatform({ targets = {}, noBooking = [] } = {}) {
  const runtime = await bootstrapRuntime({ eventBus: undefined, config: { runtime: {} } })
  runtime.repositoryRuntime.registerAdapter('mock', InMemoryRepositoryAdapter)
  registerRepositories(runtime.repositoryRuntime)

  const { registry, context, capabilities } = await registerCapabilities(runtime, {
    tenant: { id: 'commercial', name: 'Commercial', slug: 'commercial' },
    configuration: {},
  })

  // Step 3b of application.start(): the shared registry public booking routes resolve.
  const bookingRegistry = createBookingRegistry({ provision: { targets, noBooking } })
  setBookingRegistry(bookingRegistry)

  const { orchestrator, report } = await startTenantReservationRecovery({
    runtime,
    capabilityContext: context,
    capabilityRegistry: registry,
    bookingRegistry: getBookingRegistry(),
    configuration: {},
  })

  // The context shape `startWithApi()` hands to the public Booking routes, built from
  // `bundle.runtimeContext` — not from the capability context, exactly as production does.
  const apiContext = {
    ...runtime.runtimeContext,
    config: context.config,
    capabilities: context.capabilities,
    repositories: runtime.repositoryRuntime,
  }

  return {
    runtime,
    capabilityRegistry: registry,
    capabilityContext: context,
    apiContext,
    capabilities,
    bookingRegistry,
    orchestrator,
    report,
    tenantEntry: (tenantId) => report.tenants.find((entry) => entry.tenantId === tenantId) || null,
    tenantRuntime: (tenantId) => orchestrator.list().find((entry) => entry.tenantId === tenantId) || null,

    /**
     * The teardown `application.cleanup()` performs for these components, in the same
     * order: tenant runtimes first, then capabilities (which own the scheduler), then
     * the engine. The store is deliberately NOT reset — a restart keeps it.
     */
    async shutdown() {
      try { await orchestrator.destroy() } catch { /* best-effort */ }
      for (const capability of capabilities) {
        try { await capability.deactivate() } catch { /* best-effort */ }
        try { await capability.destroy() } catch { /* best-effort */ }
      }
      try { await runtime.engine.shutdown() } catch { /* best-effort */ }
      try { await runtime.engine.dispose() } catch { /* best-effort */ }
    },
  }
}

// A tenant with two companies registered against it, and a second, unrelated tenant.
const TENANT_A = { id: 'tenant-ensueno-uuid', name: 'Complejo Ensueño', slug: 'ensueno-curinanco' }
const TENANT_B = { id: 'tenant-otro-uuid', name: 'Otro Complejo', slug: 'otro-complejo' }
const TENANT_C = { id: 'tenant-registrado-uuid', name: 'Registrado', slug: 'registrado' }

const companyFor = (slug, tenant, accommodationId) => ({
  tenantId: tenant.id,
  tenantName: tenant.name,
  tenantSlug: tenant.slug,
  businessId: `biz-${slug}`,
  accommodationId,
  currency: 'CLP',
  title: slug,
})

// ---------------------------------------------------------------------------

console.log('\nBOOKING-EXPIRATION-RECOVERY-1 — real startup tenant recovery\n')

// ---------------------------------------------------------------------------
// 1-3: the registry drives recovery; nothing bootstraps a tenant by hand
// ---------------------------------------------------------------------------

console.log('\nstartup ownership from the real BookingRegistry:')

await test('startup establishes recovery ownership for the registered tenant', async () => {
  InMemoryRepositoryAdapter.reset()
  const platform = await startPlatform({
    targets: { 'ensueno-curinanco': companyFor('ensueno-curinanco', TENANT_A, 'acc-ensueno') },
  })

  try {
    // 1. the registry contains tenant A...
    assert(platform.bookingRegistry instanceof BookingRegistry, 'the shared registry must be a real BookingRegistry')
    assertEqual(platform.bookingRegistry.list().length, 1, 'the registry must contain one target')
    assertEqual(platform.bookingRegistry.list()[0].tenantId, TENANT_A.id, 'the target must carry the real tenant id')

    // ...2. and startup established recovery ownership for it, on its own.
    assertEqual(platform.report.bookingTargets, 1, 'startup must enumerate the registry')
    assertEqual(platform.report.uniqueTenants, 1, 'one target must yield one tenant')
    assertEqual(platform.report.status, 'ok', `startup recovery must succeed: ${JSON.stringify(platform.report.tenants.map((t) => t.status))}`)
    assertEqual(platform.report.unusableTargets.length, 0, 'a valid target must not be reported unusable')

    const entry = platform.tenantEntry(TENANT_A.id)
    assert(entry, 'the tenant must have a report entry')
    assertEqual(entry.status, 'ok', 'the tenant entry must be ok')
    assertEqual(entry.timerActivation.status, 'registered', 'the tenant timer handler must be registered')
    assertEqual(platform.orchestrator.size, 1, 'exactly one tenant runtime must be owned')
    assert(platform.tenantRuntime(TENANT_A.id), 'the tenant runtime must be retained for the process lifetime')

    // The tenant runtime really is tenant-scoped, not the synthetic scope.
    assertEqual(
      platform.tenantRuntime(TENANT_A.id).context.tenant.id,
      TENANT_A.id,
      'the tenant context must carry the REAL tenant identity'
    )
    // And the global commercial context was not mutated.
    assertEqual(platform.capabilityContext.tenant.id, 'commercial', 'the global commercial context must be untouched')
  } finally {
    await platform.shutdown()
  }
})

await test('startup recovers a real tenant reservation without bootstrapping that tenant capability', async () => {
  InMemoryRepositoryAdapter.reset()
  const first = await startPlatform({
    targets: { 'ensueno-curinanco': companyFor('ensueno-curinanco', TENANT_A, 'acc-ensueno') },
  })

  let anchor
  let resA
  try {
    resA = await bookThroughPublicAdapter(first, 'ensueno-curinanco', TENANT_A, 'acc-ensueno')
    anchor = reservationRow(resA).createdAt
    // Overdue: longer than the 12h `requested` timeout while the process was down.
    agePersistedRow(resA, { createdAt: new Date(Date.now() - 13 * HOUR).toISOString() })
    assertDeep(reservedFor(TENANT_A.id, 'acc-ensueno'), [1, 1], 'capacity must still be held before the restart')
  } finally {
    await first.shutdown()
  }

  // Restart. No tenant is bootstrapped by hand: startup must find it via the registry.
  const second = await startPlatform({
    targets: { 'ensueno-curinanco': companyFor('ensueno-curinanco', TENANT_A, 'acc-ensueno') },
  })

  try {
    const entry = second.tenantEntry(TENANT_A.id)
    assert(entry, `startup must discover tenant A: ${JSON.stringify(second.report)}`)
    assertEqual(entry.recovery.scanned, 1, 'startup recovery must see the persisted expirable reservation')
    assertEqual(entry.recovery.status, 'ok', 'recovery must succeed')

    const recovered = entry.recovery.reservations.find((r) => r.reservationId === resA)
    assert(recovered, `the reservation must be reported: ${JSON.stringify(entry.recovery.reservations)}`)

    // 4. expired through the existing atomic manager path
    assertEqual(recovered.outcome, 'expired', 'an overdue reservation must expire')
    assertEqual(reservationRow(resA).status, RESERVATION_STATUS.EXPIRED, 'the reservation must be EXPIRED')
    // 5. capacity released exactly once
    assertDeep(reservedFor(TENANT_A.id, 'acc-ensueno'), [0, 0], 'capacity must be released exactly once')
    const line = rows('reservation_lines').find((l) => l.reservationId === resA)
    assert(line?.releasedAt, 'the reservation line must be marked released')

    // A second startup pass must not release again.
    const again = await second.orchestrator.recover(getBookingRegistry())
    assertEqual(again.status, 'ok', 'a repeated recovery must succeed')
    assertEqual(again.uniqueTenants, 1, 'the tenant is still enumerated once')
    assertDeep(reservedFor(TENANT_A.id, 'acc-ensueno'), [0, 0], 'a repeated startup recovery must not release twice')

    // And the synthetic commercial scope never owned this row.
    assertEqual(
      second.tenantEntry('commercial'),
      null,
      'startup must not create a recovery runtime for the synthetic tenant'
    )
  } finally {
    await second.shutdown()
  }
})

// ---------------------------------------------------------------------------
// 9: repeated recovery passes
// ---------------------------------------------------------------------------

console.log('\nrepeated recovery is idempotent:')

await test('repeating recovery adds no second runtime, timer or release', async () => {
  InMemoryRepositoryAdapter.reset()
  const first = await startPlatform({
    targets: {
      'ensueno-curinanco': companyFor('ensueno-curinanco', TENANT_A, 'acc-ensueno'),
      'empresa-dos': companyFor('empresa-dos', TENANT_A, 'acc-dos'),
    },
  })

  let resA
  let resF
  try {
    // Two separate stays in the same tenant, so each stay's capacity can be asserted
    // independently and re-seeding one stay cannot mask the other.
    resA = await bookThroughPublicAdapter(first, 'ensueno-curinanco', TENANT_A, 'acc-ensueno', {
      checkIn: dateOffset(1),
      checkOut: dateOffset(3),
      guestEmail: 'overdue@example.com',
    })
    agePersistedRow(resA, { createdAt: new Date(Date.now() - 13 * HOUR).toISOString() })
    resF = await bookThroughPublicAdapter(first, 'empresa-dos', TENANT_A, 'acc-dos', {
      checkIn: dateOffset(5),
      checkOut: dateOffset(7),
      guestEmail: 'fresh@example.com',
    })
    assertDeep(reservedFor(TENANT_A.id, 'acc-ensueno'), [1, 1], 'the overdue stay must hold capacity')
    assertDeep(reservedFor(TENANT_A.id, 'acc-dos'), [1, 1], 'the fresh stay must hold capacity')
  } finally {
    await first.shutdown()
  }

  const second = await startPlatform({
    targets: {
      'ensueno-curinanco': companyFor('ensueno-curinanco', TENANT_A, 'acc-ensueno'),
      'empresa-dos': companyFor('empresa-dos', TENANT_A, 'acc-dos'),
    },
  })

  try {
    const scheduler = second.capabilityRegistry.get('scheduler')
    const timersAfterStartup = second.tenantRuntime(TENANT_A.id).timer.getActiveTimers().length
    const pendingAfterStartup = scheduler.manager.getJobs().filter((j) => j.status === 'pending').length
    assertEqual(timersAfterStartup, 1, 'startup must leave exactly the still-armed timer')
    assertEqual(pendingAfterStartup, 1, 'startup must leave exactly one queued job')
    assertDeep(reservedFor(TENANT_A.id, 'acc-ensueno'), [0, 0], 'startup must release the overdue stay')
    assertDeep(reservedFor(TENANT_A.id, 'acc-dos'), [1, 1], 'startup must keep the fresh stay held')

    // Two further passes: nothing may be double-created or double-released.
    for (const pass of [1, 2]) {
      const report = await second.orchestrator.recover(getBookingRegistry())
      assertEqual(report.status, 'ok', `pass ${pass} must succeed`)
      assertEqual(report.uniqueTenants, 1, `pass ${pass} must still enumerate one tenant`)
      assertEqual(second.orchestrator.size, 1, `pass ${pass} must not add a second runtime`)
      assertEqual(
        second.tenantRuntime(TENANT_A.id).timer.getActiveTimers().length,
        1,
        `pass ${pass} must not duplicate the armed timer`
      )
      assertEqual(
        scheduler.manager.getJobs().filter((j) => j.status === 'pending').length,
        1,
        `pass ${pass} must not duplicate the queued job`
      )
      assertEqual(reservationRow(resA).status, RESERVATION_STATUS.EXPIRED, `pass ${pass} must leave the expired row alone`)
      assertDeep(
        reservedFor(TENANT_A.id, 'acc-ensueno'),
        [0, 0],
        `pass ${pass} must not release the already-expired reservation again`
      )
      assertDeep(reservedFor(TENANT_A.id, 'acc-dos'), [1, 1], `pass ${pass} must not release the still-armed reservation`)
      assertEqual(
        rows('reservation_lines').filter((l) => l.releasedAt && l.reservationId === resA).length,
        1,
        `pass ${pass} must leave exactly one released line`
      )
    }

    // The request-scoped public path wrote resF; the tenant runtime adopted it, so both
    // reservations live in the tenant's single timer set.
    const adopted = second.tenantRuntime(TENANT_A.id).timer.getTimer(resF, RESERVATION_STATUS.REQUESTED)
    assert(adopted, 'the second reservation must be adopted by the same tenant timer')
  } finally {
    await second.shutdown()
  }
})

// ---------------------------------------------------------------------------
// 4-5: future deadlines stay armed and still fire
// ---------------------------------------------------------------------------

console.log('\nfuture deadlines survive startup:')

await test('a future deadline is reconstructed from the persisted entry and stays live', async () => {
  InMemoryRepositoryAdapter.reset()
  const first = await startPlatform({
    targets: { 'ensueno-curinanco': companyFor('ensueno-curinanco', TENANT_A, 'acc-ensueno') },
  })

  let anchor
  let resF
  try {
    resF = await bookThroughPublicAdapter(first, 'ensueno-curinanco', TENANT_A, 'acc-ensueno')
    // The persisted state-entry timestamp is moved so the deadline falls a few seconds
    // AFTER the restart. The timer computes its deadline from the PERSISTED anchor, so
    // this yields a genuinely future deadline without waiting 12 real hours.
    agePersistedRow(resF, { createdAt: new Date(Date.now() - 12 * HOUR + 4000).toISOString() })
    anchor = reservationRow(resF).createdAt
  } finally {
    await first.shutdown()
  }

  const second = await startPlatform({
    targets: { 'ensueno-curinanco': companyFor('ensueno-curinanco', TENANT_A, 'acc-ensueno') },
  })

  try {
    const entry = second.tenantEntry(TENANT_A.id)
    const recovered = entry.recovery.reservations.find((r) => r.reservationId === resF)

    // 6. anchored to the ORIGINAL persisted state-entry timestamp
    assertEqual(recovered.outcome, 'armed', 'a future deadline must be armed, not expired')
    assertEqual(recovered.anchorAt, anchor, 'the anchor must be the original persisted state-entry timestamp')
    assertEqual(recovered.overdue, false, 'the report must mark it as not overdue')

    const tenantTimer = second.tenantRuntime(TENANT_A.id).timer
    const record = tenantTimer.getTimer(resF, RESERVATION_STATUS.REQUESTED)
    assert(record, 'the recovered timer must be armed')
    assertEqual(record.expiresAtMs, Date.parse(anchor) + 12 * HOUR, 'the deadline must be the persisted anchor plus the status timeout')
    assert(record.expiresAtMs > Date.now(), 'the deadline must still be in the future')

    // 7. still live AFTER startup orchestration returned
    assert(tenantTimer.isActive, 'the tenant timer must still be active after startup')
    assertEqual(tenantTimer.getActiveTimers().length, 1, 'the reconstructed timer must still be armed')
    const scheduler = second.capabilityRegistry.get('scheduler')
    const job = scheduler.manager.getJob(record.jobId)
    assert(job, 'the reconstructed deadline must have a queued job')
    assertEqual(job.status, 'pending', 'the job must still be pending')
    assertDeep(reservedFor(TENANT_A.id, 'acc-ensueno'), [1, 1], 'a future deadline must release nothing')

    // A delivery before the deadline must not expire anything, and must not consume the
    // one scheduled execution for that deadline.
    const early = await scheduler.run(record.jobId)
    assert(early?.success === true, `the shared scheduler must resolve the job: ${JSON.stringify(early)}`)
    assertEqual(early.result?.reason, 'not_due', 'an early delivery must report not_due')
    assertEqual(early.result?.requeue, true, 'an early delivery must requeue rather than consume the deadline')
    assertEqual(reservationRow(resF).status, RESERVATION_STATUS.REQUESTED, 'an early delivery must not expire')
    assertDeep(reservedFor(TENANT_A.id, 'acc-ensueno'), [1, 1], 'an early delivery must not release capacity')

    // 8. its scheduler delivery AFTER the deadline expires the reservation
    await sleep(record.expiresAtMs - Date.now() + 500)
    const delivered = await scheduler.run(record.jobId)
    assert(delivered?.success === true, `the shared scheduler must be able to deliver the job: ${JSON.stringify(delivered)}`)
    assertEqual(reservationRow(resF).status, RESERVATION_STATUS.EXPIRED, 'the delivered job must expire the reservation')
    assertDeep(reservedFor(TENANT_A.id, 'acc-ensueno'), [0, 0], 'delivery must release capacity exactly once')
    assertEqual(tenantTimer.getActiveTimers().length, 0, 'a committed expiration must leave no live timer')
  } finally {
    await second.shutdown()
  }
})

// ---------------------------------------------------------------------------
// 9-10: multiple tenants, and deduplication
// ---------------------------------------------------------------------------

console.log('\nmultiple registered tenants:')

await test('two registered tenants with different tenantIds recover independently', async () => {
  InMemoryRepositoryAdapter.reset()
  const first = await startPlatform({
    targets: {
      'ensueno-curinanco': companyFor('ensueno-curinanco', TENANT_A, 'acc-ensueno'),
      'otro-complejo': companyFor('otro-complejo', TENANT_B, 'acc-otro'),
    },
  })

  let resA
  let resB
  try {
    resA = await bookThroughPublicAdapter(first, 'ensueno-curinanco', TENANT_A, 'acc-ensueno')
    resB = await bookThroughPublicAdapter(first, 'otro-complejo', TENANT_B, 'acc-otro')
    // Only tenant A goes overdue; tenant B keeps a fresh reservation.
    agePersistedRow(resA, { createdAt: new Date(Date.now() - 13 * HOUR).toISOString() })
  } finally {
    await first.shutdown()
  }

  const second = await startPlatform({
    targets: {
      'ensueno-curinanco': companyFor('ensueno-curinanco', TENANT_A, 'acc-ensueno'),
      'otro-complejo': companyFor('otro-complejo', TENANT_B, 'acc-otro'),
    },
  })

  try {
    assertEqual(second.report.bookingTargets, 2, 'two registered targets must be enumerated')
    assertEqual(second.report.uniqueTenants, 2, 'two distinct tenants must yield two tenant runtimes')
    assertEqual(second.orchestrator.size, 2, 'both tenant runtimes must be owned')

    assertEqual(reservationRow(resA).status, RESERVATION_STATUS.EXPIRED, "tenant A's overdue reservation must expire")
    assertDeep(reservedFor(TENANT_A.id, 'acc-ensueno'), [0, 0], 'tenant A capacity must be released once')

    assertEqual(reservationRow(resB).status, RESERVATION_STATUS.REQUESTED, "tenant B's fresh reservation must stay")
    assertDeep(reservedFor(TENANT_B.id, 'acc-otro'), [1, 1], "tenant B capacity must stay held")
    assertEqual(
      second.tenantRuntime(TENANT_A.id).timer.getTimer(resB, RESERVATION_STATUS.REQUESTED),
      null,
      "tenant A must not hold a timer for tenant B"
    )
    assertEqual(
      second.capabilityRegistry.get('scheduler').manager.getJobs()
        .filter((j) => j.payload?.reservationId === resB && j.status === 'pending').length,
      1,
      "only tenant B's own timer may queue work for its reservation"
    )
  } finally {
    await second.shutdown()
  }
})

await test('two targets sharing one tenantId produce exactly one tenant recovery runtime', async () => {
  InMemoryRepositoryAdapter.reset()
  const platform = await startPlatform({
    targets: {
      // Same tenant, two companies — the shape the reviewer warned about.
      'empresa-uno': companyFor('empresa-uno', TENANT_A, 'acc-uno'),
      'empresa-dos': companyFor('empresa-dos', TENANT_A, 'acc-dos'),
    },
  })

  try {
    assertEqual(platform.report.bookingTargets, 2, 'both targets must be enumerated')
    assertEqual(platform.report.uniqueTenants, 1, 'a shared tenantId must be deduplicated to ONE tenant')
    assertEqual(platform.orchestrator.size, 1, 'exactly one tenant runtime must exist')

    const entry = platform.tenantEntry(TENANT_A.id)
    assert(entry, 'the deduplicated tenant must have one report entry')
    assertDeep(entry.companies, ['empresa-uno', 'empresa-dos'], 'both companies must be attributed to the one tenant')
    assertEqual(
      platform.report.tenants.filter((t) => t.tenantId === TENANT_A.id).length,
      1,
      'there must be exactly one report entry for the shared tenant'
    )

    // The single tenant scan covers both companies' reservations, exactly once.
    const resU = await bookThroughPublicAdapter(platform, 'empresa-uno', TENANT_A, 'acc-uno')
    const again = await platform.orchestrator.recover(getBookingRegistry())
    assertEqual(again.uniqueTenants, 1, 'a repeated pass must still deduplicate to one tenant')
    assertEqual(
      again.tenants[0].recovery.reservations.filter((r) => r.reservationId === resU).length,
      1,
      'the shared tenant reservation must appear exactly once'
    )
  } finally {
    await platform.shutdown()
  }
})

// ---------------------------------------------------------------------------
// 11: no global scan
// ---------------------------------------------------------------------------

console.log('\nno cross-tenant scan:')

await test('a tenant absent from the BookingRegistry is never scanned or expired', async () => {
  InMemoryRepositoryAdapter.reset()
  const seed = await startPlatform({
    targets: { 'ensueno-curinanco': companyFor('ensueno-curinanco', TENANT_A, 'acc-ensueno') },
  })
  let resA
  try {
    resA = await bookThroughPublicAdapter(seed, 'ensueno-curinanco', TENANT_A, 'acc-ensueno')

    // An overdue reservation for a tenant that was never registered with Booking.
    seedAvailability(TENANT_C.id, 'acc-c', dateOffset(1), dateOffset(3))
    InMemoryRepositoryAdapter.seed(RESERVATION_TABLE, [{
      id: 'res-c',
      tenantId: TENANT_C.id,
      businessId: 'biz-c',
      accommodationId: 'acc-c',
      resourceId: 'guest-c@example.com',
      status: RESERVATION_STATUS.REQUESTED,
      customer: { name: 'Unregistered' },
      dates: { checkIn: dateOffset(1), checkOut: dateOffset(3) },
      createdAt: new Date(Date.now() - 30 * HOUR).toISOString(),
    }])
    agePersistedRow(resA, { createdAt: new Date(Date.now() - 13 * HOUR).toISOString() })
  } finally {
    await seed.shutdown()
  }

  const platform = await startPlatform({
    targets: { 'ensueno-curinanco': companyFor('ensueno-curinanco', TENANT_A, 'acc-ensueno') },
  })

  try {
    assertEqual(platform.report.bookingTargets, 1, 'only the registered target is enumerated')
    assertEqual(platform.report.uniqueTenants, 1, 'only the registered tenant is recovered')
    assertEqual(platform.tenantEntry(TENANT_C.id), null, 'the unregistered tenant must not get a recovery runtime')

    // 11. the unregistered tenant's overdue reservation is untouched — no global scan.
    assertEqual(reservationRow('res-c').status, RESERVATION_STATUS.REQUESTED, 'an unregistered tenant reservation must NOT expire')
    assertDeep(reservedFor(TENANT_C.id, 'acc-c'), [0, 0], 'no capacity may be released for an unregistered tenant')
    assertEqual(
      platform.capabilityRegistry.get('scheduler').manager.getJobs()
        .filter((j) => j.payload?.reservationId === 'res-c').length,
      0,
      'no job may be scheduled for an unregistered tenant'
    )
    // The registered tenant was still recovered, so this is scoping, not a silent no-op.
    assertEqual(reservationRow(resA).status, RESERVATION_STATUS.EXPIRED, 'the registered tenant must still be recovered')
  } finally {
    await platform.shutdown()
  }
})

// ---------------------------------------------------------------------------
// 13: cleanup
// ---------------------------------------------------------------------------

console.log('\ncleanup:')

await test('cleanup destroys tenant handlers, jobs and timers before the scheduler', async () => {
  InMemoryRepositoryAdapter.reset()
  const platform = await startPlatform({
    targets: { 'ensueno-curinanco': companyFor('ensueno-curinanco', TENANT_A, 'acc-ensueno') },
  })

  try {
    const resA = await bookThroughPublicAdapter(platform, 'ensueno-curinanco', TENANT_A, 'acc-ensueno')
    await platform.orchestrator.recover(getBookingRegistry())

    const scheduler = platform.capabilityRegistry.get('scheduler')
    const tenantTimer = platform.tenantRuntime(TENANT_A.id).timer
    const jobs = scheduler.manager.getJobs().filter((j) => j.payload?.reservationId === resA && j.status === 'pending')
    assertEqual(jobs.length, 1, 'the tenant must hold a queued job before cleanup')
    assertEqual(platform.orchestrator.size, 1, 'the tenant runtime must exist before cleanup')
    assert(tenantTimer.isActive, 'the tenant timer must be active before cleanup')
    // Its handler identity is its own, not the commercial capability's.
    assert(
      tenantTimer.handlerName !== platform.capabilityRegistry.get('reservation').timer.handlerName,
      `the tenant handler must be distinct from the commercial handler: ${tenantTimer.handlerName}`
    )

    // The orchestrator is destroyed while the scheduler is still alive.
    const result = await platform.orchestrator.destroy()
    assertEqual(result.destroyed, 1, 'one tenant runtime must be destroyed')
    assertEqual(platform.orchestrator.size, 0, 'the orchestrator must own nothing afterwards')
    assertEqual(tenantTimer.isActive, false, 'the tenant timer must be deactivated by cleanup')
    assertEqual(tenantTimer.getActiveTimers().length, 0, 'cleanup must drop every tenant timer')
    assertEqual(
      scheduler.manager.getJobs().filter((j) => j.payload?.reservationId === resA && j.status === 'pending').length,
      0,
      'cleanup must cancel the tenant queued jobs'
    )
    // The destroyed tenant handler must no longer expire anything.
    const late = await scheduler.run(jobs[0].id)
    assert(late?.success !== true, `a destroyed tenant handler must not run: ${JSON.stringify(late)}`)
    assertEqual(reservationRow(resA).status, RESERVATION_STATUS.REQUESTED, 'cleanup must not expire anything')
    assertDeep(reservedFor(TENANT_A.id, 'acc-ensueno'), [1, 1], 'cleanup must not release capacity')

    // Idempotent.
    assertEqual((await platform.orchestrator.destroy()).alreadyDestroyed, true, 'a second destroy must be a no-op')
  } finally {
    await platform.shutdown()
  }
})

// ---------------------------------------------------------------------------
// 14: failure visibility
// ---------------------------------------------------------------------------

console.log('\nfailure visibility:')

await test('a failed tenant recovery is visible in the aggregate report without failing startup', async () => {
  InMemoryRepositoryAdapter.reset()

  // The shared scheduler is removed before tenant recovery runs, so every tenant timer
  // cannot register its handler. Startup must report that, not throw.
  const runtime = await bootstrapRuntime({ eventBus: undefined, config: { runtime: {} } })
  runtime.repositoryRuntime.registerAdapter('mock', InMemoryRepositoryAdapter)
  registerRepositories(runtime.repositoryRuntime)
  const { registry, context } = await registerCapabilities(runtime, {
    tenant: { id: 'commercial', name: 'Commercial', slug: 'commercial' },
    configuration: {},
  })

  setBookingRegistry(createBookingRegistry({
    provision: {
      targets: { 'ensueno-curinanco': companyFor('ensueno-curinanco', TENANT_A, 'acc-ensueno') },
      noBooking: [],
    },
  }))

  registry.unregister('scheduler')

  let report = null
  let orchestrator = null
  try {
    const started = await startTenantReservationRecovery({
      runtime,
      capabilityContext: context,
      capabilityRegistry: registry,
      bookingRegistry: getBookingRegistry(),
      configuration: {},
    })
    orchestrator = started.orchestrator
    report = started.report

    // 14. visible in the aggregate report...
    assertEqual(report.status, 'degraded', 'the aggregate result must be degraded')
    assertEqual(report.reason, 'some_tenants_failed', 'the reason must be explicit')
    assertEqual(report.uniqueTenants, 1, 'the tenant must still be enumerated')
    assertEqual(report.sharedScheduler.reused, false, 'the missing scheduler must be reported')

    const entry = report.tenants.find((t) => t.tenantId === TENANT_A.id)
    assert(entry, 'the failing tenant must have an entry')
    assertEqual(entry.status, 'failed', 'the tenant entry must be failed')
    assertEqual(entry.reason, 'timer_not_registered', 'the reason must name the cause')
    assertEqual(entry.timerActivation.status, 'failed', 'the timer activation result must be reported')
    assertEqual(entry.recovery.status, 'skipped', 'recovery must be skipped, not silently attempted')
    assertEqual(report.totals.failed, 1, 'the failure must be counted')
    assertEqual(report.totals.ok, 0, 'a degraded pass must not also count as ok')
    assertEqual(orchestrator.size, 0, 'a tenant that failed activation must not be retained')

    // ...and nothing was expired.
    assertEqual(
      report.tenants.every((t) => (t.recovery?.reservations || []).length === 0),
      true,
      'a failed recovery must not have expired anything'
    )
  } finally {
    try { await orchestrator?.destroy() } catch { /* best-effort */ }
    for (const capability of registry.getAll()) {
      try { await capability.deactivate() } catch { /* best-effort */ }
      try { await capability.destroy() } catch { /* best-effort */ }
    }
    try { await runtime.engine.shutdown() } catch { /* best-effort */ }
    try { await runtime.engine.dispose() } catch { /* best-effort */ }
  }
})

// ---------------------------------------------------------------------------
// 14b: ownership of an attempt that is never adopted (ChatGPT Review Pass 6)
// ---------------------------------------------------------------------------

console.log('\nownership of an abandoned tenant attempt:')

/**
 * Record what every `ReservationTimer.activate()` saw, without changing behaviour.
 *
 * `startTenantReservationRecovery()` builds its tenant timers internally and returns no
 * reference when the attempt is abandoned, so the tests observe the attempt through the
 * prototype. Call-through patches only: production code is untouched.
 */
function recordTimerActivations() {
  const proto = ReservationTimer.prototype
  const original = proto.activate
  const records = []
  proto.activate = async function patchedActivate(...args) {
    const result = await original.apply(this, args)
    records.push({ timer: this, handler: this.handlerName, status: result?.status ?? null })
    return result
  }
  return {
    records,
    /** The commercial capability activates first, so the tenant attempt is the last one. */
    last: () => records[records.length - 1] || null,
    restore: () => { proto.activate = original },
  }
}

/**
 * Make ONE tenant's recovery throw unexpectedly, AFTER its timer handler was registered.
 *
 * `recoverFromPersistedState()` arms the recovered deadlines and only then calls the
 * existing sweep (`reservation.timer.js`), so throwing from `checkExpiration` reproduces
 * the worst case: a registered handler and a queued job exist when the attempt dies.
 * Scoped to the victim reservation, so the healthy tenant is untouched.
 */
function injectThrowAfterActivation({ reservationId }) {
  const proto = ReservationTimer.prototype
  const originalArm = proto.startReservationTimer
  const originalSweep = proto.checkExpiration
  let victimHandler = null

  proto.startReservationTimer = async function patchedArm(id, status, options) {
    if (id === reservationId) victimHandler = this.handlerName
    return originalArm.call(this, id, status, options)
  }

  proto.checkExpiration = async function patchedSweep(...args) {
    if (victimHandler && this.handlerName === victimHandler) {
      throw new Error('injected: unexpected throw after handler activation')
    }
    return originalSweep.apply(this, args)
  }

  return {
    victimHandler: () => victimHandler,
    restore() {
      proto.startReservationTimer = originalArm
      proto.checkExpiration = originalSweep
    },
  }
}

await test('an unexpected throw after activation leaves no orphaned timer, handler or job', async () => {
  InMemoryRepositoryAdapter.reset()
  const targets = {
    'ensueno-curinanco': companyFor('ensueno-curinanco', TENANT_A, 'acc-ensueno'),
    'otro-complejo': companyFor('otro-complejo', TENANT_B, 'acc-otro'),
  }

  // Pass 1 — two registered tenants, each holding capacity through the public write path.
  const seed = await startPlatform({ targets })
  let resA
  let resB
  try {
    resA = await bookThroughPublicAdapter(seed, 'ensueno-curinanco', TENANT_A, 'acc-ensueno')
    resB = await bookThroughPublicAdapter(seed, 'otro-complejo', TENANT_B, 'acc-otro')
    // A keeps a future deadline (armed, never due). B's deadline elapsed while down.
    agePersistedRow(resB, { createdAt: new Date(Date.now() - 13 * HOUR).toISOString() })
  } finally {
    await seed.shutdown()
  }

  // Pass 2 — restart; tenant A's recovery throws after its handler is registered.
  const injector = injectThrowAfterActivation({ reservationId: resA })
  let platform = null
  try {
    platform = await startPlatform({ targets })
    const scheduler = platform.capabilityRegistry.get('scheduler')

    // 1. the handler really was registered first.
    const victimHandler = injector.victimHandler()
    assert(victimHandler, 'the attempt must have armed the victim reservation, which only happens after activation')

    // 2/3. the outer `tenant_recovery_threw` reporting stays authoritative.
    assertEqual(platform.report.status, 'degraded', 'the aggregate result must be degraded')
    assertEqual(platform.report.reason, 'some_tenants_failed', 'the reason must be explicit')
    const failed = platform.tenantEntry(TENANT_A.id)
    assert(failed, 'the failing tenant must have an entry')
    assertEqual(failed.status, 'failed', 'the tenant must be reported failed')
    assertEqual(failed.reason, 'tenant_recovery_threw', 'the reason must be the outer throw reporting')
    assert(
      String(failed.error).includes('injected'),
      `the original error must be preserved: ${JSON.stringify(failed.error)}`
    )
    assertEqual(failed.runtime, null, 'a failed tenant must not report a runtime')

    // 4. nothing was adopted for the abandoned tenant.
    assertEqual(platform.orchestrator.size, 1, 'only the healthy tenant runtime may be retained')
    assertEqual(platform.tenantRuntime(TENANT_A.id), null, 'the abandoned tenant must have no runtime')

    // 5/6. the temporary handler was unregistered and its job cancelled, so neither the
    // scheduler nor a late delivery can still expire that tenant.
    const victimJobs = scheduler.manager.getJobs().filter((j) => j.payload?.reservationId === resA)
    assert(victimJobs.length > 0, 'the aborted attempt must have queued a job before it threw')
    assertEqual(
      victimJobs.filter((j) => j.status === 'pending').length,
      0,
      'no job of the abandoned attempt may remain pending'
    )
    for (const job of victimJobs) {
      const late = await scheduler.run(job.id)
      assert(late?.success !== true, `the unregistered temporary handler must not run: ${JSON.stringify(late)}`)
    }
    assertEqual(reservationRow(resA).status, RESERVATION_STATUS.REQUESTED, 'the abandoned tenant reservation must not expire')
    assertDeep(reservedFor(TENANT_A.id, 'acc-ensueno'), [1, 1], 'the abandoned tenant must keep its capacity')

    // 7. the healthy tenant recovered in the SAME aggregate pass.
    const healthy = platform.tenantEntry(TENANT_B.id)
    assertEqual(healthy?.status, 'ok', `the healthy tenant must still recover: ${JSON.stringify(healthy)}`)
    assert(platform.tenantRuntime(TENANT_B.id), 'the healthy tenant runtime must be retained')
    assertEqual(reservationRow(resB).status, RESERVATION_STATUS.EXPIRED, 'the healthy overdue reservation must expire')
    assertDeep(reservedFor(TENANT_B.id, 'acc-otro'), [0, 0], 'the healthy tenant must release its capacity')
    assertEqual(platform.report.totals.ok, 1, 'the healthy tenant must be counted as ok')
    assertEqual(platform.report.totals.failed, 1, 'the failed tenant must be counted as failed')

    // 8. cleanup remains idempotent.
    const first = await platform.orchestrator.destroy()
    assertEqual(first.destroyed, 1, 'only the retained runtime may be destroyed')
    assertEqual(platform.orchestrator.size, 0, 'the orchestrator must own nothing afterwards')
    assertEqual((await platform.orchestrator.destroy()).alreadyDestroyed, true, 'a second destroy must be a no-op')
  } finally {
    injector.restore()
    if (platform) await platform.shutdown()
  }
})

await test('the non-registered activation path leaves no temporary timer resources', async () => {
  InMemoryRepositoryAdapter.reset()
  const targets = { 'ensueno-curinanco': companyFor('ensueno-curinanco', TENANT_A, 'acc-ensueno') }

  const seed = await startPlatform({ targets })
  let resA
  try {
    resA = await bookThroughPublicAdapter(seed, 'ensueno-curinanco', TENANT_A, 'acc-ensueno')
  } finally {
    await seed.shutdown()
  }

  // Restart without a scheduler capability: activation cannot register a handler.
  const activations = recordTimerActivations()
  const runtime = await bootstrapRuntime({ eventBus: undefined, config: { runtime: {} } })
  runtime.repositoryRuntime.registerAdapter('mock', InMemoryRepositoryAdapter)
  registerRepositories(runtime.repositoryRuntime)
  const { registry, context } = await registerCapabilities(runtime, {
    tenant: { id: 'commercial', name: 'Commercial', slug: 'commercial' },
    configuration: {},
  })
  setBookingRegistry(createBookingRegistry({ provision: { targets, noBooking: [] } }))
  registry.unregister('scheduler')

  let orchestrator = null
  try {
    const started = await startTenantReservationRecovery({
      runtime,
      capabilityContext: context,
      capabilityRegistry: registry,
      bookingRegistry: getBookingRegistry(),
      configuration: {},
    })
    orchestrator = started.orchestrator
    const report = started.report

    const entry = report.tenants.find((t) => t.tenantId === TENANT_A.id)
    assertEqual(entry.status, 'failed', 'the tenant must be reported failed')
    assertEqual(entry.reason, 'timer_not_registered', 'the reason must name the cause')

    // The temporary timer built for this attempt was released, not left behind.
    const attempt = activations.last()
    assertEqual(activations.records.length, 2, 'exactly the commercial and the tenant attempt must have been activated')
    assert(attempt.timer, 'the tenant attempt must have built a timer')
    assertEqual(attempt.status, 'failed', 'the attempt must have failed to register its handler')
    assertEqual(attempt.timer.isActive, false, 'the temporary timer must not stay active')
    assertEqual(attempt.timer.getActiveTimers().length, 0, 'the temporary timer must hold no timer')
    assertEqual(orchestrator.size, 0, 'a failed activation must not be retained')
    assertEqual(
      entry.recovery.reservations.length,
      0,
      'a failed activation must not have recovered anything'
    )
    assertEqual(reservationRow(resA).status, RESERVATION_STATUS.REQUESTED, 'nothing may expire')
    assertDeep(reservedFor(TENANT_A.id, 'acc-ensueno'), [1, 1], 'capacity must be untouched')

    assertEqual((await orchestrator.destroy()).destroyed, 0, 'there is nothing owned to destroy')
    assertEqual((await orchestrator.destroy()).alreadyDestroyed, true, 'a second destroy must be a no-op')
  } finally {
    activations.restore()
    try { await orchestrator?.destroy() } catch { /* best-effort */ }
    for (const capability of registry.getAll()) {
      try { await capability.deactivate() } catch { /* best-effort */ }
      try { await capability.destroy() } catch { /* best-effort */ }
    }
    try { await runtime.engine.shutdown() } catch { /* best-effort */ }
    try { await runtime.engine.dispose() } catch { /* best-effort */ }
  }
})

// ---------------------------------------------------------------------------
// 15-16: shared scheduler, and the public Booking path untouched
// ---------------------------------------------------------------------------

console.log('\nshared scheduler and public booking behaviour:')

await test('the one shared SchedulerCapability serves every tenant; no scheduler per tenant', async () => {
  InMemoryRepositoryAdapter.reset()
  const platform = await startPlatform({
    targets: {
      'ensueno-curinanco': companyFor('ensueno-curinanco', TENANT_A, 'acc-ensueno'),
      'otro-complejo': companyFor('otro-complejo', TENANT_B, 'acc-otro'),
    },
  })

  try {
    // Exactly one scheduler capability in the commercial registry.
    const schedulers = platform.capabilityRegistry.getAll().filter((c) => c.id === 'scheduler')
    assertEqual(schedulers.length, 1, 'there must be exactly ONE SchedulerCapability')
    assertEqual(platform.report.sharedScheduler.reused, true, 'startup must report the shared scheduler as reused')

    // Every tenant timer resolved THAT instance, and each has its own handler identity.
    for (const tenantId of [TENANT_A.id, TENANT_B.id]) {
      const tenantRuntime = platform.tenantRuntime(tenantId)
      assertEqual(
        tenantRuntime.context.capabilities.get('scheduler'),
        schedulers[0],
        `tenant ${tenantId} must resolve the shared scheduler instance`
      )
    }
    const handlers = platform.orchestrator.list().map((r) => r.timer.handlerName)
    assertEqual(new Set(handlers).size, handlers.length, 'each tenant timer must have its own handler name')
    for (const handler of handlers) {
      assert(handler.startsWith('reservationExpiration:'), `unexpected handler identity: ${handler}`)
    }

    // Job ids are tenant-qualified, so two tenants can never collide.
    const resA = await bookThroughPublicAdapter(platform, 'ensueno-curinanco', TENANT_A, 'acc-ensueno')
    const resB = await bookThroughPublicAdapter(platform, 'otro-complejo', TENANT_B, 'acc-otro')
    await platform.orchestrator.recover(getBookingRegistry())

    const jobIds = platform.capabilityRegistry.get('scheduler').manager.getJobs()
      .filter((j) => j.status === 'pending')
      .map((j) => j.id)
    assertEqual(new Set(jobIds).size, jobIds.length, 'queued job ids must be unique across tenants')
    for (const id of jobIds.filter((id) => id.includes(resA))) {
      assert(id.includes(TENANT_A.id), `a tenant A job id must carry its tenant: ${id}`)
    }
    for (const id of jobIds.filter((id) => id.includes(resB))) {
      assert(id.includes(TENANT_B.id), `a tenant B job id must carry its tenant: ${id}`)
    }

    // The commercial capability still owns its own single instance.
    assertEqual(platform.capabilityRegistry.get('reservation').timer.handlerName.startsWith('reservationExpiration:'), true, 'the commercial timer must keep its own handler')
    assertEqual(platform.capabilityRegistry.size, 10, 'the commercial registry must still hold exactly ten capabilities')
  } finally {
    await platform.shutdown()
  }
})

await test('public BookingAdapter behaviour is unchanged by the startup recovery', async () => {
  InMemoryRepositoryAdapter.reset()
  const platform = await startPlatform({
    targets: {
      'ensueno-curinanco': companyFor('ensueno-curinanco', TENANT_A, 'acc-ensueno'),
      'otro-complejo': companyFor('otro-complejo', TENANT_B, 'acc-otro'),
    },
  })

  try {
    const adapter = createBookingAdapter(platform.apiContext, getBookingRegistry())
    const checkIn = dateOffset(1)
    const checkOut = dateOffset(3)
    seedBookingCatalog(TENANT_A, 'biz-ensueno-curinanco', 'acc-ensueno')
    seedBookingCatalog(TENANT_B, 'biz-otro-complejo', 'acc-otro')
    seedAvailability(TENANT_A.id, 'acc-ensueno', checkIn, checkOut)
    seedAvailability(TENANT_B.id, 'acc-otro', checkIn, checkOut)

    // Resolution states are unchanged.
    assertEqual(adapter.resolveCompany('desconocida').status, 404, 'unknown company must still be 404')
    assertEqual(adapter.resolveCompany('ensueno-curinanco').ok, true, 'a registered company must resolve')

    // A public booking still works after startup recovery, in the right tenant.
    const booked = await adapter.createReservation('otro-complejo', {
      guestName: 'Public Traveler',
      guestEmail: 'public@example.com',
      checkIn,
      checkOut,
      guestCount: 2,
    })
    assert(booked.ok === true, `the public booking must still succeed: ${JSON.stringify(booked)}`)
    const persisted = rows(RESERVATION_TABLE).find((r) => r.customer?.email === 'public@example.com')
    assert(persisted, 'the public reservation must be persisted')
    assertEqual(persisted.tenantId, TENANT_B.id, 'the public reservation must belong to the target tenant')
    assertEqual(persisted.status, RESERVATION_STATUS.REQUESTED, 'a new public reservation must be requested')

    // Its `requested` deadline is armed on the TENANT recovery runtime at create
    // time (BOOKING-EXPIRATION-LIVE-ARM-1), and a repeated recovery pass sees the
    // very same armed record - one writer, no divergence, deadline untouched.
    const tenantB = platform.tenantRuntime(TENANT_B.id)
    const again = await platform.orchestrator.recover(getBookingRegistry())
    const entry = again.tenants.find((t) => t.tenantId === TENANT_B.id)
    const recovered = entry.recovery.reservations.find((r) => r.reservationId === persisted.id)
    assert(recovered, `the tenant runtime must adopt the public reservation: ${JSON.stringify(entry.recovery.reservations)}`)
    assertEqual(recovered.outcome, 'armed', 'the public reservation deadline must be adopted as armed')
    assertDeep(reservedFor(TENANT_B.id, 'acc-otro'), [1, 1], 'the public booking must keep its capacity')
    assert(tenantB, 'tenant B runtime must still exist')
  } finally {
    await platform.shutdown()
  }
})

// ---------------------------------------------------------------------------
// BOOKING-EXPIRATION-LIVE-ARM-1 - live-process traveler arming
// ---------------------------------------------------------------------------

console.log('\nlive-process traveler arming (BOOKING-EXPIRATION-LIVE-ARM-1):')

await test('a public traveler reservation arms in its tenant runtime and expires in the SAME live process, without any restart', async () => {
  InMemoryRepositoryAdapter.reset()
  const platform = await startPlatform({
    targets: {
      'ensueno-curinanco': companyFor('ensueno-curinanco', TENANT_A, 'acc-ensueno'),
      'otro-complejo': companyFor('otro-complejo', TENANT_B, 'acc-otro'),
    },
  })

  try {
    // 1-2. One boot; the booking goes through the REAL public BookingAdapter path.
    // Inventory is seeded at 1 so the single requested unit makes checkout
    // exclusivity directly observable.
    seedBookingCatalog(TENANT_A, 'biz-ensueno-curinanco', 'acc-ensueno')
    seedAvailability(TENANT_A.id, 'acc-ensueno', dateOffset(1), dateOffset(3), 1)
    const adapter = createBookingAdapter(platform.apiContext, getBookingRegistry())
    const booked = await adapter.createReservation('ensueno-curinanco', {
      guestName: 'Live Traveler',
      guestEmail: 'live@example.com',
      checkIn: dateOffset(1),
      checkOut: dateOffset(3),
      guestCount: 2,
    })
    assert(booked.ok === true, `the public booking must succeed: ${JSON.stringify(booked)}`)
    // Public contract: the pre-existing confirmation payload shape - timer
    // arming state is process-internal and must never appear in it.
    const bookedSerialized = JSON.stringify(booked.data)
    assert(!('expiration' in (booked.data || {})), 'the public confirmation payload must not carry an expiration field')
    assert(!bookedSerialized.includes('expiration'), 'the public confirmation payload must not leak expiration infrastructure state')
    assert(!bookedSerialized.includes('armReservationTimer'), 'internal method names must not leak to the traveler')
    const id = booked.data.reservationId
    assertEqual(reservationRow(id).status, RESERVATION_STATUS.REQUESTED, 'the created reservation must be requested')

    // 3-4. Arming is proven through the ACTUAL tenant runtime: the CORRECT
    // runtime owns exactly one live timer; no other authority holds one for
    // this reservation.
    const runtimeA = platform.tenantRuntime(TENANT_A.id)
    assert(runtimeA, 'tenant A runtime must exist')
    const record = runtimeA.timer.getTimer(id, RESERVATION_STATUS.REQUESTED)
    assert(record?.active === true, `tenant A must own a live armed timer: ${JSON.stringify(record)}`)
    assertEqual(record.tenantId, TENANT_A.id, 'the armed timer record must carry tenant A')
    assertEqual(record.expiresAtMs - Date.parse(record.anchorAt), 12 * HOUR, 'the deadline must be anchor + the 12h TTL')
    assert(record.expiresAtMs > Date.now(), 'the deadline must be in the future at creation time')
    assertEqual(runtimeA.timer.getActiveTimers().filter((t) => t.reservationId === id).length, 1, 'exactly one armed record must exist')
    const runtimeB = platform.tenantRuntime(TENANT_B.id)
    assert(runtimeB, 'tenant B runtime must exist')
    assertEqual(runtimeB.timer.getTimer(id, RESERVATION_STATUS.REQUESTED), null, "tenant B must not hold tenant A's timer")
    assertEqual(platform.tenantEntry('commercial'), null, 'the synthetic commercial scope must not exist')
    assertDeep(reservedFor(TENANT_A.id, 'acc-ensueno'), [1, 1], 'the booking must consume the unit')

    // Checkout-exclusive while held: an overlapping public booking must fail.
    const conflict = await adapter.createReservation('ensueno-curinanco', {
      guestName: 'Conflict Traveler',
      guestEmail: 'conflict@example.com',
      checkIn: dateOffset(1),
      checkOut: dateOffset(3),
      guestCount: 1,
    })
    assert(conflict.ok === false, `an overlapping booking must be rejected while capacity is held: ${JSON.stringify(conflict)}`)
    assertDeep(reservedFor(TENANT_A.id, 'acc-ensueno'), [1, 1], 'the rejected booking must consume nothing')

    // 5. Deterministic clock advance past the TTL - same process, same runtime,
    // no restart, no recovery reconstruction. The due job is then delivered
    // through the REAL shared scheduler.
    const scheduler = platform.capabilityRegistry.get('scheduler')
    const job = scheduler.manager.getJob(record.jobId)
    assert(job?.status === 'pending', `the armed deadline must have a pending job: ${JSON.stringify(job)}`)

    const realNow = Date.now
    Date.now = () => realNow() + 13 * HOUR
    try {
      const delivered = await scheduler.run(record.jobId)
      assert(delivered?.success === true, `the scheduler must deliver the due job: ${JSON.stringify(delivered)}`)

      // 6. Transition to expired in the same live process.
      assertEqual(reservationRow(id).status, RESERVATION_STATUS.EXPIRED, 'the reservation must expire without any restart')

      // 7. The reservation line is released exactly once.
      const lines = rows('reservation_lines').filter((l) => l.reservationId === id)
      assertEqual(lines.length, 1, 'exactly one reservation line must exist')
      assert(lines[0].releasedAt, 'the reservation line must be released')

      // 8. Capacity restored exactly once, and the timer settled.
      assertDeep(reservedFor(TENANT_A.id, 'acc-ensueno'), [0, 0], 'availability must be restored exactly once')
      assertEqual(runtimeA.timer.getActiveTimers().filter((t) => t.reservationId === id).length, 0, 'a committed expiration must leave no live timer')
    } finally {
      Date.now = realNow
    }

    // 9. Checkout-exclusive remains correct AFTER expiry: the freed unit is
    // bookable again by a new traveler booking.
    const rebooked = await adapter.createReservation('ensueno-curinanco', {
      guestName: 'Second Traveler',
      guestEmail: 'second@example.com',
      checkIn: dateOffset(1),
      checkOut: dateOffset(3),
      guestCount: 1,
    })
    assert(rebooked.ok === true, `the freed unit must be bookable again: ${JSON.stringify(rebooked)}`)
    assert(rebooked.data.reservationId !== id, 'the rebooking must be a new reservation')
    assertDeep(reservedFor(TENANT_A.id, 'acc-ensueno'), [1, 1], 'the new booking must consume the freed unit exactly once')
  } finally {
    await platform.shutdown()
  }
})

await test('traveler arming is tenant-isolated: a booking arms only its own tenant runtime, and a foreign tenant can never arm', async () => {
  InMemoryRepositoryAdapter.reset()
  const platform = await startPlatform({
    targets: {
      'ensueno-curinanco': companyFor('ensueno-curinanco', TENANT_A, 'acc-ensueno'),
      'otro-complejo': companyFor('otro-complejo', TENANT_B, 'acc-otro'),
    },
  })

  try {
    const idA = await bookThroughPublicAdapter(platform, 'ensueno-curinanco', TENANT_A, 'acc-ensueno')
    const idB = await bookThroughPublicAdapter(platform, 'otro-complejo', TENANT_B, 'acc-otro', { guestEmail: 'b@example.com' })

    const runtimeA = platform.tenantRuntime(TENANT_A.id)
    const runtimeB = platform.tenantRuntime(TENANT_B.id)

    // Each booking armed ONLY in its own tenant's runtime, under its own tenant id.
    const recordA = runtimeA.timer.getTimer(idA, RESERVATION_STATUS.REQUESTED)
    const recordB = runtimeB.timer.getTimer(idB, RESERVATION_STATUS.REQUESTED)
    assert(recordA?.active === true && recordA.tenantId === TENANT_A.id, 'tenant A must own its own timer')
    assert(recordB?.active === true && recordB.tenantId === TENANT_B.id, 'tenant B must own its own timer')
    assertEqual(runtimeA.timer.getTimer(idB, RESERVATION_STATUS.REQUESTED), null, "tenant A's runtime must not hold tenant B's reservation")
    assertEqual(runtimeB.timer.getTimer(idA, RESERVATION_STATUS.REQUESTED), null, "tenant B's runtime must not hold tenant A's reservation")

    // An unregistered tenant can never arm at all.
    const unknown = await platform.orchestrator.armReservationTimer('tenant-not-in-registry', {
      id: idA, status: RESERVATION_STATUS.REQUESTED, createdAt: new Date().toISOString(),
    })
    assertEqual(unknown.armed, false, 'an unregistered tenant must not arm')
    assertEqual(unknown.status, 'unavailable', 'an unregistered tenant must be reported unavailable')

    // A mismatched tenant can never plant a timer for a foreign row: the armed
    // reservation must belong to the tenant runtime asked to arm it.
    const mismatch = await platform.orchestrator.armReservationTimer(TENANT_A.id, reservationRow(idB))
    assertEqual(mismatch.armed, false, 'a foreign reservation must not be armed under another tenant')
    assertEqual(mismatch.status, 'foreign_tenant', 'a tenant mismatch must be refused')
    assertEqual(runtimeA.timer.getTimer(idB, RESERVATION_STATUS.REQUESTED), null, 'no timer record may exist for the refused arm')
  } finally {
    await platform.shutdown()
  }
})

await test('a failed timer-arm never rolls back a persisted reservation, stays observable server-side, and never leaks into the traveler response', async () => {
  InMemoryRepositoryAdapter.reset()
  const platform = await startPlatform({
    targets: { 'ensueno-curinanco': companyFor('ensueno-curinanco', TENANT_A, 'acc-ensueno') },
  })

  try {
    // Seed the catalog and capacity the public write path needs, THEN destroy
    // tenant A's runtime BEFORE the booking: arming must report the failure
    // rather than succeed against dead timers.
    seedBookingCatalog(TENANT_A, 'biz-ensueno-curinanco', 'acc-ensueno')
    seedAvailability(TENANT_A.id, 'acc-ensueno', dateOffset(1), dateOffset(3))
    await platform.tenantRuntime(TENANT_A.id).destroy()

    const adapter = createBookingAdapter(platform.apiContext, getBookingRegistry())

    // The failure must remain operationally observable server-side: capture the
    // bounded arm-failure log line emitted inside the adapter.
    const operationalLogs = []
    const realConsoleError = console.error
    console.error = (...args) => {
      operationalLogs.push(args.map(String).join(' '))
      realConsoleError(...args)
    }

    let result
    try {
      result = await adapter.createReservation('ensueno-curinanco', {
        guestName: 'Degraded Traveler',
        guestEmail: 'degraded@example.com',
        checkIn: dateOffset(1),
        checkOut: dateOffset(3),
        guestCount: 2,
      })
    } finally {
      console.error = realConsoleError
    }

    // The durably-persisted reservation is NEVER rolled back and never throws.
    assert(result.ok === true && result.status === 201, `the persisted reservation must still succeed: ${JSON.stringify(result)}`)
    const id = result.data.reservationId
    assertEqual(reservationRow(id).status, RESERVATION_STATUS.REQUESTED, 'the reservation must remain requested')
    assertDeep(reservedFor(TENANT_A.id, 'acc-ensueno'), [1, 1], 'capacity must remain held - no rollback')

    // Operationally observable server-side: an arm-failure log line names the
    // reservation, but no internal reason/method state leaks into the payload.
    const armLog = operationalLogs.find((line) => line.includes('Expiration timer') && line.includes(id))
    assert(armLog, `the arm failure must be logged server-side: ${JSON.stringify(operationalLogs)}`)

    // The public response keeps the pre-existing contract: no expiration
    // infrastructure field and no internal failure reason or method name.
    const serialized = JSON.stringify(result.data)
    assert(!('expiration' in (result.data || {})), 'the public confirmation payload must not carry an expiration field')
    assert(!serialized.includes('expiration'), 'the public payload must not expose expiration infrastructure state')
    assert(!serialized.includes('tenant_runtime_unavailable'), 'internal arm reasons must not leak to the traveler')
    assert(!serialized.includes('tenant_recovery_not_initialized'), 'internal arm reasons must not leak to the traveler')
    assert(!serialized.includes('armReservationTimer'), 'internal method names must not leak to the traveler')

    // No usable timer authority exists for it anywhere.
    const runtimeA = platform.tenantRuntime(TENANT_A.id)
    assert(!runtimeA || !runtimeA.usable, 'no usable tenant runtime may remain')
    if (runtimeA?.timer) {
      assertEqual(runtimeA.timer.getActiveTimers().filter((t) => t.reservationId === id).length, 0, 'no live timer may exist for the failed arm')
    }
  } finally {
    await platform.shutdown()
  }
})

await test('a repeated arm of the same traveler reservation is idempotent: one timer, one job, one release', async () => {
  InMemoryRepositoryAdapter.reset()
  const platform = await startPlatform({
    targets: { 'ensueno-curinanco': companyFor('ensueno-curinanco', TENANT_A, 'acc-ensueno') },
  })

  try {
    const id = await bookThroughPublicAdapter(platform, 'ensueno-curinanco', TENANT_A, 'acc-ensueno')
    const runtimeA = platform.tenantRuntime(TENANT_A.id)
    const first = runtimeA.timer.getTimer(id, RESERVATION_STATUS.REQUESTED)
    assert(first?.active === true, 'the create-time arm must be live')

    // A duplicate arm - through the same authority a repeated create or a
    // recovery pass would use - must keep the original deadline.
    const again = await platform.orchestrator.armReservationTimer(TENANT_A.id, reservationRow(id))
    assertEqual(again.armed, true, 'a duplicate arm must still report armed')
    const second = runtimeA.timer.getTimer(id, RESERVATION_STATUS.REQUESTED)
    assert(second?.active === true, 'the timer must still be live after a duplicate arm')
    assertEqual(second.expiresAtMs, first.expiresAtMs, 'a duplicate arm must keep the original deadline')
    assertEqual(second.anchorAt, first.anchorAt, 'a duplicate arm must keep the original anchor')
    assertEqual(runtimeA.timer.getActiveTimers().filter((t) => t.reservationId === id).length, 1, 'exactly one armed record may exist')

    const scheduler = platform.capabilityRegistry.get('scheduler')
    const pending = scheduler.manager.getJobs().filter((j) => j.payload?.reservationId === id && j.status === 'pending')
    assertEqual(pending.length, 1, 'exactly one pending expiration job may exist')

    // Expire once: one delivery, one release.
    const realNow = Date.now
    Date.now = () => realNow() + 13 * HOUR
    try {
      const delivered = await scheduler.run(second.jobId)
      assert(delivered?.success === true, `the scheduler must deliver the due job: ${JSON.stringify(delivered)}`)
    } finally {
      Date.now = realNow
    }
    assertEqual(reservationRow(id).status, RESERVATION_STATUS.EXPIRED, 'the reservation must expire')
    const lines = rows('reservation_lines').filter((l) => l.reservationId === id)
    assertEqual(lines.length, 1, 'exactly one line must exist')
    assert(lines[0].releasedAt, 'the line must be released')
    assertDeep(reservedFor(TENANT_A.id, 'acc-ensueno'), [0, 0], 'capacity must be restored exactly once')

    // An expired reservation can never be re-armed or re-released.
    const post = await platform.orchestrator.armReservationTimer(TENANT_A.id, reservationRow(id))
    assertEqual(post.armed, false, 'an expired reservation must not be re-armed')
    assertDeep(reservedFor(TENANT_A.id, 'acc-ensueno'), [0, 0], 'no second release may occur')
    assertEqual(runtimeA.timer.getActiveTimers().filter((t) => t.reservationId === id).length, 0, 'no live timer may exist after expiry')
  } finally {
    await platform.shutdown()
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

// Booting the platform repeatedly leaves engine handles open. Every assertion above has
// already run, so exit deterministically instead of waiting on the event loop.
process.exit(failed > 0 ? 1 : 0)