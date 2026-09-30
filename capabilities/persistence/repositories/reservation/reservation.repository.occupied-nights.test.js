/**
 * BOOKING-OCCUPIED-NIGHTS-1B - ReservationRepository behaviour tests.
 *
 * THIS EXERCISES THE REAL REPOSITORY. `ReservationRepository` is imported from
 * its own module and its real public methods are called. No implementation is
 * copied into this file, and the production logic is not re-implemented here to
 * be asserted against. Static source-text checks are not used as a substitute
 * for any behaviour below.
 *
 * HOW PHYSICAL DATABASE ACCESS IS PREVENTED
 * ReservationRepository imports database/connection/postgres.connection.js, which
 * imports the `pg` driver. Before that module is loaded, this test registers the
 * module-customization hooks in test-support/pg-fail-closed-hooks.mjs, so every
 * bare `pg` import resolves to a double. The genuine driver is therefore never
 * loaded, never constructed and never contacted, so this repository's driver path
 * cannot open a physical database connection.
 *
 * The guarantee is narrow and is not a general network sandbox: the hook
 * intercepts the bare specifier `pg` and nothing else, and it does not block
 * sockets. The real postgres.connection.js still executes createPool(), which
 * reads the database configuration and consults process.env.DATABASE_URL while
 * choosing connection options; what it then constructs is the double Pool, so a
 * connection string is never used to open a connection. This suite performs no
 * real Pool.connect or query, no socket, no application startup, no bootstrap, no
 * provisioning, no HTTP request and no Stage access, and it prints no
 * configuration or credential.
 * `assertPgIsDoubled()` positively verifies that the double is in place rather
 * than assuming it. The SQL/client double is also fail-closed: an unprogrammed
 * statement is a hard error, so a test cannot silently pass over SQL it did not
 * intend to run.
 *
 * WHAT IS AND IS NOT CERTIFIED
 * Certified here: the repository's real orchestration - statement order, bound
 * parameters, BEGIN/COMMIT/ROLLBACK choreography, the conditional capacity
 * guard, the released_at compare-and-set, pre-mutation validation, the reserved
 * metadata contract, and the A/B/C release dispatch.
 * NOT certified: anything about a PostgreSQL server - SQL parsing, constraints,
 * JSONB round trips, row-level locking, transaction isolation, cross-process
 * concurrency, or physical rollback. A ROLLBACK seen here is the double's
 * orchestration of the real connection manager's control flow, not a database
 * transaction unwinding. The mock adapter path has no transaction at all; that
 * pre-existing limitation is disclosed, not fixed.
 *
 * Normal date derivation always uses the real AvailabilityCapability. Narrow
 * provider doubles appear only where a mis-wired deployment must be simulated.
 *
 * Framework-free, matching capabilities/pricing/pricing.test.js. No database, no
 * network, no provisioning, no bootstrap, no dependency installation.
 *
 * Timezone coverage runs the real repository in child processes with TZ set
 * before the process starts, because in-process mutation of process.env.TZ is
 * unreliable on Windows. Cross-zone release transfers the SERIALIZED fixture
 * record; no running process's timezone is ever changed.
 *
 * Run: node capabilities/persistence/repositories/reservation/reservation.repository.occupied-nights.test.js
 */

import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { AvailabilityCapability } from '../../../availability/availability.capability.js'
import {
  AvailabilityConflictError,
  AvailabilityConsumptionRecordError,
  AvailabilityDateRangeError,
} from '../../../availability/availability.errors.js'
import {
  RepositoryConfigurationError,
  RepositoryValidationError,
} from '../../errors/repository.errors.js'
import {
  installPgDouble,
  assertPgIsDoubled,
  createClientDouble,
  installClient,
  uninstallClient,
  pgDoubleState,
  MockReservationAdapter,
  PostgresAdapter,
  resetMockStore,
  seedAvailability,
  availabilityRow,
  availabilityRows,
  addDays,
  civilRange,
  createContext,
  providerDouble,
  rows,
  CREATE_DEFAULTS,
  RELEASE_DEFAULTS,
  REPOSITORY_URL,
} from './test-support/reservation.repository.test-support.mjs'

// The boundary must be installed BEFORE the repository module is imported, so the
// repository is reached by dynamic import and never by a hoisted static import.
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
  if (thrown.constructor?.name !== expectedName && thrown.name !== expectedName) {
    throw new Error(`${label}: expected ${expectedName}, got ${thrown.constructor?.name || thrown.name}: ${thrown.message}`)
  }
  return thrown
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const TENANT = 'tenant-1'
const CABIN = 'cab-1'
const RES_ID = 'res-1'
const START = '2026-04-03' // crosses the April DST-end transition in both DST zones
const NIGHTS = 4
const END = addDays(START, NIGHTS)

/** A real AvailabilityCapability, the provider used for all normal derivation. */
const realProvider = () => new AvailabilityCapability()

/** A repository on the PostgreSQL path, backed by the fail-closed pg double. */
async function pgRepo(provider = realProvider()) {
  const repo = new ReservationRepository(new PostgresAdapter(), createContext(provider, TENANT))
  await repo.initialize()
  return repo
}

/** A repository on the in-memory path. */
async function mockRepo(provider = realProvider(), store = null) {
  const s = store || resetMockStore('availability', 'reservation_lines', 'reservations')
  const repo = new ReservationRepository(new MockReservationAdapter(), createContext(provider, TENANT))
  await repo.initialize()
  return { repo, store: s }
}

/** A DATE_RANGE line payload. */
function dateRangeLine(overrides = {}) {
  return {
    id: 'line-1',
    targetType: 'accommodation',
    targetId: CABIN,
    quantity: 1,
    temporal: { mode: 'DATE_RANGE', startDate: START, endDate: END },
    ...overrides,
  }
}

function reservationPayload(overrides = {}) {
  return { id: RES_ID, tenantId: TENANT, accommodationId: CABIN, status: 'pending', ...overrides }
}

/** A valid consumption record. */
function validRecord(dates = civilRange(START, NIGHTS), quantity = 1, version = 1) {
  return { version, dates: [...dates], quantity }
}

/** A DB-shaped reservation line row, as `SELECT rl.*` would return it. */
function lineRow(overrides = {}) {
  return {
    id: 'line-1',
    reservation_id: RES_ID,
    line_order: 1,
    target_type: 'accommodation',
    target_id: CABIN,
    temporal: { mode: 'DATE_RANGE', startDate: START, endDate: END },
    quantity: 1,
    released_at: null,
    metadata: null,
    ...overrides,
  }
}

/** Program a release: the status update, the line select, and the CAS marks. */
function releaseProgram(overrides = {}) {
  return { ...RELEASE_DEFAULTS, ...overrides }
}

/**
 * The dates the untouched legacy branch produces for a temporal, recomputed here
 * with the same local-time semantics. The legacy branch is deliberately
 * local-time, so its expected output cannot be assumed to be UTC.
 */
function legacyDates(startDate, endDate) {
  const end = new Date(endDate)
  end.setDate(end.getDate() - 1)
  const out = []
  const current = new Date(startDate)
  while (current <= end) {
    out.push(current.toISOString().split('T')[0])
    current.setDate(current.getDate() + 1)
  }
  return out
}

console.log('\nBOOKING-OCCUPIED-NIGHTS-1B - ReservationRepository behaviour\n')

// ---------------------------------------------------------------------------
// 0. Fail-closed database boundary
// ---------------------------------------------------------------------------

