/**
 * SEC-2R — PostgreSQL connector security hardening tests.
 *
 * Scope (the two residual risks carried out of SEC-2Q):
 *   1. connector log sites must not emit raw driver `error.message` / raw error
 *      objects (host/user/IP disclosure);
 *   2. the identity read must have a real per-query execution bound with no leaked
 *      checked-out client.
 *
 * Dependency-free and offline: this suite imports only Node built-ins and the
 * connector module. It never imports `pg` directly, never calls createPool(),
 * getPool() or getClient(), never opens a socket and never contacts Stage or Neon.
 * `executeBoundedQuery` is exercised against injected fake clients, so the whole
 * bounded path is observed without a server. The default `query()` path is pinned
 * by source-text assertions because it requires a real pool to run.
 *
 * Run: node database/connection/postgres.connection.hardening.test.js
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  describePgError,
  executeBoundedQuery,
  PG_QUERY_TIMEOUT_MARK,
} from './postgres.connection.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CONN_SRC = fs.readFileSync(path.join(__dirname, 'postgres.connection.js'), 'utf8')

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
  if (!condition) throw new Error(message || 'assertion failed')
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message || 'assertion failed'} (expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`)
  }
}

function fakeClient(queryImpl) {
  const calls = { query: [], release: [] }
  return {
    calls,
    query(config) {
      calls.query.push(config)
      return queryImpl(config)
    },
    release(...args) {
      calls.release.push(args)
    },
  }
}

// ---------------------------------------------------------------------------
// describePgError — sanitized diagnostics
// ---------------------------------------------------------------------------

await test('describePgError keeps only name/code/severity and drops driver text', () => {
  const err = new Error('connect ECONNREFUSED postgres://stage_app:sup3rsecret@db.internal.example:5432/valdi_test')
  err.code = 'ECONNREFUSED'
  err.severity = 'FATAL'

  const described = describePgError(err)
  const serialized = JSON.stringify(described)

  assertEqual(described.name, 'Error', 'name kept')
  assertEqual(described.code, 'ECONNREFUSED', 'code kept')
  assertEqual(described.severity, 'FATAL', 'severity kept')
  assert(!('message' in described), 'message must be dropped')
  assert(!('stack' in described), 'stack must be dropped')
  assert(!serialized.includes('sup3rsecret'), 'password must not appear')
  assert(!serialized.includes('db.internal.example'), 'host must not appear')
  assert(!serialized.includes('postgres://'), 'connection string must not appear')
  assert(!serialized.includes('connect ECONNREFUSED'), 'driver message must not appear')
})

await test('describePgError never invents fields for absent/non-string values', () => {
  const bare = describePgError(new Error('plain'))
  assertEqual(bare.name, 'Error', 'default name is Error')
  assert(!('code' in bare), 'absent code is omitted')
  assert(!('severity' in bare), 'absent severity is omitted')

  const numeric = new Error('x')
  numeric.code = 1234
  const described = describePgError(numeric)
  assert(!('code' in described), 'non-string code is omitted')

  assertEqual(describePgError('boom').name, 'string', 'string input described by type')
  assertEqual(describePgError(undefined).name, 'undefined', 'undefined input described by type')
  assertEqual(describePgError(null).name, 'object', 'null input described by type')
})

// ---------------------------------------------------------------------------
// executeBoundedQuery — bounded execution, no client leak
// ---------------------------------------------------------------------------

await test('success: one statement with a per-query timeout, client returned clean', async () => {
  const client = fakeClient(() => Promise.resolve({ rows: [{ current_user: 'stage_app' }] }))

  const result = await executeBoundedQuery(client, 'SELECT current_user', [], 500)

  assertEqual(client.calls.query.length, 1, 'exactly one statement')
  assertEqual(client.calls.query[0].text, 'SELECT current_user', 'statement text forwarded')
  assertEqual(client.calls.query[0].query_timeout, 500, 'per-query timeout forwarded to the driver')
  assertEqual(client.calls.release.length, 1, 'released exactly once')
  assertEqual(client.calls.release[0].length, 0, 'clean release returns the client to the pool')
  assertEqual(result.rows[0].current_user, 'stage_app', 'result returned unchanged')
})

await test('failure: client is released WITH the error (destroyed), error rethrown', async () => {
  const failure = new Error('socket hang up')
  const client = fakeClient(() => Promise.reject(failure))

  let thrown
  try {
    await executeBoundedQuery(client, 'SELECT 1', [], 500)
  } catch (error) {
    thrown = error
  }

  assertEqual(thrown, failure, 'the original error propagates unchanged')
  assertEqual(client.calls.release.length, 1, 'released exactly once')
  assertEqual(client.calls.release[0][0], failure, 'released with the error so the pool removes it')
})

await test('timeout: a query that overruns the bound is tagged and the client destroyed', async () => {
  const failure = new Error('Query read timeout')
  const client = fakeClient(() => new Promise((_, reject) => setTimeout(() => reject(failure), 40)))

  let thrown
  try {
    await executeBoundedQuery(client, 'SELECT current_user', [], 25)
  } catch (error) {
    thrown = error
  }

  assertEqual(thrown, failure, 'timeout error propagates')
  assertEqual(thrown[PG_QUERY_TIMEOUT_MARK], true, 'overrun is tagged as a query timeout')
  assertEqual(client.calls.release[0][0], failure, 'timed-out client is destroyed, not reused')
})

await test('a fast failure is not misclassified as a timeout', async () => {
  const failure = new Error('syntax error')
  const client = fakeClient(() => Promise.reject(failure))

  let thrown
  try {
    await executeBoundedQuery(client, 'SELECT bad', [], 5000)
  } catch (error) {
    thrown = error
  }

  assertEqual(thrown[PG_QUERY_TIMEOUT_MARK], undefined, 'fast failure must not be tagged as a timeout')
})

// ---------------------------------------------------------------------------
// Connector source hardening (static — the default path needs a real pool to run)
// ---------------------------------------------------------------------------

await test('no connector log site emits raw driver text or a raw error object', () => {
  assert(!CONN_SRC.includes('error: error.message'), 'raw message logging removed')
  assert(!CONN_SRC.includes('{ text, error'), 'raw message + query text logging removed')
  assert(!CONN_SRC.includes("Unexpected pool error:', err)"), 'raw pool error object logging removed')
  assert(!CONN_SRC.includes("Client acquisition error:', error.message)"), 'raw acquisition message removed')

  const helperUses = CONN_SRC.match(/describePgError\(/g) || []
  assert(helperUses.length >= 4, `describePgError must be defined and used at all three sites (found ${helperUses.length})`)
  assert(CONN_SRC.includes("console.error('[PostgreSQL] Query error:', describePgError(error))"), 'query error log is sanitized')
  assert(CONN_SRC.includes("console.error('[PostgreSQL] Client acquisition error:', describePgError(error))"), 'acquisition error log is sanitized')
  assert(CONN_SRC.includes("console.error('[PostgreSQL] Unexpected pool error:', describePgError(err))"), 'pool error log is sanitized')
})

await test('the bounded path uses the driver per-query timeout and destroys on failure', () => {
  assert(CONN_SRC.includes('query_timeout: timeoutMs'), 'bounded path sets the per-query query_timeout')
  assert(CONN_SRC.includes('client.release(error)'), 'bounded path destroys the client on failure')
  assert(CONN_SRC.includes('PG_QUERY_TIMEOUT_MARK'), 'timeout marker is defined')
})

await test('the default query path is unchanged (pool.query with text/params)', () => {
  assert(CONN_SRC.includes('await p.query(text, params)'), 'default path still uses pool.query(text, params)')
  assert(CONN_SRC.includes('export async function query(text, params, options = {})'), 'query keeps a backward-compatible signature')
})

await test('the pool constructor is untouched (owner-session contract preserved)', () => {
  const poolMatch = CONN_SRC.match(/new Pool\(\{[\s\S]*?\}\)/m)
  assert(poolMatch, 'new Pool({...}) is present')
  const poolInit = poolMatch[0]
  assert(
    poolInit.includes('max:') && poolInit.includes('idleTimeoutMillis:') && poolInit.includes('connectionTimeoutMillis:'),
    'pool options unchanged'
  )
  assert(
    !poolInit.includes('min:') && !poolInit.includes('acquireTimeout:') && !poolInit.includes('idleTimeout:') && !poolInit.includes('maxQueue:'),
    'no unsupported pool options introduced'
  )
})

// ---------------------------------------------------------------------------
// SEC-2T — describePgError metadata validation and length limits
// ---------------------------------------------------------------------------

await test('describePgError preserves valid PostgreSQL error metadata', () => {
  const err = new Error('syntax error')
  err.name = 'DatabaseError'
  err.code = '42601'
  err.severity = 'ERROR'

  const d = describePgError(err)
  assertEqual(d.name, 'DatabaseError', 'valid name kept')
  assertEqual(d.code, '42601', 'valid SQLSTATE kept')
  assertEqual(d.severity, 'ERROR', 'valid severity kept')
})

await test('describePgError rejects metadata with newlines or control characters', () => {
  const err = new Error('x')
  err.name = 'Evil\nInjected'
  err.code = '42P01\nspoof'
  err.severity = 'FATAL\rspoof'

  const d = describePgError(err)
  assertEqual(d.name, 'Error', 'control-char name replaced with default')
  assert(!('code' in d), 'control-char code omitted')
  assert(!('severity' in d), 'control-char severity omitted')
  const serialized = JSON.stringify(d)
  assert(!serialized.includes('\n') && !serialized.includes('\r'), 'no control character survives')
})

await test('describePgError rejects oversized metadata', () => {
  const err = new Error('x')
  err.name = 'A'.repeat(500)
  err.code = 'B'.repeat(500)
  err.severity = 'C'.repeat(500)

  const d = describePgError(err)
  assertEqual(d.name, 'Error', 'oversized name replaced with default')
  assert(!('code' in d), 'oversized code omitted')
  assert(!('severity' in d), 'oversized severity omitted')
})

await test('describePgError enforces the exact metadata length boundary', () => {
  const atLimit = new Error('x')
  atLimit.name = 'D'.repeat(64)
  atLimit.code = 'E'.repeat(32)
  const ok = describePgError(atLimit)
  assertEqual(ok.name, 'D'.repeat(64), 'name at the cap is preserved')
  assertEqual(ok.code, 'E'.repeat(32), 'code at the cap is preserved')

  const overLimit = new Error('x')
  overLimit.name = 'D'.repeat(65)
  overLimit.code = 'E'.repeat(33)
  const bad = describePgError(overLimit)
  assertEqual(bad.name, 'Error', 'name over the cap is replaced')
  assert(!('code' in bad), 'code over the cap is omitted')
})

await test('describePgError rejects secret-bearing metadata', () => {
  const secret = 'postgres://stage_app:sup3rsecret@db.internal.example:5432/valdi_test'
  const err = new Error('x')
  err.name = secret
  err.code = secret
  err.severity = 'password=sup3rsecret'

  const d = describePgError(err)
  const serialized = JSON.stringify(d)
  assertEqual(d.name, 'Error', 'secret-bearing name replaced with default')
  assert(!('code' in d) && !('severity' in d), 'secret-bearing code/severity omitted')
  assert(!serialized.includes('sup3rsecret'), 'no credential leaked')
  assert(!serialized.includes('postgres://'), 'no connection string leaked')
  assert(!serialized.includes('db.internal.example'), 'no host leaked')
})

await test('describePgError omits non-string metadata without coercion', () => {
  const err = new Error('x')
  err.name = 42
  err.code = { toString() { return 'LEAK' } }
  err.severity = ['ERROR']

  const d = describePgError(err)
  assertEqual(d.name, 'Error', 'non-string name replaced with default')
  assert(!('code' in d), 'object code omitted without coercion')
  assert(!('severity' in d), 'array severity omitted without coercion')
  assert(!JSON.stringify(d).includes('LEAK'), 'no unsafe object coercion')
})

// ---------------------------------------------------------------------------
// SEC-2T — timeout documentation accuracy and flag-off parity
// ---------------------------------------------------------------------------

await test('executeBoundedQuery documentation states precise timeout semantics', () => {
  assert(CONN_SRC.includes('CLIENT-SIDE'), 'documents the client-side nature of query_timeout')
  assert(CONN_SRC.includes('CancelRequest'), 'documents that no PostgreSQL CancelRequest is sent')
  assert(/NOT guaranteed/i.test(CONN_SRC), 'documents that server-side termination is not guaranteed')
  assert(/pooler/i.test(CONN_SRC), 'documents the connection-pooler caveat')
  assert(/Promise\.race/.test(CONN_SRC), 'documents the JavaScript Promise.race fallback')
  assert(!CONN_SRC.includes('makes the server terminate'), 'removed the server-termination overclaim')
  assert(!CONN_SRC.includes('server terminates the backend'), 'removed the backend-termination overclaim')
})

await test('flag-off parity: the bounded path is opt-in and default callers are unaffected', () => {
  assert(CONN_SRC.includes('Number.isFinite(options.timeoutMs) && options.timeoutMs > 0'), 'bounded path requires a positive finite timeoutMs')
  assert(CONN_SRC.includes('await p.query(text, params)'), 'default path remains pool.query(text, params)')
})

// ---------------------------------------------------------------------------

console.log('')
console.log(`total: ${passed + failed}  passed: ${passed}  failed: ${failed}`)
if (failed > 0) {
  for (const { name, error } of failures) {
    console.log(`\n  ${name}\n    ${String(error?.stack || error).split('\n').slice(0, 6).join('\n    ')}`)
  }
  process.exit(1)
}
process.exit(0)
