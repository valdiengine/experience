export class RateLimitContract {
  constructor(config = {}) {
    this.name = 'rate-limit'
    this.config = config
    this.#initialized = false
  }

  #initialized = false

  get initialized() { return this.#initialized }

  async initialize() {
    this.#initialized = true
  }

  async check(key, options = {}) {
    throw new Error('RateLimitContract.check() not implemented — subclass must override')
  }

  async consume(key, options = {}) {
    throw new Error('RateLimitContract.consume() not implemented — subclass must override')
  }

  async reset(key) {
    throw new Error('RateLimitContract.reset() not implemented — subclass must override')
  }

  async remaining(key) {
    throw new Error('RateLimitContract.remaining() not implemented — subclass must override')
  }

  supports(feature) {
    const features = ['token-bucket', 'sliding-window', 'fixed-window', 'concurrent', 'per-user', 'per-ip', 'per-tenant']
    return features.includes(feature)
  }
}

export default RateLimitContract
