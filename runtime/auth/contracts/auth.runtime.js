import { BaseRuntimeContract } from '../../contracts/base.runtime.js'

export class AuthRuntime extends BaseRuntimeContract {
  constructor(config = {}) {
    super(config)
    this.name = 'auth'
  }

  async authenticate(token) {
    return null
  }

  async logout(session) {}

  async refresh(token) {
    return null
  }

  async validate(session) {
    return false
  }

  async revoke(session) {}

  async currentIdentity() {
    return null
  }

  async currentSession() {
    return null
  }

  supports(feature) {
    const features = ['authenticate', 'logout', 'refresh', 'validate', 'revoke', 'session', 'identity', 'token']
    return features.includes(feature)
  }
}

export default AuthRuntime
