/**
 * BOOKING-EXPIRATION-STAGE-1 - the synthetic commercial tenant must not reach a
 * persisted reservation read.
 *
 * Stage finding #2. After the certified 22-file delta was deployed and Passenger
 * restarted, `error.log` showed, repeatedly:
 *
 *   [PostgreSQL] Query error:
 *   SELECT * FROM reservations WHERE status = $1 AND tenant_id = $2 ...
 *   error: invalid input syntax for type uuid: "commercial"
 *
 * Why adding SchedulerCapability exposed it: without a scheduler the timer could
 * not register, so `ReservationCapability.activate()` never took the recovery
 * branch. With the scheduler present, `activate()` called
 * `recoverFromPersistedState()`, which delegates to
 * `manager.findReservationsByStatus()`, which put the CONTEXT tenant into the
 * uuid `tenant_id` predicate. The commercial boot context's tenant is the
 * synthetic `{ id: 'commercial' }`, so a non-uuid string reached a uuid column.
 *
 * This suite drives `ReservationCapability.init()` + `activate()` against a
 * repositories facade that RECORDS every persisted read, so the regression is
 * asserted on what was actually queried rather than on a report string.
 */
import { ReservationCapability } from './reservation.capability.js'
import { RESERVATION_STATUS } from './reservation.status.js'
import {
  SYNTHETIC_COMMERCIAL_TENANT_ID,
  isPersistedTenantScope,
} from './reservation.manager.js'

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

const COMMERCIAL_TENANT = { id: SYNTHETIC_COMMERCIAL_TENANT_ID, name: 'Commercial', slug: 'commercial' }
const REAL_TENANT_ID = '6f1c2a80-5d3e-4f17-9b64-2c8e0a71d4f5'
const REAL_TENANT = { id: REAL_TENANT_ID, name: 'Ensueño Curiñanco', slug: 'ensueno-curinanco' }

/**
 * A repositories facade that records every persisted read it is asked for,
 * including the tenant scope each read was resolved under. This is the seam the
 * Stage bug actually used, so it is what the assertions observe.
 */
function recordingRepositories(rows = []) {
  const reads = []
  return {
    reads,
    reservation: {
      async findMany(query) {
        // The context tenant is what BaseRepository would spread over the query,
        // so record it the same way the real facade would scope it.
        reads.push({ method: 'findMany', query: { ...query } })
        return rows.filter((r) => !query?.status || r.status === query.status)
      },
      async findById(id) {
        reads.push({ method: 'findById', query: { id } })
        return rows.find((r) => r.id === id) || null
      },
    },
  }
}

/** A scheduler capability stub standing in for the one shared SchedulerCapability. */
function schedulerStub() {
  const handlers = new Map()
  const jobs = []
  return {
    handlers,
    jobs,
    registerHandler(name, fn) { handlers.set(name, fn) },
    async unregisterHandler(name) { handlers.delete(name) },
    schedule(job) { jobs.push(job); return { success: true, jobId: job.id } },
    getJob(id) { return jobs.find((j) => j.id === id) || null },
    /**
     * The timer registers under an instance-scoped name
     * (`reservationExpiration:<instanceId>`), so match on the stable prefix.
     */
    handlerNames() { return [...handlers.keys()]; },
    hasExpirationHandler() {
      return [...handlers.keys()].some((name) => name.startsWith('reservationExpiration'))
    },
  }
}

function contextFor({ tenant, repositories }) {
  const scheduler = schedulerStub()
  const capabilities = {
    get: (id) => (id === 'scheduler' ? scheduler : null),
    has: (id) => id === 'scheduler',
  }
  return {
    context: {
      tenant,
      capabilities,
      dataManager: null,
      provider: 'postgres',
      eventBus: { emit: () => {}, on: () => {}, once: () => {} },
      config: {},
      runtime: { search: null, sync: null },
      repositories,
    },
    scheduler,
  }
}

// ---------------------------------------------------------------------------

console.log('\nsynthetic tenant scope predicate:')

await test('the synthetic commercial tenant id is not a persisted tenant scope', async () => {
  assertEqual(SYNTHETIC_COMMERCIAL_TENANT_ID, 'commercial', 'the bootstrap constant is the literal it always was')
  assertEqual(isPersistedTenantScope('commercial'), false, 'commercial is not a persisted scope')
})

