import { AUTH_ENGINE_EVENTS, createAuthEngineEvent } from './auth.engine.events.js'
import { EngineAuthorizationError } from './auth.engine.errors.js'

export class AuthorizationEngine {
  #contract = null
  #permissionEngine = null
  #roleEngine = null
  #eventBus = null
  #initialized = false

  constructor(options = {}) {
    this.#contract = options.contract || null
    this.#permissionEngine = options.permissionEngine || null
    this.#roleEngine = options.roleEngine || null
    this.#eventBus = options.eventBus || null
  }

  setContract(contract) {
    this.#contract = contract
  }

  setEventBus(eventBus) {
    this.#eventBus = eventBus
  }

  async initialize() {
    this.#initialized = true
  }

  async shutdown() {
    this.#initialized = false
  }

  async dispose() {
    this.#contract = null
    this.#initialized = false
  }

  async health() {
    return { status: this.#initialized ? 'healthy' : 'unknown', initialized: this.#initialized }
  }

  available() {
    return this.#initialized && !!this.#contract
  }

  supports(feature) {
    return this.#contract?.supports?.(feature) ?? false
  }

  async authorize(identity, action, resource) {
    if (!this.#contract) throw new EngineAuthorizationError('Authorization contract not available', { operation: 'authorize' })
    const result = await this.#contract.authorize(identity, action, resource)
    if (!result) {
      this.#emit(AUTH_ENGINE_EVENTS.AUTH_UNAUTHORIZED, { identityId: identity?.id, action, resource })
    }
    return result
  }

  async can(identity, action, resource) {
    if (!this.#contract) throw new EngineAuthorizationError('Authorization contract not available', { operation: 'can' })
    return this.#contract.can(identity, action, resource)
  }

  async cannot(identity, action, resource) {
    if (!this.#contract) throw new EngineAuthorizationError('Authorization contract not available', { operation: 'cannot' })
    return this.#contract.cannot(identity, action, resource)
  }

  async evaluatePolicy(identity, policy) {
    if (!this.#contract) throw new EngineAuthorizationError('Authorization contract not available', { operation: 'evaluatePolicy' })
    return this.#contract.evaluatePolicy(identity, policy)
  }

  async evaluateScope(identity, scope) {
    if (!this.#contract) throw new EngineAuthorizationError('Authorization contract not available', { operation: 'evaluateScope' })
    return this.#contract.evaluateScope(identity, scope)
  }

  #emit(event, data) {
    if (this.#eventBus) this.#eventBus.emit(event, createAuthEngineEvent(event, data))
  }
}

export default AuthorizationEngine
