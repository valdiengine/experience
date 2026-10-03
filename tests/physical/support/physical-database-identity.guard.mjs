/**
 * BOOKING-PHYSICAL-HARNESS-SAFETY-1 — disposable-database identity guard.
 *
 * WHAT THIS IS
 * The physical expiration certification harness
 * (`tests/physical/booking-expiration-physical-1.mjs`) mutates a real PostgreSQL
 * database: it INSERTs tenants/companies/accommodations/availability, drives the
 * production expiration path, and DELETEs its fixture rows again. Its two original
 * gates were:
 *
 *   BOOKING_EXPIRATION_PHYSICAL_CERTIFY=1   explicit human opt-in
 *   DATABASE_URL                            present
 *
 * Neither gate proves WHICH database is reached. `DATABASE_URL` carries the Stage
 * URL perfectly well, so a human who opted in while pointing at Stage would run a
 * destructive certification against Stage. That is the failure this module closes.
 *
 * THE RULE
 * The connected server must positively identify ITSELF, by name, as the exact
 * disposable certification database the operator declared. Two independent
 * conditions, both mandatory:
 *
 *   1. BOOKING_EXPIRATION_PHYSICAL_EXPECT_DATABASE is present and non-empty.
 *      Checked BEFORE a pool is created, so an undeclared run never connects.
 *   2. `SELECT current_database()` on the live connection equals that value by
 *      EXACT string equality. Checked as the FIRST statement issued on the
 *      connection, before any other query and long before any write.
 *
 * WHAT IS DELIBERATELY NOT USED
 * No heuristic may stand in for the declared identity. None of these are accepted,
 * because each is satisfied by ordinary production databases:
 *
 *   name contains "test" / "dev" / "cert"   -> Stage can be named anything
 *   URL contains "localhost"                -> irrelevant to a remote tunnel
 *   host is not the Stage host              -> Stage has aliases and pools
 *   NODE_ENV !== "production"               -> unset in most shell invocations
 *
 * FAIL CLOSED
 * Every ambiguous outcome refuses. A missing opt-in, an absent/blank/ill-typed
 * expected name, a query that throws, a result set of the wrong shape, an empty or
 * non-string database name, and any mismatch from exact equality all raise
 * `PhysicalDatabaseIdentityError`. There is no permissive branch.
 *
 * SECRET SAFETY
 * This module never reads, receives, logs or interpolates `DATABASE_URL`, a
 * password, a token or any connection string. Its inputs are the opt-in flag, the
 * declared database NAME, and the database name PostgreSQL reports. Diagnostics
 * carry a database name only when it matches a conservative identifier shape;
 * anything else is reported as a fixed redaction literal, because a
 * server-controlled identifier is untrusted output. `error.message` is never
 * copied from a driver error — only this module's own fixed strings are used.
 *
 * WHY A SEPARATE MODULE
 * The guard must be provable by deterministic tests that never open a socket. Every
 * decision below is therefore a pure function over plain values, with the one
 * impure step — the identity `SELECT` — injected as a `runQuery` callback so a
 * test can supply a throwing, empty or lying reader.
 */

/* ------------------------------------------------------------------ *
 * Declared contract
 * ------------------------------------------------------------------ */

/** Existing explicit human opt-in. Preserved verbatim; this milestone does not change it. */
export const CERTIFY_VARIABLE = 'BOOKING_EXPIRATION_PHYSICAL_CERTIFY'

/**
 * Newly required. Holds the EXACT name of the disposable certification database,
 * e.g. `BOOKING_EXPIRATION_PHYSICAL_EXPECT_DATABASE=booking_expiration_cert`.
 *
 * Naming: the prefix matches the existing `BOOKING_EXPIRATION_PHYSICAL_*` family so
 * the two variables are greppable together, and `_EXPECT_DATABASE` states the
 * comparison precisely — it is an expectation to be matched, not a pattern.
 */
export const EXPECT_DATABASE_VARIABLE = 'BOOKING_EXPIRATION_PHYSICAL_EXPECT_DATABASE'

/**
 * The identity read. `current_database()` is answered by the server itself and
 * reports the database this session is actually attached to, which is the one fact
 * a `DATABASE_URL` string cannot be trusted to assert. It is a read-only, constant
 * expression: no table, no lock, no side effect.
 */
export const IDENTITY_QUERY = 'SELECT current_database() AS database_name'

/** Refusal reasons. Stable strings; the harness reports these as markers. */
export const REFUSAL = {
  gateAbsent: 'gate_absent',
  databaseUrlAbsent: 'database_url_absent',
  expectedDatabaseAbsent: 'expected_database_absent',
  identityQueryFailed: 'identity_query_failed',
  identityUnreadable: 'identity_unreadable',
  identityMismatch: 'database_identity_mismatch',
}

/** Reported instead of any identifier that does not match SAFE_DATABASE_NAME. */
export const REDACTED_NAME = '[redacted-unexpected-database-identifier]'

/**
 * Conservative PostgreSQL identifier shape. Deliberately narrower than what
 * PostgreSQL can create, because the purpose here is to decide whether a string is
 * safe to ECHO, not to decide whether it is a legal database name.
 */
const SAFE_DATABASE_NAME = /^[A-Za-z_][A-Za-z0-9_$-]{0,62}$/

/* ------------------------------------------------------------------ *
 * Failure type
 * ------------------------------------------------------------------ */

export class PhysicalDatabaseIdentityError extends Error {
  constructor(reason, message) {
    super(message)
    this.name = 'PhysicalDatabaseIdentityError'
    this.reason = reason
  }
}

