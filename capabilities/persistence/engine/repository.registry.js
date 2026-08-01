import { RepositoryConfigurationError } from '../errors/repository.errors.js'

export class RepositoryRegistry {
  #descriptors = new Map()
  #initialized = false

  register(entityName, descriptor) {
    if (this.#descriptors.has(entityName)) throw new RepositoryConfigurationError(`Repository "${entityName}" is already registered`, { entityName, configKey: 'registration' })
    if (!entityName || typeof entityName !== 'string') throw new RepositoryConfigurationError('Entity name is required', { configKey: 'entityName' })
    if (!descriptor.class) throw new RepositoryConfigurationError(`Repository class is required for "${entityName}"`, { entityName, configKey: 'class' })
    if (this.#initialized) this.#validateDependencies(descriptor)

    const metadata = {
      entityName, class: descriptor.class, version: descriptor.class.version || '1.0.0',
      dependencies: descriptor.class.dependencies || [], readOnly: descriptor.class.readOnly || false,
      aggregate: descriptor.class.aggregate || false, cacheable: descriptor.class.cacheable !== false,
      searchable: descriptor.class.searchable !== false, softDeletable: descriptor.class.softDeletable !== false,
      config: descriptor.config || {}, registeredAt: Date.now(),
    }
    this.#descriptors.set(entityName, metadata)
    return this
  }

  unregister(entityName) { this.#descriptors.delete(entityName); return this }

  resolve(entityName) {
    const descriptor = this.#descriptors.get(entityName)
    if (!descriptor) throw new RepositoryConfigurationError(`Repository "${entityName}" is not registered`, { entityName, configKey: 'registration' })
    return descriptor.class
  }

  resolveAll() {
    const results = {}
    for (const [name, descriptor] of this.#descriptors) results[name] = descriptor.class
    return results
  }

  metadata(entityName) { return this.#descriptors.get(entityName) || null }

  list() {
    return Array.from(this.#descriptors.values()).map(d => ({
      entityName: d.entityName, version: d.version, dependencies: d.dependencies,
      readOnly: d.readOnly, aggregate: d.aggregate, cacheable: d.cacheable,
      searchable: d.searchable, softDeletable: d.softDeletable,
    }))
  }

  isRegistered(entityName) { return this.#descriptors.has(entityName) }
  get count() { return this.#descriptors.size }

  #validateDependencies(descriptor) {
    const deps = descriptor.class.dependencies || []
    for (const dep of deps) {
      if (!this.#descriptors.has(dep)) throw new RepositoryConfigurationError(`Repository "${descriptor.entityName}" depends on "${dep}" which is not registered`, { entityName: descriptor.entityName, configKey: `dependencies.${dep}` })
    }
  }

  async health() {
    return Array.from(this.#descriptors.values()).map(d => ({
      entityName: d.entityName, version: d.version, readOnly: d.readOnly, registered: true,
    }))
  }

  initialize() {
    for (const [, descriptor] of this.#descriptors) this.#validateDependencies(descriptor)
    this.#initialized = true
  }

  toJSON() { return { count: this.#descriptors.size, repositories: this.list() } }
}
