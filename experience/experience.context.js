/**
 * Experience Context
 * 
 * Immutable runtime context representing the resolved experience.
 * Contains platform, country, region, destination, ecosystem, company,
 * experience, modules, capabilities, theme, language, domain, and tenant.
 */

import { freeze, seal } from '../shared/utils/immutable.js'

export class ExperienceContext {
  #context = {}
  #immutable = false

  constructor(builder) {
    if (builder instanceof ExperienceContextBuilder) {
      this.#context = builder.build()
    } else {
      this.#context = builder
    }
  }

  get platform() {
    return this.#context.platform
  }

  get country() {
    return this.#context.country
  }

  get region() {
    return this.#context.region
  }

  get destination() {
    return this.#context.destination
  }

  get ecosystem() {
    return this.#context.ecosystem
  }

  get company() {
    return this.#context.company
  }

  get experience() {
    return this.#context.experience
  }

  get modules() {
    return this.#context.modules
  }

  get capabilities() {
    return this.#context.capabilities
  }

  get theme() {
    return this.#context.theme
  }

  get language() {
    return this.#context.language
  }

  get locale() {
    return this.#context.locale
  }

  get domain() {
    return this.#context.domain
  }

  get subdomain() {
    return this.#context.subdomain
  }

  get tenant() {
    return this.#context.tenant
  }

  get tenantId() {
    return this.#context.tenant?.id
  }

  get request() {
    return this.#context.request
  }

  get resolution() {
    return this.#context.resolution
  }

  get config() {
    return this.#context.config
  }

  get branding() {
    return this.#context.branding
  }

  get navigation() {
    return this.#context.navigation
  }

  get seo() {
    return this.#context.seo
  }

  get i18n() {
    return this.#context.i18n
  }

  get maps() {
    return this.#context.maps
  }

  get analytics() {
    return this.#context.analytics
  }

  get providers() {
    return this.#context.providers
  }

  isResolved() {
    return !!this.#context.destination && !!this.#context.ecosystem
  }

  hasCompany() {
    return !!this.#context.company
  }

  hasModules() {
    return !!(this.#context.modules && this.#context.modules.length > 0)
  }

  hasCapability(capabilityId) {
    return !!(this.#context.capabilities && this.#context.capabilities.includes(capabilityId))
  }

  hasModule(moduleId) {
    return !!(this.#context.modules && this.#context.modules.includes(moduleId))
  }

  getModuleConfig(moduleId) {
    const modules = this.#context.modulesConfig
    return modules ? modules[moduleId] : null
  }

  getBranding() {
    return this.#context.branding
  }

  getTheme() {
    return this.#context.theme
  }

  getLocale() {
    return this.#context.locale
  }

  toJSON() {
    return {
      platform: this.platform,
      country: this.country,
      region: this.region,
      destination: this.destination,
      ecosystem: this.ecosystem,
      company: this.company,
      experience: this.experience,
      modules: this.modules,
      capabilities: this.capabilities,
      theme: this.theme,
      language: this.language,
      locale: this.locale,
      domain: this.domain,
      subdomain: this.subdomain,
      tenant: this.tenant,
      resolution: this.resolution,
      branding: this.branding,
      navigation: this.navigation,
      seo: this.seo,
      i18n: this.i18n,
      maps: this.maps,
      analytics: this.analytics,
      providers: this.providers
    }
  }

  freeze() {
    if (!this.#immutable) {
      this.#context = freeze(this.#context)
      this.#immutable = true
    }
    return this
  }

  seal() {
    if (!this.#immutable) {
      this.#context = seal(this.#context)
      this.#immutable = true
    }
    return this
  }

  static empty() {
    return new ExperienceContext({})
  }

  static from(builder) {
    return new ExperienceContext(builder)
  }
}

export class ExperienceContextBuilder {
  #platform = null
  #country = null
  #region = null
  #destination = null
  #ecosystem = null
  #company = null
  #experience = null
  #modules = []
  #capabilities = []
  #modulesConfig = {}
  #theme = null
  #language = 'es'
  #locale = 'es-CL'
  #domain = null
  #subdomain = null
  #tenant = null
  #request = {}
  #resolution = {}
  #config = {}
  #branding = {}
  #navigation = {}
  #seo = {}
  #i18n = {}
  #maps = {}
  #analytics = {}
  #providers = {}

  setPlatform(platform) {
    this.#platform = platform
    return this
  }

  setCountry(country) {
    this.#country = country
    return this
  }

  setRegion(region) {
    this.#region = region
    return this
  }

  setDestination(destination) {
    this.#destination = destination
    return this
  }

  setEcosystem(ecosystem) {
    this.#ecosystem = ecosystem
    return this
  }

  setCompany(company) {
    this.#company = company
    return this
  }

  setExperience(experience) {
    this.#experience = experience
    return this
  }

  setModules(modules) {
    this.#modules = modules || []
    return this
  }

  addModule(module) {
    if (!this.#modules.includes(module)) {
      this.#modules.push(module)
    }
    return this
  }

  setCapabilities(capabilities) {
    this.#capabilities = capabilities || []
    return this
  }

  addCapability(capability) {
    if (!this.#capabilities.includes(capability)) {
      this.#capabilities.push(capability)
    }
    return this
  }

  setModulesConfig(config) {
    this.#modulesConfig = config || {}
    return this
  }

  setTheme(theme) {
    this.#theme = theme
    return this
  }

  setLanguage(language) {
    this.#language = language
    return this
  }

  setLocale(locale) {
    this.#locale = locale
    return this
  }

  setDomain(domain) {
    this.#domain = domain
    return this
  }

  setSubdomain(subdomain) {
    this.#subdomain = subdomain
    return this
  }

  setTenant(tenant) {
    this.#tenant = tenant
    return this
  }

  setRequest(request) {
    this.#request = request || {}
    return this
  }

  setResolution(resolution) {
    this.#resolution = resolution || {}
    return this
  }

  setConfig(config) {
    this.#config = config || {}
    return this
  }

  setBranding(branding) {
    this.#branding = branding || {}
    return this
  }

  setNavigation(navigation) {
    this.#navigation = navigation || {}
    return this
  }

  setSeo(seo) {
    this.#seo = seo || {}
    return this
  }

  setI18n(i18n) {
    this.#i18n = i18n || {}
    return this
  }

  setMaps(maps) {
    this.#maps = maps || {}
    return this
  }

  setAnalytics(analytics) {
    this.#analytics = analytics || {}
    return this
  }

  setProviders(providers) {
    this.#providers = providers || {}
    return this
  }

  build() {
    return {
      platform: this.#platform,
      country: this.#country,
      region: this.#region,
      destination: this.#destination,
      ecosystem: this.#ecosystem,
      company: this.#company,
      experience: this.#experience,
      modules: [...this.#modules],
      capabilities: [...this.#capabilities],
      modulesConfig: { ...this.#modulesConfig },
      theme: this.#theme,
      language: this.#language,
      locale: this.#locale,
      domain: this.#domain,
      subdomain: this.#subdomain,
      tenant: this.#tenant,
      request: { ...this.#request },
      resolution: { ...this.#resolution },
      config: { ...this.#config },
      branding: { ...this.#branding },
      navigation: { ...this.#navigation },
      seo: { ...this.#seo },
      i18n: { ...this.#i18n },
      maps: { ...this.#maps },
      analytics: { ...this.#analytics },
      providers: { ...this.#providers }
    }
  }
}

export default {
  ExperienceContext,
  ExperienceContextBuilder
}
