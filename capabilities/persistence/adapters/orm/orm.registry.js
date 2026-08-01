import { OrmConfigurationError } from './orm.errors.js'

export class OrmRegistry {
  constructor(config = {}) {
    this.config = config
    this.entries = new Map()
    this.initialized = false
  }

  register(name, descriptor) {
    if (!name || !descriptor) {
      throw new OrmConfigurationError('Name and descriptor are required', { operation: 'register' })
    }
    if (this.entries.has(name)) {
      throw new OrmConfigurationError(`ORM "${name}" is already registered`, { operation: 'register', ormName: name })
    }
    const entry = {
      name,
      version: descriptor.version || '1.0.0',
      adapterClass: descriptor.adapterClass || null,
      providerClass: descriptor.providerClass || null,
      capabilities: descriptor.capabilities || [],
      dialects: descriptor.dialects || [],
      options: descriptor.options || {},
      metadata: descriptor.metadata || {},
      registeredAt: Date.now(),
    }
    this.entries.set(name, entry)
    return this
  }

  get(name) {
    const entry = this.entries.get(name)
    if (!entry) return null
    return { ...entry }
  }

  resolve(name) {
    const entry = this.entries.get(name)
    if (!entry) throw new OrmConfigurationError(`ORM "${name}" is not registered`, { operation: 'resolve', ormName: name })
    return entry
  }

  has(name) { return this.entries.has(name) }
  names() { return [...this.entries.keys()] }
  count() { return this.entries.size }

  supportedDialects() {
    const dialects = new Set()
    for (const entry of this.entries.values()) {
      for (const d of entry.dialects) dialects.add(d)
    }
    return [...dialects]
  }

  findByDialect(dialect) {
    const results = []
    for (const entry of this.entries.values()) {
      if (entry.dialects.includes(dialect)) results.push(entry.name)
    }
    return results
  }

  findByCapability(capability) {
    const results = []
    for (const entry of this.entries.values()) {
      if (entry.capabilities.includes(capability)) results.push(entry.name)
    }
    return results
  }

  supportsCapability(name, capability) {
    const entry = this.entries.get(name)
    return entry ? entry.capabilities.includes(capability) : false
  }

  supportsDialect(name, dialect) {
    const entry = this.entries.get(name)
    return entry ? entry.dialects.includes(dialect) : false
  }

  version(name) {
    const entry = this.entries.get(name)
    return entry ? entry.version : null
  }

  health() {
    return {
      initialized: this.initialized,
      registered: this.count(),
      orms: [...this.entries.values()].map(e => ({
        name: e.name, version: e.version, dialects: e.dialects, capabilities: e.capabilities,
      })),
    }
  }

  async initialize() {
    if (this.initialized) return
    this.initialized = true
  }

  async destroy() {
    this.entries.clear()
    this.initialized = false
  }
}

export default OrmRegistry
