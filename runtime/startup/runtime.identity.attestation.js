/**
 * SEC-2O — TEMPORARY PostgreSQL runtime identity attestation.
 *
 * WHAT THIS IS
 * A one-shot, feature-gated, read-only attestation of the PostgreSQL session
 * identity used by the running application. It exists only to certify the role and
 * database the active Stage runtime actually connects as, so the legacy
 * `POSTGRES_*` fallback variables can eventually be retired with evidence.
 *
 * It issues exactly one statement through the EXISTING production connector
 * (`database/connection/postgres.connection.js` -> its module-scope singleton pool).
 * The connector's `query` is injected by the caller, so this module never imports
 * `pg`, never creates a pool, never closes a pool and never opens a new physical
 * connection of its own. Pool lifetime and reuse stay entirely in the connector.
 *
 * ABSOLUTE CONSTRAINTS (enforced here)
 *   - no database writes: the only SQL is a three-column `SELECT`
 *   - non-fatal: every failure path returns a result object, never throws
 *   - bounded: the query runs under a real per-query execution bound, with a
 *     defensive race as a fallback, so startup cannot hang
 *   - secret-safe: only three identifiers plus the worker pid are ever emitted;
 *     unexpected or unsafe identifier values collapse to a fixed redaction marker;
 *     raw driver `error.message` is never read, logged or returned
 *
 * ACTIVATION
 *   SEC2N_IDENTITY_ATTEST=1  -> enabled
 *   anything else / unset    -> disabled, zero queries, zero behaviour change
 *
 * REMOVAL
 * This module and its single call site in `application.start.js` are temporary.
 * Deleting this file and that call site removes the feature completely; with the
 * flag unset there is no runtime effect at all.
 *
 * SEC-2R REMEDIATION (prior SEC-2Q limitations, now addressed)
 *   1. The connector no longer logs raw driver text. Its three log sites now emit
 *      only `describePgError(error)` (name/code/severity) — never `error.message`
 *      and never the raw error object — so a failed identity read cannot leak
 *      host/IP/user through the connector's own logging. This module still never
 *      logs or returns `error.message`.
 *   2. The identity read is bounded by the driver's per-query `query_timeout`
 *      (selected by passing `{ timeoutMs }`). That timeout is CLIENT-SIDE: it stops
 *      waiting and rejects the query locally, and no PostgreSQL CancelRequest is
 *      issued. On timeout (or any failure) the connector releases the checked-out
 *      client WITH the error, so `pg-pool` removes and closes it and the connection
 *      is destroyed — no client is returned to the pool mid-protocol. Backend
 *      execution termination timing is NOT guaranteed: socket teardown is only
 *      observed when the backend next reads or writes, and a connection pooler can
 *      affect disconnect behaviour. The `Promise.race` below is retained as a
 *      defensive FALLBACK bound that does not depend on driver behaviour.
 */

/** Activation flag. Disabled unless exactly '1'. */
export const ATTEST_FLAG = 'SEC2N_IDENTITY_ATTEST'

/** The one and only statement issued. Read-only, constant, no table, no lock. */
export const ATTEST_QUERY = 'SELECT current_user, session_user, current_database()'

/** Bounded execution: the query may not delay startup beyond this. */
export const DEFAULT_TIMEOUT_MS = 2000

/** Emitted instead of any identifier that does not match the conservative shape. */
export const REDACTED = '[redacted-unexpected-identifier]'

/** Proof level reached by a successful application-pool read (SEC-2N definition). */
export const PROOF_LEVEL = 'LEVEL_3'

/** Stable status values reported in ATTESTATION_STATUS. */
export const STATUS = {
  disabled: 'disabled',
  ok: 'ok',
  invalid: 'invalid_result',
  timeout: 'timeout',
  error: 'error',
}

/**
 * Conservative PostgreSQL identifier shape. Narrower than what PostgreSQL allows on
 * purpose: this decides whether a value is safe to ECHO, not whether it is legal.
 */
const SAFE_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_$-]{0,62}$/

/** True only when the activation flag is exactly '1'. */
export function isAttestEnabled(env) {
  return Boolean(env) && env[ATTEST_FLAG] === '1'
}

/** Echo an identifier only when it is provably safe; otherwise a fixed literal. */
export function sanitizeIdentifier(value) {
  return typeof value === 'string' && SAFE_IDENTIFIER.test(value) ? value : REDACTED
}

