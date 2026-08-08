/**
 * Experience Loader
 * 
 * Loads experience-specific configuration.
 * Resolves the experience type and template.
 */

import { ExperienceNotFoundError } from '../experience.errors.js'

export class ExperienceLoader {
  #config = null
  #experienceRegistry = null

  constructor(config = {}) {
    this.#config = { ...config }
    this.#experienceRegistry = new Map()
  }

  get name() {
    return 'experience'
  }

  async initialize(config) {
    this.#config = { ...this.#config, ...config }
    this.#initializeExperienceRegistry()
    return true
  }

  #initializeExperienceRegistry() {
    this.#experienceRegistry.clear()

    const experiences = {
      'tourism-directory': {
        id: 'tourism-directory',
        name: 'Tourism Directory',
        type: 'directory',
        description: 'Directory of tourism businesses and services',
        sections: ['hero', 'search', 'categories', 'featured', 'map', 'footer'],
        components: ['search-bar', 'category-grid', 'business-list', 'map-view', 'contact-form'],
        modules: ['reservations', 'availability', 'gallery', 'maps', 'notifications']
      },
      'tourism-booking': {
        id: 'tourism-booking',
        name: 'Tourism Booking',
        type: 'booking',
        description: 'Complete booking experience for tours and services',
        sections: ['hero', 'catalog', 'booking-form', 'confirmation', 'footer'],
        components: ['hero-carousel', 'service-catalog', 'booking-wizard', 'payment-form', 'confirmation'],
        modules: ['reservations', 'availability', 'payments', 'notifications', 'gallery', 'maps']
      },
      'company-profile': {
        id: 'company-profile',
        name: 'Company Profile',
        type: 'profile',
        description: 'Business profile with services and contact',
        sections: ['hero', 'about', 'services', 'gallery', 'testimonials', 'contact', 'footer'],
        components: ['hero', 'about-section', 'service-grid', 'gallery', 'testimonial-slider', 'contact-form'],
        modules: ['reservations', 'gallery', 'media', 'notifications']
      },
      'ecommerce': {
        id: 'ecommerce',
        name: 'E-commerce',
        type: 'commerce',
        description: 'Product catalog with shopping cart and checkout',
        sections: ['hero', 'catalog', 'product-detail', 'cart', 'checkout', 'footer'],
        components: ['product-grid', 'product-detail', 'shopping-cart', 'checkout-form', 'payment'],
        modules: ['ecommerce', 'payments', 'inventory', 'notifications']
      },
      'default': {
        id: 'default',
        name: 'Default Experience',
        type: 'general',
        description: 'Generic experience template',
        sections: ['hero', 'content', 'footer'],
        components: ['hero', 'content-block', 'footer'],
        modules: ['gallery', 'media', 'notifications']
      }
    }

    for (const [id, experience] of Object.entries(experiences)) {
      this.#experienceRegistry.set(id, experience)
    }
  }

  async load(context) {
    if (!context || !context.config) {
      throw new ExperienceNotFoundError('Invalid context', { context })
    }

    try {
      const destinationConfig = context.config.destination || context.destination || {}
      const companyConfig = context.config.company || context.company || {}
      
      const experienceType = this.#resolveExperienceType(destinationConfig, companyConfig)
      const experience = this.#resolveExperience(experienceType, destinationConfig)
      
      const experienceConfig = {
        ...experience,
        destination: destinationConfig.slug || context.destination?.slug,
        company: companyConfig.slug || context.company?.slug,
        resolvedAt: new Date().toISOString()
      }

      return experienceConfig
    } catch (error) {
      throw new ExperienceNotFoundError(`Failed to load experience: ${error.message}`, {
        error: error.message,
        context
      })
    }
  }

  #resolveExperienceType(destinationConfig, companyConfig) {
    if (destinationConfig.experienceType) {
      return destinationConfig.experienceType
    }

    if (destinationConfig.type) {
      const type = destinationConfig.type
      if (type === 'tourism-platform' || type === 'tourism-directory' || type === 'tourism') {
        return 'tourism-directory'
      }
      if (type === 'tourism-booking' || type === 'booking') {
        return 'tourism-booking'
      }
      if (type === 'commerce' || type === 'ecommerce' || type === 'shop') {
        return 'ecommerce'
      }
      return type
    }

    const destination = destinationConfig.slug || destinationConfig.name || ''
    const company = companyConfig.slug || companyConfig.name || ''

    if (destination.includes('tourism') || destination.includes('travel')) {
      return 'tourism-directory'
    }

    if (destination.includes('booking') || destination.includes('reserv')) {
      return 'tourism-booking'
    }

    if (company.includes('shop') || company.includes('store') || company.includes('mart')) {
      return 'ecommerce'
    }

    return 'default'
  }

  #resolveExperience(experienceType, destinationConfig) {
    const experience = this.#experienceRegistry.get(experienceType)

    if (!experience) {
      return this.#experienceRegistry.get('default')
    }

    if (destinationConfig.experience) {
      return {
        ...experience,
        ...destinationConfig.experience
      }
    }

    return experience
  }

  async healthCheck() {
    return {
      status: 'ok',
      name: 'ExperienceLoader',
      experiencesRegistered: this.#experienceRegistry.size
    }
  }

  async stop() {
    this.#experienceRegistry.clear()
    return true
  }

  registerExperience(id, experience) {
    this.#experienceRegistry.set(id, experience)
  }

  getExperiences() {
    return new Map(this.#experienceRegistry)
  }
}

export default ExperienceLoader
