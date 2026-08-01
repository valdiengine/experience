export const PaginationMixin = (Base) => class extends Base {
  async paginate(query = {}, page = 1, size = 50, options = {}) {
    const q = this.#buildQuery ? this.#buildQuery(query) : this._buildQuery?.(query) || query
    return this.adapter.paginate(q, page, size, options)
  }
  async cursor(query = {}, cursor, limit = 50, options = {}) {
    const q = this.#buildQuery ? this.#buildQuery(query) : this._buildQuery?.(query) || query
    return this.adapter.find(q, { ...options, cursor, limit })
  }
}
