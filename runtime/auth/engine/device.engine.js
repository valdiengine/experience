import { DeviceError } from './auth.engine.errors.js'

export class DeviceEngine {
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

  async register(identityId, fingerprint) {
    if (!this.#contract) throw new DeviceError('Device contract not available', { operation: 'register' })
    return this.#contract.register(identityId, fingerprint)
  }

  async verify(deviceId, challenge) {
    if (!this.#contract) throw new DeviceError('Device contract not available', { operation: 'verify' })
    return this.#contract.verify(deviceId, challenge)
  }

  async trust(deviceId, level) {
    if (!this.#contract) throw new DeviceError('Device contract not available', { operation: 'trust' })
    await this.#contract.trust(deviceId, level)
  }

  async revoke(deviceId) {
    if (!this.#contract) throw new DeviceError('Device contract not available', { operation: 'revoke' })
    await this.#contract.revoke(deviceId)
  }

  async list(identityId) {
    if (!this.#contract) throw new DeviceError('Device contract not available', { operation: 'list' })
    return this.#contract.list(identityId)
  }
}

export default DeviceEngine
