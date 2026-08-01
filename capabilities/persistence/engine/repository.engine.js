import { RepositoryRegistry } from './repository.registry.js'
import { RepositoryFactory } from './repository.factory.js'
import { RepositoryContext } from './repository.context.js'
import { TransactionManager } from './transaction.manager.js'
import { REPOSITORY_EVENTS } from '../events/repository.events.js'

export class RepositoryEngine {
  #registry = null
  #factory = null
  #transactionManager = null
  #initialized = false
  #eventBus = null

  constructor(config = {}) {
    this.#registry = new RepositoryRegistry()
    this.#factory = new RepositoryFactory(this.#registry, config)
    this.#transactionManager = new TransactionManager(config.transaction || {})
  }

  get registry() { return this.#registry }
  get factory() { return this.#factory }
  get transactionManager() { return this.#transactionManager }
  get initialized() { return this.#initialized }

  setEventBus(eventBus) {
    this.#eventBus = eventBus
    this.#transactionManager.setEventBus(eventBus)
  }

  registerAdapter(providerName, AdapterClass) { this.#factory.registerAdapter(providerName, AdapterClass) }
  registerDecorator(name, decoratorFn) { this.#factory.registerDecorator(name, decoratorFn) }

  register(entityName, descriptor) {
    this.#registry.register(entityName, descriptor)
    this.#emit(REPOSITORY_EVENTS.REPOSITORY_REGISTERED, { entityName })
  }

  initialize() { this.#registry.initialize(); this.#initialized = true }

  createContext(options = {}) {
    return new RepositoryContext({ eventBus: this.#eventBus, ...options })
  }

  async beginTransaction(options = {}) {
    return this.#transactionManager.begin(options)
  }

  async get(entityName, context) {
    if (!this.#initialized) throw new Error('RepositoryEngine is not initialized')
    const repository = await this.#factory.resolve(entityName, context)
    this.#emit(REPOSITORY_EVENTS.REPOSITORY_CREATED, { entityName })
    return repository
  }

  async getMany(entityNames, context) {
    if (!this.#initialized) throw new Error('RepositoryEngine is not initialized')
    const results = {}
    for (const name of entityNames) results[name] = await this.#factory.resolve(name, context)
    return results
  }

  invalidate(entityName, tenantId) { this.#factory.invalidate(entityName, tenantId) }
  invalidateAll(tenantId) { this.#factory.invalidateAll(tenantId) }

  async health() {
    const registryHealth = await this.#registry.health()
    const factoryHealth = await this.#factory.health()
    const txHealth = this.#transactionManager.health()
    return { initialized: this.#initialized, registrations: this.#registry.count, repositories: registryHealth, connections: factoryHealth, transactions: txHealth }
  }

  #emit(event, data) {
    if (this.#eventBus) this.#eventBus.emit(event, { source: 'repository-engine', ...data, timestamp: Date.now() })
  }
}
