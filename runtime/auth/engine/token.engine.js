import { TokenError } from './auth.engine.errors.js'

export class TokenEngine {
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

  async issue(payload, options = {}) {
    if (!this.#contract) throw new TokenError('Token contract not available', { operation: 'issue' })
    return this.#contract.issue(payload, options)
  }

  async validate(token) {
    if (!this.#contract) throw new TokenError('Token contract not available', { operation: 'validate' })
    return this.#contract.validate(token)
  }

  async refresh(token) {
    if (!this.#contract) throw new TokenError('Token contract not available', { operation: 'refresh' })
    return this.#contract.refresh(token)
  }

  async revoke(token) {
    if (!this.#contract) throw new TokenError('Token contract not available', { operation: 'revoke' })
    await this.#contract.revoke(token)
  }

  async decode(token) {
    if (!this.#contract) throw new TokenError('Token contract not available', { operation: 'decode' })
    return this.#contract.decode(token)
  }

  async verify(token, options = {}) {
    if (!this.#contract) throw new TokenError('Token contract not available', { operation: 'verify' })
    return this.#contract.verify(token, options)
  }
}

export default TokenEngine
