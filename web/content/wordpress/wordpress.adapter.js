/**
 * WordPress Adapter
 *
 * WordPress REST API adapter for editorial content.
 * Implements ContentAdapter interface.
 * Framework-free implementation.
 */

import { ContentAdapter, NotFoundError, ConfigurationError } from '../content.adapter.js'
import { WordPressClient, createWordPressClient } from './wordpress.client.js'
import { WordPressCache, createWordPressCache } from './wordpress.cache.js'
import { WordPressMapper, createWordPressMapper } from './wordpress.mapper.js'
import { WordPressNotFoundError, WordPressValidationError } from './wordpress.errors.js'
import { sanitizeHtml, validateMediaUrl } from '../content.sanitizer.js'

export class WordPressAdapter extends ContentAdapter {
  constructor(config = {}) {
    super(config)

    this.destination = config.destination
    this.siteId = config.siteId
    this.categories = config.categories || {}

    if (config.enabled !== false) {
      if (!config.endpoint) {
        throw new WordPressValidationError('WordPress endpoint is required when enabled')
      }

      this.client = createWordPressClient({
        endpoint: config.endpoint,
        apiKey: config.apiKey,
        timeout: config.timeout || 5000,
        retries: config.retries || 1
      })
    }

    this.cache = createWordPressCache({
      maxSize: config.cacheSize || 500,
      ttl: config.cacheTtl || 300000
    })

    this.mapper = createWordPressMapper()
  }

  get isEnabled() {
    return this.enabled && !!this.client
  }

  async getPost(slug, destination = null) {
    if (!this.isEnabled) {
      return null
    }

    const domain = destination || this.destination
    const cacheKey = slug

    const cached = this.cache.get(domain, 'post', cacheKey)
    if (cached) {
      return cached
    }

    try {
      const params = new URLSearchParams({
        slug,
        status: 'publish',
        _embed: 'wp_featured_media,wp_term'
      })

      if (this._hasDestinationCategories(domain)) {
        params.append('categories', this._getCategoryIds(domain).join(','))
      }

      const response = await this.client.get(`/wp-json/wp/v2/posts?${params}`)

      if (!response.body || !response.body.length) {
        throw new WordPressNotFoundError(`Post not found: ${slug}`)
      }

      const wpPost = response.body[0]
      const post = this.mapper.mapPost(wpPost, domain)

      if (post) {
        post.content = sanitizeHtml(post.content)
        this.cache.set(domain, 'post', cacheKey, post)
      }

      return post
    } catch (error) {
      if (error instanceof WordPressNotFoundError) {
        throw error
      }
      throw new WordPressValidationError(`Failed to get post: ${error.message}`)
    }
  }

