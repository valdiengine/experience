import { RepositoryConfigurationError } from '../errors/repository.errors.js'

export class RepositoryFactory {
  #registry = null
  #adapters = new Map()
  #decorators = []
  #instances = new Map()
  #config = {}

  constructor(registry, config = {}) {
    this.#registry = registry
    this.#config = {
      defaultProvider: config.defaultProvider || 'mock',
      defaultCacheTTL: config.defaultCacheTTL || 300000,
      defaultRetryAttempts: config.defaultRetryAttempts || 3,
      decorators: {
        cache: config.cacheDecorator !== false,
        retry: config.retryDecorator !== false,
        audit: config.auditDecorator !== false,
        timestamps: config.timestampsDecorator !== false,
      },
      ...config,
    }
  }

  registerAdapter(providerName, AdapterClass) {
    this.#adapters.set(providerName, AdapterClass)
  }

  registerDecorator(name, decoratorFn) {
    this.#decorators.push({ name, fn: decoratorFn })
  }

  #getCachedInstance(entityName, contextKey) {
    const key = `${entityName}:${contextKey}`
    const entry = this.#instances.get(key)
    if (entry && !entry.disposed) return entry.instance
    return null
  }

  #setCachedInstance(entityName, contextKey, instance) {
    const key = `${entityName}:${contextKey}`
    this.#instances.set(key, { instance, disposed: false })
  }

  #resolveProvider(entityName, context) {
    const descriptor = this.#registry.metadata(entityName)
    if (context?.provider) {
      return typeof context.provider === 'string' ? { name: context.provider } : context.provider
    }
    if (descriptor?.config?.providerName) return { name: descriptor.config.providerName }
    return { name: this.#config.defaultProvider }
  }

  #resolveAdapter(provider, entityName) {
    const providerName = provider?.name || this.#config.defaultProvider
    const AdapterClass = this.#adapters.get(providerName)
    if (!AdapterClass) {
      throw new RepositoryConfigurationError(`No adapter registered for provider "${providerName}"`, { entityName, configKey: `adapter.${providerName}` })
    }
    return new AdapterClass(provider, { entityName, ...this.#config })
  }

  #applyDecorators(repository) {
    let wrapped = repository
    const decoratorOrder = ['timestamps', 'audit', 'retry', 'cache']
    for (const name of decoratorOrder) {
      if (this.#config.decorators[name]) {
        const decorator = this.#decorators.find(d => d.name === name)
        if (decorator) wrapped = decorator.fn(wrapped, this.#config)
      }
    }
    return wrapped
  }

  async create(entityName, context) {
    const descriptor = this.#registry.metadata(entityName)
    if (!descriptor) {
      throw new RepositoryConfigurationError(`Repository "${entityName}" is not registered`, { entityName, configKey: 'registration' })
    }
    const RepoClass = descriptor.class
    const provider = this.#resolveProvider(entityName, context)
    const adapter = this.#resolveAdapter(provider, entityName)
    const repo = new RepoClass(adapter, context, descriptor.config || {})
    let wrapped = this.#applyDecorators(repo)
    await wrapped.initialize()
    return wrapped
  }

  async resolve(entityName, context) {
    if (!context || !context.tenant) {
      throw new RepositoryConfigurationError(`Context with tenant is required to resolve repository "${entityName}"`, { entityName, configKey: 'context' })
    }
    const contextKey = typeof context.tenant === 'string' ? context.tenant : context.tenant.id
    const provider = this.#resolveProvider(entityName, context)
    const cacheKey = `${entityName}:${contextKey}:${provider?.name || this.#config.defaultProvider}`
    const cached = this.#getCachedInstance(entityName, cacheKey)
    if (cached) return cached
    const instance = await this.create(entityName, context)
    this.#setCachedInstance(entityName, cacheKey, instance)
    return instance
  }

  invalidate(entityName, tenantId) {
    const key = `${entityName}:${tenantId}`
    const entry = this.#instances.get(key)
    if (entry) { entry.disposed = true; entry.instance?.destroy(); this.#instances.delete(key) }
  }

  invalidateAll(tenantId) {
    for (const [key, entry] of this.#instances) {
      if (key.endsWith(`:${tenantId}`)) { entry.disposed = true; entry.instance?.destroy(); this.#instances.delete(key) }
    }
  }

  async health() {
    const results = []
    for (const [key, entry] of this.#instances) {
      if (!entry.disposed) {
        try {
          const status = await entry.instance.adapter.ping()
          results.push({ repository: key, status: status ? 'up' : 'down' })
        } catch { results.push({ repository: key, status: 'down' }) }
      }
    }
    return results
  }
}
