import { AuthenticationEngineError } from './auth.engine.errors.js'

export class AuthEngineFactory {
  #registry = null
  #instances = new Map()
  #config = {}

  constructor(registry, config = {}) {
    this.#registry = registry
    this.#config = {
      cacheInstances: config.cacheInstances !== false,
      singletonByTenant: config.singletonByTenant !== false,
      ...config,
    }
  }

  create(name, options = {}) {
    const ProviderClass = this.#registry.resolve(name)
    if (!ProviderClass) {
      throw new AuthenticationEngineError(`No auth provider class found for "${name}"`, { name, operation: 'create' })
    }
    const config = options.config || this.#config[name] || {}
    const provider = new ProviderClass(config)
    if (options.eventBus) provider.setEventBus?.(options.eventBus)
    return provider
  }

  async resolve(name, context = {}) {
    const tenant = context.tenant || '_default'
    const cacheKey = `${name}:${tenant}`
    const cached = this.#getCached(cacheKey)
    if (cached) return cached

    const provider = this.create(name, context)
    await provider.initialize()
    if (this.#config.cacheInstances) this.#setCached(cacheKey, provider)
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

  #getCached(key) {
    const entry = this.#instances.get(key)
    if (entry && !entry.disposed) return entry.instance
    return null
  }

  #setCached(key, instance) {
    this.#instances.set(key, { instance, disposed: false, createdAt: Date.now() })
  }
}

export default AuthEngineFactory