await test('bare specifier "pg" resolves to the fail-closed double, not the real driver', async () => {
  assertEqual(await assertPgIsDoubled(), true, 'pg double must be installed')
})

await test('the PostgreSQL path acquires its client from the double Pool, never a real one', async () => {
  const client = createClientDouble({}, CREATE_DEFAULTS)
  installClient(client)
  try {
    const repo = await pgRepo()
    await repo.createReservationWithLine(reservationPayload(), dateRangeLine())
    const events = pgDoubleState().events.map((e) => e.event)
    assert(events.includes('pool:construct'), 'the double Pool must have been constructed')
    assert(events.includes('pool:connect'), 'the double Pool must have supplied the client')
    assert(!events.some((e) => e.endsWith('refused')), 'no double capability was needed that it refused to provide')
    assertEqual(client.callsOf('begin').length, 1, 'the real transaction() must have issued BEGIN')
  } finally {
    uninstallClient()
  }
})

// ---------------------------------------------------------------------------
// 1. Creation: consumed dates equal the recorded dates
// ---------------------------------------------------------------------------

await test('consumed dates are exactly the dates serialized into line metadata', async () => {
  const client = createClientDouble({}, CREATE_DEFAULTS)
  installClient(client)
  try {
    const repo = await pgRepo()
    const { line } = await repo.createReservationWithLine(reservationPayload(), dateRangeLine({ quantity: 2 }))

    const consumed = client.callsOf('consumeCapacity').map((s) => s.params[3])
    const recorded = JSON.parse(line.metadata.__occupiedNights ? JSON.stringify(line.metadata.__occupiedNights) : 'null')
    // Read the record back through the serialized parameter the real INSERT binds.
    const boundMetadata = JSON.parse(client.callsOf('insertLine')[0].params[9])

    assertDeep(consumed, civilRange(START, NIGHTS), 'capacity must be consumed for each occupied night')
    assertDeep(boundMetadata.__occupiedNights.dates, consumed, 'recorded dates must equal consumed dates')
    assertEqual(boundMetadata.__occupiedNights.quantity, 2, 'recorded quantity must equal the consumed quantity')
    assertEqual(boundMetadata.__occupiedNights.version, 1, 'record version must be the accepted provider version')
    assertEqual(recorded.version, 1, 'returned line must carry version 1')
    for (const s of client.callsOf('consumeCapacity')) {
      assertEqual(s.params[0], 2, 'each capacity update must bind the same quantity')
    }
  } finally {
    uninstallClient()
  }
})

await test('one-cabin quantity is independent of guestCount', async () => {
  try {
    const repo = await pgRepo()
    for (const guestCount of [1, 2, 4, 9]) {
      const c = createClientDouble({}, CREATE_DEFAULTS)
      installClient(c)
      await repo.createReservationWithLine(reservationPayload({ guestCount }), dateRangeLine({ quantity: 1 }))
      const bound = JSON.parse(c.callsOf('insertLine')[0].params[9])
      assertEqual(bound.__occupiedNights.quantity, 1, `quantity must stay 1 for guestCount ${guestCount}`)
      for (const s of c.callsOf('consumeCapacity')) {
        assertEqual(s.params[0], 1, `capacity must be consumed 1 per night for guestCount ${guestCount}`)
      }
    }
  } finally {
    uninstallClient()
  }
})

await test('generic quantity greater than one stays consistent between consume and record', async () => {
  const client = createClientDouble({}, CREATE_DEFAULTS)
  installClient(client)
  try {
    const repo = await pgRepo()
    for (const quantity of [2, 3, 7]) {
      const c = createClientDouble({}, CREATE_DEFAULTS)
      installClient(c)
      await repo.createReservationWithLine(reservationPayload(), dateRangeLine({ quantity }))
      const bound = JSON.parse(c.callsOf('insertLine')[0].params[9])
      assertEqual(bound.__occupiedNights.quantity, quantity, `record must carry quantity ${quantity}`)
      assertEqual(c.callsOf('consumeCapacity').length, NIGHTS, 'one capacity update per night regardless of quantity')
      for (const s of c.callsOf('consumeCapacity')) {
        assertEqual(s.params[0], quantity, 'capacity update must bind the requested quantity')
      }
    }
  } finally {
    uninstallClient()
  }
})

// ---------------------------------------------------------------------------
// 2. Finding 2: reserved metadata ownership in every mode
// ---------------------------------------------------------------------------

await test('a forged reserved key is overwritten by the genuine record on a DATE_RANGE line', async () => {
  const client = createClientDouble({}, CREATE_DEFAULTS)
  installClient(client)
  try {
    const repo = await pgRepo()
    const forged = { version: 99, dates: ['1999-01-01'], quantity: 42 }
    await repo.createReservationWithLine(
      reservationPayload(),
      dateRangeLine({ metadata: { __occupiedNights: forged, channel: 'web' } })
    )
    const bound = JSON.parse(client.callsOf('insertLine')[0].params[9])
    assertEqual(bound.__occupiedNights.version, 1, 'forged version must be replaced')
    assertDeep(bound.__occupiedNights.dates, civilRange(START, NIGHTS), 'forged dates must be replaced')
    assertEqual(bound.__occupiedNights.quantity, 1, 'forged quantity must be replaced')
    assertEqual(bound.channel, 'web', 'unrelated metadata must survive')
  } finally {
    uninstallClient()
  }
})

await test('a forged reserved key is REMOVED on a non-DATE_RANGE line, and no record is added', async () => {
  const client = createClientDouble({}, CREATE_DEFAULTS)
  installClient(client)
  try {
    const repo = await pgRepo()
    // NIGHTLY is used here purely as a non-DATE_RANGE compatibility fixture. The
    // repository branches only on `mode !== 'DATE_RANGE'`, so this exercises that
    // non-record path; it is NOT a claim that NIGHTLY is a supported production
    // temporal mode. The point under test is that the reserved key cannot survive
    // any line that receives no record.
    await repo.createReservationWithLine(
      reservationPayload(),
      dateRangeLine({
        id: 'line-nightly',
        quantity: 0,
        temporal: { mode: 'NIGHTLY', startDate: START, endDate: addDays(START, 2) },
        metadata: { __occupiedNights: { version: 1, dates: ['1999-01-01'], quantity: 7 }, keepMe: 'yes', nested: { a: 1 } },
      })
    )
    const bound = JSON.parse(client.callsOf('insertLine')[0].params[9])
    assert(!Object.prototype.hasOwnProperty.call(bound, '__occupiedNights'), 'the reserved key must not survive a non-DATE_RANGE line')
    assertEqual(bound.keepMe, 'yes', 'unrelated metadata must survive')
    assertDeep(bound.nested, { a: 1 }, 'unrelated nested metadata must survive')
  } finally {
    uninstallClient()
  }
})

await test('a non-DATE_RANGE line with no caller metadata gets an empty object, not a reserved key', async () => {
  const client = createClientDouble({}, CREATE_DEFAULTS)
  installClient(client)
  try {
    const repo = await pgRepo()
    await repo.createReservationWithLine(
      reservationPayload(),
      dateRangeLine({ id: 'line-nm', temporal: { mode: 'NIGHTLY', startDate: START, endDate: addDays(START, 1) } })
    )
    const bound = JSON.parse(client.callsOf('insertLine')[0].params[9])
    assertDeep(bound, {}, 'no reserved key may be introduced where no record exists')
  } finally {
    uninstallClient()
  }
})

