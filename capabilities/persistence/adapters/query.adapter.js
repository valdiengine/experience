export class QueryAdapter {
  constructor(config = {}) {
    if (new.target === QueryAdapter) throw new Error('QueryAdapter is abstract')
    this.config = config
  }
  normalize(query) { throw new Error('QueryAdapter#normalize not implemented') }
  buildFilters(filters) { throw new Error('QueryAdapter#buildFilters not implemented') }
  buildPagination(page, size) { throw new Error('QueryAdapter#buildPagination not implemented') }
  buildSorting(sort) { throw new Error('QueryAdapter#buildSorting not implemented') }
  buildProjection(fields) { throw new Error('QueryAdapter#buildProjection not implemented') }
  buildJoins(relations) { throw new Error('QueryAdapter#buildJoins not implemented') }
  buildSearch(text, options) { throw new Error('QueryAdapter#buildSearch not implemented') }
  buildAggregation(pipeline) { throw new Error('QueryAdapter#buildAggregation not implemented') }
}
