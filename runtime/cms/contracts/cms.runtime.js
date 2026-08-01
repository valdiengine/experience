import { BaseRuntimeContract } from '../../contracts/base.runtime.js'

export class CmsRuntime extends BaseRuntimeContract {
  constructor(config = {}) {
    super(config)
    this.name = 'cms'
    this.content = null
    this.media = null
    this.seo = null
    this.sync = null
    this.preview = null
    this.template = null
    this.webhook = null
  }

  async get(provider, contentId, options) {
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

  supports(feature) {
    const features = ['content', 'media', 'seo', 'sync', 'preview', 'template', 'webhook']
    return features.includes(feature)
  }
}

export default CmsRuntime
