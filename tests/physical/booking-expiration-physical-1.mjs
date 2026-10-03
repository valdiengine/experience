#!/usr/bin/env node
/**
 * BOOKING-EXPIRATION-PHYSICAL-1 — physical expiration certification harness.
 *
 * WHAT THIS IS
 * The first certification that drives expiration against a REAL PostgreSQL
 * (Neon) database rather than a fake client. It proves four things physically:
 *
 *   A. expiration is atomic      — status change and capacity release commit together
 *   B. expiration is idempotent  — a repeated/stale delivery releases nothing twice
 *   C. expiration is all-or-nothing — a failure after the status UPDATE unwinds it
 *   D. expiration is tenant-scoped — one tenant's context cannot touch another's rows
 *
 * PRODUCTION CODE ONLY
 * Everything that can change reservation state goes through production classes:
 *
 *   ReservationManager.createRequest()              (create)
 *   ReservationManager.expireReservationFromTimer() (expire)
 *     -> ReservationRepository.createReservationWithLine()
 *     -> ReservationRepository.expireReservationWithRelease()
 *     -> ReservationRepository.releaseReservationLines()
 *       -> database/connection/postgres.connection.js  transaction()  (real pg)
 *
 * There is NO second implementation of expiration in this file. The only SQL
 * written directly here is:
 *   (a) SELECT-only preflight and SELECT-only physical assertions,
 *   (b) the synthetic structural scaffolding (tenant/company/accommodation/availability),
 *   (c) two explicitly labelled negative-control mutations on synthetic rows only,
 *   (d) bounded cleanup addressed by exact deterministic ids.
 * Reservations and reservation lines are NEVER written directly: they are created
 * by the production manager, so the production-owned `metadata.__occupiedNights`
 * record is the one being certified.
 *
 * FAIL CLOSED / OPT IN
 * THREE independent conditions must ALL be satisfied before a pool is created:
 *   BOOKING_EXPIRATION_PHYSICAL_CERTIFY=1            explicit human opt-in
 *   DATABASE_URL                                     present (presence only; never printed)
 *   BOOKING_EXPIRATION_PHYSICAL_EXPECT_DATABASE      the exact disposable cert database name
 * If any is missing this file prints a refusal and exits 0 WITHOUT creating a
 * pool, WITHOUT connecting, and WITHOUT falling back to localhost/default database
 * configuration. `createPool()` in the production connector falls back to local
 * config when DATABASE_URL is unset, which is precisely why the gate is evaluated
 * before any production connection helper is touched.
 *
 * DISPOSABLE DATABASE IDENTITY (BOOKING-PHYSICAL-HARNESS-SAFETY-1)
 * The three conditions above still do not prove WHICH database is reached:
 * DATABASE_URL carries the Stage URL perfectly well, so an opted-in run pointed at
 * Stage would mutate Stage. A fourth, independent condition therefore closes the
 * run against the server's OWN answer:
 *
 *   `SELECT current_database()` on the live connection must equal the declared
 *   BOOKING_EXPIRATION_PHYSICAL_EXPECT_DATABASE by EXACT string equality.
 *
 * That read is issued as the FIRST statement on the connection, before the
 * connection probe and before every other preflight query, so the identity is
 * established while the database is still untouched. No substring, hostname or
 * NODE_ENV heuristic is accepted in its place — see
 * `tests/physical/support/physical-database-identity.guard.mjs`.
 *
 * Until that comparison has passed, `state.databaseIdentityVerified` stays false
 * and `cleanup()` issues NO statement at all: the fixture DELETEs are mutations
 * too, and must not run against a database this harness has not proven it owns.
 *
 * NOT REACHABLE BY A NORMAL TEST RUN
 * tests/reports/generate.js lists its suites explicitly and this file is not among
 * them. It is deliberately NOT named `*.test.js`, and nothing globs `tests/`.
 *
 * SYNTHETIC DATA ONLY
 * Two synthetic tenants with fixed UUIDs and clearly non-routable fixture slugs.
 * Ensueno is never used. No customer row is ever read. Cleanup is bounded to the
 * exact ids this harness creates.
 */

import {
  createPool,
  query,
  closePool,
  getPoolStats,
} from '../../database/connection/postgres.connection.js'
import { ReservationRepository } from '../../capabilities/persistence/repositories/reservation/reservation.repository.js'
import { PostgresReservationAdapter } from '../../capabilities/persistence/adapters/postgres/postgres.reservation.adapter.js'
import { ReservationManager } from '../../capabilities/reservation/reservation.manager.js'
import { AvailabilityCapability } from '../../capabilities/availability/availability.capability.js'
import { RESERVATION_STATUS } from '../../capabilities/reservation/reservation.status.js'
import {
  AvailabilityConflictError,
  AvailabilityConsumptionRecordError,
} from '../../capabilities/availability/availability.errors.js'
import {
  CERTIFY_VARIABLE,
  EXPECT_DATABASE_VARIABLE,
  PhysicalDatabaseIdentityError,
  describeDatabaseName,
  evaluateCertificationGates,
  hasDatabaseUrl,
  readAndVerifyDatabaseIdentity,
} from './support/physical-database-identity.guard.mjs'

/* ------------------------------------------------------------------ *
 * Gates, deterministic fixture identity and execution-relative dates
 * ------------------------------------------------------------------ */

const GATE_VARIABLE = CERTIFY_VARIABLE
const EXPECT_DATABASE_GATE_VARIABLE = EXPECT_DATABASE_VARIABLE
const SLUG_PREFIX = 'physical-expiration-1'

/**
 * Deterministic synthetic identity. Fixed ids and fixed slugs are what make the
 * preflight "does not already exist" check, the residue check and the cleanup
 * exact and auditable. The DATES are derived from execution time instead, because
 * production reservation validation refuses a check-in in the past and a fixed
 * date would eventually age out and stop being a valid fixture.
 */
const FIXTURE = {
  tenantA: {
    id: '9f1b0a00-0000-4000-8000-0000000000a1',
    slug: `${SLUG_PREFIX}-tenant-a`,
    name: 'Physical Expiration 1 - Tenant A',
  },
  tenantB: {
    id: '9f1b0a00-0000-4000-8000-0000000000b1',
    slug: `${SLUG_PREFIX}-tenant-b`,
    name: 'Physical Expiration 1 - Tenant B',
  },
  companyA: {
    id: '9f1b0a00-0000-4000-8000-0000000000a2',
    slug: `${SLUG_PREFIX}-company-a`,
    name: 'Physical Expiration 1 - Company A',
  },
  companyB: {
    id: '9f1b0a00-0000-4000-8000-0000000000b2',
    slug: `${SLUG_PREFIX}-company-b`,
    name: 'Physical Expiration 1 - Company B',
  },
  accommodationA: {
    id: '9f1b0a00-0000-4000-8000-0000000000a3',
    slug: `${SLUG_PREFIX}-accommodation-a`,
    name: 'Physical Expiration 1 - Accommodation A',
  },
  accommodationB: {
    id: '9f1b0a00-0000-4000-8000-0000000000b3',
    slug: `${SLUG_PREFIX}-accommodation-b`,
    name: 'Physical Expiration 1 - Accommodation B',
  },
  availabilityA1: '9f1b0a00-0000-4000-8000-0000000000a4', // test A / B
  availabilityA2: '9f1b0a00-0000-4000-8000-0000000000a5', // test C - legacy refusal control
  availabilityA3: '9f1b0a00-0000-4000-8000-0000000000a6', // test C - capacity underflow control
  availabilityB1: '9f1b0a00-0000-4000-8000-0000000000b4', // test D - tenant isolation
  reservationA1: '9f1b0a00-0000-4000-8000-0000000000a7', // test A / B
  reservationA2: '9f1b0a00-0000-4000-8000-0000000000a8', // test C - legacy refusal control
  reservationA3: '9f1b0a00-0000-4000-8000-0000000000a9', // test C - capacity underflow control
  reservationB1: '9f1b0a00-0000-4000-8000-0000000000b5', // test D - tenant isolation
}

