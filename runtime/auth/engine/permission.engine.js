import { AUTH_ENGINE_EVENTS, createAuthEngineEvent } from './auth.engine.events.js'
import { EnginePermissionDeniedError } from './auth.engine.errors.js'

export class PermissionEngine {
  #contract = null
  #eventBus = null
  #initialized = false

  constructor(options = {}) {
    this.#contract = options.contract || null
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

  async grant(identityId, permission) {
    if (!this.#contract) throw new EnginePermissionDeniedError('Permission contract not available', { operation: 'grant' })
    await this.#contract.grant(identityId, permission)
    this.#emit(AUTH_ENGINE_EVENTS.AUTH_PERMISSION_GRANTED, { identityId, permission })
  }

  async revoke(identityId, permission) {
    if (!this.#contract) throw new EnginePermissionDeniedError('Permission contract not available', { operation: 'revoke' })
    await this.#contract.revoke(identityId, permission)
    this.#emit(AUTH_ENGINE_EVENTS.AUTH_PERMISSION_REVOKED, { identityId, permission })
  }

  async list(identityId) {
    if (!this.#contract) throw new EnginePermissionDeniedError('Permission contract not available', { operation: 'list' })
    return this.#contract.list(identityId)
  }

  async has(identityId, permission) {
    if (!this.#contract) throw new EnginePermissionDeniedError('Permission contract not available', { operation: 'has' })
    return this.#contract.has(identityId, permission)
  }

  #emit(event, data) {
    if (this.#eventBus) this.#eventBus.emit(event, createAuthEngineEvent(event, data))
  }
}

export default PermissionEngine
