/**
 * BOOKING-EXPIRATION-STAGE-1 - the commercial capability validation contract.
 *
 * Stage finding #1. The certified 22-file delta made
 * `COMMERCIAL_CAPABILITIES` a TEN-entry list (SchedulerCapability added and placed
 * immediately before ReservationCapability by BOOKING-EXPIRATION-RECOVERY-1), but
 * `runtime/startup/runtime.validation.js` kept the legacy invariant:
 *
 *   check('capabilities.registered', capabilityCount === 9, ...)
 *
 * The runtime therefore assembled 10 capabilities and then invalidated itself:
 *
 *   ValidationBootstrapError:
 *   Runtime validation failed: capabilities.registered: count=10
 *
 * which is what took Passenger down. `assertValidRuntime()` throws that error, so
 * the whole application boot fails BEFORE the web server can serve anything - the
 * generic hosting HTTP 503 page.
 *
 * These cases pin the corrected contract:
 *   - the intended ten-capability commercial runtime is accepted;
 *   - an incomplete required set is rejected, including the exact legacy 9;
 *   - the summary still reports what was actually assembled.
 *
 * The bundle here is a deliberate structural stand-in, not a booted runtime: this
 * module imports only `startup.errors.js`, so the contract can be proven without
 * the JWT provider that `application.start.js` pulls in.
 */
import {
  validateRuntime,
  assertValidRuntime,
  COMMERCIAL_CAPABILITY_IDS,
  COMMERCIAL_CAPABILITY_COUNT,
  COMMERCIAL_REQUIRED_INDIVIDUAL_IDS,
} from './runtime.validation.js'
import { ValidationBootstrapError } from './startup.errors.js'
import { COMMERCIAL_CAPABILITIES } from './capability.bootstrap.js'

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

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
  if (!condition) throw new Error(message)
}

function assertEqual(actual, expected, message) {
  const same = Object.is(actual, expected) || JSON.stringify(actual) === JSON.stringify(expected)
  if (!same) {
    throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
  }
}

/** A structurally valid bundle whose capability registry exposes `ids`. */
function bundleWith(ids) {
  return {
    engine: { started: true },
    runtimeContext: { repository: {}, search: null, sync: null },
    eventBus: { emit: () => {} },
    authenticationRuntime: {},
    cmsRuntime: {},
    repositoryRuntime: {
      registry: { count: 12, isRegistered: () => true },
    },
    capabilityRegistry: {
      size: ids.length,
      has: (id) => ids.includes(id),
      list: () => [...ids],
    },
  }
}

const failedChecks = (result) => result.checks.filter((c) => !c.ok).map((c) => c.name)

// ---------------------------------------------------------------------------

console.log('\nthe required capability contract:')

await test('the contract is exactly the ten commercial capabilities', async () => {
  assertEqual(COMMERCIAL_CAPABILITY_COUNT, 10, 'the commercial runtime registers ten capabilities')
  assertEqual(
    [...COMMERCIAL_CAPABILITY_IDS].sort(),
    ['accommodation', 'availability', 'booking', 'business', 'notifications',
      'opportunity', 'owner', 'reservation', 'scheduler', 'visitor'],
    `unexpected required capability set: ${JSON.stringify(COMMERCIAL_CAPABILITY_IDS)}`
  )
})

await test('the contract matches the actual COMMERCIAL_CAPABILITIES composition', async () => {
  // The drift that caused the outage was between these two lists. Assert they are
  // the same set, so validation cannot contradict the registry that builds it.
  const registered = COMMERCIAL_CAPABILITIES.map((Cap) => Cap.id)
  assertEqual(registered.length, COMMERCIAL_CAPABILITY_COUNT, 'the registry list and the contract must be the same size')
  assertEqual(
    [...registered].sort(),
    [...COMMERCIAL_CAPABILITY_IDS].sort(),
    `contract and registry disagree: registry=${JSON.stringify(registered)} contract=${JSON.stringify(COMMERCIAL_CAPABILITY_IDS)}`
  )
})

await test('SchedulerCapability is required, and is ordered before ReservationCapability', async () => {
  assert(COMMERCIAL_CAPABILITY_IDS.includes('scheduler'), 'scheduler must be a required capability')
  assert(
    COMMERCIAL_REQUIRED_INDIVIDUAL_IDS.includes('scheduler'),
    'scheduler must also be checked individually so its absence is diagnosed on its own'
  )
  const schedulerIndex = COMMERCIAL_CAPABILITIES.findIndex((Cap) => Cap.id === 'scheduler')
  const reservationIndex = COMMERCIAL_CAPABILITIES.findIndex((Cap) => Cap.id === 'reservation')
  assert(
    schedulerIndex !== -1 && reservationIndex !== -1,
    'both scheduler and reservation must be in the commercial composition'
  )
  assert(
    schedulerIndex < reservationIndex,
    `scheduler must be registered AND activated before reservation (scheduler=${schedulerIndex}, reservation=${reservationIndex})`
  )
})

// ---------------------------------------------------------------------------

console.log('\nthe intended runtime is accepted (Stage finding #1):')

await test('the ten-capability commercial runtime validates', async () => {
  const result = validateRuntime(bundleWith(COMMERCIAL_CAPABILITY_IDS))
  assertEqual(result.valid, true, `the intended runtime must be valid, failed: ${JSON.stringify(failedChecks(result))}`)
  assertEqual(result.status, 'ready', 'a valid runtime reports ready')
})

