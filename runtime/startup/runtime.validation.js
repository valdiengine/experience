/**
 * Runtime Validation — static verification of the booted runtime bundle
 *
 * P13.5.5 (Runtime Entry & Wiring): verifies the assembled application before marking
 * startup complete. Checks the runtime modules, repository registration, adapter
 * registration, capability registration, and runtime contexts. Runs WITHOUT a runtime
 * engine (static/structural checks only) — behavioral verification is out of scope.
 */
import { ValidationBootstrapError } from './startup.errors.js'

const COMMERCIAL_REPOSITORY_NAMES = [
  'business', 'accommodation', 'availability', 'reservation', 'visitor',
  'owner', 'booking', 'notification', 'opportunity',
]

/**
 * The required commercial runtime capability set.
 *
 * BOOKING-EXPIRATION-STAGE-1. `scheduler` is a REQUIRED capability, not an
 * optional extra. `capability.bootstrap.js` registers
 * `SchedulerCapability` immediately before `ReservationCapability` because
 * `ReservationTimer` resolves the scheduler ONLY through
 * `context.capabilities.get('scheduler')`, and `application.start.js` runs
 * `startTenantReservationRecovery()` only after the shared scheduler is active.
 * A commercial runtime without it cannot register an expiration handler and
 * cannot recover real BookingRegistry tenants.
 *
 * This list is the single source of truth for the capability contract, so the
 * count check below can never drift from it the way the previous hardcoded
 * `capabilityCount === 9` did: adding the capability without updating the count
 * invalidated a correctly assembled runtime on Passenger boot.
 */
export const COMMERCIAL_CAPABILITY_IDS = [
  'business', 'accommodation', 'availability', 'scheduler', 'reservation',
  'visitor', 'owner', 'booking', 'notifications', 'opportunity',
]

/**
 * The minimum number of registered capabilities the commercial runtime must
 * have. Derived from COMMERCIAL_CAPABILITY_IDS so the floor and the required set
 * are the same statement.
 */
export const COMMERCIAL_CAPABILITY_COUNT = COMMERCIAL_CAPABILITY_IDS.length

/**
 * Capabilities whose absence must be reported on its own, not only as part of
 * the aggregate set. `scheduler` is here because it is the capability the whole
 * expiration path depends on: its absence is a boot-time regression with a very
 * different cause than any other missing capability, and it would otherwise be
 * buried in the `capabilities.commercial` detail string.
 */
export const COMMERCIAL_REQUIRED_INDIVIDUAL_IDS = ['scheduler']

/**
 * Validate a booted runtime bundle.
 * @param {object} runtime - Runtime bundle from runtime.bootstrap + repository.bootstrap + capability.bootstrap
 * @param {object} [environment] - Resolved environment flags (tenant, persistence, eventbus, capability)
 * @returns {{ valid: boolean, status: string, checks: object[], warnings: string[] }}
 */
export function validateRuntime(runtime, environment = {}) {
  const checks = []
  const warnings = []

  const check = (name, ok, detail) => {
    checks.push({ name, ok: Boolean(ok), detail: detail || (ok ? 'ok' : 'missing') })
    return ok
  }

  // Runtime modules
  check('runtime.engine', Boolean(runtime.engine))
  check('runtime.engine.started', Boolean(runtime.engine && runtime.engine.started))
  check('runtime.context', Boolean(runtime.runtimeContext))
  check('runtime.eventbus', Boolean(runtime.eventBus && typeof runtime.eventBus.emit === 'function'))
  check('runtime.authentication', Boolean(runtime.authenticationRuntime))
  check('runtime.cms', Boolean(runtime.cmsRuntime))

  // Repository runtime
  const registryOk = Boolean(runtime.repositoryRuntime && runtime.repositoryRuntime.registry)
  check('repositories.registry', registryOk)
  const registered = registryOk ? runtime.repositoryRuntime.registry.count : 0
  check('repositories.registered', registered >= 12, `count=${registered}`)
  if (registryOk) {
    const missing = COMMERCIAL_REPOSITORY_NAMES.filter(name => !runtime.repositoryRuntime.registry.isRegistered(name))
    check('repositories.commercial', missing.length === 0, missing.length ? `missing: ${missing.join(', ')}` : 'ok')
  }

  // Capabilities
  //
  // The count is a FLOOR and the required-ID presence check is the contract,
  // which is exactly how the repository checks above are already written. The
  // previous `capabilityCount === 9` was a hardcoded total that the intended
  // ten-capability composition contradicted.
  const capabilityCount = runtime.capabilityRegistry ? runtime.capabilityRegistry.size : 0
  check('capabilities.registered', capabilityCount >= COMMERCIAL_CAPABILITY_COUNT, `count=${capabilityCount} (min=${COMMERCIAL_CAPABILITY_COUNT})`)
  if (runtime.capabilityRegistry) {
    const missing = COMMERCIAL_CAPABILITY_IDS.filter(id => !runtime.capabilityRegistry.has(id))
    check('capabilities.commercial', missing.length === 0, missing.length ? `missing: ${missing.join(', ')}` : 'ok')
    for (const id of COMMERCIAL_REQUIRED_INDIVIDUAL_IDS) {
      check(
        `capabilities.${id}`,
        runtime.capabilityRegistry.has(id),
        runtime.capabilityRegistry.has(id) ? 'ok' : 'missing required capability'
      )
    }
  }

  // Runtime contexts (contracts present on the shared RuntimeContext)
  check('contexts.repository', Boolean(runtime.runtimeContext && runtime.runtimeContext.repository))
  if (runtime.runtimeContext && runtime.runtimeContext.search === null) {
    warnings.push('contexts.search: search runtime not implemented (declared future module slot)')
  }
  if (runtime.runtimeContext && runtime.runtimeContext.sync === null) {
    warnings.push('contexts.sync: sync runtime not implemented (declared future module slot)')
  }

  // Environment flags
  check('env.tenant', environment.tenant !== false)
  check('env.persistence', environment.persistence !== false)
  check('env.eventbus', environment.eventbus !== false)
  check('env.capability', environment.capability !== false)

  const failed = checks.filter(c => !c.ok)
  const valid = failed.length === 0
  return {
    valid,
    status: valid ? 'ready' : 'invalid',
    checks,
    warnings,
    summary: {
      modules: checks.length,
      failed: failed.length,
      warnings: warnings.length,
      repositories: registryOk ? runtime.repositoryRuntime.registry.count : 0,
      capabilities: capabilityCount,
    },
  }
}

/**
 * Assert a runtime bundle is valid; throws ValidationBootstrapError otherwise.
 */
export function assertValidRuntime(runtime, environment = {}) {
  const result = validateRuntime(runtime, environment)
  if (!result.valid) {
    const failed = result.checks.filter(c => !c.ok).map(c => `${c.name}: ${c.detail}`).join('; ')
    throw new ValidationBootstrapError(`Runtime validation failed: ${failed}`, { checks: result.checks })
  }
  return result
}

export default validateRuntime
