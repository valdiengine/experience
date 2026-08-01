import { AUTH_ENGINE_EVENTS, createAuthEngineEvent } from './auth.engine.events.js'
import { TrustError } from './auth.engine.errors.js'

export class TrustEngine {
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

  async calculate(identityId) {
    if (!this.#contract) throw new TrustError('Trust contract not available', { operation: 'calculate' })
    return this.#contract.calculate(identityId)
  }

  async increase(identityId, amount, reason) {
    if (!this.#contract) throw new TrustError('Trust contract not available', { operation: 'increase' })
    const result = await this.#contract.increase(identityId, amount, reason)
    this.#emit(AUTH_ENGINE_EVENTS.AUTH_TRUST_CHANGED, { identityId, delta: amount, reason, direction: 'increase' })
    return result
  }

  async decrease(identityId, amount, reason) {
    if (!this.#contract) throw new TrustError('Trust contract not available', { operation: 'decrease' })
    const result = await this.#contract.decrease(identityId, amount, reason)
    this.#emit(AUTH_ENGINE_EVENTS.AUTH_TRUST_CHANGED, { identityId, delta: amount, reason, direction: 'decrease' })
    return result
  }

  async evaluate(identityId, minimumLevel) {
    if (!this.#contract) throw new TrustError('Trust contract not available', { operation: 'evaluate' })
    return this.#contract.evaluate(identityId, minimumLevel)
  }

  async history(identityId) {
    if (!this.#contract) throw new TrustError('Trust contract not available', { operation: 'history' })
    return this.#contract.history(identityId)
  }

  #emit(event, data) {
    if (this.#eventBus) this.#eventBus.emit(event, createAuthEngineEvent(event, data))
  }
}

export default TrustEngine
