import { BaseRuntimeContract } from '../../contracts/base.runtime.js'

export class CmsMediaRuntime extends BaseRuntimeContract {
  constructor(config = {}) {
    super(config)
    this.name = 'cms-media'
  }

  async upload(file, options) {
    return null
  }

  async get(id) {
    return null
  }

  async delete(id) {}

  async serve(id, transforms) {
    return null
  }

  async process(mediaId, operations) {
    return null
  }

  async getUrl(mediaId, options) {
    return null
  }

  async list(options) {
    return { items: [], total: 0, page: 1, pageSize: 20 }
  }

  async getMetadata(mediaId) {
    return null
  }

  supports(feature) {
    const features = ['upload', 'get', 'delete', 'serve', 'process', 'thumbnail', 'optimize', 'metadata', 'responsive', 'cdn']
    return features.includes(feature)
  }
}

export default CmsMediaRuntime
