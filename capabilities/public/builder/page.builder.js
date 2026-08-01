/**
 * Page Builder — Dynamic landing page builder foundation
 *
 * Business-agnostic: allows tenants to define pages through configuration
 * Supports: homepage, service pages, landing pages, SEO pages, campaign pages
 * No hardcoded routes — all from tenant config
 */
export class PageBuilder {
  #context = null
  #pageDefinitions = new Map()
  #sectionBuilder = null

  constructor(context, sectionBuilder) {
    this.#context = context
    this.#sectionBuilder = sectionBuilder
  }

  /**
   * Register a page definition from tenant config
   * @param {string} slug
   * @param {object} definition - { title, description, sections, seo, visibility, order }
   */
  registerPage(slug, definition) {
    this.#pageDefinitions.set(slug, {
      id: definition.id || slug,
      slug,
      title: definition.title || '',
      description: definition.description || '',
      sections: definition.sections || [],
      seo: definition.seo || {},
      visibility: definition.visibility || 'public',
      order: definition.order || 0,
      createdAt: definition.createdAt || new Date().toISOString(),
      updatedAt: definition.updatedAt || new Date().toISOString(),
    })
  }

  /**
   * Register multiple pages from tenant config
   * @param {object} pagesConfig - { slug: definition }
   */
  registerPages(pagesConfig) {
    Object.entries(pagesConfig).forEach(([slug, definition]) => {
      this.registerPage(slug, definition)
    })
  }

  /**
   * Load pages from tenant configuration
   * @param {object} tenant
   */
  loadFromTenant(tenant) {
    const pages = tenant?.pages || tenant?.publicPages || {}
    this.registerPages(pages)

    if (tenant?.homePage) {
      this.registerPage('home', tenant.homePage)
    }

    if (tenant?.services) {
      tenant.services.forEach(service => {
        this.registerPage(service.slug || service.id, {
          title: service.name,
          description: service.description,
          sections: service.sections || this.#defaultServiceSections(service),
          seo: service.seo || {},
        })
      })
    }
  }

  /**
   * Build a page definition
   * @param {string} slug
   * @returns {object|null}
   */
  build(slug) {
    return this.#pageDefinitions.get(slug) || null
  }

  /**
   * Build all pages
   * @returns {object[]}
   */
  buildAll() {
    return Array.from(this.#pageDefinitions.values())
      .sort((a, b) => (a.order || 0) - (b.order || 0))
  }

  /**
   * Get page HTML
   * @param {string} slug
   * @param {object} options - { tenant }
   * @returns {string}
   */
  renderPage(slug, options = {}) {
    const page = this.build(slug)
    if (!page) return ''

    const tenant = options.tenant || this.#context?.tenant
    const sectionsHTML = page.sections
      .map(section => this.#sectionBuilder?.renderSection(section, tenant) || '')
      .join('')

    return `
      <div class="public-page public-page--${page.slug}" data-page-id="${page.id}">
        <header class="public-page__header">
          <h1 class="public-page__title">${page.title}</h1>
          ${page.description ? `<p class="public-page__description">${page.description}</p>` : ''}
        </header>
        <main class="public-page__content">
          ${sectionsHTML}
        </main>
      </div>
    `
  }

  /**
   * Get all registered slugs
   * @returns {string[]}
   */
  getSlugs() {
    return Array.from(this.#pageDefinitions.keys())
  }

  /**
   * Check if page exists
   * @param {string} slug
   * @returns {boolean}
   */
  hasPage(slug) {
    return this.#pageDefinitions.has(slug)
  }

  /**
   * Remove a page
   * @param {string} slug
   */
  removePage(slug) {
    this.#pageDefinitions.delete(slug)
  }

  /**
   * Clear all pages
   */
  clear() {
    this.#pageDefinitions.clear()
  }

  // ── Private ──

  #defaultServiceSections(service) {
    return [
      {
        type: 'hero',
        order: 0,
        title: service.name,
        content: {
          title: service.name,
          subtitle: service.description,
          image: service.image,
        },
      },
      {
        type: 'services',
        order: 1,
        title: 'Detalles',
        content: {
          items: [{
            name: service.name,
            description: service.description,
            price: service.price,
            icon: service.icon,
          }],
        },
      },
      {
        type: 'booking',
        order: 2,
        title: 'Reservar',
      },
    ]
  }
}
