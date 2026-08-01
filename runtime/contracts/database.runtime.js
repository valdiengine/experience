import { BaseRuntimeContract } from './base.runtime.js'

export class DatabaseRuntime extends BaseRuntimeContract {
  constructor(config = {}) {
    super(config)
    this.name = 'database'
  }

  async initialize() {
    await super.initialize()
    this._available = true
  }

  get repositories() {
    return null
  }

  get transactionManager() {
    return null
  }

  supports(feature) {
    const features = ['transaction', 'savepoint', 'migration', 'rollback', 'aggregate', 'search', 'pagination']
    return features.includes(feature)
  }
}

export default DatabaseRuntime
