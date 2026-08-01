export const SyncStatus = Object.freeze({
  PENDING: 'pending',
  RUNNING: 'running',
  SYNCED: 'synced',
  FAILED: 'failed',
  CONFLICT: 'conflict',
  DISABLED: 'disabled',
  SKIPPED: 'skipped',
})

export class SyncState {
  #entries = new Map()

  constructor() {
    this.#entries = new Map()
  }

  get(entityType, entityId) {
    const key = this.#key(entityType, entityId)
    return this.#entries.get(key) || null
  }

  set(entityType, entityId, data = {}) {
    const key = this.#key(entityType, entityId)
    const existing = this.#entries.get(key)

    this.#entries.set(key, {
      entityType,
      entityId,
      externalId: data.externalId || existing?.externalId || null,
      provider: data.provider || existing?.provider || null,
      lastSync: data.lastSync || existing?.lastSync || null,
      checksum: data.checksum || existing?.checksum || null,
      version: data.version || existing?.version || 0,
      status: data.status || existing?.status || SyncStatus.PENDING,
      errors: data.errors || existing?.errors || [],
      retryCount: data.retryCount ?? existing?.retryCount ?? 0,
      updatedAt: Date.now(),
      createdAt: existing?.createdAt || Date.now(),
    })

    return this.#entries.get(key)
  }

  updateStatus(entityType, entityId, status) {
    const entry = this.get(entityType, entityId)
    if (!entry) return null
    entry.status = status
    entry.updatedAt = Date.now()
    return entry
  }

  updateChecksum(entityType, entityId, checksum) {
    const entry = this.get(entityType, entityId)
    if (!entry) return null
    entry.checksum = checksum
    entry.updatedAt = Date.now()
    return entry
  }

  markSynced(entityType, entityId, externalId, checksum) {
    const entry = this.get(entityType, entityId)
    if (!entry) {
      return this.set(entityType, entityId, {
        externalId,
        checksum,
        status: SyncStatus.SYNCED,
        lastSync: Date.now(),
      })
    }
    entry.externalId = externalId || entry.externalId
    entry.checksum = checksum || entry.checksum
    entry.status = SyncStatus.SYNCED
    entry.lastSync = Date.now()
    entry.retryCount = 0
    entry.errors = []
    entry.updatedAt = Date.now()
    return entry
  }

  markFailed(entityType, entityId, error) {
    const entry = this.get(entityType, entityId)
    if (!entry) return null
    entry.status = SyncStatus.FAILED
    entry.errors = [...(entry.errors || []), { message: error, timestamp: Date.now() }]
    entry.retryCount = (entry.retryCount || 0) + 1
    entry.updatedAt = Date.now()
    return entry
  }

  markConflict(entityType, entityId, details = {}) {
    const entry = this.get(entityType, entityId)
    if (!entry) return null
    entry.status = SyncStatus.CONFLICT
    entry.conflictDetails = details
    entry.updatedAt = Date.now()
    return entry
  }

  getByStatus(status) {
    const results = []
    for (const entry of this.#entries.values()) {
      if (entry.status === status) results.push(entry)
    }
    return results
  }

  getByEntityType(entityType) {
    const results = []
    for (const entry of this.#entries.values()) {
      if (entry.entityType === entityType) results.push(entry)
    }
    return results
  }

  list() {
    return Array.from(this.#entries.values())
  }

  count() {
    return this.#entries.size
  }

  countByStatus(status) {
    return this.getByStatus(status).length
  }

  exists(entityType, entityId) {
    return this.#entries.has(this.#key(entityType, entityId))
  }

  remove(entityType, entityId) {
    return this.#entries.delete(this.#key(entityType, entityId))
  }

  clear() {
    this.#entries.clear()
  }

  toJSON() {
    return Array.from(this.#entries.entries()).map(([key, entry]) => ({ key, ...entry }))
  }

  #key(entityType, entityId) {
    return `${entityType}:${entityId}`
  }
}

export default SyncState
