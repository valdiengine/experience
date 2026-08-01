/**
 * Section Renderer — Renders individual section types
 *
 * Business-agnostic: handles hero, gallery, carousel, services, booking, etc.
 * Delegates to Experience Engine components — no duplication
 */
export class SectionRenderer {
  #context = null
  #componentRenderer = null

  constructor(context, componentRenderer) {
    this.#context = context
    this.#componentRenderer = componentRenderer
  }

  /**
   * Render a section by type
   * @param {object} section - { type, title, content, components }
   * @param {object} options - { tenant }
   * @returns {HTMLElement}
   */
  render(section, options = {}) {
    const tenant = options.tenant || this.#context?.tenant
    const el = document.createElement('section')
    el.className = `public-section public-section--${section.type}`
    el.dataset.sectionType = section.type

    const content = this.#renderContent(section, tenant)
    el.appendChild(content)

    return el
  }

  /**
   * Render all sections into a container
   * @param {HTMLElement} container
   * @param {object[]} sections
   * @param {object} options
   */
  renderAll(container, sections, options = {}) {
    const sorted = [...sections].sort((a, b) => (a.order || 0) - (b.order || 0))
    sorted.forEach(section => {
      const el = this.render(section, options)
      container.appendChild(el)
    })
  }

  // ── Content Rendering by Type ──

  #renderContent(section, tenant) {
    const wrapper = document.createElement('div')
    wrapper.className = 'public-section__content'

    if (section.title) {
      const title = document.createElement('h2')
      title.className = 'public-section__title'
      title.textContent = section.title
      wrapper.appendChild(title)
    }

    switch (section.type) {
      case 'hero':
        this.#renderHero(wrapper, section, tenant)
        break
      case 'gallery':
        this.#renderGallery(wrapper, section, tenant)
        break
      case 'carousel':
        this.#renderCarousel(wrapper, section, tenant)
        break
      case 'services':
        this.#renderServices(wrapper, section, tenant)
        break
      case 'booking':
        this.#renderBooking(wrapper, section, tenant)
        break
      case 'testimonials':
        this.#renderTestimonials(wrapper, section, tenant)
        break
      case 'contact':
        this.#renderContact(wrapper, section, tenant)
        break
      case 'map':
        this.#renderMap(wrapper, section, tenant)
        break
      case 'about':
        this.#renderAbout(wrapper, section, tenant)
        break
      case 'pricing':
        this.#renderPricing(wrapper, section, tenant)
        break
      case 'faq':
        this.#renderFAQ(wrapper, section, tenant)
        break
      default:
        this.#renderCustom(wrapper, section, tenant)
    }

    if (section.components?.length) {
      this.#componentRenderer?.renderAll(wrapper, section.components, { tenant })
    }

    return wrapper
  }

  #renderHero(wrapper, section, tenant) {
    const hero = section.content || {}
    wrapper.innerHTML += `
      <div class="public-hero">
        ${hero.image ? `<img class="public-hero__image" src="${hero.image}" alt="${hero.alt || ''}" />` : ''}
        <div class="public-hero__overlay"></div>
        <div class="public-hero__content">
          ${hero.title ? `<h1 class="public-hero__title">${hero.title}</h1>` : ''}
          ${hero.subtitle ? `<p class="public-hero__subtitle">${hero.subtitle}</p>` : ''}
          ${hero.cta ? `<button class="public-hero__cta" data-action="${hero.cta.action || 'book'}">${hero.cta.label || 'Reservar'}</button>` : ''}
        </div>
      </div>
    `
  }

  #renderGallery(wrapper, section, tenant) {
    const items = section.content?.items || []
    wrapper.innerHTML += `
      <div class="public-gallery" data-lightbox-enabled="true">
        ${items.map(item => `
          <div class="public-gallery__item" data-lightbox="${item.src}">
            <img src="${item.thumb || item.src}" alt="${item.alt || ''}" loading="lazy" />
          </div>
        `).join('')}
      </div>
    `
  }

  #renderCarousel(wrapper, section, tenant) {
    const items = section.content?.items || []
    wrapper.innerHTML += `
      <div class="public-carousel" data-autoplay="${section.content?.autoplay || false}">
        <div class="public-carousel__track">
          ${items.map(item => `
            <div class="public-carousel__slide">
              ${item.image ? `<img src="${item.image}" alt="${item.alt || ''}" />` : ''}
              ${item.text ? `<div class="public-carousel__text">${item.text}</div>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `
  }

  #renderServices(wrapper, section, tenant) {
    const items = section.content?.items || []
    wrapper.innerHTML += `
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
    `
  }

  #renderBooking(wrapper, section, tenant) {
    wrapper.innerHTML += `
      <div class="public-booking">
        <div class="public-booking__form" data-component="configurator"></div>
      </div>
    `
  }

  #renderTestimonials(wrapper, section, tenant) {
    const items = section.content?.items || []
    wrapper.innerHTML += `
      <div class="public-testimonials">
        ${items.map(item => `
          <div class="public-testimonials__item">
            <blockquote class="public-testimonials__quote">"${item.quote || ''}"</blockquote>
            <cite class="public-testimonials__author">${item.author || ''}</cite>
            ${item.rating ? `<div class="public-testimonials__rating">${'★'.repeat(item.rating)}</div>` : ''}
          </div>
        `).join('')}
      </div>
    `
  }

  #renderContact(wrapper, section, tenant) {
    const info = section.content || {}
    wrapper.innerHTML += `
      <div class="public-contact">
        ${info.email ? `<div class="public-contact__item">📧 ${info.email}</div>` : ''}
        ${info.phone ? `<div class="public-contact__item">📞 ${info.phone}</div>` : ''}
        ${info.address ? `<div class="public-contact__item">📍 ${info.address}</div>` : ''}
        ${info.hours ? `<div class="public-contact__item">🕐 ${info.hours}</div>` : ''}
      </div>
    `
  }

  #renderMap(wrapper, section, tenant) {
    const coords = section.content || {}
    wrapper.innerHTML += `
      <div class="public-map" data-lat="${coords.lat || 0}" data-lng="${coords.lng || 0}"></div>
    `
  }

  #renderAbout(wrapper, section, tenant) {
    const content = section.content || {}
    wrapper.innerHTML += `
      <div class="public-about">
        ${content.image ? `<img class="public-about__image" src="${content.image}" alt="${content.alt || ''}" />` : ''}
        <div class="public-about__text">${content.text || ''}</div>
      </div>
    `
  }

  #renderPricing(wrapper, section, tenant) {
    const items = section.content?.items || []
    wrapper.innerHTML += `
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
    `
  }

  #renderFAQ(wrapper, section, tenant) {
    const items = section.content?.items || []
    wrapper.innerHTML += `
      <div class="public-faq">
        ${items.map(item => `
          <details class="public-faq__item">
            <summary class="public-faq__question">${item.question || ''}</summary>
            <div class="public-faq__answer">${item.answer || ''}</div>
          </details>
        `).join('')}
      </div>
    `
  }

  #renderCustom(wrapper, section, tenant) {
    const html = section.content?.html || ''
    wrapper.innerHTML += html
  }
}