await test('this is exactly the runtime Stage assembled before the outage', async () => {
  // Reproduces the observed failure: a registry that correctly registered ten.
  const result = validateRuntime(bundleWith(COMMERCIAL_CAPABILITY_IDS))
  assertEqual(
    result.checks.find((c) => c.name === 'capabilities.registered').ok,
    true,
    'capabilities.registered must pass at count=10 - this is the check that failed on Stage'
  )
  assertEqual(result.summary.capabilities, 10, 'the summary must report the real count')
})

await test('the summary reports modules, failures, warnings and both registries', async () => {
  const result = validateRuntime(bundleWith(COMMERCIAL_CAPABILITY_IDS))
  assertEqual(result.summary.capabilities, 10, 'capabilities summary')
  assertEqual(result.summary.repositories, 12, 'repositories summary')
  assertEqual(result.summary.failed, 0, 'no failed checks')
  assertEqual(result.summary.modules, result.checks.length, 'modules equals the number of checks')
  assertEqual(result.summary.warnings, 2, 'search and sync are the two declared future slots')
  assert(result.status === 'ready' && result.valid === true, 'status and valid agree')
})

await test('assertValidRuntime does not throw for the intended runtime', async () => {
  const result = assertValidRuntime(bundleWith(COMMERCIAL_CAPABILITY_IDS))
  assertEqual(result.valid, true, 'assertValidRuntime must return the report, not throw')
})

await test('an extra capability does not invalidate the runtime', async () => {
  // The count is a floor and the required IDs are the contract, mirroring how the
  // repository checks in the same function already work. Additional capabilities
  // are additive, not a contract violation.
  const result = validateRuntime(bundleWith([...COMMERCIAL_CAPABILITY_IDS, 'future-capability']))
  assertEqual(result.valid, true, 'an additional capability must not invalidate the commercial runtime')
})

// ---------------------------------------------------------------------------

console.log('\nan incomplete required set is rejected:')

await test('the legacy nine-capability set is rejected', async () => {
  // The precise Stage regression, asserted from the other direction: this is what
  // the contract used to accept and must now refuse.
  const legacyNine = COMMERCIAL_CAPABILITY_IDS.filter((id) => id !== 'scheduler')
  assertEqual(legacyNine.length, 9, 'the legacy composition was nine capabilities')
  const result = validateRuntime(bundleWith(legacyNine))
  assertEqual(result.valid, false, 'a runtime without the scheduler must be invalid')
  assertEqual(result.status, 'invalid', 'an invalid runtime reports invalid')
})

await test('a missing scheduler is reported by three independent checks', async () => {
  const legacyNine = COMMERCIAL_CAPABILITY_IDS.filter((id) => id !== 'scheduler')
  const failed = failedChecks(validateRuntime(bundleWith(legacyNine)))
  for (const expected of ['capabilities.registered', 'capabilities.commercial', 'capabilities.scheduler']) {
    assert(failed.includes(expected), `${expected} must fail when the scheduler is absent, failed: ${JSON.stringify(failed)}`)
  }
  const commercial = validateRuntime(bundleWith(legacyNine)).checks.find((c) => c.name === 'capabilities.commercial')
  assert(
    commercial.detail.includes('scheduler'),
    `the aggregate check must name the missing capability: ${commercial.detail}`
  )
  assert(
    !validateRuntime(bundleWith(legacyNine)).warnings.includes('scheduler'),
    'a missing required capability is a failure, not a warning'
  )
})

await test('assertValidRuntime throws ValidationBootstrapError for the legacy nine', async () => {
  const legacyNine = COMMERCIAL_CAPABILITY_IDS.filter((id) => id !== 'scheduler')
  let thrown = null
  try {
    assertValidRuntime(bundleWith(legacyNine))
  } catch (error) {
    thrown = error
  }
  assert(thrown, 'assertValidRuntime must throw rather than return an invalid runtime')
  assert(
    thrown instanceof ValidationBootstrapError,
    `the thrown error must be a ValidationBootstrapError, got ${thrown?.constructor?.name}`
  )
  assert(
    String(thrown.message).includes('capabilities.registered'),
    `the message must name the failing check: ${thrown.message}`
  )
})

await test('each commercial capability is individually required', async () => {
  for (const id of COMMERCIAL_CAPABILITY_IDS) {
    const result = validateRuntime(bundleWith(COMMERCIAL_CAPABILITY_IDS.filter((have) => have !== id)))
    assertEqual(result.valid, false, `removing ${id} must invalidate the runtime`)
    const commercial = result.checks.find((c) => c.name === 'capabilities.commercial')
    assert(commercial.detail.includes(id), `removing ${id} must be named in the detail: ${commercial.detail}`)
  }
})

await test('a partial runtime is rejected rather than tolerated', async () => {
  for (const keep of [[], ['scheduler'], ['reservation'], ['scheduler', 'reservation']]) {
    const result = validateRuntime(bundleWith(keep))
    assertEqual(result.valid, false, `${JSON.stringify(keep)} is incomplete and must be invalid`)
  }
})

await test('an absent capability registry is rejected, not skipped', async () => {
  const bundle = bundleWith(COMMERCIAL_CAPABILITY_IDS)
  delete bundle.capabilityRegistry
  const result = validateRuntime(bundle)
  assertEqual(result.valid, false, 'a bundle with no capability registry must be invalid')
  const failed = failedChecks(result)
  assert(failed.includes('capabilities.registered'), `capabilities.registered must fail: ${JSON.stringify(failed)}`)
})

// ---------------------------------------------------------------------------

console.log('')
console.log(`total: ${passed + failed}  passed: ${passed}  failed: ${failed}`)
if (failed > 0) {
  for (const { name, error } of failures) {
    console.log(`\n  ${name}\n    ${String(error?.stack || error).split('\n').slice(0, 6).join('\n    ')}`)
  }
  process.exitCode = 1
}