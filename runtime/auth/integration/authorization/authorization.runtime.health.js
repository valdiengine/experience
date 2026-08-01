import { AUTHORIZATION_RUNTIME_EVENTS, createAuthorizationRuntimeEvent } from './authorization.runtime.events.js'

export class AuthorizationRuntimeHealth {
  #eventBus = null
  #overallStatus = 'unknown'
  #results = []

  constructor(options = {}) {
    this.#eventBus = options.eventBus || null
  }

  setEventBus(eventBus) {
    this.#eventBus = eventBus
  }

  async checkAll(integration) {
    const engine = integration?.engine
    if (!engine) {
      return {
        status: 'unavailable',
        components: [],
        timestamp: Date.now(),
      }
    }

    const subComponents = [
      { name: 'authorization-engine', ref: engine },
      { name: 'policy-engine', ref: engine.policyEngine },
      { name: 'permission-resolver', ref: engine.permissionResolver },
      { name: 'role-manager', ref: engine.roleManager },
      { name: 'scope-manager', ref: engine.scopeManager },
      { name: 'authorization-audit', ref: engine.audit },
      { name: 'policy-cache', ref: engine.policyCache },
    ]

    const results = []
    for (const component of subComponents) {
      if (!component.ref) continue
      try {
        const healthResult = typeof component.ref.health === 'function'
          ? await component.ref.health()
          : component.ref.health?.()
        results.push({
          name: component.name,
          status: healthResult?.status || 'healthy',
          timestamp: Date.now(),
        })
      } catch {
        results.push({ name: component.name, status: 'unhealthy', timestamp: Date.now() })
      }
    }

    const previousOverall = this.#overallStatus
    this.#overallStatus = this.#aggregate(results)
    this.#results = results

    if (previousOverall && previousOverall !== this.#overallStatus) {
      this.#emit(AUTHORIZATION_RUNTIME_EVENTS.RUNTIME_AUTHORIZATION_ERROR, {
        from: previousOverall,
        to: this.#overallStatus,
        components: results,
      })
    }

    return {
      status: this.#overallStatus,
      components: results,
      timestamp: Date.now(),
    }
  }

  get overallStatus() {
    return this.#overallStatus
  }

  get healthy() {
    return this.#overallStatus === 'healthy'
  }

  #aggregate(results) {
    if (results.length === 0) return 'unknown'
    const statuses = new Set(results.map(r => r.status))
    if (statuses.has('unhealthy') || statuses.has('failed')) return 'failed'
    if (statuses.has('degraded')) return 'degraded'
    if (results.every(r => r.status === 'healthy')) return 'healthy'
    return 'unknown'
  }

  #emit(event, data) {
    if (this.#eventBus) {
      this.#eventBus.emit(event, createAuthorizationRuntimeEvent(event, data))
    }
  }
}

export default AuthorizationRuntimeHealth
