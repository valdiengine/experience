/**
 * Content Admin — Content administration through CMS Capability
 *
 * Business-agnostic: manages pages, sections, images, SEO metadata, publishing
 * Supports WordPress provider and future backend provider
 */
import { ADMIN_EVENTS } from '../admin.events.js'

export class ContentAdmin {
  #context = null

  constructor(context) {
    this.#context = context
  }

  /**
   * Get all pages for tenant
   * @param {string} tenantId
   * @returns {object[]}
   */
  async getPages(tenantId) {
    const cms = this.#context?.capabilities?.get?.('cms')
    if (!cms?.getAll) return []
    return cms.getAll(tenantId) || []
  }

  /**
   * Get page by ID
   * @param {string} pageId
   * @returns {object|null}
   */
  async getPage(pageId) {
    const cms = this.#context?.capabilities?.get?.('cms')
    if (!cms?.getById) return null
    return cms.getById(pageId)
  }

  /**
   * Get page by slug
   * @param {string} slug
   * @returns {object|null}
   */
  async getPageBySlug(slug) {
    const cms = this.#context?.capabilities?.get?.('cms')
    if (!cms?.getBySlug) return null
    return cms.getBySlug(slug)
  }

  /**
   * Get pages by type
   * @param {string} tenantId
   * @param {string} type
   * @returns {object[]}
   */
  async getPagesByType(tenantId, type) {
    const pages = await this.getPages(tenantId)
    return pages.filter(p => p.type === type)
  }

  /**
   * Get page sections
   * @param {string} pageId
   * @returns {object[]}
   */
  async getSections(pageId) {
    const page = await this.getPage(pageId)
    return page?.sections || []
  }

  /**
   * Get page SEO metadata
   * @param {string} pageId
   * @returns {object}
   */
  async getSEO(pageId) {
    const page = await this.getPage(pageId)
    return page?.seo || {}
  }

  /**
   * Update page SEO metadata
   * @param {string} pageId
   * @param {object} seo - { title, description, canonical, ogTitle, ogDescription, ogImage }
   * @returns {object}
   */
  async updateSEO(pageId, seo) {
    const cms = this.#context?.capabilities?.get?.('cms')
    if (!cms?.update) {
      return { success: false, error: 'CMS capability not available' }
    }

    const result = await cms.update(pageId, { seo })
    if (result.success) {
      this.#context?.eventBus?.emit(ADMIN_EVENTS.CONTENT_UPDATED, {
        pageId,
        field: 'seo',
      })
    }
    return result
  }

  /**
   * Get page images
   * @param {string} pageId
   * @returns {object[]}
   */
  async getImages(pageId) {
    const page = await this.getPage(pageId)
    return page?.images || []
  }

  /**
   * Get publishing state
   * @param {string} pageId
   * @returns {string}
   */
  async getPublishingState(pageId) {
    const page = await this.getPage(pageId)
    return page?.status || 'draft'
  }

  /**
   * Publish page
   * @param {string} pageId
   * @returns {object}
   */
  async publish(pageId) {
    const cms = this.#context?.capabilities?.get?.('cms')
    if (!cms?.update) {
      return { success: false, error: 'CMS capability not available' }
    }

    const result = await cms.update(pageId, { status: 'published' })
    if (result.success) {
      this.#context?.eventBus?.emit(ADMIN_EVENTS.CONTENT_PUBLISHED, { pageId })
    }
    return result
  }

  /**
   * Unpublish page
   * @param {string} pageId
   * @returns {object}
   */
  async unpublish(pageId) {
    const cms = this.#context?.capabilities?.get?.('cms')
    if (!cms?.update) {
      return { success: false, error: 'CMS capability not available' }
    }

    return cms.update(pageId, { status: 'draft' })
  }

  /**
   * Get content stats
   * @param {string} tenantId
   * @returns {object}
   */
  async getStats(tenantId) {
    const pages = await this.getPages(tenantId)

    return {
      total: pages.length,
      published: pages.filter(p => p.status === 'published').length,
      draft: pages.filter(p => p.status === 'draft').length,
      byType: this.#groupByType(pages),
    }
  }

  #groupByType(pages) {
    const groups = {}
    pages.forEach(p => {
      const type = p.type || 'page'
      groups[type] = (groups[type] || 0) + 1
    })
    return groups
  }
}
