import { WordPressContentMapper } from './wordpress.content.mapper.js'

export class WordPressContentWriter {
  #client = null
  #mapper = null

  constructor(client) {
    this.#client = client
    this.#mapper = new WordPressContentMapper()
  }

  async create(type, data) {
    const providerData = this.#mapper.toProvider({ ...data, type })
    const wpEntity = await this.#client.contentCreate(type, providerData)
    return this.#mapper.toEngine(wpEntity, type)
  }

  async update(type, id, data) {
    const providerData = this.#mapper.toProvider({ ...data, type })
    const wpEntity = await this.#client.contentUpdate(type, id, providerData)
    return this.#mapper.toEngine(wpEntity, type)
  }

  async delete(type, id) {
    return this.#client.contentDelete(type, id)
  }

  async publish(type, id) {
    return this.update(type, id, { status: 'publish' })
  }

  async unpublish(type, id) {
    return this.update(type, id, { status: 'draft' })
  }

  async archive(type, id) {
    return this.update(type, id, { status: 'trash' })
  }

  async restore(type, id) {
    return this.#client.contentUpdate(type, id, { status: 'draft' })
  }
}

export default WordPressContentWriter
