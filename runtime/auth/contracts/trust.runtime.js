import { BaseRuntimeContract } from '../../contracts/base.runtime.js'

export class TrustRuntime extends BaseRuntimeContract {
  constructor(config = {}) {
    super(config)
    this.name = 'trust'
  }

  async calculate(identityId) {
    return { level: 0, factors: [], expiresAt: null }
  }

  async increase(identityId, amount, reason) {
    return null
  }

  async decrease(identityId, amount, reason) {
    return null
  }

  async evaluate(identityId, minimumLevel) {
    return false
  }

  async history(identityId) {
    return []
  }

  supports(feature) {
    const features = ['calculate', 'increase', 'decrease', 'evaluate', 'history', 'decay', 'threshold', 'recovery']
    return features.includes(feature)
  }
}

export default TrustRuntime
