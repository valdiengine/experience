import { AvailabilityManager } from '../../capabilities/availability/availability.manager.js'
import { AvailabilityService } from '../../capabilities/availability/availability.service.js'
import { createRepositoriesFacade } from '../../runtime/startup/capability.bootstrap.js'

export const TRAVELER_PERMISSIONS = [
  'business:read',
  'business:update',
  'availability:read',
  'reservation:create',
]

export class BookingTravelerAuthException extends Error {
  constructor(message) {
    super(message)
    this.name = 'BookingTravelerAuthException'
  }
}

export function createTravelerAuthFacade(tenantId) {
  const allowed = new Set(TRAVELER_PERMISSIONS)

  const assertAllowed = (identity, action) => {
    if (!identity || identity.provider !== 'booking-traveler') {
      throw new BookingTravelerAuthException('Traveler identity required')
    }
    if (!identity.tenantId || identity.tenantId !== tenantId) {
      throw new BookingTravelerAuthException('Traveler is not scoped to the target tenant')
    }
    if (typeof action !== 'string' || !allowed.has(action)) {
      throw new BookingTravelerAuthException(`Missing permission: ${action}`)
    }
  }

  return {
    async authorize(identity, action, resource) {
      assertAllowed(identity, action)
      return true
    },
    can(identity, action, resource) {
      try {
        assertAllowed(identity, action)
        return true
      } catch {
        return false
      }
    },
    async cannot(identity, action, resource) {
      try {
        assertAllowed(identity, action)
        return false
      } catch {
        return true
      }
    },
  }
}

export function buildTravelerIdentity(target) {
  return {
    id: `traveler-${target.companySlug}`,
    provider: 'booking-traveler',
    tenantId: target.tenantId,
    tenant: { id: target.tenantId },
    roles: [],
    permissions: [...TRAVELER_PERMISSIONS],
  }
}

function resolveRepositoryRuntime(baseContext) {
  const repositoryRuntime = baseContext.repositories || (baseContext.getModule ? baseContext.getModule('repository') : null)
  if (!repositoryRuntime || typeof repositoryRuntime.get !== 'function') {
    throw new Error('Cannot build traveler context: repository runtime not available')
  }
  return repositoryRuntime
}

function buildScopedCapabilities(baseCapabilities, scopedContext) {
  const scopedAvailabilityManager = new AvailabilityManager(scopedContext)
  const scopedAvailability = {
    id: 'availability',
    manager: scopedAvailabilityManager,
    service: new AvailabilityService(scopedAvailabilityManager),
  }

  const getBase = (name) => {
    if (baseCapabilities && typeof baseCapabilities.get === 'function') {
      try {
        return baseCapabilities.get(name)
      } catch {
        return null
      }
    }
    return null
  }

  return {
    get(name) {
      if (name === 'availability') return scopedAvailability
      return getBase(name)
    },
    has(name) {
      if (name === 'availability') return true
      if (baseCapabilities && typeof baseCapabilities.has === 'function') {
        try {
          return baseCapabilities.has(name)
        } catch {
          return false
        }
      }
      return false
    },
  }
}

export function buildTravelerContext(baseContext, target) {
  const repositoryRuntime = resolveRepositoryRuntime(baseContext)

  const tenant = {
    id: target.tenantId,
    name: target.tenantName || target.tenantId,
    slug: target.tenantSlug || target.companySlug,
  }

  const scopedContext = Object.assign(
    Object.create(Object.getPrototypeOf(baseContext)),
    baseContext,
    {
      tenant,
      repositories: null,
      capabilities: null,
      runtime: baseContext.runtime
        ? Object.assign(Object.create(Object.getPrototypeOf(baseContext.runtime)), baseContext.runtime, {
            auth: createTravelerAuthFacade(target.tenantId),
          })
        : { auth: createTravelerAuthFacade(target.tenantId) },
    }
  )

  scopedContext.repositories = createRepositoriesFacade(repositoryRuntime, scopedContext)
  scopedContext.capabilities = buildScopedCapabilities(baseContext.capabilities, scopedContext)

  const identity = buildTravelerIdentity(target)

  return { scopedContext, identity }
}

export default buildTravelerContext