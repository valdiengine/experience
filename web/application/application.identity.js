/**
 * Application Identity
 *
 * P15.8.1 - Application Configuration Model
 *
 * Represents the unique identity of an Application Instance.
 * Domain + route uniquely identifies an application across the platform.
 *
 * ECOSYSTEM-2: Extended to support Zone Applications.
 *
 * Framework-free implementation.
 */

export const CANONICAL_DOMAINS = Object.freeze([
  'valdi.app',
  'natales.app',
  'puntaarenas.app',
  'coyhaique.app',
  'chiloe.app'
])

export const REJECTED_DOMAINS = Object.freeze([
  'valdivia.app'
])

export const DESTINATION_MAP = Object.freeze({
  'valdi.app': 'valdi',
  'natales.app': 'natales',
  'puntaarenas.app': 'puntaarenas',
  'coyhaique.app': 'coyhaique',
  'chiloe.app': 'chiloe'
})

export const DESTINATION_REGIONS = Object.freeze({
  'valdi': 'los-rios',
  'natales': 'magallanes',
  'puntaarenas': 'magallanes',
  'coyhaique': 'aysen',
  'chiloe': 'los-lagos'
})

export const ZONE_APPLICATION_IDS = Object.freeze([
  'valdi.app/corral',
  'valdi.app/costa'
])

export const APPLICATION_TYPES = Object.freeze({
  ECOSYSTEM: 'ecosystem',
  ZONE: 'zone',
  BUSINESS: 'business'
})

export class ApplicationIdentity {
  #domain
  #route
  #applicationId
  #type
  #zone

  constructor(domain, route, options = {}) {
    this.#domain = this.#normalizeDomain(domain)
    this.#route = this.#normalizeRoute(route)
    this.#applicationId = this.#computeApplicationId()
    this.#zone = options.zone || null
    this.#type = this.#computeType()
  }

  #normalizeDomain(domain) {
    if (!domain || typeof domain !== 'string') {
      throw new Error('Domain is required and must be a string')
    }
    const normalized = domain.toLowerCase().replace(/^www\./, '')
    if (!CANONICAL_DOMAINS.includes(normalized)) {
      throw new Error(`Domain "${domain}" is not canonical`)
    }
    return normalized
  }

  #normalizeRoute(route) {
    if (!route || typeof route !== 'string') {
      throw new Error('Route is required and must be a string')
    }
    if (!route.startsWith('/')) {
      route = '/' + route
    }
    route = route.replace(/\\/g, '/')
    route = route.replace(/\/+/g, '/')
    if (route.length > 1 && route.endsWith('/')) {
      route = route.slice(0, -1)
    }
    if (route.includes('..') || route.includes('/../')) {
      throw new Error('Route cannot contain path traversal')
    }
    return route
  }

  #computeApplicationId() {
    return `${this.#domain}${this.#route}`
  }

  #computeType() {
    if (ZONE_APPLICATION_IDS.includes(this.#applicationId)) {
      return APPLICATION_TYPES.ZONE
    }
    if (this.#route === '/') {
      return APPLICATION_TYPES.ECOSYSTEM
    }
    return APPLICATION_TYPES.BUSINESS
  }

  get domain() {
    return this.#domain
  }

  get route() {
    return this.#route
  }

  get applicationId() {
    return this.#applicationId
  }

  get type() {
    return this.#type
  }

  get zone() {
    return this.#zone
  }

  get destination() {
    return DESTINATION_MAP[this.#domain]
  }

  get region() {
    return DESTINATION_REGIONS[this.destination]
  }

  isZone() {
    return this.#type === APPLICATION_TYPES.ZONE
  }

  isBusiness() {
    return this.#type === APPLICATION_TYPES.BUSINESS
  }

  isEcosystem() {
    return this.#type === APPLICATION_TYPES.ECOSYSTEM
  }

  isCanonicalDomain(domain) {
    if (!domain) return false
    const normalized = domain.toLowerCase().replace(/^www\./, '')
    return CANONICAL_DOMAINS.includes(normalized)
  }

  isRejectedDomain(domain) {
    if (!domain) return true
    const normalized = domain.toLowerCase().replace(/^www\./, '')
    return REJECTED_DOMAINS.includes(normalized)
  }

  equals(other) {
    if (!(other instanceof ApplicationIdentity)) {
      return false
    }
    return this.#applicationId === other.#applicationId
  }

  toString() {
    return this.#applicationId
  }

  toJSON() {
    return {
      domain: this.#domain,
      route: this.#route,
      applicationId: this.#applicationId,
      type: this.#type,
      zone: this.#zone,
      destination: this.destination,
      region: this.region
    }
  }

  freeze() {
    return Object.freeze(this)
  }

  static from(domain, route, options = {}) {
    return new ApplicationIdentity(domain, route, options)
  }

  static isValidDomain(domain) {
    if (!domain || typeof domain !== 'string') return false
    const normalized = domain.toLowerCase().replace(/^www\./, '')
    return CANONICAL_DOMAINS.includes(normalized)
  }

  static isValidRoute(route) {
    if (!route || typeof route !== 'string') return false
    if (!route.startsWith('/')) return false
    if (route.includes('..') || route.includes('/../')) return false
    return true
  }

  static getCanonicalDomains() {
    return [...CANONICAL_DOMAINS]
  }

  static getRejectedDomains() {
    return [...REJECTED_DOMAINS]
  }

  static getDestinationForDomain(domain) {
    if (!domain) return null
    const normalized = domain.toLowerCase().replace(/^www\./, '')
    return DESTINATION_MAP[normalized] || null
  }

  static getRegionForDestination(destination) {
    return DESTINATION_REGIONS[destination] || null
  }

  static isZoneApplication(applicationId) {
    return ZONE_APPLICATION_IDS.includes(applicationId)
  }

  static getApplicationTypes() {
    return { ...APPLICATION_TYPES }
  }

  static getZoneApplicationIds() {
    return [...ZONE_APPLICATION_IDS]
  }
}

export function createApplicationIdentity(domain, route) {
  return new ApplicationIdentity(domain, route)
}

export function isValidApplicationIdentity(domain, route) {
  try {
    new ApplicationIdentity(domain, route)
    return true
  } catch {
    return false
  }
}

export default {
  ApplicationIdentity,
  createApplicationIdentity,
  isValidApplicationIdentity,
  CANONICAL_DOMAINS,
  REJECTED_DOMAINS,
  DESTINATION_MAP,
  DESTINATION_REGIONS,
  ZONE_APPLICATION_IDS,
  APPLICATION_TYPES
}