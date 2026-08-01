import { BaseRuntimeContract } from '../../contracts/base.runtime.js'

export class ContentRuntime extends BaseRuntimeContract {
  constructor(config = {}) {
    super(config)
    this.name = 'cms-content'
  }

  async get(id, options) {
    return null
  }

  async query(filters, pagination) {
    return { items: [], total: 0, page: 1, pageSize: 20 }
  }

  async create(data) {
    return null
  }

  async update(id, data) {
    return null
  }

  async delete(id) {}

  async publish(id) {}

  async unpublish(id) {}

  async archive(id) {}

  async restore(id) {}

  async getRevision(contentId, revisionId) {
    return null
  }

  async listRevisions(contentId) {
    return []
  }

  supports(feature) {
    const features = ['get', 'query', 'create', 'update', 'delete', 'publish', 'unpublish', 'archive', 'revisions', 'slug', 'i18n']
    return features.includes(feature)
  }
}

export default ContentRuntime
