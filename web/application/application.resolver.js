/**
 * Application Resolver
 *
 * P15.8.3 - Application Resolver & Runtime Assembly
 *
 * Resolves an HTTP request to a valid Application Instance.
 * Orchestrates existing certified components:
 * - RouteOwnershipRegistry
 * - RouteMigrationManager
 * - ApplicationConfigLoader
 * - CapabilityComposer
 *
 * NO duplication of existing logic.
 * NO direct database access.
 * NO direct storage access.
 * NO direct WordPress access.
 *
 * Framework-free implementation.
 */

import {
  ApplicationIdentity,
  CANONICAL_DOMAINS,
  REJECTED_DOMAINS,
  DESTINATION_MAP
} from './application.identity.js'

import {
  createRouteOwnershipRegistry,
  OWNERSHIP
} from '../routing/route.registry.js'

import {
  createRouteMigrationManager
} from '../routing/route.migration.manager.js'

import {
  MIGRATION_STATE
} from '../routing/route.migration.controller.js'

import {
  ApplicationConfigLoader
} from './application.loader.js'

import {
  createCapabilityComposer,
  CapabilityRegistry
} from './capabilities/index.js'

import {
  DEFAULT_CAPABILITIES
} from './application.schema.js'

import { ROUTE_CONFIG } from '../routing/route.config.js'

export class ApplicationResolver {
  #registry
  #migrationManager
  #loader
  #capabilityComposer
  #configurationLoader
  #options

  constructor(options = {}) {
    this.#options = Object.freeze({ ...options })
    this.#registry = options.registry || createRouteOwnershipRegistry(options.routeConfig || ROUTE_CONFIG)
    this.#migrationManager = options.migrationManager || createRouteMigrationManager(this.#registry)
    this.#loader = new ApplicationConfigLoader(options)
    this.#capabilityComposer = options.capabilityComposer || this.#createCapabilityComposer()
    this.#configurationLoader = options.configurationLoader || null
  }