await test('the record is frozen in memory and survives a JSON round trip unchanged', async () => {
  // Frozen on the in-memory path, where the real record object is returned to the
  // caller. On the PostgreSQL path the record is serialized into the INSERT
  // parameter, so its bound JSON form is asserted instead.
  const { repo, store } = await mockRepo()
  seedAvailability(store, { start: START, nights: NIGHTS, tenantId: TENANT, accommodationId: CABIN, inventory: 4, reservedCount: 0 })
  const { line } = await repo.createReservationWithLine(reservationPayload(), dateRangeLine())
  assert(Object.isFrozen(line.metadata.__occupiedNights), 'the record object must be frozen')
  assert(Object.isFrozen(line.metadata.__occupiedNights.dates), 'the recorded dates must be frozen')
  let mutated = false
  try { line.metadata.__occupiedNights.quantity = 99 } catch { mutated = true }
  assertEqual(line.metadata.__occupiedNights.quantity, 1, 'a frozen record must not be mutable in sloppy position')
  const roundTrip = JSON.parse(JSON.stringify(line.metadata.__occupiedNights))
  assertDeep(roundTrip, { version: 1, dates: civilRange(START, NIGHTS), quantity: 1 }, 'record must survive a JSON round trip')
  assert(!mutated || line.metadata.__occupiedNights.quantity === 1, 'record must be immutable')
})

await test('the record bound into the PostgreSQL INSERT is a plain JSON object with no extra keys', async () => {
  const client = createClientDouble({}, CREATE_DEFAULTS)
  installClient(client)
  try {
    const repo = await pgRepo()
    await repo.createReservationWithLine(reservationPayload(), dateRangeLine({ metadata: { channel: 'web' } }))
    const bound = JSON.parse(client.callsOf('insertLine')[0].params[9])
    assertDeep(Object.keys(bound).sort(), ['__occupiedNights', 'channel'], 'metadata must carry the record and the unrelated key only')
    assertDeep(Object.keys(bound.__occupiedNights).sort(), ['dates', 'quantity', 'version'], 'the record must have exactly three keys')
  } finally {
    uninstallClient()
  }
})

// ---------------------------------------------------------------------------
// 3. Finding 1: provider version compatibility, before any transaction
// ---------------------------------------------------------------------------

const BAD_VERSIONS = [
  ['version 2', 2],
  ['version 0', 0],
  ['version -1', -1],
  ['version 1.5', 1.5],
  ["string version '1'", '1'],
  ['NaN', Number.NaN],
  ['Infinity', Number.POSITIVE_INFINITY],
  ['null', null],
  ['boolean true', true],
  ['object', { major: 1 }],
]

for (const [label, version] of BAD_VERSIONS) {
  await test(`unsupported provider ${label} is rejected before a transaction opens`, async () => {
    const client = createClientDouble({}, CREATE_DEFAULTS)
    installClient(client)
    try {
      const repo = await pgRepo(providerDouble({ version }))
      const error = await assertRejects(
        () => repo.createReservationWithLine(reservationPayload(), dateRangeLine()),
        'RepositoryConfigurationError',
        label
      )
      assertEqual(error.context.configKey, 'capabilities.availability.occupiedNightsExpansionVersion', `${label}: the error must name the offending config key`)
      assertDeep(error.context.supportedVersions, [1], `${label}: the error must state the exact supported set`)
      assertEqual(client.statements.length, 0, `${label}: no statement, not even BEGIN, may be issued`)
    } finally {
      uninstallClient()
    }
  })
}

await test('a provider with no version property is rejected before a transaction opens', async () => {
  const client = createClientDouble({}, CREATE_DEFAULTS)
  installClient(client)
  try {
    const repo = await pgRepo(providerDouble({ version: undefined }))
    await assertRejects(
      () => repo.createReservationWithLine(reservationPayload(), dateRangeLine()),
      'RepositoryConfigurationError',
      'missing version'
    )
    assertEqual(client.statements.length, 0, 'no statement may be issued')
  } finally {
    uninstallClient()
  }
})

await test('an unsupported provider version cannot create an unreleasable line, and the real version 1 is accepted', async () => {
  // The asymmetry that matters: version 2 is refused on write, and would also be
  // refused on read, so a line can never carry a record this repository cannot release.
  const client = createClientDouble({}, CREATE_DEFAULTS)
  installClient(client)
  try {
    const repo = await pgRepo(providerDouble({ version: 2 }))
    await assertRejects(
      () => repo.createReservationWithLine(reservationPayload(), dateRangeLine()),
      'RepositoryConfigurationError',
      'write side'
    )
    const rl = createClientDouble(releaseProgram({
      selectLines: () => rows([lineRow({ metadata: JSON.stringify({ __occupiedNights: validRecord(undefined, 1, 2) }) })]),
    }))
    installClient(rl)
    await assertRejects(
      () => repo.releaseReservationLines(rl, RES_ID, TENANT),
      'AvailabilityConsumptionRecordError',
      'read side'
    )
  } finally {
    uninstallClient()
  }
})

await test('the accepted version is captured once and is the version that gets written', async () => {
  // A getter that returns 1 on the first read and 2 on every read after it. If the
  // repository read the version more than once, the second read would surface as an
  // unsupported-version rejection or as a record carrying version 2. Counting the
  // reads is what makes "captured once" an assertion rather than an assumption.
  let versionReads = 0
  const provider = {
    get occupiedNightsExpansionVersion() {
      versionReads++
      return versionReads === 1 ? 1 : 2
    },
    expandOccupiedNights({ startDate, endDate }) {
      return Object.freeze(civilRange(startDate, NIGHTS))
    },
  }
  const client = createClientDouble({}, CREATE_DEFAULTS)
  installClient(client)
  try {
    const repo = await pgRepo(provider)
    const { line } = await repo.createReservationWithLine(reservationPayload(), dateRangeLine())

    assertEqual(versionReads, 1, 'the provider version must be read exactly once, before the record is built')
    const bound = JSON.parse(client.callsOf('insertLine')[0].params[9])
    assertEqual(bound.__occupiedNights.version, 1, 'the persisted record must carry the single accepted version, not a later read')
    assertEqual(line.metadata.__occupiedNights.version, 1, 'the returned record must carry the single accepted version')
  } finally {
    uninstallClient()
  }
})

// ---------------------------------------------------------------------------
// 4. Creation: invalid input and mis-wiring fail before any mutation
// ---------------------------------------------------------------------------

// Quantity problems are rejected by the repository itself, so they surface as a
// RepositoryValidationError. Date problems are rejected by the availability
// capability, so they surface as an AvailabilityDateRangeError. Both are asserted
// with their real type, and both must land before any mutation.
const INVALID_QUANTITIES = [
  ['quantity 0 is not silently coerced to 1', 0],
  ['negative quantity', -3],
  ['fractional quantity', 1.5],
  ['string quantity', '2'],
  ['null quantity', null],
  ['NaN quantity', Number.NaN],
  ['missing quantity', undefined],
]

for (const [label, quantity] of INVALID_QUANTITIES) {
  await test(`invalid quantity is rejected before any mutation: ${label}`, async () => {
    const client = createClientDouble({}, CREATE_DEFAULTS)
    installClient(client)
    try {
      const repo = await pgRepo()
      await assertRejects(
        () => repo.createReservationWithLine(reservationPayload(), dateRangeLine({ quantity })),
        'RepositoryValidationError',
        label
      )
      assertEqual(client.statements.length, 0, `${label}: no statement, not even BEGIN, may be issued`)
    } finally {
      uninstallClient()
    }
  })
}

