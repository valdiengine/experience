export class AuthRuntimeContext {
  #engine = null
  #authorizationContext = null
  #config = {}

  constructor(engine, config = {}) {
    this.#engine = engine
    this.#config = config
  }

  setAuthorizationContext(ctx) {
    this.#authorizationContext = ctx
  }

  async login(credentials) {
    return this.#engine.login(credentials)
  }

  async logout(session) {
    return this.#engine.logout(session)
  }

  async authenticate(token) {
    return this.#engine.authenticate(token)
  }

  async refresh(token) {
    return this.#engine.refresh(token)
  }

  async validate(session) {
    return this.#engine.validate(session)
  }

  async authorize(identity, action, resource, options = {}) {
    if (this.#authorizationContext) {
      return this.#authorizationContext.authorize(identity, action, resource, options)
    }
    return this.#engine.authorize(identity, action, resource)
  }

  async can(identity, action, resource, options = {}) {
    if (this.#authorizationContext) {
      return this.#authorizationContext.can(identity, action, resource, options)
    }
    return this.#engine.can(identity, action, resource)
  }

  async cannot(identity, action, resource, options = {}) {
    if (this.#authorizationContext) {
      return this.#authorizationContext.cannot(identity, action, resource, options)
    }
    return this.#engine.cannot(identity, action, resource)
  }

  async explain(identity, action, resource, options = {}) {
    if (this.#authorizationContext) {
      return this.#authorizationContext.explain(identity, action, resource, options)
    }
    return { action, resource, note: 'auth engine explain not available' }
  }

  async hasPermission(identity, permission, options = {}) {
    return this.#authorizationContext
      ? this.#authorizationContext.hasPermission(identity, permission, options)
      : false
  }

  async hasRole(identity, role, options = {}) {
    return this.#authorizationContext
      ? this.#authorizationContext.hasRole(identity, role, options)
      : false
  }

  async hasScope(context, scope, options = {}) {
    return this.#authorizationContext
      ? this.#authorizationContext.hasScope(context, scope, options)
      : false
  }

  getAuthorizationContext(options = {}) {
    return this.#authorizationContext
      ? this.#authorizationContext.getAuthorizationContext(options)
      : { engine: 'auth-engine', available: false }
  }

  getTenantContext(tenantId) {
    return this.#authorizationContext
      ? this.#authorizationContext.getTenantContext(tenantId)
      : { tenantId, isolation: 'legacy' }
  }

  getDestinationContext(destinationId) {
    return this.#authorizationContext
      ? this.#authorizationContext.getDestinationContext(destinationId)
      : { destinationId, isolation: 'legacy' }
  }

  async permissions(identityId) {
    return this.#engine.permissions(identityId)
  }

  async roles(identityId) {
    return this.#engine.roles(identityId)
  }

  async trust(identityId) {
    return this.#engine.trust(identityId)
  }

  async device(identityId) {
    return this.#engine.device(identityId)
  }

  async mfa(identityId) {
    return this.#engine.mfa(identityId)
  }

  async anonymous(fingerprint) {
    return this.#engine.anonymous(fingerprint)
  }

  async audit(filters) {
    return this.#engine.audit(filters)
  }

  async currentIdentity(context) {
    return this.#engine.currentIdentity(context)
  }

  async currentSession(context) {
    return this.#engine.currentSession(context)
  }

  async currentTenant(context) {
    return this.#engine.currentTenant(context)
  }

  available() {
    return this.#engine.available()
  }

  supports(feature) {
    return this.#engine.supports(feature)
  }
}

export default AuthRuntimeContext
