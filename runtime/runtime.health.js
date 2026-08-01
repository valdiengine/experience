import { RUNTIME_EVENTS, createRuntimeEvent } from './runtime.events.js'

export class RuntimeHealth {
  #moduleHealth = new Map()
  #eventBus = null
  #overallStatus = 'unknown'

  constructor(options = {}) {
    this.#eventBus = options.eventBus || null
  }

  setEventBus(eventBus) {
    this.#eventBus = eventBus
  }

  async checkModule(name, module) {
    let status = 'unknown'
    let error = null

    try {
      const result = await module.health()
      status = result?.status || 'unknown'
    } catch (err) {
      status = 'unhealthy'
      error = err.message
    }

    const previous = this.#moduleHealth.get(name)
    this.#moduleHealth.set(name, { status, error, timestamp: Date.now() })

    if (previous && previous.status !== status) {
      this.#emit(RUNTIME_EVENTS.RUNTIME_HEALTH_CHANGED, {
        module: name,
        from: previous.status,
        to: status,
      })
    }

    return { name, status, error, timestamp: Date.now() }
  }

  async checkAll(runtimeEngine) {
    const results = []
    const modules = runtimeEngine.listModules()

    for (const name of modules) {
      const module = runtimeEngine.getModule(name)
      if (!module) continue
      const result = await this.checkModule(name, module)
      results.push(result)
    }

    this.#overallStatus = this.#aggregate(results)
    return {
      status: this.#overallStatus,
      modules: results,
      timestamp: Date.now(),
    }
  }

  getModuleHealth(name) {
    return this.#moduleHealth.get(name) || { status: 'unknown', timestamp: null }
  }

  getAllHealth() {
    const result = {}
    for (const [name, health] of this.#moduleHealth) {
      result[name] = health
    }
    return result
  }

  get overallStatus() {
    return this.#overallStatus
  }

  get healthy() {
    return this.#overallStatus === 'healthy'
  }

  #aggregate(results) {
    const statuses = new Set(results.map(r => r.status))

    if (statuses.has('offline') || statuses.has('maintenance')) return 'degraded'
    if (statuses.has('unhealthy')) return 'unhealthy'
    if (statuses.has('healthy') && statuses.size === 1) return 'healthy'
    if (results.length === 0) return 'unknown'

    const hasHealthy = statuses.has('healthy')
    const hasUnknown = statuses.has('unknown')
    if (hasHealthy && hasUnknown) return 'degraded'

    return 'unknown'
  }

  #emit(event, data) {
    if (this.#eventBus) {
      this.#eventBus.emit(event, createRuntimeEvent(event, data))
    }
  }
}

export default RuntimeHealth
