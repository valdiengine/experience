/**
 * Content Manager — Normalizes content from different sources
 *
 * Business-agnostic: normalizes WordPress REST API, future Backend CMS, Static JSON
 * Unified format consumed by Public Experience and SEO Intelligence layers
 */
export class ContentManager {
  #context = null
  #normalizedCache = new Map()
  #sources = new Map()

  constructor(context) {
    this.#context = context
  }

  /**
   * Register a content source
   * @param {string} name - Source identifier
   * @param {object} adapter - { getAll, getById, getBySlug }
   */
  registerSource(name, adapter) {
    this.#sources.set(name, adapter)
  }

  /**
   * Load and normalize content from all sources
   * @param {string} tenantId
   * @returns {object[]}
   */
  async loadAll(tenantId) {
    const allPages = []

    for (const [name, adapter] of this.#sources) {
      try {
        const raw = await adapter.getAll(tenantId)
        const normalized = raw.map(item => this.normalize(item, tenantId, name))
        allPages.push(...normalized)
      } catch (error) {
        this.#context?.eventBus?.emit('content:source_error', {
          source: name,
          tenantId,
          error: error.message,
        })
      }
    }

    this.#normalizedCache.set(tenantId, allPages)
    return allPages
  }

  /**
   * Get cached normalized pages
   * @param {string} tenantId
   * @returns {object[]}
   */
  getNormalizedPages(tenantId) {
    return this.#normalizedCache.get(tenantId) || []
  }

  /**
   * Get a single normalized page
   * @param {string} pageId
   * @param {string} tenantId
   * @returns {object|null}
   */
  getPage(pageId, tenantId) {
    const pages = this.#normalizedCache.get(tenantId) || []
    return pages.find(p => p.id === pageId) || null
  }

  /**
   * Get page by slug
   * @param {string} slug
   * @param {string} tenantId
   * @returns {object|null}
   */
  getPageBySlug(slug, tenantId) {
    const pages = this.#normalizedCache.get(tenantId) || []
    return pages.find(p => p.slug === slug) || null
  }

  /**
   * Normalize raw content into unified format
   * @param {object} raw - Raw content from any source
   * @param {string} tenantId
   * @param {string} source - Source name
   * @returns {object}
   */
  normalize(raw, tenantId, source = 'unknown') {
    return {
      id: raw.id || raw.ID || raw.slug || `page_${Date.now()}`,
      tenantId,
      source,
      type: this.#resolveType(raw),
      title: raw.title?.rendered || raw.title || raw.name || '',
      slug: raw.slug || this.#slugify(raw.title?.rendered || raw.title || raw.name || ''),
      content: this.#extractContent(raw),
      sections: this.#extractSections(raw),
      seo: this.#extractSEO(raw),
      images: this.#extractImages(raw),
      status: raw.status || raw.post_status || 'published',
      createdAt: raw.date || raw.created_at || new Date().toISOString(),
      updatedAt: raw.modified || raw.updated_at || new Date().toISOString(),
    }
  }

  /**
   * Clear cache for a tenant
   * @param {string} tenantId
   */
  clearCache(tenantId) {
    this.#normalizedCache.delete(tenantId)
  }

  /**
   * Clear all cache
   */
  clearAllCache() {
    this.#normalizedCache.clear()
  }

  // ── Private ──

  #resolveType(raw) {
    if (raw.type) return raw.type
    if (raw.post_type) return raw.post_type
    if (raw.template) {
      const tpl = raw.template.toLowerCase()
      if (tpl.includes('service')) return 'service'
      if (tpl.includes('tour')) return 'tour'
      if (tpl.includes('landing')) return 'landing'
      if (tpl.includes('gallery')) return 'gallery'
    }
    return 'page'
  }

  #extractContent(raw) {
    if (raw.content?.rendered) return raw.content.rendered
    if (raw.content) return raw.content
    if (raw.body) return raw.body
    if (raw.excerpt?.rendered) return raw.excerpt.rendered
    return ''
  }

  #extractSections(raw) {
    if (raw.sections && Array.isArray(raw.sections)) return raw.sections
    if (raw.acf?.sections) return raw.acf.sections
    if (raw.meta?.sections) return raw.meta.sections
    return []
  }

  #extractSEO(raw) {
    const seo = {}

    if (raw.yoast_head_json) {
      seo.title = raw.yoast_head_json.title
      seo.description = raw.yoast_head_json.description
      seo.canonical = raw.yoast_head_json.canonical
      seo.ogTitle = raw.yoast_head_json.og_title
      seo.ogDescription = raw.yoast_head_json.og_description
      seo.ogImage = raw.yoast_head_json.og_image?.[0]?.url
      seo.twitterCard = raw.yoast_head_json.twitter_card
    }

    if (raw.meta) {
      seo.title = seo.title || raw.meta._seo_title
      seo.description = seo.description || raw.meta._seo_description
      seo.canonical = seo.canonical || raw.meta._seo_canonical
    }

    if (raw.seo) {
      Object.assign(seo, raw.seo)
    }

    return seo
  }

  #extractImages(raw) {
    const images = []

    if (raw.featured_media && raw._embedded?.['wp:featuredmedia']?.[0]) {
      const media = raw._embedded['wp:featuredmedia'][0]
      images.push({
        src: media.source_url,
        alt: media.alt_text || '',
        width: media.media_details?.width,
        height: media.media_details?.height,
      })
    }

    if (raw.acf?.gallery) {
      raw.acf.gallery.forEach(img => {
        images.push({
          src: img.url || img.source_url,
          alt: img.alt || '',
          width: img.width,
          height: img.height,
        })
      })
    }

    return images
  }

  #slugify(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }
}
