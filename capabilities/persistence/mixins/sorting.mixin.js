export const SortingMixin = (Base) => class extends Base {
  #applySorting(query, sort = {}) {
    if (!sort || typeof sort !== 'object') return query
    return { ...query, sort }
  }
}
