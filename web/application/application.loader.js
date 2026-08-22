/**
 * Application Configuration Loader
 *
 * P15.8.1 - Application Configuration Model
 *
 * Loads and validates Application Configuration from route data.
 * Produces immutable, normalized Application Configuration objects.
 *
 * This is NOT a replacement for RouteOwnershipRegistry.
 * It consumes route data and produces Application Configuration.
 *
 * Framework-free implementation.
 */

import {
  ApplicationIdentity,
  createApplicationIdentity,
  CANONICAL_DOMAINS,
  DESTINATION_MAP,
  DESTINATION_REGIONS
} from './application.identity.js'

import {
  createApplicationConfig,
  EXPERIENCE_TYPES,
  CONTENT_SOURCES,
  MIGRATION_STATES,
  DEFAULT_CAPABILITIES
} from './application.schema.js'

import {
  ApplicationValidator,
  validateApplicationConfig
} from './application.validator.js'

export class ApplicationConfigLoader {
  #validator
  #strict

  constructor(options = {}) {
    this.#validator = new ApplicationValidator(options)
    this.#strict = options.strict === true
  }

  loadFromRoute(domain, route, routeData = {}) {
    const identity = this.#loadIdentity(domain, route)
    const config = this.#loadConfig(identity, routeData)
    return this.#finalize(identity, config)
  }

