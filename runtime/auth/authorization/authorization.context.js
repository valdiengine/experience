export class AuthorizationContext {
  #data = {}

  constructor(options = {}) {
    this.#data = {
      identity: options.identity || null,
      tenant: options.tenant || null,
      destination: options.destination || null,
      business: options.business || null,
      currentTime: options.currentTime || new Date(),
      offline: options.offline || false,
      trustLevel: options.trustLevel || null,
      device: options.device || null,
      locale: options.locale || null,
      timezone: options.timezone || null,
      scopes: options.scopes || [],
      permissions: options.permissions || [],
      roles: options.roles || [],
      capabilities: options.capabilities || [],
      ...options,
    }
  }

  get identity() { return this.#data.identity }
  get tenant() { return this.#data.tenant }
  get destination() { return this.#data.destination }
  get business() { return this.#data.business }
  get currentTime() { return this.#data.currentTime }
  get offline() { return this.#data.offline }
  get trustLevel() { return this.#data.trustLevel }
  get device() { return this.#data.device }
  get locale() { return this.#data.locale }
  get timezone() { return this.#data.timezone }
  get scopes() { return this.#data.scopes }
  get permissions() { return this.#data.permissions }
  get roles() { return this.#data.roles }
  get capabilities() { return this.#data.capabilities }

  get(key) {
    return this.#data[key] !== undefined ? this.#data[key] : null
  }

  set(key, value) {
    this.#data[key] = value
  }

  toJSON() {
    return { ...this.#data }
  }
}

export default AuthorizationContext
