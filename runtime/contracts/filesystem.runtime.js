import { BaseRuntimeContract } from './base.runtime.js'

export class FilesystemRuntime extends BaseRuntimeContract {
  constructor(config = {}) {
    super(config)
    this.name = 'filesystem'
  }

  async read(path) {
    return null
  }

  async write(path, data) {}

  async append(path, data) {}

  async delete(path) {}

  async exists(path) {
    return false
  }

  async list(dir) {
    return []
  }

  async mkdir(dir) {}

  async rmdir(dir) {}

  async copy(source, destination) {}

  async move(source, destination) {}

  async stat(path) {
    return null
  }

  async readStream(path) {
    return null
  }

  async writeStream(path) {
    return null
  }

  supports(feature) {
    const features = ['read', 'write', 'stream', 'watch', 'glob', 'temp', 'chmod', 'chown', 'symlink']
    return features.includes(feature)
  }
}

export default FilesystemRuntime
