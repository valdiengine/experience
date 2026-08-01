import { BaseRuntimeContract } from '../../contracts/base.runtime.js'

export class IdentityRuntime extends BaseRuntimeContract {
  constructor(config = {}) {
    super(config)
    this.name = 'identity'
  }

  async find(query) {
    return []
  }

  async findById(identityId) {
    return null
  }

  async findByEmail(email) {
    return null
  }

  async create(attributes) {
    return null
  }

  async update(identityId, attributes) {
    return null
  }

  async delete(identityId) {}

  async verify(identityId, method) {
    return false
  }

  async changeTrust(identityId, delta) {
    return null
  }

  supports(feature) {
    const features = ['find', 'findById', 'findByEmail', 'create', 'update', 'delete', 'verify', 'trust', 'merge', 'anonymize']
    return features.includes(feature)
  }
}

export default IdentityRuntime
