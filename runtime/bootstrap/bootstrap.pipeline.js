import { RuntimeEngine } from '../runtime.engine.js'
import { RuntimeHealth } from '../runtime.health.js'
import { BootstrapConfig } from './bootstrap.config.js'
import { BootstrapInitializationError, ProviderRegistrationError, StartupOrderError, DependencyResolutionError, CircularDependencyError, DuplicateProviderError, UnregisteredProviderError, PendingMigrationsError } from './bootstrap.errors.js'
import { BOOTSTRAP_EVENTS, createBootstrapEvent } from './bootstrap.events.js'

export class BootstrapPipeline {
  #config = null
  #engine = null
  #eventBus = null
  #startedAt = 0
  #steps = new Map()

  constructor(eventBus) {
    this.#eventBus = eventBus
  }

  get config() { return this.#config }
  get engine() { return this.#engine }

  async run(sources = {}) {
    this.#startedAt = Date.now()

    try {
      this.#emit(BOOTSTRAP_EVENTS.BOOT_STARTED, { timestamp: this.#startedAt })

      const config = await this.#step('loadConfiguration', () => this.#loadConfiguration(sources))
      const engine = await this.#step('buildRuntime', () => this.#buildRuntime(config))
      const providers = await this.#step('registerProviders', () => this.#registerProviders(engine, config))
      const repositoryEngine = await this.#step('initializeRepositories', () => this.#initializeRepositories(engine, config))
      const capabilities = await this.#step('initializeCapabilities', () => this.#initializeCapabilities(engine, config))
      const cms = await this.#step('initializeCMS', () => this.#initializeCMS(engine, config))
      const auth = await this.#step('initializeAuthentication', () => this.#initializeAuthentication(engine, config))
      const runtime = await this.#step('initializeRuntime', () => this.#initializeRuntime(engine, config))
      const health = await this.#step('healthCheck', () => this.#healthCheck(engine))

      this.#emit(BOOTSTRAP_EVENTS.APPLICATION_READY, {
        duration: Date.now() - this.#startedAt,
        steps: Array.from(this.#steps.entries()).map(([name, data]) => ({ name, duration: data.duration, status: data.status })),
      })

      return {
        engine,
        config,
        providers,
        repositoryEngine,
        capabilities,
        cms,
        auth,
        runtime,
        health,
      }
    } catch (err) {
      this.#emit(BOOTSTRAP_EVENTS.BOOT_FAILED, {
        error: err.message,
        duration: Date.now() - this.#startedAt,
        step: err.step || 'unknown',
      })
      throw err
    }
  }

  async #step(name, fn) {
    const start = Date.now()
    this.#emit(BOOTSTRAP_EVENTS.BOOT_STEP_STARTED, { step: name })

    try {
      const result = await fn()
      const duration = Date.now() - start
      this.#steps.set(name, { status: 'completed', duration })
      this.#emit(BOOTSTRAP_EVENTS.BOOT_STEP_COMPLETED, { step: name, duration })
      return result
    } catch (err) {
      const duration = Date.now() - start
      this.#steps.set(name, { status: 'failed', duration, error: err.message })
      this.#emit(BOOTSTRAP_EVENTS.BOOT_STEP_FAILED, { step: name, duration, error: err.message })
      err.step = name
      throw err
    }
  }

  async #loadConfiguration(sources) {
    this.#config = new BootstrapConfig()
    await this.#config.load(sources)
    this.#emit(BOOTSTRAP_EVENTS.CONFIGURATION_LOADED, { keys: Object.keys(this.#config.getAll()).length })
    return this.#config
  }

  async #buildRuntime(config) {
    const runtimeConfig = config.getRuntimeConfig()
    this.#engine = new RuntimeEngine(runtimeConfig)
    if (this.#eventBus) {
      this.#engine.setEventBus(this.#eventBus)
    }
    this.#emit(BOOTSTRAP_EVENTS.RUNTIME_BUILT, { version: '1.0.0' })
    return this.#engine
  }

  async #registerProviders(engine, config) {
    const features = config.getFeatureFlags()

    if (features.database) {
      const { PostgresProvider } = await import('../../capabilities/persistence/providers/postgres/postgres.provider.js')
      const { DrizzleProvider } = await import('../../capabilities/persistence/providers/postgres/drizzle/drizzle.provider.js')

      engine.register('postgres', PostgresProvider, {
        version: '1.0.0',
        category: 'database',
        dependencies: [],
        priority: 900,
        ...config.getDatabaseConfig(),
      })

      engine.register('drizzle', DrizzleProvider, {
        version: '1.0.0',
        category: 'database',
        dependencies: ['postgres'],
        priority: 850,
      })

      engine.register('database', null, {
        version: '1.0.0',
        category: 'database',
        dependencies: ['postgres', 'drizzle'],
        priority: 800,
      })
    }

    if (features.repositories) {
      const { RepositoryEngine } = await import('../../capabilities/persistence/engine/repository.engine.js')

      engine.register('repository', RepositoryEngine, {
        version: '1.0.0',
        category: 'persistence',
        dependencies: ['database', 'postgres', 'drizzle'],
        priority: 700,
      })
    }

    if (features.auth) {
      const { JwtProvider } = await import('../auth/providers/jwt/jwt.provider.js')

      engine.register('jwt', JwtProvider, {
        version: '1.0.0',
        category: 'auth',
        dependencies: [],
        priority: 600,
        ...config.getAuthConfig(),
      })
    }

    if (features.cms) {
      const { CmsRuntimeIntegration } = await import('../cms/integration/cms.runtime.integration.js')

      engine.register('cms', CmsRuntimeIntegration, {
        version: '1.0.0',
        category: 'cms',
        dependencies: ['database'],
        priority: 300,
      })
    }

    this.#registerFutureProviders(engine, features)

    this.#emit(BOOTSTRAP_EVENTS.PROVIDERS_REGISTERED, { count: engine.registry.count })
    return engine.listModules()
  }

  #registerFutureProviders(engine, features) {
    const futureSlots = {
      storage: { category: 'storage', priority: 750, enabled: features.storage },
      mail: { category: 'communication', priority: 450, enabled: features.mail },
      queue: { category: 'infrastructure', priority: 550, enabled: features.queue },
      cache: { category: 'infrastructure', priority: 650, enabled: features.cache },
      payment: { category: 'payment', priority: 400, enabled: features.payment },
      search: { category: 'search', priority: 350, enabled: features.search },
      media: { category: 'media', priority: 500, enabled: features.media },
      maps: { category: 'maps', priority: 250, enabled: features.maps },
      analytics: { category: 'analytics', priority: 200, enabled: features.analytics },
      ai: { category: 'ai', priority: 150, enabled: features.ai },
    }

    for (const [name, slot] of Object.entries(futureSlots)) {
      if (slot.enabled === false) continue
      engine.register(name, null, {
        version: '0.0.0',
        category: slot.category,
        dependencies: [],
        priority: slot.priority,
        future: true,
      })
    }
  }

  async #initializeRepositories(engine, config) {
    this.#emit(BOOTSTRAP_EVENTS.REPOSITORIES_INITIALIZED, { count: 0 })
    return {}
  }

  async #initializeCapabilities(engine, config) {
    this.#emit(BOOTSTRAP_EVENTS.CAPABILITIES_INITIALIZED, { count: 0 })
    return []
  }

  async #initializeCMS(engine, config) {
    this.#emit(BOOTSTRAP_EVENTS.CMS_INITIALIZED, { status: 'initialized' })
  }

  async #initializeAuthentication(engine, config) {
    this.#emit(BOOTSTRAP_EVENTS.AUTH_INITIALIZED, { status: 'initialized' })
  }

  async #initializeRuntime(engine, config) {
    await engine.initialize()
    await engine.start()

    const postgres = engine.getModule('postgres')
    const drizzle = engine.getModule('drizzle')

    if (postgres && drizzle) {
      const auth = engine.getModule('auth')
      if (auth?.registerProvider) {
        const { JwtProvider } = await import('../auth/providers/jwt/jwt.provider.js')
        auth.registerProvider('jwt', JwtProvider, engine.registry.metadata('jwt')?.config || {})
      }

      const cms = engine.getModule('cms')
      if (cms?.setContracts) {
        cms.setContracts({})
      }
    }

    this.#emit(BOOTSTRAP_EVENTS.RUNTIME_INITIALIZED, { modules: engine.listModules() })
  }

  async #healthCheck(engine) {
    const postgres = engine.getModule('postgres')
    const drizzle = engine.getModule('drizzle')
    const auth = engine.getModule('auth')
    const cms = engine.getModule('cms')
    const health = engine.healthCheck()

    let dbStatus = 'healthy'
    let repoStatus = 'healthy'
    let runtimeStatus = 'healthy'
    let authStatus = 'healthy'
    let authzStatus = 'healthy'
    let cmsStatus = 'healthy'
    let providerStatus = 'healthy'

    if (postgres) {
      try { const h = await postgres.healthCheck(); dbStatus = h?.status || 'healthy' } catch { dbStatus = 'unhealthy' }
    }

    if (drizzle) {
      try { const h = await drizzle.healthCheck(); repoStatus = h?.status || 'healthy' } catch { repoStatus = 'unhealthy' }
    }

    if (auth) {
      try { const h = await auth.health(); authStatus = h?.status || 'healthy' } catch { authStatus = 'unhealthy' }
    }

    if (cms) {
      try { const h = await cms.health(); cmsStatus = h?.status || 'healthy' } catch { cmsStatus = 'unhealthy' }
    }

    const result = {
      database: dbStatus,
      repository: repoStatus,
      runtime: runtimeStatus,
      authentication: authStatus,
      authorization: authzStatus,
      cms: cmsStatus,
      providers: providerStatus,
      application: dbStatus === 'healthy' ? 'ready' : 'degraded',
    }

    this.#emit(BOOTSTRAP_EVENTS.HEALTH_CHECK_COMPLETED, result)
    return result
  }

  #emit(event, data) {
    if (this.#eventBus) {
      this.#eventBus.emit(event, createBootstrapEvent(event, data))
    }
  }
}

export default BootstrapPipeline
