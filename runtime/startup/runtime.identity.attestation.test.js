/**
 * SEC-2O — unit tests for the temporary runtime identity attestation.
 *
 * Dependency-free: this suite imports only Node built-ins and the attestation module
 * itself. It never imports `pg`, never touches the production connector at runtime and
 * never connects to Stage or Neon. The connector is represented by injected fakes;
 * the wiring into `application.start.js` is verified by reading its source text.
 *
 * Run: node runtime/startup/runtime.identity.attestation.test.js
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  ATTEST_FLAG,
  ATTEST_QUERY,
  REDACTED,
  PROOF_LEVEL,
  STATUS,
  isAttestEnabled,
  sanitizeIdentifier,
  formatAttestationLine,
  attestRuntimeIdentity,
} from './runtime.identity.attestation.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const START_SRC = fs.readFileSync(path.join(__dirname, 'application.start.js'), 'utf8')
const MODULE_SRC = fs.readFileSync(path.join(__dirname, 'runtime.identity.attestation.js'), 'utf8')

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

function captureLogger() {
  const lines = []
  return { lines, logger: (line) => lines.push(String(line)) }
}

const OK_ROW = { current_user: 'stage_app', session_user: 'stage_app', current_database: 'valdi_test' }

// Global guard: registering an 'unhandledRejection' listener both records any stray
// rejection and stops Node's default (crash) behaviour, so late-settlement tests can
// assert no unhandled rejection occurred. Cleared state is asserted at the end.
const unhandled = []
process.on('unhandledRejection', (reason) => { unhandled.push(reason) })

function deferred() {
  let resolve
  let reject
  const promise = new Promise((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

await test('flag is exactly "1" and nothing else enables the feature', () => {
  assertEqual(isAttestEnabled({ [ATTEST_FLAG]: '1' }), true, 'exactly "1" enables')
  assertEqual(isAttestEnabled({ [ATTEST_FLAG]: 'true' }), false, '"true" must not enable')
  assertEqual(isAttestEnabled({ [ATTEST_FLAG]: '0' }), false, '"0" must not enable')
  assertEqual(isAttestEnabled({}), false, 'unset must not enable')
  assertEqual(isAttestEnabled(undefined), false, 'undefined env must not enable')
})

await test('identifier sanitizer only echoes safe identifiers', () => {
  assertEqual(sanitizeIdentifier('stage_app'), 'stage_app', 'safe identifier echoed')
  assertEqual(sanitizeIdentifier('valdi_test'), 'valdi_test', 'safe identifier echoed')
  assertEqual(sanitizeIdentifier('evil; DROP TABLE x'), REDACTED, 'injection-shaped value redacted')
  assertEqual(sanitizeIdentifier(''), REDACTED, 'empty value redacted')
  assertEqual(sanitizeIdentifier('a'.repeat(200)), REDACTED, 'oversized value redacted')
  assertEqual(sanitizeIdentifier(42), REDACTED, 'non-string redacted')
  assertEqual(sanitizeIdentifier(null), REDACTED, 'null redacted')
})

// ---------------------------------------------------------------------------
// Feature gate behaviour
// ---------------------------------------------------------------------------

await test('flag disabled: no query is issued and no line is logged', async () => {
  let calls = 0
  const cap = captureLogger()
  const result = await attestRuntimeIdentity({
    env: {},
    query: async () => { calls += 1; return { rows: [OK_ROW] } },
    logger: cap.logger,
  })
  assertEqual(calls, 0, 'zero queries when disabled')
  assertEqual(cap.lines.length, 0, 'no output when disabled')
  assertEqual(result.performed, false, 'performed=false when disabled')
  assertEqual(result.status, STATUS.disabled, 'status=disabled')
  assertEqual(result.ok, false, 'ok=false when disabled')
})

await test('flag enabled: exactly one identity query through the injected connector', async () => {
  const seen = []
  const cap = captureLogger()
  const result = await attestRuntimeIdentity({
    env: { [ATTEST_FLAG]: '1' },
    query: async (text) => { seen.push(text); return { rows: [OK_ROW] } },
    logger: cap.logger,
  })
  assertEqual(seen.length, 1, 'exactly one query')
  assertEqual(seen[0], ATTEST_QUERY, 'the only statement is the identity read')
  assertEqual(result.performed, true, 'performed=true')
  assertEqual(cap.lines.length, 1, 'exactly one evidence line')
})

// ---------------------------------------------------------------------------
// Output contract and projection
// ---------------------------------------------------------------------------

await test('expected identity projection with all required fields', async () => {
  const cap = captureLogger()
  const result = await attestRuntimeIdentity({
    env: { [ATTEST_FLAG]: '1' },
    query: async () => ({ rows: [OK_ROW] }),
    workerPid: 4242,
    logger: cap.logger,
  })
  assertEqual(result.status, STATUS.ok, 'status=ok')
  assertEqual(result.currentUser, 'stage_app', 'current_user projected')
  assertEqual(result.sessionUser, 'stage_app', 'session_user projected')
  assertEqual(result.currentDatabase, 'valdi_test', 'current_database projected')
  assertEqual(result.workerPid, 4242, 'worker pid projected')
  assertEqual(result.proofLevel, PROOF_LEVEL, 'proof level projected')

  const line = cap.lines[0]
  for (const field of ['ATTESTATION_STATUS', 'CURRENT_USER', 'SESSION_USER', 'CURRENT_DATABASE', 'WORKER_PID', 'PROOF_LEVEL']) {
    assert(line.includes(`${field}=`), `evidence line must carry ${field}`)
  }
})

await test('invalid identity values are redacted, not echoed', async () => {
  const cap = captureLogger()
  const result = await attestRuntimeIdentity({
    env: { [ATTEST_FLAG]: '1' },
    query: async () => ({ rows: [{ current_user: 'a;DROP', session_user: '', current_database: { evil: true } }] }),
    logger: cap.logger,
  })
  assertEqual(result.status, STATUS.invalid, 'mixed/invalid result is invalid')
  assertEqual(result.currentUser, REDACTED, 'unsafe user redacted')
  assertEqual(result.sessionUser, REDACTED, 'empty session user redacted')
  assertEqual(result.currentDatabase, REDACTED, 'non-string database redacted')
  assert(!cap.lines[0].includes('a;DROP'), 'raw unsafe value must not appear in output')
  assert(cap.lines[0].includes(REDACTED), 'redaction marker present')
})

await test('a malformed result shape is invalid, not a crash', async () => {
  const cap = captureLogger()
  const r1 = await attestRuntimeIdentity({ env: { [ATTEST_FLAG]: '1' }, query: async () => ({ rows: [] }), logger: cap.logger })
  const r2 = await attestRuntimeIdentity({ env: { [ATTEST_FLAG]: '1' }, query: async () => ({}), logger: cap.logger })
  assertEqual(r1.status, STATUS.invalid, 'empty rows invalid')
  assertEqual(r2.status, STATUS.invalid, 'missing rows invalid')
  assertEqual(r1.ok, false, 'invalid is not ok')
})

// ---------------------------------------------------------------------------
// Failure handling
// ---------------------------------------------------------------------------

await test('query rejection is non-fatal and emits no raw driver text', async () => {
  const cap = captureLogger()
  const SENSITIVE = 'postgres://stage_app:sup3rsecret@db.internal.example:5432/valdi_test'
  let threw = false
  let result
  try {
    result = await attestRuntimeIdentity({
      env: { [ATTEST_FLAG]: '1' },
      query: async () => { throw new Error(`connect failed ${SENSITIVE}`) },
      logger: cap.logger,
    })
  } catch {
    threw = true
  }
  assertEqual(threw, false, 'attestation must never throw')
  assertEqual(result.status, STATUS.error, 'status=error on rejection')
  assertEqual(result.performed, true, 'performed=true')
  assertEqual(result.ok, false, 'ok=false')
  assert(!cap.lines.join('\n').includes('sup3rsecret'), 'password must not leak')
  assert(!cap.lines.join('\n').includes('db.internal.example'), 'host must not leak')
  assert(!cap.lines.join('\n').includes('connect failed'), 'driver message must not leak')
})

await test('query timeout is bounded and non-fatal', async () => {
  const cap = captureLogger()
  const t0 = Date.now()
  // The module unref()s its timeout timer so it never holds a real process open.
  // A test-local keepalive keeps this process alive long enough for that timer to
  // fire; it is cleared whether or not the assertion path throws.
  const keepalive = setTimeout(() => {}, 5000)
  let result
  try {
    result = await attestRuntimeIdentity({
      env: { [ATTEST_FLAG]: '1' },
      query: () => new Promise(() => {}),
      timeoutMs: 30,
      logger: cap.logger,
    })
  } finally {
    clearTimeout(keepalive)
  }
  const elapsed = Date.now() - t0
  assert(elapsed < 1000, `timeout must be bounded (elapsed ${elapsed}ms)`)
  assertEqual(result.status, STATUS.timeout, 'status=timeout')
  assertEqual(result.ok, false, 'timeout is not ok')
})

await test('missing query function is handled as a non-fatal error', async () => {
  const cap = captureLogger()
  const result = await attestRuntimeIdentity({ env: { [ATTEST_FLAG]: '1' }, logger: cap.logger })
  assertEqual(result.status, STATUS.error, 'status=error when query missing')
  assertEqual(result.performed, true, 'performed=true')
})

// ---------------------------------------------------------------------------
// Secret safety
// ---------------------------------------------------------------------------

await test('no secret environment values appear in output', async () => {
  const cap = captureLogger()
  await attestRuntimeIdentity({
    env: {
      [ATTEST_FLAG]: '1',
      DATABASE_URL: 'postgres://u:leakme@host:5432/db',
      POSTGRES_PASSWORD: 'leakme',
      JWT_SECRET: 'leakme-jwt',
    },
    query: async () => ({ rows: [OK_ROW] }),
    logger: cap.logger,
  })
  const joined = cap.lines.join('\n')
  assert(!joined.includes('leakme'), 'no secret value may appear')
  assert(!joined.includes('DATABASE_URL'), 'no variable name leak')
  assert(!joined.includes('postgres://'), 'no connection string leak')
})

await test('formatted line contains only the six contract fields', () => {
  const line = formatAttestationLine({
    status: STATUS.ok,
    currentUser: 'stage_app',
    sessionUser: 'stage_app',
    currentDatabase: 'valdi_test',
    workerPid: 7,
    proofLevel: PROOF_LEVEL,
  })
  const assignments = line.split(/\s+/).filter((t) => t.includes('='))
  assertEqual(assignments.length, 6, 'exactly six key=value fields')
})

// ---------------------------------------------------------------------------
// Structural safety (static, no runtime connector import)
// ---------------------------------------------------------------------------

await test('the identity query is read-only (no write keywords)', () => {
  assert(/^\s*SELECT\s/i.test(ATTEST_QUERY), 'query must be a SELECT')
  assert(!/\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|GRANT|REVOKE|SET)\b/i.test(ATTEST_QUERY),
    'query must contain no write/DDL keywords')
  assert(/current_user/.test(ATTEST_QUERY) && /session_user/.test(ATTEST_QUERY) && /current_database\(\)/.test(ATTEST_QUERY),
    'query must project the three identity columns')
})

await test('no new pool is created; only the existing connector query is used', () => {
  assert(!/from\s+['"]pg['"]/.test(MODULE_SRC), 'module must not import pg')
  assert(!/createPool|getPool|new\s+Pool|getClient/.test(MODULE_SRC), 'module must not create pools/clients')
  const importLine = START_SRC.match(/import\s*\{[^}]*\}\s*from\s*['"][^'"]*postgres\.connection\.js['"]/)
  assert(importLine, 'application.start.js must import from the existing connector')
  assert(/query\s+as\s+runtimeConnectionQuery/.test(importLine[0]), 'only `query` is imported from the connector')
  assert(!/createPool/.test(importLine[0]), 'createPool must not be imported here')
  assert(/query:\s*runtimeConnectionQuery/.test(START_SRC), 'the connector query is injected into the attestation')
})

await test('no public HTTP surface or health-payload change is introduced', () => {
  assert(!/\bcreateServer\b|\bhttp\b|require\(['"]http['"]\)/i.test(MODULE_SRC), 'module must not touch HTTP')
  assert(!/health/i.test(MODULE_SRC), 'module must not touch the health payload')
  assert(!/readFileSync\(.*web\.server\.js/.test(MODULE_SRC), 'module has no reference to web.server.js')
})

await test('a single successful read does not claim all-worker coverage', async () => {
  const cap = captureLogger()
  const result = await attestRuntimeIdentity({
    env: { [ATTEST_FLAG]: '1' },
    query: async () => ({ rows: [OK_ROW] }),
    workerPid: 1234,
    logger: cap.logger,
  })
  assertEqual(result.proofLevel, 'LEVEL_3', 'proof level is LEVEL_3, not LEVEL_4')
  assert(!/LEVEL_4/.test(cap.lines[0]), 'output must not claim LEVEL_4')
  assert(cap.lines[0].includes('WORKER_PID=1234'), 'output scopes evidence to one worker pid')
})

// ---------------------------------------------------------------------------
// Hardening (SEC-2Q)
// ---------------------------------------------------------------------------

await test('a throwing logger cannot break the attestation', async () => {
  const result = await attestRuntimeIdentity({
    env: { [ATTEST_FLAG]: '1' },
    query: async () => ({ rows: [OK_ROW] }),
    logger: () => { throw new Error('logger boom') },
  })
  assertEqual(result.status, STATUS.ok, 'attestation still succeeds with a throwing logger')
  assertEqual(result.performed, true, 'performed=true')
  assertEqual(result.currentUser, 'stage_app', 'projection intact')
})

await test('valid non-default identifiers are echoed unchanged', async () => {
  const cap = captureLogger()
  const result = await attestRuntimeIdentity({
    env: { [ATTEST_FLAG]: '1' },
    query: async () => ({ rows: [{ current_user: 'valdi_maint_ro', session_user: 'owner_cli', current_database: 'valdi_prod_shadow' }] }),
    logger: cap.logger,
  })
  assertEqual(result.currentUser, 'valdi_maint_ro', 'non-default user echoed')
  assertEqual(result.sessionUser, 'owner_cli', 'non-default session user echoed')
  assertEqual(result.currentDatabase, 'valdi_prod_shadow', 'non-default database echoed')
  assertEqual(result.status, STATUS.ok, 'status=ok')
})

await test('the attestation module never emits a raw driver error', async () => {
  const cap = captureLogger()
  const MARK = 'DRIVER_SECRET_9f3'
  const result = await attestRuntimeIdentity({
    env: { [ATTEST_FLAG]: '1' },
    query: async () => { const e = new Error(`fail ${MARK}`); e.code = 'ECONNREFUSED'; throw e },
    logger: cap.logger,
  })
  assert(!cap.lines.join('\n').includes(MARK), 'driver marker must not appear in output')
  assertEqual(result.message, undefined, 'result must not carry a message field')
  assert(!JSON.stringify(result).includes(MARK), 'result must not carry the driver text')
  assertEqual(result.status, STATUS.error, 'rejection classified as error')
})

await test('timeout followed by a late resolution keeps the timeout result', async () => {
  const cap = captureLogger()
  const d = deferred()
  const keepalive = setTimeout(() => {}, 5000)
  let result
  try {
    result = await attestRuntimeIdentity({
      env: { [ATTEST_FLAG]: '1' },
      query: () => d.promise,
      timeoutMs: 20,
      logger: cap.logger,
    })
  } finally {
    clearTimeout(keepalive)
  }
  assertEqual(result.status, STATUS.timeout, 'timeout wins the race')
  d.resolve({ rows: [OK_ROW] }) // settles late; must be ignored safely
  await new Promise((r) => setTimeout(r, 20))
  assertEqual(result.status, STATUS.timeout, 'late resolution must not change the result')
  assertEqual(unhandled.length, 0, 'late resolution must not create an unhandled rejection')
})

await test('timeout followed by a late rejection is not an unhandled rejection', async () => {
  const cap = captureLogger()
  const d = deferred()
  const keepalive = setTimeout(() => {}, 5000)
  let result
  try {
    result = await attestRuntimeIdentity({
      env: { [ATTEST_FLAG]: '1' },
      query: () => d.promise,
      timeoutMs: 20,
      logger: cap.logger,
    })
  } finally {
    clearTimeout(keepalive)
  }
  assertEqual(result.status, STATUS.timeout, 'timeout wins the race')
  d.reject(new Error('late driver failure postgres://leak:leak@host:5432/db'))
  await new Promise((r) => setTimeout(r, 20))
  assertEqual(unhandled.length, 0, 'late rejection must be handled (no unhandledRejection)')
  assert(!cap.lines.join('\n').includes('leak'), 'late rejection text must not leak to logs')
})

await test('the connector is invoked with empty params and a per-query execution bound', async () => {
  const seen = []
  const cap = captureLogger()
  await attestRuntimeIdentity({
    env: { [ATTEST_FLAG]: '1' },
    query: async (text, params, options) => { seen.push({ text, params, options }); return { rows: [OK_ROW] } },
    timeoutMs: 1500,
    logger: cap.logger,
  })
  assertEqual(seen.length, 1, 'exactly one query')
  assertEqual(seen[0].text, ATTEST_QUERY, 'identity statement issued')
  assertEqual(JSON.stringify(seen[0].params), '[]', 'no bound parameters')
  assertEqual(seen[0].options && seen[0].options.timeoutMs, 1500, 'the execution bound is passed to the connector')
})

await test('a connector per-query timeout marker is classified as timeout', async () => {
  const cap = captureLogger()
  const result = await attestRuntimeIdentity({
    env: { [ATTEST_FLAG]: '1' },
    query: async () => { const e = new Error('Query read timeout'); e.__pgQueryTimeout = true; throw e },
    logger: cap.logger,
  })
  assertEqual(result.status, STATUS.timeout, 'connector timeout marker maps to status=timeout')
  assertEqual(result.ok, false, 'timeout is not ok')
  assert(!cap.lines.join('\n').includes('Query read timeout'), 'driver text must not leak')
})

await test('disabled feature flag parity: identical result, no query, no log', async () => {
  let calls = 0
  const cap = captureLogger()
  const a = await attestRuntimeIdentity({ env: {}, query: async () => { calls += 1 }, logger: cap.logger })
  const b = await attestRuntimeIdentity({ env: { [ATTEST_FLAG]: '0' }, query: async () => { calls += 1 }, logger: cap.logger })
  assertEqual(calls, 0, 'no query in either disabled form')
  assertEqual(cap.lines.length, 0, 'no output in either disabled form')
  assertEqual(JSON.stringify(a), JSON.stringify(b), 'disabled results are identical')
  assertEqual(a.status, STATUS.disabled, 'status=disabled')
})

await test('no unhandled promise rejection was observed during the suite', () => {
  assertEqual(unhandled.length, 0, `unhandledRejection count must be 0 (got ${unhandled.length})`)
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
