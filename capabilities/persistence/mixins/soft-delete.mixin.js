export const SoftDeleteMixin = (Base) => class extends Base {
  #applySoftDeleteFilter(query) {
    if (this.constructor.softDeletable && !query._includeDeleted) {
      return { ...query, deletedAt: null, _includeDeleted: undefined }
    }
    const { _includeDeleted, ...clean } = query
    return clean
  }
  async softDelete(query, options = {}) {
    this.#enforceNotDisposed?.() || this._enforceNotDisposed?.()
    this.#enforceInitialized?.() || this._enforceInitialized?.()
    this.#enforceWritable?.() || this._enforceWritable?.()
    const q = this.#buildQuery ? this.#buildQuery(query) : this._buildQuery ? this._buildQuery(query) : query
    const data = { deletedAt: new Date().toISOString(), deletedBy: this.context?.identity?.id || null }
    const result = await this.adapter.update(q, data, options)
    this._emit?.('repository:entity_deleted', { query: q, soft: true })
    return result
  }
  async restore(query, options = {}) {
    this.#enforceNotDisposed?.() || this._enforceNotDisposed?.()
    this.#enforceInitialized?.() || this._enforceInitialized?.()
    this.#enforceWritable?.() || this._enforceWritable?.()
    const q = this.#buildQuery ? this.#buildQuery({ ...query, _includeDeleted: true }) : this._buildQuery?.({ ...query, _includeDeleted: true })
    const data = { deletedAt: null, deletedBy: null }
    const result = await this.adapter.update(q, data, options)
    this._emit?.('repository:entity_restored', { query: q })
    return result
  }
  async archive(query, options = {}) {
    this.#enforceNotDisposed?.() || this._enforceNotDisposed?.()
    this.#enforceInitialized?.() || this._enforceInitialized?.()
    this.#enforceWritable?.() || this._enforceWritable?.()
    const q = this.#buildQuery ? this.#buildQuery(query) : this._buildQuery?.(query)
    const data = { archivedAt: new Date().toISOString(), archivedBy: this.context?.identity?.id || null }
    const result = await this.adapter.update(q, data, options)
    this._emit?.('repository:entity_archived', { query: q })
    return result
  }
  async purge(query, options = {}) {
    this.#enforceNotDisposed?.() || this._enforceNotDisposed?.()
    this.#enforceInitialized?.() || this._enforceInitialized?.()
    this.#enforceWritable?.() || this._enforceWritable?.()
    const q = this.#buildQuery ? this.#buildQuery(query) : this._buildQuery?.(query)
    const result = await this.adapter.delete(q, { ...options, force: true })
    this._emit?.('repository:entity_deleted', { query: q, purge: true })
    return result
  }
}
