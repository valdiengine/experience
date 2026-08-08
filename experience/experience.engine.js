/**
 * Experience Engine Core
 * 
 * Central orchestrator for experience composition.
 * Resolves products, loads ecosystems, composes experiences.
 */

import { ExperienceContext, ExperienceContextBuilder } from './experience.context.js'
import { ExperienceEngineError, ExperienceCompositionError, ExperienceLifecycleError } from './experience.errors.js'
import { EXPERIENCE_EVENTS, createExperienceEvent } from './experience.events.js'

export class ExperienceEngine {
  #config = null
  #eventBus = null
  #resolvers = null
  #loaders = null
  #composition = null
  #context = null
  #initialized = false
  #started = false

  constructor(config = {}) {
    this.#config = {
      debug: false,
      cacheEnabled: false,
      defaultLocale: 'es-CL',
      defaultLanguage: 'es',
      ...config
    }
    
    this.#resolvers = new Map()
    this.#loaders = new Map()
    this.#context = null
  }

  get context() {
    return this.#context
  }

  get initialized() {
    return this.#initialized
  }

  get started() {
    return this.#started
  }

  get config() {
    return { ...this.#config }
  }

  setEventBus(eventBus) {
    this.#eventBus = eventBus
    return this
  }

  registerResolver(name, resolver) {
    this.#resolvers.set(name, resolver)
    return this
  }

  registerLoader(name, loader) {
    this.#loaders.set(name, loader)
    return this
  }

  setComposition(composition) {
    this.#composition = composition
    return this
  }

  async initialize() {
    if (this.#initialized) {
      throw new ExperienceLifecycleError('Experience Engine already initialized')
    }

    this.#emit(EXPERIENCE_EVENTS.EXPERIENCE_INITIALIZING, {})

    try {
      for (const [name, resolver] of this.#resolvers) {
        if (typeof resolver.initialize === 'function') {
          await resolver.initialize(this.#config)
        }
      }

      for (const [name, loader] of this.#loaders) {
        if (typeof loader.initialize === 'function') {
          await loader.initialize(this.#config)
        }
      }

      if (this.#composition) {
        await this.#composition.initialize(this.#config)
      }

      this.#initialized = true
      
      this.#emit(EXPERIENCE_EVENTS.EXPERIENCE_INITIALIZED, {
        initializedAt: new Date().toISOString()
      })

      this.#log('Experience Engine initialized')
      return true
    } catch (error) {
      throw new ExperienceLifecycleError(`Failed to initialize: ${error.message}`, {
        error: error.message
      })
    }
  }

  async resolve(request) {
    if (!this.#initialized) {
      throw new ExperienceEngineError('Engine not initialized')
    }

    this.#emit(EXPERIENCE_EVENTS.EXPERIENCE_RESOLVING, { request })

    try {
      const productResolver = this.#resolvers.get('product')
      const ecosystemResolver = this.#resolvers.get('ecosystem')

      if (!productResolver) {
        throw new ExperienceEngineError('Product resolver not registered')
      }

      if (!ecosystemResolver) {
        throw new ExperienceEngineError('Ecosystem resolver not registered')
      }

      const productContext = await productResolver.resolve(request)
      
      this.#emit(EXPERIENCE_EVENTS.PRODUCT_RESOLVED, { context: productContext })

      const ecosystemContext = await ecosystemResolver.resolve(productContext)
      
      this.#emit(EXPERIENCE_EVENTS.ECOSYSTEM_LOADED, { context: ecosystemContext })

      return ecosystemContext
    } catch (error) {
      this.#emit(EXPERIENCE_EVENTS.PRODUCT_RESOLUTION_FAILED, {
        error: error.message,
        request
      })
      throw error
    }
  }

  async load(context) {
    if (!this.#initialized) {
      throw new ExperienceEngineError('Engine not initialized')
    }

    this.#emit(EXPERIENCE_EVENTS.EXPERIENCE_LOADING, { context })

    try {
      const configLoader = this.#loaders.get('configuration')
      const experienceLoader = this.#loaders.get('experience')
      const moduleResolver = this.#resolvers.get('module')
      const capabilityResolver = this.#resolvers.get('capability')

      if (!configLoader) {
        throw new ExperienceEngineError('Configuration loader not registered')
      }

      if (!experienceLoader) {
        throw new ExperienceEngineError('Experience loader not registered')
      }

      const mergedConfig = await configLoader.load(context)
      
      this.#emit(EXPERIENCE_EVENTS.CONFIGURATION_LOADED, { config: mergedConfig })

      const experienceConfig = await experienceLoader.load(mergedConfig)
      
      this.#emit(EXPERIENCE_EVENTS.EXPERIENCE_LOADED, { config: experienceConfig })

      let modules = []
      let capabilities = []

      if (moduleResolver) {
        const moduleContext = await moduleResolver.resolve(mergedConfig)
        modules = moduleContext.modules || []
        capabilities = moduleContext.capabilities || []
        this.#emit(EXPERIENCE_EVENTS.MODULE_RESOLVED, { modules })
      }

      if (capabilityResolver && modules.length > 0) {
        const capContext = await capabilityResolver.resolve({
          ...mergedConfig,
          modules,
          capabilities
        })
        capabilities = capContext.capabilities || capabilities
        this.#emit(EXPERIENCE_EVENTS.CAPABILITY_RESOLVED, { capabilities })
      }

      return {
        ...context,
        ...mergedConfig,
        config: mergedConfig.config,
        experience: experienceConfig,
        modules,
        capabilities
      }
    } catch (error) {
      this.#emit(EXPERIENCE_EVENTS.ECOSYSTEM_LOAD_FAILED, {
        error: error.message,
        context
      })
      throw error
    }
  }

  async compose(context) {
    if (!this.#initialized) {
      throw new ExperienceEngineError('Engine not initialized')
    }

    if (!context.config || !context.experience) {
      throw new ExperienceCompositionError('Invalid context: missing config or experience')
    }

    this.#emit(EXPERIENCE_EVENTS.EXPERIENCE_COMPOSING, { context })

    try {
      if (!this.#composition) {
        throw new ExperienceEngineError('Composition not configured')
      }

      const composed = await this.#composition.compose(context)
      
      const builder = new ExperienceContextBuilder()
        .setPlatform(composed.platform || 'valdi')
        .setCountry(composed.country)
        .setRegion(composed.region)
        .setDestination(composed.destination)
        .setEcosystem(composed.ecosystem)
        .setCompany(composed.company)
        .setExperience(composed.experience)
        .setModules(composed.modules || [])
        .setCapabilities(composed.capabilities || [])
        .setModulesConfig(composed.modulesConfig || {})
        .setTheme(composed.theme)
        .setLanguage(composed.language || this.#config.defaultLanguage)
        .setLocale(composed.locale || this.#config.defaultLocale)
        .setDomain(composed.domain)
        .setSubdomain(composed.subdomain)
        .setTenant(composed.tenant)
        .setRequest(composed.request)
        .setResolution(composed.resolution)
        .setConfig(composed.config)
        .setBranding(composed.branding)
        .setNavigation(composed.navigation)
        .setSeo(composed.seo)
        .setI18n(composed.i18n)
        .setMaps(composed.maps)
        .setAnalytics(composed.analytics)
        .setProviders(composed.providers)

      this.#context = builder.build()
      
      this.#emit(EXPERIENCE_EVENTS.EXPERIENCE_COMPOSED, {
        context: this.#context
      })

      return this.#context
    } catch (error) {
      this.#emit(EXPERIENCE_EVENTS.EXPERIENCE_FAILED, {
        error: error.message,
        context
      })
      throw new ExperienceCompositionError(`Composition failed: ${error.message}`, {
        error: error.message
      })
    }
  }

  async resolveAndCompose(request) {
    const resolved = await this.resolve(request)
    const loaded = await this.load(resolved)
    return await this.compose(loaded)
  }

  async start() {
    if (!this.#initialized) {
      throw new ExperienceLifecycleError('Engine must be initialized before starting')
    }

    if (this.#started) {
      throw new ExperienceLifecycleError('Experience Engine already started')
    }

    this.#started = true
    this.#log('Experience Engine started')
    
    return true
  }

  async stop() {
    if (!this.#started) {
      return false
    }

    this.#emit(EXPERIENCE_EVENTS.EXPERIENCE_STOPPING, {})

    try {
      for (const [name, resolver] of this.#resolvers) {
        if (typeof resolver.stop === 'function') {
          await resolver.stop()
        }
      }

      for (const [name, loader] of this.#loaders) {
        if (typeof loader.stop === 'function') {
          await loader.stop()
        }
      }

      if (this.#composition && typeof this.#composition.stop === 'function') {
        await this.#composition.stop()
      }

      this.#started = false
      
      this.#emit(EXPERIENCE_EVENTS.EXPERIENCE_STOPPED, {
        stoppedAt: new Date().toISOString()
      })

      this.#log('Experience Engine stopped')
      return true
    } catch (error) {
      throw new ExperienceLifecycleError(`Failed to stop: ${error.message}`, {
        error: error.message
      })
    }
  }

  async healthCheck() {
    const health = {
      status: 'healthy',
      initialized: this.#initialized,
      started: this.#started,
      contextReady: !!this.#context,
      resolvers: {},
      loaders: {},
      composition: null,
      timestamp: new Date().toISOString()
    }

    for (const [name, resolver] of this.#resolvers) {
      try {
        if (typeof resolver.healthCheck === 'function') {
          health.resolvers[name] = await resolver.healthCheck()
        } else {
          health.resolvers[name] = { status: 'ok' }
        }
      } catch (e) {
        health.resolvers[name] = { status: 'error', error: e.message }
        health.status = 'degraded'
      }
    }

    for (const [name, loader] of this.#loaders) {
      try {
        if (typeof loader.healthCheck === 'function') {
          health.loaders[name] = await loader.healthCheck()
        } else {
          health.loaders[name] = { status: 'ok' }
        }
      } catch (e) {
        health.loaders[name] = { status: 'error', error: e.message }
        health.status = 'degraded'
      }
    }

    if (this.#composition) {
      try {
        if (typeof this.#composition.healthCheck === 'function') {
          health.composition = await this.#composition.healthCheck()
        } else {
          health.composition = { status: 'ok' }
        }
      } catch (e) {
        health.composition = { status: 'error', error: e.message }
        health.status = 'degraded'
      }
    }

    this.#emit(EXPERIENCE_EVENTS.EXPERIENCE_HEALTH_RESULT, health)

    return health
  }

  getContext() {
    return this.#context
  }

  getContextBuilder() {
    return new ExperienceContextBuilder()
  }

  getExperience() {
    return this.#context?.experience || null
  }

  getModules() {
    return this.#context?.modules || []
  }

  getCapabilities() {
    return this.#context?.capabilities || []
  }

  hasModule(moduleId) {
    return !!(this.#context?.modules && this.#context.modules.includes(moduleId))
  }

  hasCapability(capabilityId) {
    return !!(this.#context?.capabilities && this.#context.capabilities.includes(capabilityId))
  }

  getResolver(name) {
    return this.#resolvers.get(name) || null
  }

  getLoader(name) {
    return this.#loaders.get(name) || null
  }

  #emit(event, data) {
    if (this.#eventBus) {
      this.#eventBus.emit(event, createExperienceEvent(event, data))
    }
  }

  #log(message, ...args) {
    if (this.#config.debug) {
      console.log(`[ExperienceEngine] ${message}`, ...args)
    }
  }

  static async create(config = {}) {
    const engine = new ExperienceEngine(config)
    return engine
  }
}

export default ExperienceEngine
