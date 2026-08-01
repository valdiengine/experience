export class AuthorizationHealth {
  #eventBus = null
  #overallStatus = 'unknown'

  constructor(options = {}) {
    this.#eventBus = options.eventBus || null
  }

  setEventBus(eventBus) {
    this.#eventBus = eventBus
  }

  async checkAll(engine) {
    const components = [
      { name: 'policy-engine', ref: engine.policyEngine },
      { name: 'permission-resolver', ref: engine.permissionResolver },
      { name: 'role-manager', ref: engine.roleManager },
      { name: 'scope-manager', ref: engine.scopeManager },
      { name: 'policy-cache', ref: engine.policyCache },
      { name: 'authorization-audit', ref: engine.audit },
    ]

    const results = []
    for (const component of components) {
      if (!component.ref) continue
      try {
        const h = typeof component.ref.health === 'function' ? await component.ref.health() : { status: 'unknown' }
        results.push({ name: component.name, status: h.status || 'unknown' })
      } catch {
        results.push({ name: component.name, status: 'unhealthy' })
      }
    }

    this.#overallStatus = this.#aggregate(results)
    return { status: this.#overallStatus, components: results, timestamp: Date.now() }
  }

  get overallStatus() { return this.#overallStatus }

  #aggregate(results) {
    if (results.length === 0) return 'unknown'
    const s = new Set(results.map(r => r.status))
    if (s.has('unhealthy')) return 'unhealthy'
    if (s.has('degraded')) return 'degraded'
    if (results.every(r => r.status === 'healthy')) return 'healthy'
    return 'unknown'
  }
}

export default AuthorizationHealth
