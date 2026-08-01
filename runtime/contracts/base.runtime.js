import { RuntimeFeatureUnavailableError } from '../runtime.errors.js'

export class BaseRuntimeContract {
  constructor(config = {}) {
    if (new.target === BaseRuntimeContract) {
      throw new Error('BaseRuntimeContract is abstract — extend it')
    }
    this.config = config
    this.initialized = false
    this.provider = null
    this.fallback = null
    this._available = false
  }

  async register() {
    throw new RuntimeFeatureUnavailableError('register is not implemented', { contract: this.constructor.name })
  }

  async initialize() {
    this.initialized = true
  }

  async health() {
    return {
      status: this.initialized ? 'healthy' : 'unknown',
      initialized: this.initialized,
      available: this._available,
      provider: this.provider?.name || null,
    }
  }

  available() {
    return this._available
  }

  async shutdown() {
    this.initialized = false
    this._available = false
  }

  async dispose() {
    this.provider = null
    this.fallback = null
    this.initialized = false
    this._available = false
  }

  supports(feature) {
    return false
  }

  setProvider(provider) {
    this.provider = provider
  }

  setFallback(fallback) {
    this.fallback = fallback
  }

  setEventBus(eventBus) {
    this.eventBus = eventBus
  }
}

export default BaseRuntimeContract
