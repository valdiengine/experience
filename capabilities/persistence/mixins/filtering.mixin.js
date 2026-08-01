export const FilteringMixin = (Base) => class extends Base {
  #applyFilters(query, filters = {}) {
    if (!filters || typeof filters !== 'object') return query
    return Object.entries(filters).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== null) {
        acc[key] = value
      }
      return acc
    }, { ...query })
  }
}
