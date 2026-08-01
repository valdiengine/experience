export class AuthorizationRuntimeRegistry {
  #entries = new Map()
  #initialized = false

  register(name, descriptor = {}) {
    this.#entries.set(name, {
      version: descriptor.version || '1.0.0',
      provider: descriptor.provider || 'valdi-policy',
      features: descriptor.features || [],
      priority: descriptor.priority || 0,
      status: 'registered',
      registeredAt: Date.now(),
    })
    return this
  }

  resolve(name) {
    return this.#entries.get(name) || null
  }

  remove(name) {
    this.#entries.delete(name)
  }

  list() {
    return Array.from(this.#entries.entries()).map(([name, entry]) => ({ name, ...entry }))
  }

  health() {
    const result = {}
    for (const [name, entry] of this.#entries) {
      result[name] = {
        status: entry.status,
        provider: entry.provider,
        version: entry.version,
        features: entry.features,
      }
    }
    return result
  }

  updateStatus(name, status) {
    const entry = this.#entries.get(name)
    if (entry) {
      entry.status = status
      entry.updatedAt = Date.now()
    }
  }

  get count() {
    return this.#entries.size
  }

  initialize() {
    this.#initialized = true
  }

  get initialized() {
    return this.#initialized
  }
}

export default AuthorizationRuntimeRegistry
