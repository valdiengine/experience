import { OrmConfigurationError, OrmProviderError } from './orm.errors.js'
import { ORM_EVENTS, createOrmEvent } from './orm.events.js'

export class OrmFactory {
  constructor(config = {}) {
    this.config = config
    this.providers = new Map()
    this.adapters = new Map()
    this.instances = new Map()
    this.eventBus = config.eventBus || null
    this.defaultProvider = config.defaultProvider || null
    this.defaultOptions = {
      timeout: config.timeout || 30000,
      retryAttempts: config.retryAttempts || 3,
      poolSize: config.poolSize || 10,
      ...config,
    }
  }

  registerProvider(name, providerClass, options = {}) {
    if (!name || !providerClass) {
      throw new OrmConfigurationError('Provider name and class are required', { operation: 'registerProvider' })
    }
    if (this.providers.has(name)) {
      throw new OrmConfigurationError(`Provider "${name}" is already registered`, { operation: 'registerProvider', providerName: name })
    }
    this.providers.set(name, { class: providerClass, options, registeredAt: Date.now() })
    this.#emit(ORM_EVENTS.PROVIDER_REGISTERED, { providerName: name })
    return this
  }

  registerAdapter(entityName, adapterClass, options = {}) {
    if (!entityName || !adapterClass) {
      throw new OrmConfigurationError('Entity name and adapter class are required', { operation: 'registerAdapter' })
    }
    this.adapters.set(entityName, { class: adapterClass, options, registeredAt: Date.now() })
    this.#emit(ORM_EVENTS.ADAPTER_REGISTERED, { entityName })
    return this
  }

  async create(entityName, context = {}) {
    if (!entityName) throw new OrmConfigurationError('Entity name is required', { operation: 'create' })
    const cacheKey = this.#cacheKey(entityName, context)
    if (this.instances.has(cacheKey)) return this.instances.get(cacheKey)

    const adapterEntry = this.adapters.get(entityName)
    if (!adapterEntry) throw new OrmProviderError(`No ORM adapter registered for "${entityName}"`, { entityName })

    const providerName = context.providerName || this.defaultProvider
    let providerEntry = null
    if (providerName) providerEntry = this.providers.get(providerName)

    const model = providerEntry
      ? await this.#getModel(providerEntry, entityName, context)
      : context.model || null

    const instance = new adapterEntry.class(model, {
      entityName,
      providerName,
      eventBus: this.eventBus,
      ...this.defaultOptions,
      ...adapterEntry.options,
      ...context.options,
    })

    if (context.eventBus) instance.eventBus = context.eventBus
    await instance.initialize()
    this.instances.set(cacheKey, instance)
    this.#emit(ORM_EVENTS.ADAPTER_INITIALIZED, { entityName, providerName })
    return instance
  }

  async resolve(entityName, context = {}) {
    return this.create(entityName, context)
  }

  getProvider(name) {
    const entry = this.providers.get(name)
    if (!entry) throw new OrmProviderError(`Provider "${name}" is not registered`, { operation: 'getProvider', providerName: name })
    return entry
  }

  hasProvider(name) { return this.providers.has(name) }
  hasAdapter(entityName) { return this.adapters.has(entityName) }
  registeredProviders() { return [...this.providers.keys()] }
  registeredAdapters() { return [...this.adapters.keys()] }

  invalidate(entityName, contextKey) {
    const cacheKey = this.#cacheKey(entityName, { tenantId: contextKey })
    const instance = this.instances.get(cacheKey)
    if (instance) {
      instance.destroy().catch(() => {})
      this.instances.delete(cacheKey)
    }
  }

  invalidateAll() {
    for (const [key, instance] of this.instances) {
      instance.destroy().catch(() => {})
    }
    this.instances.clear()
  }

  async health() {
    const results = []
    for (const [key, instance] of this.instances) {
      try {
        const ping = await instance.ping()
        results.push({ entityName: instance.entityName, providerName: instance.providerName, status: ping ? 'up' : 'down' })
      } catch {
        results.push({ entityName: instance.entityName, providerName: instance.providerName, status: 'down' })
      }
    }
    return {
      providerCount: this.providers.size,
      adapterCount: this.adapters.size,
      instanceCount: this.instances.size,
      providers: [...this.providers.keys()],
      adapters: [...this.adapters.keys()],
      instances: results,
    }
  }

  #cacheKey(entityName, context) {
    const tenant = context?.tenantId || context?.tenant || 'global'
    return `${entityName}:${tenant}`
  }

  async #getModel(providerEntry, entityName, context) {
    const providerClass = providerEntry.class
    const provider = typeof providerClass === 'function'
      ? new providerClass(entityName, { ...providerEntry.options, ...context.options })
      : providerClass
    if (typeof provider.getModel === 'function') return provider.getModel(entityName)
    if (typeof provider.model === 'function') return provider.model(entityName)
    return null
  }

  #emit(event, data) {
    if (this.eventBus) this.eventBus.emit(event, createOrmEvent(event, data))
  }
}

export default OrmFactory
