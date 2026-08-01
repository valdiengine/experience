export class SyncRegistry {
  #providers = new Map()
  #strategies = new Map()
  #entityTypes = new Map()

  registerProvider(name, provider) {
    this.#providers.set(name, provider)
    return this
  }

  getProvider(name) {
    return this.#providers.get(name) || null
  }

  removeProvider(name) {
    this.#providers.delete(name)
  }

  listProviders() {
    return Array.from(this.#providers.keys())
  }

  registerStrategy(direction, strategy) {
    this.#strategies.set(direction, strategy)
    return this
  }

  getStrategy(direction) {
    return this.#strategies.get(direction) || null
  }

  listStrategies() {
    return Array.from(this.#strategies.keys())
  }

  registerEntityType(entityType, config = {}) {
    this.#entityTypes.set(entityType, {
      supportedDirections: config.supportedDirections || ['pull'],
      strategies: config.strategies || {},
      conflictPolicy: config.conflictPolicy || 'default',
      ...config,
    })
    return this
  }

  getEntityConfig(entityType) {
    return this.#entityTypes.get(entityType) || null
  }

  listEntityTypes() {
    return Array.from(this.#entityTypes.keys())
  }

  supports(entityType, direction) {
    const config = this.#entityTypes.get(entityType)
    if (!config) return false
    return config.supportedDirections?.includes(direction) || false
  }

  health() {
    return {
      providers: this.#providers.size,
      strategies: this.#strategies.size,
      entityTypes: this.#entityTypes.size,
      registeredEntityTypes: this.listEntityTypes(),
      registeredProviders: this.listProviders(),
      registeredStrategies: this.listStrategies(),
    }
  }
}

export default SyncRegistry