await test('a real uuid tenant is a persisted tenant scope', async () => {
  assertEqual(isPersistedTenantScope(REAL_TENANT_ID), true, 'a real uuid tenant is a legitimate scope')
})

await test('absent, blank and non-string tenants are not persisted scopes', async () => {
  for (const value of [null, undefined, '', '   ', 42, {}]) {
    assertEqual(isPersistedTenantScope(value), false, `${JSON.stringify(value)} is not a persisted scope`)
  }
})

await test('the predicate refuses only the synthetic id, not unknown real tenant forms', async () => {
  // Deliberately not a UUID: the rule is "not the synthetic bootstrap tenant",
  // so a new persisted tenant naming form is not silently refused.
  assertEqual(isPersistedTenantScope('tenant-42'), true, 'an opaque but real tenant id is allowed')
})

// ---------------------------------------------------------------------------

console.log('\nsynthetic commercial bootstrap (Stage finding #2):')

await test('activation under tenant `commercial` issues NO persisted reservation read', async () => {
  const repositories = recordingRepositories()
  const { context } = contextFor({ tenant: COMMERCIAL_TENANT, repositories })
  const capability = new ReservationCapability()

  try {
    await capability.init(context, {})
    await capability.activate()

    assertEqual(
      repositories.reads.length,
      0,
      `no persisted read may be issued under the synthetic tenant, but saw: ${JSON.stringify(repositories.reads)}`
    )
  } finally {
    await capability.destroy()
  }
})

await test('activation under `commercial` reports the skip instead of a silent success', async () => {
  const repositories = recordingRepositories()
  const { context } = contextFor({ tenant: COMMERCIAL_TENANT, repositories })
  const capability = new ReservationCapability()

  try {
    await capability.init(context, {})
    await capability.activate()

    const report = capability.expirationRecovery
    assert(report, 'a recovery report must always be exposed')
    assertEqual(report.status, 'skipped', `recovery must be skipped: ${JSON.stringify(report)}`)
    assertEqual(report.reason, 'synthetic_tenant_scope', 'the skip must name the cause')
    assertEqual(report.tenantId, 'commercial', 'the report must name the offending bootstrap tenant')
    assertEqual(report.reservations.length, 0, 'nothing may be recovered under the synthetic tenant')
    assert(
      typeof report.error === 'string' && report.error.includes('startTenantReservationRecovery'),
      `the report must point at the real recovery owner: ${JSON.stringify(report)}`
    )
  } finally {
    await capability.destroy()
  }
})

await test('activation under `commercial` does not hydrate persisted reservations either', async () => {
  const repositories = recordingRepositories([
    { id: 'res-1', tenantId: REAL_TENANT_ID, status: RESERVATION_STATUS.REQUESTED },
  ])
  const { context } = contextFor({ tenant: COMMERCIAL_TENANT, repositories })
  const capability = new ReservationCapability()

  try {
    await capability.init(context, {})
    assertEqual(
      repositories.reads.length,
      0,
      'init() must not hydrate persisted rows under the synthetic tenant'
    )
    await capability.activate()
    assertEqual(repositories.reads.length, 0, 'activate() must not read persisted rows either')
  } finally {
    await capability.destroy()
  }
})

await test('a row owned by another tenant is still never enumerated under `commercial`', async () => {
  const repositories = recordingRepositories([
    { id: 'res-1', tenantId: REAL_TENANT_ID, status: RESERVATION_STATUS.REQUESTED },
  ])
  const { context } = contextFor({ tenant: COMMERCIAL_TENANT, repositories })
  const capability = new ReservationCapability()

  try {
    await capability.init(context, {})
    await capability.activate()
    assertEqual(
      repositories.reads.length,
      0,
      'no cross-tenant enumeration may be attempted from the synthetic tenant'
    )
  } finally {
    await capability.destroy()
  }
})

// ---------------------------------------------------------------------------

console.log('\nreal tenant recovery is unaffected:')

