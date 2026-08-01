import { AUDIT_EVENTS, createAuditEvent } from './audit.events.js'

const MAX_RECORDS = 50000

export class AuthorizationAudit {
  #records = []
  #eventBus = null
  #config = {}

  constructor(config = {}) {
    this.#config = {
      maxRecords: config.maxAuditRecords || MAX_RECORDS,
      enabled: config.auditEnabled !== false,
      ...config,
    }
  }

  setEventBus(eventBus) {
    this.#eventBus = eventBus
  }

  record(decision) {
    if (!this.#config.enabled) return

    const entry = {
      id: this.#generateId(),
      identityId: decision.identityId || null,
      action: decision.action || null,
      resource: decision.resource || null,
      allowed: decision.allowed,
      reason: decision.reason || null,
      policy: decision.policy || null,
      context: decision.context || {},
      cached: decision.cached || false,
      timestamp: new Date().toISOString(),
    }

    this.#records.push(entry)

    if (this.#records.length > this.#config.maxRecords) {
      this.#records = this.#records.slice(-Math.floor(this.#config.maxRecords / 2))
    }

    this.#emit(AUDIT_EVENTS.AUDIT_RECORDED, { id: entry.id, identityId: entry.identityId, action: entry.action, allowed: entry.allowed, reason: entry.reason })

    return entry
  }

  query(filters = {}) {
    let results = [...this.#records]
    if (filters.identityId) results = results.filter(r => r.identityId === filters.identityId)
    if (filters.action) results = results.filter(r => r.action === filters.action)
    if (filters.resource) results = results.filter(r => r.resource === filters.resource)
    if (filters.allowed !== undefined) results = results.filter(r => r.allowed === filters.allowed)
    if (filters.reason) results = results.filter(r => r.reason === filters.reason)
    if (filters.policy) results = results.filter(r => r.policy === filters.policy)
    if (filters.since) results = results.filter(r => new Date(r.timestamp) >= new Date(filters.since))
    if (filters.until) results = results.filter(r => new Date(r.timestamp) <= new Date(filters.until))
    if (filters.cached !== undefined) results = results.filter(r => r.cached === filters.cached)
    if (filters.limit) results = results.slice(0, filters.limit)
    return results
  }

  export() {
    return { records: this.#records, total: this.#records.length, exportedAt: new Date().toISOString() }
  }

  purge(before) {
    const cutoff = new Date(before).getTime()
    const beforeCount = this.#records.length
    this.#records = this.#records.filter(r => new Date(r.timestamp).getTime() >= cutoff)
    return beforeCount - this.#records.length
  }

  getStats() {
    const total = this.#records.length
    const allowed = this.#records.filter(r => r.allowed).length
    const denied = this.#records.filter(r => !r.allowed).length
    return { total, allowed, denied, maxRecords: this.#config.maxRecords }
  }

  async health() {
    return {
      status: 'healthy',
      totalRecords: this.#records.length,
      maxRecords: this.#config.maxRecords,
      enabled: this.#config.enabled,
      timestamp: Date.now(),
    }
  }

  available() { return true }

  supports(feature) {
    const features = ['record', 'query', 'export', 'purge', 'stats', 'identity-filter', 'action-filter', 'resource-filter', 'allowed-filter', 'time-range']
    return features.includes(feature)
  }

  #generateId() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
    let id = 'aud_'
    for (let i = 0; i < 24; i++) id += chars.charAt(Math.floor(Math.random() * chars.length))
    return id
  }

  #emit(event, data) {
    if (this.#eventBus) {
      this.#eventBus.emit(event, createAuditEvent(event, data))
    }
  }
}

export default AuthorizationAudit
