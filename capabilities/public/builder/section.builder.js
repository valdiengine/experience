/**
 * Section Builder — Renders individual sections for dynamic pages
 *
 * Business-agnostic: renders section types from configuration
 * Works with PageBuilder for dynamic landing pages
 */
export class SectionBuilder {
  #context = null

  constructor(context) {
    this.#context = context
  }

  /**
   * Render a section to HTML
   * @param {object} section - { type, title, content, order }
   * @param {object} tenant
   * @returns {string}
   */
  renderSection(section, tenant) {
    if (!section) return ''

    const content = section.content || {}
    const title = section.title ? `<h2 class="public-section__title">${section.title}</h2>` : ''

    switch (section.type) {
      case 'hero':
        return this.#renderHero(section, tenant)
      case 'services':
        return this.#renderServices(content, title)
      case 'gallery':
        return this.#renderGallery(content, title)
      case 'testimonials':
        return this.#renderTestimonials(content, title)
      case 'contact':
        return this.#renderContact(content, title, tenant)
      case 'pricing':
        return this.#renderPricing(content, title)
      case 'faq':
        return this.#renderFAQ(content, title)
      case 'booking':
        return this.#renderBooking(content, title)
      case 'map':
        return this.#renderMap(content, title)
      case 'about':
        return this.#renderAbout(content, title)
      case 'carousel':
        return this.#renderCarousel(content, title)
      case 'custom':
        return this.#renderCustom(content, title)
      default:
        return this.#renderCustom(content, title)
    }
  }

  /**
   * Render multiple sections
   * @param {object[]} sections
   * @param {object} tenant
   * @returns {string}
   */
  renderSections(sections, tenant) {
    return sections
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(section => this.renderSection(section, tenant))
      .join('')
  }

  // ── Section Renderers ──

  #renderHero(section, tenant) {
    const content = section.content || {}
    return `
      <section class="public-section public-section--hero">
        <div class="public-hero">
          ${content.image ? `<img class="public-hero__image" src="${content.image}" alt="${content.alt || ''}" />` : ''}
          <div class="public-hero__overlay"></div>
          <div class="public-hero__content">
            ${content.title ? `<h1 class="public-hero__title">${content.title}</h1>` : ''}
            ${content.subtitle ? `<p class="public-hero__subtitle">${content.subtitle}</p>` : ''}
            ${content.cta ? `<button class="public-hero__cta" data-action="${content.cta.action || 'book'}">${content.cta.label || 'Reservar'}</button>` : ''}
          </div>
        </div>
      </section>
    `
  }

  #renderServices(content, title) {
    const items = content.items || []
    return `
      <section class="public-section public-section--services">
        ${title}
        <div class="public-services">
          ${items.map(item => `
            <div class="public-services__item">
              ${item.icon ? `<div class="public-services__icon">${item.icon}</div>` : ''}
              <h3 class="public-services__name">${item.name || ''}</h3>
              <p class="public-services__description">${item.description || ''}</p>
              ${item.price ? `<span class="public-services__price">${item.price}</span>` : ''}
            </div>
          `).join('')}
        </div>
      </section>
    `
  }

  #renderGallery(content, title) {
    const items = content.items || []
    return `
      <section class="public-section public-section--gallery">
        ${title}
        <div class="public-gallery">
          ${items.map(item => `
            <div class="public-gallery__item" data-lightbox="${item.src}">
              <img src="${item.thumb || item.src}" alt="${item.alt || ''}" loading="lazy" />
            </div>
          `).join('')}
        </div>
      </section>
    `
  }

  #renderTestimonials(content, title) {
    const items = content.items || []
    return `
      <section class="public-section public-section--testimonials">
        ${title}
        <div class="public-testimonials">
          ${items.map(item => `
            <div class="public-testimonials__item">
              <blockquote class="public-testimonials__quote">"${item.quote || ''}"</blockquote>
              <cite class="public-testimonials__author">${item.author || ''}</cite>
              ${item.rating ? `<div class="public-testimonials__rating">${'★'.repeat(item.rating)}</div>` : ''}
            </div>
          `).join('')}
        </div>
      </section>
    `
  }

  #renderContact(content, title, tenant) {
    const info = content || tenant?.contact || {}
    return `
      <section class="public-section public-section--contact">
        ${title}
        <div class="public-contact">
          ${info.email ? `<div class="public-contact__item">📧 ${info.email}</div>` : ''}
          ${info.phone ? `<div class="public-contact__item">📞 ${info.phone}</div>` : ''}
          ${info.address ? `<div class="public-contact__item">📍 ${info.address}</div>` : ''}
          ${info.hours ? `<div class="public-contact__item">🕐 ${info.hours}</div>` : ''}
        </div>
      </section>
    `
  }

  #renderPricing(content, title) {
    const items = content.items || []
    return `
      <section class="public-section public-section--pricing">
        ${title}
        <div class="public-pricing">
          ${items.map(item => `
            <div class="public-pricing__item ${item.featured ? 'public-pricing__item--featured' : ''}">
              <h3 class="public-pricing__name">${item.name || ''}</h3>
              <div class="public-pricing__price">${item.price || ''}</div>
              <ul class="public-pricing__features">
                ${(item.features || []).map(f => `<li>${f}</li>`).join('')}
              </ul>
            </div>
          `).join('')}
        </div>
      </section>
    `
  }

  #renderFAQ(content, title) {
    const items = content.items || []
    return `
      <section class="public-section public-section--faq">
        ${title}
        <div class="public-faq">
          ${items.map(item => `
            <details class="public-faq__item">
              <summary class="public-faq__question">${item.question || ''}</summary>
              <div class="public-faq__answer">${item.answer || ''}</div>
            </details>
          `).join('')}
        </div>
      </section>
    `
  }

  #renderBooking(content, title) {
    return `
      <section class="public-section public-section--booking">
        ${title}
        <div class="public-booking">
          <div class="public-booking__form" data-component="configurator"></div>
        </div>
      </section>
    `
  }

  #renderMap(content, title) {
    return `
      <section class="public-section public-section--map">
        ${title}
        <div class="public-map" data-lat="${content.lat || 0}" data-lng="${content.lng || 0}"></div>
      </section>
    `
  }

  #renderAbout(content, title) {
    return `
      <section class="public-section public-section--about">
        ${title}
        <div class="public-about">
          ${content.image ? `<img class="public-about__image" src="${content.image}" alt="${content.alt || ''}" />` : ''}
          <div class="public-about__text">${content.text || ''}</div>
        </div>
      </section>
    `
  }

  #renderCarousel(content, title) {
    const items = content.items || []
    return `
      <section class="public-section public-section--carousel">
        ${title}
        <div class="public-carousel">
          <div class="public-carousel__track">
            ${items.map(item => `
              <div class="public-carousel__slide">
                ${item.image ? `<img src="${item.image}" alt="${item.alt || ''}" />` : ''}
                ${item.text ? `<div class="public-carousel__text">${item.text}</div>` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      </section>
    `
  }

  #renderCustom(content, title) {
    return `
      <section class="public-section public-section--custom">
        ${title}
        <div class="public-section__content">
          ${content.html || ''}
        </div>
      </section>
    `
  }
}
