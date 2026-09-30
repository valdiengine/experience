/**
 * TEST-ONLY support for exercising the real ReservationRepository without any
 * possibility of physical database access.
 *
 * Three pieces, all importable only from test files:
 *
 *  1. `installPgDouble()`  - registers the module-customization hooks in
 *     pg-fail-closed-hooks.mjs. After this, every bare `pg` import resolves to a
 *     double, so the genuine driver is never loaded, constructed or contacted.
 *     It MUST be called before the repository module is imported, so the
 *     repository is always reached through `await import(...)` and never through
 *     a hoisted static import.
 *
 *     The guarantee is narrow and should not be overstated: it intercepts the bare
 *     specifier `pg`, and nothing else. It is NOT a general network sandbox. The
 *     real postgres.connection.js still executes createPool(), which reads the
 *     database configuration and consults process.env.DATABASE_URL while choosing
 *     connection options; what it then constructs is the double Pool, so no
 *     connection string is ever used to open a connection. This module neither
 *     prints nor stores any configuration value or credential.
 *
 *  2. `createClientDouble()` - a programmable SQL/client double. It records
 *     every statement and returns programmed rows. An unrecognized statement is
 *     an error rather than a silent success, so a test can never accidentally
 *     pass over SQL it did not intend to exercise.
 *
 *  3. `createMockAdapter()` - the in-memory adapter the non-PostgreSQL path
 *     already uses, exposing the static `store` the repository reads.
 *
 * CLAIM BOUNDARY
 * These doubles exercise the repository's real JavaScript: statement ordering,
 * bound parameters, BEGIN/COMMIT/ROLLBACK choreography, the conditional
 * capacity guard, the released_at compare-and-set, and pre-mutation validation.
 * They certify NOTHING about a PostgreSQL server: not SQL parsing, not
 * constraints, not JSONB round trips, not row-level locking, not transaction
 * isolation, not cross-process concurrency, and not physical rollback. A
 * rollback observed here is the double's orchestration, not the database's.
 *
 * No credentials are read, logged or reproduced.
 */

import { register } from 'node:module'
import { fileURLToPath } from 'node:url'

let installed = false

/**
 * Install the fail-closed `pg` double. Safe to call more than once.
 * Call this before importing reservation.repository.js.
 */
export function installPgDouble() {
  if (installed) return
  register('./pg-fail-closed-hooks.mjs', import.meta.url)
  installed = true
}

/** Absolute path of this support directory, for building child-process URLs. */
export const SUPPORT_DIR = fileURLToPath(new URL('.', import.meta.url))

/** Absolute path of the repository under test. */
export const REPOSITORY_URL = new URL('../reservation.repository.js', import.meta.url).href

/**
 * Classify a SQL statement by the most specific marker it contains.
 * Order matters: the capacity statements are distinguished by their arithmetic
 * direction, and the two reservation-line statements are distinguished by table.
 */
function classify(text) {
  const sql = text.replace(/\s+/g, ' ')
  if (sql === 'BEGIN') return 'begin'
  if (sql === 'COMMIT') return 'commit'
  if (sql === 'ROLLBACK') return 'rollback'
  if (sql.includes('reserved_count = reserved_count + $1')) return 'consumeCapacity'
  if (sql.includes('reserved_count = reserved_count - $1')) return 'releaseCapacity'
  if (sql.includes('INSERT INTO reservations')) return 'insertReservation'
  if (sql.includes('INSERT INTO reservation_lines')) return 'insertLine'
  if (sql.includes('UPDATE reservation_lines')) return 'markLineReleased'
  if (sql.includes('UPDATE reservations')) return 'updateReservation'
  if (sql.includes('SELECT rl.*')) return 'selectLines'
  return 'unknown'
}

/** Programmable rows for one statement kind. */
export const rows = (list) => ({ rows: list, rowCount: list.length })

/**
 * A controlled client double.
 *
 * @param {object} [program] optional per-kind overrides. Each value may be a
 *   result object, a function (params, callIndexForThatKind) => result, or an
 *   Error instance to throw. Unspecified kinds fall back to `defaults`.
 * @param {object} [defaults] the same shape, applied when `program` omits a kind.
 */
