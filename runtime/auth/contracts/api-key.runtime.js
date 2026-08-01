import { BaseRuntimeContract } from '../../contracts/base.runtime.js'

export class ApiKeyRuntime extends BaseRuntimeContract {
  constructor(config = {}) {
    super(config)
    this.name = 'api-key'
  }

  async create(identityId, options) {
    return null
  }

  async rotate(keyId) {
    return null
  }

  async revoke(keyId) {}

  async validate(key) {
    return false
  }

  async list(identityId) {
    return []
  }

  supports(feature) {
    const features = ['create', 'rotate', 'revoke', 'validate', 'list', 'scope', 'expiration', 'rate-limit']
    return features.includes(feature)
  }
}

export default ApiKeyRuntime
