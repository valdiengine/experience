/**
 * PostgreSQL Connection Manager
 *
 * Manages PostgreSQL client connections for Valdi Platform.
 *
 * @version 4.1
 */

import pg from 'pg'
import { getDatabaseConfig, getPoolConfig, getSslConfig } from '../config/database.config.js'

const { Pool } = pg

let pool = null

/** Marker set on an error produced by the driver's per-query read timeout. */
export const PG_QUERY_TIMEOUT_MARK = '__pgQueryTimeout'

/** Default value used when a driver error name is missing or invalid. */
const DEFAULT_ERROR_NAME = 'Error'

/** C0/C1 control characters (incl. CR/LF/TAB) are never allowed in diagnostics. */
const UNSAFE_DIAGNOSTIC_CHARS = /[\u0000-\u001f\u007f-\u009f]/

/** Conservative shape + length cap for the only three fields that may be emitted. */
const NAME_RULES = { pattern: /^[A-Za-z][A-Za-z0-9_.]{0,63}$/, maxLength: 64 }
const CODE_RULES = { pattern: /^[A-Za-z0-9_]{1,32}$/, maxLength: 32 }
const SEVERITY_RULES = { pattern: /^[A-Za-z][A-Za-z0-9_]{0,31}$/, maxLength: 32 }

/**
 * Validate one diagnostic field before it is allowed to be emitted.
 *
 * SEC-2T: accepts only a plain, short, control-character-free string matching the
 * field's conservative shape. A value is rejected (`undefined`, so the field is
 * omitted) when it is a non-string (no object coercion), contains a newline or any
 * control character (log injection), exceeds the field length cap (log flooding /
 * long secret prefixes), or has a shape that could carry a DSN or credential
 * (punctuation, spaces, `@`, `:`, `/`, `=`).
 */
function sanitizeDiagnosticField(value, rules) {
  if (typeof value !== 'string') return undefined
  if (UNSAFE_DIAGNOSTIC_CHARS.test(value)) return undefined
  if (value.length === 0 || value.length > rules.maxLength) return undefined
  if (!rules.pattern.test(value)) return undefined
  return value
}

/**
 * Reduce a driver error to non-sensitive diagnostic fields only.
 *
 * SEC-2R/SEC-2T: pg embeds host, port, database, user and, for some failures, the
 * connection string in `error.message`; the previous logging emitted that raw
 * message and, for pool errors, the whole error object. Only three stable category
 * fields are considered — `name`, `code` and `severity` — and each is strictly
 * validated by `sanitizeDiagnosticField` (type, length cap, control-character-free,
 * conservative shape) before it can be emitted. `message`, `stack`, `detail`,
 * `hint`, `address`, `port`, `hostname`, connection strings and nested errors are
 * never read. `name` falls back to `'Error'`; `code`/`severity` are omitted when
 * invalid, so operational classifications are preserved without disclosing
 * connection details.
 */
export function describePgError(error) {
  if (!error || typeof error !== 'object') {
    return { name: typeof error }
  }

  const described = {
    name: sanitizeDiagnosticField(error.name, NAME_RULES) || DEFAULT_ERROR_NAME,
  }
  const code = sanitizeDiagnosticField(error.code, CODE_RULES)
  if (code !== undefined) {
    described.code = code
  }
  const severity = sanitizeDiagnosticField(error.severity, SEVERITY_RULES)
  if (severity !== undefined) {
    described.severity = severity
  }
  return described
}

/**
 * Run one statement through a checked-out client under a per-query bound.
 *
 * SEC-2R / SEC-2T — precise timeout semantics:
 *   - The bound is the driver's own per-query `query_timeout` (pg >= 8). Per
 *     `pg/lib/client.js` that timeout is CLIENT-SIDE: on expiry the driver stops
 *     waiting and rejects the query with a local `Query read timeout` error. It
 *     does NOT issue a PostgreSQL CancelRequest and does NOT cancel the statement
 *     on the server.
 *   - On timeout — or any other failure — the checked-out client is released WITH
 *     the error (`client.release(error)`), which routes through `pg-pool`
 *     `_release` -> `_remove` -> `client.end()` and destroys the connection. A
 *     client that may be mid-protocol is therefore never returned to the pool.
 *   - Server-side termination timing is NOT guaranteed: destroying the socket only
 *     makes the backend observe a disconnect when it next reads or writes, the
 *     stalled statement may keep running server-side, and behind a connection
 *     pooler the disconnect need not reach the backend at all.
 *   - The caller (`runtime.identity.attestation.js`) additionally applies a
 *     JavaScript `Promise.race` as a FALLBACK bound that does not depend on driver
 *     behaviour.
 *
 * Exported for testability: it operates only on the injected `client`.
 */
