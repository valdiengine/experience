import { BaseRuntimeContract } from '../../contracts/base.runtime.js'

export class AuditRuntime extends BaseRuntimeContract {
  constructor(config = {}) {
    super(config)
    this.name = 'audit'
  }

  async record(event, data) {
    return null
  }

  async query(filters) {
    return []
  }

  async export(options) {
    return null
  }

  async purge(before) {}

  supports(feature) {
    const features = ['record', 'query', 'export', 'purge', 'realtime', 'replay', 'integrity', 'retention']
    return features.includes(feature)
  }
}

export default AuditRuntime
