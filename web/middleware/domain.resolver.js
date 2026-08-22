/**
 * Domain Resolver
 *
 * Resolves hostname to destination identity.
 * Framework-free implementation following P15.4.0 validated architecture.
 */

export const CANONICAL_DOMAINS = [
  'valdi.app',
  'natales.app',
  'puntaarenas.app',
  'coyhaique.app',
  'chiloe.app'
]

const DOMAIN_DESTINATION_MAP = {
  'valdi.app': { destination: 'valdi', region: 'los-rios', country: 'cl' },
  'natales.app': { destination: 'natales', region: 'magallanes', country: 'cl' },
  'puntaarenas.app': { destination: 'puntaarenas', region: 'magallanes', country: 'cl' },
  'coyhaique.app': { destination: 'coyhaique', region: 'aysen', country: 'cl' },
  'chiloe.app': { destination: 'chiloe', region: 'los-lagos', country: 'cl' }
}

const DEV_LOCALHOST_DEV_DOMAIN_MAP = {
  'valdi': 'valdi.app',
  'natales': 'natales.app',
  'puntaarenas': 'puntaarenas.app',
  'coyhaique': 'coyhaique.app',
  'chiloe': 'chiloe.app'
}

const STAGING_HOST_TO_CANONICAL_MAP = {
  'stage.valdi.app': 'valdi.app',
  'stage.natales.app': 'natales.app',
  'stage.puntaarenas.app': 'puntaarenas.app',
  'stage.coyhaique.app': 'coyhaique.app',
  'stage.chiloe.app': 'chiloe.app'
}

const LOCALHOST_ALIASES = ['localhost', '127.0.0.1']

export class DomainResolver {
  #env
  #devDefaultDomain

  constructor(options = {}) {
    this.#env = options.env || process.env.NODE_ENV || 'development'
    this.#devDefaultDomain = options.devDefaultDomain || 'valdi.app'
  }

  normalize(hostname) {
    if (!hostname) {
      return null
    }
    return hostname.toLowerCase().replace(/^www\./, '').split(':')[0]
  }

  isCanonical(hostname) {
    const normalized = this.normalize(hostname)
    if (normalized === null) {
      return false
    }
    if (CANONICAL_DOMAINS.includes(normalized)) {
      return true
    }
    if (this.#isStagingHost(normalized)) {
      return true
    }
    return false
  }

  isDevelopmentLocalhost(hostname) {
    if (this.#env !== 'development') {
      return false
    }
    const normalized = this.normalize(hostname)
    return normalized !== null && LOCALHOST_ALIASES.includes(normalized)
  }

  #isStagingHost(hostname) {
    const normalized = this.normalize(hostname)
    return normalized !== null && STAGING_HOST_TO_CANONICAL_MAP.hasOwnProperty(normalized)
  }

  #getCanonicalForStaging(stagingHostname) {
    const normalized = this.normalize(stagingHostname)
    if (!normalized) {
      return null
    }
    return STAGING_HOST_TO_CANONICAL_MAP[normalized] || null
  }

  resolve(hostname) {
    const normalized = this.normalize(hostname)

    if (!normalized) {
      return null
    }

    if (this.isDevelopmentLocalhost(hostname)) {
      return this.#resolveForDevLocalhost(hostname)
    }

    if (this.#isStagingHost(normalized)) {
      return this.#resolveForStagingHost(hostname)
    }

    if (!this.isCanonical(normalized)) {
      return null
    }

    const destinationInfo = DOMAIN_DESTINATION_MAP[normalized]
    if (!destinationInfo) {
      return null
    }

    return {
      domain: normalized,
      hostname: normalized,
      ...destinationInfo
    }
  }

  #resolveForStagingHost(hostname) {
    const normalized = this.normalize(hostname)
    const canonicalDomain = this.#getCanonicalForStaging(normalized)
    if (!canonicalDomain) {
      return null
    }
    const destinationInfo = DOMAIN_DESTINATION_MAP[canonicalDomain]
    if (!destinationInfo) {
      return null
    }
    return {
      domain: canonicalDomain,
      hostname: normalized,
      isStagingHost: true,
      originalHostname: hostname,
      ...destinationInfo
    }
  }

  #resolveForDevLocalhost(hostname) {
    const canonicalDomain = this.#devDefaultDomain
    const destinationInfo = DOMAIN_DESTINATION_MAP[canonicalDomain]

    if (!destinationInfo) {
      return null
    }

    return {
      domain: canonicalDomain,
      hostname: this.normalize(hostname),
      isDevLocalhost: true,
      originalHostname: hostname,
      ...destinationInfo
    }
  }

  isRejected(hostname) {
    if (!hostname) return true
    const normalized = this.normalize(hostname)
    if (!normalized) return true
    if (this.isDevelopmentLocalhost(hostname)) {
      return false
    }
    if (this.#isStagingHost(normalized)) {
      return false
    }
    return !CANONICAL_DOMAINS.includes(normalized)
  }

  getEnv() {
    return this.#env
  }

  isProduction() {
    return this.#env === 'production'
  }

  isDevelopment() {
    return this.#env === 'development'
  }
}

export function createDomainResolver(options = {}) {
  return new DomainResolver(options)
}

export default DomainResolver
