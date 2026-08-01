import { BaseRuntimeContract } from './base.runtime.js'

export class SearchRuntime extends BaseRuntimeContract {
  constructor(config = {}) {
    super(config)
    this.name = 'search'
  }

  async index(entity, data) {}

  async update(entity, id, data) {}

  async delete(entity, id) {}

  async search(query, options) {
    return { hits: [], total: 0, facetDistribution: {} }
  }

  async suggest(query, options) {
    return []
  }

  async facet(field, query, options) {
    return {}
  }

  async reindex(entity) {
    return { indexed: 0 }
  }

  async clearIndex(entity) {}

  async stats() {
    return { documentCount: 0, indexSize: 0 }
  }

  supports(feature) {
    const features = ['fulltext', 'facet', 'filter', 'sort', 'fuzzy', 'synonym', 'highlight', 'suggest', 'geosearch']
    return features.includes(feature)
  }
}

export default SearchRuntime
