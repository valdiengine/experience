import { AUTH_RUNTIME_EVENTS, createAuthRuntimeEvent } from './auth.runtime.events.js'

export class AuthRuntimeHealth {
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

    const components = [
      { name: 'authentication', ref: engine },
      { name: 'session', ref: engine.session },
      { name: 'token', ref: engine.token },
      { name: 'authorization', ref: engine.authorization },
      { name: 'permission', ref: engine.permission },
      { name: 'role', ref: engine.role },
      { name: 'trust', ref: engine.trustEngine },
      { name: 'device', ref: engine.deviceEngine },
      { name: 'mfa', ref: engine.mfaEngine },
      { name: 'anonymous', ref: engine.anonymousEngine },
      { name: 'audit', ref: engine.auditEngine },
    ]

    const results = []
    for (const component of components) {
      if (!component.ref) continue
      try {
        const healthResult = await component.ref.health()
        results.push({
          name: component.name,
          status: healthResult?.status || 'unknown',
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
      this.#emit(AUTH_RUNTIME_EVENTS.RUNTIME_AUTH_HEALTH_CHANGED, {
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
      this.#eventBus.emit(event, createAuthRuntimeEvent(event, data))
    }
  }
}

export default AuthRuntimeHealth
