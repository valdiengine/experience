import { BaseRuntimeContract } from './base.runtime.js'

export class StorageRuntime extends BaseRuntimeContract {
  constructor(config = {}) {
    super(config)
    this.name = 'storage'
  }

  async upload(path, data, options) {
    return null
  }

  async download(path) {
    return null
  }

  async delete(path) {}

  async exists(path) {
    return false
  }

  async list(prefix) {
    return []
  }

  async url(path, options) {
    return null
  }

  async presignedUrl(path, options) {
    return null
  }

  async copy(source, destination) {}

  async move(source, destination) {}

  async size(path) {
    return 0
  }

  supports(feature) {
    const features = ['presigned-url', 'public-url', 'private-url', 'versioning', 'encryption', 'cdn', 'batch']
    return features.includes(feature)
  }
}

export default StorageRuntime
