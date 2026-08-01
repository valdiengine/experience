import { BaseRuntimeContract } from '../../contracts/base.runtime.js'

export class DeviceRuntime extends BaseRuntimeContract {
  constructor(config = {}) {
    super(config)
    this.name = 'device'
  }

  async register(identityId, fingerprint) {
    return null
  }

  async verify(deviceId, challenge) {
    return false
  }

  async trust(deviceId, level) {}

  async revoke(deviceId) {}

  async list(identityId) {
    return []
  }

  supports(feature) {
    const features = ['register', 'verify', 'trust', 'revoke', 'list', 'fingerprint', 'biometric', 'push-token']
    return features.includes(feature)
  }
}

export default DeviceRuntime
