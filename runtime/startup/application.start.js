/**
 * Application Start — single, mandatory, deterministic, idempotent platform entry point
 *
 * P13.5.5 (Runtime Entry & Wiring): ONLY this module is allowed to instantiate the
 * RuntimeEngine, BootstrapPipeline, RepositoryEngine, AuthenticationRuntime, CMSRuntime
 * and the Capability Registry. The Commercial Aggregate (Business · Accommodation ·
 * Availability · Reservation · Visitor · Owner · Booking · Notification · Opportunity)
 * is wired here and exposed through a single runtime bundle.
 *
 * Determinism guarantees:
 * 1. Providers are disabled (RB3): the pipeline runs with FEATURE_DATABASE/AUTH/CMS/
 *    REPOSITORIES disabled, so its provider step stays a no-op-safe diagnostic.
 *    The wiring engine is built by runtime.bootstrap with the interface-only 'mock'
 *    repository adapter.
 * 2. Startup events are emitted in a fixed order: startup:started, runtime_ready,
 *    repositories_ready, capabilities_ready, contexts_ready, health_ready, completed.
 * 3. The returned bundle is idempotent: repeated start() calls return the same shape;
 *    cleanup() deactivates capabilities, shuts the runtime down and clears the bus.
 */
import { createEventBus } from '../../shared/events/eventbus.js'
import { BootstrapPipeline } from '../bootstrap/bootstrap.pipeline.js'
import { bootstrapRuntime } from './runtime.bootstrap.js'
import { registerRepositories } from './repository.bootstrap.js'
import { registerCapabilities } from './capability.bootstrap.js'
import { validateRuntime } from './runtime.validation.js'
import { StartupError, RuntimeBootstrapError, ValidationBootstrapError } from './startup.errors.js'
import { STARTUP_EVENTS, createStartupEvent } from './startup.events.js'

// Provider features are deliberately disabled (RB3): the pipeline's provider
// registration step would otherwise re-register 'database' and collide with the
// built-in RuntimeEngine module. The wiring engine boots on the 'mock' adapter.
const PIPELINE_OVERRIDES = {
  NODE_ENV: 'production',
  DEFAULT_PROVIDER: 'mock',
  FEATURE_DATABASE: false,
  FEATURE_AUTH: false,
  FEATURE_CMS: false,
  FEATURE_REPOSITORIES: false,
  FEATURE_STORAGE: false,
  FEATURE_MAIL: false,
  FEATURE_QUEUE: false,
  FEATURE_CACHE: false,
  FEATURE_PAYMENT: false,
  FEATURE_SEARCH: false,
  FEATURE_MEDIA: false,
  FEATURE_MAPS: false,
  FEATURE_ANALYTICS: false,
  FEATURE_AI: false,
}

const DEFAULT_TENANT = { id: 'commercial', name: 'Commercial', slug: 'commercial' }

/**
 * Start the Commercial platform.
 * @param {object} [options]
 * @param {object} [options.eventBus] - Shared event bus (created here if omitted)
 * @param {object} [options.sources] - Config sources for BootstrapConfig.load()
 * @param {object} [options.tenant] - Tenant metadata injected into capability contexts (RB5)
 * @param {object} [options.configuration] - Per-capability configuration
 * @returns {Promise<object>} - Full runtime bundle
 */
