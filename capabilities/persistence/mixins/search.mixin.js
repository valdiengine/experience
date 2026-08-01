export const SearchMixin = (Base) => class extends Base {
  async search(text, options = {}) {
    if (!this.constructor.searchable) {
      throw new Error(`Repository ${this.constructor.entityName} does not support search`)
    }
    return this.adapter.search(text, options)
  }
}
