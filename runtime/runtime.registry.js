import { RuntimeConfigurationError } from './runtime.errors.js'

export class RuntimeRegistry {
  #providers = new Map()
  #initialized = false

  register(name, providerDescriptor) {
    if (this.#providers.has(name)) {
      throw new RuntimeConfigurationError(`Runtime provider "${name}" is already registered`, { name, operation: 'register' })
    }
    if (!name || typeof name !== 'string') {
      throw new RuntimeConfigurationError('Runtime provider name is required', { operation: 'register' })
    }
    if (!providerDescriptor.class) {
      throw new RuntimeConfigurationError(`Runtime provider class is required for "${name}"`, { name, operation: 'register' })
    }

    const metadata = {
      name,
      class: providerDescriptor.class,
      version: providerDescriptor.version || '1.0.0',
      category: providerDescriptor.category || 'generic',
      dependencies: providerDescriptor.dependencies || [],
      config: providerDescriptor.config || {},
      priority: providerDescriptor.priority || 0,
      future: providerDescriptor.future === true,
      registeredAt: Date.now(),
    }

    this.#providers.set(name, metadata)
    return this
  }

  unregister(name) {
    this.#providers.delete(name)
    return this
  }

  resolve(name) {
    const descriptor = this.#providers.get(name)
    if (!descriptor) {
      throw new RuntimeConfigurationError(`Runtime provider "${name}" is not registered`, { name, operation: 'resolve' })
    }
    return descriptor.class
  }

  resolveAll() {
    const result = {}
    for (const [name, descriptor] of this.#providers) {
      result[name] = descriptor.class
    }
    return result
  }

  metadata(name) {
    return this.#providers.get(name) || null
  }

  list() {
    return Array.from(this.#providers.values()).map(d => ({
      name: d.name,
      version: d.version,
      category: d.category,
      dependencies: d.dependencies,
      priority: d.priority,
      config: d.config,
      future: d.future,
      class: d.class,
    }))
  }

  findByCategory(category) {
    return Array.from(this.#providers.values()).filter(d => d.category === category)
  }

  isRegistered(name) {
    return this.#providers.has(name)
  }

  get count() {
    return this.#providers.size
  }

  initialize() {
    this.#initialized = true
  }

  get initialized() {
    return this.#initialized
  }
}

export default RuntimeRegistry
