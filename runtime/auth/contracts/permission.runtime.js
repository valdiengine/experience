import { BaseRuntimeContract } from '../../contracts/base.runtime.js'

export class PermissionRuntime extends BaseRuntimeContract {
  constructor(config = {}) {
    super(config)
    this.name = 'permission'
  }

  async grant(identityId, permission) {}

  async revoke(identityId, permission) {}

  async list(identityId) {
    return []
  }

  async has(identityId, permission) {
    return false
  }

  supports(feature) {
    const features = ['grant', 'revoke', 'list', 'has', 'bulk', 'condition', 'expiration', 'audit']
    return features.includes(feature)
  }
}

export default PermissionRuntime
