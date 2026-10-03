/**
 * BOOKING-MOCK-CANCEL-ATOMIC-1 - synchronous mock cancellation.
 *
 * THIS EXERCISES THE REAL ReservationRepository and the REAL writable
 * InMemoryRepositoryAdapter. Nothing is re-implemented here and no production
 * logic is copied into this file; the repository is imported from its own
 * module and its real public `cancelReservationWithRelease` is called.
 *
 * HOW PHYSICAL DATABASE ACCESS IS PREVENTED
 * Identical to reservation.repository.occupied-nights.test.js: the
 * module-customization hooks in test-support/pg-fail-closed-hooks.mjs are
 * registered BEFORE the repository module is imported, so every bare `pg`
 * import resolves to a double and the genuine driver is never loaded. The mock
 * cancellation path never reaches the connection manager, but the boundary is
 * installed anyway so importing the repository cannot open a pool. The
 * guarantee is narrow: it intercepts the bare specifier `pg` and nothing else,
 * and this file performs no Pool.connect, no query, no socket, no bootstrap,
 * no HTTP request and no Stage access.
 *
 * WHAT IS AND IS NOT CERTIFIED
 * Certified here: the in-memory cancellation is synchronous and all-or-nothing
 * within one process — validation completes before any write, every
 * replacement object is prepared up front, no stored row is mutated in place,
 * and a failure at any publication step leaves the reservation, availability
 * and reservation-line tables byte-identical to their pre-call state.
 * NOT certified: anything about a database. There is no transaction here. This
 * is in-process and turn-bounded only: no crash durability, no cross-process
 * isolation, and no protection against a writer outside this process.
 *
 * Failure injection is controlled and SYNCHRONOUS: it replaces the `set` of one
 * named table for the duration of one call, so the throw happens inside the
 * publication section. Nothing is scheduled, queued or deferred.
 *
 * Framework-free. No database, network, provisioning or dependency install.
 *
 * Run: node capabilities/persistence/repositories/reservation/reservation.repository.mock-cancel-atomic.test.js
 */

import { InMemoryRepositoryAdapter } from '../../../../tests/capability/capability.mock.repositories.js'
import {
  AvailabilityConflictError,
} from '../../../availability/availability.errors.js'
import { RepositoryValidationError } from '../../errors/repository.errors.js'
import {
  installPgDouble,
  assertPgIsDoubled,
  addDays,
  civilRange,
  REPOSITORY_URL,
} from './test-support/reservation.repository.test-support.mjs'

installPgDouble()
const { ReservationRepository } = await import(REPOSITORY_URL)

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

