import { BaseRuntimeContract } from './base.runtime.js'

export class SyncRuntime extends BaseRuntimeContract {
  constructor(config = {}) {
    super(config)
    this.name = 'sync'
  }

  async push(changes) {
    return { synced: [], conflicts: [] }
  }

  async pull(since) {
    return { changes: [], checkpoint: null }
  }

  async resolveConflict(conflict, resolution) {
    return null
  }

  async getConflicts(entity, id) {
    return []
  }

  async registerEntity(entity, config) {}

  async getCheckpoint() {
    return null
  }

  async fullSync() {
    return { pushed: 0, pulled: 0, conflicts: 0 }
  }

  supports(feature) {
    const features = ['push', 'pull', 'conflict-resolution', 'background-sync', 'offline-queue', 'delta', 'checkpoint']
    return features.includes(feature)
  }
}

export default SyncRuntime
