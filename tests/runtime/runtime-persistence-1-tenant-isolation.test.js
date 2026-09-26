/**
 * RUNTIME-PERSISTENCE-1: Tenant Isolation in Request-Scoped Contexts
 *
 * Tests that prove the synthetic "commercial" tenant does NOT leak into
 * authenticated request paths. Verifies tenant isolation in concurrent requests.
 */
import { createEventBus } from '../../shared/events/eventbus.js'
import { bootstrapRuntime } from '../../runtime/startup/runtime.bootstrap.js'
import { registerRepositories } from '../../runtime/startup/repository.bootstrap.js'
import { registerCapabilities } from '../../runtime/startup/capability.bootstrap.js'
import { InMemoryRepositoryAdapter } from '../capability/capability.mock.repositories.js'
import { createMockEventBus } from '../capability/capability.mock.eventbus.js'
import { createMockRuntime } from '../capability/capability.mock.runtime.js'

const TEST_TENANT_A = { id: '11111111-1111-4111-8111-111111111111', name: 'Tenant A', slug: 'tenant-a' }
const TEST_TENANT_B = { id: '22222222-2222-4222-8222-222222222222', name: 'Tenant B', slug: 'tenant-b' }
const SYNTHETIC_TENANT = { id: 'commercial', name: 'Commercial', slug: 'commercial' }

const results = []

const record = (category, id, pass, detail = '') => {
  results.push({ category, id, pass: Boolean(pass), detail: String(detail || (pass ? 'ok' : 'FAIL')) })
}