const INVALID_BOUNDS = [
  ['start date equal to end date', { startDate: START, endDate: START }],
  ['end date before start date', { startDate: END, endDate: START }],
  ['missing start date', { startDate: undefined, endDate: END }],
  ['missing end date', { startDate: START, endDate: undefined }],
  ['non-strict start date', { startDate: '2026-4-3', endDate: END }],
  ['non-existent civil date', { startDate: '2026-02-30', endDate: '2026-03-05' }],
  ['unparseable start date', { startDate: 'not-a-date', endDate: END }],
  ['date-time instead of a civil date', { startDate: '2026-04-03T00:00:00Z', endDate: END }],
  ['non-strict end date', { startDate: START, endDate: '2026-4-7' }],
]

for (const [label, bounds] of INVALID_BOUNDS) {
  await test(`invalid bounds are rejected before any mutation: ${label}`, async () => {
    const client = createClientDouble({}, CREATE_DEFAULTS)
    installClient(client)
    try {
      const repo = await pgRepo()
      await assertRejects(
        () => repo.createReservationWithLine(reservationPayload(), dateRangeLine({ temporal: { mode: 'DATE_RANGE', ...bounds } })),
        'AvailabilityDateRangeError',
        label
      )
      assertEqual(client.statements.length, 0, `${label}: no statement, not even BEGIN, may be issued`)
    } finally {
      uninstallClient()
    }
  })
}

await test('a DATE_RANGE line with no mode is not a DATE_RANGE line, so no record is written', async () => {
  // Not an error: a line without mode DATE_RANGE takes the existing non-DATE_RANGE
  // path, receives no record, and therefore never owes a recorded release. This
  // pins that the strictness added in 1B did not narrow the existing mode contract.
  const client = createClientDouble({}, CREATE_DEFAULTS)
  installClient(client)
  try {
    const repo = await pgRepo()
    await repo.createReservationWithLine(
      reservationPayload(),
      dateRangeLine({ id: 'line-nomode', quantity: 1, temporal: { startDate: START, endDate: END } })
    )
    const bound = JSON.parse(client.callsOf('insertLine')[0].params[9])
    assert(!Object.prototype.hasOwnProperty.call(bound, '__occupiedNights'), 'a line with no DATE_RANGE mode must carry no record')
  } finally {
    uninstallClient()
  }
})

await test('a missing availability capability is rejected before any mutation', async () => {
  const client = createClientDouble({}, CREATE_DEFAULTS)
  installClient(client)
  try {
    const repo = await pgRepo(null)
    const error = await assertRejects(
      () => repo.createReservationWithLine(reservationPayload(), dateRangeLine()),
      'RepositoryConfigurationError',
      'missing capability'
    )
    assertEqual(error.context.configKey, 'capabilities.availability', 'the error must name the capability config key')
    assertEqual(client.statements.length, 0, 'no statement may be issued')
  } finally {
    uninstallClient()
  }
})

await test('a capability without expandOccupiedNights is rejected before any mutation', async () => {
  const client = createClientDouble({}, CREATE_DEFAULTS)
  installClient(client)
  try {
    const repo = await pgRepo(providerDouble({ version: 1, method: 'absent' }))
    const error = await assertRejects(
      () => repo.createReservationWithLine(reservationPayload(), dateRangeLine()),
      'RepositoryConfigurationError',
      'missing method'
    )
    assertEqual(error.context.configKey, 'capabilities.availability.expandOccupiedNights', 'the error must name the method')
    assertEqual(client.statements.length, 0, 'no statement may be issued')
  } finally {
    uninstallClient()
  }
})

// ---------------------------------------------------------------------------
// 5. Release: the recorded dates and quantity drive the decrements
// ---------------------------------------------------------------------------

await test('release decrements exactly the recorded dates by the recorded quantity', async () => {
  const record = validRecord(civilRange(START, NIGHTS), 2)
  const client = createClientDouble(releaseProgram({
    selectLines: () => rows([lineRow({ quantity: 2, metadata: JSON.stringify({ __occupiedNights: record }) })]),
    markLineReleased: () => rows([{ id: 'line-1', quantity: 2 }]),
  }))
  installClient(client)
  try {
    const repo = await pgRepo()
    const result = await repo.releaseReservationLines(client, RES_ID, TENANT)

    const decrements = client.callsOf('releaseCapacity')
    assertDeep(decrements.map((s) => s.params[3]), record.dates, 'decremented dates must be exactly the recorded dates')
    for (const s of decrements) {
      assertEqual(s.params[0], 2, 'each decrement must bind the recorded quantity')
      assertEqual(s.params[1], TENANT, 'decrement must bind the tenant')
      assertEqual(s.params[2], CABIN, 'decrement must bind the line target')
    }
    assertEqual(result.noOp, false, 'the release must not be a no-op')
    assertEqual(client.callsOf('markLineReleased').length, 1, 'the line must be marked released exactly once')
    // The release must not re-derive dates from the caller's stay bounds.
    assertEqual(decrements.length, NIGHTS, 'exactly one decrement per recorded night')
  } finally {
    uninstallClient()
  }
})

await test('release uses the recorded quantity, not a default and not guestCount', async () => {
  // The record must still cover the whole stay, so the quantity is isolated as the
  // only thing under test: 5 units consumed, 5 units released.
  const record = validRecord(civilRange(START, NIGHTS), 5)
  const client = createClientDouble(releaseProgram({
    selectLines: () => rows([lineRow({ quantity: 5, metadata: { __occupiedNights: record } })]),
    markLineReleased: () => rows([{ id: 'line-1', quantity: 5 }]),
  }))
  installClient(client)
  try {
    const repo = await pgRepo()
    await repo.releaseReservationLines(client, RES_ID, TENANT)
    const decrements = client.callsOf('releaseCapacity')
    assertEqual(decrements.length, NIGHTS, 'one decrement per recorded night')
    for (const s of decrements) {
      assertEqual(s.params[0], 5, 'the recorded quantity must be used verbatim, not defaulted to 1')
    }
  } finally {
    uninstallClient()
  }
})

// ---------------------------------------------------------------------------
// 6. Release: invalid records (case C) must fail before any mutation
// ---------------------------------------------------------------------------

const BAD_RECORDS = [
  ['null record', null],
  ['record is an array', []],
  ['record is a string', 'nope'],
  ['record is a number', 5],
  ['missing version', { dates: civilRange(START, NIGHTS), quantity: 1 }],
  ['version 2', validRecord(undefined, 1, 2)],
  ['version 0', validRecord(undefined, 1, 0)],
  ['version as string', validRecord(undefined, 1, '1')],
  ['dates is not an array', { version: 1, dates: 'nope', quantity: 1 }],
  ['dates is empty', validRecord([], 1)],
  ['dates contains a non-date', { version: 1, dates: [START, 'oops'], quantity: 1 }],
  ['duplicate dates', { version: 1, dates: [START, START, addDays(START, 2)], quantity: 1 }],
  ['gapped dates', { version: 1, dates: [START, addDays(START, 2), addDays(START, 3)], quantity: 1 }],
  ['descending dates', { version: 1, dates: [addDays(START, 2), addDays(START, 1)], quantity: 1 }],
  ['truncated record (missing the last night)', validRecord(civilRange(START, NIGHTS - 1), 1)],
  ['over-long record (one night past check-out)', validRecord(civilRange(START, NIGHTS + 1), 1)],
  ['quantity does not match the line', validRecord(civilRange(START, NIGHTS), 3)],
  ['quantity zero', validRecord(civilRange(START, NIGHTS), 0)],
  ['quantity fractional', validRecord(civilRange(START, NIGHTS), 1.5)],
]

