/**
 * CMS Capability — Hybrid CMS Bridge
 *
 * Business-agnostic: bridges WordPress content to Engine.
 * Handles pages, posts, media, metadata.
 * Does NOT know about tourism, drones, etc.
 *
 * Architecture:
 * WordPress → WordPressProvider → CMSMapper → DataManager
 *
 * Prepared for future:
 * - RESTProvider (custom backend)
 * - GraphQLProvider
 * - DatabaseProvider
 */
import { BaseCapability } from '../core/base.capability.js'
import { WordPressProvider } from './wordpress.provider.js'
import { CMSMapper } from './cms.mapper.js'
import { CMS_EVENTS } from './cms.events.js'
import { validateCMSContent } from './cms.schema.js'

export class CMSCapability extends BaseCapability {
  static id = 'cms'
  static name = 'CMS'
  static version = '1.0.0'
  static dependencies = []

  #wpProvider = null
  #content = new Map()

  async init(context, config = {}) {
    await super.init(context, config)

    if (config.wordpress?.baseUrl) {
      this.#wpProvider = new WordPressProvider(config.wordpress)
    }
  }

  async activate() {
    if (this.#wpProvider) {
      await this.#wpProvider.load()
      this.#syncContent()
    }

    this.on(CMS_EVENTS.CONTENT_UPDATED, this.#onContentUpdated.bind(this))
    await super.activate()
  }

  async deactivate() {
    this.#content.clear()
    await super.deactivate()
  }

  async destroy() {
    this.#content.clear()
    this.#wpProvider = null
    await super.destroy()
  }

  /**
   * Get all content
   * @returns {object[]}
   */
  getAll() {
    return Array.from(this.#content.values())
  }

  /**
   * Get content by ID
   * @param {string} id - Content ID
   * @returns {object|null}
   */
  getById(id) {
    return this.#content.get(id) || null
  }

  /**
   * Get content by slug
   * @param {string} slug - Content slug
   * @returns {object|null}
   */
  getBySlug(slug) {
    return this.getAll().find(c => c.slug === slug) || null
  }

  /**
   * Get content by type
   * @param {string} type - Content type (page, post, media)
   * @returns {object[]}
   */
  getByType(type) {
    return this.getAll().filter(c => c.type === type)
  }

  /**
   * Get published content
   * @returns {object[]}
   */
  getPublished() {
    return this.getAll().filter(c => c.status === 'published')
  }

  /**
   * Search content
   * @param {string} query - Search query
   * @returns {object[]}
   */
  search(query) {
    if (!query) return []
    const lowerQuery = query.toLowerCase()
    return this.getAll().filter(c => {
      return (c.title && c.title.toLowerCase().includes(lowerQuery)) ||
             (c.content && c.content.toLowerCase().includes(lowerQuery)) ||
             (c.excerpt && c.excerpt.toLowerCase().includes(lowerQuery))
    })
  }

  /**
   * Get WordPress provider
   * @returns {WordPressProvider|null}
   */
  get wpProvider() {
    return this.#wpProvider
  }

  /**
   * Sync content from WordPress to local cache
   */
  #syncContent() {
    if (!this.#wpProvider) return

    const pages = this.#wpProvider.get('pages') || []
    const posts = this.#wpProvider.get('posts') || []

    const mappedPages = CMSMapper.mapMany(pages, 'page')
    const mappedPosts = CMSMapper.mapMany(posts, 'post')

    for (const item of [...mappedPages, ...mappedPosts]) {
      this.#content.set(item.id, item)
    }

    this.emit(CMS_EVENTS.CONTENT_LOADED, {
      count: this.#content.size,
      timestamp: Date.now(),
    })
  }

  #onContentUpdated(event) {
    if (event.content) {
      this.#content.set(event.content.id, event.content)
    }
  }
}

export default CMSCapability
