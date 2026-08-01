import { WordPressContentMapper } from './wordpress.content.mapper.js'

export class WordPressContentReader {
  #client = null
  #mapper = null

  constructor(client) {
    this.#client = client
    this.#mapper = new WordPressContentMapper()
  }

  async get(type, id, options = {}) {
    const wpEntity = await this.#client.contentGet(type, id, options)
    return this.#mapper.toEngine(wpEntity, type)
  }

  async query(type, filters = {}, pagination = {}) {
    const wpEntities = await this.#client.contentQuery(type, filters, pagination)
    const items = this.#mapper.toEngineBatch(wpEntities, type)
    return { items, total: wpEntities.length }
  }

  async getById(type, id) {
    return this.get(type, id)
  }

  async getBySlug(type, slug) {
    const result = await this.query(type, { slug }, { per_page: 1 })
    return result.items?.[0] || null
  }

  async listCategories(options = {}) {
    const categories = await this.#client.getCategories(options)
    return this.#mapper.toEngineBatch(categories, 'category')
  }

  async listTags(options = {}) {
    const tags = await this.#client.getTags(options)
    return this.#mapper.toEngineBatch(tags, 'tag')
  }

  async listAuthors(options = {}) {
    const users = await this.#client.getUsers(options)
    return this.#mapper.toEngineBatch(users, 'author')
  }
}

export default WordPressContentReader
