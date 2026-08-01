import { BaseRuntimeContract } from '../../contracts/base.runtime.js'

export class MfaRuntime extends BaseRuntimeContract {
  constructor(config = {}) {
    super(config)
    this.name = 'mfa'
  }

  async enable(identityId, method) {
    return null
  }

  async disable(identityId, method) {}

  async challenge(identityId, method) {
    return null
  }

  async verify(identityId, method, code) {
    return false
  }

  async backupCodes(identityId) {
    return []
  }

  supports(feature) {
    const features = ['totp', 'sms', 'email', 'push', 'biometric', 'backup-codes', 'recovery', 'remember-device']
    return features.includes(feature)
  }
}

export default MfaRuntime
