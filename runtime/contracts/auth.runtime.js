import { BaseRuntimeContract } from './base.runtime.js'

export class AuthRuntime extends BaseRuntimeContract {
  constructor(config = {}) {
    super(config)
    this.name = 'auth'
  }

  async authenticate(token) {
    return null
  }

  async authorize(user, action, resource) {
    return false
  }

  async login(credentials) {
    return null
  }

  async logout(session) {}

  async refreshToken(token) {
    return null
  }

  async validateToken(token) {
    return false
  }

  async getUser(session) {
    return null
  }

  supports(feature) {
    const features = ['jwt', 'oauth', 'magic-link', 'api-key', 'session', 'rbac', 'mfa', 'passwordless']
    return features.includes(feature)
  }
}

export default AuthRuntime
