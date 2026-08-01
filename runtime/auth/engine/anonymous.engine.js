import { AUTH_ENGINE_EVENTS, createAuthEngineEvent } from './auth.engine.events.js'
import { AnonymousError } from './auth.engine.errors.js'

export class AnonymousEngine {
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

  async createGuest(fingerprint) {
    if (!this.#contract) throw new AnonymousError('Anonymous contract not available', { operation: 'createGuest' })
    const result = await this.#contract.createGuest(fingerprint)
    this.#emit(AUTH_ENGINE_EVENTS.AUTH_ANONYMOUS_CREATED, { anonymousId: result?.id })
    return result
  }

  #emit(event, data) {
    if (this.#eventBus) {
      this.#eventBus.emit(event, createAuthEngineEvent(event, data))
    }
  }

  async upgrade(anonymousId, credentials) {
    if (!this.#contract) throw new AnonymousError('Anonymous contract not available', { operation: 'upgrade' })
    const result = await this.#contract.upgrade(anonymousId, credentials)
    this.#emit(AUTH_ENGINE_EVENTS.AUTH_ANONYMOUS_UPGRADED, { anonymousId, identityId: result?.id })
    return result
  }

  async merge(anonymousId, identityId) {
    if (!this.#contract) throw new AnonymousError('Anonymous contract not available', { operation: 'merge' })
    await this.#contract.merge(anonymousId, identityId)
  }

  async destroy(anonymousId) {
    if (!this.#contract) throw new AnonymousError('Anonymous contract not available', { operation: 'destroy' })
    await this.#contract.destroy(anonymousId)
  }
}

export default AnonymousEngine
