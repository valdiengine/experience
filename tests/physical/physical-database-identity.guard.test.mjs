/**
 * BOOKING-PHYSICAL-HARNESS-SAFETY-1 — disposable-database identity guard tests.
 *
 * SCOPE
 * Focused, deterministic tests for the guard that decides whether the physical
 * expiration certification harness may touch a real PostgreSQL database. They cover
 * the eight properties the milestone requires: opt-in refusal, missing declared
 * identity, mismatch refusal, exact-match continuation, zero mutation on the
 * mismatch path, identity-query failure, resource discipline, and secret-free
 * diagnostics.
 *
 * NO DATABASE, NO NETWORK
 * Nothing here imports `pg`, the production connector, or the harness itself, and
 * nothing here reads an environment-supplied DATABASE_URL for real. The single
 * impure step in the guard — the identity `SELECT` — is injected as a `runQuery`
 * callback, so every branch, including the throwing and lying branches, is reached
 * with an in-process double. This file performs no Pool.connect, no socket, no
 * migration, no Stage access, and no physical certification run.
 *
 * WHAT IS *NOT* CLAIMED HERE
 * These tests prove the guard's decision logic and its fail-closed ordering. They do
 * NOT execute `tests/physical/booking-expiration-physical-1.mjs`; that harness is
 * opt-in, contacts a real database, and is forbidden in this milestone. Its
 * integration — the gate call before pool creation, the identity read as the first
 * statement on the connection, and the cleanup mutation block — is established by
 * code inspection in the implementation report, not by this file.
 */

/* ------------------------------------------------------------------ *
 * Tiny harness — same shape as the repository's other focused suites
 * ------------------------------------------------------------------ */

let passed = 0
let failed = 0
const failures = []

