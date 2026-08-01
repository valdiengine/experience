import { WordPressContentMapper } from '../content/wordpress.content.mapper.js'
import { WordPressMediaMapper } from '../media/wordpress.media.mapper.js'
import { WordPressSeoSync } from '../seo/wordpress.seo.sync.js'

export class WordPressSyncAdapter {
  #client = null
  #contentMapper = null
  #mediaMapper = null
  #seoSync = null

  constructor(client) {
    this.#client = client
    this.#contentMapper = new WordPressContentMapper()
    this.#mediaMapper = new WordPressMediaMapper()
    this.#seoSync = new WordPressSeoSync(client)
  }

  async pullPosts(since = null, pagination = {}) {
    const filters = { orderby: 'modified', order: 'desc' }
    if (since) filters.after = since

    const result = await this.#client.contentQuery('posts', filters, pagination)
    return this.#contentMapper.toEngineBatch(result, 'post')
  }

  async pullPages(since = null, pagination = {}) {
    const filters = { orderby: 'modified', order: 'desc' }
    if (since) filters.after = since

    const result = await this.#client.contentQuery('pages', filters, pagination)
    return this.#contentMapper.toEngineBatch(result, 'page')
  }

  async pullMedia(since = null, pagination = {}) {
    const filters = { orderby: 'modified', order: 'desc' }
    if (since) filters.after = since

    const result = await this.#client.contentQuery('media', filters, pagination)
    return this.#mediaMapper.toEngineBatch(result)
  }

  async pullCategories(options = {}) {
    const result = await this.#client.getCategories(options)
    return this.#contentMapper.toEngineBatch(result, 'category')
  }

  async pullTags(options = {}) {
    const result = await this.#client.getTags(options)
    return this.#contentMapper.toEngineBatch(result, 'tag')
  }

  async pushPost(data) {
    const mapper = new WordPressContentMapper()
    const providerData = mapper.toProvider({ ...data, type: 'post' })

    if (data.cmsId && !data.cmsId.startsWith('new_')) {
      const wpEntity = await this.#client.contentUpdate('posts', data.cmsId, providerData)
      return mapper.toEngine(wpEntity, 'post')
    }

    const wpEntity = await this.#client.contentCreate('posts', providerData)
    return mapper.toEngine(wpEntity, 'post')
  }

  async pushPage(data) {
    const mapper = new WordPressContentMapper()
    const providerData = mapper.toProvider({ ...data, type: 'page' })

    if (data.cmsId && !data.cmsId.startsWith('new_')) {
      const wpEntity = await this.#client.contentUpdate('pages', data.cmsId, providerData)
      return mapper.toEngine(wpEntity, 'page')
    }

    const wpEntity = await this.#client.contentCreate('pages', providerData)
    return mapper.toEngine(wpEntity, 'page')
  }

  async pullSeoForPost(postId) {
    return this.#seoSync.getForPost(postId)
  }

  async pullSeoForPage(pageId) {
    return this.#seoSync.getForPage(pageId)
  }

  async pullChangedSince(entityType, since, pagination = {}) {
    switch (entityType) {
      case 'post':
        return this.pullPosts(since, pagination)
      case 'page':
        return this.pullPages(since, pagination)
      case 'media':
        return this.pullMedia(since, pagination)
      default:
        return []
    }
  }

  async getTotalCount(entityType) {
    try {
      const result = await this.#client.contentQuery(entityType, {}, { per_page: 1 })
      return result.length === 0 ? 0 : 1
    } catch {
      return 0
    }
  }
}

export default WordPressSyncAdapter