const TENANT_IDS = [FIXTURE.tenantA.id, FIXTURE.tenantB.id]
const COMPANY_IDS = [FIXTURE.companyA.id, FIXTURE.companyB.id]
const ACCOMMODATION_IDS = [FIXTURE.accommodationA.id, FIXTURE.accommodationB.id]
const AVAILABILITY_IDS = [
  FIXTURE.availabilityA1,
  FIXTURE.availabilityA2,
  FIXTURE.availabilityA3,
  FIXTURE.availabilityB1,
]
const RESERVATION_IDS = [
  FIXTURE.reservationA1,
  FIXTURE.reservationA2,
  FIXTURE.reservationA3,
  FIXTURE.reservationB1,
]
const ALL_SLUGS = [
  FIXTURE.tenantA.slug,
  FIXTURE.tenantB.slug,
  FIXTURE.companyA.slug,
  FIXTURE.companyB.slug,
  FIXTURE.accommodationA.slug,
  FIXTURE.accommodationB.slug,
]

const INVENTORY = 2
const QUANTITY = 1

/** Columns the certification depends on, matching the two external SELECT-only gates. */
const REQUIRED_COLUMNS = {
  tenants: ['id', 'name', 'slug'],
  companies: ['id', 'tenant_id', 'name', 'slug'],
  accommodations: ['id', 'tenant_id', 'company_id', 'name', 'slug'],
  availability: [
    'id', 'tenant_id', 'accommodation_id', 'date', 'status', 'is_blocked',
    'inventory', 'reserved_count', 'target_type', 'target_id',
  ],
  reservations: [
    'id', 'tenant_id', 'accommodation_id', 'status', 'cancelled_at',
    'updated_at', 'created_at', 'metadata', 'customer', 'confirmation_code',
  ],
  reservation_lines: [
    'id', 'reservation_id', 'line_order', 'target_type', 'target_id', 'temporal',
    'quantity', 'metadata', 'released_at', 'created_at',
  ],
}

const REQUIRED_TABLES = Object.keys(REQUIRED_COLUMNS)

/**
 * The exact column set the scaffolding writes. Preflight proves every one of them
 * exists in the live database BEFORE any mutation, so schema drift can never turn
 * into an INSERT failure halfway through the fixture.
 */
const FIXTURE_WRITE_COLUMNS = {
  tenants: ['id', 'name', 'slug'],
  companies: ['id', 'tenant_id', 'name', 'slug'],
  accommodations: ['id', 'tenant_id', 'company_id', 'name', 'slug'],
  availability: [
    'id', 'tenant_id', 'accommodation_id', 'date', 'status', 'is_blocked',
    'inventory', 'reserved_count', 'target_type', 'target_id',
  ],
}

/* ------------------------------------------------------------------ *
 * Exact unique-index detection, decided entirely inside PostgreSQL
 *
 * The production consume and release statements address a single
 * (accommodation_id, date) tuple, so the certification needs an index whose
 * ORDERED key columns are exactly [accommodation_id, date].
 *
 * This predicate returns a scalar count and nothing else. All matching is done
 * server-side; no JavaScript ever sees a name[], an attnum array, an index name
 * or any other driver-specific rendering. The client receives one integer.
 *
 * Rejected by construction:
 *   - non-unique indexes            -> indisunique must be true
 *   - invalid / concurrently-built  -> indisvalid must be true
 *   - partial indexes               -> indpred must be NULL
 *   - expression indexes            -> indexprs must be NULL
 *   - three-or-more-column keys     -> indnatts must be exactly 2
 *   - accommodation_id alone        -> ordered equality fails
 *   - date alone                    -> ordered equality fails
 *   - reversed (date, accommodation_id)
 *                                     -> ordered equality fails
 *   - (accommodation_id, date, tenant_id)
 *                                     -> indnatts and ordered equality both fail
 *
 * `indkey` is an `int2vector`, a legacy vector type whose array coercion is not
 * a faithful expansion of every element. It is therefore converted through its
 * text form into a real smallint[] before unnest, which yields every key attnum
 * in declaration order.
 * ------------------------------------------------------------------ */

const AVAILABILITY_EXACT_UNIQUE_INDEX_SQL = `
  SELECT COUNT(*)::int AS exact_accommodation_date_unique_count
  FROM pg_class t
  JOIN pg_namespace tn ON tn.oid = t.relnamespace
  JOIN pg_index ix ON ix.indrelid = t.oid
  WHERE tn.nspname = current_schema()
    AND t.relname = 'availability'
    AND ix.indisunique
    AND ix.indisvalid
    AND ix.indpred IS NULL
    AND ix.indexprs IS NULL
    AND ix.indnatts = 2
    AND (
      SELECT array_agg(a.attname ORDER BY k.ord)
      FROM unnest(string_to_array(ix.indkey::text, ' ')::smallint[]) WITH ORDINALITY AS k(attnum, ord)
      JOIN pg_attribute a
        ON a.attrelid = ix.indrelid
       AND a.attnum = k.attnum
       AND a.attisdropped = false
    ) = ARRAY['accommodation_id','date']::name[]
`

/* ------------------------------------------------------------------ *
 * Output helpers
 * ------------------------------------------------------------------ */

class PhysicalCertificationError extends Error {
  constructor(message) {
    super(message)
    this.name = 'PhysicalCertificationError'
  }
}

/**
 * The single, private writer for marker output.
 *
 * It is captured from `console.log` at module load, BEFORE any output guard is
 * installed, so marker lines can never be intercepted, filtered or suppressed.
 */
const RAW_WRITE = console.log.bind(console)

/**
 * Machine-readable, secret-safe marker. Only booleans, finite numbers and short
 * non-sensitive tokens are ever printed: no SQL parameter, no row object and no
 * environment value is ever passed here.
 */
function marker(name, value) {
  let printable
  if (typeof value === 'boolean') {
    printable = String(value)
  } else if (typeof value === 'number' && Number.isFinite(value)) {
    printable = String(value)
  } else if (typeof value === 'string' || value === null) {
    printable = String(value)
  } else {
    printable = 'unsupported'
  }
  RAW_WRITE(`${name}=${printable}`)
}

/* ------------------------------------------------------------------ *
 * Output guard
 *
 * The harness imports the REAL production connector, and that connector writes
 * to the console on its own:
 *
 *   database/connection/postgres.connection.js:84   console.error(..., error.message)
 *   database/connection/postgres.connection.js:99   console.error(..., error.message)
 *   database/connection/postgres.connection.js:47   console.error(..., err)
 *   database/connection/postgres.connection.js:51   console.log('[PostgreSQL] New client connected')
 *   database/connection/postgres.connection.js:79   console.log('[PostgreSQL] Query:', ...)
 *
 * `error.message` from `pg` can embed the target hostname, an IP:port or the
 * username, so harness-side redaction alone is NOT sufficient. The guard below
 * therefore suppresses every console write that does not originate from
 * `marker()`, so the certification output can only ever contain markers.
 *
 * Suppressed lines are never printed. They are counted, and the count is
 * reported as a marker, so suppressed output is auditable rather than lost.
 * ------------------------------------------------------------------ */

const GUARDED_CONSOLE_METHODS = ['log', 'info', 'warn', 'error', 'debug', 'trace', 'dir']
let restoreOutputGuard = null
let suppressedOutputLines = 0

function installOutputGuard() {
  const original = {}
  for (const method of GUARDED_CONSOLE_METHODS) {
    original[method] = console[method]
    console[method] = () => {
      suppressedOutputLines += 1
    }
  }
  suppressedOutputLines = 0

  let restored = false
  restoreOutputGuard = () => {
    if (restored) return
    restored = true
    for (const method of GUARDED_CONSOLE_METHODS) {
      console[method] = original[method]
    }
    restoreOutputGuard = null
  }
}

/**
 * Installs process-level handlers so that an asynchronous failure escaping
 * production code can neither print a raw stack nor be silently ignored.
 *
 * Registering these listeners also suppresses Node's own default
 * unhandled-rejection and uncaught-exception reporting.
 */
function installProcessGuards() {
  process.on('unhandledRejection', (reason) => {
    RAW_WRITE(`UNHANDLED_REJECTION=${describeError(reason)}`)
    process.exitCode = 1
  })
  process.on('uncaughtException', (error) => {
    RAW_WRITE(`UNCAUGHT_EXCEPTION=${describeError(error)}`)
    process.exitCode = 1
  })
}

