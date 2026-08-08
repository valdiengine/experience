/**
 * Filesystem Configuration Source
 * 
 * Loads configuration from the filesystem.
 * Respects repository boundaries and prevents path traversal.
 */

import { ConfigurationSource } from './configuration.source.js'
import { ConfigurationResolutionError, ConfigurationValidationError } from '../experience.errors.js'
import { deepMerge } from '../../shared/utils/immutable.js'
import fs from 'fs'
import path from 'path'

const ALLOWED_ROOTS = [
  'ecosystems',
  'companies',
  'config'
]

const DEFAULT_ROOT = process.cwd()

export class FilesystemConfigurationSource extends ConfigurationSource {
  #root = null
  #cache = new Map()
  #initialized = false
  #cacheEnabled = true

  constructor(options = {}) {
    super(options)
    this.#root = options.root || DEFAULT_ROOT
    this.#cacheEnabled = options.cache !== false
  }

  get name() {
    return 'filesystem'
  }

  async initialize(options = {}) {
    if (this.#initialized) {
      return true
    }

    this.#root = options.root || this.#root
    this.#cacheEnabled = options.cache !== false

    const platformsDir = path.join(this.#root, 'config', 'platform')
    const ecosystemsDir = path.join(this.#root, 'ecosystems')
    const companiesDir = path.join(this.#root, 'companies')

    if (!fs.existsSync(platformsDir)) {
      console.warn(`[FilesystemConfigurationSource] Platform config dir not found: ${platformsDir}`)
    }

    if (!fs.existsSync(ecosystemsDir)) {
      console.warn(`[FilesystemConfigurationSource] Ecosystems dir not found: ${ecosystemsDir}`)
    }

    if (!fs.existsSync(companiesDir)) {
      console.warn(`[FilesystemConfigurationSource] Companies dir not found: ${companiesDir}`)
    }

    this.#initialized = true
    return true
  }

  #validatePath(requestedPath, allowedRoots = ALLOWED_ROOTS) {
    const resolved = path.resolve(this.#root, requestedPath)
    const normalized = path.normalize(resolved)

    for (const root of allowedRoots) {
      const allowedPath = path.join(this.#root, root)
      if (normalized.startsWith(allowedPath + path.sep) || normalized === allowedPath) {
        return normalized
      }
    }

    throw new ConfigurationResolutionError('Path traversal detected', {
      requested: requestedPath,
      root: this.#root
    })
  }

  async #readFile(filePath) {
    const validatedPath = this.#validatePath(filePath)

    if (this.#cacheEnabled && this.#cache.has(validatedPath)) {
      return this.#cache.get(validatedPath)
    }

    if (!fs.existsSync(validatedPath)) {
      return null
    }

    let parsed

    if (filePath.endsWith('.js')) {
      try {
        const module = await import(`file://${validatedPath.replace(/\\/g, '/')}`)
        parsed = module.default || module
      } catch (error) {
        throw new ConfigurationValidationError(`Failed to parse JS config: ${filePath}`, {
          error: error.message
        })
      }
    } else if (filePath.endsWith('.json')) {
      try {
        const content = fs.readFileSync(validatedPath, 'utf-8')
        parsed = JSON.parse(content)
      } catch (error) {
        throw new ConfigurationValidationError(`Failed to parse JSON config: ${filePath}`, {
          error: error.message
        })
      }
    } else {
      throw new ConfigurationValidationError(`Unsupported config format: ${filePath}`, {
        supported: ['.js', '.json']
      })
    }

    if (this.#cacheEnabled) {
      this.#cache.set(validatedPath, parsed)
    }

    return parsed
  }

  #writeFile(filePath, data) {
    const validatedPath = this.#validatePath(filePath)
    const dir = path.dirname(validatedPath)

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2)
    fs.writeFileSync(validatedPath, content, 'utf-8')

    if (this.#cacheEnabled) {
      this.#cache.set(validatedPath, data)
    }
  }

  async loadPlatform() {
    await this.initialize()

    const platformPath = path.join('config', 'platform', 'index.js')
    const config = await this.#readFile(platformPath)

    if (!config) {
      return {
        id: 'valdi',
        name: 'Valdi Platform',
        version: '4.2',
        theme: { mode: 'dark', borderRadius: '8px' },
        i18n: {
          defaultLocale: 'es-CL',
          fallbackLocale: 'es',
          supportedLocales: ['es-CL', 'es', 'en']
        },
        storage: { prefix: 'valdi_' },
        capabilities: { defaults: ['persistence', 'media', 'storage'] }
      }
    }

    return this.#normalizePlatform(config)
  }

  async loadCountry(countryCode) {
    await this.initialize()

    const countryPath = path.join('ecosystems', countryCode, 'metadata.js')
    const config = await this.#readFile(countryPath)

    if (!config) {
      return {
        code: countryCode,
        name: countryCode.toUpperCase(),
        flag: '🏳️'
      }
    }

    return this.#normalizeCountry(config, countryCode)
  }

  async loadRegion(countryCode, regionCode) {
    await this.initialize()

    const regionPath = path.join('ecosystems', countryCode, 'regions', regionCode, 'metadata.js')
    const config = await this.#readFile(regionPath)

    if (!config) {
      return {
        code: regionCode,
        name: regionCode,
        country: countryCode
      }
    }

    return this.#normalizeRegion(config, countryCode, regionCode)
  }

  async loadDestination(countryCode, regionCode, destinationCode) {
    await this.initialize()

    const destPath = path.join(
      'ecosystems',
      countryCode,
      'regions',
      regionCode,
      'destinations',
      destinationCode,
      'config.js'
    )
    const config = await this.#readFile(destPath)

    if (!config) {
      return {
        slug: destinationCode,
        code: destinationCode,
        country: countryCode,
        region: regionCode
      }
    }

    return this.#normalizeDestination(config, countryCode, regionCode, destinationCode)
  }

  async loadCompany(countryCode, regionCode, destinationCode, companyCode) {
    await this.initialize()

    const companyPath = path.join(
      'companies',
      countryCode,
      regionCode,
      destinationCode,
      companyCode,
      'config.js'
    )
    const config = await this.#readFile(companyPath)

    if (!config) {
      return {
        slug: companyCode,
        code: companyCode,
        destination: destinationCode
      }
    }

    return this.#normalizeCompany(config, countryCode, regionCode, destinationCode, companyCode)
  }

  async loadExperience(experienceId) {
    await this.initialize()

    const experiencePath = path.join('config', 'experiences', `${experienceId}.js`)
    const config = await this.#readFile(experiencePath)

    if (!config) {
      return {
        id: experienceId,
        name: experienceId,
        type: 'general',
        modules: ['gallery', 'media']
      }
    }

    return this.#normalizeExperience(config, experienceId)
  }

  async loadModule(moduleId) {
    await this.initialize()

    const modulePath = path.join('config', 'modules', `${moduleId}.js`)
    const config = await this.#readFile(modulePath)

    if (!config) {
      return {
        id: moduleId,
        name: moduleId,
        capabilities: []
      }
    }

    return { id: moduleId, ...config }
  }

  async loadAllCountries() {
    await this.initialize()

    const ecosystemsDir = path.join(this.#root, 'ecosystems')
    if (!fs.existsSync(ecosystemsDir)) {
      return {}
    }

    const countries = {}
    const entries = fs.readdirSync(ecosystemsDir, { withFileTypes: true })

    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        const countryCode = entry.name
        countries[countryCode] = await this.loadCountry(countryCode)
      }
    }

    return countries
  }

