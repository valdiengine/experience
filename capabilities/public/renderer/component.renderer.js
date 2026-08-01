/**
 * Component Renderer — Bridges Public Capability with Experience Engine components
 *
 * Business-agnostic: maps component configs to engine/components/ instances
 * No duplication — uses existing gallery, carousel, lightbox, configurator, expanded-view
 */
export class ComponentRenderer {
  #context = null
  #engineComponents = null

  constructor(context) {
    this.#context = context
  }

  init() {
    this.#engineComponents = this.#context?.capabilities?.get?.('experience')?.components
  }

  /**
   * Render a single component
   * @param {HTMLElement} container
   * @param {object} config - { type, config }
   * @param {object} options - { tenant }
   */
  render(container, config, options = {}) {
    if (!container || !config) return

    const tenant = options.tenant || this.#context?.tenant
    const componentType = config.type

    switch (componentType) {
      case 'gallery':
        this.#renderGallery(container, config.config || {}, tenant)
        break
      case 'carousel':
        this.#renderCarousel(container, config.config || {}, tenant)
        break
      case 'lightbox':
        this.#renderLightbox(container, config.config || {}, tenant)
        break
      case 'configurator':
        this.#renderConfigurator(container, config.config || {}, tenant)
        break
      case 'expanded-view':
        this.#renderExpandedView(container, config.config || {}, tenant)
        break
      case 'format-explorer':
        this.#renderFormatExplorer(container, config.config || {}, tenant)
        break
      case 'card':
        this.#renderCard(container, config.config || {}, tenant)
        break
      default:
        this.#renderUnknown(container, config)
    }
  }

  /**
   * Render multiple components
   * @param {HTMLElement} container
   * @param {object[]} components
   * @param {object} options
   */
  renderAll(container, components, options = {}) {
    components.forEach(comp => {
      const wrapper = document.createElement('div')
      wrapper.className = `public-component public-component--${comp.type}`
      wrapper.dataset.component = comp.type
      this.render(wrapper, comp, options)
      container.appendChild(wrapper)
    })
  }

  /**
   * Initialize components within a page
   * Finds all [data-component] and initializes them
   * @param {HTMLElement} container
   * @param {object} options
   */
  initializeAll(container, options = {}) {
    container.querySelectorAll('[data-component]').forEach(el => {
      const type = el.dataset.component
      const config = JSON.parse(el.dataset.config || '{}')
      this.render(el, { type, config }, options)
    })
  }

  #renderGallery(container, config, tenant) {
    if (this.#engineComponents?.gallery) {
      this.#engineComponents.gallery.render(container, {
        items: config.items || [],
        layout: config.layout || 'grid',
        columns: config.columns || 3,
      })
    } else {
      container.innerHTML = this.#galleryHTML(config)
    }
  }

  #renderCarousel(container, config, tenant) {
    if (this.#engineComponents?.carousel) {
      this.#engineComponents.carousel.render(container, {
        items: config.items || [],
        autoplay: config.autoplay || false,
        interval: config.interval || 5000,
      })
    } else {
      container.innerHTML = this.#carouselHTML(config)
    }
  }

  #renderLightbox(container, config, tenant) {
    if (this.#engineComponents?.lightbox) {
      this.#engineComponents.lightbox.attach(container, {
        images: config.images || [],
      })
    }
  }

  #renderConfigurator(container, config, tenant) {
    if (this.#engineComponents?.configurator) {
      this.#engineComponents.configurator.render(container, {
        services: config.services || [],
        date: config.date,
        tenant,
      })
    } else {
      container.innerHTML = '<div class="config-placeholder">Selecciona un servicio</div>'
    }
  }

  #renderExpandedView(container, config, tenant) {
    if (this.#engineComponents?.['expanded-view']) {
      this.#engineComponents['expanded-view'].render(container, config)
    }
  }

  #renderFormatExplorer(container, config, tenant) {
    if (this.#engineComponents?.['format-explorer']) {
      this.#engineComponents['format-explorer'].render(container, config)
    }
  }

  #renderCard(container, config, tenant) {
    if (this.#engineComponents?.card) {
      this.#engineComponents.card.render(container, config)
    } else {
      container.innerHTML = this.#cardHTML(config)
    }
  }

  #renderUnknown(container, config) {
    container.innerHTML = `<div class="public-component--unknown">Component: ${config.type}</div>`
  }

  // ── Fallback HTML ──

  #galleryHTML(config) {
    const items = config.items || []
    return `
      <div class="public-gallery public-gallery--${config.layout || 'grid'}">
        ${items.map(item => `
          <div class="public-gallery__item">
            <img src="${item.thumb || item.src}" alt="${item.alt || ''}" loading="lazy" />
          </div>
        `).join('')}
      </div>
    `
  }

  #carouselHTML(config) {
    const items = config.items || []
    return `
      <div class="public-carousel">
        <div class="public-carousel__track">
          ${items.map(item => `
            <div class="public-carousel__slide">
              ${item.image ? `<img src="${item.image}" alt="${item.alt || ''}" />` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `
  }

  #cardHTML(config) {
    return `
      <div class="public-card">
        ${config.image ? `<img class="public-card__image" src="${config.image}" alt="${config.title || ''}" />` : ''}
        ${config.title ? `<h3 class="public-card__title">${config.title}</h3>` : ''}
        ${config.description ? `<p class="public-card__description">${config.description}</p>` : ''}
      </div>
    `
  }
}