  #loadIdentity(domain, route) {
    try {
      return createApplicationIdentity(domain, route)
    } catch (error) {
      throw new Error(`Invalid application identity: ${error.message}`)
    }
  }

  #loadConfig(identity, routeData) {
    const data = {
      identity: {
        domain: identity.domain,
        route: identity.route,
        applicationId: identity.applicationId
      },
      destination: {
        slug: identity.destination,
        region: identity.region,
        experienceType: routeData.experienceType || null,
        categories: routeData.categories || null,
        featured: routeData.featured || null,
        contact: routeData.contact || null,
        branding: routeData.branding || null
      },
      company: this.#loadCompany(routeData),
      experience: this.#loadExperience(routeData),
      capabilities: this.#loadCapabilities(routeData),
      theme: this.#loadTheme(routeData),
      content: this.#loadContent(routeData),
      seo: this.#loadSeo(routeData),
      integrations: this.#loadIntegrations(routeData),
      migration: this.#loadMigration(routeData),
      navigation: this.#loadNavigation(routeData),
      contact: this.#loadContact(routeData)
    }

    return createApplicationConfig(data)
  }

  #loadCompany(routeData) {
    if (!routeData.company) {
      return { slug: null, enabled: false }
    }
    if (typeof routeData.company === 'string') {
      return {
        slug: routeData.company,
        enabled: true
      }
    }
    if (typeof routeData.company === 'object' && routeData.company !== null) {
      return {
        slug: routeData.company.slug || null,
        enabled: routeData.company.enabled !== false
      }
    }
    return { slug: null, enabled: false }
  }

  #loadExperience(routeData) {
    const type = routeData.experience?.type || routeData.experienceType || null
    if (!type) {
      return { type: null }
    }
    if (!EXPERIENCE_TYPES.includes(type)) {
      return { type: null }
    }
    return { type }
  }

  #loadCapabilities(routeData) {
    if (routeData.capabilities && typeof routeData.capabilities === 'object') {
      const caps = {}
      for (const [key, value] of Object.entries(routeData.capabilities)) {
        if (typeof value === 'boolean') {
          caps[key] = value
        } else if (typeof value === 'object' && value !== null) {
          caps[key] = { ...value }
        } else {
          caps[key] = true
        }
      }
      return caps
    }
    return {}
  }

  #loadTheme(routeData) {
    if (!routeData.theme) {
      return {}
    }
    return {
      branding: routeData.theme.branding ? { ...routeData.theme.branding } : null,
      primaryColor: routeData.theme.primaryColor || null,
      fontFamily: routeData.theme.fontFamily || null,
      additional: routeData.theme.additional ? { ...routeData.theme.additional } : null
    }
  }

  #loadContent(routeData) {
    const source = routeData.contentSource || routeData.content?.source || 'wordpress'
    if (!CONTENT_SOURCES.includes(source)) {
      return { source: 'wordpress' }
    }
    return {
      source,
      configuration: routeData.content?.configuration ? { ...routeData.content.configuration } : null
    }
  }

  #loadSeo(routeData) {
    if (!routeData.seo) {
      return {}
    }
    return {
      title: routeData.seo.title || null,
      description: routeData.seo.description || null,
      canonical: routeData.seo.canonical || null,
      robots: routeData.seo.robots || null,
      openGraph: routeData.seo.openGraph ? { ...routeData.seo.openGraph } : null,
      twitter: routeData.seo.twitter ? { ...routeData.seo.twitter } : null,
      structuredData: routeData.seo.structuredData ? { ...routeData.seo.structuredData } : null
    }
  }

  #loadIntegrations(routeData) {
    if (!routeData.integrations || typeof routeData.integrations !== 'object') {
      return {}
    }
    const allowed = ['whatsapp', 'maps', 'booking', 'payments', 'social', 'notifications', 'analytics']
    const result = {}
    for (const [key, value] of Object.entries(routeData.integrations)) {
      if (allowed.includes(key) && typeof value === 'object' && value !== null) {
        result[key] = { ...value, enabled: value.enabled !== false }
      }
    }
    return result
  }

  #loadMigration(routeData) {
    const state = routeData.migrationState || routeData.migration?.state || 'LEGACY'
    if (!MIGRATION_STATES.includes(state)) {
      return { state: 'LEGACY' }
    }
    return {
      state,
      ownership: routeData.ownership || null
    }
  }

  #loadNavigation(routeData) {
    if (routeData.navigation && typeof routeData.navigation === 'object') {
      return { ...routeData.navigation }
    }
    return {
      header: { items: [] },
      footer: { columns: [] }
    }
  }

  #loadContact(routeData) {
    if (routeData.contact && typeof routeData.contact === 'object') {
      return { ...routeData.contact }
    }
    return {}
  }

  #finalize(identity, config) {
    const validationResult = this.#validator.validate(config)
    if (!validationResult.valid) {
      throw new Error(`Application configuration validation failed: ${validationResult.errors.join('; ')}`)
    }

    return Object.freeze({
      identity: Object.freeze({ ...config.identity }),
      destination: Object.freeze({ ...config.destination }),
      company: Object.freeze({ ...config.company }),
      experience: Object.freeze({ ...config.experience }),
      capabilities: Object.freeze({ ...config.capabilities }),
      theme: Object.freeze({ ...config.theme }),
      content: Object.freeze({ ...config.content }),
      seo: Object.freeze({ ...config.seo }),
      integrations: Object.freeze({ ...config.integrations }),
      migration: Object.freeze({ ...config.migration }),
      navigation: Object.freeze({ ...config.navigation }),
      contact: Object.freeze({ ...config.contact })
    })
  }

  static getCanonicalDomains() {
    return [...CANONICAL_DOMAINS]
  }

  static getRejectedDomains() {
    return ApplicationIdentity.getRejectedDomains()
  }

  static getExperienceTypes() {
    return [...EXPERIENCE_TYPES]
  }

  static getContentSources() {
    return [...CONTENT_SOURCES]
  }

  static getMigrationStates() {
    return [...MIGRATION_STATES]
  }
}

export function createApplicationConfigLoader(options) {
  return new ApplicationConfigLoader(options)
}

export function loadApplicationConfig(domain, route, routeData = {}, options = {}) {
  const loader = new ApplicationConfigLoader(options)
  return loader.loadFromRoute(domain, route, routeData)
}

export default {
  ApplicationConfigLoader,
  createApplicationConfigLoader,
  loadApplicationConfig
}