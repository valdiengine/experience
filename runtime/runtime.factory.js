import { RuntimeConfigurationError, RuntimeProviderError } from './runtime.errors.js'

export class RuntimeFactory {
  #registry = null
  #instances = new Map()
  #config = {}

  constructor(registry, config = {}) {
    this.#registry = registry
    this.#config = {
      defaultProvider: config.defaultProvider || null,
      fallbackOnFailure: config.fallbackOnFailure !== false,
      cacheInstances: config.cacheInstances !== false,
      ...config,
    }
  }

  registerProvider(name, ProviderClass) {
    this.#registry.register(name, { class: ProviderClass })
  }

  async create(name, options = {}) {
    const ProviderClass = this.#registry.resolve(name)
    if (!ProviderClass) {
      throw new RuntimeConfigurationError(`No provider class found for "${name}"`, { name, operation: 'create' })
    }

    const config = options.config || this.#config[name] || {}
    const eventBus = options.eventBus || null
    const provider = new ProviderClass(config)

    if (eventBus) {
      provider.setEventBus?.(eventBus)
    }

    return provider
  }

  async resolve(name, context = {}) {
    const cacheKey = `${name}:${context.tenant || '_default'}`
    const cached = this.#getCachedInstance(cacheKey)
    if (cached) return cached

    const provider = await this.create(name, context)
    await provider.initialize()

    if (this.#config.cacheInstances) {
      this.#setCachedInstance(cacheKey, provider)
    }

    return provider
  }

  async dispose(name, context = {}) {
    const cacheKey = `${name}:${context.tenant || '_default'}`
    const entry = this.#instances.get(cacheKey)
    if (entry && !entry.disposed) {
      await entry.instance.dispose?.()
      entry.disposed = true
      this.#instances.delete(cacheKey)
    }
  }

  async disposeAll() {
    for (const [key, entry] of this.#instances) {
      if (!entry.disposed) {
        try { await entry.instance.dispose?.() } catch {}
      }
    }
    this.#instances.clear()
  }

  listInstances() {
    const result = []
    for (const [key, entry] of this.#instances) {
      if (!entry.disposed) {
        result.push({ key, name: entry.instance.constructor.name, initialized: entry.instance.initialized })
      }
    }
    return result
  }

  #getCachedInstance(key) {
    const entry = this.#instances.get(key)
    if (entry && !entry.disposed) return entry.instance
    return null
  }

  #setCachedInstance(key, instance) {
    this.#instances.set(key, { instance, disposed: false, createdAt: Date.now() })
  }
}

export default RuntimeFactory
