import { BaseRuntimeContract } from '../../contracts/base.runtime.js'

export class AnonymousRuntime extends BaseRuntimeContract {
  constructor(config = {}) {
    super(config)
    this.name = 'anonymous'
  }

  async createGuest(fingerprint) {
    return null
  }

  async upgrade(anonymousId, credentials) {
    return null
  }

  async merge(anonymousId, identityId) {}

  async destroy(anonymousId) {}

  supports(feature) {
    const features = ['create-guest', 'upgrade', 'merge', 'destroy', 'fingerprint', 'persistence', 'limited-access']
    return features.includes(feature)
  }
}

export default AnonymousRuntime
