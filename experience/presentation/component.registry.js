/**
 * Component Registry
 * 
 * Maps experience sections and modules to presentation components.
 * Configuration-driven, not destination-specific.
 */

export class UnknownComponentError extends Error {
  constructor(componentId) {
    super(`Unknown component: ${componentId}`)
    this.name = 'UnknownComponentError'
    this.componentId = componentId
  }
}

export class ComponentRegistry {
  #sections = new Map()
  #modules = new Map()
  #defaults = new Map()

  constructor() {
    this.#registerDefaults()
  }

  #registerDefaults() {
    this.#sections.set('hero', { id: 'hero', name: 'Hero', type: 'section' })
    this.#sections.set('search', { id: 'search', name: 'Search', type: 'section' })
    this.#sections.set('categories', { id: 'categories', name: 'Categories', type: 'section' })
    this.#sections.set('featured', { id: 'featured', name: 'Featured', type: 'section' })
    this.#sections.set('map', { id: 'map', name: 'Map', type: 'section' })
    this.#sections.set('catalog', { id: 'catalog', name: 'Catalog', type: 'section' })
    this.#sections.set('booking-form', { id: 'booking-form', name: 'Booking Form', type: 'section' })
    this.#sections.set('company-profile', { id: 'company-profile', name: 'Company Profile', type: 'section' })
    this.#sections.set('about', { id: 'about', name: 'About', type: 'section' })
    this.#sections.set('services', { id: 'services', name: 'Services', type: 'section' })
    this.#sections.set('gallery', { id: 'gallery', name: 'Gallery', type: 'section' })
    this.#sections.set('testimonials', { id: 'testimonials', name: 'Testimonials', type: 'section' })
    this.#sections.set('pricing', { id: 'pricing', name: 'Pricing', type: 'section' })
    this.#sections.set('contact', { id: 'contact', name: 'Contact', type: 'section' })
    this.#sections.set('footer', { id: 'footer', name: 'Footer', type: 'section' })
    this.#sections.set('content', { id: 'content', name: 'Content', type: 'section' })
    this.#sections.set('cta', { id: 'cta', name: 'Call to Action', type: 'section' })
    this.#sections.set('quote', { id: 'quote', name: 'Quote', type: 'section' })

    this.#modules.set('reservations', { id: 'reservations', name: 'Reservations', type: 'module' })
    this.#modules.set('availability', { id: 'availability', name: 'Availability', type: 'module' })
    this.#modules.set('gallery', { id: 'gallery', name: 'Gallery', type: 'module' })
    this.#modules.set('media', { id: 'media', name: 'Media', type: 'module' })
    this.#modules.set('maps', { id: 'maps', name: 'Maps', type: 'module' })
    this.#modules.set('notifications', { id: 'notifications', name: 'Notifications', type: 'module' })
    this.#modules.set('ecommerce', { id: 'ecommerce', name: 'E-commerce', type: 'module' })
    this.#modules.set('payments', { id: 'payments', name: 'Payments', type: 'module' })
    this.#modules.set('inventory', { id: 'inventory', name: 'Inventory', type: 'module' })
    this.#modules.set('blog', { id: 'blog', name: 'Blog', type: 'module' })
    this.#modules.set('analytics', { id: 'analytics', name: 'Analytics', type: 'module' })
    this.#modules.set('pwa', { id: 'pwa', name: 'PWA', type: 'module' })

    this.#defaults.set('section', { id: 'unknown-section', name: 'Unknown Section', type: 'section' })
    this.#defaults.set('module', { id: 'unknown-module', name: 'Unknown Module', type: 'module' })
  }

  registerSection(id, component) {
    if (!id || typeof id !== 'string') {
      throw new Error('Section ID must be a non-empty string')
    }
    this.#sections.set(id, { id, ...component, type: 'section' })
    return this
  }

  registerModule(id, component) {
    if (!id || typeof id !== 'string') {
      throw new Error('Module ID must be a non-empty string')
    }
    this.#modules.set(id, { id, ...component, type: 'module' })
    return this
  }

  getSection(id) {
    if (!this.#sections.has(id)) {
      return this.#defaults.get('section')
    }
    return this.#sections.get(id)
  }

  getModule(id) {
    if (!this.#modules.has(id)) {
      return this.#defaults.get('module')
    }
    return this.#modules.get(id)
  }

  hasSection(id) {
    return this.#sections.has(id)
  }

  hasModule(id) {
    return this.#modules.has(id)
  }

  getSections(ids) {
    if (!Array.isArray(ids)) {
      return []
    }
    return ids.map(id => this.getSection(id)).filter(s => s)
  }

  getModules(ids) {
    if (!Array.isArray(ids)) {
      return []
    }
    return ids.map(id => this.getModule(id)).filter(m => m)
  }

  getAllSections() {
    return Array.from(this.#sections.values())
  }

  getAllModules() {
    return Array.from(this.#modules.values())
  }

  resolve(componentId) {
    if (this.#sections.has(componentId)) {
      return this.getSection(componentId)
    }
    if (this.#modules.has(componentId)) {
      return this.getModule(componentId)
    }
    return null
  }

  isSection(componentId) {
    return this.#sections.has(componentId)
  }

  isModule(componentId) {
    return this.#modules.has(componentId)
  }

  clear() {
    this.#sections.clear()
    this.#modules.clear()
    return this
  }

  get size() {
    return {
      sections: this.#sections.size,
      modules: this.#modules.size
    }
  }
}

export default ComponentRegistry