for (const [label, record] of BAD_RECORDS) {
  await test(`invalid record is rejected before any mutation: ${label}`, async () => {
    const client = createClientDouble(releaseProgram({
      selectLines: () => rows([lineRow({ quantity: 1, metadata: JSON.stringify({ __occupiedNights: record }) })]),
    }))
    installClient(client)
    try {
      const repo = await pgRepo()
      await assertRejects(
        () => repo.releaseReservationLines(client, RES_ID, TENANT),
        'AvailabilityConsumptionRecordError',
        label
      )
      assertEqual(client.callsOf('markLineReleased').length, 0, `${label}: no line may be marked released`)
      assertEqual(client.callsOf('releaseCapacity').length, 0, `${label}: no capacity may be released`)
    } finally {
      uninstallClient()
    }
  })
}

// ---------------------------------------------------------------------------
// 7. Finding 3: a present record must not be bypassed by temporal.mode
// ---------------------------------------------------------------------------

const INCOMPATIBLE_TEMPORALS = [
  ['missing temporal', undefined],
  ['temporal is null', null],
  ['temporal is an array', []],
  ['missing mode', { startDate: START, endDate: END }],
  ['NIGHTLY mode', { mode: 'NIGHTLY', startDate: START, endDate: END }],
  ['unknown mode', { mode: 'SOMETHING_ELSE', startDate: START, endDate: END }],
  ['mode with different case', { mode: 'date_range', startDate: START, endDate: END }],
  ['non-strict start date', { mode: 'DATE_RANGE', startDate: '2026-4-3', endDate: END }],
  ['non-existent civil start date', { mode: 'DATE_RANGE', startDate: '2026-02-30', endDate: END }],
  ['missing end date', { mode: 'DATE_RANGE', startDate: START }],
  ['non-strict end date', { mode: 'DATE_RANGE', startDate: START, endDate: '2026-4-7' }],
  ['unparseable bounds', { mode: 'DATE_RANGE', startDate: 'x', endDate: 'y' }],
]

for (const [label, temporal] of INCOMPATIBLE_TEMPORALS) {
  await test(`a present record with ${label} throws and never enters the legacy path`, async () => {
    const record = validRecord()
    const client = createClientDouble(releaseProgram({
      selectLines: () => rows([lineRow({ temporal, metadata: JSON.stringify({ __occupiedNights: record }) })]),
    }))
    installClient(client)
    try {
      const repo = await pgRepo()
      await assertRejects(
        () => repo.releaseReservationLines(client, RES_ID, TENANT),
        'AvailabilityConsumptionRecordError',
        label
      )
      assertEqual(client.callsOf('markLineReleased').length, 0, `${label}: the line must not be marked released`)
      assertEqual(client.callsOf('releaseCapacity').length, 0, `${label}: its recorded capacity must not be left reserved`)
    } finally {
      uninstallClient()
    }
  })
}

await test('a record present with a null temporal does not silently release zero dates', async () => {
  // Regression shape for the bypass: if mode dispatch ran before record
  // validation, a null temporal would yield an empty date list, the line would be
  // marked released, and its capacity would stay reserved forever.
  const client = createClientDouble(releaseProgram({
    selectLines: () => rows([lineRow({ temporal: null, metadata: JSON.stringify({ __occupiedNights: validRecord() }) })]),
    markLineReleased: () => rows([{ id: 'line-1', quantity: 1 }]),
  }))
  installClient(client)
  try {
    const repo = await pgRepo()
    await assertRejects(
      () => repo.releaseReservationLines(client, RES_ID, TENANT),
      'AvailabilityConsumptionRecordError',
      'null temporal with a record'
    )
    assertEqual(client.callsOf('markLineReleased').length, 0, 'the line must not be marked released')
  } finally {
    uninstallClient()
  }
})

// ---------------------------------------------------------------------------
// 8. Release: legacy branch is preserved for lines with no record
// ---------------------------------------------------------------------------

await test('a line with no record keeps the existing legacy inclusive arithmetic', async () => {
  const client = createClientDouble(releaseProgram({
    selectLines: () => rows([lineRow({ metadata: null })]),
  }))
  installClient(client)
  try {
    const repo = await pgRepo()
    await repo.releaseReservationLines(client, RES_ID, TENANT)
    assertDeep(
      client.callsOf('releaseCapacity').map((s) => s.params[3]),
      legacyDates(START, END),
      'the legacy branch must be unchanged'
    )
  } finally {
    uninstallClient()
  }
})

await test('a line with unrelated metadata but no record still uses the legacy branch', async () => {
  const client = createClientDouble(releaseProgram({
    selectLines: () => rows([lineRow({ metadata: JSON.stringify({ channel: 'web', note: 'pre-record row' }) })]),
  }))
  installClient(client)
  try {
    const repo = await pgRepo()
    await repo.releaseReservationLines(client, RES_ID, TENANT)
    assertDeep(client.callsOf('releaseCapacity').map((s) => s.params[3]), legacyDates(START, END), 'legacy arithmetic must be preserved')
  } finally {
    uninstallClient()
  }
})

await test('a record-less non-DATE_RANGE line performs no capacity release and is still marked released', async () => {
  const client = createClientDouble(releaseProgram({
    selectLines: () => rows([lineRow({ temporal: { mode: 'NIGHTLY', startDate: START, endDate: END }, metadata: null })]),
  }))
  installClient(client)
  try {
    const repo = await pgRepo()
    await repo.releaseReservationLines(client, RES_ID, TENANT)
    assertEqual(client.callsOf('releaseCapacity').length, 0, 'the non-DATE_RANGE legacy behaviour is unchanged: no capacity work')
    assertEqual(client.callsOf('markLineReleased').length, 1, 'the line is still marked released, as before')
  } finally {
    uninstallClient()
  }
})

await test('historical cancellation is not blanket-blocked: record-less lines release as they always did', async () => {
  const client = createClientDouble(releaseProgram({
    selectLines: () => rows([lineRow({ metadata: null })]),
  }))
  installClient(client)
  try {
    const repo = await pgRepo()
    const result = await repo.releaseReservationLines(client, RES_ID, TENANT)
    assertEqual(result.noOp, false, 'a historical line must still release')
    assertDeep(client.callsOf('releaseCapacity').map((s) => s.params[3]), legacyDates(START, END), 'its legacy dates must be released')
  } finally {
    uninstallClient()
  }
})

// ---------------------------------------------------------------------------
// 9. Release: repeat-release and compare-and-set
// ---------------------------------------------------------------------------

await test('a repeated release cannot decrement twice, because released_at IS NULL filters the line out', async () => {
  let selectCount = 0
  const record = validRecord(civilRange(START, NIGHTS), 1)
  const client = createClientDouble(releaseProgram({
    selectLines: () => {
      selectCount++
      // First call sees the unreleased line; the WHERE clause then excludes it.
      return selectCount === 1 ? rows([lineRow({ metadata: JSON.stringify({ __occupiedNights: record }) })]) : rows([])
    },
  }))
  installClient(client)
  try {
    const repo = await pgRepo()
    await repo.releaseReservationLines(client, RES_ID, TENANT)
    const firstDecrementCount = client.callsOf('releaseCapacity').length
    assertEqual(firstDecrementCount, NIGHTS, 'the first release must decrement every recorded night')

    const second = await repo.releaseReservationLines(client, RES_ID, TENANT)
    assertEqual(second.noOp, true, 'the second release must be a no-op')
    assertEqual(client.callsOf('releaseCapacity').length, firstDecrementCount, 'no further decrement may be issued')
    assertEqual(client.callsOf('markLineReleased').length, 1, 'the line must not be marked released twice')
    assert(
      /released_at IS NULL/.test(client.callsOf('selectLines')[0].sql),
      'the line query must still filter on released_at IS NULL'
    )
  } finally {
    uninstallClient()
  }
})