async function test(name, fn) {
  try {
    await fn()
    passed += 1
    console.log(`  ok  ${name}`)
  } catch (error) {
    failed += 1
    failures.push({ name, error })
    console.log(`  FAIL ${name}`)
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}\n    expected: ${JSON.stringify(expected)}\n    actual:   ${JSON.stringify(actual)}`)
  }
}

async function assertRefused(fn, expectedReason, label) {
  let thrown = null
  try {
    await fn()
  } catch (error) {
    thrown = error
  }
  assert(thrown !== null, `${label}: expected a refusal, but execution was permitted`)
  assertEqual(thrown.name, 'PhysicalDatabaseIdentityError', `${label}: wrong error type`)
  assertEqual(thrown.reason, expectedReason, `${label}: wrong refusal reason`)
  return thrown
}

/* ------------------------------------------------------------------ *
 * Module under test
 * ------------------------------------------------------------------ */

import {
  CERTIFY_VARIABLE,
  EXPECT_DATABASE_VARIABLE,
  IDENTITY_QUERY,
  REDACTED_NAME,
  REFUSAL,
  PhysicalDatabaseIdentityError,
  assertDatabaseIdentity,
  describeDatabaseName,
  evaluateCertificationGates,
  hasDatabaseUrl,
  readAndVerifyDatabaseIdentity,
  readExpectedDatabaseName,
} from './support/physical-database-identity.guard.mjs'

/**
 * A sentinel that must never appear in any diagnostic. Stand-ins for a password and
 * a full connection string; both are planted in the environment and in the error a
 * driver double throws.
 */
const SECRET_PASSWORD_SENTINEL = 'PgPw-SENTINEL-4f2a'
const SECRET_URL_SENTINEL = 'postgres://leaked:secret@db.example.invalid:5432/stage'

function baseEnv(overrides = {}) {
  return {
    [CERTIFY_VARIABLE]: '1',
    DATABASE_URL: SECRET_URL_SENTINEL,
    [EXPECT_DATABASE_VARIABLE]: 'booking_cert_disposable',
    ...overrides,
  }
}

/** Records every query it is handed, so mutation attempts are observable. */
function recordingReader(result) {
  const seen = []
  const runQuery = async (sql) => {
    seen.push(sql)
    if (typeof result === 'function') return result(sql)
    return result
  }
  return { seen, runQuery }
}

const MUTATING_SQL = /\b(insert|update|delete|truncate|create|alter|drop|grant|revoke|copy)\b/i

console.log('\nBOOKING-PHYSICAL-HARNESS-SAFETY-1 — disposable database identity guard')

/* ------------------------------------------------------------------ *
 * 1. certification opt-in missing -> refused
 * ------------------------------------------------------------------ */

await test('opt-in absent refuses before any connection is contemplated', () => {
  const gate = evaluateCertificationGates(baseEnv({ [CERTIFY_VARIABLE]: undefined }))
  assertEqual(gate.allowed, false, 'an absent opt-in must not be allowed')
  assertEqual(gate.reason, REFUSAL.gateAbsent, 'wrong refusal reason')
  assertEqual(gate.expectedDatabase, null, 'no expected identity may be reported')
})

await test('opt-in must be exactly the string "1"', () => {
  for (const value of ['0', '', 'true', 'yes', '11', ' 1', '1 ']) {
    const gate = evaluateCertificationGates(baseEnv({ [CERTIFY_VARIABLE]: value }))
    assertEqual(gate.allowed, false, `opt-in ${JSON.stringify(value)} must be refused`)
    assertEqual(gate.reason, REFUSAL.gateAbsent, `opt-in ${JSON.stringify(value)} gave the wrong reason`)
  }
  const allowed = evaluateCertificationGates(baseEnv())
  assertEqual(allowed.allowed, true, 'the exact opt-in "1" must be accepted')
})

await test('an absent DATABASE_URL is refused and its value is never returned', () => {
  const gate = evaluateCertificationGates(baseEnv({ DATABASE_URL: undefined }))
  assertEqual(gate.allowed, false, 'an absent DATABASE_URL must be refused')
  assertEqual(gate.reason, REFUSAL.databaseUrlAbsent, 'wrong refusal reason')
  assertEqual(
    JSON.stringify(gate).includes('stage'),
    false,
    'the gate result must carry no part of the connection string'
  )
})

/* ------------------------------------------------------------------ *
 * 2. expected DB identity missing -> refused
 * ------------------------------------------------------------------ */

await test('an absent expected database name refuses', () => {
  const gate = evaluateCertificationGates(baseEnv({ [EXPECT_DATABASE_VARIABLE]: undefined }))
  assertEqual(gate.allowed, false, 'a run with no declared identity must be refused')
  assertEqual(gate.reason, REFUSAL.expectedDatabaseAbsent, 'wrong refusal reason')
})

await test('a blank or non-string expected database name refuses', () => {
  const cases = ['', '   ', '\t\n', 0, 1, true, false, {}, [], null, Number.NaN]
  for (const value of cases) {
    const gate = evaluateCertificationGates(baseEnv({ [EXPECT_DATABASE_VARIABLE]: value }))
    assertEqual(gate.allowed, false, `${JSON.stringify(value)} must be refused`)
    assertEqual(gate.reason, REFUSAL.expectedDatabaseAbsent, `${JSON.stringify(value)} gave the wrong reason`)
  }
})

await test('a clean declaration is accepted and returned unchanged', () => {
  assertEqual(
    readExpectedDatabaseName({ [EXPECT_DATABASE_VARIABLE]: 'booking_cert_disposable' }),
    'booking_cert_disposable',
    'a well-formed declaration must be returned verbatim'
  )
  const gate = evaluateCertificationGates(baseEnv())
  assertEqual(gate.allowed, true, 'a well-formed declaration must be accepted')
  assertEqual(gate.expectedDatabase, 'booking_cert_disposable', 'the accepted declaration must be what is compared')
})

await test('surrounding whitespace in the declaration is REFUSED, never normalised', () => {
  // The fail-closed correction: these were previously trimmed into a permit.
  const malformed = [
    ' booking_cert_disposable',
    'booking_cert_disposable ',
    '  booking_cert_disposable  ',
    '\tbooking_cert_disposable',
    'booking_cert_disposable\n',
    ' booking_cert_disposable ',
  ]
  for (const value of malformed) {
    assertEqual(
      readExpectedDatabaseName({ [EXPECT_DATABASE_VARIABLE]: value }),
      null,
      `${JSON.stringify(value)} must be refused, not repaired into a usable declaration`
    )

    const gate = evaluateCertificationGates(baseEnv({ [EXPECT_DATABASE_VARIABLE]: value }))
    assertEqual(gate.allowed, false, `${JSON.stringify(value)} must not permit a run`)
    assertEqual(gate.reason, REFUSAL.expectedDatabaseAbsent, `${JSON.stringify(value)} gave the wrong refusal reason`)
    assertEqual(gate.expectedDatabase, null, `${JSON.stringify(value)} must yield no comparable identity`)
  }
})

await test('a whitespace-only or empty declaration is refused', () => {
  for (const value of ['', '   ', '\t', '\n', ' \t\n ']) {
    assertEqual(
      readExpectedDatabaseName({ [EXPECT_DATABASE_VARIABLE]: value }),
      null,
      `${JSON.stringify(value)} must be refused`
    )
    assertEqual(
      evaluateCertificationGates(baseEnv({ [EXPECT_DATABASE_VARIABLE]: value })).allowed,
      false,
      `${JSON.stringify(value)} must not permit a run`
    )
  }
})

await test('a malformed declaration never reaches the identity comparison', async () => {
  // End-to-end consequence: because the gate refuses, no expected identity is
  // produced, so assertDisposableDatabaseIdentity is never reached and the live
  // comparison cannot be satisfied by a repaired value.
  const gate = evaluateCertificationGates(baseEnv({ [EXPECT_DATABASE_VARIABLE]: '  booking_cert_disposable  ' }))
  assertEqual(gate.allowed, false, 'the run must be refused at the pre-connection gate')

  let reached = false
  try {
    if (gate.expectedDatabase !== null) {
      reached = true
      await readAndVerifyDatabaseIdentity({
        expected: gate.expectedDatabase,
        runQuery: recordingReader({ rows: [{ database_name: 'booking_cert_disposable' }] }).runQuery,
      })
    }
  } catch {
    // Any throw here would mean a malformed declaration had been admitted.
  }
  assertEqual(reached, false, 'the live identity comparison must never be attempted for a malformed declaration')
})

/* ------------------------------------------------------------------ *
 * 3. actual DB != expected DB -> refused
 * ------------------------------------------------------------------ */

await test('a mismatched database name refuses with a diagnostic naming both sides', async () => {
  const { seen, runQuery } = recordingReader({ rows: [{ database_name: 'neondb_stage' }] })
  const error = await assertRefused(
    () => readAndVerifyDatabaseIdentity({ expected: 'booking_cert_disposable', runQuery }),
    REFUSAL.identityMismatch,
    'Stage database reached while a disposable database was declared',
  )
  assert(
    error.message.includes('neondb_stage'),
    'the diagnostic should report the safe database name that was actually reached'
  )
  assert(
    error.message.includes('booking_cert_disposable'),
    'the diagnostic should report the declared disposable database name'
  )
  assertEqual(seen.length, 1, 'exactly one statement may be issued before the refusal')
})

await test('near-miss names are refused: comparison is exact, not fuzzy', async () => {
  const nearMisses = [
    'booking_cert_disposable_2',
    'booking_cert_disposabl',
    'booking_cert_disposable ',
    ' booking_cert_disposable',
    'BOOKING_CERT_DISPOSABLE',
    'NeonDB_booking_cert_disposable',
    'stage_booking_cert_disposable',
    'prefix_booking_cert_disposable',
  ]
  for (const actual of nearMisses) {
    const { runQuery } = recordingReader({ rows: [{ database_name: actual }] })
    await assertRefused(
      () => readAndVerifyDatabaseIdentity({ expected: 'booking_cert_disposable', runQuery }),
      REFUSAL.identityMismatch,
      `near miss ${JSON.stringify(actual)} must not match`,
    )
  }
})

await test('substring heuristics cannot satisfy the guard', async () => {
  // Every one of these would pass a "looks like a test/dev/cert database" check.
  const stageLikeNames = ['neondb_stage', 'production', 'app_production', 'postgres', 'template1']
  for (const actual of stageLikeNames) {
    const { runQuery } = recordingReader({ rows: [{ database_name: actual }] })
    await assertRefused(
      () => readAndVerifyDatabaseIdentity({ expected: 'booking_cert_disposable', runQuery }),
      REFUSAL.identityMismatch,
      `production-like database ${JSON.stringify(actual)} must be refused`,
    )
  }
})

/* ------------------------------------------------------------------ *
 * 4. exact identity match -> guard permits continuation
 * ------------------------------------------------------------------ */

await test('an exact identity match permits continuation and issues only the identity read', async () => {
  const { seen, runQuery } = recordingReader({ rows: [{ database_name: 'booking_cert_disposable' }] })
  const outcome = await readAndVerifyDatabaseIdentity({ expected: 'booking_cert_disposable', runQuery })

  assertEqual(outcome.database, 'booking_cert_disposable', 'the verified name must be reported back')
  assertEqual(seen.length, 1, 'verification must read the identity and nothing else')
  assertEqual(seen[0], IDENTITY_QUERY, 'the only statement must be the identity read')
  assertEqual(MUTATING_SQL.test(seen[0]), false, 'the identity read must not be a mutating statement')
})

await test('the identity read is a read-only current_database() projection', () => {
  assert(
    /current_database\(\)/.test(IDENTITY_QUERY),
    'the identity must come from the server itself via current_database()'
  )
  assertEqual(MUTATING_SQL.test(IDENTITY_QUERY), false, 'the identity query must never mutate')
})

/* ------------------------------------------------------------------ *
 * 5. mismatch path performs zero mutation
 * ------------------------------------------------------------------ */

await test('the refusal path issues no statement beyond the identity read', async () => {
  const refusalCases = [
    { label: 'mismatch', rows: { rows: [{ database_name: 'neondb_stage' }] } },
    { label: 'no rows array', rows: { rows: undefined } },
    { label: 'empty result', rows: { rows: [] } },
    { label: 'two rows', rows: { rows: [{ database_name: 'booking_cert_disposable' }, { database_name: 'x' }] } },
    { label: 'null name', rows: { rows: [{ database_name: null }] } },
    { label: 'empty name', rows: { rows: [{ database_name: '' }] } },
    { label: 'non-string name', rows: { rows: [{ database_name: 42 }] } },
    { label: 'null result', rows: null },
  ]

  for (const testCase of refusalCases) {
    const { seen, runQuery } = recordingReader(testCase.rows)
    await assertRefused(
      () => readAndVerifyDatabaseIdentity({ expected: 'booking_cert_disposable', runQuery }),
      testCase.label === 'mismatch' ? REFUSAL.identityMismatch : REFUSAL.identityUnreadable,
      `case: ${testCase.label}`,
    )
    assertEqual(seen.length, 1, `case ${testCase.label}: only the identity read may be issued`)
    for (const sql of seen) {
      assertEqual(MUTATING_SQL.test(sql), false, `case ${testCase.label}: "${sql}" is a mutating statement`)
    }
  }
})

await test('the pure comparison rejects malformed result shapes without any reader', () => {
  for (const rows of [undefined, null, {}, 'nope', 42, [], [{ database_name: undefined }], [{ other: 'column' }]]) {
    let thrown = null
    try {
      assertDatabaseIdentity({ expected: 'booking_cert_disposable', rows })
    } catch (error) {
      thrown = error
    }
    assert(thrown !== null, `malformed rows ${JSON.stringify(rows)} must be refused`)
    assertEqual(thrown.reason, REFUSAL.identityUnreadable, `malformed rows ${JSON.stringify(rows)} gave the wrong reason`)
  }
})

/* ------------------------------------------------------------------ *
 * 6. identity-query failure -> refused
 * ------------------------------------------------------------------ */

await test('a throwing identity query refuses instead of propagating', async () => {
  const { seen, runQuery } = recordingReader(() => {
    const error = new Error(`connection to ${SECRET_URL_SENTINEL} failed: password ${SECRET_PASSWORD_SENTINEL}`)
    error.code = 'ECONNREFUSED'
    throw error
  })

  const thrown = await assertRefused(
    () => readAndVerifyDatabaseIdentity({ expected: 'booking_cert_disposable', runQuery }),
    REFUSAL.identityQueryFailed,
    'an unreachable or failing server',
  )

  assertEqual(seen.length, 1, 'only the identity read may have been attempted')
  assertEqual(
    thrown.message.includes(SECRET_URL_SENTINEL),
    false,
    "a driver's connection string must never reach the diagnostic"
  )
  assertEqual(
    thrown.message.includes(SECRET_PASSWORD_SENTINEL),
    false,
    "a driver's error message must never reach the diagnostic"
  )
})

await test('a rejected (async) identity query refuses', async () => {
  const runQuery = async () => {
    throw new Error(`auth failed for password ${SECRET_PASSWORD_SENTINEL}`)
  }
  const thrown = await assertRefused(
    () => readAndVerifyDatabaseIdentity({ expected: 'booking_cert_disposable', runQuery }),
    REFUSAL.identityQueryFailed,
    'an async rejection',
  )
  assertEqual(thrown.message.includes(SECRET_PASSWORD_SENTINEL), false, 'the rejection text must not be reused')
})

/* ------------------------------------------------------------------ *
 * 7. resource discipline
 * ------------------------------------------------------------------ */

await test('verification acquires the reader exactly once and holds no state', async () => {
  const first = recordingReader({ rows: [{ database_name: 'booking_cert_disposable' }] })
  await readAndVerifyDatabaseIdentity({ expected: 'booking_cert_disposable', runQuery: first.runQuery })
  assertEqual(first.seen.length, 1, 'a successful verification must not re-read the identity')

  // A second, independent verification must be decided purely by its own inputs.
  const second = recordingReader({ rows: [{ database_name: 'neondb_stage' }] })
  await assertRefused(
    () => readAndVerifyDatabaseIdentity({ expected: 'booking_cert_disposable', runQuery: second.runQuery }),
    REFUSAL.identityMismatch,
    'a later verification must not inherit an earlier permit',
  )
  assertEqual(second.seen.length, 1, 'the second verification must issue exactly one read')

  // Re-running the original permit proves no permit was cached by the first success.
  const third = recordingReader({ rows: [{ database_name: 'booking_cert_disposable' }] })
  const outcome = await readAndVerifyDatabaseIdentity({
    expected: 'booking_cert_disposable',
    runQuery: third.runQuery,
  })
  assertEqual(outcome.database, 'booking_cert_disposable', 'verdict must depend only on current inputs')
})

await test('the guard module exposes no mutation, pool or cleanup surface', async () => {
  const module = await import('./support/physical-database-identity.guard.mjs')
  const forbidden = ['createPool', 'closePool', 'query', 'transaction', 'cleanup', 'scaffold', 'runCertification']
  for (const name of forbidden) {
    assertEqual(
      Object.prototype.hasOwnProperty.call(module, name),
      false,
      `the guard must not expose "${name}"; it may only decide`
    )
  }
})

/* ------------------------------------------------------------------ *
 * 8. secrets are not included in thrown/logged diagnostics
 * ------------------------------------------------------------------ */

await test('no gate refusal leaks the DATABASE_URL or the declared secret', () => {
  const refusals = [
    baseEnv({ [CERTIFY_VARIABLE]: undefined }),
    baseEnv({ DATABASE_URL: undefined }),
    baseEnv({ [EXPECT_DATABASE_VARIABLE]: undefined }),
    baseEnv({ [EXPECT_DATABASE_VARIABLE]: '   ' }),
  ]
  for (const env of refusals) {
    const gate = evaluateCertificationGates(env)
    const serialized = JSON.stringify(gate)
    assertEqual(serialized.includes(SECRET_URL_SENTINEL), false, 'a refusal leaked the connection string')
    assertEqual(serialized.includes(SECRET_PASSWORD_SENTINEL), false, 'a refusal leaked a secret')
    assertEqual(serialized.includes('postgres://'), false, 'a refusal leaked a URL scheme')
  }
})

await test('an unsafe identifier is redacted rather than echoed', () => {
  const hostileNames = [
    'db; DROP TABLE reservations',
    'name with spaces',
    'postgres://user:pw@host/stage',
    "quote'name",
    'x'.repeat(200),
    '',
  ]
  for (const name of hostileNames) {
    assertEqual(describeDatabaseName(name), REDACTED_NAME, `${JSON.stringify(name)} must be redacted, not echoed`)
  }
  assertEqual(describeDatabaseName('booking_cert_disposable'), 'booking_cert_disposable', 'a safe name is reported verbatim')
})

await test('a hostile ACTUAL database name is redacted inside the mismatch diagnostic', async () => {
  const hostile = 'stage_db; SELECT pg_sleep(10)'
  const { runQuery } = recordingReader({ rows: [{ database_name: hostile }] })
  const thrown = await assertRefused(
    () => readAndVerifyDatabaseIdentity({ expected: 'booking_cert_disposable', runQuery }),
    REFUSAL.identityMismatch,
    'a hostile server-supplied database name',
  )
  assert(thrown.message.includes(REDACTED_NAME), 'the hostile name must be replaced by the redaction literal')
  assertEqual(thrown.message.includes('pg_sleep'), false, 'server-controlled text must not be echoed')
})

await test('the error type carries a fixed name and a stable reason, and no payload', () => {
  const error = new PhysicalDatabaseIdentityError(REFUSAL.identityMismatch, 'fixed text')
  assertEqual(error.name, 'PhysicalDatabaseIdentityError', 'the name must satisfy the harness safe-name filter')
  assert(
    /^[A-Za-z][A-Za-z0-9_]{0,39}$/.test(error.name),
    'the harness only reports a name matching this shape, so a longer name would be masked'
  )
  assertEqual(error.reason, REFUSAL.identityMismatch, 'the reason must be preserved for the marker')
  assertEqual(error.message, 'fixed text', 'the message must be the fixed text supplied by the guard')
})

/* ------------------------------------------------------------------ *
 * Invariants
 * ------------------------------------------------------------------ */

await test('the existing opt-in variable name is unchanged by this milestone', () => {
  assertEqual(CERTIFY_VARIABLE, 'BOOKING_EXPIRATION_PHYSICAL_CERTIFY', 'the original opt-in must be preserved verbatim')
})

await test('the expected-identity variable is narrowly named and distinct from the opt-in', () => {
  assertEqual(
    EXPECT_DATABASE_VARIABLE,
    'BOOKING_EXPIRATION_PHYSICAL_EXPECT_DATABASE',
    'the declaration variable must keep the agreed name'
  )
  assert(
    EXPECT_DATABASE_VARIABLE !== CERTIFY_VARIABLE,
    'the identity declaration must not alias the opt-in variable'
  )
  assertEqual(hasDatabaseUrl({ DATABASE_URL: '   ' }), false, 'a whitespace-only DATABASE_URL counts as absent')
  assertEqual(hasDatabaseUrl({ DATABASE_URL: 'x' }), true, 'a non-empty DATABASE_URL counts as present')
})

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(`\ntotal: ${passed + failed}  passed: ${passed}  failed: ${failed}\n`)
if (failed > 0) {
  for (const { name, error } of failures) {
    console.log(`FAILURE: ${name}`)
    console.log(`  ${error && error.stack ? error.stack.split('\n').slice(0, 3).join('\n  ') : error}`)
  }
  process.exitCode = 1
}
