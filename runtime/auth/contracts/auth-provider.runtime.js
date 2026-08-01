import { BaseRuntimeContract } from '../../contracts/base.runtime.js'

export class AuthProviderRuntime extends BaseRuntimeContract {
  constructor(config = {}) {
    super(config)
    this.name = 'auth-provider'
  }

  async login(credentials) {
    return null
  }

  async logout(session) {}

  async refresh(token) {
    return null
  }

  async userinfo(accessToken) {
    return null
  }

  async jwks() {
    return null
  }

  async health() {
    return { status: 'unknown', provider: this.name, timestamp: Date.now() }
  }

  supports(feature) {
    const features = ['login', 'logout', 'refresh', 'userinfo', 'jwks', 'social', 'enterprise', 'custom']
    return features.includes(feature)
  }
}

export default AuthProviderRuntime