await test('a zero-row release compare-and-set skips the decrement entirely', async () => {
  const record = validRecord(civilRange(START, NIGHTS), 1)
  const client = createClientDouble(releaseProgram({
    selectLines: () => rows([lineRow({ metadata: JSON.stringify({ __occupiedNights: record }) })]),
    markLineReleased: () => rows([]), // the CAS lost: another actor already released it
  }))
  installClient(client)
  try {
    const repo = await pgRepo()
    await repo.releaseReservationLines(client, RES_ID, TENANT)
    assertEqual(client.callsOf('markLineReleased').length, 1, 'the CAS must be attempted once')
    assertEqual(client.callsOf('releaseCapacity').length, 0, 'a lost compare-and-set must not decrement capacity')
    assert(
      /WHERE id = \$1 AND released_at IS NULL/.test(client.callsOf('markLineReleased')[0].sql),
      'the release mark must remain a guarded compare-and-set'
    )
  } finally {
    uninstallClient()
  }
})

await test('a later malformed line prevents every earlier line from being released', async () => {
  const good = lineRow({ id: 'line-good', metadata: JSON.stringify({ __occupiedNights: validRecord(civilRange(START, NIGHTS), 1) }) })
  const bad = lineRow({ id: 'line-bad', metadata: JSON.stringify({ __occupiedNights: validRecord(civilRange(START, NIGHTS - 1), 1) }) })
  const client = createClientDouble(releaseProgram({
    selectLines: () => rows([good, bad]),
  }))
  installClient(client)
  try {
    const repo = await pgRepo()
    await assertRejects(
      () => repo.releaseReservationLines(client, RES_ID, TENANT),
      'AvailabilityConsumptionRecordError',
      'later malformed line'
    )
    assertEqual(client.callsOf('markLineReleased').length, 0, 'the earlier valid line must not be marked released')
    assertEqual(client.callsOf('releaseCapacity').length, 0, 'no capacity may be released for any line')
  } finally {
    uninstallClient()
  }
})

// ---------------------------------------------------------------------------
// 10. Failure and rollback orchestration (NOT physical rollback)
// ---------------------------------------------------------------------------

await test('a create failure after capacity consumption triggers ROLLBACK and no COMMIT', async () => {
  const client = createClientDouble({
    ...CREATE_DEFAULTS,
    insertReservation: new Error('simulated insert failure'),
  })
  installClient(client)
  try {
    const repo = await pgRepo()
    await assertRejects(
      () => repo.createReservationWithLine(reservationPayload(), dateRangeLine()),
      'Error',
      'create failure'
    )
    assertEqual(client.callsOf('consumeCapacity').length, NIGHTS, 'capacity must have been consumed before the failure')
    assertEqual(client.callsOf('rollback').length, 1, 'the real transaction() must have issued ROLLBACK')
    assertEqual(client.callsOf('commit').length, 0, 'COMMIT must not be issued after a failure')
    assertEqual(client.callsOf('clientRelease').length, 1, 'the client must be released')
  } finally {
    uninstallClient()
  }
})

await test('a zero-row capacity guard on create throws AvailabilityConflictError and rolls back', async () => {
  let call = 0
  const client = createClientDouble({
    ...CREATE_DEFAULTS,
    consumeCapacity: () => {
      call++
      return call <= 1 ? rows([{ id: 'av-row' }]) : rows([])
    },
  })
  installClient(client)
  try {
    const repo = await pgRepo()
    await assertRejects(
      () => repo.createReservationWithLine(reservationPayload(), dateRangeLine()),
      'AvailabilityConflictError',
      'capacity conflict'
    )
    assertEqual(client.callsOf('insertReservation').length, 0, 'no reservation may be inserted after the guard fails')
    assertEqual(client.callsOf('rollback').length, 1, 'ROLLBACK must be issued')
    assert(
      /reserved_count \+ \$1 <= inventory/.test(client.callsOf('consumeCapacity')[0].sql),
      'the conditional capacity guard must be preserved'
    )
  } finally {
    uninstallClient()
  }
})

await test('a release failure after a release mark triggers ROLLBACK and no COMMIT', async () => {
  const record = validRecord(civilRange(START, NIGHTS), 1)
  let decrement = 0
  const client = createClientDouble({
    updateReservation: () => rows([{ id: RES_ID, status: 'cancelled' }]),
    selectLines: () => rows([lineRow({ metadata: JSON.stringify({ __occupiedNights: record }) })]),
    markLineReleased: () => rows([{ id: 'line-1', quantity: 1 }]),
    releaseCapacity: () => {
      decrement++
      return decrement === 2 ? rows([]) : rows([{ id: 'av-row' }])
    },
  })
  installClient(client)
  try {
    const repo = await pgRepo()
    await assertRejects(
      () => repo.cancelReservationWithRelease({ id: RES_ID, status: 'cancelled' }, TENANT),
      'AvailabilityConflictError',
      'release failure'
    )
    assertEqual(client.callsOf('updateReservation').length, 1, 'the reservation status update ran first')
    assertEqual(client.callsOf('markLineReleased').length, 1, 'the line was marked before the failure')
    assertEqual(client.callsOf('rollback').length, 1, 'ROLLBACK must be issued')
    assertEqual(client.callsOf('commit').length, 0, 'COMMIT must not be issued after a failure')
  } finally {
    uninstallClient()
  }
})

await test('an invalid record rolls back the reservation status update in the same transaction', async () => {
  const client = createClientDouble({
    updateReservation: () => rows([{ id: RES_ID, status: 'cancelled' }]),
    selectLines: () => rows([lineRow({ metadata: JSON.stringify({ __occupiedNights: validRecord(civilRange(START, NIGHTS - 1), 1) }) })]),
  })
  installClient(client)
  try {
    const repo = await pgRepo()
    await assertRejects(
      () => repo.cancelReservationWithRelease({ id: RES_ID, status: 'cancelled' }, TENANT),
      'AvailabilityConsumptionRecordError',
      'invalid record on cancel'
    )
    assertEqual(client.callsOf('updateReservation').length, 1, 'the status update was issued before the line validation')
    assertEqual(client.callsOf('markLineReleased').length, 0, 'no line may be marked released')
    assertEqual(client.callsOf('rollback').length, 1, 'the status update is unwound with the rest of the transaction')
    assertEqual(client.callsOf('commit').length, 0, 'COMMIT must not be issued')
  } finally {
    uninstallClient()
  }
})

await test('cancellation with no lines is a no-op and still commits', async () => {
  const client = createClientDouble({
    updateReservation: () => rows([{ id: RES_ID, status: 'cancelled' }]),
    selectLines: () => rows([]),
  })
  installClient(client)
  try {
    const repo = await pgRepo()
    const result = await repo.cancelReservationWithRelease({ id: RES_ID, status: 'cancelled' }, TENANT)
    assertEqual(result.release.noOp, true, 'no lines means a no-op release')
    assertEqual(client.callsOf('commit').length, 1, 'a successful no-op must commit')
    assertEqual(client.callsOf('rollback').length, 0, 'a no-op must not roll back')
  } finally {
    uninstallClient()
  }
})

