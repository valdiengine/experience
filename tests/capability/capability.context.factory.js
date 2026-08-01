/**
 * RuntimeFactory — deterministic test runtime for capability suites (P13.5.7)
 *
 * Assembles the same wiring pieces the application uses (bootstrapRuntime,
 * registerRepositories, registerCapabilities) but:
 *   1. wraps the event bus with a recording mock bus,
 *   2. swaps the interface-only 'mock' adapter for the writable in-memory
 *      adapter BEFORE any repository is resolved,
 *   3. swaps `context.runtime` for provider mocks (auth/authorization/search/
 *      sync/cms) so suites exercise capabilities deterministically.
 *
 * No business logic, no runtime source changes, no replacement of the
 * `runtime/startup/smoke.test.js` harness.
 */
import { createEventBus } from '../../shared/events/eventbus.js'
import { bootstrapRuntime } from '../../runtime/startup/runtime.bootstrap.js'
import { registerRepositories } from '../../runtime/startup/repository.bootstrap.js'
import { registerCapabilities } from '../../runtime/startup/capability.bootstrap.js'
import { createMockEventBus } from './capability.mock.eventbus.js'
import { createMockRuntime } from './capability.mock.runtime.js'
import { InMemoryRepositoryAdapter } from './capability.mock.repositories.js'

export const TEST_TENANT = { id: 'commercial', name: 'Commercial', slug: 'commercial' }

export const TEST_IDENTITY = {
  id: 'identity-owner-1',
  provider: 'local',
  roles: ['business:owner'],
  tenantId: 'commercial',
}

/**
 * Build a full test bundle.
 * @param {object} [options]
 * @param {object} [options.tenant] - Tenant for capability context
 * @param {object} [options.configuration] - Per-capability configuration
 * @returns {Promise<object>} bundle
 */
export async function createTestBundle(options = {}) {
  const tenant = options.tenant || TEST_TENANT
  const configuration = options.configuration || {}

  const realBus = createEventBus()
  const eventBus = createMockEventBus(realBus)
  const mockRuntime = createMockRuntime()

  const config = { runtime: {}, tenant, capabilities: {} }
  const runtime = await bootstrapRuntime({ eventBus, config })

  runtime.repositoryRuntime.registerAdapter('mock', InMemoryRepositoryAdapter)

  registerRepositories(runtime.repositoryRuntime)

  const { registry, context, capabilities } = await registerCapabilities(runtime, {
    tenant,
    configuration,
  })

  context.runtime = mockRuntime

  const repoCache = new Map()
  const repo = async (entityName) => {
    if (repoCache.has(entityName)) return repoCache.get(entityName)
    const instance = await runtime.repositoryRuntime.get(entityName, context)
    repoCache.set(entityName, instance)
    return instance
  }

  const bundle = {
    tenant,
    identity: TEST_IDENTITY,
    engine: runtime.engine,
    runtimeContext: runtime.runtimeContext,
    realBus,
    eventBus,
    mockRuntime,
    repositoryRuntime: runtime.repositoryRuntime,
    repositoryRegistry: runtime.repositoryRuntime.registry,
    registry,
    context,
    capabilities,
    repo,
    store: InMemoryRepositoryAdapter.store,
    capability: (id) => registry.get(id),
    async teardown() {
      for (const capability of capabilities) {
        try { await capability.deactivate() } catch { /* best-effort */ }
        try { await capability.destroy() } catch { /* best-effort */ }
      }
      try { await runtime.engine.shutdown() } catch { /* best-effort */ }
      try { await runtime.engine.dispose() } catch { /* best-effort */ }
      InMemoryRepositoryAdapter.reset()
      repoCache.clear()
    },
  }

  return bundle
}

export default createTestBundle
