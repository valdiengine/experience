export class PolicyContext {
  #data = {}

  constructor(options = {}) {
    this.#data = {
      identity: options.identity || null,
      action: options.action || null,
      resource: options.resource || null,
      tenant: options.tenant || null,
      destination: options.destination || null,
      business: options.business || null,
      currentTime: options.currentTime || new Date(),
      offline: options.offline || false,
      trustLevel: options.trustLevel || null,
      device: options.device || null,
      locale: options.locale || null,
      timezone: options.timezone || null,
      roles: options.roles || [],
      permissions: options.permissions || [],
      scopes: options.scopes || [],
      ...options,
    }
  }

  get identity() { return this.#data.identity }
  get action() { return this.#data.action }
  get resource() { return this.#data.resource }
  get tenant() { return this.#data.tenant }
  get destination() { return this.#data.destination }
  get business() { return this.#data.business }
  get currentTime() { return this.#data.currentTime }
  get offline() { return this.#data.offline }
  get trustLevel() { return this.#data.trustLevel }
  get device() { return this.#data.device }
  get locale() { return this.#data.locale }
  get timezone() { return this.#data.timezone }
  get roles() { return this.#data.roles }
  get permissions() { return this.#data.permissions }
  get scopes() { return this.#data.scopes }

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

export default PolicyContext