function assert(condition, message) {
  if (!condition) {
    throw new PhysicalCertificationError(message)
  }
}

function markerOrThrow(name, condition, message) {
  marker(name, Boolean(condition))
  assert(condition, message)
}

/**
 * The ONLY description of a failure that may ever reach output.
 *
 * `error.name` is deliberately not trusted verbatim: an attacker- or
 * library-controlled `name` could itself carry a hostname, an IP:port, a username
 * or a connection string. The value is therefore admitted only if it is a short
 * bare identifier, and is otherwise reduced to a fixed literal.
 *
 * `error.message`, `error.stack`, `error.code`, `error.detail` and every other
 * enumerable property are NEVER read here, so no pg/network text can leak.
 */
const SAFE_ERROR_NAME = /^[A-Za-z][A-Za-z0-9_]{0,39}$/

function describeError(error) {
  if (error === null || (typeof error !== 'object' && typeof error !== 'function')) {
    return 'NonErrorThrow'
  }
  const name = error.name
  if (typeof name === 'string' && SAFE_ERROR_NAME.test(name)) {
    return name
  }
  return 'UnnamedError'
}

/* ------------------------------------------------------------------ *
 * Gate evaluation — runs before any connection helper is touched
 *
 * The decision logic itself lives in
 * `tests/physical/support/physical-database-identity.guard.mjs` so it can be proven
 * by deterministic tests that never open a socket. These two wrappers keep every
 * existing call site and marker contract unchanged while making the harness run
 * exactly the code the tests cover — there is no second, divergent copy of the gate
 * that a test could miss.
 * ------------------------------------------------------------------ */

/**
 * @returns {{allowed: boolean, reason: string|null, detail: string, expectedDatabase: string|null}}
 */
function evaluateGate(env) {
  return evaluateCertificationGates(env)
}

/**
 * Disposal-database identity gate, evaluated on the live connection.
 *
 * Called as the FIRST statement after `createPool()`, so the server is asked who it
 * is before it is asked anything else and long before anything is written. On any
 * refusal this throws, which unwinds `runCertification()` into `main()`'s handler:
 * the failure is reported by class name only, `cleanup()` refuses to issue a single
 * statement because `databaseIdentityVerified` is still false, and `closePool()`
 * still runs in the `finally`. The pool is therefore released on every refusal path.
 */
async function assertDisposableDatabaseIdentity(expected, state) {
  const identity = await readAndVerifyDatabaseIdentity({ expected, runQuery: query })

  marker('DATABASE_IDENTITY_VERIFIED', true)
  marker('EXPECTED_DATABASE', describeDatabaseName(expected))
  marker('ACTUAL_DATABASE', identity.database)

  // The single switch that authorises every later mutation in this run.
  state.databaseIdentityVerified = true
  return identity
}

/* ------------------------------------------------------------------ *
 * Execution-relative future dates
 * ------------------------------------------------------------------ */

/** UTC, strict YYYY-MM-DD. */
function utcDateString(daysFromToday) {
  const probe = new Date()
  probe.setUTCHours(0, 0, 0, 0)
  probe.setUTCDate(probe.getUTCDate() + daysFromToday)
  return probe.toISOString().slice(0, 10)
}

/**
 * One-night stays, spaced so each availability row is its own
 * (accommodation_id, date) tuple. Every date is comfortably in the future, as
 * production reservation validation requires, and far below 365 days ahead.
 */
function buildDates() {
  return {
    a1: { checkIn: utcDateString(30), checkOut: utcDateString(31) },
    a2: { checkIn: utcDateString(32), checkOut: utcDateString(33) },
    a3: { checkIn: utcDateString(34), checkOut: utcDateString(35) },
    b1: { checkIn: utcDateString(36), checkOut: utcDateString(37) },
  }
}

/* ------------------------------------------------------------------ *
 * Production stack — the real connector, adapter, repository and manager
 * ------------------------------------------------------------------ */

/**
 * Builds the production reservation stack for one synthetic tenant.
 *
 * The adapter, repository, manager and availability capability are the real
 * production classes. Only the surrounding runtime is intentionally minimal:
 *
 *   - no scheduler and no timer is attached, so no in-memory delivery can race a
 *     physical measurement; expiration is invoked directly through
 *     `expireReservationFromTimer`, which is the exact entry point a live timer
 *     calls, carrying the same expectedStatus a timer carries;
 *   - no auth runtime, so `#checkPermission` takes its production no-auth path;
 *   - no event bus, so the production emits are no-ops.
 *
 * Nothing about the expiration decision, the SQL, the transaction or the
 * `__occupiedNights` derivation is replaced or stubbed.
 */
function createProductionStack(tenantId, slug, name) {
  const adapter = new PostgresReservationAdapter({ name: 'postgres' }, { entityName: 'reservation' })
  const availabilityCapability = new AvailabilityCapability()

  const context = {
    tenant: { id: tenantId, slug, name },
    capabilities: {
      get(capabilityId) {
        return capabilityId === 'availability' ? availabilityCapability : undefined
      },
    },
    repositories: {},
    config: {},
    eventBus: null,
    runtime: null,
    dataManager: null,
  }

  const repository = new ReservationRepository(adapter, context, {})
  context.repositories.reservation = repository
  const manager = new ReservationManager(context)

  return { context, repository, manager, availabilityCapability }
}

/* ------------------------------------------------------------------ *
 * SELECT-only reads
 * ------------------------------------------------------------------ */

async function readReservation(id) {
  const result = await query(
    `SELECT id, tenant_id, accommodation_id, status, cancelled_at, expires_at, updated_at, deleted_at
     FROM reservations
     WHERE id = $1`,
    [id]
  )
  return result.rows[0] || null
}

async function readLines(reservationId) {
  const result = await query(
    `SELECT id, reservation_id, line_order, target_type, target_id, temporal, quantity, metadata, released_at
     FROM reservation_lines
     WHERE reservation_id = $1
     ORDER BY line_order ASC, id ASC`,
    [reservationId]
  )
  return result.rows
}

async function readAvailabilityById(id) {
  const result = await query(
    `SELECT id, tenant_id, accommodation_id, date, status, is_blocked, inventory, reserved_count, target_type, target_id
     FROM availability
     WHERE id = $1`,
    [id]
  )
  return result.rows[0] || null
}

/** The physical state every assertion is read from. SELECT-only. */
async function snapshotReservation(reservationId, availabilityId) {
  const reservation = await readReservation(reservationId)
  const lines = await readLines(reservationId)
  const availability = await readAvailabilityById(availabilityId)
  return { reservation, lines, availability }
}