// ---------------------------------------------------------------------------
// 11. The in-memory path
// ---------------------------------------------------------------------------

await test('the in-memory path records the genuine record and consumes capacity', async () => {
  const { repo, store } = await mockRepo()
  seedAvailability(store, { start: START, nights: NIGHTS, tenantId: TENANT, accommodationId: CABIN, inventory: 4, reservedCount: 0 })
  const { line } = await repo.createReservationWithLine(reservationPayload(), dateRangeLine({ quantity: 2 }))

  assertDeep(line.metadata.__occupiedNights.dates, civilRange(START, NIGHTS), 'the record must be written on the in-memory path')
  assertEqual(line.metadata.__occupiedNights.quantity, 2, 'quantity must be recorded')
  for (const date of civilRange(START, NIGHTS)) {
    assertEqual(availabilityRow(store, CABIN, date).reservedCount, 2, `capacity must be consumed on ${date}`)
  }
})

await test('the in-memory path removes a forged reserved key', async () => {
  const { repo, store } = await mockRepo()
  seedAvailability(store, { start: START, nights: NIGHTS, tenantId: TENANT, accommodationId: CABIN, inventory: 4, reservedCount: 0 })
  const { line } = await repo.createReservationWithLine(
    reservationPayload(),
    dateRangeLine({ metadata: { __occupiedNights: { version: 7, dates: ['1999-01-01'], quantity: 9 }, keep: 'me' } })
  )
  assertEqual(line.metadata.__occupiedNights.version, 1, 'the forged record must be replaced')
  assertEqual(line.metadata.keep, 'me', 'unrelated metadata must survive')
})

await test('the in-memory path validates a malformed record before any store mutation', async () => {
  const { repo, store } = await mockRepo()
  seedAvailability(store, { start: START, nights: NIGHTS, tenantId: TENANT, accommodationId: CABIN, inventory: 4, reservedCount: 1 })
  store.get('reservation_lines').set('line-1', {
    id: 'line-1',
    reservationId: RES_ID,
    targetType: 'accommodation',
    targetId: CABIN,
    temporal: { mode: 'DATE_RANGE', startDate: START, endDate: END },
    quantity: 1,
    metadata: JSON.stringify({ __occupiedNights: validRecord(civilRange(START, NIGHTS - 1), 1) }),
    releasedAt: null,
  })
  const before = availabilityRows(store).map((r) => r.reservedCount)

  await assertRejects(
    () => repo.cancelReservationWithRelease({ id: RES_ID, status: 'cancelled' }, TENANT),
    'AvailabilityConsumptionRecordError',
    'malformed record on the in-memory path'
  )

  assertDeep(availabilityRows(store).map((r) => r.reservedCount), before, 'no availability row may change')
  assertEqual(store.get('reservation_lines').get('line-1').releasedAt, null, 'the line must not be marked released')
})

await test('the in-memory path throws for a present record with a missing mode, before any store mutation', async () => {
  const { repo, store } = await mockRepo()
  seedAvailability(store, { start: START, nights: NIGHTS, tenantId: TENANT, accommodationId: CABIN, inventory: 4, reservedCount: 1 })
  store.get('reservation_lines').set('line-1', {
    id: 'line-1',
    reservationId: RES_ID,
    targetType: 'accommodation',
    targetId: CABIN,
    temporal: { startDate: START, endDate: END }, // no mode
    quantity: 1,
    metadata: JSON.stringify({ __occupiedNights: validRecord() }),
    releasedAt: null,
  })
  const before = availabilityRows(store).map((r) => r.reservedCount)
  await assertRejects(
    () => repo.cancelReservationWithRelease({ id: RES_ID, status: 'cancelled' }, TENANT),
    'AvailabilityConsumptionRecordError',
    'missing mode on the in-memory path'
  )
  assertDeep(availabilityRows(store).map((r) => r.reservedCount), before, 'no availability row may change')
  assertEqual(store.get('reservation_lines').get('line-1').releasedAt, null, 'the line must not be marked released')
})

await test('the in-memory path rejects an unsupported provider version before any store mutation', async () => {
  const { repo, store } = await mockRepo(providerDouble({ version: 2 }))
  seedAvailability(store, { start: START, nights: NIGHTS, tenantId: TENANT, accommodationId: CABIN, inventory: 4, reservedCount: 0 })
  await assertRejects(
    () => repo.createReservationWithLine(reservationPayload(), dateRangeLine()),
    'RepositoryConfigurationError',
    'unsupported version on the in-memory path'
  )
  assertDeep(availabilityRows(store).map((r) => r.reservedCount), new Array(NIGHTS).fill(0), 'no capacity may be consumed')
  assertEqual(store.get('reservation_lines').size, 0, 'no line may be persisted')
})

await test('the in-memory path rejects an invalid quantity before any store mutation', async () => {
  const { repo, store } = await mockRepo()
  seedAvailability(store, { start: START, nights: NIGHTS, tenantId: TENANT, accommodationId: CABIN, inventory: 4, reservedCount: 0 })
  await assertRejects(
    () => repo.createReservationWithLine(reservationPayload(), dateRangeLine({ quantity: 0 })),
    'RepositoryValidationError',
    'quantity 0 on the in-memory path'
  )
  assertDeep(availabilityRows(store).map((r) => r.reservedCount), new Array(NIGHTS).fill(0), 'no capacity may be consumed')
  assertEqual(store.get('reservation_lines').size, 0, 'no line may be persisted')
})

await test('the in-memory path releases the recorded dates and does not decrement twice', async () => {
  const { repo, store } = await mockRepo()
  seedAvailability(store, { start: START, nights: NIGHTS, tenantId: TENANT, accommodationId: CABIN, inventory: 4, reservedCount: 0 })
  await repo.createReservationWithLine(reservationPayload(), dateRangeLine({ quantity: 2 }))
  assertDeep(availabilityRows(store).map((r) => r.reservedCount), new Array(NIGHTS).fill(2), 'capacity must be consumed first')

  await repo.cancelReservationWithRelease({ id: RES_ID, status: 'cancelled' }, TENANT)
  assertDeep(availabilityRows(store).map((r) => r.reservedCount), new Array(NIGHTS).fill(0), 'the recorded dates must be released')

  await repo.cancelReservationWithRelease({ id: RES_ID, status: 'cancelled' }, TENANT)
  assertDeep(
    availabilityRows(store).map((r) => r.reservedCount),
    new Array(NIGHTS).fill(0),
    'a repeated cancel must not decrement below zero or double-count'
  )
})

await test('the in-memory path keeps the legacy branch for a record-less line', async () => {
  const { repo, store } = await mockRepo()
  seedAvailability(store, { start: START, nights: NIGHTS, tenantId: TENANT, accommodationId: CABIN, inventory: 4, reservedCount: 1 })
  store.get('reservation_lines').set('line-1', {
    id: 'line-1',
    reservationId: RES_ID,
    targetType: 'accommodation',
    targetId: CABIN,
    temporal: { mode: 'DATE_RANGE', startDate: START, endDate: END },
    quantity: 1,
    metadata: null,
    releasedAt: null,
  })
  const end = new Date(END)
  end.setDate(end.getDate() - 1)
  await repo.cancelReservationWithRelease({ id: RES_ID, status: 'cancelled' }, TENANT)
  assertDeep(
    availabilityRows(store).filter((r) => r.reservedCount === 0).map((r) => r.date),
    legacyDates(START, END),
    'the legacy arithmetic must be preserved on the in-memory path'
  )
})