export function createClientDouble(program = {}, defaults = {}) {
  const statements = []
  const perKindCounts = {}
  const resolve = (kind, params) => {
    const callIndex = perKindCounts[kind] = (perKindCounts[kind] ?? -1) + 1
    // BEGIN / COMMIT / ROLLBACK are issued by database/connection/postgres.connection.js
    // itself, not by the repository under test, so they are always acknowledged.
    // They are still recorded, which is how a test observes rollback orchestration.
    if (kind === 'begin' || kind === 'commit' || kind === 'rollback') {
      return { rows: [], rowCount: 0 }
    }
    const candidate = program[kind] !== undefined ? program[kind] : defaults[kind]
    if (candidate === undefined) {
      const seen = statements.map((s) => s.kind).join(', ') || '(none)'
      throw new Error(
        `CLIENT_DOUBLE_REFUSED: statement kind "${kind}" was never programmed. ` +
        `Statements so far: ${seen}. Refusing to invent a result for it.`
      )
    }
    const value = typeof candidate === 'function' ? candidate(params, callIndex) : candidate
    if (value instanceof Error) throw value
    if (value && value.rows) return value
    throw new Error(`CLIENT_DOUBLE_REFUSED: programmed result for "${kind}" must be { rows: [...] }`)
  }

  return {
    statements,
    kindsSeen: () => perKindCounts,
    callsOf: (kind) => statements.filter((s) => s.kind === kind),
    /** All statements other than plain transaction control, in order. */
    businessStatements: () => statements.filter((s) => s.kind !== 'begin' && s.kind !== 'commit' && s.kind !== 'rollback'),
    async query(text, params = []) {
      const kind = classify(text)
      statements.push({ kind, sql: text.replace(/\s+/g, ' ').trim(), params })
      return resolve(kind, params)
    },
    release() {
      statements.push({ kind: 'clientRelease', sql: 'client.release()', params: [] })
    },
  }
}

/**
 * Install a client double where the fail-closed Pool will find it, and clear
 * any recorded pool events.
 */
export function installClient(client) {
  globalThis.__pgDoubleClient = client
  globalThis.__pgDoubleState = { events: [], poolConstructed: false }
}

export function pgDoubleState() {
  return globalThis.__pgDoubleState || { events: [], poolConstructed: false }
}

export function uninstallClient() {
  globalThis.__pgDoubleClient = undefined
}

/**
 * Positively assert that the bare specifier 'pg' resolves to the fail-closed
 * double, i.e. the genuine driver was never loaded in this process.
 *
 * This is the check that makes the "no physical database access" claim
 * verifiable rather than merely asserted: if the boundary had failed, the real
 * `pg` would be in the registry and this would be false.
 */
export async function assertPgIsDoubled() {
  const mod = await import('pg')
  if (mod.__isPgFailClosedDouble !== true) {
    throw new Error('PG_DOUBLE_MISSING: the genuine pg driver is loaded; the fail-closed boundary did not hold')
  }
  return true
}

/**
 * The in-memory adapter used by the repository's non-PostgreSQL path.
 *
 * `provider.name` is deliberately not 'postgres' so the repository takes its
 * mock branch. `store` is static because the repository reads
 * `adapter.constructor.store`.
 */
export class MockReservationAdapter {
  static store = new Map()

  constructor() {
    this.provider = { name: 'memory' }
    this.config = { entityName: 'reservations' }
    this.entityName = 'reservations'
  }

  async create(data) { return { ...data } }

  async update(_query, data) { return { ...data } }

  async findOne(query = {}) {
    const store = this.constructor.store.get('reservations')
    if (!store) return null
    return store.get(query.id) || null
  }
}

/** Reset the mock store to empty maps for the given collection names. */
export function resetMockStore(...collections) {
  MockReservationAdapter.store = new Map()
  for (const name of collections) MockReservationAdapter.store.set(name, new Map())
  return MockReservationAdapter.store
}