function safeParseJson(value) {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

/**
 * Normalises a timestamptz for comparison.
 *
 * `pg` yields a fresh `Date` instance per query, so two reads of the same instant are
 * never `===`. Comparing `getTime()` is what makes "released_at did not change" a real
 * assertion instead of an accident of object identity.
 */
function timestampValue(value) {
  if (value === null || value === undefined) return null
  if (value instanceof Date) return value.getTime()
  return String(value)
}

/**
 * Interprets the single integer returned by AVAILABILITY_EXACT_UNIQUE_INDEX_SQL.
 *
 * This is deliberately trivial and is the ONLY JavaScript involved in the
 * detection. It cannot be order-sensitive or array-sensitive, because the
 * ordering decision was already made by PostgreSQL's ordered array equality.
 */
function isExactAccommodationDateUnique(count) {
  const parsed = Number(count)
  if (!Number.isFinite(parsed)) return false
  return parsed >= 1
}

async function detectExactAccommodationDateUnique() {
  const result = await query(AVAILABILITY_EXACT_UNIQUE_INDEX_SQL)
  const raw = result.rows[0]?.exact_accommodation_date_unique_count
  const count = Number(raw)
  const safeCount = Number.isFinite(count) ? count : 0
  return { unique: isExactAccommodationDateUnique(safeCount), count: safeCount }
}

function occupiedNightsOf(line) {
  const metadata = typeof line?.metadata === 'string' ? safeParseJson(line.metadata) : line?.metadata
  if (!metadata || typeof metadata !== 'object') return null
  return metadata.__occupiedNights ?? null
}

/* ------------------------------------------------------------------ *
 * Residue accounting (SELECT-only, exact ids / exact slugs only)
 * ------------------------------------------------------------------ */

async function countFixtureResidue() {
  const result = await query(
    `SELECT
       (SELECT COUNT(*) FROM reservations WHERE id = ANY($1::uuid[])) AS reservations,
       (SELECT COUNT(*) FROM reservation_lines WHERE reservation_id = ANY($1::uuid[]) OR id = ANY($1::uuid[])) AS reservation_lines,
       (SELECT COUNT(*) FROM availability WHERE id = ANY($2::uuid[])) AS availability,
       (SELECT COUNT(*) FROM accommodations WHERE id = ANY($3::uuid[])) AS accommodations,
       (SELECT COUNT(*) FROM companies WHERE id = ANY($4::uuid[])) AS companies,
       (SELECT COUNT(*) FROM tenants WHERE id = ANY($5::uuid[])) AS tenants`,
    [RESERVATION_IDS, AVAILABILITY_IDS, ACCOMMODATION_IDS, COMPANY_IDS, TENANT_IDS]
  )
  const row = result.rows[0] || {}
  return {
    reservations: Number(row.reservations || 0),
    reservationLines: Number(row.reservation_lines || 0),
    availability: Number(row.availability || 0),
    accommodations: Number(row.accommodations || 0),
    companies: Number(row.companies || 0),
    tenants: Number(row.tenants || 0),
  }
}

async function countFixtureSlugResidue() {
  const result = await query(
    `SELECT
       (SELECT COUNT(*) FROM tenants WHERE slug = ANY($1::text[])) AS tenants,
       (SELECT COUNT(*) FROM companies WHERE slug = ANY($1::text[])) AS companies,
       (SELECT COUNT(*) FROM accommodations WHERE slug = ANY($1::text[])) AS accommodations`,
    [ALL_SLUGS]
  )
  const row = result.rows[0] || {}
  const tenants = Number(row.tenants || 0)
  const companies = Number(row.companies || 0)
  const accommodations = Number(row.accommodations || 0)
  return { tenants, companies, accommodations, total: tenants + companies + accommodations }
}

/* ------------------------------------------------------------------ *
 * PREFLIGHT — SELECT only. Nothing before this block mutates anything.
 * ------------------------------------------------------------------ */

async function preflight(state) {
  marker('PREFLIGHT_STARTED', true)

  // 0. DISPOSABLE DATABASE IDENTITY — the first statement on the connection.
  //    `createPool()` opens a connection but issues no statement and mutates
  //    nothing, so the identity read below is the first thing the server is asked
  //    and the database is still completely untouched. Every remaining preflight
  //    query is SELECT-only, and the first write in the whole run is `scaffold()`,
  //    which is reachable only through this gate having passed.
  createPool()
  marker('EXPECTED_DATABASE_DECLARED', describeDatabaseName(state.expectedDatabase))
  await assertDisposableDatabaseIdentity(state.expectedDatabase, state)

  // 1. PostgreSQL connection.
  const connectionProbe = await query('SELECT 1 AS ok')
  assert(connectionProbe.rows.length === 1, 'Connection probe returned no row')

  const versionProbe = await query('SELECT version() AS version')
  const versionText = String(versionProbe.rows[0]?.version || '')
  markerOrThrow(
    'POSTGRESQL_CONFIRMED',
    /PostgreSQL/i.test(versionText),
    'The target did not identify itself as PostgreSQL'
  )

  // 2. Required tables.
  const tablesResult = await query(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = current_schema()
       AND table_name = ANY($1::text[])`,
    [REQUIRED_TABLES]
  )
  const presentTables = new Set(tablesResult.rows.map((row) => row.table_name))
  const missingTables = REQUIRED_TABLES.filter((table) => !presentTables.has(table))
  markerOrThrow('REQUIRED_TABLES_PRESENT', missingTables.length === 0, `Required tables are missing: ${missingTables.join(', ')}`)
  marker('MISSING_TABLE_COUNT', missingTables.length)

  // 3/4. Required columns, including reservation_lines.released_at and
  //      availability.target_id / target_type.
  const columnsResult = await query(
    `SELECT table_name, column_name, is_nullable
     FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND table_name = ANY($1::text[])`,
    [REQUIRED_TABLES]
  )
  const columnIndex = new Map(
    columnsResult.rows.map((row) => [`${row.table_name}.${row.column_name}`, row])
  )

  const missingColumns = []
  for (const [table, columns] of Object.entries(REQUIRED_COLUMNS)) {
    for (const column of columns) {
      if (!columnIndex.has(`${table}.${column}`)) missingColumns.push(`${table}.${column}`)
    }
  }
  markerOrThrow('REQUIRED_COLUMNS_PRESENT', missingColumns.length === 0, `Required columns are missing: ${missingColumns.join(', ')}`)
  marker('MISSING_COLUMN_COUNT', missingColumns.length)

  const releasedAtColumn = columnIndex.get('reservation_lines.released_at')
  markerOrThrow('RESERVATION_LINES_RELEASED_AT', Boolean(releasedAtColumn), 'reservation_lines.released_at is missing')
  markerOrThrow(
    'RESERVATION_LINES_RELEASED_AT_NULLABLE',
    releasedAtColumn?.is_nullable === 'YES',
    'reservation_lines.released_at must be nullable to be an unreleased marker'
  )

  const targetIdColumn = columnIndex.get('availability.target_id')
  markerOrThrow(
    'AVAILABILITY_TARGET_ID_NOT_NULL',
    targetIdColumn?.is_nullable === 'NO',
    'availability.target_id must be NOT NULL'
  )
  marker('AVAILABILITY_TARGET_TYPE', columnIndex.has('availability.target_type'))

  // 5. Unique (accommodation_id, date) on availability - the identity the
  //    production consume/release statements address. Decided by PostgreSQL.
  const exactUnique = await detectExactAccommodationDateUnique()
  marker('AVAILABILITY_EXACT_UNIQUE_INDEX_COUNT', exactUnique.count)
  markerOrThrow(
    'AVAILABILITY_ACCOMMODATION_DATE_UNIQUE',
    exactUnique.unique,
    'availability has no unique index over exactly (accommodation_id, date)'
  )

  // 6. Every column the scaffolding writes must exist before anything is written.
  const missingWriteColumns = []
  for (const [table, columns] of Object.entries(FIXTURE_WRITE_COLUMNS)) {
    for (const column of columns) {
      if (!columnIndex.has(`${table}.${column}`)) missingWriteColumns.push(`${table}.${column}`)
    }
  }
  markerOrThrow(
    'FIXTURE_WRITE_COLUMNS_PRESENT',
    missingWriteColumns.length === 0,
    `Fixture scaffolding columns are missing: ${missingWriteColumns.join(', ')}`
  )

  // 7. Deterministic fixture ids and slugs must not already exist, and no
  //    previous certification residue may remain.
  const residue = await countFixtureResidue()
  const residueTotal = Object.values(residue).reduce((sum, value) => sum + value, 0)
  markerOrThrow(
    'FIXTURE_IDS_ABSENT',
    residueTotal === 0,
    'Rows already exist under the deterministic fixture ids; a previous certification must be cleaned before re-running'
  )

  const slugResidue = await countFixtureSlugResidue()
  markerOrThrow(
    'FIXTURE_SLUGS_ABSENT',
    slugResidue.total === 0,
    'Rows already exist under the fixture slugs; a previous certification must be cleaned before re-running'
  )

  marker('PREFLIGHT_PASS', true)
}

/* ------------------------------------------------------------------ *
 * Synthetic structural scaffolding
 * ------------------------------------------------------------------ */

async function scaffold(dates) {
  await query(
    `INSERT INTO tenants (id, name, slug) VALUES ($1, $2, $3), ($4, $5, $6)`,
    [
      FIXTURE.tenantA.id, FIXTURE.tenantA.name, FIXTURE.tenantA.slug,
      FIXTURE.tenantB.id, FIXTURE.tenantB.name, FIXTURE.tenantB.slug,
    ]
  )

  await query(
    `INSERT INTO companies (id, tenant_id, name, slug) VALUES ($1, $2, $3, $4), ($5, $6, $7, $8)`,
    [
      FIXTURE.companyA.id, FIXTURE.tenantA.id, FIXTURE.companyA.name, FIXTURE.companyA.slug,
      FIXTURE.companyB.id, FIXTURE.tenantB.id, FIXTURE.companyB.name, FIXTURE.companyB.slug,
    ]
  )

  await query(
    `INSERT INTO accommodations (id, tenant_id, company_id, name, slug)
     VALUES ($1, $2, $3, $4, $5), ($6, $7, $8, $9, $10)`,
    [
      FIXTURE.accommodationA.id, FIXTURE.tenantA.id, FIXTURE.companyA.id,
      FIXTURE.accommodationA.name, FIXTURE.accommodationA.slug,
      FIXTURE.accommodationB.id, FIXTURE.tenantB.id, FIXTURE.companyB.id,
      FIXTURE.accommodationB.name, FIXTURE.accommodationB.slug,
    ]
  )

  // target_id equals the accommodation id: the production release path addresses
  // capacity through reservation_lines.target_id.
  const availabilityRows = [
    [FIXTURE.availabilityA1, FIXTURE.tenantA.id, FIXTURE.accommodationA.id, dates.a1.checkIn],
    [FIXTURE.availabilityA2, FIXTURE.tenantA.id, FIXTURE.accommodationA.id, dates.a2.checkIn],
    [FIXTURE.availabilityA3, FIXTURE.tenantA.id, FIXTURE.accommodationA.id, dates.a3.checkIn],
    [FIXTURE.availabilityB1, FIXTURE.tenantB.id, FIXTURE.accommodationB.id, dates.b1.checkIn],
  ]

  for (const [id, tenantId, accommodationId, date] of availabilityRows) {
    await query(
      `INSERT INTO availability (
         id, tenant_id, accommodation_id, date, status, is_blocked,
         inventory, reserved_count, target_type, target_id
       ) VALUES ($1, $2, $3, $4, 'available', false, $5, 0, 'accommodation', $6)`,
      [id, tenantId, accommodationId, date, INVENTORY, accommodationId]
    )
  }

  marker('SCAFFOLD_CREATED', true)
  marker('FIXTURE_INVENTORY', INVENTORY)
  marker('FIXTURE_QUANTITY', QUANTITY)
}

/* ------------------------------------------------------------------ *
 * Production reservation creation
 * ------------------------------------------------------------------ */

/**
 * Reservation creation ALWAYS goes through the production manager so the
 * reservation row and its line - including the production-owned
 * `metadata.__occupiedNights` record - are written by production code inside the
 * real PostgreSQL transaction.
 */
async function createProductionReservation(manager, { reservationId, accommodationId, dates, label }) {
  const created = await manager.createRequest({
    id: reservationId,
    accommodationId,
    resourceId: accommodationId,
    customer: {
      name: `Physical Expiration 1 ${label}`,
      email: `${SLUG_PREFIX}-${label}@example.invalid`,
      channelPreference: 'email',
    },
    dates: { checkIn: dates.checkIn, checkOut: dates.checkOut },
    guests: 1,
    source: 'physical_certification',
    notes: 'BOOKING-EXPIRATION-PHYSICAL-1 synthetic fixture',
  })
  assert(
    created?.success === true,
    `Production createRequest failed for ${label}: ${JSON.stringify(created?.errors || created?.reason || null)}`
  )
  assert(
    created.reservationId === reservationId,
    'The production manager did not honour the deterministic reservation id'
  )
  return created.reservationId
}

/* ------------------------------------------------------------------ *
 * TEST A - successful physical expiration
 * ------------------------------------------------------------------ */

async function testASuccessfulExpiration(state) {
  const { stackA, dates } = state

  const initial = await readAvailabilityById(FIXTURE.availabilityA1)
  assert(initial, 'Tenant A initial availability row is missing')
  marker('TENANT_A_INITIAL_RESERVED_COUNT', Number(initial.reserved_count))
  assert(Number(initial.reserved_count) === 0, 'Tenant A initial reserved_count must be 0')
  assert(
    initial.status === 'available' && initial.is_blocked === false,
    'Tenant A initial availability must be available and not blocked'
  )
  assert(
    initial.target_type === 'accommodation' && initial.target_id === FIXTURE.accommodationA.id,
    'Tenant A availability target identity does not match its accommodation'
  )

  const reservationId = await createProductionReservation(stackA.manager, {
    reservationId: FIXTURE.reservationA1,
    accommodationId: FIXTURE.accommodationA.id,
    dates: dates.a1,
    label: 'tenant-a',
  })
  state.observedReservationIds.add(reservationId)

  const afterCreate = await snapshotReservation(reservationId, FIXTURE.availabilityA1)
  marker('TENANT_A_STATUS_BEFORE', String(afterCreate.reservation?.status))
  assert(
    afterCreate.reservation?.status === RESERVATION_STATUS.REQUESTED,
    `Tenant A reservation must be ${RESERVATION_STATUS.REQUESTED} after creation`
  )
  marker('TENANT_A_AFTER_CREATE_RESERVED_COUNT', Number(afterCreate.availability?.reserved_count))
  assert(
    Number(afterCreate.availability?.reserved_count) === 1,
    'Tenant A reserved_count must be 1 after the production create'
  )
  assert(afterCreate.lines.length === 1, 'Tenant A must have exactly one reservation line')

  const line = afterCreate.lines[0]
  // Marker name states the asserted fact, not its negation: true means the line
  // is UNRELEASED (released_at IS NULL) before expiration. The pre-remediation
  // name TENANT_A_LINE_RELEASED_BEFORE read as "line released before", which is
  // the opposite of what it measured. See report section 17.
  marker('TENANT_A_LINE_UNRELEASED_BEFORE', line.released_at === null)
  assert(line.released_at === null, 'Tenant A line must not be released before expiration')
  assert(
    line.target_id === FIXTURE.accommodationA.id,
    'The production line target_id must equal the accommodation id the release path addresses'
  )

  const record = occupiedNightsOf(line)
  marker('OCCUPIED_NIGHTS_VERSION', Number(record?.version))
  markerOrThrow(
    'OCCUPIED_NIGHTS_RECORD_PRESENT',
    Boolean(record) && record.version === 1,
    'The production __occupiedNights record must exist at version 1'
  )
  markerOrThrow(
    'OCCUPIED_NIGHTS_MATCHES_OCCUPIED_NIGHT',
    Array.isArray(record?.dates)
      && record.dates.length === 1
      && record.dates[0] === dates.a1.checkIn
      && record.quantity === QUANTITY,
    'The __occupiedNights record must match the single occupied night and the reserved quantity'
  )

  const tenantBBefore = await readAvailabilityById(FIXTURE.availabilityB1)
  assert(tenantBBefore, 'Tenant B availability row is missing')

  const expiration = await stackA.manager.expireReservationFromTimer(
    reservationId,
    RESERVATION_STATUS.REQUESTED
  )
  marker('TENANT_A_EXPIRATION_SUCCESS', expiration?.success === true)
  assert(
    expiration?.success === true && expiration?.status === RESERVATION_STATUS.EXPIRED,
    `Tenant A expiration must succeed as ${RESERVATION_STATUS.EXPIRED}: ${JSON.stringify({
      success: expiration?.success,
      status: expiration?.status,
      reason: expiration?.reason,
    })}`
  )

  const afterExpire = await snapshotReservation(reservationId, FIXTURE.availabilityA1)
  marker('TENANT_A_STATUS_AFTER', String(afterExpire.reservation?.status))
  assert(
    afterExpire.reservation?.status === RESERVATION_STATUS.EXPIRED,
    `Tenant A reservation must be ${RESERVATION_STATUS.EXPIRED} after expiration`
  )
  marker('TENANT_A_AFTER_EXPIRATION_RESERVED_COUNT', Number(afterExpire.availability?.reserved_count))
  assert(
    Number(afterExpire.availability?.reserved_count) === 0,
    'Tenant A reserved_count must return to 0 after expiration'
  )
  marker('TENANT_A_LINE_RELEASED_AFTER', afterExpire.lines[0]?.released_at !== null)
  assert(
    afterExpire.lines.length === 1 && afterExpire.lines[0].released_at !== null,
    'Tenant A line must be released after expiration'
  )
  marker('TENANT_A_AVAILABILITY_STATUS_AFTER', String(afterExpire.availability?.status))
  markerOrThrow(
    'TENANT_A_AVAILABILITY_STATUS_RESTORED',
    afterExpire.availability?.status === 'available',
    'Tenant A availability status must return to available'
  )
  markerOrThrow(
    'TENANT_A_CANCELLED_AT_UNTOUCHED',
    afterExpire.reservation?.cancelled_at === null,
    'Expiration must not write cancelled_at'
  )

  const tenantBAfter = await readAvailabilityById(FIXTURE.availabilityB1)
  markerOrThrow(
    'TENANT_B_UNCHANGED_BY_TENANT_A_EXPIRATION',
    Number(tenantBAfter.reserved_count) === Number(tenantBBefore.reserved_count),
    'Tenant A expiration changed Tenant B capacity'
  )

  marker('TEST_A_PASS', true)
}

/* ------------------------------------------------------------------ *
 * TEST B - repeated / stale delivery
 * ------------------------------------------------------------------ */

async function testBRepeatedDelivery(state) {
  const { stackA } = state
  const reservationId = FIXTURE.reservationA1
  const before = await snapshotReservation(reservationId, FIXTURE.availabilityA1)
  const releasedAtBefore = timestampValue(before.lines[0]?.released_at)

  // Manager level: a timer that fires again for the state it was armed for.
  const repeated = await stackA.manager.expireReservationFromTimer(
    reservationId,
    RESERVATION_STATUS.REQUESTED
  )
  marker('REPEATED_DELIVERY_REFUSAL_REASON', String(repeated?.reason))
  assert(
    repeated?.success === false && repeated?.reason === 'stale_state',
    `A repeated delivery must be refused as stale_state: ${JSON.stringify({
      success: repeated?.success,
      reason: repeated?.reason,
    })}`
  )

  const afterManager = await snapshotReservation(reservationId, FIXTURE.availabilityA1)
  markerOrThrow(
    'REPEATED_DELIVERY_NO_SECOND_RELEASE',
    timestampValue(afterManager.lines[0]?.released_at) === releasedAtBefore
      && Number(afterManager.availability?.reserved_count) === 0
      && afterManager.reservation?.status === RESERVATION_STATUS.EXPIRED,
    'A repeated delivery must not release again, must not change capacity and must not move the status'
  )
  marker('REPEATED_DELIVERY_RESERVED_COUNT', Number(afterManager.availability?.reserved_count))
  marker('REPEATED_DELIVERY_STATUS', String(afterManager.reservation?.status))

  // Repository level: the compare-and-set is exercised directly, independently of
  // the manager's own stale short-circuit.
  const refusedAtRepository = await captureRefusal(() =>
    stackA.repository.expireReservationWithRelease(
      { id: reservationId, status: RESERVATION_STATUS.EXPIRED },
      FIXTURE.tenantA.id,
      { expectedStatus: RESERVATION_STATUS.REQUESTED }
    )
  )
  marker('REPOSITORY_STALE_GUARD_ERROR', refusedAtRepository.name)
  markerOrThrow(
    'REPOSITORY_STALE_GUARD_REFUSED',
    refusedAtRepository.raised,
    'The repository compare-and-set must refuse a stale expectedStatus'
  )

  const afterRepository = await snapshotReservation(reservationId, FIXTURE.availabilityA1)
  markerOrThrow(
    'REPEATED_DELIVERY_PHYSICALLY_STABLE',
    timestampValue(afterRepository.lines[0]?.released_at) === releasedAtBefore
      && Number(afterRepository.availability?.reserved_count) === 0
      && afterRepository.reservation?.status === RESERVATION_STATUS.EXPIRED,
    'The physical state changed after a refused stale expiration attempt'
  )

  marker('REPEATED_DELIVERY_PASS', true)
}

/**
 * The production expiration path deliberately does not swallow a release or
 * store failure, so a refusal leaves the call as a rejected promise. A returned
 * result is reported as such rather than being mistaken for a refusal.
 */
async function captureRefusal(operation) {
  try {
    const result = await operation()
    const outcome = result?.reason ? result.reason : (result?.success === true ? 'success' : 'unknown')
    return { raised: false, name: `returned:${outcome}` }
  } catch (error) {
    return { raised: true, name: describeError(error) }
  }
}

/* ------------------------------------------------------------------ *
 * TEST C - physical rollback (two negative controls)
 * ------------------------------------------------------------------ */

/**
 * Control 1 - legacy record-less DATE_RANGE refusal (BOOKING-LEGACY-RELEASE-GATE-1).
 *
 * The production manager cannot create a DATE_RANGE line without its
 * `__occupiedNights` record, so the record is removed from this SYNTHETIC line
 * with one bounded UPDATE addressed by exact line id and exact reservation id.
 * Capacity is untouched, so the release has nothing to do but refuse - and it
 * refuses AFTER the reservation status UPDATE has already been issued inside the
 * same transaction, which is exactly what must be unwound.
 */
async function testCRollbackLegacyRefusal(state) {
  const { stackA, dates } = state
  const reservationId = FIXTURE.reservationA2

  await createProductionReservation(stackA.manager, {
    reservationId,
    accommodationId: FIXTURE.accommodationA.id,
    dates: dates.a2,
    label: 'tenant-a-legacy-control',
  })
  state.observedReservationIds.add(reservationId)

  const created = await snapshotReservation(reservationId, FIXTURE.availabilityA2)
  assert(created.lines.length === 1, 'The legacy control must have exactly one line')

  // NEGATIVE-CONTROL SCAFFOLDING - synthetic rows only.
  const stripped = await query(
    `UPDATE reservation_lines SET metadata = '{}'::jsonb
     WHERE id = $1 AND reservation_id = $2
     RETURNING id`,
    [created.lines[0].id, reservationId]
  )
  assert(stripped.rows.length === 1, 'The legacy control line was not updated')

  const before = await snapshotReservation(reservationId, FIXTURE.availabilityA2)
  assert(
    occupiedNightsOf(before.lines[0]) === null,
    'The legacy control line must carry no occupied-nights record'
  )

  const refused = await captureRefusal(() =>
    stackA.manager.expireReservationFromTimer(reservationId, RESERVATION_STATUS.REQUESTED)
  )
  marker('ROLLBACK_LEGACY_REFUSAL_ERROR', refused.name)
  markerOrThrow(
    'ROLLBACK_LEGACY_REFUSAL_RAISED',
    refused.raised && refused.name === AvailabilityConsumptionRecordError.name,
    'The record-less DATE_RANGE refusal must be raised'
  )

  const after = await snapshotReservation(reservationId, FIXTURE.availabilityA2)
  marker('ROLLBACK_LEGACY_STATUS_AFTER', String(after.reservation?.status))
  marker('ROLLBACK_LEGACY_RESERVED_COUNT_AFTER', Number(after.availability?.reserved_count))
  marker('ROLLBACK_LEGACY_RESERVED_COUNT_BEFORE', Number(before.availability?.reserved_count))
  assert(
    after.reservation?.status === RESERVATION_STATUS.REQUESTED,
    'The status update must be unwound by ROLLBACK'
  )
  assert(
    Number(after.availability?.reserved_count) === Number(before.availability?.reserved_count),
    'Capacity must be unchanged after a refused release'
  )
  assert(
    after.lines[0]?.released_at === null,
    'released_at must still be NULL after a refused release'
  )

  marker('ROLLBACK_CONTROL_LEGACY_REFUSAL_PASS', true)
}

/**
 * Control 2 - capacity underflow, which fails AFTER `released_at` was written.
 *
 * reserved_count on this synthetic availability row is set to 0 so the guarded
 * decrement (`reserved_count >= $1`) cannot match. The release therefore marks
 * the line released and only then fails, which is the strongest available proof
 * that status, released_at and capacity unwind together.
 */
async function testCRollbackCapacityUnderflow(state) {
  const { stackA, dates } = state
  const reservationId = FIXTURE.reservationA3

  await createProductionReservation(stackA.manager, {
    reservationId,
    accommodationId: FIXTURE.accommodationA.id,
    dates: dates.a3,
    label: 'tenant-a-underflow-control',
  })
  state.observedReservationIds.add(reservationId)

  // NEGATIVE-CONTROL SCAFFOLDING - synthetic rows only.
  const zeroed = await query(
    `UPDATE availability SET reserved_count = 0
     WHERE id = $1 AND tenant_id = $2
     RETURNING reserved_count`,
    [FIXTURE.availabilityA3, FIXTURE.tenantA.id]
  )
  assert(zeroed.rows.length === 1, 'The underflow control availability row was not updated')

  const before = await snapshotReservation(reservationId, FIXTURE.availabilityA3)
  assert(before.lines.length === 1, 'The underflow control must have exactly one line')
  assert(
    before.lines[0].released_at === null && before.reservation.status === RESERVATION_STATUS.REQUESTED,
    'The underflow control must start unreleased and requested'
  )

  const refused = await captureRefusal(() =>
    stackA.manager.expireReservationFromTimer(reservationId, RESERVATION_STATUS.REQUESTED)
  )
  marker('ROLLBACK_UNDERFLOW_ERROR', refused.name)
  markerOrThrow(
    'ROLLBACK_UNDERFLOW_RAISED',
    refused.raised && refused.name === AvailabilityConflictError.name,
    'The insufficient-capacity conflict must be raised'
  )

  const after = await snapshotReservation(reservationId, FIXTURE.availabilityA3)
  marker('ROLLBACK_UNDERFLOW_STATUS_AFTER', String(after.reservation?.status))
  marker('ROLLBACK_UNDERFLOW_RESERVED_COUNT_AFTER', Number(after.availability?.reserved_count))
  marker('ROLLBACK_UNDERFLOW_RESERVED_COUNT_BEFORE', Number(before.availability?.reserved_count))
  // Marker name states the asserted fact: true means the line is UNRELEASED
  // (released_at IS NULL) after the underflow rollback, i.e. the released_at
  // write was unwound. The pre-remediation name ROLLBACK_UNDERFLOW_RELEASED_AT_AFTER
  // was read as "released_at is set after", the opposite of what it measured.
  marker('ROLLBACK_UNDERFLOW_LINE_UNRELEASED_AFTER', after.lines[0]?.released_at === null)
  assert(
    after.reservation?.status === RESERVATION_STATUS.REQUESTED,
    'The status update must be unwound by ROLLBACK'
  )
  assert(
    after.lines[0]?.released_at === null,
    'A released_at written before the failure must be unwound by ROLLBACK'
  )
  assert(
    Number(after.availability?.reserved_count) === Number(before.availability?.reserved_count),
    'Capacity must be unchanged after the underflow failure'
  )

  marker('ROLLBACK_CONTROL_CAPACITY_UNDERFLOW_PASS', true)
}

/* ------------------------------------------------------------------ *
 * TEST D - tenant isolation
 * ------------------------------------------------------------------ */

async function testDTenantIsolation(state) {
  const { stackA, stackB, dates } = state
  const reservationB = FIXTURE.reservationB1

  await createProductionReservation(stackB.manager, {
    reservationId: reservationB,
    accommodationId: FIXTURE.accommodationB.id,
    dates: dates.b1,
    label: 'tenant-b',
  })
  state.observedReservationIds.add(reservationB)

  const bBefore = await snapshotReservation(reservationB, FIXTURE.availabilityB1)
  assert(
    bBefore.reservation.status === RESERVATION_STATUS.REQUESTED
      && Number(bBefore.availability.reserved_count) === 1
      && bBefore.lines[0].released_at === null,
    'Tenant B must start as a consumed, unreleased, requested reservation'
  )

  // 1. findById through Tenant A's repository context must not resolve B. The
  //    context tenant reaches the SQL as `tenant_id = <Tenant A>`, so this is a
  //    physical scoping proof, not only an in-memory guard.
  let crossTenantResolved = true
  try {
    const found = await stackA.repository.findById(reservationB, { throwIfNotFound: false })
    crossTenantResolved = Boolean(found)
  } catch {
    crossTenantResolved = false
  }
  markerOrThrow(
    'TENANT_ISOLATION_FIND_BY_ID',
    crossTenantResolved === false,
    'Tenant A context must not resolve a Tenant B reservation'
  )

  // 2. Expiring B from Tenant A's manager must not modify B.
  const managerAttempt = await stackA.manager.expireReservationFromTimer(
    reservationB,
    RESERVATION_STATUS.REQUESTED
  )
  marker('TENANT_ISOLATION_MANAGER_REFUSAL_REASON', String(managerAttempt?.reason))
  assert(
    managerAttempt?.success === false && managerAttempt?.reason === 'not_found',
    `Tenant A manager must refuse a Tenant B reservation: ${JSON.stringify({
      success: managerAttempt?.success,
      reason: managerAttempt?.reason,
    })}`
  )

  // 3. Line lookup through Tenant A must not expose B's lines.
  const linesUnderA = await stackA.repository.findLinesByReservationId(FIXTURE.tenantA.id, reservationB)
  marker('TENANT_ISOLATION_LINES_VISIBLE_TO_TENANT_A', Array.isArray(linesUnderA) ? linesUnderA.length : -1)
  assert(
    Array.isArray(linesUnderA) && linesUnderA.length === 0,
    'Tenant A must not read Tenant B lines'
  )

  // 4. The repository write addressed with Tenant A's tenant id must be refused
  //    by the tenant_id predicate rather than silently succeeding.
  const repositoryAttempt = await captureRefusal(() =>
    stackA.repository.expireReservationWithRelease(
      { id: reservationB, status: RESERVATION_STATUS.EXPIRED },
      FIXTURE.tenantA.id,
      { expectedStatus: RESERVATION_STATUS.REQUESTED }
    )
  )
  marker('TENANT_ISOLATION_REPOSITORY_ERROR', repositoryAttempt.name)
  markerOrThrow(
    'TENANT_ISOLATION_REPOSITORY_REFUSED',
    repositoryAttempt.raised,
    'A cross-tenant repository expiration must be refused'
  )

  // 5. Physical proof that Tenant B is untouched.
  const bAfter = await snapshotReservation(reservationB, FIXTURE.availabilityB1)
  marker('TENANT_B_STATUS_AFTER_ISOLATION', String(bAfter.reservation.status))
  marker('TENANT_B_RESERVED_COUNT_AFTER_ISOLATION', Number(bAfter.availability.reserved_count))
  assert(
    bAfter.reservation.status === RESERVATION_STATUS.REQUESTED,
    `Tenant B must still be ${RESERVATION_STATUS.REQUESTED}`
  )
  assert(
    Number(bAfter.availability.reserved_count) === 1,
    'Tenant B reserved_count must still be 1'
  )
  assert(bAfter.lines[0].released_at === null, 'Tenant B line must still be unreleased')

  // 6. Clean B through the production path, so its own release is certified too.
  const cleanupB = await stackB.manager.expireReservationFromTimer(
    reservationB,
    RESERVATION_STATUS.REQUESTED
  )
  assert(
    cleanupB?.success === true && cleanupB?.status === RESERVATION_STATUS.EXPIRED,
    'Tenant B must expire normally after the isolation proof'
  )
  const bFinal = await snapshotReservation(reservationB, FIXTURE.availabilityB1)
  markerOrThrow(
    'TENANT_B_CLEAN_EXPIRATION',
    Number(bFinal.availability.reserved_count) === 0 && bFinal.lines[0].released_at !== null,
    'Tenant B capacity must be restored by its own expiration'
  )

  marker('TENANT_ISOLATION_PASS', true)
}

/* ------------------------------------------------------------------ *
 * Cleanup - bounded, idempotent, exact-id only
 * ------------------------------------------------------------------ */

async function cleanup(state) {
  // MUTATION GATE. The fixture DELETEs below are writes, so they are authorised by
  // exactly the same proof as every other write in this run. If the identity gate
  // never passed — because it refused, or because the run failed before reaching
  // it — this harness has NOT established that the connected database is the
  // disposable certification database, and therefore issues no statement at all.
  // Without this, a refusal thrown from `preflight()` would still have fallen
  // through `main()`'s `finally` into six DELETE statements against whatever
  // database happened to be configured, which is precisely the destructive
  // behaviour this milestone exists to prevent.
  if (state.databaseIdentityVerified !== true) {
    marker('CLEANUP_SKIPPED_UNVERIFIED_IDENTITY', true)
    marker('DATABASE_IDENTITY_VERIFIED', false)
    return false
  }

  // Reservation ids are deterministic AND observed from the production return
  // values, so a partially created graph is still fully covered.
  const reservationIds = [...new Set([...RESERVATION_IDS, ...state.observedReservationIds])]

  // Note on pre-existing residue: preflight refuses to certify when the fixture
  // ids are already occupied, and this cleanup then removes those rows anyway,
  // because every predicate below is an exact fixture id and leaving synthetic
  // rows in the database is the worse outcome. The run still exits 1, so the
  // refusal is never masked.
  // Reverse-FK order. Every predicate is an exact id or an exact id set.
  await query(
    `DELETE FROM reservation_lines
     WHERE reservation_id = ANY($1::uuid[]) OR id = ANY($1::uuid[])`,
    [reservationIds]
  )
  await query(`DELETE FROM reservations WHERE id = ANY($1::uuid[])`, [reservationIds])
  await query(`DELETE FROM availability WHERE id = ANY($1::uuid[])`, [AVAILABILITY_IDS])
  await query(`DELETE FROM accommodations WHERE id = ANY($1::uuid[])`, [ACCOMMODATION_IDS])
  await query(`DELETE FROM companies WHERE id = ANY($1::uuid[])`, [COMPANY_IDS])
  await query(`DELETE FROM tenants WHERE id = ANY($1::uuid[])`, [TENANT_IDS])

  const residue = await countFixtureResidue()
  const slugResidue = await countFixtureSlugResidue()
  const residueTotal = Object.values(residue).reduce((sum, value) => sum + value, 0)

  marker('FIXTURE_RESIDUE_COUNT', residueTotal)
  marker('FIXTURE_SLUG_RESIDUE_COUNT', slugResidue.total)

  const clean = residueTotal === 0 && slugResidue.total === 0
  // NOTE: CLEANUP_PASS is deliberately NOT emitted here. `main()` owns the single
  // authoritative CLEANUP_PASS marker, because cleanup success alone must not be
  // reported as pass if pool closure later fails.
  assert(clean, `Cleanup left residue: ids=${residueTotal} slugs=${slugResidue.total}`)
  return true
}

/* ------------------------------------------------------------------ *
 * Entry point
 * ------------------------------------------------------------------ */

async function runCertification(state) {
  state.dates = buildDates()

  // The production repository lifecycle step the runtime performs before any write.
  state.stackA = createProductionStack(FIXTURE.tenantA.id, FIXTURE.tenantA.slug, FIXTURE.tenantA.name)
  state.stackB = createProductionStack(FIXTURE.tenantB.id, FIXTURE.tenantB.slug, FIXTURE.tenantB.name)
  await state.stackA.repository.initialize()
  await state.stackB.repository.initialize()

  await preflight(state)
  await scaffold(state.dates)

  marker('STAGE_REACHED', 'test_a')
  await testASuccessfulExpiration(state)
  marker('STAGE_REACHED', 'test_b')
  await testBRepeatedDelivery(state)
  marker('STAGE_REACHED', 'test_c1_legacy_refusal')
  await testCRollbackLegacyRefusal(state)
  marker('STAGE_REACHED', 'test_c2_capacity_underflow')
  await testCRollbackCapacityUnderflow(state)
  marker('STAGE_REACHED', 'test_d_tenant_isolation')
  await testDTenantIsolation(state)

  marker('ROLLBACK_PROOF_PASS', true)
}

async function main() {
  const gate = evaluateGate(process.env)

  if (!gate.allowed) {
    marker('BOOKING_EXPIRATION_PHYSICAL_1_START', false)
    marker('PHYSICAL_CERTIFICATION_REFUSED', true)
    marker('REFUSAL_REASON', gate.reason)
    marker('REFUSAL_DETAIL', gate.detail)
    marker('DATABASE_URL_PRESENT', hasDatabaseUrl(process.env))
    marker('EXPECTED_DATABASE', describeDatabaseName(gate.expectedDatabase))
    marker('DATABASE_IDENTITY_VERIFIED', false)
    marker('POOL_CREATED', false)
    marker('NODE_EXIT', 0)
    return
  }

  marker('BOOKING_EXPIRATION_PHYSICAL_1_START', true)
  marker('DATABASE_URL_PRESENT', true)

  // Installed BEFORE any production object is constructed or any production
  // query is issued, so no production console write can ever reach the terminal.
  installOutputGuard()
  installProcessGuards()

  const state = { observedReservationIds: new Set() }

  // The declaration proven acceptable by `evaluateGate()` above, carried to the
  // connection gate in `preflight()`. It is the ONLY identity this harness will
  // accept, and it was validated before any pool existed.
  state.expectedDatabase = gate.expectedDatabase

  // Fail-closed default. Every mutation in this run — the scaffolding INSERTs and
  // the cleanup DELETEs alike — is authorised by this flag, and it is set to true
  // at exactly one place: after `current_database()` has been compared for exact
  // equality against `state.expectedDatabase`. A refusal leaves it false, so the
  // run cannot write anything at all.
  state.databaseIdentityVerified = false

  let certificationPassed = false
  let cleanupPassed = false
  let poolClosed = false

  try {
    await runCertification(state)
    certificationPassed = true
  } catch (error) {
    // A stage marker that is absent is a stage whose proof was NOT established.
    // No per-test failure markers are invented here: attributing a specific test
    // as failed when the run may have stopped earlier would be a false claim.
    //
    // SECRET SAFETY: only the class name of the failure is ever reported. The
    // message, the stack and every other pg/network property are never printed,
    // because they can embed the target hostname, IP:port or username.
    marker('CERTIFICATION_FAILURE', describeError(error))

    // An identity refusal carries a stable, fixed reason code. Reporting it makes a
    // mis-pointed run diagnosable from the markers alone; the `reason` values are a
    // closed set defined by the guard, so no driver text can reach output here.
    if (error instanceof PhysicalDatabaseIdentityError) {
      marker('DATABASE_IDENTITY_REFUSAL_REASON', error.reason)
    }
  } finally {
    try {
      // `cleanup()` returns false when it refused to issue any statement because the
      // database identity was never verified. That is NOT a successful cleanup, and
      // it must not be reported as one — otherwise a skipped cleanup could be read as
      // "the database is clean", which is the opposite of what is known.
      cleanupPassed = (await cleanup(state)) === true
    } catch (error) {
      cleanupPassed = false
      marker('CLEANUP_FAILURE', describeError(error))
    }

    // A rejected closePool() must never escape main(): an escaping rejection
    // becomes an unhandled rejection whose raw text Node prints, and it would
    // skip every final marker below. Closure is tracked independently of cleanup
    // so that a clean database with a failed close is still a failed run.
    try {
      await closePool()
      poolClosed = getPoolStats() === null
    } catch (error) {
      poolClosed = false
      marker('POOL_CLOSE_FAILURE', describeError(error))
    }

    // SINGLE AUTHORITATIVE CLEANUP_PASS: cleanup must have succeeded AND the
    // pool must be demonstrably closed.
    marker('POOL_CLOSED', poolClosed)
    marker('CLEANUP_PASS', cleanupPassed && poolClosed)

    // Report what the guard withheld, then hand the console back so the
    // supervising process is not left with a muted console.
    marker('SUPPRESSED_PRODUCTION_OUTPUT_LINES', suppressedOutputLines)
    if (restoreOutputGuard) restoreOutputGuard()
  }

  const passed = certificationPassed && cleanupPassed && poolClosed
  marker('BOOKING_EXPIRATION_PHYSICAL_1_PASS', passed)
  marker('NODE_EXIT', passed ? 0 : 1)
  process.exitCode = passed ? 0 : 1
}

await main()