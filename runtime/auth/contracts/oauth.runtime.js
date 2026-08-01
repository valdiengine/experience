import { BaseRuntimeContract } from '../../contracts/base.runtime.js'

export class OAuthRuntime extends BaseRuntimeContract {
  constructor(config = {}) {
    super(config)
    this.name = 'oauth'
  }

  async redirect(provider, options) {
    return null
  }

  async callback(code, state, options) {
    return null
  }

  async exchangeCode(code, options) {
    return null
  }

  async refresh(token) {
    return null
  }

  async disconnect(provider, identityId) {}

  supports(feature) {
    const features = ['authorization-code', 'pkce', 'client-credentials', 'refresh-token', 'implicit', 'state', 'scope']
    return features.includes(feature)
  }
}

export default OAuthRuntime
