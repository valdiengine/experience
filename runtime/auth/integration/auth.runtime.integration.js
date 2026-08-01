import { AuthenticationEngine } from '../engine/authentication.engine.js'
import { AuthRuntimeContext } from './auth.runtime.context.js'
import { AuthRuntimeRegistry } from './auth.runtime.registry.js'
import { AuthRuntimeFactory } from './auth.runtime.factory.js'
import { AuthRuntimeHealth } from './auth.runtime.health.js'
import { AUTH_RUNTIME_EVENTS, createAuthRuntimeEvent } from './auth.runtime.events.js'
import { AuthenticationInitializationError } from './auth.runtime.errors.js'

export class AuthRuntimeIntegration {
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
    this.#registry = new AuthRuntimeRegistry(config)
    this.#factory = new AuthRuntimeFactory(config)
    this.#health = new AuthRuntimeHealth(config)
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
        provider: this.#config.provider || 'default',
        features: ['login', 'logout', 'authenticate', 'refresh', 'validate', 'authorize', 'session', 'token', 'permission', 'role', 'trust', 'device', 'mfa', 'anonymous', 'audit'],
        priority: 0,
      })

      this.#engine = new AuthenticationEngine(this.#config)
      if (this.#eventBus) this.#engine.setEventBus(this.#eventBus)
      await this.#engine.initialize()

      this.#context = new AuthRuntimeContext(this.#engine, this.#config)

      this.#initialized = true

      this.#emit(AUTH_RUNTIME_EVENTS.RUNTIME_AUTH_INITIALIZED, {
        provider: this.#config.provider || 'default',
        version: this.#config.version || '1.0.0',
      })
    } catch (err) {
      this.#emit(AUTH_RUNTIME_EVENTS.RUNTIME_AUTH_ERROR, { error: err.message })
      throw new AuthenticationInitializationError(`Failed to initialize auth runtime: ${err.message}`, { error: err })
    }
  }

  async shutdown() {
    if (!this.#initialized) return

    try {
      await this.#engine.shutdown()
      await this.#engine.dispose()
      this.#registry.updateStatus('default', 'stopped')
      this.#initialized = false
      this.#emit(AUTH_RUNTIME_EVENTS.RUNTIME_AUTH_SHUTDOWN, { timestamp: Date.now() })
    } catch (err) {
      this.#emit(AUTH_RUNTIME_EVENTS.RUNTIME_AUTH_ERROR, { error: err.message })
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
    return this.#engine?.supports(feature) ?? false
  }

  registerProvider(name, ProviderClass, config = {}) {
    this.#registry.register(name, {
      version: config.version || '1.0.0',
      provider: name,
      features: config.features || [],
      priority: config.priority || 0,
    })
    this.#engine.registerProvider(name, ProviderClass, config)
    this.#emit(AUTH_RUNTIME_EVENTS.RUNTIME_AUTH_REGISTERED, { provider: name, version: config.version || '1.0.0' })
  }

  setAuthorizationContext(ctx) {
    this.#context?.setAuthorizationContext(ctx)
  }

  setContracts(contracts) {
    this.#engine.setContracts(contracts)
  }

  #emit(event, data) {
    if (this.#eventBus) {
      this.#eventBus.emit(event, createAuthRuntimeEvent(event, data))
    }
  }
}

export default AuthRuntimeIntegration