/**
 * Seed availability rows for a list of dates.
 *
 * @param {Map} store the mock store
 * @param {object} options
 * @param {string} options.start first date, inclusive
 * @param {number} options.nights how many consecutive days
 * @param {string} options.tenantId
 * @param {string} options.accommodationId
 * @param {number} options.inventory
 * @param {number} options.reservedCount starting reserved count
 */
export function seedAvailability(store, { start, nights, tenantId, accommodationId, inventory, reservedCount = 0 }) {
  const map = store.get('availability') || store.set('availability', new Map()).get('availability')
  const rowsOut = []
  for (let i = 0; i < nights; i++) {
    const date = addDays(start, i)
    const id = `av-${accommodationId}-${date}`
    const row = {
      id,
      tenantId,
      accommodationId,
      date,
      inventory,
      reservedCount,
      available: inventory - reservedCount,
      status: reservedCount >= inventory ? 'reserved' : 'available',
      isBlocked: false,
    }
    map.set(id, row)
    rowsOut.push(row)
  }
  return rowsOut
}

/** A single seeded availability row, for post-assertion inspection. */
export function availabilityRow(store, accommodationId, date) {
  const map = store.get('availability')
  if (!map) return null
  return map.get(`av-${accommodationId}-${date}`) || null
}

/** Every seeded availability row, sorted by date. */
export function availabilityRows(store) {
  const map = store.get('availability')
  if (!map) return []
  return Array.from(map.values()).sort((a, b) => (a.date < b.date ? -1 : 1))
}

/** UTC civil-date arithmetic. Deliberately does not use local time. */
export function addDays(date, count) {
  const ms = Date.parse(`${date}T00:00:00.000Z`) + count * 86400000
  return new Date(ms).toISOString().slice(0, 10)
}

/** [start, end) as consecutive civil dates. */
export function civilRange(start, nights) {
  return Array.from({ length: nights }, (_, i) => addDays(start, i))
}

/**
 * Build a repository context exposing the availability capability under the
 * capability-context contract (`context.capabilities.get('availability')`).
 *
 * @param {object|null} availabilityProvider the real AvailabilityCapability, or a
 *   narrow double, or null to simulate a missing capability.
 */
export function createContext(availabilityProvider, tenantId = 'tenant-1') {
  return {
    tenant: { id: tenantId },
    capabilities: {
      get(id) {
        if (id === 'availability') return availabilityProvider || null
        return null
      },
    },
  }
}

/**
 * A narrow provider double for configuration-failure cases only.
 *
 * Normal derivation always uses the real AvailabilityCapability; this exists
 * solely to present a mis-wired deployment (missing method, missing or
 * unsupported version) that the real class cannot be made to present.
 */
export function providerDouble({ version, method = 'function', dates = ['2026-01-01'] } = {}) {
  const provider = {}
  if (method === 'function') {
    provider.expandOccupiedNights = () => Object.freeze([...dates])
  }
  if (version !== undefined) provider.occupiedNightsExpansionVersion = version
  return provider
}

/** A PostgreSQL-shaped adapter: selects the real transaction() code path. */
export class PostgresAdapter {
  constructor() {
    this.provider = { name: 'postgres' }
    this.config = { entityName: 'reservations' }
    this.entityName = 'reservations'
  }
}

/** Default successful results for a create: capacity available, both inserts land. */
export const CREATE_DEFAULTS = {
  consumeCapacity: () => rows([{ id: 'av-row' }]),
  insertReservation: (params) => rows([{ id: params[0], status: params[6] || 'pending' }]),
  insertLine: (params) => rows([{ id: params[0], reservation_id: params[1], metadata: JSON.parse(params[9]) }]),
}

/** Default successful results for a release. */
export const RELEASE_DEFAULTS = {
  updateReservation: (params) => rows([{ id: params[3], status: params[0] }]),
  selectLines: () => rows([]),
  markLineReleased: (params) => rows([{ id: params[0], quantity: 1 }]),
  releaseCapacity: () => rows([{ id: 'av-row' }]),
}
