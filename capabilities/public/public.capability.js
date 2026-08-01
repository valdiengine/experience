/**
 * Public Capability — v1.0.0
 *
 * Public experience and discovery layer for tenant-facing pages
 * Manages: pages, navigation, SEO, PWA integration, reservation bridge
 *
 * Dependencies: cms, pwa, reservation, communication, engagement
 */
import { BaseCapability } from '../core/base.capability.js'
import { PublicManager } from './public.manager.js'
import { PUBLIC_EVENTS } from './public.events.js'

export class PublicCapability extends BaseCapability {
  static id = 'public'
  static name = 'Public Experience'
  static version = '1.0.0'
  static dependencies = ['cms', 'pwa', 'reservation', 'communication', 'engagement']

  #manager = null

  async init(context, config = {}) {
    await super.init(context, config)
    this.#manager = new PublicManager(context)
  }

  async activate() {
    const tenant = this.tenant
    if (!tenant) return

    await this.#manager.init(tenant)

    this.#setupEventListeners()

    this.emit(PUBLIC_EVENTS.LOADED, {
      tenantId: tenant.id,
      tenantName: tenant.name,
    })

    await super.activate()
  }

  async deactivate() {
    this.#manager?.destroy()
    await super.deactivate()
  }

  async destroy() {
    this.#manager?.destroy()
    this.#manager = null
    await super.destroy()
  }

  // ── Public API ──

  /**
   * Render a public page into a container
   * @param {HTMLElement} container
   * @param {string} slug - Page slug
   * @returns {Promise<void>}
   */
  async renderPage(container, slug) {
    const page = this.#manager?.getPage(slug)
    if (!page) return
    await this.#manager.renderPage(container, page, {
      tenant: this.tenant,
    })
  }

  /**
   * Render full page into body
   * @param {string} slug
   * @returns {Promise<void>}
   */
  async renderFullPage(slug) {
    const page = this.#manager?.getPage(slug)
    if (!page) return
    await this.#manager.renderFullPage(page, {
      tenant: this.tenant,
    })
  }

  /**
   * Get navigation menu manager
   * @returns {MenuManager}
   */
  getMenu() {
    return this.#manager?.getMenuManager()
  }

  /**
   * Get route manager
   * @returns {RouteManager}
   */
  getRoutes() {
    return this.#manager?.getRouteManager()
  }

  /**
   * Get SEO metadata manager
   * @returns {MetadataManager}
   */
  getSEO() {
    return this.#manager?.getMetadataManager()
  }

  /**
   * Get schema generator
   * @returns {SchemaGenerator}
   */
  getSchema() {
    return this.#manager?.getSchemaGenerator()
  }

  /**
   * Get sitemap manager
   * @returns {SitemapManager}
   */
  getSitemap() {
    return this.#manager?.getSitemapManager()
  }

  /**
   * Generate SEO for a page
   * @param {object} page
   * @param {object} tenant
   */
  generateSEO(page, tenant) {
    this.#manager?.generateSEO(page, tenant)
  }

  /**
   * Generate sitemap XML
   * @param {object[]} pages
   * @param {object} tenant
   * @returns {string}
   */
  generateSitemap(pages, tenant) {
    return this.#manager?.generateSitemap(pages, tenant) || ''
  }

  /**
   * Get page renderer
   * @returns {PageRenderer}
   */
  getPageRenderer() {
    return this.#manager?.getPageRenderer()
  }

  /**
   * Get section renderer
   * @returns {SectionRenderer}
   */
  getSectionRenderer() {
    return this.#manager?.getSectionRenderer()
  }

  /**
   * Get component renderer (bridge to Experience Engine)
   * @returns {ComponentRenderer}
   */
  getComponentRenderer() {
    return this.#manager?.getComponentRenderer()
  }

  // ── Private ──

  #setupEventListeners() {
    const pwa = this.context?.capabilities?.get?.('pwa')
    if (pwa) {
      this.on('pwa:installed', () => {
        this.emit(PUBLIC_EVENTS.PWA_READY, {
          tenantId: this.tenant?.id,
        })
      })
    }

    const reservation = this.context?.capabilities?.get?.('reservation')
    if (reservation) {
      this.on(PUBLIC_EVENTS.RESERVATION_SUBMITTED, (data) => {
        this.emit(PUBLIC_EVENTS.RESERVATION_SUBMITTED, data)
      })
    }
  }
}

export default PublicCapability