  #createCapabilityComposer() {
    const registry = CapabilityRegistry.createDefault()
    return createCapabilityComposer(registry)
  }

  resolve(request) {
    if (!request || typeof request !== 'object') {
      return {
        success: false,
        error: 'Request is required and must be an object',
        resolved: null
      }
    }

    const { domain, path, routeOwnership, destination, company, zone, experienceType } = request

    const domainValidation = this.#validateDomain(domain)
    if (!domainValidation.valid) {
      return {
        success: false,
        error: domainValidation.error,
        resolved: null
      }
    }

    const routeValidation = this.#validateRoute(path)
    if (!routeValidation.valid) {
      return {
        success: false,
        error: routeValidation.error,
        resolved: null
      }
    }

    const ownershipResult = this.#resolveOwnership(domain, path, routeOwnership)
    if (!ownershipResult.valid) {
      return {
        success: false,
        error: ownershipResult.error,
        resolved: null
      }
    }

    const migrationResult = this.#resolveMigration(domain, path, ownershipResult.ownership)
    if (!migrationResult.valid) {
      return {
        success: false,
        error: migrationResult.error,
        resolved: null
      }
    }

    const companyData = this.#loadCompanyCapabilities(
      domain,
      ownershipResult.destination,
      ownershipResult.company,
      ownershipResult.zone,
      ownershipResult.experienceType
    )

    const routeData = this.#buildRouteData(request, ownershipResult, migrationResult, companyData)

    let applicationConfig
    try {
      applicationConfig = this.#loader.loadFromRoute(domain, path, routeData)
    } catch (error) {
      return {
        success: false,
        error: `Application configuration failed: ${error.message}`,
        resolved: null
      }
    }

    const capabilityNames = this.#extractCapabilityNames(applicationConfig)
    const composition = this.#composeCapabilities(applicationConfig, capabilityNames)
    if (!composition.success) {
      return {
        success: false,
        error: `Capability composition failed: ${composition.errors.join('; ')}`,
        resolved: null
      }
    }

    const resolved = this.#buildResolvedApplication(
      domain,
      path,
      ownershipResult,
      migrationResult,
      applicationConfig,
      composition
    )

    return {
      success: true,
      error: null,
      resolved
    }
  }

  #validateDomain(domain) {
    if (!domain || typeof domain !== 'string') {
      return { valid: false, error: 'Domain is required and must be a string' }
    }

    const normalized = domain.toLowerCase().replace(/^www\./, '')

    if (REJECTED_DOMAINS.includes(normalized)) {
      return { valid: false, error: 'Domain is not allowed' }
    }

    if (!CANONICAL_DOMAINS.includes(normalized)) {
      return { valid: false, error: 'Domain is not recognized' }
    }

    return { valid: true, domain: normalized }
  }

  #validateRoute(path) {
    if (!path || typeof path !== 'string') {
      return { valid: false, error: 'Path is required and must be a string' }
    }

    if (path.includes('..') || path.includes('/../') || path.endsWith('/..')) {
      return { valid: false, error: 'Path cannot contain path traversal' }
    }

    if (!path.startsWith('/')) {
      path = '/' + path
    }

    return { valid: true, path }
  }

  #resolveOwnership(domain, path, routeOwnership) {
    const resolved = this.#registry.resolve(domain, path)

    if (!resolved.valid) {
      return {
        valid: false,
        ownership: OWNERSHIP.WORDPRESS,
        matchedBy: null,
        matchedPattern: null,
        company: null,
        destination: null,
        zone: null,
        error: resolved.error || 'Ownership resolution failed'
      }
    }

    const ownership = routeOwnership && Object.values(OWNERSHIP).includes(routeOwnership)
      ? routeOwnership
      : resolved.ownership

    return {
      valid: true,
      ownership,
      matchedBy: routeOwnership ? 'provided' : resolved.matchedBy,
      matchedPattern: routeOwnership ? null : resolved.matchedPattern,
      company: resolved.company || null,
      destination: resolved.destination || null,
      zone: resolved.zone || null,
      experienceType: resolved.experienceType || null
    }
  }

  #resolveMigration(domain, path, ownership) {
    const inspection = this.#migrationManager.inspectRoute(domain, path)

    if (!inspection.valid) {
      return {
        valid: false,
        migrationState: MIGRATION_STATE.ACTIVE_WORDPRESS,
        error: inspection.error
      }
    }

    let migrationState
    if (ownership === OWNERSHIP.WORDPRESS) {
      migrationState = MIGRATION_STATE.ACTIVE_WORDPRESS
    } else if (ownership === OWNERSHIP.HYBRID) {
      migrationState = MIGRATION_STATE.HYBRID_ACTIVE
    } else if (ownership === OWNERSHIP.EXPERIENCE) {
      migrationState = MIGRATION_STATE.EXPERIENCE_ACTIVE
    } else {
      migrationState = inspection.migration?.currentState || MIGRATION_STATE.ACTIVE_WORDPRESS
    }

    return {
      valid: true,
      migrationState,
      renderingPath: inspection.migration?.renderingPath || null
    }
  }

  #buildRouteData(request, ownershipResult, migrationResult, companyData = { capabilities: {}, experienceType: null, company: null }) {
    return {
      company: companyData.company || request.company || ownershipResult.company || null,
      destination: request.destination || ownershipResult.destination || null,
      experienceType: request.experienceType || companyData.experienceType || null,
      capabilities: Object.keys(companyData.capabilities).length > 0 ? companyData.capabilities : (request.capabilities || {}),
      theme: request.theme || {},
      contentSource: request.contentSource || 'wordpress',
      migrationState: migrationResult.migrationState,
      ownership: ownershipResult.ownership,
      navigation: companyData.navigation || null,
      categories: companyData.categories || null,
      featured: companyData.featured || null,
      seo: companyData.company?.seo || companyData.seo || null,
      contact: companyData.company?.contact || companyData.contact || null,
      branding: companyData.company?.branding || companyData.branding || null
    }
  }

  #loadCompanyCapabilities(domain, destination, companySlug, zone = null, experienceType = null) {
    if (!this.#configurationLoader || !domain || !destination) {
      return { capabilities: {}, experienceType: null, company: null, navigation: null }
    }

    const countryCode = 'cl'
    const regionCode = this.#configurationLoader.getDestinationRegion(countryCode, destination)
    if (!regionCode) {
      return { capabilities: {}, experienceType: null, company: null, navigation: null }
    }

    const destinationConfig = this.#configurationLoader.getDestinationConfig(countryCode, destination)

    if (!companySlug) {
      let seo = destinationConfig?.seo || null
      if (zone && seo) {
        const zoneName = zone.charAt(0).toUpperCase() + zone.slice(1)
        seo = {
          ...seo,
          title: `${zoneName} — Turismo en Valdivia`,
          description: seo.description || `Descubre ${zoneName} y sus servicios turísticos en Valdivia y Los Ríos, Chile.`
        }
      }
      return {
        capabilities: {},
        experienceType: experienceType || destinationConfig?.experienceType || null,
        company: null,
        navigation: destinationConfig?.navigation || null,
        categories: destinationConfig?.categories || null,
        contact: destinationConfig?.contact || null,
        branding: destinationConfig?.branding || null,
        seo,
        featured: destinationConfig?.featured || null
      }
    }

    const companyConfig = this.#configurationLoader.getCompanyConfig(countryCode, regionCode, destination, companySlug)
    if (!companyConfig) {
      return { capabilities: {}, experienceType: null, company: null, navigation: null }
    }

    const capabilities = {}
    if (companyConfig.capabilities) {
      for (const [name, config] of Object.entries(companyConfig.capabilities)) {
        if (typeof config === 'object' && config !== null && config.enabled === true) {
          capabilities[name] = config
        } else if (config === true) {
          capabilities[name] = true
        }
      }
    }

    const navigation = destinationConfig?.navigation || companyConfig.navigation || null

    return {
      capabilities,
      experienceType: companyConfig.experience?.type || null,
      company: {
        slug: companyConfig.slug,
        name: companyConfig.name,
        type: companyConfig.type,
        description: companyConfig.description || '',
        contact: companyConfig.contact || null,
        branding: companyConfig.branding || null,
        seo: companyConfig.seo || null,
        social: companyConfig.social || null
      },
      navigation
    }
  }

  #extractCapabilityNames(applicationConfig) {
    const capabilities = applicationConfig.capabilities || {}
    const enabledCapabilities = Object.entries(capabilities)
      .filter(([name, config]) => {
        if (typeof config === 'boolean') return config === true
        if (typeof config === 'object' && config !== null) return config.enabled === true
        return false
      })
      .map(([name]) => name)

    if (enabledCapabilities.length > 0) {
      return enabledCapabilities
    }

    const experienceType = applicationConfig.experience?.type
    if (experienceType && DEFAULT_CAPABILITIES[experienceType]) {
      return DEFAULT_CAPABILITIES[experienceType]
    }

    return ['hero']
  }

  #composeCapabilities(applicationConfig, capabilityNames) {
    try {
      const composition = this.#capabilityComposer.compose(applicationConfig, capabilityNames)
      if (!composition.success) {
        return composition
      }

      const companyConfigs = applicationConfig.capabilities || {}
      const mergedCapabilities = composition.capabilities.map(cap => {
        const companyConfig = companyConfigs[cap.name]
        if (companyConfig && typeof companyConfig === 'object') {
          return Object.freeze({
            ...cap,
            configuration: companyConfig.configuration
              ? Object.freeze({ ...cap.configuration || {}, ...companyConfig.configuration })
              : (cap.configuration || null)
          })
        }
        return cap
      })

      return {
        success: true,
        errors: [],
        capabilities: mergedCapabilities,
        metadata: composition.metadata
      }
    } catch (error) {
      return {
        success: false,
        errors: [error.message],
        capabilities: []
      }
    }
  }

  #buildResolvedApplication(domain, path, ownershipResult, migrationResult, applicationConfig, composition) {
    const destination = DESTINATION_MAP[domain] || null
    const region = destination ? DESTINATION_MAP[domain + '_region'] || null : null
    const zone = ownershipResult.zone || null
    const applicationType = zone ? 'zone' : (path === '/' ? 'ecosystem' : 'business')

    const resolved = {
      identity: Object.freeze({
        domain,
        route: path,
        applicationId: `${domain}${path}`,
        destination,
        region,
        zone,
        type: applicationType
      }),
      ownership: Object.freeze({
        type: ownershipResult.ownership,
        matchedBy: ownershipResult.matchedBy,
        matchedPattern: ownershipResult.matchedPattern
      }),
      migrationState: Object.freeze({
        state: migrationResult.migrationState,
        renderingPath: migrationResult.renderingPath
      }),
      configuration: applicationConfig,
      composition: Object.freeze({
        capabilities: composition.capabilities,
        metadata: composition.metadata
      }),
      metadata: Object.freeze({
        resolvedAt: new Date().toISOString(),
        resolver: 'ApplicationResolver',
        version: '1.0.0'
      })
    }

    return Object.freeze(resolved)
  }

  getRegistry() {
    return this.#registry
  }

  getMigrationManager() {
    return this.#migrationManager
  }

  getLoader() {
    return this.#loader
  }

  getCapabilityComposer() {
    return this.#capabilityComposer
  }

  static getCanonicalDomains() {
    return [...CANONICAL_DOMAINS]
  }

  static getRejectedDomains() {
    return [...REJECTED_DOMAINS]
  }

  static getOwnershipTypes() {
    return { ...OWNERSHIP }
  }

  static getMigrationStates() {
    return Object.values(MIGRATION_STATE)
  }
}

export function createApplicationResolver(options = {}) {
  return new ApplicationResolver(options)
}

export function resolveApplication(request, options = {}) {
  const resolver = new ApplicationResolver(options)
  return resolver.resolve(request)
}

export default {
  ApplicationResolver,
  createApplicationResolver,
  resolveApplication
}
