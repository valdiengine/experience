import { AUTH_ENGINE_EVENTS, createAuthEngineEvent } from './auth.engine.events.js'

export class AuthEngineHealth {
  #checks = new Map()
  #eventBus = null
  #overallStatus = 'unknown'
  #checkInterval = null

  constructor(options = {}) {
    this.#eventBus = options.eventBus || null
  }

  setEventBus(eventBus) {
    this.#eventBus = eventBus
  }

  async checkComponent(name, component) {
    let status = 'unknown'
    let error = null
    let latency = null

    try {
      const start = Date.now()
      const result = await component.health()
      latency = Date.now() - start
      status = result?.status || 'unknown'
    } catch (err) {
      status = 'unhealthy'
      error = err.message
    }

    const previous = this.#checks.get(name)
    this.#checks.set(name, { status, error, latency, timestamp: Date.now() })

    if (previous && previous.status !== status) {
      this.#emit(AUTH_ENGINE_EVENTS.AUTH_ERROR, {
        component: name,
        from: previous.status,
        to: status,
        error,
      })
    }

    return { name, status, error, latency, timestamp: Date.now() }
  }

  async checkAll(engine) {
    const components = [
      { name: 'authorization', ref: engine.authorization },
      { name: 'session', ref: engine.session },
      { name: 'token', ref: engine.token },
      { name: 'device', ref: engine.deviceEngine },
      { name: 'trust', ref: engine.trustEngine },
      { name: 'mfa', ref: engine.mfaEngine },
      { name: 'audit', ref: engine.auditEngine },
    ]

    const results = []
    for (const component of components) {
      if (!component.ref) continue
      const result = await this.checkComponent(component.name, component.ref)
      results.push(result)
    }

    this.#overallStatus = this.#aggregate(results)
    return { status: this.#overallStatus, components: results, timestamp: Date.now() }
  }

  getComponentHealth(name) {
    return this.#checks.get(name) || { status: 'unknown', timestamp: null }
  }

  getAllHealth() {
    const result = {}
    for (const [name, health] of this.#checks) result[name] = health
    return result
  }

  get overallStatus() {
    return this.#overallStatus
  }

  get healthy() {
    return this.#overallStatus === 'healthy'
  }

  startAutoCheck(engine, intervalMs = 30000) {
    if (this.#checkInterval) clearInterval(this.#checkInterval)
    this.#checkInterval = setInterval(() => this.checkAll(engine), intervalMs)
  }

  stopAutoCheck() {
    if (this.#checkInterval) {
      clearInterval(this.#checkInterval)
      this.#checkInterval = null
    }
  }

  #aggregate(results) {
    const statuses = new Set(results.map(r => r.status))
    if (statuses.has('unhealthy')) return 'failed'
    if (statuses.has('degraded')) return 'degraded'
    if (results.every(r => r.status === 'healthy')) return 'healthy'
    return 'unknown'
  }

  #emit(event, data) {
    if (this.#eventBus) {
      this.#eventBus.emit(event, createAuthEngineEvent(event, data))
    }
  }
}

export default AuthEngineHealth
