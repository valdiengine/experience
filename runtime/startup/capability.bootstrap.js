/**
 * Capability Bootstrap — registers and wires the commercial capability registry
 *
 * P13.5.5 (Runtime Entry & Wiring): registers the ten commercial capabilities in the
 * existing CapabilityRegistry, initializes and activates them, and injects the shared
 * runtime context (runtime modules, repositories facade, eventBus, tenant,
 * configuration, and the capability registry itself for context.capabilities.get(...)).
 *
 * Wiring rules enforced here:
 * - Capabilities never import each other; communication only via context.capabilities.get(...)
 * - No infrastructure imports inside capabilities
 * - context.repositories is a delegation wrapper over the booted RepositoryRuntime
 *
 * BOOKING-EXPIRATION-RECOVERY-1: `SchedulerCapability` joins this list. It was
 * absent, so `ReservationTimer.activate()` — which resolves the scheduler ONLY
 * through `context.capabilities.get('scheduler')` — reported a failed handler
 * registration in the commercial runtime, and automatic reservation expiration
 * never ran there at all. `capabilities/core/register.js` is the generic
 * development catalog and was never the commercial path; this list is.
 *
 * ORDER IS DELIBERATE. `CapabilityRegistry` preserves registration order in
 * `getAll()`, and this function initializes and then activates in that order, so
 * `SchedulerCapability` is placed immediately before `ReservationCapability`:
 * scheduler is registered, initialized AND activated before the reservation
 * capability's `activate()` tries timer activation. Registration order alone
 * would NOT be enough — activation order is what the timer depends on.
 */
import { CapabilityRegistry } from '../../capabilities/core/registry.js'
import { BusinessCapability } from '../../capabilities/business/business.capability.js'
import { AccommodationCapability } from '../../capabilities/accommodation/accommodation.capability.js'
import { AvailabilityCapability } from '../../capabilities/availability/availability.capability.js'
import { SchedulerCapability } from '../../capabilities/scheduler/scheduler.capability.js'
import { ReservationCapability } from '../../capabilities/reservation/reservation.capability.js'
import { VisitorCapability } from '../../capabilities/visitor/visitor.capability.js'
import { OwnerCapability } from '../../capabilities/owner/owner.capability.js'
import { BookingCapability } from '../../capabilities/booking/booking.capability.js'
import { NotificationsCapability } from '../../capabilities/notifications/notifications.capability.js'
import { OpportunityCapability } from '../../capabilities/opportunity/opportunity.capability.js'
import { CapabilityBootstrapError } from './startup.errors.js'
import { STARTUP_EVENTS, createStartupEvent } from './startup.events.js'

export const COMMERCIAL_CAPABILITIES = [
  BusinessCapability,
  AccommodationCapability,
  AvailabilityCapability,
  // Before ReservationCapability: see the ordering note above.
  SchedulerCapability,
  ReservationCapability,
  VisitorCapability,
  OwnerCapability,
  BookingCapability,
  NotificationsCapability,
  OpportunityCapability,
]

/**
 * Lazy repositories facade delegating to the booted RepositoryRuntime.
 * Per-entity method proxies resolve the repository once and reuse it.
 * @param {object} repositoryRuntime - RepositoryEngine module
 * @param {object} context - Capability context (used as repository context, requires tenant)
 */
export function createRepositoriesFacade(repositoryRuntime, context) {
  const resolved = new Map()

  const resolve = async (entityName) => {
    console.log('[RUNTIME-PERSISTENCE-1 TRACE] createRepositoriesFacade.resolve ENTRY', {
      entityName,
      contextTenantId: context?.tenant?.id,
    })
    if (resolved.has(entityName)) return resolved.get(entityName)
    if (!repositoryRuntime || typeof repositoryRuntime.get !== 'function') return null
    try {
      const repo = await repositoryRuntime.get(entityName, context)
      console.log('[RUNTIME-PERSISTENCE-1 TRACE] createRepositoriesFacade.resolve EXIT', {
        entityName,
        contextTenantId: context?.tenant?.id,
        repoResolved: !!repo,
      })
      if (repo) resolved.set(entityName, repo)
      return repo || null
    } catch (err) {
      console.log('[RUNTIME-PERSISTENCE-1 TRACE] createRepositoriesFacade.resolve ERROR', {
        entityName,
        contextTenantId: context?.tenant?.id,
        error: err.message,
      })
      return null
    }
  }

  return new Proxy({}, {
    get: (target, prop) => {
      if (typeof prop !== 'string' || prop === 'then' || prop in target) {
        return target[prop]
      }
      return new Proxy({}, {
        get: (entityTarget, method) => {
          if (typeof method !== 'string' || method === 'then') return entityTarget[method]
          return async (...args) => {
            const repo = await resolve(prop)
            if (!repo || typeof repo[method] !== 'function') return undefined
            return repo[method](...args)
          }
        },
      })
    },
  })
}

/**
 * Register, initialize and activate the commercial capabilities.
 * @param {object} runtime - Runtime bundle from runtime.bootstrap (engine, runtimeContext, eventBus, repositoryRuntime)
 * @param {object} [options]
 * @param {object} [options.tenant] - Commercial tenant configuration (RB5)
 * @param {object} [options.configuration] - Per-capability configuration
 * @returns {Promise<{ registry: CapabilityRegistry, context: object, capabilities: object[] }>}
 */
export async function registerCapabilities(runtime, options = {}) {
  const eventBus = runtime.eventBus
  const tenant = options.tenant || { id: 'commercial', name: 'Commercial', slug: 'commercial' }
  const configuration = options.configuration || {}
  const runtimeContext = runtime.runtimeContext
  const repositoryRuntime = runtime.repositoryRuntime

  try {
    const registry = new CapabilityRegistry()

    const context = {
      tenant,
      dataManager: null,
      provider: null,
      eventBus,
      config: configuration,
      runtime: runtimeContext,
      repositories: null,
      capabilities: registry,
    }
    context.repositories = createRepositoriesFacade(repositoryRuntime, context)

    // Register the ten commercial capability classes (reuse existing registry)
    for (const CapClass of COMMERCIAL_CAPABILITIES) {
      registry.register(new CapClass())
    }

    // Initialize each capability with the shared context + per-capability config
    for (const capability of registry.getAll()) {
      await capability.init(context, configuration[capability.id] || {})
    }

    // Activate each capability (emits capability:activated on the shared event bus).
    // `getAll()` is registration order, so the scheduler is already active by the
    // time ReservationCapability.activate() runs its timer activation.
    for (const capability of registry.getAll()) {
      await capability.activate()
    }

    eventBus.emit(STARTUP_EVENTS.CAPABILITIES_READY, createStartupEvent(STARTUP_EVENTS.CAPABILITIES_READY, {
      count: registry.size,
      capabilities: registry.list(),
    }))

    return { registry, context, capabilities: registry.getAll() }
  } catch (err) {
    throw new CapabilityBootstrapError(`Failed to register capabilities: ${err.message}`, { error: err })
  }
}

export default registerCapabilities
