import { WordPressMediaMapper } from './wordpress.media.mapper.js'

export class WordPressMediaClient {
  #client = null
  #mapper = null

  constructor(client) {
    this.#client = client
    this.#mapper = new WordPressMediaMapper()
  }

  async upload(file, options = {}) {
    const wpMedia = await this.#client.mediaUpload(file, options)
    return this.#mapper.toEngine(wpMedia)
  }

  async get(id) {
    const wpMedia = await this.#client.mediaGet(id)
    return this.#mapper.toEngine(wpMedia)
  }

  async delete(id) {
    return this.#client.mediaDelete(id)
  }

  async list(options = {}) {
    const wpMediaList = await this.#client.contentQuery('media', {}, options)
    return this.#mapper.toEngineBatch(wpMediaList)
  }

  async getUrl(id, transforms = {}) {
    const media = await this.get(id)
    if (!media) return null

    if (transforms.size && media.thumbnails?.[transforms.size]) {
      return media.thumbnails[transforms.size]
    }

    return media.url
  }

  async getMetadata(id) {
    const media = await this.get(id)
    if (!media) return null

    return {
      width: media.width,
      height: media.height,
      mimeType: media.mimeType,
      size: media.size,
      alt: media.alt,
      caption: media.caption,
      title: media.title,
    }
  }
}

export default WordPressMediaClient
