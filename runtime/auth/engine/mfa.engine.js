import { AUTH_ENGINE_EVENTS, createAuthEngineEvent } from './auth.engine.events.js'
import { MFAError } from './auth.engine.errors.js'

export class MfaEngine {
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

  async enable(identityId, method) {
    if (!this.#contract) throw new MFAError('MFA contract not available', { operation: 'enable' })
    const result = await this.#contract.enable(identityId, method)
    this.#emit(AUTH_ENGINE_EVENTS.AUTH_MFA_ENABLED, { identityId, method })
    return result
  }

  async disable(identityId, method) {
    if (!this.#contract) throw new MFAError('MFA contract not available', { operation: 'disable' })
    await this.#contract.disable(identityId, method)
    this.#emit(AUTH_ENGINE_EVENTS.AUTH_MFA_DISABLED, { identityId, method })
  }

  async challenge(identityId, method) {
    if (!this.#contract) throw new MFAError('MFA contract not available', { operation: 'challenge' })
    return this.#contract.challenge(identityId, method)
  }

  async verify(identityId, method, code) {
    if (!this.#contract) throw new MFAError('MFA contract not available', { operation: 'verify' })
    return this.#contract.verify(identityId, method, code)
  }

  async backupCodes(identityId) {
    if (!this.#contract) throw new MFAError('MFA contract not available', { operation: 'backupCodes' })
    return this.#contract.backupCodes(identityId)
  }

  #emit(event, data) {
    if (this.#eventBus) this.#eventBus.emit(event, createAuthEngineEvent(event, data))
  }
}

export default MfaEngine
