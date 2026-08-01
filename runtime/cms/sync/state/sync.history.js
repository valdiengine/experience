export class SyncHistory {
  #entries = []
  #maxEntries = 10000

  constructor(options = {}) {
    this.#maxEntries = options.maxEntries || 10000
    this.#entries = []
  }

  record(entry) {
    const record = {
      id: this.#generateId(),
      entityType: entry.entityType,
      entityId: entry.entityId,
      provider: entry.provider,
      direction: entry.direction,
      operation: entry.operation,
      status: entry.status,
      changes: entry.changes || [],
      conflictId: entry.conflictId || null,
      error: entry.error || null,
      tenantId: entry.tenantId || null,
      destinationId: entry.destinationId || null,
      triggeredBy: entry.triggeredBy || 'system',
      jobId: entry.jobId || null,
      timestamp: Date.now(),
      duration: entry.duration || 0,
    }

    this.#entries.unshift(record)

    if (this.#entries.length > this.#maxEntries) {
      this.#entries = this.#entries.slice(0, this.#maxEntries)
    }

    return record
  }

  query(filters = {}) {
    let results = [...this.#entries]

    if (filters.entityType) {
      results = results.filter(e => e.entityType === filters.entityType)
    }
    if (filters.entityId) {
      results = results.filter(e => e.entityId === filters.entityId)
    }
    if (filters.provider) {
      results = results.filter(e => e.provider === filters.provider)
    }
    if (filters.direction) {
      results = results.filter(e => e.direction === filters.direction)
    }
    if (filters.status) {
      results = results.filter(e => e.status === filters.status)
    }
    if (filters.tenantId) {
      results = results.filter(e => e.tenantId === filters.tenantId)
    }
    if (filters.jobId) {
      results = results.filter(e => e.jobId === filters.jobId)
    }
    if (filters.since) {
      results = results.filter(e => e.timestamp >= filters.since)
    }
    if (filters.until) {
      results = results.filter(e => e.timestamp <= filters.until)
    }

    const offset = filters.offset || 0
    const limit = filters.limit || 50
    return results.slice(offset, offset + limit)
  }

  getByEntity(entityType, entityId) {
    return this.query({ entityType, entityId })
  }

  getByJob(jobId) {
    return this.query({ jobId })
  }

  getByTenant(tenantId) {
    return this.query({ tenantId })
  }

  getConflicts() {
    return this.#entries.filter(e => e.conflictId !== null)
  }

  getFailed() {
    return this.#entries.filter(e => e.status === 'failed')
  }

  getRecent(count = 10) {
    return this.#entries.slice(0, count)
  }

  count() {
    return this.#entries.length
  }

  clear() {
    this.#entries = []
  }

  toJSON() {
    return this.#entries
  }

  #generateId() {
    return `sync_hist_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
  }
}

export default SyncHistory
