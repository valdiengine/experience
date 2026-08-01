import { BaseRuntimeContract } from '../../contracts/base.runtime.js'

export class SessionRuntime extends BaseRuntimeContract {
  constructor(config = {}) {
    super(config)
    this.name = 'session'
  }

  async createSession(identityId, options) {
    return null
  }

  async destroySession(sessionId) {}

  async restoreSession(token) {
    return null
  }

  async rotate(sessionId) {
    return null
  }

  async extend(sessionId, ttl) {}

  async list(identityId) {
    return []
  }

  async terminate(sessionId) {}

  supports(feature) {
    const features = ['create', 'destroy', 'restore', 'rotate', 'extend', 'list', 'terminate', 'remember-me', 'concurrent']
    return features.includes(feature)
  }
}

export default SessionRuntime
