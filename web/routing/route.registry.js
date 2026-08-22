/**
 * Route Ownership Registry
 *
 * Configuration-driven registry for determining route ownership.
 * Enables progressive migration from WordPress to Experience Engine
 * at the individual URL level without changing existing URLs.
 *
 * P15.7.1 Implementation - Framework-free.
 */

export const OWNERSHIP = {
  WORDPRESS: 'wordpress',
  HYBRID: 'hybrid',
  EXPERIENCE: 'experience'
}

const DEFAULT_OWNERSHIP = OWNERSHIP.WORDPRESS

const DEFAULT_CONFIG = {
  routes: []
}

const CANONICAL_DOMAINS = ['valdi.app', 'natales.app', 'puntaarenas.app', 'coyhaique.app', 'chiloe.app']
const LOCALHOST_ALIASES = ['localhost', '127.0.0.1']

export class RouteOwnershipRegistry {
  #env
  #devDefaultDomain

  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.domainRoutes = new Map()
    this.#env = config.env || process.env.NODE_ENV || 'development'
    this.#devDefaultDomain = config.devDefaultDomain || 'valdi.app'
    this._buildIndex()
  }

  _buildIndex() {
    this.domainRoutes.clear()

    if (!this.config.routes || !Array.isArray(this.config.routes)) {
      return
    }

    for (const route of this.config.routes) {
      if (!route.domain || !route.path) {
        continue
      }

      const domain = route.domain.toLowerCase()
      if (!this.domainRoutes.has(domain)) {
        this.domainRoutes.set(domain, {
          exact: new Map(),
          prefix: []
        })
      }

      const domainData = this.domainRoutes.get(domain)

      if (route.match === 'prefix') {
        const sortedPrefixes = route.path.split('/').filter(Boolean)
        domainData.prefix.push({
          path: route.path.toLowerCase(),
          segments: sortedPrefixes,
          ownership: route.ownership || DEFAULT_OWNERSHIP,
          destination: route.destination || null,
          company: route.company || null,
          zone: route.zone || null,
          experienceType: route.experienceType || null,
          migrationState: route.migrationState || 'LEGACY',
          enabled: route.enabled !== false
        })
        domainData.prefix.sort((a, b) => b.segments.length - a.segments.length)
      } else {
        domainData.exact.set(route.path.toLowerCase(), {
          path: route.path.toLowerCase(),
          ownership: route.ownership || DEFAULT_OWNERSHIP,
          destination: route.destination || null,
          company: route.company || null,
          zone: route.zone || null,
          experienceType: route.experienceType || null,
          migrationState: route.migrationState || 'LEGACY',
          enabled: route.enabled !== false
        })
      }
    }
  }

  normalizePath(path) {
    if (!path) return '/'
    let normalized = path.toLowerCase()
    normalized = normalized.replace(/\\/g, '/')
    normalized = normalized.replace(/\/+/g, '/')
    if (normalized.length > 1 && normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1)
    }
    return normalized
  }

  validateOwnership(ownership) {
    return Object.values(OWNERSHIP).includes(ownership)
  }

  #isDevelopmentLocalhost(domain) {
    if (this.#env !== 'development') {
      return false
    }
    const normalized = domain ? domain.toLowerCase().replace(/^www\./, '').split(':')[0] : null
    return normalized !== null && LOCALHOST_ALIASES.includes(normalized)
  }

  #mapToCanonicalDomain(domain) {
    if (!domain) return null
    const normalized = domain.toLowerCase().replace(/^www\./, '').split(':')[0]
    if (this.#isDevelopmentLocalhost(normalized)) {
      return this.#devDefaultDomain
    }
    return normalized
  }

  validateDomain(domain) {
    if (!domain || typeof domain !== 'string') {
      return false
    }
    if (this.#isDevelopmentLocalhost(domain)) {
      return true
    }
    const normalized = domain.toLowerCase().replace(/^www\./, '').split(':')[0]
    return CANONICAL_DOMAINS.includes(normalized)
  }

  resolve(domain, path) {
    const normalizedDomain = domain ? domain.toLowerCase().replace(/^www\./, '') : null

    if (!normalizedDomain || !this.validateDomain(normalizedDomain)) {
      return {
        domain: normalizedDomain,
        path: this.normalizePath(path),
        ownership: DEFAULT_OWNERSHIP,
        matchedBy: null,
        matchedPattern: null,
        destination: null,
        company: null,
        migrationState: null,
        valid: false,
        error: 'Invalid domain'
      }
    }

    const normalizedPath = this.normalizePath(path)

    if (!this._isValidPath(normalizedPath)) {
      return {
        domain: normalizedDomain,
        path: normalizedPath,
        ownership: DEFAULT_OWNERSHIP,
        matchedBy: null,
        matchedPattern: null,
        destination: null,
        company: null,
        migrationState: null,
        valid: false,
        error: 'Invalid path'
      }
    }

    const domainData = this.domainRoutes.get(normalizedDomain)

    if (!domainData) {
      return this._defaultResult(normalizedDomain, normalizedPath)
    }

    const exactMatch = domainData.exact.get(normalizedPath)
    if (exactMatch && exactMatch.enabled) {
      return {
        domain: normalizedDomain,
        path: normalizedPath,
        ownership: exactMatch.ownership,
        matchedBy: 'exact',
        matchedPattern: exactMatch.path,
        destination: exactMatch.destination,
        company: exactMatch.company,
        zone: exactMatch.zone || null,
        experienceType: exactMatch.experienceType || null,
        migrationState: exactMatch.migrationState,
        valid: true,
        error: null
      }
    }

    const pathSegments = normalizedPath.split('/').filter(Boolean)
    for (const prefixRoute of domainData.prefix) {
      if (!prefixRoute.enabled) continue
      if (this._pathMatchesPrefix(pathSegments, prefixRoute.segments)) {
        return {
          domain: normalizedDomain,
          path: normalizedPath,
          ownership: prefixRoute.ownership,
          matchedBy: 'prefix',
          matchedPattern: prefixRoute.path,
          destination: prefixRoute.destination,
          company: prefixRoute.company,
          zone: prefixRoute.zone || null,
          experienceType: prefixRoute.experienceType || null,
          migrationState: prefixRoute.migrationState,
          valid: true,
          error: null
        }
      }
    }

    return this._defaultResult(normalizedDomain, normalizedPath)
  }

  _defaultResult(domain, path) {
    return {
      domain,
      path,
      ownership: DEFAULT_OWNERSHIP,
      matchedBy: 'default',
      matchedPattern: null,
      destination: null,
      company: null,
      zone: null,
      experienceType: null,
      migrationState: 'LEGACY',
      valid: true,
      error: null
    }
  }

  _pathMatchesPrefix(pathSegments, prefixSegments) {
    if (prefixSegments.length > pathSegments.length) {
      return false
    }
    for (let i = 0; i < prefixSegments.length; i++) {
      if (pathSegments[i] !== prefixSegments[i]) {
        return false
      }
    }
    return true
  }

  _isValidPath(path) {
    if (!path || typeof path !== 'string') {
      return false
    }
    if (!path.startsWith('/')) {
      return false
    }
    const normalized = path.replace(/\/+/g, '/')
    if (normalized.includes('/../') || normalized.endsWith('/..')) {
      return false
    }
    if (normalized === '..' || normalized.includes('..')) {
      return false
    }
    return true
  }

  getRoutesForDomain(domain) {
    const normalizedDomain = domain ? domain.toLowerCase().replace(/^www\./, '') : null
    const domainData = this.domainRoutes.get(normalizedDomain)

    if (!domainData) {
      return []
    }

    const routes = []

    for (const [path, route] of domainData.exact) {
      routes.push({ ...route, match: 'exact' })
    }

    for (const route of domainData.prefix) {
      routes.push({ ...route, match: 'prefix' })
    }

    return routes
  }

  isWordPressRoute(domain, path) {
    const resolved = this.resolve(domain, path)
    return resolved.ownership === OWNERSHIP.WORDPRESS
  }

  isHybridRoute(domain, path) {
    const resolved = this.resolve(domain, path)
    return resolved.ownership === OWNERSHIP.HYBRID
  }

  isExperienceRoute(domain, path) {
    const resolved = this.resolve(domain, path)
    return resolved.ownership === OWNERSHIP.EXPERIENCE
  }
}

export function createRouteOwnershipRegistry(config = {}) {
  return new RouteOwnershipRegistry(config)
}

export function getDefaultRegistry() {
  return createRouteOwnershipRegistry()
}

export default {
  RouteOwnershipRegistry,
  createRouteOwnershipRegistry,
  getDefaultRegistry,
  OWNERSHIP
}
