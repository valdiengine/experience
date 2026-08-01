import { BaseRuntimeContract } from '../../contracts/base.runtime.js'

export class TemplateRuntime extends BaseRuntimeContract {
  constructor(config = {}) {
    super(config)
    this.name = 'cms-template'
  }

  async resolve(templateId, context) {
    return null
  }

  async render(templateId, data) {
    return null
  }

  async list(options) {
    return []
  }

  async get(templateId) {
    return null
  }

  async getDefault(contentType) {
    return null
  }

  supports(feature) {
    const features = ['resolve', 'render', 'list', 'get', 'default', 'variables', 'partials']
    return features.includes(feature)
  }
}

export default TemplateRuntime
