import { BaseRuntimeContract } from '../../contracts/base.runtime.js'

export class OidcRuntime extends BaseRuntimeContract {
  constructor(config = {}) {
    super(config)
    this.name = 'oidc'
  }

  async discover(provider) {
    return null
  }

  async authorize(options) {
    return null
  }

  async userinfo(accessToken) {
    return null
  }

  async jwks() {
    return null
  }

  async logout(idTokenHint) {}

  supports(feature) {
    const features = ['discover', 'authorize', 'userinfo', 'jwks', 'logout', 'id-token', 'claims', 'session-management']
    return features.includes(feature)
  }
}

export default OidcRuntime
