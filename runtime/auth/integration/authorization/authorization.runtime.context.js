export class AuthorizationRuntimeContext {
  #engine = null
  #config = {}

  constructor(engine, config = {}) {
    this.#engine = engine
    this.#config = config
  }

  async can(identity, action, resource, options = {}) {
    return this.#engine.can(identity, action, resource, options)
  }

  async cannot(identity, action, resource, options = {}) {
    return this.#engine.cannot(identity, action, resource, options)
  }

  async authorize(identity, action, resource, options = {}) {
    return this.#engine.authorize(identity, action, resource, options)
  }

  async explain(identity, action, resource, options = {}) {
    return this.#engine.explain(identity, action, resource, options)
  }

  async hasPermission(identity, permission, options = {}) {
    const decision = await this.#engine.can(identity, permission, '*', options)
    return decision
  }

  async hasRole(identity, role, options = {}) {
    return this.#engine.roleManager?.hasRole?.(identity, role) ?? false
  }

  async hasScope(context, scope, options = {}) {
    return this.#engine.scopeManager?.validate?.(context, scope) ?? false
  }

  getAuthorizationContext(options = {}) {
    return {
      engine: this.#engine?.constructor?.name || 'unknown',
      version: this.#config.version || '1.0.0',
      provider: this.#config.provider || 'valdi-policy',
      features: ['rbac', 'abac', 'pbac', 'scopes', 'audit'],
      available: this.#engine?.available() ?? false,
    }
  }

  getTenantContext(tenantId) {
    return { tenantId, isolation: 'strict' }
  }

  getDestinationContext(destinationId) {
    return { destinationId, isolation: 'data' }
  }

  available() {
    return this.#engine?.available() ?? false
  }

  supports(feature) {
    return this.#engine?.supports?.(feature) ?? false
  }
}

export default AuthorizationRuntimeContext