// ---------------------------------------------------------------------------
// 12. Timezone coverage, in isolated child processes
// ---------------------------------------------------------------------------

const FIXTURE = new URL('./test-support/occupied-nights-tz-fixture.mjs', import.meta.url).href

function runFixture(tz, op, start, nights) {
  const stdout = execFileSync(process.execPath, [fileURLToPath(FIXTURE)], {
    env: { ...process.env, TZ: tz, FIXTURE_OP: op, FIXTURE_START: start, FIXTURE_NIGHTS: String(nights) },
    encoding: 'utf8',
  })
  const line = stdout.split(/\r?\n/).find((l) => l.startsWith('__FIXTURE__'))
  if (!line) throw new Error(`fixture produced no report for TZ=${tz} op=${op}`)
  return JSON.parse(line.slice('__FIXTURE__'.length))
}

// April DST-end and September/October DST-start windows. Both are real
// transitions in America/Santiago and Australia/Lord_Howe.
const DST_WINDOWS = [
  ['2026-04-03', 4],
  ['2026-09-04', 4],
  ['2026-10-02', 4],
]
const ZONES = ['UTC', 'America/Santiago', 'Australia/Lord_Howe']

await test('every requested timezone is actually in effect in its child process', () => {
  for (const tz of ZONES) {
    const r = runFixture(tz, 'create', START, NIGHTS)
    assertEqual(r.effectiveZone, tz, `effective zone must be ${tz}`)
    assertEqual(r.requestedTZ, tz, `TZ must be set to ${tz}`)
  }
  // The zones are genuinely distinct, not three copies of the same offset.
  const offsets = ZONES.map((tz) => runFixture(tz, 'create', START, NIGHTS).janOffsetMin)
  assert(new Set(offsets).size === ZONES.length, `zones must differ in offset, got ${JSON.stringify(offsets)}`)
})

await test('consume and record agree in every timezone, across every DST window', () => {
  for (const tz of ZONES) {
    for (const [start, nights] of DST_WINDOWS) {
      const r = runFixture(tz, 'create', start, nights)
      const expected = civilRange(start, nights)
      const label = `TZ=${tz} window=${start}+${nights}`
      assertEqual(r.effectiveZone, tz, `${label}: effective zone`)
      assertDeep(r.recordedDates, expected, `${label}: recorded dates must be the civil nights`)
      assertDeep(r.consumedDates, expected, `${label}: consumed dates`)
      assertDeep(r.consumedReservedCounts, new Array(nights).fill(1), `${label}: one unit consumed per night`)
      assertEqual(r.recordedQuantity, 1, `${label}: quantity 1 recorded`)
      assertEqual(r.lineQuantity, 1, `${label}: line quantity independent of guestCount 4`)
    }
  }
})

await test('the DST windows really do cross an offset change in the DST zones', () => {
  for (const tz of ['America/Santiago', 'Australia/Lord_Howe']) {
    const crosses = DST_WINDOWS.map(([start, nights]) => runFixture(tz, 'create', start, nights).crossesOffsetChange)
    assert(crosses.some(Boolean), `TZ=${tz}: at least one window must cross an offset change, got ${JSON.stringify(crosses)}`)
  }
  // UTC has no DST and is the control: it is the one zone where the pre-existing
  // local-time arithmetic generally happens to agree with UTC, so it is where the
  // record path is least distinguishable from the legacy branch. Agreement here
  // does not weaken the UTC result, it just means UTC is not the zone that
  // exposes the offset-transition failures the other zones do expose.
  for (const [start, nights] of DST_WINDOWS) {
    const r = runFixture('UTC', 'create', start, nights)
    assertEqual(r.crossesOffsetChange, false, `UTC must show no offset change for ${start}`)
    assertDeep(r.recordedDates, civilRange(start, nights), `UTC window ${start} must still be exact`)
  }
})

await test('a record created in one timezone releases identically when transferred into another', async () => {
  // The record is transferred in its SERIALIZED form, the way a JSONB column would
  // return it. No running process's timezone is changed at any point: the source
  // zone and DST window are separate child processes, and the release runs in this
  // process under the ambient zone.
  const ambient = Intl.DateTimeFormat().resolvedOptions().timeZone
  let transferred = 0
  for (const sourceZone of ZONES) {
    for (const [start, nights] of DST_WINDOWS) {
      const created = runFixture(sourceZone, 'create', start, nights)
      const label = `created in ${sourceZone} at ${start}, released in ${ambient}`

      const store = resetMockStore('availability', 'reservation_lines', 'reservations')
      seedAvailability(store, { start, nights, tenantId: TENANT, accommodationId: CABIN, inventory: 4, reservedCount: 1 })
      store.get('reservation_lines').set('line-1', {
        id: 'line-1',
        reservationId: RES_ID,
        targetType: 'accommodation',
        targetId: CABIN,
        temporal: { mode: 'DATE_RANGE', startDate: start, endDate: addDays(start, nights) },
        quantity: created.recordedQuantity,
        metadata: created.serializedMetadata,
        releasedAt: null,
      })

      const repo = new ReservationRepository(new MockReservationAdapter(), createContext(realProvider(), TENANT))
      await repo.initialize()
      await repo.cancelReservationWithRelease({ id: RES_ID, status: 'cancelled' }, TENANT)

      const decremented = availabilityRows(store).filter((r) => r.reservedCount === 0).map((r) => r.date)
      assertDeep(decremented, created.recordedDates, `${label}: must free exactly the nights recorded in ${sourceZone}`)
      assertEqual(decremented.length, nights, `${label}: every consumed night must be freed`)
      transferred++
    }
  }
  assertEqual(transferred, ZONES.length * DST_WINDOWS.length, 'every source zone and window must be transferred')
})

await test('the legacy branch is preserved and is demonstrably timezone-dependent', () => {
  // This is the pre-existing local-time arithmetic, left byte-for-byte unchanged.
  // It is shown here as evidence of the deployment gate, not as correctness.
  const results = ZONES.map((tz) => ({ tz, r: runFixture(tz, 'legacy-release', START, NIGHTS) }))
  for (const { tz, r } of results) {
    assertEqual(r.effectiveZone, tz, `legacy fixture must run in ${tz}`)
    assert(r.releasedCount > 0, `TZ=${tz}: the legacy branch must still release capacity`)
    assert(r.releasedCount <= NIGHTS, `TZ=${tz}: the legacy branch must not release more nights than were consumed`)
  }
  // Santiago is UTC-3/-4, so the legacy local-time arithmetic loses a night that
  // the UTC contract keeps. The record exists precisely to remove this dependency.
  const utcCount = results.find((x) => x.tz === 'UTC').r.releasedCount
  const santiagoCount = results.find((x) => x.tz === 'America/Santiago').r.releasedCount
  assert(
    santiagoCount < utcCount,
    `legacy output must be zone-dependent: UTC released ${utcCount}, Santiago released ${santiagoCount}`
  )
})

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(`\n  total: ${passed + failed}   passed: ${passed}   failed: ${failed}`)
if (failed > 0) {
  console.log('\n  Failures:')
  for (const f of failures) console.log(`   - ${f.name}: ${f.error && f.error.message}`)
}
process.exit(failed > 0 ? 1 : 0)
