import { BaseRuntimeContract } from '../../contracts/base.runtime.js'

export class TokenRuntime extends BaseRuntimeContract {
  constructor(config = {}) {
    super(config)
    this.name = 'token'
  }

  async issue(payload, options) {
    return null
  }

  async validate(token) {
    return false
  }

  async refresh(token) {
    return null
  }

  async revoke(token) {}

  async decode(token) {
    return null
  }

  async verify(token, options) {
    return false
  }

  supports(feature) {
    const features = ['issue', 'validate', 'refresh', 'revoke', 'decode', 'verify', 'access-token', 'refresh-token', 'rotation', 'family-tracking']
    return features.includes(feature)
  }
}

export default TokenRuntime
