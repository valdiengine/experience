import { RuntimeRegistry } from './runtime.registry.js'
import { RuntimeFactory } from './runtime.factory.js'
import { RuntimeContext } from './runtime.context.js'
import { RuntimeLifecycle } from './runtime.lifecycle.js'
import { RuntimeHealth } from './runtime.health.js'
import { RUNTIME_EVENTS, createRuntimeEvent } from './runtime.events.js'
import { RuntimeInitializationError, ProviderRegistrationError, StartupOrderError, DependencyResolutionError } from './runtime.errors.js'
import { DuplicateProviderError, UnregisteredProviderError } from './bootstrap/bootstrap.errors.js'
import { AuthRuntimeIntegration } from './auth/integration/auth.runtime.integration.js'
import { AuthorizationRuntimeIntegration } from './auth/integration/authorization/authorization.runtime.integration.js'
import { CmsRuntimeIntegration } from './cms/integration/cms.runtime.integration.js'
import { DatabaseRuntime } from './contracts/database.runtime.js'

export class RuntimeEngine {
  #registry = null
  #factory = null
  #context = null
  #lifecycle = null
  #health = null
  #eventBus = null
  #modules = new Map()
  #initialized = false
  #started = false
  #config = {}

  constructor(config = {}) {
    this.#config = config
    this.#registry = new RuntimeRegistry()
    this.#factory = new RuntimeFactory(this.#registry, config)
    this.#context = new RuntimeContext(config)
    this.#lifecycle = new RuntimeLifecycle(config)
    this.#health = new RuntimeHealth(config)
  }