await test('a real uuid tenant still recovers its persisted expirable reservations', async () => {
  // A FRESH persisted entry: the point of this case is that recovery enumerates
  // and arms a real tenant's reservation. The overdue case (recovery arriving
  // after the deadline elapsed, which then has to expire atomically and release
  // capacity) is covered by the certified BOOKING-EXPIRATION-RECOVERY-1 suite.
  const anchor = new Date().toISOString()
  const repositories = recordingRepositories([
    { id: 'res-1', tenantId: REAL_TENANT_ID, status: RESERVATION_STATUS.REQUESTED, createdAt: anchor },
  ])
  const { context } = contextFor({ tenant: REAL_TENANT, repositories })
  const capability = new ReservationCapability()

  try {
    await capability.init(context, {})
    await capability.activate()

    assert(
      repositories.reads.length > 0,
      'a persisted tenant must still read its own expirable reservations'
    )

    const report = capability.expirationRecovery
    assertEqual(report.status, 'ok', `recovery must succeed for a persisted tenant: ${JSON.stringify(report)}`)
    assertEqual(report.tenantId, REAL_TENANT_ID, 'the report must carry the real tenant')
    assertEqual(report.scanned, 1, 'the persisted expirable reservation must be seen')
    assertEqual(report.reservations.length, 1, 'exactly one reservation must be reported')

    const entry = report.reservations[0]
    assertEqual(entry.outcome, 'armed', `the timer must be armed: ${JSON.stringify(entry)}`)
    assertEqual(entry.anchorAt, anchor, 'the deadline must stay anchored to the persisted entry timestamp')

    const record = capability.timer.getTimer('res-1', RESERVATION_STATUS.REQUESTED)
    assert(record, 'a recovered timer must exist for the persisted reservation')
    assertEqual(record.tenantId, REAL_TENANT_ID, 'the recovered timer must carry the real tenant')
  } finally {
    await capability.destroy()
  }
})

await test('every expirable status is still recovered for a real tenant', async () => {
  for (const status of [
    RESERVATION_STATUS.REQUESTED,
    RESERVATION_STATUS.OWNER_PENDING,
    RESERVATION_STATUS.PAYMENT_PENDING,
  ]) {
    const anchor = new Date(Date.now() - 60 * 1000).toISOString()
    const repositories = recordingRepositories([
      { id: `res-${status}`, tenantId: REAL_TENANT_ID, status, createdAt: anchor, updatedAt: anchor },
    ])
    const { context } = contextFor({ tenant: REAL_TENANT, repositories })
    const capability = new ReservationCapability()

    try {
      await capability.init(context, {})
      await capability.activate()
      const report = capability.expirationRecovery
      assertEqual(report.status, 'ok', `${status} must recover: ${JSON.stringify(report)}`)
      assert(
        capability.timer.getTimer(`res-${status}`, status) !== null,
        `${status} must have an armed timer`
      )
    } finally {
      await capability.destroy()
    }
  }
})

// ---------------------------------------------------------------------------

console.log('\nscheduler stays shared and active:')

await test('the expiration handler is still registered under the synthetic tenant', async () => {
  const repositories = recordingRepositories()
  const { context, scheduler } = contextFor({ tenant: COMMERCIAL_TENANT, repositories })
  const capability = new ReservationCapability()

  try {
    await capability.init(context, {})
    await capability.activate()

    // Suppressing the recovery sweep must NOT suppress the timer. Automatic
    // expiration for live requests still depends on this handler existing.
    assertEqual(
      capability.timerActivation.status,
      'registered',
      `the expiration handler must still register: ${JSON.stringify(capability.timerActivation)}`
    )
    assert(
      scheduler.hasExpirationHandler(),
      `the shared scheduler must hold the reservationExpiration handler, saw ${JSON.stringify(scheduler.handlerNames())}`
    )
  } finally {
    await capability.destroy()
  }
})

await test('no second scheduler is created for the synthetic tenant', async () => {
  const repositories = recordingRepositories()
  const { context, scheduler } = contextFor({ tenant: COMMERCIAL_TENANT, repositories })
  const capability = new ReservationCapability()

  try {
    await capability.init(context, {})
    await capability.activate()
    assertEqual(
      scheduler.handlers.size,
      1,
      `exactly one handler on the one shared scheduler, saw ${scheduler.handlers.size}`
    )
  } finally {
    await capability.destroy()
  }
})

await test('destroying the capability leaves the shared scheduler clean', async () => {
  const repositories = recordingRepositories()
  const { context, scheduler } = contextFor({ tenant: COMMERCIAL_TENANT, repositories })
  const capability = new ReservationCapability()

  await capability.init(context, {})
  await capability.activate()
  assertEqual(scheduler.handlers.size, 1, 'the handler must be registered before destroy')

  await capability.destroy()
  assertEqual(
    scheduler.handlers.size,
    0,
    `destroy must unregister the handler from the shared scheduler, saw ${JSON.stringify(scheduler.handlerNames())}`
  )
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