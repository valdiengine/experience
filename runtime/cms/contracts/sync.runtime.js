import { BaseRuntimeContract } from '../../contracts/base.runtime.js'

export class CmsSyncRuntime extends BaseRuntimeContract {
  constructor(config = {}) {
    super(config)
    this.name = 'cms-sync'
  }

  async trigger(entityType, direction, options) {
    return null
  }

  async status(jobId) {
    return { jobId, status: 'unknown', progress: 0, startedAt: null, completedAt: null }
  }

  async history(filters) {
    return { jobs: [], total: 0 }
  }

  async pull(entityType, options) {
    return { items: [], checkpoint: null }
  }

  async push(entityType, items) {
    return { synced: 0, conflicts: [], failed: [] }
  }

  async resolveConflict(conflictId, resolution) {
    return null
  }

  async getConflicts(entityType, entityId) {
    return []
  }

  async cancel(jobId) {}

  async retry(jobId) {}

  supports(feature) {
    const features = ['trigger', 'status', 'history', 'pull', 'push', 'conflict-resolution', 'cancel', 'retry', 'scheduled', 'webhook-triggered']
    return features.includes(feature)
  }
}

export default CmsSyncRuntime