  async getPosts(options = {}, destination = null) {
    if (!this.isEnabled) {
      return []
    }

    const domain = destination || this.destination
    const {
      page = 1,
      perPage = 10,
      category = null,
      tag = null,
      search = null
    } = options

    const cacheKey = `list:${page}:${perPage}:${category || ''}:${tag || ''}:${search || ''}`

    const cached = this.cache.get(domain, 'posts', cacheKey)
    if (cached) {
      return cached
    }

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: perPage.toString(),
        status: 'publish',
        _embed: 'wp_featured_media,wp_term'
      })

      if (category) {
        params.append('categories', category)
      } else if (this._hasDestinationCategories(domain)) {
        const catIds = this._getCategoryIds(domain)
        if (catIds.length > 0) {
          params.append('categories', catIds.join(','))
        }
      }

      if (tag) {
        params.append('tags', tag)
      }

      if (search) {
        params.append('search', search)
      }

      const response = await this.client.get(`/wp-json/wp/v2/posts?${params}`)

      const total = parseInt(response.headers?.['x-wp-total'] || '0', 10)
      const totalPages = parseInt(response.headers?.['x-wp-totalpages'] || '1', 10)

      const posts = this.mapper.mapPosts(Array.isArray(response.body) ? response.body : [], domain)

      for (const post of posts) {
        post.content = sanitizeHtml(post.content)
      }

      const result = {
        items: posts,
        total,
        page,
        perPage,
        totalPages,
        hasMore: page < totalPages
      }

      this.cache.set(domain, 'posts', cacheKey, result)

      return result
    } catch (error) {
      throw new WordPressValidationError(`Failed to get posts: ${error.message}`)
    }
  }

  async getPage(slug, destination = null) {
    if (!this.isEnabled) {
      return null
    }

    const domain = destination || this.destination
    const cacheKey = slug

    const cached = this.cache.get(domain, 'page', cacheKey)
    if (cached) {
      return cached
    }

    try {
      const params = new URLSearchParams({
        slug,
        status: 'publish'
      })

      const response = await this.client.get(`/wp-json/wp/v2/pages?${params}`)

      if (!response.body || !response.body.length) {
        throw new WordPressNotFoundError(`Page not found: ${slug}`)
      }

      const wpPage = response.body[0]
      const page = this.mapper.mapPage(wpPage, domain)

      if (page) {
        page.content = sanitizeHtml(page.content)
        this.cache.set(domain, 'page', cacheKey, page)
      }

      return page
    } catch (error) {
      if (error instanceof WordPressNotFoundError) {
        throw error
      }
      throw new WordPressValidationError(`Failed to get page: ${error.message}`)
    }
  }

  async getPages(options = {}, destination = null) {
    if (!this.isEnabled) {
      return []
    }

    const domain = destination || this.destination
    const { page = 1, perPage = 20 } = options

    const cacheKey = `pages:${page}:${perPage}`

    const cached = this.cache.get(domain, 'pages', cacheKey)
    if (cached) {
      return cached
    }

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: perPage.toString(),
        status: 'publish'
      })

      const response = await this.client.get(`/wp-json/wp/v2/pages?${params}`)

      const total = parseInt(response.headers?.['x-wp-total'] || '0', 10)

      const pages = this.mapper.mapPages(Array.isArray(response.body) ? response.body : [], domain)

      for (const page of pages) {
        page.content = sanitizeHtml(page.content)
      }

      const result = {
        items: pages,
        total,
        page,
        perPage,
        hasMore: false
      }

      this.cache.set(domain, 'pages', cacheKey, result)

      return result
    } catch (error) {
      throw new WordPressValidationError(`Failed to get pages: ${error.message}`)
    }
  }

  async getCategory(slug, destination = null) {
    if (!this.isEnabled) {
      return null
    }

    const domain = destination || this.destination

    try {
      const params = new URLSearchParams({ slug })
      const response = await this.client.get(`/wp-json/wp/v2/categories?${params}`)

      if (!response.body || !response.body.length) {
        return null
      }

      return this.mapper.mapCategory(response.body[0], domain)
    } catch (error) {
      return null
    }
  }

  async getCategories(options = {}, destination = null) {
    if (!this.isEnabled) {
      return []
    }

    const domain = destination || this.destination

    const cacheKey = 'all:categories'

    const cached = this.cache.get(domain, 'categories', cacheKey)
    if (cached) {
      return cached
    }

    try {
      const response = await this.client.get('/wp-json/wp/v2/categories?per_page=100')

      const categories = this.mapper.mapCategories(Array.isArray(response.body) ? response.body : [], domain)

      this.cache.set(domain, 'categories', cacheKey, categories)

      return categories
    } catch (error) {
      return []
    }
  }

  async getTag(slug, destination = null) {
    if (!this.isEnabled) {
      return null
    }

    const domain = destination || this.destination

    try {
      const params = new URLSearchParams({ slug })
      const response = await this.client.get(`/wp-json/wp/v2/tags?${params}`)

      if (!response.body || !response.body.length) {
        return null
      }

      return this.mapper.mapTag(response.body[0], domain)
    } catch (error) {
      return null
    }
  }

  async getTags(options = {}, destination = null) {
    if (!this.isEnabled) {
      return []
    }

    const domain = destination || this.destination

    const cacheKey = 'all:tags'

    const cached = this.cache.get(domain, 'tags', cacheKey)
    if (cached) {
      return cached
    }

    try {
      const response = await this.client.get('/wp-json/wp/v2/tags?per_page=100')

      const tags = this.mapper.mapTags(Array.isArray(response.body) ? response.body : [], domain)

      this.cache.set(domain, 'tags', cacheKey, tags)

      return tags
    } catch (error) {
      return []
    }
  }

  async getFeaturedMedia(mediaId, destination = null) {
    if (!this.isEnabled || !mediaId) {
      return null
    }

    const domain = destination || this.destination
    const cacheKey = `media:${mediaId}`

    const cached = this.cache.get(domain, 'media', cacheKey)
    if (cached) {
      return cached
    }

    try {
      const response = await this.client.get(`/wp-json/wp/v2/media/${mediaId}`)

      const media = this.mapper.mapMedia(response.body, domain)

      if (media && media.src) {
        const safeSrc = validateMediaUrl(media.src)
        if (!safeSrc) {
          media.src = ''
        }
      }

      if (media) {
        this.cache.set(domain, 'media', cacheKey, media)
      }

      return media
    } catch (error) {
      return null
    }
  }

  async search(query, options = {}, destination = null) {
    if (!this.isEnabled) {
      return []
    }

    const domain = destination || this.destination
    const { page = 1, perPage = 10 } = options

    const cacheKey = `search:${query}:${page}:${perPage}`

    const cached = this.cache.get(domain, 'search', cacheKey)
    if (cached) {
      return cached
    }

    try {
      const params = new URLSearchParams({
        search: query,
        page: page.toString(),
        per_page: perPage.toString(),
        status: 'publish'
      })

      if (this._hasDestinationCategories(domain)) {
        params.append('categories', this._getCategoryIds(domain).join(','))
      }

      const response = await this.client.get(`/wp-json/wp/v2/posts?${params}`)

      const results = this.mapper.mapSearchResults(Array.isArray(response.body) ? response.body : [], domain)

      const result = {
        items: results,
        total: results.length,
        query,
        page,
        perPage
      }

      this.cache.set(domain, 'search', cacheKey, result)

      return result
    } catch (error) {
      return { items: [], total: 0, query, page, perPage }
    }
  }

  async getSeoMetadata(contentId, contentType, destination = null) {
    const domain = destination || this.destination

    try {
      let wpData

      if (contentType === 'post') {
        const params = new URLSearchParams({ _embed: 'wp_term' })
        const response = await this.client.get(`/wp-json/wp/v2/posts/${contentId}?${params}`)
        wpData = response.body
      } else if (contentType === 'page') {
        const response = await this.client.get(`/wp-json/wp/v2/pages/${contentId}`)
        wpData = response.body
      }

      if (!wpData) {
        return null
      }

      return this.mapper.mapSeo(wpData)
    } catch (error) {
      return null
    }
  }

  async health() {
    if (!this.isEnabled) {
      return { status: 'disabled', message: 'WordPress adapter is disabled' }
    }

    try {
      const start = Date.now()
      await this.client.get('/wp-json/wp/v2/types?per_page=1')
      const latency = Date.now() - start

      return {
        status: 'healthy',
        endpoint: this.client.endpoint,
        latency
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        endpoint: this.client.endpoint,
        error: error.message
      }
    }
  }

  invalidateCache(destination = null) {
    const domain = destination || this.destination
    return this.cache.invalidate(domain)
  }

  _hasDestinationCategories(domain) {
    return !!(this.categories && this.categories[domain])
  }

  _getCategoryIds(domain) {
    const cats = this.categories[domain]
    if (!cats) return []
    if (Array.isArray(cats)) return cats
    if (typeof cats === 'object' && cats.ids) return cats.ids
    return []
  }
}

export function createWordPressAdapter(config) {
  return new WordPressAdapter(config)
}

export default {
  WordPressAdapter,
  createWordPressAdapter
}