export async function executeBoundedQuery(client, text, params, timeoutMs) {
  const started = Date.now()

  try {
    const result = await client.query({ text, values: params, query_timeout: timeoutMs })
    client.release()
    return result
  } catch (error) {
    client.release(error)
    if (error && typeof error === 'object' && Date.now() - started >= timeoutMs) {
      error[PG_QUERY_TIMEOUT_MARK] = true
    }
    throw error
  }
}

/**
 * Create or get PostgreSQL connection pool
 */
export function createPool() {
  if (pool) {
    return pool
  }

  const config = getDatabaseConfig()
  const poolConfig = getPoolConfig()
  const sslConfig = getSslConfig()

  const connectionOptions = process.env.DATABASE_URL
    ? { connectionString: config.url }
    : {
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.user,
        password: config.password,
      }

  pool = new Pool({
    ...connectionOptions,
    ssl: sslConfig,
    max: poolConfig.max,
    idleTimeoutMillis: poolConfig.idleTimeoutMillis,
    connectionTimeoutMillis: poolConfig.connectionTimeoutMillis,
  })

  pool.on('error', (err) => {
    console.error('[PostgreSQL] Unexpected pool error:', describePgError(err))
  })

  pool.on('connect', () => {
    console.log('[PostgreSQL] New client connected')
  })

  return pool
}

/**
 * Get existing pool or create new one
 */
export function getPool() {
  if (!pool) {
    return createPool()
  }
  return pool
}

/**
 * Execute a query using the pool.
 *
 * The default path is unchanged: the pool's own `query(text, params)` is used, so
 * pooling, parameterization and error propagation are exactly as before.
 *
 * An optional third argument enables a bounded execution: when
 * `options.timeoutMs > 0` the statement runs on a single checked-out client under
 * a per-query timeout (see `executeBoundedQuery`). This is opt-in per call, so no
 * global timeout behaviour changes for existing callers.
 */
export async function query(text, params, options = {}) {
  const p = getPool()
  const start = Date.now()
  const timeoutMs =
    options && Number.isFinite(options.timeoutMs) && options.timeoutMs > 0 ? options.timeoutMs : 0

  try {
    const result =
      timeoutMs > 0
        ? await executeBoundedQuery(await getClient(), text, params, timeoutMs)
        : await p.query(text, params)
    const duration = Date.now() - start

    if (process.env.DATABASE_LOGGING === 'true') {
      console.log('[PostgreSQL] Query:', { text, duration: `${duration}ms`, rows: result.rowCount })
    }

    return result
  } catch (error) {
    console.error('[PostgreSQL] Query error:', describePgError(error))
    throw error
  }
}

/**
 * Get a client from the pool
 */
export async function getClient() {
  const p = getPool()

  try {
    const client = await p.connect()
    return client
  } catch (error) {
    console.error('[PostgreSQL] Client acquisition error:', describePgError(error))
    throw error
  }
}

/**
 * Execute a transaction
 */
export async function transaction(callback) {
  const client = await getClient()

  try {
    await client.query('BEGIN')
    const result = await callback(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

/**
 * Check if pool is connected
 */
export async function isConnected() {
  if (!pool) {
    return false
  }

  try {
    await pool.query('SELECT 1')
    return true
  } catch {
    return false
  }
}

/**
 * Close the pool
 */
export async function closePool() {
  if (pool) {
    await pool.end()
    pool = null
    console.log('[PostgreSQL] Pool closed')
  }
}

/**
 * Get pool statistics
 */
export function getPoolStats() {
  if (!pool) {
    return null
  }

  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  }
}

export default {
  createPool,
  getPool,
  query,
  getClient,
  transaction,
  isConnected,
  closePool,
  getPoolStats,
  describePgError,
  executeBoundedQuery,
}

