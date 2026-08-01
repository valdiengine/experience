export class SyncContext {
  #engine = null
  #config = {}

  constructor(engine, config = {}) {
    this.#engine = engine
    this.#config = config
  }

  async trigger(entityType, direction, options = {}) {
    return this.#engine?.trigger(entityType, direction, options) || null
  }

  async status(jobId) {
    return this.#engine?.status(jobId) || { jobId, status: 'unknown' }
  }

  async history(filters = {}) {
    return this.#engine?.history(filters) || { jobs: [], total: 0 }
  }

  async cancel(jobId) {
    return this.#engine?.cancel(jobId) || false
  }

  async retry(jobId) {
    return this.#engine?.retry(jobId) || false
  }

  async pause(entityType) {
    return this.#engine?.pause(entityType) || false
  }

  async resume(entityType) {
    return this.#engine?.resume(entityType) || false
  }

  getConflicts(options = {}) {
    return this.#engine?.getConflicts(options) || []
  }

  async resolveConflict(conflictId, resolution) {
    return this.#engine?.resolveConflict(conflictId, resolution) || null
  }

  getState(entityType, entityId) {
    return this.#engine?.getState(entityType, entityId) || null
  }

  getStatus() {
    return this.#engine?.getStatus() || { running: false }
  }

  available() {
    return this.#engine?.available() || false
  }

  supports(feature) {
    return this.#engine?.supports(feature) || false
  }
}

export default SyncContext
