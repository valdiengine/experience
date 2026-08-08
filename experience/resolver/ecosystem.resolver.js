/**
 * Ecosystem Resolver
 * 
 * Resolves the complete ecosystem context from product context.
 * Loads country, region, destination, and optional company.
 */

import { EcosystemLoadError } from '../experience.errors.js'

export class EcosystemResolver {
  #config = null
  #ecosystems = null

  constructor(config = {}) {
    this.#config = {
      ...config
    }
    this.#ecosystems = new Map()
  }

  get name() {
    return 'ecosystem'
  }

  async initialize(config) {
    this.#config = { ...this.#config, ...config }
    await this.loadEcosystems()
    return true
  }

  async loadEcosystems() {
    this.#ecosystems.clear()

    this.#ecosystems.set('cl', {
      code: 'cl',
      name: 'Chile',
      flag: '🇨🇱',
      defaultLocale: 'es-CL',
      currency: 'CLP',
      timezone: 'America/Santiago',
      regions: ['los-rios', 'magallanes', 'aysen', 'los-lagos']
    })

    this.#ecosystems.set('ar', {
      code: 'ar',
      name: 'Argentina',
      flag: '🇦🇷',
      defaultLocale: 'es-AR',
      currency: 'ARS',
      timezone: 'America/Buenos_Aires',
      regions: []
    })

    this.#ecosystems.set('pe', {
      code: 'pe',
      name: 'Peru',
      flag: '🇵🇪',
      defaultLocale: 'es-PE',
      currency: 'PEN',
      timezone: 'America/Lima',
      regions: []
    })

    this.#ecosystems.set('co', {
      code: 'co',
      name: 'Colombia',
      flag: '🇨🇴',
      defaultLocale: 'es-CO',
      currency: 'COP',
      timezone: 'America/Bogota',
      regions: []
    })

    this.#ecosystems.set('mx', {
      code: 'mx',
      name: 'Mexico',
      flag: '🇲🇽',
      defaultLocale: 'es-MX',
      currency: 'MXN',
      timezone: 'America/Mexico_City',
      regions: []
    })
  }

  async resolve(productContext) {
    if (!productContext || !productContext.country) {
      throw new EcosystemLoadError('Invalid product context', { productContext })
    }

    try {
      const country = this.#resolveCountry(productContext.country)
      const region = this.#resolveRegion(productContext.country, productContext.region)
      const destination = this.#resolveDestination(productContext.country, productContext.region, productContext.destination)
      const company = productContext.company ? this.#resolveCompany(productContext) : null

      return {
        ...productContext,
        country,
        region,
        destination,
        company,
        ecosystem: this.#buildEcosystemId(productContext)
      }
    } catch (error) {
      throw new EcosystemLoadError(`Failed to resolve ecosystem: ${error.message}`, {
        error: error.message,
        productContext
      })
    }
  }

  #resolveCountry(countryCode) {
    const country = this.#ecosystems.get(countryCode)
    
    if (!country) {
      return {
        code: countryCode,
        name: countryCode.toUpperCase(),
        defaultLocale: 'es-CL',
        currency: 'CLP',
        timezone: 'UTC'
      }
    }

    return country
  }

  #resolveRegion(countryCode, regionSlug) {
    if (!regionSlug) {
      return null
    }

    const regions = {
      'los-rios': {
        code: 'los-rios',
        name: 'Los Ríos',
        country: countryCode
      },
      'magallanes': {
        code: 'magallanes',
        name: 'Magallanes',
        country: countryCode
      },
      'aysen': {
        code: 'aysen',
        name: 'Aysén',
        country: countryCode
      },
      'los-lagos': {
        code: 'los-lagos',
        name: 'Los Lagos',
        country: countryCode
      },
      'patagonia': {
        code: 'patagonia',
        name: 'Patagonia',
        country: countryCode
      }
    }

    return regions[regionSlug] || {
      code: regionSlug,
      name: regionSlug,
      country: countryCode
    }
  }

  #resolveDestination(countryCode, regionSlug, destinationSlug) {
    if (!destinationSlug) {
      return null
    }

    const destinations = {
      'valdi': {
        slug: 'valdi',
        name: 'Valdi',
        description: 'Plataforma de gestión turística',
        country: countryCode,
        region: regionSlug,
        domain: 'valdi.app'
      },
      'natales': {
        slug: 'natales',
        name: 'Natales',
        description: 'Experiencia turística en Puerto Natales',
        country: countryCode,
        region: regionSlug || 'magallanes',
        domain: 'natales.app'
      },
      'puntaarenas': {
        slug: 'puntaarenas',
        name: 'Punta Arenas',
        description: 'Portal turístico de Punta Arenas',
        country: countryCode,
        region: regionSlug || 'magallanes',
        domain: 'puntaarenas.app'
      },
      'chiloe': {
        slug: 'chiloe',
        name: 'Chiloé',
        description: 'Experiencia insular y cultural',
        country: countryCode,
        region: regionSlug || 'los-lagos',
        domain: 'chiloe.app'
      },
      'coyhaique': {
        slug: 'coyhaique',
        name: 'Coyhaique',
        description: 'Aysén patrimonial',
        country: countryCode,
        region: regionSlug || 'aysen',
        domain: 'coyhaique.app'
      }
    }

    return destinations[destinationSlug] || {
      slug: destinationSlug,
      name: destinationSlug,
      country: countryCode,
      region: regionSlug
    }
  }

  #resolveCompany(productContext) {
    return {
      slug: productContext.company,
      name: productContext.company,
      destination: productContext.destination
    }
  }

  #buildEcosystemId(productContext) {
    const parts = [
      productContext.country,
      productContext.region,
      productContext.destination
    ].filter(Boolean)

    return parts.join('-')
  }

  async healthCheck() {
    return {
      status: 'ok',
      name: 'EcosystemResolver',
      countries: this.#ecosystems.size
    }
  }

  async stop() {
    this.#ecosystems.clear()
    return true
  }

  registerCountry(code, country) {
    this.#ecosystems.set(code, country)
  }

  getCountries() {
    return new Map(this.#ecosystems)
  }
}

export default EcosystemResolver