export async function start(options = {}) {
  const eventBus = options.eventBus || createEventBus()
  const sources = options.sources || {}

  eventBus.emit(STARTUP_EVENTS.STARTED, createStartupEvent(STARTUP_EVENTS.STARTED, { timestamp: Date.now() }))

  let pipeline
  let runtime
  let capabilityRegistry
  let capabilityContext

  try {
    // 1. BootstrapPipeline — deterministic configuration load (providers disabled, RB3)
    pipeline = new BootstrapPipeline(eventBus)
    const bootstrap = await pipeline.run({
      ...sources,
      overrides: { ...(sources.overrides || {}), ...PIPELINE_OVERRIDES },
    })

    const config = bootstrap.config
    const resolved = config.getAll()

    // 2. Runtime — build and boot the wiring engine (registering the repository runtime)
    runtime = await bootstrapRuntime({
      eventBus,
      config: {
        runtime: config.getRuntimeConfig(),
        tenant: options.tenant || DEFAULT_TENANT,
        capabilities: options.configuration || {},
      },
    })

    // 3. Repositories — register the commercial aggregate + support repos (registration only)
    const repositoryListing = registerRepositories(runtime.repositoryRuntime)
    eventBus.emit(STARTUP_EVENTS.REPOSITORIES_READY, createStartupEvent(STARTUP_EVENTS.REPOSITORIES_READY, {
      repositories: repositoryListing.length,
    }))

    // 4. Capabilities — register, initialize, activate the nine commercial capabilities
    const capabilities = await registerCapabilities(runtime, {
      tenant: options.tenant || DEFAULT_TENANT,
      configuration: options.configuration || {},
    })
    capabilityRegistry = capabilities.registry
    capabilityContext = capabilities.context

    // 5. Validation — static/structural verification of the assembled bundle
    const validation = validateRuntime(
      { ...runtime, capabilityRegistry },
      {
        tenant: true,
        persistence: true,
        eventbus: true,
        capability: true,
        database: resolved.FEATURE_DATABASE,
        auth: resolved.FEATURE_AUTH,
        cms: resolved.FEATURE_CMS,
      },
    )
    if (!validation.valid) {
      const failed = validation.checks.filter(c => !c.ok).map(c => `${c.name}: ${c.detail}`).join('; ')
      throw new ValidationBootstrapError(`Runtime validation failed: ${failed}`, { checks: validation.checks })
    }

    eventBus.emit(STARTUP_EVENTS.CONTEXTS_READY, createStartupEvent(STARTUP_EVENTS.CONTEXTS_READY, {
      repositories: typeof capabilityContext.repositories === 'object',
      runtime: Boolean(runtime.runtimeContext),
    }))

    let runtimeHealth = {}
    try {
      runtimeHealth = await runtime.engine.healthCheck()
    } catch {
      runtimeHealth = { application: 'unknown' }
    }

    eventBus.emit(STARTUP_EVENTS.HEALTH_READY, createStartupEvent(STARTUP_EVENTS.HEALTH_READY, {
      runtime: runtimeHealth,
      validation: validation.summary,
      pipeline: bootstrap.health,
    }))

    const bundle = {
      engine: runtime.engine,
      runtimeContext: runtime.runtimeContext,
      eventBus,
      repositoryRuntime: runtime.repositoryRuntime,
      authenticationRuntime: runtime.authenticationRuntime,
      cmsRuntime: runtime.cmsRuntime,
      capabilityRegistry,
      capabilityContext,
      validation,
      pipeline: {
        engine: pipeline.engine,
        health: bootstrap.health,
      },
      config: resolved,
      tenant: options.tenant || DEFAULT_TENANT,
    }

    eventBus.emit(STARTUP_EVENTS.COMPLETED, createStartupEvent(STARTUP_EVENTS.COMPLETED, {
      capabilities: capabilityRegistry.size,
      repositories: runtime.repositoryRuntime.registry.count,
      modules: runtime.engine.listModules(),
    }))

    bundle.cleanup = () => cleanup(bundle)
    return bundle
  } catch (err) {
    const wrapped = err instanceof StartupError
      ? err
      : new RuntimeBootstrapError(`Startup failed: ${err.message}`, { error: err })
    eventBus.emit(STARTUP_EVENTS.FAILED, createStartupEvent(STARTUP_EVENTS.FAILED, { error: wrapped.message }))
    throw wrapped
  }
}

/**
 * Deterministic, idempotent shutdown of a started bundle.
 * @param {object} bundle - Runtime bundle returned by start()
 */
export async function cleanup(bundle = {}) {
  const { capabilityRegistry, eventBus, engine, apiServer } = bundle

  if (apiServer) {
    try { await apiServer.shutdown() } catch {}
  }

  if (capabilityRegistry) {
    for (const capability of capabilityRegistry.getAll()) {
      try { if (typeof capability.deactivate === 'function') await capability.deactivate() } catch {}
      try { if (typeof capability.destroy === 'function') await capability.destroy() } catch {}
    }
  }

  if (engine && typeof engine.shutdown === 'function') {
    try { await engine.shutdown() } catch {}
  }

  if (eventBus && typeof eventBus.clear === 'function') {
    try { eventBus.clear() } catch {}
  }

  return true
}

/**
 * Start the Commercial platform WITH the API Layer.
 * This is the single entry point for the full platform (Runtime + API).
 *
 * P14.1 — API Layer Integration
 *
 * @param {object} [options]
 * @param {object} [options.eventBus] - Shared event bus (created here if omitted)
 * @param {object} [options.sources] - Config sources for BootstrapConfig.load()
 * @param {object} [options.tenant] - Tenant metadata injected into capability contexts
 * @param {object} [options.configuration] - Per-capability configuration
 * @param {object} [options.apiPort] - API server port (default: 3000)
 * @param {object} [options.apiHost] - API server host (default: 0.0.0.0)
 * @returns {Promise<object>} - Full runtime bundle with apiServer
 */
export async function startWithApi(options = {}) {
  const bundle = await start(options);

  if (bundle.runtimeContext) {
    global.runtimeContext = bundle.runtimeContext;
  }

  const { bootstrapApi } = await import('../../api/bootstrap/api.bootstrap.js');
  const apiPort = options.apiPort || process.env.API_PORT || 3000;
  const apiHost = options.apiHost || process.env.API_HOST || '0.0.0.0';

  const apiContext = {
    ...bundle.runtimeContext,
    capabilities: bundle.capabilityContext?.capabilities,
    repositories: bundle.repositoryRuntime,
    auth: bundle.authenticationRuntime,
    cms: bundle.cmsRuntime,
  };

  const apiServer = await bootstrapApi({
    port: apiPort,
    host: apiHost,
    env: options.env || process.env.NODE_ENV || 'development',
    runtimeContext: apiContext,
  });

  bundle.apiServer = apiServer;

  console.log(`Platform Runtime + API Server ready on ${apiHost}:${apiPort}`);

  return bundle;
}