/** Single sanitized, structured evidence line. No secrets, no driver messages. */
export function formatAttestationLine(result) {
  return [
    '[SEC2N-IDENTITY]',
    `ATTESTATION_STATUS=${result.status}`,
    `CURRENT_USER=${result.currentUser}`,
    `SESSION_USER=${result.sessionUser}`,
    `CURRENT_DATABASE=${result.currentDatabase}`,
    `WORKER_PID=${result.workerPid}`,
    `PROOF_LEVEL=${result.proofLevel}`,
  ].join(' ')
}

/**
 * Run the one-shot attestation.
 *
 * Pure of side effects except the injected `query` call and the injected `logger`.
 * Never throws. When disabled it performs no query at all.
 *
 * @param {object} options
 * @param {object} [options.env]        environment to read the flag from (default process.env)
 * @param {function} options.query      the EXISTING connector query function (injected)
 * @param {number} [options.workerPid]  worker process id (default process.pid)
 * @param {number} [options.timeoutMs]  hard bound (default DEFAULT_TIMEOUT_MS)
 * @param {function} [options.logger]   sink for the evidence line (default console.log)
 * @returns {Promise<object>} attestation result (performed=false when disabled)
 */
export async function attestRuntimeIdentity(options = {}) {
  const {
    env = process.env,
    query,
    workerPid = typeof process !== 'undefined' ? process.pid : 0,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    logger = console.log,
  } = options

  if (!isAttestEnabled(env)) {
    return { status: STATUS.disabled, performed: false, ok: false }
  }

  const base = {
    currentUser: REDACTED,
    sessionUser: REDACTED,
    currentDatabase: REDACTED,
    workerPid,
    proofLevel: PROOF_LEVEL,
  }

  const emit = (result) => {
    try {
      logger(formatAttestationLine(result))
    } catch {
      // Logging must never affect startup.
    }
  }

  let timer
  try {
    if (typeof query !== 'function') {
      const missing = { ...base, status: STATUS.error }
      emit(missing)
      return { ...missing, performed: true, ok: false }
    }

    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => {
        const err = new Error('identity attestation timed out')
        err.__attestTimeout = true
        reject(err)
      }, timeoutMs)
      if (timer && typeof timer.unref === 'function') timer.unref()
    })

    const queryPromise = query(ATTEST_QUERY, [], { timeoutMs })
    // Defensive: Promise.race already subscribes to both promises, but attach an
    // explicit no-op handler to the query promise so that a rejection which settles
    // AFTER the timeout has won the race can never become an unhandled rejection.
    if (queryPromise && typeof queryPromise.catch === 'function') {
      queryPromise.catch(() => {})
    }

    const result = await Promise.race([queryPromise, timeout])
    const rows = result?.rows

    if (!Array.isArray(rows) || rows.length !== 1) {
      const invalid = { ...base, status: STATUS.invalid }
      emit(invalid)
      return { ...invalid, performed: true, ok: false }
    }

    const row = rows[0] || {}
    const currentUser = sanitizeIdentifier(row.current_user)
    const sessionUser = sanitizeIdentifier(row.session_user)
    const currentDatabase = sanitizeIdentifier(row.current_database)

    const valid =
      currentUser !== REDACTED &&
      sessionUser !== REDACTED &&
      currentDatabase !== REDACTED

    const out = {
      status: valid ? STATUS.ok : STATUS.invalid,
      currentUser,
      sessionUser,
      currentDatabase,
      workerPid,
      proofLevel: PROOF_LEVEL,
    }
    emit(out)
    return { ...out, performed: true, ok: valid }
  } catch (err) {
    // Never surface err.message: pg embeds host/IP/user in driver errors.
    // A driver per-query read timeout is tagged by the connector; the local race
    // tags its own fallback. The literal mirrors the connector's marker without
    // importing that module (this module must not load `pg`).
    const timedOut = Boolean(err) && (err.__attestTimeout === true || err.__pgQueryTimeout === true)
    const status = timedOut ? STATUS.timeout : STATUS.error
    const out = { ...base, status }
    emit(out)
    return { ...out, performed: true, ok: false }
  } finally {
    if (timer) clearTimeout(timer)
  }
}

export default { attestRuntimeIdentity, isAttestEnabled, sanitizeIdentifier, formatAttestationLine }
