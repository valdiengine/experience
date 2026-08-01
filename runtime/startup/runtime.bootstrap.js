/**
 * Runtime Bootstrap — builds and boots the application runtime
 *
 * P13.5.5 (Runtime Entry & Wiring): creates/assembles the RuntimeContext, RuntimeEngine,
 * EventBus, RepositoryRuntime, AuthenticationRuntime and CMSRuntime, then boots the
 * runtime so all modules (database, auth, authorization, cms, repository) are
 * instantiated and wired into the shared RuntimeContext.
 *
 * Strictly wiring: no business logic, no persistence logic, no provider implementation.
 * Provider-agnostic: the repository runtime boots on the interface-only 'mock' adapter.
 */
import { createEventBus } from '../../shared/events/eventbus.js'
import { RuntimeEngine } from '../runtime.engine.js'
import { RepositoryEngine } from '../../capabilities/persistence/engine/repository.engine.js'
import { MockRepositoryAdapter } from '../../capabilities/persistence/adapters/mock/mock.repository.adapter.js'
import { RuntimeBootstrapError } from './startup.errors.js'
import { STARTUP_EVENTS, createStartupEvent } from './startup.events.js'

/**
 * Bootstrap the application runtime.
 * @param {object} [options]
 * @param {object} [options.engine] - Pre-created RuntimeEngine (recommended; created here if omitted)
 * @param {object} [options.eventBus] - Shared event bus (created here if omitted)
 * @param {object} [options.config] - Resolved configuration (tenant, runtime, capabilities)
 * @returns {Promise<{
 *   engine: RuntimeEngine,
 *   runtimeContext: RuntimeContext,
 *   eventBus: object,
 *   repositoryRuntime: RepositoryEngine,
 *   authenticationRuntime: object,
 *   cmsRuntime: object,
 *   config: object,
 * }>}
 */
export async function bootstrapRuntime(options = {}) {
  const config = options.config || {}
  const eventBus = options.eventBus || createEventBus()
  const engine = options.engine || new RuntimeEngine(config.runtime || {})
  engine.setEventBus(eventBus)

  try {
    // RuntimeContext — the engine owns its context; expose it for injection into capabilities
    const runtimeContext = engine.getContext()

    // RepositoryRuntime — registered as an engine module BEFORE start so that
    // engine.getRepository()/getRepositories() and runtime.context.repository work.
    // Provider-agnostic: only the interface-only 'mock' adapter is registered below.
    engine.register('repository', RepositoryEngine, {
      version: '1.0.0',
      category: 'persistence',
      dependencies: ['database'],
      priority: 700,
    })

    // Boot the runtime: engine.initialize() registers the built-in modules
    // (database, auth, authorization, cms); engine.start() instantiates and wires them.
    await engine.initialize()
    await engine.start()

    // AuthenticationRuntime + CMSRuntime — existing runtime modules produced by the engine
    const authenticationRuntime = engine.getModule('auth')
    const cmsRuntime = engine.getModule('cms')

    // Register the boot-only mock adapter on the repository runtime so repositories
    // can be resolved without any production provider. NOT a production adapter.
    const repositoryRuntime = engine.getModule('repository')
    if (repositoryRuntime) {
      repositoryRuntime.setEventBus(eventBus)
      repositoryRuntime.registerAdapter('mock', MockRepositoryAdapter)
    }

    eventBus.emit(STARTUP_EVENTS.RUNTIME_READY, createStartupEvent(STARTUP_EVENTS.RUNTIME_READY, {
      modules: engine.listModules(),
      repositoryRuntime: Boolean(repositoryRuntime),
      authenticationRuntime: Boolean(authenticationRuntime),
      cmsRuntime: Boolean(cmsRuntime),
    }))

    return {
      engine,
      runtimeContext,
      eventBus,
      repositoryRuntime,
      authenticationRuntime,
      cmsRuntime,
      config,
    }
  } catch (err) {
    eventBus.emit(STARTUP_EVENTS.FAILED, createStartupEvent(STARTUP_EVENTS.FAILED, { error: err.message }))
    throw new RuntimeBootstrapError(`Failed to bootstrap runtime: ${err.message}`, { error: err })
  }
}

export default bootstrapRuntime
