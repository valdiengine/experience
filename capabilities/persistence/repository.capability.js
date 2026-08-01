import { BaseCapability } from '../core/base.capability.js'
import { RepositoryEngine } from './engine/repository.engine.js'
import { REPOSITORY_EVENTS, createRepositoryEvent } from './events/repository.events.js'

export class PersistenceCapability extends BaseCapability {
  static id = 'persistence'
  static name = 'Persistence'
  static version = '1.0.0'
  static dependencies = []

  #engine = null
  #repositories = null
  #facades = new Map()
  #resolved = new Map()

  get engine() { return this.#engine }

  async init(context, config = {}) {
    await super.init(context, config)
    this.#engine = new RepositoryEngine(config)
    this.#engine.setEventBus(this.eventBus)
    this.#engine.initialize()

    this.#repositories = new Proxy({}, {
      get: (target, name) => {
        if (name in target) return target[name]
        if (typeof name === 'string' && name !== 'then') {
          return this.#facadeFor(name)
        }
        return undefined
      },
    })
  }

  async #resolveRepository(name) {
    try {
      const repo = await this.#engine.get(name, this.context)
      return repo
    } catch (err) {
      if (this.#engine?.registry?.isRegistered(name)) {
        throw err
      }
      return undefined
    }
  }

  #facadeFor(name) {
    if (!this.#facades.has(name)) {
      this.#facades.set(name, this.#buildFacade(name))
    }
    return this.#facades.get(name)
  }

  #buildFacade(name) {
    const getRepository = async () => {
      if (this.#resolved.has(name)) return this.#resolved.get(name)
      const repo = await this.#resolveRepository(name)
      if (repo) this.#resolved.set(name, repo)
      return repo
    }
    return new Proxy({}, {
      get: (target, method) => {
        if (typeof method !== 'string') return target[method]
        return async (...args) => {
          const repo = await getRepository()
          if (!repo || typeof repo[method] !== 'function') return undefined
          return repo[method](...args)
        }
      },
    })
  }

  async activate() {
    this.on(REPOSITORY_EVENTS.REPOSITORY_ERROR, this.#onRepositoryError.bind(this))
    await super.activate()
  }

  async deactivate() {
    await super.deactivate()
  }

  async destroy() {
    this.#engine = null
    this.#repositories = null
    this.#facades.clear()
    this.#resolved.clear()
    await super.destroy()
  }

  get(name) {
    if (!this.#repositories) return undefined
    return this.#repositories[name]
  }

  async register(entityName, descriptor) {
    this.#engine.register(entityName, descriptor)
    this.emit(REPOSITORY_EVENTS.REPOSITORY_REGISTERED, { entityName })
  }

  createContext(options = {}) {
    return this.#engine.createContext({
      eventBus: this.eventBus,
      ...options,
    })
  }

  async health() {
    return this.#engine?.health() || { initialized: false }
  }

  #onRepositoryError(event) {
    const { entityName, operation, message } = event?.payload || {}
    this.eventBus?.emit(REPOSITORY_EVENTS.REPOSITORY_ERROR, createRepositoryEvent(REPOSITORY_EVENTS.REPOSITORY_ERROR, {
      source: 'persistence',
      entityName,
      operation,
      error: message,
    }))
  }
}

export default PersistenceCapability
