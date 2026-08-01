import { BaseRuntimeContract } from './base.runtime.js'

export class MediaRuntime extends BaseRuntimeContract {
  constructor(config = {}) {
    super(config)
    this.name = 'media'
  }

  async upload(file, options) {
    return null
  }

  async delete(mediaId) {}

  async get(mediaId) {
    return null
  }

  async getUrl(mediaId, options) {
    return null
  }

  async process(mediaId, operations) {
    return null
  }

  async resize(mediaId, width, height) {
    return null
  }

  async thumbnail(mediaId, size) {
    return null
  }

  async blurhash(mediaId) {
    return null
  }

  async optimize(mediaId, format) {
    return null
  }

  async list(options) {
    return []
  }

  supports(feature) {
    const features = ['image', 'video', 'audio', 'thumbnail', 'blurhash', 'optimization', 'transcode', 'stream']
    return features.includes(feature)
  }
}

export default MediaRuntime
