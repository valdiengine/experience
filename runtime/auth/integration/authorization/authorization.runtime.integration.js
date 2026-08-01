import { AuthorizationEngine } from '../../authorization/authorization.engine.js'
import { AuthorizationRuntimeContext } from './authorization.runtime.context.js'
import { AuthorizationRuntimeRegistry } from './authorization.runtime.registry.js'
import { AuthorizationRuntimeFactory } from './authorization.runtime.factory.js'
import { AuthorizationRuntimeHealth } from './authorization.runtime.health.js'
import { AUTHORIZATION_RUNTIME_EVENTS, createAuthorizationRuntimeEvent } from './authorization.runtime.events.js'
import { AuthorizationRuntimeInitializationError } from './authorization.runtime.errors.js'

export class AuthorizationRuntimeIntegration {
  #engine = null
  #context = null
  #registry = null
  #factory = null
  #health = null
  #eventBus = null
  #initialized = false
  #config = {}

  constructor(config = {}) {
    this.#config = config
    this.#registry = new AuthorizationRuntimeRegistry(config)
    this.#factory = new AuthorizationRuntimeFactory(config)
    this.#health = new AuthorizationRuntimeHealth(config)
  }

  get registry() { return this.#registry }
  get factory() { return this.#factory }
  get health() { return this.#health }
  get engine() { return this.#engine }
  get context() { return this.#context }
  get initialized() { return this.#initialized }

  setEventBus(eventBus) {
    this.#eventBus = eventBus
    this.#health.setEventBus(eventBus)
  }

  async initialize() {
    if (this.#initialized) return

    try {
      this.#registry.initialize()
      this.#registry.register('default', {
        version: this.#config.version || '1.0.0',
        provider: this.#config.provider || 'valdi-policy',
        features: ['rbac', 'abac', 'pbac', 'scopes', 'audit', 'can', 'cannot', 'authorize', 'explain', 'hasPermission', 'hasRole', 'hasScope'],
        priority: 0,
      })

      this.#engine = new AuthorizationEngine(this.#config)
      if (this.#eventBus) this.#engine.setEventBus(this.#eventBus)
      await this.#engine.initialize()

      this.#context = new AuthorizationRuntimeContext(this.#engine, {
        ...this.#config,
        version: this.#config.version || '1.0.0',
        provider: this.#config.provider || 'valdi-policy',
      })

      this.#initialized = true

      this.#emit(AUTHORIZATION_RUNTIME_EVENTS.RUNTIME_AUTHORIZATION_INITIALIZED, {
        provider: this.#config.provider || 'valdi-policy',
        version: this.#config.version || '1.0.0',
      })
    } catch (err) {
      this.#emit(AUTHORIZATION_RUNTIME_EVENTS.RUNTIME_AUTHORIZATION_ERROR, { error: err.message })
      throw new AuthorizationRuntimeInitializationError(`Failed to initialize authorization runtime: ${err.message}`, { error: err })
    }
  }

  async shutdown() {
    if (!this.#initialized) return

    try {
      await this.#engine.shutdown()
      await this.#engine.dispose()
      this.#registry.updateStatus('default', 'stopped')
      this.#initialized = false
      this.#emit(AUTHORIZATION_RUNTIME_EVENTS.RUNTIME_AUTHORIZATION_SHUTDOWN, { timestamp: Date.now() })
    } catch (err) {
      this.#emit(AUTHORIZATION_RUNTIME_EVENTS.RUNTIME_AUTHORIZATION_ERROR, { error: err.message })
    }
  }

  async dispose() {
    await this.#engine?.dispose()
    this.#initialized = false
  }

  async health() {
    return this.#health.checkAll(this)
  }

  available() {
    return this.#initialized && this.#engine?.available() === true
  }

  supports(feature) {
    return this.#engine?.supports?.(feature) ?? false
  }

  #emit(event, data) {
    if (this.#eventBus) {
      this.#eventBus.emit(event, createAuthorizationRuntimeEvent(event, data))
    }
  }
}

export default AuthorizationRuntimeIntegration
