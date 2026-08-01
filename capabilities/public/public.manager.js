/**
 * Public Manager — Orchestrates all public experience sub-modules
 *
 * Business-agnostic: manages pages, navigation, SEO, PWA for tenant public view
 * Delegates to: PageRenderer, SectionRenderer, ComponentRenderer,
 *   MenuManager, RouteManager, MetadataManager, SchemaGenerator, SitemapManager
 */
import { PageRenderer } from './renderer/page.renderer.js'
import { SectionRenderer } from './renderer/section.renderer.js'
import { ComponentRenderer } from './renderer/component.renderer.js'
import { MenuManager } from './navigation/menu.manager.js'
import { RouteManager } from './navigation/route.manager.js'
import { MetadataManager } from './seo/metadata.manager.js'
import { SchemaGenerator } from './seo/schema.generator.js'
import { SitemapManager } from './seo/sitemap.manager.js'
import { PUBLIC_EVENTS } from './public.events.js'

export class PublicManager {
  #context = null
  #pageRenderer = null
  #sectionRenderer = null
  #componentRenderer = null
  #menuManager = null
  #routeManager = null
  #metadataManager = null
  #schemaGenerator = null
  #sitemapManager = null
  #initialized = false

  constructor(context) {
    this.#context = context

    this.#pageRenderer = new PageRenderer(context)
    this.#componentRenderer = new ComponentRenderer(context)
    this.#sectionRenderer = new SectionRenderer(context, this.#componentRenderer)
    this.#menuManager = new MenuManager(context)
    this.#routeManager = new RouteManager(context)
    this.#metadataManager = new MetadataManager(context)
    this.#schemaGenerator = new SchemaGenerator(context)
    this.#sitemapManager = new SitemapManager(context)
  }

  /**
   * Initialize the public experience for a tenant
   * @param {object} tenant
   */
  async init(tenant) {
    if (this.#initialized) return

    this.#componentRenderer.init()
    this.#menuManager.loadFromTenant(tenant)
    this.#routeManager.init({ tenantPrefix: 'tenant' })

    this.#setupRouteHandlers()

    this.#context?.eventBus?.emit(PUBLIC_EVENTS.LOADED, { tenantId: tenant?.id })
    this.#initialized = true
  }

  /**
   * Render a page
   * @param {HTMLElement} container
   * @param {object} page
   * @param {object} options - { tenant }
   */
  async renderPage(container, page, options = {}) {
    const tenant = options.tenant || this.#context?.tenant

    await this.#pageRenderer.render(container, page, { tenant })

    if (page.seo) {
      this.#metadataManager.setMetadata(page.id, page.seo)
    }

    this.#componentRenderer.initializeAll(container, { tenant })
  }

  /**
   * Render full page into body
   * @param {object} page
   * @param {object} options
   */
  async renderFullPage(page, options = {}) {
    await this.#pageRenderer.renderFull(page)
    const container = document.querySelector('.public-page') || document.body
    this.#componentRenderer.initializeAll(container, options)
  }

  /**
   * Get the page renderer
   * @returns {PageRenderer}
   */
  getPageRenderer() {
    return this.#pageRenderer
  }

  /**
   * Get the section renderer
   * @returns {SectionRenderer}
   */
  getSectionRenderer() {
    return this.#sectionRenderer
  }

  /**
   * Get the component renderer
   * @returns {ComponentRenderer}
   */
  getComponentRenderer() {
    return this.#componentRenderer
  }

  /**
   * Get the menu manager
   * @returns {MenuManager}
   */
  getMenuManager() {
    return this.#menuManager
  }

  /**
   * Get the route manager
   * @returns {RouteManager}
   */
  getRouteManager() {
    return this.#routeManager
  }

  /**
   * Get the metadata manager
   * @returns {MetadataManager}
   */
  getMetadataManager() {
    return this.#metadataManager
  }

  /**
   * Get the schema generator
   * @returns {SchemaGenerator}
   */
  getSchemaGenerator() {
    return this.#schemaGenerator
  }

  /**
   * Get the sitemap manager
   * @returns {SitemapManager}
   */
  getSitemapManager() {
    return this.#sitemapManager
  }

  /**
   * Generate and inject SEO for a page
   * @param {object} page
   * @param {object} tenant
   */
  generateSEO(page, tenant) {
    const metadata = this.#metadataManager.generateFromPage(page, tenant)
    this.#metadataManager.setMetadata(page.id, metadata)

    const schema = this.#schemaGenerator.generate(tenant)
    this.#schemaGenerator.inject(schema)

    this.#sitemapManager.generateFromPages([page], tenant)

    this.#context?.eventBus?.emit(PUBLIC_EVENTS.SEO_GENERATED, {
      pageId: page.id,
      metadata,
    })
  }

  /**
   * Generate sitemap XML
   * @param {object[]} pages
   * @param {object} tenant
   * @returns {string}
   */
  generateSitemap(pages, tenant) {
    this.#sitemapManager.clear()
    this.#sitemapManager.generateFromPages(pages, tenant)
    return this.#sitemapManager.toXML()
  }

  /**
   * Get public page data from CMS
   * @param {string} slug
   * @returns {object|null}
   */
  getPage(slug) {
    const cms = this.#context?.capabilities?.get?.('cms')
    if (!cms) return null

    const content = cms.getBySlug?.(slug)
    if (!content) return null

    return {
      id: content.id || slug,
      slug,
      title: content.title || content.name || slug,
      description: content.description || '',
      sections: content.sections || this.#defaultSections(content),
      seo: content.seo || {},
      visibility: 'public',
    }
  }

  /**
   * Destroy and clean up
   */
  destroy() {
    this.#pageRenderer.clear()
    this.#sitemapManager.clear()
    this.#initialized = false
  }

  // ── Private ──

  #setupRouteHandlers() {
    this.#routeManager.onRouteChange(({ path, config }) => {
      const page = this.getPage(config.pageId || path)
      if (page) {
        this.renderFullPage(page)
      }
    })
  }

  #defaultSections(content) {
    return [
      {
        type: 'hero',
        order: 0,
        title: content.title || '',
        content: {
          title: content.title,
          subtitle: content.description,
          image: content.image || content.thumbnail,
        },
      },
      {
        type: 'custom',
        order: 1,
        title: '',
        content: { html: content.body || content.content || '' },
      },
    ]
  }
}
