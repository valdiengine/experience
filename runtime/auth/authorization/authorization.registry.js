export class AuthorizationRegistry {
  #entries = new Map()
  #initialized = false

  register(name, descriptor = {}) {
    this.#entries.set(name, {
      version: descriptor.version || '1.0.0',
      type: descriptor.type || 'policy',
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

  listByType(type) {
    return Array.from(this.#entries.values()).filter(e => e.type === type)
  }

  updateStatus(name, status) {
    const entry = this.#entries.get(name)
    if (entry) {
      entry.status = status
      entry.updatedAt = Date.now()
    }
  }

  health() {
    const result = {}
    for (const [name, entry] of this.#entries) {
      result[name] = { status: entry.status, type: entry.type, version: entry.version }
    }
    return result
  }

  get count() { return this.#entries.size }

  initialize() { this.#initialized = true }
  get initialized() { return this.#initialized }
}

export default AuthorizationRegistry
