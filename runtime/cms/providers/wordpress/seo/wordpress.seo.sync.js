import { WordPressSeoMapper } from './wordpress.seo.mapper.js'

export class WordPressSeoSync {
  #client = null
  #mapper = null

  constructor(client) {
    this.#client = client
    this.#mapper = new WordPressSeoMapper()
  }

  async get(entityId, entityType) {
    const yoastSeo = await this.#client.getYoastSeo(entityType, entityId)
    if (!yoastSeo) {
      const wpEntity = await this.#client.contentGet(entityType, entityId)
      if (!wpEntity) return null
      return this.#mapper.extractFromPost(wpEntity)
    }
    return this.#mapper.toEngine(yoastSeo, entityId, entityType)
  }

  async getForPost(postId) {
    return this.get(postId, 'posts')
  }

  async getForPage(pageId) {
    return this.get(pageId, 'pages')
  }

  async extractFromContent(wpEntity) {
    if (!wpEntity) return null
    return this.#mapper.extractFromPost(wpEntity)
  }

  async extractBatch(wpEntities) {
    return (wpEntities || []).map(entity => this.extractFromContent(entity)).filter(Boolean)
  }
}

export default WordPressSeoSync