  async loadAllDestinations(countryCode, regionCode) {
    await this.initialize()

    const destDir = path.join(
      this.#root,
      'ecosystems',
      countryCode,
      'regions',
      regionCode,
      'destinations'
    )

    if (!fs.existsSync(destDir)) {
      return {}
    }

    const destinations = {}
    const entries = fs.readdirSync(destDir, { withFileTypes: true })

    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        const destCode = entry.name
        destinations[destCode] = await this.loadDestination(countryCode, regionCode, destCode)
      }
    }

    return destinations
  }

  async loadAllCompanies(countryCode, regionCode, destinationCode) {
    await this.initialize()

    const companyDir = path.join(
      this.#root,
      'companies',
      countryCode,
      regionCode,
      destinationCode
    )

    if (!fs.existsSync(companyDir)) {
      return {}
    }

    const companies = {}
    const entries = fs.readdirSync(companyDir, { withFileTypes: true })

    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        const companyCode = entry.name
        companies[companyCode] = await this.loadCompany(countryCode, regionCode, destinationCode, companyCode)
      }
    }

    return companies
  }

  async loadAllExperiences() {
    await this.initialize()

    const experienceDir = path.join(this.#root, 'config', 'experiences')

    if (!fs.existsSync(experienceDir)) {
      return this.#getDefaultExperiences()
    }

    const experiences = {}
    const entries = fs.readdirSync(experienceDir, { withFileTypes: true })

    for (const entry of entries) {
      if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.json'))) {
        const expId = path.basename(entry.name, path.extname(entry.name))
        experiences[expId] = await this.loadExperience(expId)
      }
    }

    return Object.keys(experiences).length > 0 ? experiences : this.#getDefaultExperiences()
  }

  #getDefaultExperiences() {
    return {
      'tourism-directory': {
        id: 'tourism-directory',
        name: 'Tourism Directory',
        type: 'directory',
        description: 'Directory of tourism businesses',
        sections: ['hero', 'search', 'categories', 'featured', 'map', 'footer'],
        components: ['search-bar', 'category-grid', 'business-list', 'map-view'],
        modules: ['reservations', 'availability', 'gallery', 'maps', 'notifications']
      },
      'tourism-booking': {
        id: 'tourism-booking',
        name: 'Tourism Booking',
        type: 'booking',
        description: 'Booking experience',
        sections: ['hero', 'catalog', 'booking-form', 'confirmation'],
        components: ['hero-carousel', 'service-catalog', 'booking-wizard'],
        modules: ['reservations', 'availability', 'payments', 'notifications', 'gallery', 'maps']
      },
      'company-profile': {
        id: 'company-profile',
        name: 'Company Profile',
        type: 'profile',
        description: 'Business profile',
        sections: ['hero', 'about', 'services', 'gallery', 'contact'],
        components: ['hero', 'about-section', 'service-grid', 'gallery', 'contact-form'],
        modules: ['gallery', 'media', 'notifications']
      },
      'default': {
        id: 'default',
        name: 'Default',
        type: 'general',
        sections: ['hero', 'content', 'footer'],
        modules: ['gallery', 'media']
      }
    }
  }

  #normalizePlatform(config) {
    return {
      id: config.id || config.code || 'valdi',
      name: config.name || 'Valdi Platform',
      version: config.version || '4.2',
      theme: config.theme || { mode: 'dark', borderRadius: '8px' },
      i18n: {
        defaultLocale: config.i18n?.defaultLocale || 'es-CL',
        fallbackLocale: config.i18n?.fallbackLocale || 'es',
        supportedLocales: config.i18n?.supportedLocales || ['es-CL', 'es', 'en']
      },
      storage: config.storage || { prefix: 'valdi_' },
      capabilities: config.capabilities || { defaults: ['persistence', 'media', 'storage'] },
      configVersion: config.configVersion || '1.0'
    }
  }

  #normalizeCountry(config, countryCode) {
    return {
      code: config.code || countryCode,
      name: config.name || countryCode.toUpperCase(),
      flag: config.flag || '🏳️',
      currency: config.currency || 'USD',
      timezone: config.timezone || 'UTC',
      defaultLocale: config.defaultLocale || config.i18n?.defaultLocale || 'es-CL',
      supportedLocales: config.supportedLocales || config.i18n?.supportedLocales || ['es'],
      enabledCategories: config.enabledCategories || [],
      enabledModules: config.enabledModules || [],
      regions: config.regions || [],
      configVersion: config.configVersion || '1.0'
    }
  }

  #normalizeRegion(config, countryCode, regionCode) {
    return {
      code: config.code || regionCode,
      name: config.name || regionCode,
      country: config.country || countryCode,
      categories: config.categories || [],
      modules: config.modules || [],
      i18n: config.i18n || {},
      configVersion: config.configVersion || '1.0'
    }
  }

  #normalizeDestination(config, countryCode, regionCode, destinationCode) {
    return {
      slug: config.slug || destinationCode,
      code: config.code || destinationCode,
      name: config.name || destinationCode,
      description: config.description || '',
      type: config.type || 'general',
      country: config.country || countryCode,
      region: config.region || regionCode,
      domain: config.domain || `${destinationCode}.app`,
      coordinates: config.coordinates || [],
      branding: this.#normalizeBranding(config.branding),
      i18n: config.i18n || {},
      maps: config.maps || {},
      seo: config.seo || {},
      analytics: config.analytics || {},
      enabledCategories: config.enabledCategories || [],
      enabledModules: config.enabledModules || [],
      navigation: this.#normalizeNavigation(config.navigation),
      providers: config.providers || {},
      experienceType: config.experienceType || config.type || null,
      experience: config.experience || null,
      categories: config.categories || null,
      featured: config.featured || null,
      contact: config.contact || null,
      configVersion: config.configVersion || '1.0'
    }
  }

  #normalizeCompany(config, countryCode, regionCode, destinationCode, companyCode) {
    return {
      slug: config.slug || companyCode,
      code: config.code || companyCode,
      name: config.name || companyCode,
      type: config.type || 'general',
      description: config.description || '',
      destination: config.destination || destinationCode,
      country: config.country || countryCode,
      region: config.region || regionCode,
      branding: this.#normalizeBranding(config.branding, true),
      contact: config.contact || {},
      social: config.social || {},
      enabledCategories: config.enabledCategories || [],
      enabledModules: config.enabledModules || [],
      team: config.team || [],
      catalog: config.catalog || {},
      providers: config.providers || {},
      configVersion: config.configVersion || '1.0'
    }
  }

  #normalizeBranding(branding, isCompany = false) {
    if (!branding) {
      return {
        colors: { primary: '#c8a55c', secondary: '#1a1a2e', accent: '#e8d5a3' },
        fonts: { display: 'Inter', body: 'Inter' }
      }
    }

    return {
      logo: branding.logo || '/assets/branding/default-logo.svg',
      favicon: branding.favicon || '/assets/branding/favicon.ico',
      colors: {
        primary: branding.colors?.primary || '#c8a55c',
        secondary: branding.colors?.secondary || '#1a1a2e',
        accent: branding.colors?.accent || '#e8d5a3'
      },
      fonts: {
        display: branding.fonts?.display || 'Inter',
        body: branding.fonts?.body || 'Inter'
      },
      overrides: branding.overrides || (isCompany ? { applyDestinationBranding: true } : {})
    }
  }

  #normalizeNavigation(navigation) {
    if (!navigation) {
      return {
        header: { items: [] },
        footer: { columns: [] }
      }
    }

    return {
      header: {
        items: navigation.header?.items || []
      },
      footer: {
        columns: navigation.footer?.columns || []
      }
    }
  }

  #normalizeExperience(config, experienceId) {
    return {
      id: config.id || experienceId,
      name: config.name || experienceId,
      type: config.type || 'general',
      description: config.description || '',
      sections: config.sections || [],
      components: config.components || [],
      modules: config.modules || [],
      capabilities: config.capabilities || [],
      configVersion: config.configVersion || '1.0'
    }
  }

  async healthCheck() {
    return {
      status: 'ok',
      name: 'FilesystemConfigurationSource',
      root: this.#root,
      cacheEnabled: this.#cacheEnabled,
      cacheSize: this.#cache.size
    }
  }

  clearCache() {
    this.#cache.clear()
  }

  async stop() {
    this.clearCache()
    this.#initialized = false
    return true
  }
}

export default FilesystemConfigurationSource
