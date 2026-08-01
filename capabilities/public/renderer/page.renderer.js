/**
 * Page Renderer — Renders complete public pages
 *
 * Business-agnostic: renders page → sections → components
 * Uses Experience Engine components — no duplication
 */
import { PUBLIC_EVENTS } from '../public.events.js'

export class PageRenderer {
  #context = null
  #renderedPages = new Map()

  constructor(context) {
    this.#context = context
  }

  /**
   * Render a page into a container
   * @param {HTMLElement} container
   * @param {object} page - { id, slug, title, description, sections, seo }
   * @param {object} options - { tenant }
   * @returns {Promise<void>}
   */
  async render(container, page, options = {}) {
    if (!container || !page) return

    const tenant = options.tenant || this.#context?.tenant
    const html = this.#buildPageHTML(page, tenant)

    container.innerHTML = html
    this.#renderedPages.set(page.id, { page, container, timestamp: Date.now() })

    this.#applySEO(page.seo)
    this.#bindPageEvents(container, page)

    this.#context?.eventBus?.emit(PUBLIC_EVENTS.PAGE_RENDERED, {
      pageId: page.id,
      slug: page.slug,
    })
  }

  /**
   * Render page into document body
   * @param {object} page
   */
  async renderFull(page) {
    const container = document.body
    if (!container) return
    await this.render(container, page)
  }

  /**
   * Update page sections
   * @param {string} pageId
   * @param {object[]} sections
   */
  updateSections(pageId, sections) {
    const entry = this.#renderedPages.get(pageId)
    if (entry) {
      entry.page.sections = sections
      this.render(entry.container, entry.page)
    }
  }

  /**
   * Get rendered page info
   * @param {string} pageId
   * @returns {object|null}
   */
  getRenderedPage(pageId) {
    return this.#renderedPages.get(pageId) || null
  }

  /**
   * Clear all rendered pages
   */
  clear() {
    this.#renderedPages.clear()
  }

  // ── HTML Building ──

  #buildPageHTML(page, tenant) {
    const sections = (page.sections || [])
      .sort((a, b) => (a.order || 0) - (b.order || 0))

    const sectionsHTML = sections
      .map(section => this.#buildSectionHTML(section, tenant))
      .join('')

    return `
      <div class="public-page public-page--${page.slug}" data-page-id="${page.id}">
        <header class="public-page__header">
          <h1 class="public-page__title">${page.title || ''}</h1>
          ${page.description ? `<p class="public-page__description">${page.description}</p>` : ''}
        </header>
        <main class="public-page__content">
          ${sectionsHTML}
        </main>
      </div>
    `
  }

  #buildSectionHTML(section, tenant) {
    const components = (section.components || [])
      .map(comp => this.#buildComponentHTML(comp, tenant))
      .join('')

    return `
      <section class="public-section public-section--${section.type}" data-section-type="${section.type}">
        ${section.title ? `<h2 class="public-section__title">${section.title}</h2>` : ''}
        <div class="public-section__content">
          ${section.content?.html || ''}
          ${components}
        </div>
      </section>
    `
  }

  #buildComponentHTML(component, tenant) {
    const engine = this.#context?.capabilities?.get?.('experience')
    if (engine && engine.components) {
      const componentType = component.type
      if (engine.components[componentType]) {
        return `<div class="public-component public-component--${componentType}" data-component="${componentType}"></div>`
      }
    }

    return `
      <div class="public-component public-component--${component.type || 'unknown'}"
           data-component="${component.type || 'unknown'}"
           data-config='${JSON.stringify(component.config || {})}'>
      </div>
    `
  }

  // ── SEO ──

  #applySEO(seo) {
    if (!seo) return

    if (seo.title) {
      document.title = seo.title
      this.#setMeta('og:title', seo.ogTitle || seo.title)
      this.#setMeta('twitter:title', seo.ogTitle || seo.title)
    }

    if (seo.description) {
      this.#setMeta('description', seo.description)
      this.#setMeta('og:description', seo.ogDescription || seo.description)
      this.#setMeta('twitter:description', seo.ogDescription || seo.description)
    }

    if (seo.ogImage) {
      this.#setMeta('og:image', seo.ogImage)
    }

    if (seo.canonical) {
      this.#setLink('canonical', seo.canonical)
    }

    if (seo.jsonLd) {
      this.#setJsonLd(seo.jsonLd)
    }
  }

  #setMeta(name, content) {
    let meta = document.querySelector(`meta[property="${name}"], meta[name="${name}"]`)
    if (!meta) {
      meta = document.createElement('meta')
      if (name.startsWith('og:')) {
        meta.setAttribute('property', name)
      } else {
        meta.setAttribute('name', name)
      }
      document.head.appendChild(meta)
    }
    meta.setAttribute('content', content)
  }

  #setLink(rel, href) {
    let link = document.querySelector(`link[rel="${rel}"]`)
    if (!link) {
      link = document.createElement('link')
      link.rel = rel
      document.head.appendChild(link)
    }
    link.href = href
  }

  #setJsonLd(data) {
    let script = document.querySelector('script[type="application/ld+json"]')
    if (!script) {
      script = document.createElement('script')
      script.type = 'application/ld+json'
      document.head.appendChild(script)
    }
    script.textContent = JSON.stringify(data)
  }

  // ── Events ──

  #bindPageEvents(container, page) {
    container.querySelectorAll('[data-action]').forEach(el => {
      el.addEventListener('click', (e) => {
        const action = e.currentTarget.dataset.action
        this.#context?.eventBus?.emit(PUBLIC_EVENTS.MENU_CLICKED, { action, pageId: page.id })
      })
    })
  }
}
