export class AuthEngineContext {
  constructor(options = {}) {
    this.identity = options.identity || null
    this.tenant = options.tenant || null
    this.destination = options.destination || null
    this.session = options.session || null
    this.permissions = options.permissions || []
    this.roles = options.roles || []
    this.trust = options.trust || null
    this.device = options.device || null
    this.provider = options.provider || null
    this.logger = options.logger || null
    this.eventBus = options.eventBus || null
    this.runtime = options.runtime || null
    this.repositories = options.repositories || {}
  }

  toJSON() {
    return {
      identity: this.identity,
      tenant: this.tenant,
      destination: this.destination,
      session: this.session ? { id: this.session.id, type: this.session.type, status: this.session.status } : null,
      permissions: this.permissions,
      roles: this.roles,
      trust: this.trust,
      device: this.device ? { id: this.device.id, trusted: this.device.trusted } : null,
      provider: this.provider,
    }
  }
}

export default AuthEngineContext
