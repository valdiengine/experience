/**
 * Configuration Loader
 * 
 * Loads and merges configuration hierarchy:
 * Platform → Country → Region → Destination → Company
 * 
 * Supports both in-memory and filesystem configuration sources.
 */

import { ConfigurationResolutionError } from '../experience.errors.js'
import { deepMerge } from '../../shared/utils/immutable.js'
import { FilesystemConfigurationSource } from '../source/filesystem.configuration.source.js'

export class ConfigurationLoader {
  #config = null
  #source = null
  #platformDefaults = null
  #countryConfigs = null
  #regionConfigs = null
  #destinationConfigs = null
  #companyConfigs = null

  constructor(config = {}) {
    this.#config = {
      inheritanceEnabled: true,
      arrayMerge: 'union',
      useFilesystem: true,
      ...config
    }
    this.#platformDefaults = {}
    this.#countryConfigs = new Map()
    this.#regionConfigs = new Map()
    this.#destinationConfigs = new Map()
    this.#companyConfigs = new Map()
  }

  get name() {
    return 'configuration'
  }

  get source() {
    return this.#source
  }

  async initialize(config = {}) {
    this.#config = { ...this.#config, ...config }

    if (this.#config.useFilesystem) {
      this.#source = new FilesystemConfigurationSource({
        root: this.#config.root || process.cwd(),
        cache: this.#config.cache !== false
      })
      await this.#source.initialize()
    }

    await this.loadConfigurations()
    return true
  }

  async loadConfigurations() {
    if (this.#source) {
      await this.loadConfigurationsFromSource()
    } else {
      this.#platformDefaults = this.#getPlatformDefaults()
      await this.loadCountryConfigs()
      await this.loadRegionConfigs()
      await this.loadDestinationConfigs()
    }
    await this.loadCompanyConfigs()
  }

  async loadConfigurationsFromSource() {
    this.#platformDefaults = await this.#source.loadPlatform()

    const countries = await this.#source.loadAllCountries()
    for (const [code, country] of Object.entries(countries)) {
      this.#countryConfigs.set(code, country)
    }

    for (const [cc, country] of Object.entries(countries)) {
      if (country.regions) {
        for (const regionCode of country.regions) {
          const key = `${cc}-${regionCode}`
          try {
            const region = await this.#source.loadRegion(cc, regionCode)
            this.#regionConfigs.set(key, region)

            const destinations = await this.#source.loadAllDestinations(cc, regionCode)
            for (const [destCode, destination] of Object.entries(destinations)) {
              const destKey = `${cc}-${regionCode}-${destCode}`
              this.#destinationConfigs.set(destKey, destination)

              const companies = await this.#source.loadAllCompanies(cc, regionCode, destCode)
              for (const [companyCode, company] of Object.entries(companies)) {
                const companyKey = `${cc}-${regionCode}-${destCode}-${companyCode}`
                this.#companyConfigs.set(companyKey, company)
              }
            }
          } catch (e) {
            this.#regionConfigs.set(key, { code: regionCode, country: cc })
          }
        }
      }
    }
  }

  #getPlatformDefaults() {
    return {
      platform: {
        id: 'valdi',
        name: 'Valdi Platform',
        version: '4.2'
      },
      theme: {
        mode: 'dark',
        borderRadius: '8px'
      },
      i18n: {
        defaultLocale: 'es-CL',
        fallbackLocale: 'es',
        supportedLocales: ['es-CL', 'es', 'en']
      },
      storage: {
        prefix: 'valdi_'
      },
      capabilities: {
        defaults: ['persistence', 'media', 'storage']
      }
    }
  }

  async loadCountryConfigs() {
    this.#countryConfigs.clear()

    this.#countryConfigs.set('cl', {
      code: 'cl',
      name: 'Chile',
      flag: '🇨🇱',
      currency: 'CLP',
      timezone: 'America/Santiago',
      i18n: {
        defaultLocale: 'es-CL',
        supportedLocales: ['es-CL', 'es', 'en']
      },
      enabledCategories: ['tourism', 'accommodation', 'restaurant', 'events', 'services', 'marine']
    })

    this.#countryConfigs.set('ar', {
      code: 'ar',
      name: 'Argentina',
      flag: '🇦🇷',
      currency: 'ARS',
      timezone: 'America/Buenos_Aires',
      i18n: {
        defaultLocale: 'es-AR',
        supportedLocales: ['es-AR', 'es']
      },
      enabledCategories: ['tourism', 'accommodation', 'restaurant', 'events']
    })

    this.#countryConfigs.set('pe', {
      code: 'pe',
      name: 'Peru',
      flag: '🇵🇪',
      currency: 'PEN',
      timezone: 'America/Lima',
      i18n: {
        defaultLocale: 'es-PE',
        supportedLocales: ['es-PE', 'es']
      },
      enabledCategories: ['tourism', 'accommodation', 'restaurant', 'events']
    })

    this.#countryConfigs.set('co', {
      code: 'co',
      name: 'Colombia',
      flag: '🇨🇴',
      currency: 'COP',
      timezone: 'America/Bogota',
      i18n: {
        defaultLocale: 'es-CO',
        supportedLocales: ['es-CO', 'es']
      },
      enabledCategories: ['tourism', 'accommodation', 'restaurant', 'events']
    })

    this.#countryConfigs.set('mx', {
      code: 'mx',
      name: 'Mexico',
      flag: '🇲🇽',
      currency: 'MXN',
      timezone: 'America/Mexico_City',
      i18n: {
        defaultLocale: 'es-MX',
        supportedLocales: ['es-MX', 'es']
      },
      enabledCategories: ['tourism', 'accommodation', 'restaurant', 'events', 'commerce']
    })
  }

  async loadRegionConfigs() {
    this.#regionConfigs.clear()

    const regions = {
      'cl-los-rios': {
        code: 'los-rios',
        name: 'Los Ríos',
        country: 'cl',
        enabledCategories: ['tourism', 'accommodation', 'restaurant']
      },
      'cl-magallanes': {
        code: 'magallanes',
        name: 'Magallanes',
        country: 'cl',
        enabledCategories: ['tourism', 'accommodation', 'restaurant', 'events']
      },
      'cl-aysen': {
        code: 'aysen',
        name: 'Aysén',
        country: 'cl',
        enabledCategories: ['tourism', 'accommodation']
      },
      'cl-los-lagos': {
        code: 'los-lagos',
        name: 'Los Lagos',
        country: 'cl',
        enabledCategories: ['tourism', 'accommodation', 'restaurant', 'marine']
      }
    }

    for (const [key, config] of Object.entries(regions)) {
      this.#regionConfigs.set(key, config)
    }
  }

  async loadDestinationConfigs() {
    this.#destinationConfigs.clear()

    const destinations = {
      'cl-los-rios-valdi': {
        slug: 'valdi',
        name: 'Valdi',
        description: 'Plataforma de gestión turística',
        country: 'cl',
        region: 'los-rios',
        branding: {
          colors: {
            primary: '#c8a55c',
            secondary: '#1a1a2e',
            accent: '#e8d5a3'
          },
          fonts: {
            display: 'Inter',
            body: 'Inter'
          }
        },
        enabledModules: ['reservations', 'availability', 'notifications', 'gallery', 'media', 'maps', 'analytics', 'pwa'],
        navigation: {
          header: {
            items: [
              { label: 'Inicio', path: '/' },
              { label: 'Explorar', path: '/explorar' },
              { label: 'Empresas', path: '/empresas' },
              { label: 'Nosotros', path: '/nosotros' },
              { label: 'Contacto', path: '/contacto' }
            ]
          },
          footer: {
            columns: [
              {
                id: 'explorar',
                title: 'Explorar',
                items: [
                  { label: 'Destinos', path: '/explorar' },
                  { label: 'Empresas', path: '/empresas' },
                  { label: 'Experiencias', path: '/experiencias' }
                ]
              },
              {
                id: 'nosotros',
                title: 'Nosotros',
                items: [
                  { label: 'Historia', path: '/nosotros' },
                  { label: 'Equipo', path: '/nosotros/equipo' },
                  { label: 'Contacto', path: '/contacto' }
                ]
              },
              {
                id: 'legal',
                title: 'Legal',
                items: [
                  { label: 'Privacidad', path: '/privacidad' },
                  { label: 'Términos', path: '/terminos' },
                  { label: 'Cookies', path: '/cookies' }
                ]
              }
            ]
          }
        },
        seo: {
          defaultTitle: 'Valdi — {destination}',
          defaultDescription: 'Plataforma de gestión turística'
        },
        maps: {
          provider: 'mapbox',
          defaultCenter: [-41.7545, -73.1269],
          defaultZoom: 12
        },
        analytics: {
          enabled: true
        }
      },
      'cl-magallanes-natales': {
        slug: 'natales',
        name: 'Natales',
        description: 'Experiencia turística en Puerto Natales',
        country: 'cl',
        region: 'magallanes',
        branding: {
          colors: {
            primary: '#2d5a27',
            secondary: '#1a1a2e'
          }
        },
        enabledModules: ['reservations', 'availability', 'gallery', 'media', 'maps'],
        navigation: {
          header: {
            items: [
              { label: 'Inicio', path: '/' },
              { label: 'Destinos', path: '/destinos' },
              { label: 'Tours', path: '/tours' },
              { label: 'Contacto', path: '/contacto' }
            ]
          }
        },
        maps: {
          provider: 'mapbox',
          defaultCenter: [-51.7322, -72.4912],
          defaultZoom: 13
        }
      },
      'cl-magallanes-puntaarenas': {
        slug: 'puntaarenas',
        name: 'Punta Arenas',
        description: 'Portal turístico de Punta Arenas',
        country: 'cl',
        region: 'magallanes',
        enabledModules: ['reservations', 'gallery', 'media', 'maps'],
        maps: {
          provider: 'mapbox',
          defaultCenter: [-53.1638, -70.9171],
          defaultZoom: 13
        }
      },
      'cl-los-lagos-chiloe': {
        slug: 'chiloe',
        name: 'Chiloé',
        description: 'Experiencia insular y cultural',
        country: 'cl',
        region: 'los-lagos',
        enabledModules: ['reservations', 'gallery', 'media', 'maps', 'cultural'],
        maps: {
          provider: 'mapbox',
          defaultCenter: [-42.4739, -73.8205],
          defaultZoom: 10
        }
      },
      'cl-aysen-coyhaique': {
        slug: 'coyhaique',
        name: 'Coyhaique',
        description: 'Aysén patrimonial',
        country: 'cl',
        region: 'aysen',
        enabledModules: ['reservations', 'gallery', 'media', 'maps'],
        maps: {
          provider: 'mapbox',
          defaultCenter: [-45.5654, -72.0518],
          defaultZoom: 12
        }
      }
    }

    for (const [key, config] of Object.entries(destinations)) {
      this.#destinationConfigs.set(key, config)
    }
  }

  async loadCompanyConfigs() {
    const legacyCompanies = {
      'cl-los-rios-valdi-albasie': {
        slug: 'albasie',
        name: 'Albasie',
        type: 'tourism-operator',
        destination: 'valdi',
        description: 'Operador turístico especializado en experiencias patrimoniales en el sur de Chile',
        branding: {
          colors: {
            primary: '#2d5a27',
            secondary: '#1a1a2e',
            accent: '#3d7b9e'
          },
          fonts: {
            display: 'Montserrat',
            body: 'Open Sans'
          }
        },
        navigation: {
          header: {
            items: [
              { label: 'Inicio', path: '/#inicio' },
              { label: 'Modelos', path: '/#modelos' },
              { label: 'Cotizar', path: '/#cotizar' },
              { label: 'Contacto', path: '/#contacto' }
            ]
          },
          footer: {
            columns: [
              {
                id: 'navegacion',
                title: 'Navegación',
                items: [
                  { label: 'Inicio', path: '/#inicio' },
                  { label: 'Modelos', path: '/#modelos' },
                  { label: 'Cotizar', path: '/#cotizar' },
                  { label: 'Contacto', path: '/#contacto' }
                ]
              },
              {
                id: 'legal',
                title: 'Legal',
                items: [
                  { label: 'Privacidad', path: '/privacidad' },
                  { label: 'Términos', path: '/terminos' }
                ]
              }
            ]
          }
        },
        hero: {
          title: 'Albasie',
          subtitle: 'Embarcaciones de Fiberglass',
          description: 'Fabricación de embarcaciones semirígidas de alta calidad para pesca, turismo y trabajo. Engineeringhaus Chile.',
          cta: {
            primary: {
              label: 'Cotiza tu Embarcación',
              action: 'scroll',
              target: '#cotizar'
            },
            secondary: {
              label: 'Ver Modelos',
              action: 'scroll',
              target: '#modelos'
            }
          }
        },
        contact: {
          email: 'info@albasie.cl',
          phone: '+56 9 XXXX XXXX',
          whatsapp: '+569XXXXXXXX',
          address: {
            city: 'Valdivia',
            region: 'Los Ríos',
            country: 'CL'
          }
        },
        social: {
          instagram: 'https://instagram.com/albasie'
        },
        experience: {
          type: 'boat'
        },
        capabilities: {
          hero: { enabled: true },
          gallery: { enabled: true },
          quote: {
            enabled: true,
            configuration: {
              title: 'Cotización de Embarcaciones Albasie',
              description: 'Solicite una cotización personalizada para nuestras embarcaciones. Complete el formulario y nos contactaremos con usted.',
              currency: 'CLP',
              options: [
                {
                  id: 'albasie-835',
                  label: 'Albasie 8.35',
                  description: 'Embarcación semirígida 8.35m - ideal para pesca y turismo',
                  price: 8500000,
                  category: 'boat'
                },
                {
                  id: 'albasie-970',
                  label: 'Albasie 9.70',
                  description: 'Embarcación semirígida 9.70m - mayor capacidad y confort',
                  price: 12500000,
                  category: 'boat'
                },
                {
                  id: 'engine-150',
                  label: 'Motor 150HP',
                  description: 'Motor fueraborda 150HP - rendimiento óptimo',
                  price: 2800000,
                  category: 'engine'
                },
                {
                  id: 'engine-250',
                  label: 'Motor 250HP',
                  description: 'Motor fueraborda 250HP - máxima potencia',
                  price: 4500000,
                  category: 'engine'
                },
                {
                  id: 'trailer',
                  label: 'Trailer',
                  description: 'Trailer para transporte terrestre',
                  price: 1500000,
                  category: 'accessory'
                }
              ],
              customerFields: [
                { id: 'name', type: 'text', label: 'Nombre completo', required: true },
                { id: 'email', type: 'email', label: 'Correo electrónico', required: true },
                { id: 'phone', type: 'phone', label: 'Teléfono', required: false },
                { id: 'message', type: 'textarea', label: 'Mensaje o comentarios', required: false }
              ],
              taxConfiguration: {
                enabled: true,
                rate: 0.19
              }
            }
          },
          contact: { enabled: true },
          installableApp: {
            enabled: true,
            name: 'Albasie - Experiencias Patrimoniales',
            shortName: 'Albasie',
            description: 'Operador turístico especializado en experiencias patrimoniales en el sur de Chile',
            startUrl: '/albasie/',
            scope: '/albasie/',
            display: 'standalone',
            backgroundColor: '#0a0a0a',
            themeColor: '#2d5a27',
            icons: [
              {
                src: '/assets/icons/albasie-icon-192.png',
                sizes: '192x192',
                type: 'image/png'
              },
              {
                src: '/assets/icons/albasie-icon-512.png',
                sizes: '512x512',
                type: 'image/png'
              }
            ]
          }
        },
        enabledModules: ['gallery', 'notifications'],
        seo: {
          title: 'Albasie - Embarcaciones de Fiberglass en Chile',
          description: 'Fabricación de embarcaciones semirígidas de fiberglass de alta calidad en Chile. Cotiza tu embarcación hoy.'
        }
      }
    }

    for (const [key, config] of Object.entries(legacyCompanies)) {
      if (!this.#companyConfigs.has(key)) {
        this.#companyConfigs.set(key, config)
      }
    }
  }

  async load(context) {
    if (!context || !context.country) {
      throw new ConfigurationResolutionError('Invalid context', { context })
    }

    try {
      const platform = { ...this.#platformDefaults }
      
      const countryCode = typeof context.country === 'string' ? context.country : (context.country?.code || context.country)
      const regionCode = typeof context.region === 'string' ? context.region : (context.region?.code || context.region)
      const destinationCode = typeof context.destination === 'string' ? context.destination : (context.destination?.slug || context.destination)
      const companyCode = typeof context.company === 'string' ? context.company : (context.company?.slug || context.company)

      const country = this.#resolveCountry(countryCode)
      const region = this.#resolveRegion(countryCode, regionCode)
      const destination = this.#resolveDestination(countryCode, regionCode, destinationCode)
      const company = this.#resolveCompany(countryCode, regionCode, destinationCode, companyCode)

      const merged = this.#mergeConfigurations(platform, country, region, destination, company)

      return {
        ...context,
        config: merged,
        country: country,
        region: region,
        destination: destination,
        company: company,
        branding: merged.branding,
        theme: merged.theme,
        navigation: merged.navigation,
        seo: merged.seo,
        maps: merged.maps,
        analytics: merged.analytics,
        i18n: merged.i18n,
        providers: merged.providers
      }
    } catch (error) {
      throw new ConfigurationResolutionError(`Failed to load configuration: ${error.message}`, {
        error: error.message,
        context
      })
    }
  }

  #resolveCountry(countryCode) {
    if (!countryCode) {
      return {}
    }
    const code = typeof countryCode === 'string' ? countryCode : countryCode.code || countryCode
    return this.#countryConfigs.get(code) || {
      code: code,
      name: code.toUpperCase()
    }
  }

  #resolveRegion(countryCode, regionSlug) {
    if (!regionSlug) {
      return {}
    }
    const code = typeof countryCode === 'string' ? countryCode : countryCode?.code || countryCode
    const slug = typeof regionSlug === 'string' ? regionSlug : regionSlug?.code || regionSlug

    const key = `${code}-${slug}`
    return this.#regionConfigs.get(key) || {
      code: slug,
      country: code
    }
  }

  #resolveDestination(countryCode, regionSlug, destinationSlug) {
    if (!destinationSlug) {
      return {}
    }
    const code = typeof countryCode === 'string' ? countryCode : countryCode?.code || countryCode
    const slug = typeof destinationSlug === 'string' ? destinationSlug : destinationSlug?.slug || destinationSlug
    const region = typeof regionSlug === 'string' ? regionSlug : regionSlug?.code || regionSlug

    const key = `${code}-${region}-${slug}`
    return this.#destinationConfigs.get(key) || {
      slug: slug,
      country: code,
      region: region
    }
  }

  #resolveCompany(countryCode, regionSlug, destinationSlug, companySlug) {
    if (!companySlug) {
      return {}
    }
    const code = typeof countryCode === 'string' ? countryCode : countryCode?.code || countryCode
    const region = typeof regionSlug === 'string' ? regionSlug : regionSlug?.code || regionSlug
    const dest = typeof destinationSlug === 'string' ? destinationSlug : destinationSlug?.slug || destinationSlug
    const slug = typeof companySlug === 'string' ? companySlug : companySlug?.slug || companySlug

    const key = `${code}-${region}-${dest}-${slug}`
    return this.#companyConfigs.get(key) || {
      slug: slug,
      destination: dest
    }
  }

  #mergeConfigurations(platform, country, region, destination, company) {
    const options = {
      arrayMerge: this.#config.arrayMerge || 'union'
    }

    let merged = deepMerge(platform, country, options)
    merged = deepMerge(merged, region, options)
    merged = deepMerge(merged, destination, options)
    merged = deepMerge(merged, company, options)

    return merged
  }

  async healthCheck() {
    return {
      status: 'ok',
      name: 'ConfigurationLoader',
      countriesLoaded: this.#countryConfigs.size,
      regionsLoaded: this.#regionConfigs.size,
      destinationsLoaded: this.#destinationConfigs.size,
      companiesLoaded: this.#companyConfigs.size
    }
  }

  getCompanyConfig(countryCode, regionCode, destinationCode, companySlug) {
    if (!countryCode || !regionCode || !destinationCode || !companySlug) {
      return null
    }
    const key = `${countryCode}-${regionCode}-${destinationCode}-${companySlug}`
    return this.#companyConfigs.get(key) || null
  }

  getDestinationRegion(countryCode, destinationCode) {
    if (!countryCode || !destinationCode) {
      return null
    }
    for (const [key, destConfig] of this.#destinationConfigs) {
      if (destConfig.slug === destinationCode && destConfig.country === countryCode) {
        return destConfig.region || null
      }
    }
    return null
  }

  getDestinationConfig(countryCode, destinationCode) {
    if (!countryCode || !destinationCode) {
      return null
    }
    for (const [key, destConfig] of this.#destinationConfigs) {
      if (destConfig.slug === destinationCode && destConfig.country === countryCode) {
        return destConfig || null
      }
    }
    return null
  }

  async stop() {
    this.#countryConfigs.clear()
    this.#regionConfigs.clear()
    this.#destinationConfigs.clear()
    this.#companyConfigs.clear()
    return true
  }
}

export default ConfigurationLoader
