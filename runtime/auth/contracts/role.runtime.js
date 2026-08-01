import { BaseRuntimeContract } from '../../contracts/base.runtime.js'

export class RoleRuntime extends BaseRuntimeContract {
  constructor(config = {}) {
    super(config)
    this.name = 'role'
  }

  async assign(identityId, roleId) {}

  async remove(identityId, roleId) {}

  async list(identityId) {
    return []
  }

  async inherit(roleId) {
    return []
  }

  supports(feature) {
    const features = ['assign', 'remove', 'list', 'inherit', 'hierarchy', 'scope', 'composite', 'default']
    return features.includes(feature)
  }
}

export default RoleRuntime