/* ------------------------------------------------------------------ *
 * Pure helpers
 * ------------------------------------------------------------------ */

/** Presence test for DATABASE_URL. The value itself is never returned or stored. */
export function hasDatabaseUrl(env) {
  const value = env.DATABASE_URL
  return typeof value === 'string' && value.trim().length > 0
}

/**
 * The declared expected database name, or `null` when the declaration is unusable.
 *
 * The declaration is NEVER repaired. An earlier revision trimmed surrounding
 * whitespace, which meant `"  booking_cert_disposable  "` was silently normalised
 * into a value that then passed the exact comparison. For a gate that authorises
 * destructive operations, silently fixing malformed operator input is the wrong
 * direction: the safety layer must not manufacture a permit out of a malformed
 * declaration. Surrounding whitespace is therefore a REFUSAL, not a convenience.
 *
 * A declaration is usable only when it is a string, non-empty, not whitespace-only,
 * and carries no leading or trailing whitespace. When usable, the ORIGINAL string is
 * returned unchanged — no trimming, no case folding, no other normalisation — so the
 * later comparison against `current_database()` is exact in the strict sense.
 */
export function readExpectedDatabaseName(env) {
  const raw = env[EXPECT_DATABASE_VARIABLE]
  if (typeof raw !== 'string') return null
  if (raw.length === 0) return null
  // Whitespace-only: nothing to compare against.
  if (raw.trim().length === 0) return null
  // Leading or trailing whitespace: a malformed declaration, refused rather than fixed.
  if (raw !== raw.trim()) return null
  return raw
}

/**
 * Echo a database name only if it is provably safe to print.
 *
 * `expected` is operator-supplied and `actual` is server-supplied; neither is
 * trusted, and either could otherwise carry a hostname or a credential in a quoted
 * identifier. Anything outside the conservative shape collapses to a fixed literal.
 */
export function describeDatabaseName(name) {
  if (typeof name === 'string' && SAFE_DATABASE_NAME.test(name)) return name
  return REDACTED_NAME
}

/* ------------------------------------------------------------------ *
 * Gate 1 — declared identity, evaluated before a pool exists
 * ------------------------------------------------------------------ */

/**
 * Evaluate every condition that can be known WITHOUT connecting.
 *
 * @returns {{allowed: boolean, reason: string|null, detail: string, expectedDatabase: string|null}}
 */
export function evaluateCertificationGates(env) {
  const refuse = (reason, detail) => ({ allowed: false, reason, detail, expectedDatabase: null })

  if (env[CERTIFY_VARIABLE] !== '1') {
    return refuse(REFUSAL.gateAbsent, `${CERTIFY_VARIABLE} is not set to '1'`)
  }
  if (!hasDatabaseUrl(env)) {
    return refuse(REFUSAL.databaseUrlAbsent, 'DATABASE_URL is not present in the environment')
  }

  const expectedDatabase = readExpectedDatabaseName(env)
  if (expectedDatabase === null) {
    return refuse(
      REFUSAL.expectedDatabaseAbsent,
      `${EXPECT_DATABASE_VARIABLE} must be exactly the disposable certification database name, with no surrounding whitespace`
    )
  }

  return { allowed: true, reason: null, detail: '', expectedDatabase }
}

/* ------------------------------------------------------------------ *
 * Gate 2 — observed identity, evaluated on the live connection
 * ------------------------------------------------------------------ */

/**
 * Compare the server's own answer against the declared name.
 *
 * Pure: it receives an already-fetched `rows` array and decides. No query is issued
 * here, so every branch — including the malformed-result branches — is reachable
 * from a deterministic test.
 *
 * @throws {PhysicalDatabaseIdentityError} on any unreadable or mismatched identity.
 */
export function assertDatabaseIdentity({ expected, rows }) {
  if (!Array.isArray(rows) || rows.length !== 1) {
    throw new PhysicalDatabaseIdentityError(
      REFUSAL.identityUnreadable,
      'The database identity query did not return exactly one row; certification refused'
    )
  }

  const actual = rows[0]?.database_name
  if (typeof actual !== 'string' || actual.length === 0) {
    throw new PhysicalDatabaseIdentityError(
      REFUSAL.identityUnreadable,
      'The server did not report a database name; certification refused'
    )
  }

  // EXACT equality. No trimming, no case folding, no prefix/suffix matching.
  if (actual !== expected) {
    throw new PhysicalDatabaseIdentityError(
      REFUSAL.identityMismatch,
      `Connected database ${describeDatabaseName(actual)} is not the declared disposable certification database ${describeDatabaseName(expected)}; certification refused`
    )
  }

  return { database: describeDatabaseName(actual) }
}

/**
 * Gate 2 with the identity read injected, so the throwing path is testable without
 * a socket.
 *
 * `runQuery` is the harness's real `query`. A driver error is converted to a fixed
 * refusal: `error.message` is never read, because `pg` embeds the target hostname,
 * IP:port and username in it.
 *
 * @throws {PhysicalDatabaseIdentityError} on query failure, unreadable or mismatched identity.
 */
export async function readAndVerifyDatabaseIdentity({ expected, runQuery }) {
  let rows
  try {
    const result = await runQuery(IDENTITY_QUERY)
    rows = result?.rows
  } catch {
    throw new PhysicalDatabaseIdentityError(
      REFUSAL.identityQueryFailed,
      'The database identity query did not complete; certification refused'
    )
  }
  return assertDatabaseIdentity({ expected, rows })
}
