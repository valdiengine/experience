import { BaseRuntimeContract } from '../../contracts/base.runtime.js'

export class AuthorizationRuntime extends BaseRuntimeContract {
  constructor(config = {}) {
    super(config)
    this.name = 'authorization'
  }

  async authorize(identity, action, resource) {
    return false
  }

  async can(identity, action, resource) {
    return false
  }

  async cannot(identity, action, resource) {
    return true
  }

  async evaluatePolicy(identity, policy) {
    return { allowed: false, reasons: [] }
  }

  async evaluateScope(identity, scope) {
    return false
  }

  supports(feature) {
    const features = ['rbac', 'abac', 'scope', 'policy', 'claim', 'delegation', 'temporary', 'hierarchy']
    return features.includes(feature)
  }
}

export default AuthorizationRuntime
