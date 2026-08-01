import { BaseRuntimeContract } from './base.runtime.js'

export class CacheRuntime extends BaseRuntimeContract {
  constructor(config = {}) {
    super(config)
    this.name = 'cache'
  }

  async get(key) {
    return null
  }

  async set(key, value, ttl) {}

  async delete(key) {}

  async clear() {}

  async has(key) {
    return false
  }

  async getMany(keys) {
    return []
  }

  async setMany(entries, ttl) {}

  async deleteMany(keys) {}

  async increment(key, delta) {
    return 0
  }

  async ttl(key) {
    return -1
  }

  supports(feature) {
    const features = ['ttl', 'tag', 'namespace', 'transaction', 'pubsub', 'persistence', 'replication']
    return features.includes(feature)
  }
}

export default CacheRuntime