  get registry() { return this.#registry }
  get factory() { return this.#factory }
  get context() { return this.#context }
  get lifecycle() { return this.#lifecycle }
  get health() { return this.#health }
  get initialized() { return this.#initialized }
  get started() { return this.#started }

  setEventBus(eventBus) {
    this.#eventBus = eventBus
    this.#lifecycle.setEventBus(eventBus)
    this.#health.setEventBus(eventBus)
  }

  register(name, ProviderClass, config = {}) {
    if (this.#started) {
      throw new ProviderRegistrationError(`Cannot register "${name}" after engine has started`, { name })
    }
    this.#registry.register(name, { class: ProviderClass, ...config })
    this.#emit(RUNTIME_EVENTS.RUNTIME_REGISTERED, { name })
  }

  async initialize() {
    if (this.#initialized) return
    this.#registry.initialize()

    this.register('database', DatabaseRuntime, {
      version: '1.0.0',
      category: 'infrastructure',
      dependencies: [],
      priority: 500,
    })

    this.register('auth', AuthRuntimeIntegration, {
      version: '1.0.0',
      category: 'auth',
      dependencies: ['database'],
      priority: 400,
    })

    this.register('authorization', AuthorizationRuntimeIntegration, {
      version: '1.0.0',
      category: 'auth',
      dependencies: ['auth'],
      priority: 350,
    })

    this.register('cms', CmsRuntimeIntegration, {
      version: '1.0.0',
      category: 'cms',
      dependencies: ['database'],
      priority: 300,
    })

    this.#initialized = true
    this.#emit(RUNTIME_EVENTS.RUNTIME_INITIALIZED, { modules: this.#registry.list() })
  }

  async start() {
    if (!this.#initialized) await this.initialize()

    this.#validateRegistrations()

    const providers = this.#registry.list()
    for (const descriptor of providers) {
      if (descriptor.future) continue
      if (!descriptor.class) continue

      try {
        const provider = await this.#factory.create(descriptor.name, {
          config: descriptor.config,
          eventBus: this.#eventBus,
        })

        if (this.#isPostgresProvider(provider)) {
          await this.#wirePostgres(provider, descriptor)
        }

        await provider.initialize()
        this.#modules.set(descriptor.name, provider)
        this.#context.setModule(descriptor.name, provider)
      } catch (err) {
        this.#emit(RUNTIME_EVENTS.RUNTIME_PROVIDER_FAILED, {
          module: descriptor.name,
          error: err.message,
        })
        if (this.#config.fallbackOnFailure === false) {
          throw new RuntimeInitializationError(`Provider "${descriptor.name}" failed to start: ${err.message}`, { name: descriptor.name })
        }
      }
    }

    await this.#lifecycle.start(this, this.#registry)

    await this.#wireAuthToAuthorization()
    await this.#wireJwtToAuth()
    await this.#wireCms()

    this.#started = true
    this.#emit(RUNTIME_EVENTS.APPLICATION_READY, { modules: this.listModules() })
  }

  async shutdown() {
    this.#emit(RUNTIME_EVENTS.SHUTDOWN_STARTED, { timestamp: Date.now() })

    const shutdownOrder = this.#getShutdownOrder()

    for (const name of shutdownOrder) {
      const module = this.#modules.get(name)
      if (!module) continue

      try {
        this.#lifecycle.getState(name)
        this.#emit(RUNTIME_EVENTS.RUNTIME_SHUTDOWN, { module: name })

        if (typeof module.shutdown === 'function') await module.shutdown()
        if (typeof module.dispose === 'function') await module.dispose()
      } catch {
      }
    }

    await this.#factory.disposeAll()
    this.#modules.clear()
    this.#initialized = false
    this.#started = false
    this.#emit(RUNTIME_EVENTS.SHUTDOWN_COMPLETED, { timestamp: Date.now() })
  }

  async restart() {
    await this.shutdown()
    await this.start()
  }

  async healthCheck() {
    const result = {
      database: 'unknown',
      repository: 'unknown',
      runtime: this.#started ? 'healthy' : 'unknown',
      authentication: 'unknown',
      authorization: 'unknown',
      cms: 'unknown',
      providers: 'unknown',
      application: 'unknown',
    }

    const postgres = this.#modules.get('postgres')
    if (postgres) {
      try { const h = await postgres.healthCheck(); result.database = h?.status || 'healthy' } catch { result.database = 'unhealthy' }
    } else if (this.isAvailable('database')) {
      result.database = 'healthy'
    }

    const drizzle = this.#modules.get('drizzle')
    if (drizzle) {
      try { const h = await drizzle.healthCheck(); result.repository = h?.status || 'healthy' } catch { result.repository = 'unhealthy' }
    } else {
      result.repository = 'healthy'
    }

    const auth = this.#modules.get('auth')
    if (auth) {
      try { const h = await auth.health(); result.authentication = h?.status || 'healthy' } catch { result.authentication = 'unhealthy' }
    }

    const authz = this.#modules.get('authorization')
    if (authz) {
      try { const h = await authz.health(); result.authorization = h?.status || 'healthy' } catch { result.authorization = 'unhealthy' }
    }

    const cms = this.#modules.get('cms')
    if (cms) {
      try { const h = await cms.health(); result.cms = h?.status || 'healthy' } catch { result.cms = 'unhealthy' }
    }

    result.providers = this.#modules.size > 0 ? 'healthy' : 'unknown'
    result.application = result.database === 'healthy' && result.authentication !== 'unhealthy' ? 'ready' : 'degraded'

    return result
  }

  getModule(name) {
    return this.#modules.get(name) || null
  }

  getContext() {
    return this.#context
  }

  listModules() {
    return Array.from(this.#modules.keys())
  }

  isAvailable(name) {
    const module = this.#modules.get(name)
    return module?.available?.() ?? false
  }

  supports(name, feature) {
    const module = this.#modules.get(name)
    return module?.supports?.(feature) ?? false
  }

  async getRepository(entityName, context) {
    const repoEngine = this.#modules.get('repository')
    if (!repoEngine) return null
    return repoEngine.get(entityName, context)
  }

  async getRepositories(entityNames, context) {
    const repoEngine = this.#modules.get('repository')
    if (!repoEngine) return null
    return repoEngine.getMany(entityNames, context)
  }

  async beginTransaction(options = {}) {
    const postgres = this.#modules.get('postgres')
    if (!postgres) return null
    return postgres.pool.begin(options)
  }

  #validateRegistrations() {
    const descriptors = this.#registry.list()
    const names = new Set()
    const depMap = new Map()

    for (const d of descriptors) {
      if (names.has(d.name)) {
        throw new DuplicateProviderError(`Duplicate provider registration: "${d.name}"`, { name: d.name })
      }
      names.add(d.name)
      depMap.set(d.name, d.dependencies)
    }

    for (const d of descriptors) {
      if (d.future) continue
      for (const dep of d.dependencies) {
        if (!names.has(dep)) {
          throw new UnregisteredProviderError(`Provider "${d.name}" depends on "${dep}" which is not registered`, { name: d.name, dependency: dep })
        }
      }
    }

    this.#detectCircularDependencies(depMap)
  }

  #detectCircularDependencies(depMap) {
    const visited = new Set()
    const recursionStack = new Set()

    const dfs = (name) => {
      visited.add(name)
      recursionStack.add(name)

      const deps = depMap.get(name) || []
      for (const dep of deps) {
        if (!depMap.has(dep)) continue
        if (!visited.has(dep)) {
          dfs(dep)
        } else if (recursionStack.has(dep)) {
          throw new DependencyResolutionError(`Circular dependency detected: "${name}" -> "${dep}"`, { name, dependency: dep })
        }
      }

      recursionStack.delete(name)
    }

    for (const name of depMap.keys()) {
      if (!visited.has(name)) dfs(name)
    }
  }

  #getShutdownOrder() {
    const reversePriority = this.#registry.list()
      .filter(d => this.#modules.has(d.name))
      .sort((a, b) => (a.priority || 0) - (b.priority || 0))
    return reversePriority.map(d => d.name)
  }

  async #wirePostgres(provider, descriptor) {
    const drizzle = this.#modules.get('drizzle')
    if (drizzle) {
      try { await drizzle.initialize() } catch {}
    }
  }

  async #wireAuthToAuthorization() {
    const authModule = this.#modules.get('auth')
    const authzModule = this.#modules.get('authorization')
    if (authModule && authzModule?.context) {
      authModule.setAuthorizationContext(authzModule.context)
    }
  }

  async #wireJwtToAuth() {
    const jwtProvider = this.#modules.get('jwt')
    const authModule = this.#modules.get('auth')
    if (jwtProvider && authModule?.registerProvider) {
      authModule.registerProvider('jwt', jwtProvider.constructor, this.#registry.metadata('jwt')?.config || {})
    }
  }

  async #wireCms() {
    const cmsModule = this.#modules.get('cms')
    if (!cmsModule) return

    const wordpressProvider = this.#modules.get('wordpress')
    if (wordpressProvider) {
      cmsModule.registerProvider('wordpress', wordpressProvider.constructor, {})
    }
  }

  #isPostgresProvider(provider) {
    return provider?.constructor?.name === 'PostgresProvider'
  }

  #emit(event, data) {
    if (this.#eventBus) {
      this.#eventBus.emit(event, createRuntimeEvent(event, data))
    }
  }
}

export default RuntimeEngine
