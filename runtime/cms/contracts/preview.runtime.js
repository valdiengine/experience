import { BaseRuntimeContract } from '../../contracts/base.runtime.js'

export class PreviewRuntime extends BaseRuntimeContract {
  constructor(config = {}) {
    super(config)
    this.name = 'cms-preview'
  }

  async generate(contentId, options) {
    return null
  }

  async resolve(token) {
    return null
  }

  async expire(previewId) {}

  async list(contentId) {
    return []
  }

  async get(previewId) {
    return null
  }

  supports(feature) {
    const features = ['generate', 'resolve', 'expire', 'list', 'token', 'draft', 'share']
    return features.includes(feature)
  }
}

export default PreviewRuntime