async function assertRejects(fn, expectedName, label) {
  let thrown = null
  try {
    await fn()
  } catch (error) {
    thrown = error
  }
  if (thrown === null) throw new Error(`${label}: expected a throw, but nothing was thrown`)
  if (thrown?.constructor?.name !== expectedName && thrown?.name !== expectedName) {
    throw new Error(`${label}: expected ${expectedName}, got ${thrown?.constructor?.name || thrown?.name}: ${thrown.message}`)
  }
  return thrown
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const TENANT = 'tenant-1'
const CABIN = 'cab-1'
const RES_ID = 'res-1'
const START = '2026-04-03'
const NIGHTS = 2
const END = addDays(START, NIGHTS)

/** Table keys, read from the code rather than assumed. */
const RESERVATION_TABLE = 'reservation'   // InMemoryRepositoryAdapter entityName
const AVAILABILITY_TABLE = 'availability' // reservation.repository.js, store.get('availability')
const LINE_TABLE = 'reservation_lines'    // reservation.repository.js, store.get('reservation_lines')

/**
 * A repository on the real writable in-memory adapter.
 *
 * `provider.name` is deliberately not 'postgres' so cancelReservationWithRelease
 * takes its in-memory branch. The reservation table key comes from the adapter's
 * own entityName, exactly as the adapter's update()/create() would use it.
 */
async function mockRepo({ tenant = TENANT, contextExtras = {} } = {}) {
  InMemoryRepositoryAdapter.reset()
  const adapter = new InMemoryRepositoryAdapter({ name: 'mock' }, { entityName: RESERVATION_TABLE })
  const store = InMemoryRepositoryAdapter.store
  store.set(RESERVATION_TABLE, new Map())
  store.set(AVAILABILITY_TABLE, new Map())
  store.set(LINE_TABLE, new Map())
  const repo = new ReservationRepository(adapter, {
    tenant: { id: tenant },
    capabilities: { get: () => null },
    ...contextExtras,
  })
  await repo.initialize()
  return { repo, store }
}

function seedReservation(store, overrides = {}) {
  const row = {
    id: RES_ID,
    tenantId: TENANT,
    accommodationId: CABIN,
    status: 'confirmed',
    notes: null,
    cancelledAt: null,
    specialRequests: null,
    channel: null,
    deletedAt: null,
    ...overrides,
  }
  store.get(RESERVATION_TABLE).set(row.id, row)
  return row
}

function seedAvailability(store, date, overrides = {}) {
  const row = {
    id: `av-${CABIN}-${date}`,
    tenantId: TENANT,
    accommodationId: CABIN,
    date,
    inventory: 2,
    reservedCount: 2,
    available: 0,
    status: 'reserved',
    isBlocked: false,
    ...overrides,
  }
  store.get(AVAILABILITY_TABLE).set(row.id, row)
  return row
}

/** A line carrying a valid version-1 record over [start, start+nights). */
function seedRecordedLine(store, {
  id = 'line-1',
  dates = civilRange(START, NIGHTS),
  quantity = NIGHTS,
  targetId = CABIN,
  reservationId = RES_ID,
} = {}) {
  const line = {
    id,
    reservationId,
    lineOrder: 1,
    targetType: 'accommodation',
    targetId,
    temporal: { mode: 'DATE_RANGE', startDate: dates[0], endDate: addDays(dates[dates.length - 1], 1) },
    quantity,
    metadata: { __occupiedNights: { version: 1, dates: [...dates], quantity } },
    releasedAt: null,
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-04-01T00:00:00.000Z',
  }
  store.get(LINE_TABLE).set(line.id, line)
  return line
}

const cancelPayload = (overrides = {}) => ({
  id: RES_ID,
  tenantId: TENANT,
  accommodationId: CABIN,
  status: 'cancelled',
  cancelledAt: '2026-04-02T00:00:00.000Z',
  notes: 'guest request',
  ...overrides,
})

const reservedCounts = (store) =>
  [...store.get(AVAILABILITY_TABLE).values()].sort((a, b) => (a.date < b.date ? -1 : 1)).map((r) => r.reservedCount)

/**
 * A stable, complete snapshot of the three stores this operation may touch.
 * Compared with deep equality on failure paths, so any surviving write — a
 * changed value, an extra key or a missing key — fails the assertion.
 */
function snapshotAll(store) {
  const take = (name) => {
    const table = store.get(name)
    if (!table) return null
    return [...table.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([k, v]) => [k, v])
  }
  return JSON.stringify({
    reservation: take(RESERVATION_TABLE),
    availability: take(AVAILABILITY_TABLE),
    lines: take(LINE_TABLE),
  })
}

function assertStoresUnchanged(store, before, label) {
  const after = snapshotAll(store)
  if (after !== before) {
    throw new Error(`${label}: stores must be unchanged\n  before: ${before}\n  after:  ${after}`)
  }
}

/**
 * Replace `table.set` for one call so the Nth publication write throws.
 *
 * Synchronous and deterministic: the throw happens inside the publication
 * section, on the write itself, with nothing scheduled. The replacement is an
 * own property, so deleting it restores the prototype method.
 */
function injectSetFailure(table, ordinal, label = 'INJECTED_SET_FAILURE') {
  const original = table.set
  let calls = 0
  table.set = function injectedSet(key, value) {
    calls += 1
    if (calls === ordinal) throw new Error(`${label}@${ordinal}`)
    return Map.prototype.set.call(this, key, value)
  }
  return {
    calls: () => calls,
    restore: () => { table.set = original },
  }
}

console.log('\nBOOKING-MOCK-CANCEL-ATOMIC-1 - synchronous mock cancellation\n')

// ---------------------------------------------------------------------------
// 1. Fail-closed database boundary
// ---------------------------------------------------------------------------

await test('bare specifier "pg" resolves to the fail-closed double, not the real driver', async () => {
  assertEqual(await assertPgIsDoubled(), true, 'pg double must be installed')
})

// ---------------------------------------------------------------------------
// 2. Successful cancellation
// ---------------------------------------------------------------------------

await test('a recorded line releases its dates and publishes the cancelled status', async () => {
  const { repo, store } = await mockRepo()
  seedReservation(store)
  seedAvailability(store, START)
  seedAvailability(store, addDays(START, 1))
  seedRecordedLine(store)

  const result = await repo.cancelReservationWithRelease(cancelPayload(), TENANT)

  assertEqual(result?.status, 'cancelled', 'the returned reservation must be the cancelled one')
  assertEqual(store.get(RESERVATION_TABLE).get(RES_ID).status, 'cancelled', 'status must be persisted')
  assertEqual(store.get(RESERVATION_TABLE).get(RES_ID).notes, 'guest request', 'notes must be persisted')
  assertDeep(reservedCounts(store), [0, 0], 'both recorded dates must be released')
  assertDeep([...store.get(AVAILABILITY_TABLE).values()].map((r) => r.available), [2, 2], 'available must be recomputed')
  assertDeep([...store.get(AVAILABILITY_TABLE).values()].map((r) => r.status), ['available', 'available'], 'status must be recomputed')
  const line = store.get(LINE_TABLE).get('line-1')
  assert(typeof line.releasedAt === 'string' && line.releasedAt.length > 0, 'the line must be marked released')
})

await test('published rows are new objects; no stored row is mutated in place', async () => {
  const { repo, store } = await mockRepo()
  const seededReservation = seedReservation(store)
  const seededAvailability = seedAvailability(store, START)
  seedAvailability(store, addDays(START, 1))
  const seededLine = seedRecordedLine(store)
  const untouchedAvailability = seedAvailability(store, '2026-05-01', { reservedCount: 0, available: 2, status: 'available' })

  await repo.cancelReservationWithRelease(cancelPayload(), TENANT)

  assert(store.get(RESERVATION_TABLE).get(RES_ID) !== seededReservation, 'reservation must be replaced, not mutated')
  assertEqual(seededReservation.status, 'confirmed', 'the seeded reservation object must be untouched')
  assert(store.get(AVAILABILITY_TABLE).get(seededAvailability.id) !== seededAvailability, 'availability must be replaced, not mutated')
  assertEqual(seededAvailability.reservedCount, 2, 'the seeded availability object must be untouched')
  assert(store.get(LINE_TABLE).get('line-1') !== seededLine, 'the line must be replaced, not mutated')
  assertEqual(seededLine.releasedAt, null, 'the seeded line object must be untouched')
  assert(store.get(AVAILABILITY_TABLE).get(untouchedAvailability.id) === untouchedAvailability, 'a row outside the operation must not be replaced')
})

// ---------------------------------------------------------------------------
// 3. Repeated cancellation
// ---------------------------------------------------------------------------

await test('a repeated cancellation does not decrement again or re-mark the line', async () => {
  const { repo, store } = await mockRepo()
  seedReservation(store)
  seedAvailability(store, START)
  seedAvailability(store, addDays(START, 1))
  seedRecordedLine(store)

  await repo.cancelReservationWithRelease(cancelPayload(), TENANT)
  const firstRelease = store.get(LINE_TABLE).get('line-1').releasedAt
  const afterFirst = snapshotAll(store)

  await repo.cancelReservationWithRelease(cancelPayload(), TENANT)

  assertDeep(reservedCounts(store), [0, 0], 'a repeat must not decrement below the first release')
  assertDeep([...store.get(AVAILABILITY_TABLE).values()].map((r) => r.available), [2, 2], 'available must not be recomputed twice')
  assertEqual(store.get(LINE_TABLE).get('line-1').releasedAt, firstRelease, 'the first releasedAt must be preserved')
  assertEqual(store.get(RESERVATION_TABLE).get(RES_ID).status, 'cancelled', 'the status stays cancelled')
  assertDeep(snapshotAll(store), afterFirst, 'a repeat over an already-released reservation must be a no-op on the store')
})

// ---------------------------------------------------------------------------
// 4. Reservation without lines
// ---------------------------------------------------------------------------

await test('a reservation with no lines is still cancelled, and no capacity is touched', async () => {
  const { repo, store } = await mockRepo()
  seedReservation(store)
  const availability = seedAvailability(store, START)
  const before = snapshotAll(store)

  const result = await repo.cancelReservationWithRelease(cancelPayload(), TENANT)

  assertEqual(result?.status, 'cancelled', 'no candidate lines does not mean already cancelled')
  assertEqual(store.get(RESERVATION_TABLE).get(RES_ID).status, 'cancelled', 'the status must be published')
  assertEqual(store.get(LINE_TABLE).size, 0, 'no line is created')
  assertEqual(store.get(AVAILABILITY_TABLE).get(availability.id).reservedCount, 2, 'no capacity may move without a line')
  const after = snapshotAll(store)
  assert(before !== after, 'this case is expected to change the reservation row')
  assertDeep([...store.get(AVAILABILITY_TABLE).values()].map((r) => r.reservedCount), [2], 'availability is untouched')
})

// ---------------------------------------------------------------------------
// 5. Ownership: wrong tenant, target mismatch
// ---------------------------------------------------------------------------

await test('a supplied tenant that is not the context tenant is refused even when the caller\'s own capacity rows exist', async () => {
  // _buildQuery spreads the CONTEXT tenant over the caller's query, so the
  // supplied tenantId is discarded by the write this replaces. Honouring the
  // caller's tenant is impossible, so it is refused instead — and refused
  // BEFORE ownership is resolved, not by failing later on a capacity lookup.
  const { repo, store } = await mockRepo()
  seedReservation(store)
  // Deliberately seeded for the SUPPLIED tenant: a weaker implementation would
  // find these rows, release them and return success under the wrong tenant.
  seedAvailability(store, START, { id: `av-other-${START}`, tenantId: 'tenant-other' })
  seedAvailability(store, addDays(START, 1), { id: `av-other-${addDays(START, 1)}`, tenantId: 'tenant-other' })
  seedRecordedLine(store)
  const before = snapshotAll(store)

  await assertRejects(
    () => repo.cancelReservationWithRelease(cancelPayload({ tenantId: 'tenant-other' }), 'tenant-other'),
    'RepositoryValidationError',
    'context vs supplied tenant mismatch'
  )

  assertStoresUnchanged(store, before, 'a tenant mismatch must change nothing, including the caller\'s own rows')
})

await test('the reservation is still cancelled when the context and supplied tenants agree', async () => {
  const { repo, store } = await mockRepo({ tenant: TENANT })
  seedReservation(store)
  seedAvailability(store, START)
  seedAvailability(store, addDays(START, 1))
  seedRecordedLine(store)

  const result = await repo.cancelReservationWithRelease(cancelPayload(), TENANT)

  assertEqual(result?.status, 'cancelled', 'agreement must not be refused')
  assertDeep(reservedCounts(store), [0, 0], 'an agreeing cancellation must release')
})

await test('a missing stored reservation returns null and releases nothing', async () => {
  const { repo, store } = await mockRepo()
  // No reservation row at all. The line and capacity rows exist and are
  // releasable, so only the authoritative-reservation rule can stop this.
  seedAvailability(store, START)
  seedAvailability(store, addDays(START, 1))
  seedRecordedLine(store)
  const before = snapshotAll(store)

  const result = await repo.cancelReservationWithRelease(cancelPayload(), TENANT)

  assertEqual(result, null, 'the null result of the adapter update must be preserved')
  assertStoresUnchanged(store, before, 'ownership must never come from the payload when no stored row matches')
})

await test('a soft-deleted stored reservation is not an authoritative reservation', async () => {
  const { repo, store } = await mockRepo()
  seedReservation(store, { deletedAt: '2026-04-01T00:00:00.000Z' })
  seedAvailability(store, START)
  seedAvailability(store, addDays(START, 1))
  seedRecordedLine(store)
  const before = snapshotAll(store)

  const result = await repo.cancelReservationWithRelease(cancelPayload(), TENANT)

  assertEqual(result, null, 'a soft-deleted row must resolve as not found, as the soft-deletable query did')
  assertStoresUnchanged(store, before, 'a soft-deleted reservation must release nothing')
})

await test('a stored reservation owned by another tenant is refused, not released', async () => {
  const { repo, store } = await mockRepo({ tenant: 'tenant-other' })
  seedReservation(store) // owned by TENANT, while the context asks for tenant-other
  seedAvailability(store, START)
  seedAvailability(store, addDays(START, 1))
  seedRecordedLine(store)
  const before = snapshotAll(store)

  const result = await repo.cancelReservationWithRelease(cancelPayload(), 'tenant-other')

  assertEqual(result, null, 'no eligible stored reservation means no release')
  assertStoresUnchanged(store, before, 'another tenant\'s reservation must not be released')
})

await test('a line whose targetId differs from the reservation accommodationId is refused, and no target is chosen', async () => {
  const { repo, store } = await mockRepo()
  seedReservation(store)
  seedAvailability(store, START, { accommodationId: 'cab-2', id: 'av-cab-2-' + START })
  seedAvailability(store, addDays(START, 1), { accommodationId: 'cab-2', id: 'av-cab-2-' + addDays(START, 1) })
  seedRecordedLine(store, { targetId: 'cab-2' })
  const before = snapshotAll(store)

  await assertRejects(
    () => repo.cancelReservationWithRelease(cancelPayload(), TENANT),
    'RepositoryValidationError',
    'target mismatch'
  )

  assertStoresUnchanged(store, before, 'a target mismatch must change nothing')
})

await test('a line owned by another tenant is refused by its own stored tenantId', async () => {
  const { repo, store } = await mockRepo()
  seedReservation(store)
  seedAvailability(store, START)
  seedAvailability(store, addDays(START, 1))
  seedRecordedLine(store)
  store.get(LINE_TABLE).set('line-1', { ...store.get(LINE_TABLE).get('line-1'), tenantId: 'tenant-other' })
  const before = snapshotAll(store)

  await assertRejects(
    () => repo.cancelReservationWithRelease(cancelPayload(), TENANT),
    'RepositoryValidationError',
    'line tenant mismatch'
  )

  assertStoresUnchanged(store, before, 'a line of another tenant must change nothing')
})

// ---------------------------------------------------------------------------
// 6. Multiple lines sharing a capacity row
// ---------------------------------------------------------------------------

await test('two lines sharing one capacity row are released as one aggregate, not clamped per line', async () => {
  const { repo, store } = await mockRepo()
  seedReservation(store)
  seedAvailability(store, START, { inventory: 2, reservedCount: 2, available: 0, status: 'reserved' })
  seedRecordedLine(store, { id: 'line-1', dates: [START], quantity: 1 })
  seedRecordedLine(store, { id: 'line-2', dates: [START], quantity: 1 })

  await repo.cancelReservationWithRelease(cancelPayload(), TENANT)

  assertDeep(reservedCounts(store), [0], 'the aggregate release must zero the row')
  assertEqual(store.get(AVAILABILITY_TABLE).get(`av-${CABIN}-${START}`).available, 2, 'available must be the full inventory')
  assertEqual(store.get(AVAILABILITY_TABLE).get(`av-${CABIN}-${START}`).status, 'available', 'status must be recomputed from the aggregate')
  for (const id of ['line-1', 'line-2']) {
    assert(typeof store.get(LINE_TABLE).get(id).releasedAt === 'string', `${id} must be marked released`)
  }
})

await test('an aggregate quantity shortfall is refused before any mutation', async () => {
  const { repo, store } = await mockRepo()
  seedReservation(store)
  seedAvailability(store, START, { inventory: 2, reservedCount: 1, available: 1, status: 'available' })
  seedRecordedLine(store, { id: 'line-1', dates: [START], quantity: 1 })
  seedRecordedLine(store, { id: 'line-2', dates: [START], quantity: 1 })
  const before = snapshotAll(store)

  await assertRejects(
    () => repo.cancelReservationWithRelease(cancelPayload(), TENANT),
    'AvailabilityConflictError',
    'aggregate shortfall'
  )

  assertStoresUnchanged(store, before, 'a shortfall must change nothing')
})

await test('a recorded date with no availability row is refused instead of silently skipped', async () => {
  const { repo, store } = await mockRepo()
  seedReservation(store)
  seedAvailability(store, START)
  seedRecordedLine(store, { dates: [START, addDays(START, 1)], quantity: 2 })
  const before = snapshotAll(store)

  await assertRejects(
    () => repo.cancelReservationWithRelease(cancelPayload(), TENANT),
    'AvailabilityConflictError',
    'missing capacity row'
  )

  assertStoresUnchanged(store, before, 'a missing capacity row must change nothing')
})

// ---------------------------------------------------------------------------
// 7. Injected synchronous publication failures
// ---------------------------------------------------------------------------

await test('an injected failure at the reservation write leaves all three stores unchanged', async () => {
  const { repo, store } = await mockRepo()
  seedReservation(store)
  seedAvailability(store, START)
  seedAvailability(store, addDays(START, 1))
  seedRecordedLine(store)
  const before = snapshotAll(store)

  const injection = injectSetFailure(store.get(RESERVATION_TABLE), 1)
  let thrown = null
  try {
    await repo.cancelReservationWithRelease(cancelPayload(), TENANT)
  } catch (error) {
    thrown = error
  } finally {
    injection.restore()
  }

  assert(thrown !== null, 'the injected failure must surface')
  assertEqual(injection.calls(), 1, 'only the reservation write was attempted')
  assertStoresUnchanged(store, before, 'reservation write failure')
})

await test('an injected failure after an intermediate capacity write rolls that write back', async () => {
  const { repo, store } = await mockRepo()
  seedReservation(store)
  seedAvailability(store, START)
  seedAvailability(store, addDays(START, 1))
  seedRecordedLine(store)
  const before = snapshotAll(store)

  const injection = injectSetFailure(store.get(AVAILABILITY_TABLE), 2)
  let thrown = null
  try {
    await repo.cancelReservationWithRelease(cancelPayload(), TENANT)
  } catch (error) {
    thrown = error
  } finally {
    injection.restore()
  }

  assert(thrown !== null, 'the injected failure must surface')
  assertEqual(injection.calls(), 2, 'the first capacity write must have been attempted and then rolled back')
  assertStoresUnchanged(store, before, 'intermediate capacity write failure')
})

await test('an injected failure at line marking rolls back the status and every capacity write', async () => {
  const { repo, store } = await mockRepo()
  seedReservation(store)
  seedAvailability(store, START)
  seedAvailability(store, addDays(START, 1))
  seedRecordedLine(store)
  const before = snapshotAll(store)

  const injection = injectSetFailure(store.get(LINE_TABLE), 1)
  let thrown = null
  try {
    await repo.cancelReservationWithRelease(cancelPayload(), TENANT)
  } catch (error) {
    thrown = error
  } finally {
    injection.restore()
  }

  assert(thrown !== null, 'the injected failure must surface')
  assertStoresUnchanged(store, before, 'line marking failure')
})

await test('a table.set that refuses every later write still cannot prevent rollback', async () => {
  const { repo, store } = await mockRepo()
  seedReservation(store)
  seedAvailability(store, START)
  seedAvailability(store, addDays(START, 1))
  seedRecordedLine(store)
  const before = snapshotAll(store)

  // Hostile in the strongest way the supported injection surface allows: every
  // capacity write AND every capacity restore through this set would throw. The
  // original failure must surface and the store must still be fully restored,
  // which is only possible because rollback bypasses this method entirely.
  const availabilityTable = store.get(AVAILABILITY_TABLE)
  const originalSet = availabilityTable.set
  let calls = 0
  availabilityTable.set = function hostileSet() {
    calls += 1
    throw new Error('HOSTILE_SET')
  }
  let thrown = null
  try {
    await repo.cancelReservationWithRelease(cancelPayload(), TENANT)
  } catch (error) {
    thrown = error
  } finally {
    availabilityTable.set = originalSet
  }

  assert(thrown !== null, 'the injected failure must surface')
  assertEqual(thrown.name, 'Error', 'the original publication failure must surface, not an AggregateError')
  assertEqual(thrown.message, 'HOSTILE_SET', 'the surfaced error must be the publication failure')
  assertEqual(calls, 1, 'publication attempted exactly one capacity write and never entered the hostile set again')
  assertStoresUnchanged(store, before, 'a hostile set must not be able to strand a partial release')
})

await test('an ABSENT availability table with occupied dates is refused before any mutation', async () => {
  const { repo, store } = await mockRepo()
  seedReservation(store)
  seedAvailability(store, START)
  seedRecordedLine(store)
  // Real absence, not an empty Map: the key is removed from the store. An empty
  // Map would instead make every lookup miss and be refused for the ordinary
  // missing-row reason, proving nothing about the absent-table path.
  store.delete(AVAILABILITY_TABLE)
  assertEqual(store.get(AVAILABILITY_TABLE), undefined, 'the table must genuinely be absent')
  const before = snapshotAll(store)

  await assertRejects(
    () => repo.cancelReservationWithRelease(cancelPayload(), TENANT),
    'AvailabilityConflictError',
    'absent availability table'
  )

  assertStoresUnchanged(store, before, 'an absent availability table must not let a release through')
  assertEqual(store.get(LINE_TABLE).get('line-1').releasedAt, null, 'the line must not be marked released')
})

await test('an absent availability table with no occupied dates still publishes, scoped separately', async () => {
  const { repo, store } = await mockRepo()
  seedReservation(store)
  // The non-DATE_RANGE case has nothing to release, so it is deliberately NOT
  // refused for the absent table. This is the separately scoped behaviour.
  store.delete(AVAILABILITY_TABLE)
  store.get(LINE_TABLE).set('line-1', {
    id: 'line-1',
    reservationId: RES_ID,
    lineOrder: 1,
    targetType: 'accommodation',
    targetId: CABIN,
    temporal: { mode: 'NIGHTS', dateCount: 2 },
    quantity: 1,
    metadata: null,
    releasedAt: null,
  })

  const result = await repo.cancelReservationWithRelease(cancelPayload(), TENANT)

  assertEqual(result?.status, 'cancelled', 'a plan with no dates has nothing to release')
  assert(typeof store.get(LINE_TABLE).get('line-1').releasedAt === 'string', 'the not-applicable line must still be marked released')
})

// ---------------------------------------------------------------------------
// 8. Post-publication notification is NOT covered by rollback
// ---------------------------------------------------------------------------

await test('a throwing event subscriber rejects the caller with the stores already committed', async () => {
  // _emit is synchronous (base.repository.js:79-81) and is invoked outside the
  // rollback section, so a subscriber that throws rejects the caller AFTER the
  // stores are committed. This is asserted as the real, preserved behaviour:
  // rollback covers store-write failures only, and no claim is made that every
  // rejection restores the stores.
  const { repo, store } = await mockRepo({
    contextExtras: { eventBus: { emit() { throw new Error('SUBSCRIBER_THREW') } } },
  })
  seedReservation(store)
  seedAvailability(store, START)
  seedAvailability(store, addDays(START, 1))
  seedRecordedLine(store)

  await assertRejects(
    () => repo.cancelReservationWithRelease(cancelPayload(), TENANT),
    'Error',
    'throwing subscriber'
  )

  assertEqual(store.get(RESERVATION_TABLE).get(RES_ID).status, 'cancelled', 'the status stays committed')
  assertDeep(reservedCounts(store), [0, 0], 'the committed capacity release is not undone')
  assert(typeof store.get(LINE_TABLE).get('line-1').releasedAt === 'string', 'the committed line marking is not undone')
})

await test('a subscriber that does not throw leaves the committed state intact', async () => {
  const seen = []
  const { repo, store } = await mockRepo({
    contextExtras: { eventBus: { emit: (event, data) => seen.push({ event, data }) } },
  })
  seedReservation(store)
  seedAvailability(store, START)
  seedAvailability(store, addDays(START, 1))
  seedRecordedLine(store)

  await repo.cancelReservationWithRelease(cancelPayload(), TENANT)

  assertEqual(seen.length, 1, 'exactly one update event must be emitted')
  assertEqual(seen[0].event, 'repository:entity_updated', 'the established event name must be preserved')
  assertEqual(store.get(RESERVATION_TABLE).get(RES_ID).status, 'cancelled', 'the status must be published')
  assertDeep(reservedCounts(store), [0, 0], 'capacity must be released')
})

// ---------------------------------------------------------------------------
// 9. BOOKING-LEGACY-RELEASE-GATE-1 on the writable Map path
// ---------------------------------------------------------------------------

await test('a record-less DATE_RANGE line is refused and nothing is committed', async () => {
  // CHANGED EXPECTATION (was: "a record-less DATE_RANGE line still uses the
  // legacy branch and is still released", asserting reserved counts reached 0 and
  // the line was marked released). The approved product decision refuses it.
  const { repo, store } = await mockRepo()
  seedReservation(store)
  seedAvailability(store, START, { inventory: 4, reservedCount: 1, available: 3, status: 'available' })
  seedAvailability(store, addDays(START, 1), { inventory: 4, reservedCount: 1, available: 3, status: 'available' })
  store.get(LINE_TABLE).set('line-1', {
    id: 'line-1',
    reservationId: RES_ID,
    lineOrder: 1,
    targetType: 'accommodation',
    targetId: CABIN,
    temporal: { mode: 'DATE_RANGE', startDate: START, endDate: END },
    quantity: 1,
    metadata: null,
    releasedAt: null,
  })
  const before = snapshotAll(store)

  const error = await assertRejects(
    () => repo.cancelReservationWithRelease(cancelPayload(), TENANT),
    'AvailabilityConsumptionRecordError',
    'a record-less DATE_RANGE line'
  )

  assertEqual(error.details.lineId, 'line-1', 'the offending line id must be reported')
  assertEqual(error.details.reservationId, RES_ID, 'the reservation id must be reported for diagnosis')
  assertEqual(
    error.details.reason,
    'DATE_RANGE line has no versioned occupied-night record',
    'the reason must be the missing record'
  )
  assertEqual(
    JSON.stringify(error.details).includes('__occupiedNights'),
    false,
    'the metadata object must not be dumped into the error'
  )
  assertDeep(reservedCounts(store), [1, 1], 'no capacity may be released by a refused line')
  assertEqual(store.get(LINE_TABLE).get('line-1').releasedAt, null, 'the line must not be marked released')
  assertDeep(snapshotAll(store), before, 'all three stores must be byte-identical after the refusal')
})

await test('a mixed reservation aborts completely when the record-less line comes after a valid one', async () => {
  // The valid line is resolved first and its dates are known, but the plan is
  // built for every candidate before the mutation loop, so the later refusal
  // must leave the earlier valid line unreleased too.
  const { repo, store } = await mockRepo()
  seedReservation(store)
  const dates = civilRange(START, NIGHTS)
  for (const date of dates) {
    seedAvailability(store, date, { inventory: 4, reservedCount: 1, available: 3, status: 'available' })
  }
  store.get(LINE_TABLE).set('line-valid', {
    id: 'line-valid',
    reservationId: RES_ID,
    lineOrder: 1,
    targetType: 'accommodation',
    targetId: CABIN,
    temporal: { mode: 'DATE_RANGE', startDate: START, endDate: END },
    quantity: 1,
    metadata: { __occupiedNights: { version: 1, dates: [...dates], quantity: 1 } },
    releasedAt: null,
  })
  store.get(LINE_TABLE).set('line-legacy', {
    id: 'line-legacy',
    reservationId: RES_ID,
    lineOrder: 2,
    targetType: 'accommodation',
    targetId: CABIN,
    temporal: { mode: 'DATE_RANGE', startDate: START, endDate: END },
    quantity: 1,
    metadata: null,
    releasedAt: null,
  })
  const before = snapshotAll(store)

  await assertRejects(
    () => repo.cancelReservationWithRelease(cancelPayload(), TENANT),
    'AvailabilityConsumptionRecordError',
    'a mixed reservation whose second line lacks a record'
  )

  assertDeep(reservedCounts(store), new Array(NIGHTS).fill(1), 'no night may be released, not even for the valid line')
  assertEqual(store.get(LINE_TABLE).get('line-valid').releasedAt, null, 'the valid line must not be marked released')
  assertEqual(store.get(LINE_TABLE).get('line-legacy').releasedAt, null, 'the refused line must not be marked released')
  assertDeep(snapshotAll(store), before, 'the whole cancellation must abort with every store untouched')
})

await test('a record-less non-DATE_RANGE line still releases nothing and is still marked released', async () => {
  const { repo, store } = await mockRepo()
  seedReservation(store)
  seedAvailability(store, START, { inventory: 4, reservedCount: 1, available: 3, status: 'available' })
  store.get(LINE_TABLE).set('line-1', {
    id: 'line-1',
    reservationId: RES_ID,
    lineOrder: 1,
    targetType: 'accommodation',
    targetId: CABIN,
    temporal: { mode: 'NIGHTS', dateCount: 2 },
    quantity: 1,
    metadata: null,
    releasedAt: null,
  })
  const before = snapshotAll(store)

  await repo.cancelReservationWithRelease(cancelPayload(), TENANT)

  assertDeep(reservedCounts(store), [1], 'a not-applicable line must move no capacity')
  assert(typeof store.get(LINE_TABLE).get('line-1').releasedAt === 'string', 'the not-applicable line must still be marked released')
  assert(before !== snapshotAll(store), 'this case does change the status and the line')
})

await test('a record-less non-DATE_RANGE line with an absent availability table is still marked released', async () => {
  const { repo, store } = await mockRepo()
  seedReservation(store)
  // Absent via delete, not an empty Map — the earlier version of this test
  // substituted an empty Map and therefore asserted nothing about absence.
  store.delete(AVAILABILITY_TABLE)
  store.get(LINE_TABLE).set('line-1', {
    id: 'line-1',
    reservationId: RES_ID,
    lineOrder: 1,
    targetType: 'accommodation',
    targetId: CABIN,
    temporal: { mode: 'NIGHTS', dateCount: 2 },
    quantity: 1,
    metadata: null,
    releasedAt: null,
  })

  await repo.cancelReservationWithRelease(cancelPayload(), TENANT)

  assert(typeof store.get(LINE_TABLE).get('line-1').releasedAt === 'string', 'the line must be marked released')
  assertEqual(store.get(RESERVATION_TABLE).get(RES_ID).status, 'cancelled', 'the status must still publish')
})

// ---------------------------------------------------------------------------

console.log(`\ntotal: ${passed + failed}   passed: ${passed}   failed: ${failed}`)
if (failed > 0) {
  for (const f of failures) console.log(`\n--- ${f.name}\n${f.error && f.error.stack}`)
  process.exitCode = 1
}
