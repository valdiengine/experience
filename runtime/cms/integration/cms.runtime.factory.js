export class CmsRuntimeFactory {
  #config = {}

  constructor(config = {}) {
    this.#config = config
  }

  register(type, ProviderClass) {
    CMS_PROVIDER_REGISTRY[type] = ProviderClass
  }

  resolve(type = 'wordpress', options = {}) {
    const ProviderClass = CMS_PROVIDER_REGISTRY[type]
    if (!ProviderClass) return null
    return new ProviderClass({ ...this.#config, ...options })
  }

  list() {
    return Object.keys(CMS_PROVIDER_REGISTRY)
  }

  supports(type) {
    return type in CMS_PROVIDER_REGISTRY
  }
}

const CMS_PROVIDER_REGISTRY = {
  wordpress: null,
  ghost: null,
  strapi: null,
  directus: null,
  contentful: null,
  sanity: null,
}

export default CmsRuntimeFactory