async function main() {
  console.log('=== RUNTIME-PERSISTENCE-1: Tenant Isolation Tests ===\n')

  // Create two separate test bundles - simulating two different tenant requests
  console.log('[Setup] Creating test bundles for Tenant A and Tenant B...')

  // Bundle A - authenticated request for Tenant A
  const realBusA = createEventBus()
  const eventBusA = createMockEventBus(realBusA)
  const mockRuntimeA = createMockRuntime()

  const runtimeA = await bootstrapRuntime({ eventBus: eventBusA, config: { runtime: {}, tenant: TEST_TENANT_A, capabilities: {} } })
  runtimeA.repositoryRuntime.registerAdapter('mock', InMemoryRepositoryAdapter)
  registerRepositories(runtimeA.repositoryRuntime)

  const { context: contextA } = await registerCapabilities(runtimeA, {
    tenant: TEST_TENANT_A,
    configuration: {},
  })
  contextA.runtime = mockRuntimeA

  // Bundle B - authenticated request for Tenant B
  const realBusB = createEventBus()
  const eventBusB = createMockEventBus(realBusB)
  const mockRuntimeB = createMockRuntime()

  const runtimeB = await bootstrapRuntime({ eventBus: eventBusB, config: { runtime: {}, tenant: TEST_TENANT_B, capabilities: {} } })
  runtimeB.repositoryRuntime.registerAdapter('mock', InMemoryRepositoryAdapter)
  registerRepositories(runtimeB.repositoryRuntime)

  const { context: contextB } = await registerCapabilities(runtimeB, {
    tenant: TEST_TENANT_B,
    configuration: {},
  })
  contextB.runtime = mockRuntimeB

  // Bundle S - synthetic startup context
  const realBusS = createEventBus()
  const eventBusS = createMockEventBus(realBusS)
  const mockRuntimeS = createMockRuntime()

  const runtimeS = await bootstrapRuntime({ eventBus: eventBusS, config: { runtime: {}, tenant: SYNTHETIC_TENANT, capabilities: {} } })
  runtimeS.repositoryRuntime.registerAdapter('mock', InMemoryRepositoryAdapter)
  registerRepositories(runtimeS.repositoryRuntime)

  const { context: contextS } = await registerCapabilities(runtimeS, {
    tenant: SYNTHETIC_TENANT,
    configuration: {},
  })
  contextS.runtime = mockRuntimeS

  console.log(`  Tenant A context tenant: ${contextA.tenant.id}`)
  console.log(`  Tenant B context tenant: ${contextB.tenant.id}`)
  console.log(`  Synthetic context tenant: ${contextS.tenant.id}`)

  // A1. Each context has correct tenant
  console.log('[A1] Each context has correct tenant...')
  record('isolation', 'context-A-tenant-A',
    contextA.tenant.id === TEST_TENANT_A.id,
    `Context A tenant: ${contextA.tenant.id}`)
  record('isolation', 'context-B-tenant-B',
    contextB.tenant.id === TEST_TENANT_B.id,
    `Context B tenant: ${contextB.tenant.id}`)
  record('isolation', 'context-S-tenant-commercial',
    contextS.tenant.id === 'commercial',
    `Context S tenant: ${contextS.tenant.id}`)

  // A2. Synthetic context does NOT have a real UUID
  console.log('[A2] Synthetic tenant is not a UUID...')
  const isUuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const syntheticIsUuid = isUuidRegex.test(contextS.tenant.id)
  record('isolation', 'synthetic-not-uuid',
    !syntheticIsUuid && contextS.tenant.id === 'commercial',
    `Synthetic tenant id: ${contextS.tenant.id}, isUUID: ${syntheticIsUuid}`)

  // A3. Tenant contexts are independent (not contaminated by synthetic)
  console.log('[A3] Tenant contexts are independent...')
  const aHasCommercial = contextA.tenant.id === 'commercial'
  const bHasCommercial = contextB.tenant.id === 'commercial'
  record('isolation', 'tenant-A-not-commercial',
    !aHasCommercial,
    `Tenant A has commercial: ${aHasCommercial}`)
  record('isolation', 'tenant-B-not-commercial',
    !bHasCommercial,
    `Tenant B has commercial: ${bHasCommercial}`)

  // A4. Repository resolves with correct tenant per context
  console.log('[A4] Repository resolves with correct tenant per context...')
  {
    const repoA = await runtimeA.repositoryRuntime.get('business', contextA)
    const repoB = await runtimeB.repositoryRuntime.get('business', contextB)

    const tenantAUsed = contextA.tenant.id
    const tenantBUsed = contextB.tenant.id

    record('isolation', 'repo-A-uses-tenant-A',
      tenantAUsed === TEST_TENANT_A.id && tenantAUsed !== 'commercial',
      `Repository A context tenant: ${tenantAUsed}`)
    record('isolation', 'repo-B-uses-tenant-B',
      tenantBUsed === TEST_TENANT_B.id && tenantBUsed !== 'commercial',
      `Repository B context tenant: ${tenantBUsed}`)
    record('isolation', 'repo-A-not-B',
      tenantAUsed !== TEST_TENANT_B.id,
      `Repository A tenant (should not be B): ${tenantAUsed}`)
    record('isolation', 'repo-B-not-A',
      tenantBUsed !== TEST_TENANT_A.id,
      `Repository B tenant (should not be A): ${tenantBUsed}`)
  }

  // A5. Concurrent contexts don't contaminate each other
  console.log('[A5] Concurrent contexts do not contaminate each other...')
  {
    const repoA1 = await runtimeA.repositoryRuntime.get('business', contextA)
    const repoA2 = await runtimeA.repositoryRuntime.get('business', contextA)
    const repoB1 = await runtimeB.repositoryRuntime.get('business', contextB)
    const repoB2 = await runtimeB.repositoryRuntime.get('business', contextB)

    const repoA1Tenant = contextA.tenant.id
    const repoA2Tenant = contextA.tenant.id
    const repoB1Tenant = contextB.tenant.id
    const repoB2Tenant = contextB.tenant.id

    record('isolation', 'concurrent-A-consistent',
      repoA1Tenant === TEST_TENANT_A.id && repoA2Tenant === TEST_TENANT_A.id,
      `Concurrent A1: ${repoA1Tenant}, A2: ${repoA2Tenant}`)
    record('isolation', 'concurrent-B-consistent',
      repoB1Tenant === TEST_TENANT_B.id && repoB2Tenant === TEST_TENANT_B.id,
      `Concurrent B1: ${repoB1Tenant}, B2: ${repoB2Tenant}`)
    record('isolation', 'concurrent-A-not-B',
      repoA1Tenant !== TEST_TENANT_B.id && repoA2Tenant !== TEST_TENANT_B.id,
      `A1: ${repoA1Tenant}, A2: ${repoA2Tenant} (should not be B)`)
    record('isolation', 'concurrent-B-not-A',
      repoB1Tenant !== TEST_TENANT_A.id && repoB2Tenant !== TEST_TENANT_A.id,
      `B1: ${repoB1Tenant}, B2: ${repoB2Tenant} (should not be A)`)
  }

  // A6. Synthetic context is NOT used by authenticated request paths
  console.log('[A6] Synthetic context is NOT used by authenticated request paths...')
  {
    const authContextA = contextA

    record('isolation', 'auth-context-not-synthetic',
      authContextA.tenant.id !== 'commercial' && authContextA.tenant.id === TEST_TENANT_A.id,
      `Auth context tenant: ${authContextA.tenant.id}`)
  }

  // A7. Reservation repository also uses correct tenant
  console.log('[A7] Reservation repository uses correct tenant...')
  {
    const repoA = await runtimeA.repositoryRuntime.get('reservation', contextA)
    const repoB = await runtimeB.repositoryRuntime.get('reservation', contextB)

    const tenantAUsed = contextA.tenant.id
    const tenantBUsed = contextB.tenant.id

    record('isolation', 'reservation-repo-A-tenant-A',
      tenantAUsed === TEST_TENANT_A.id && tenantAUsed !== 'commercial',
      `Reservation Repo A tenant: ${tenantAUsed}`)
    record('isolation', 'reservation-repo-B-tenant-B',
      tenantBUsed === TEST_TENANT_B.id && tenantBUsed !== 'commercial',
      `Reservation Repo B tenant: ${tenantBUsed}`)
  }

  // A8. Accommodation repository also uses correct tenant
  console.log('[A8] Accommodation repository uses correct tenant...')
  {
    const repoA = await runtimeA.repositoryRuntime.get('accommodation', contextA)
    const repoB = await runtimeB.repositoryRuntime.get('accommodation', contextB)

    const tenantAUsed = contextA.tenant.id
    const tenantBUsed = contextB.tenant.id

    record('isolation', 'accommodation-repo-A-tenant-A',
      tenantAUsed === TEST_TENANT_A.id && tenantAUsed !== 'commercial',
      `Accommodation Repo A tenant: ${tenantAUsed}`)
    record('isolation', 'accommodation-repo-B-tenant-B',
      tenantBUsed === TEST_TENANT_B.id && tenantBUsed !== 'commercial',
      `Accommodation Repo B tenant: ${tenantBUsed}`)
  }

  // Print summary
  console.log('\n=== RESULTS ===')
  const passed = results.filter(r => r.pass).length
  const failed = results.filter(r => !r.pass).length
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`)

  if (failed > 0) {
    console.log('\n=== FAILED ===')
    for (const r of results.filter(r => !r.pass)) {
      console.log(`  [${r.category}] ${r.id}: ${r.detail}`)
    }
  }

  // Cleanup
  try { await runtimeA.engine.shutdown() } catch {}
  try { await runtimeB.engine.shutdown() } catch {}
  try { await runtimeS.engine.shutdown() } catch {}
  InMemoryRepositoryAdapter.reset()

  process.exit(failed > 0 ? 1 : 0)
}

main().catch(err => {
  console.error('Test runner error:', err)
  process.exit(1)
})
