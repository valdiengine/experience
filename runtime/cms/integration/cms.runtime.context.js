export class CmsRuntimeContext {
  #integration = null
  #config = {}

  constructor(integration, config = {}) {
    this.#integration = integration
    this.#config = config
  }

  get content() {
    return this.#integration?.contentEngine || null
  }

  get media() {
    return this.#integration?.mediaEngine || null
  }

  get seo() {
    return this.#integration?.seoEngine || null
  }

  get sync() {
    return this.#integration?.syncEngine || null
  }

  get preview() {
    return this.#integration?.previewEngine || null
  }

  get template() {
    return this.#integration?.templateEngine || null
  }

  async get(provider, contentId, options) {
    return this.#integration?.get(provider, contentId, options) || null
  }

  async query(filters, pagination) {
    return this.#integration?.query(filters, pagination) || { items: [], total: 0 }
  }

  async create(data) {
    return this.#integration?.create(data) || null
  }

  async update(id, data) {
    return this.#integration?.update(id, data) || null
  }

  async delete(id) {
    return this.#integration?.delete(id)
  }

  async publish(id) {
    return this.#integration?.publish(id)
  }

  async unpublish(id) {
    return this.#integration?.unpublish(id)
  }

  available() {
    return this.#integration?.available() || false
  }

  supports(feature) {
    return this.#integration?.supports(feature) || false
  }
}

export default CmsRuntimeContext
