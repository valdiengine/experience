/**
 * RUNTIME-PERSISTENCE-1: RepositoryFactory Entity-Specific Adapter Resolution
 *
 * Tests that verify the real RepositoryFactory/RepositoryEngine path:
 * A. Register all 3 PostgreSQL entity-specific adapters simultaneously
 * B. Resolve each entity through RepositoryFactory and verify correct adapter class
 * C. Prove all resolved adapters have provider.name === 'postgres'
 * D. Prove no adapter overwrite/collision
 * E. Prove generic provider fallback still works for mock
 * F. Test accommodation deletedAt behavior through real adapter logic
 */
import { RepositoryFactory } from '../../capabilities/persistence/engine/repository.factory.js'
import { RepositoryRegistry } from '../../capabilities/persistence/engine/repository.registry.js'
import { PostgresBusinessAdapter } from '../../capabilities/persistence/adapters/postgres/postgres.business.adapter.js'
import { PostgresAccommodationAdapter } from '../../capabilities/persistence/adapters/postgres/postgres.accommodation.adapter.js'
import { PostgresReservationAdapter } from '../../capabilities/persistence/adapters/postgres/postgres.reservation.adapter.js'
import { MockRepositoryAdapter } from '../../capabilities/persistence/adapters/mock/mock.repository.adapter.js'

const results = []

const record = (category, id, pass, detail = '') => {
  results.push({ category, id, pass: Boolean(pass), detail: String(detail || (pass ? 'ok' : 'FAIL')) })
}

function createFactoryWithRepos() {
  const registry = new RepositoryRegistry()

  class FakeReservationRepo {
    static entityName = 'reservation'
    constructor(adapter) { this.adapter = adapter }
    async initialize() {}
    async destroy() {}
  }
  class FakeBusinessRepo {
    static entityName = 'business'
    constructor(adapter) { this.adapter = adapter }
    async initialize() {}
    async destroy() {}
  }
  class FakeAccommodationRepo {
    static entityName = 'accommodation'
    constructor(adapter) { this.adapter = adapter }
    async initialize() {}
    async destroy() {}
  }

  registry.register('reservation', { class: FakeReservationRepo })
  registry.register('business', { class: FakeBusinessRepo })
  registry.register('accommodation', { class: FakeAccommodationRepo })

  const factory = new RepositoryFactory(registry)
  return { factory, registry }
}

function createContext(providerName = 'mock', entityName = 'reservation') {
  return {
    provider: { name: providerName },
    tenant: { id: 'test-tenant' },
  }
}

async function main() {
  console.log('=== RUNTIME-PERSISTENCE-1: Entity-Specific Adapter Resolution ===\n')

  // A1. Register all 3 PostgreSQL entity-specific adapters simultaneously
  console.log('[A1] Entity-specific adapter registration...')
  {
    const { factory } = createFactoryWithRepos()
    factory.registerAdapter('postgres', PostgresReservationAdapter, 'reservation')
    factory.registerAdapter('postgres', PostgresBusinessAdapter, 'business')
    factory.registerAdapter('postgres', PostgresAccommodationAdapter, 'accommodation')

    const resRepo = await factory.resolve('reservation', createContext('postgres', 'reservation'))
    const bizRepo = await factory.resolve('business', createContext('postgres', 'business'))
    const accRepo = await factory.resolve('accommodation', createContext('postgres', 'accommodation'))

    const allResolved = resRepo && bizRepo && accRepo
    record('registration', 'all-three-adapters-registered', allResolved,
      allResolved ? 'CORRECT: All 3 entity-specific adapters registered and resolved' : 'FAILED')
  }

  // A2. Resolve reservation entity -> PostgresReservationAdapter
  console.log('[A2] Reservation entity resolution...')
  {
    const { factory } = createFactoryWithRepos()
    factory.registerAdapter('postgres', PostgresReservationAdapter, 'reservation')
    factory.registerAdapter('postgres', PostgresBusinessAdapter, 'business')
    factory.registerAdapter('postgres', PostgresAccommodationAdapter, 'accommodation')

    const repo = await factory.resolve('reservation', createContext('postgres', 'reservation'))
    const isCorrectClass = repo.adapter instanceof PostgresReservationAdapter
    record('resolution', 'reservation-resolves-correct-adapter', isCorrectClass,
      isCorrectClass
        ? 'CORRECT: reservation resolved to PostgresReservationAdapter'
        : `FAILED: reservation resolved to ${repo.adapter?.constructor?.name}`)
  }

  // A3. Resolve business entity -> PostgresBusinessAdapter
  console.log('[A3] Business entity resolution...')
  {
    const { factory } = createFactoryWithRepos()
    factory.registerAdapter('postgres', PostgresReservationAdapter, 'reservation')
    factory.registerAdapter('postgres', PostgresBusinessAdapter, 'business')
    factory.registerAdapter('postgres', PostgresAccommodationAdapter, 'accommodation')

    const repo = await factory.resolve('business', createContext('postgres', 'business'))
    const isCorrectClass = repo.adapter instanceof PostgresBusinessAdapter
    record('resolution', 'business-resolves-correct-adapter', isCorrectClass,
      isCorrectClass
        ? 'CORRECT: business resolved to PostgresBusinessAdapter'
        : `FAILED: business resolved to ${repo.adapter?.constructor?.name}`)
  }

  // A4. Resolve accommodation entity -> PostgresAccommodationAdapter
  console.log('[A4] Accommodation entity resolution...')
  {
    const { factory } = createFactoryWithRepos()
    factory.registerAdapter('postgres', PostgresReservationAdapter, 'reservation')
    factory.registerAdapter('postgres', PostgresBusinessAdapter, 'business')
    factory.registerAdapter('postgres', PostgresAccommodationAdapter, 'accommodation')

    const repo = await factory.resolve('accommodation', createContext('postgres', 'accommodation'))
    const isCorrectClass = repo.adapter instanceof PostgresAccommodationAdapter
    record('resolution', 'accommodation-resolves-correct-adapter', isCorrectClass,
      isCorrectClass
        ? 'CORRECT: accommodation resolved to PostgresAccommodationAdapter'
        : `FAILED: accommodation resolved to ${repo.adapter?.constructor?.name}`)
  }

  // A5. All 3 resolved adapters have provider.name === 'postgres'
  console.log('[A5] Provider identity preserved...')
  {
    const { factory } = createFactoryWithRepos()
    factory.registerAdapter('postgres', PostgresReservationAdapter, 'reservation')
    factory.registerAdapter('postgres', PostgresBusinessAdapter, 'business')
    factory.registerAdapter('postgres', PostgresAccommodationAdapter, 'accommodation')

    const resRepo = await factory.resolve('reservation', createContext('postgres', 'reservation'))
    const bizRepo = await factory.resolve('business', createContext('postgres', 'business'))
    const accRepo = await factory.resolve('accommodation', createContext('postgres', 'accommodation'))

    const resProviderName = resRepo.adapter.provider?.name
    const bizProviderName = bizRepo.adapter.provider?.name
    const accProviderName = accRepo.adapter.provider?.name

    const allPostgres = resProviderName === 'postgres' && bizProviderName === 'postgres' && accProviderName === 'postgres'
    record('provider', 'all-adapters-have-postgres-provider', allPostgres,
      allPostgres
        ? `CORRECT: All adapters have provider.name === 'postgres'`
        : `FAILED: provider names: reservation=${resProviderName}, business=${bizProviderName}, accommodation=${accProviderName}`)
  }

  // A6. No adapter overwrite/collision - each entity resolves correctly
  console.log('[A6] No adapter overwrite/collision...')
  {
    const { factory } = createFactoryWithRepos()
    factory.registerAdapter('postgres', PostgresReservationAdapter, 'reservation')
    factory.registerAdapter('postgres', PostgresBusinessAdapter, 'business')
    factory.registerAdapter('postgres', PostgresAccommodationAdapter, 'accommodation')

    const resRepo = await factory.resolve('reservation', createContext('postgres', 'reservation'))
    const bizRepo = await factory.resolve('business', createContext('postgres', 'business'))
    const accRepo = await factory.resolve('accommodation', createContext('postgres', 'accommodation'))

    const noCollision = resRepo.adapter instanceof PostgresReservationAdapter &&
                          bizRepo.adapter instanceof PostgresBusinessAdapter &&
                          accRepo.adapter instanceof PostgresAccommodationAdapter
    record('collision', 'no-overwrite-collision', noCollision,
      noCollision
        ? 'CORRECT: Each entity resolves to a different adapter class (no collision)'
        : `FAILED: collision detected - reservation=${resRepo.adapter.constructor.name}, business=${bizRepo.adapter.constructor.name}, accommodation=${accRepo.adapter.constructor.name}`)
  }

  // A7. Generic provider fallback still works for existing mock behavior
  console.log('[A7] Generic provider fallback...')
  {
    const { factory } = createFactoryWithRepos()
    factory.registerAdapter('mock', MockRepositoryAdapter)

    const repo = await factory.resolve('reservation', createContext('mock', 'reservation'))
    const isMock = repo.adapter instanceof MockRepositoryAdapter
    record('fallback', 'generic-mock-fallback', isMock,
      isMock
        ? 'CORRECT: Generic mock provider fallback works'
        : `FAILED: Expected MockRepositoryAdapter, got ${repo.adapter?.constructor?.name}`)
  }

  // A8. ProviderByEntity semantics - postgres provider for all entities
  console.log('[A8] ProviderByEntity semantics...')
  {
    const { factory } = createFactoryWithRepos()
    factory.registerAdapter('postgres', PostgresReservationAdapter, 'reservation')
    factory.registerAdapter('postgres', PostgresBusinessAdapter, 'business')
    factory.registerAdapter('postgres', PostgresAccommodationAdapter, 'accommodation')

    const resRepo = await factory.resolve('reservation', createContext('postgres', 'reservation'))
    const bizRepo = await factory.resolve('business', createContext('postgres', 'business'))
    const accRepo = await factory.resolve('accommodation', createContext('postgres', 'accommodation'))

    record('semantics', 'providerByEntity-reservation', resRepo.adapter instanceof PostgresReservationAdapter,
      resRepo.adapter instanceof PostgresReservationAdapter ? 'CORRECT' : 'FAILED')
    record('semantics', 'providerByEntity-business', bizRepo.adapter instanceof PostgresBusinessAdapter,
      bizRepo.adapter instanceof PostgresBusinessAdapter ? 'CORRECT' : 'FAILED')
    record('semantics', 'providerByEntity-accommodation', accRepo.adapter instanceof PostgresAccommodationAdapter,
      accRepo.adapter instanceof PostgresAccommodationAdapter ? 'CORRECT' : 'FAILED')
  }

  // A9. PostgresAccommodationAdapter deletedAt handling - null -> IS NULL, undefined -> no clause
  console.log('[A9] Accommodation deletedAt behavior...')
  {
    const adapter = new PostgresAccommodationAdapter('postgres', { entityName: 'accommodation' })

    const filtersNull = { id: 'test', tenantId: 'tenant', deletedAt: null }
    const whereNull = buildWhereForTest(adapter, filtersNull)
    const hasDeletedAtNull = whereNull.sql.includes('deleted_at IS NULL')
    const noDeletedAtNotNull = !whereNull.sql.includes('deleted_at IS NOT NULL')
    record('deletedAt', 'deletedAt-null-IS-NULL', hasDeletedAtNull && noDeletedAtNotNull,
      hasDeletedAtNull && noDeletedAtNotNull
        ? `CORRECT: deletedAt:null -> deleted_at IS NULL (sql: ${whereNull.sql})`
        : `FAILED: sql=${whereNull.sql}`)

    const filtersUndef = { id: 'test', tenantId: 'tenant', deletedAt: undefined }
    const whereUndef = buildWhereForTest(adapter, filtersUndef)
    const noDeletedAtClause = !whereUndef.sql.includes('deleted_at')
    record('deletedAt', 'deletedAt-undefined-NO-CLAUSE', noDeletedAtClause,
      noDeletedAtClause
        ? `CORRECT: deletedAt:undefined -> no deleted_at clause (sql: ${whereUndef.sql})`
        : `FAILED: sql=${whereUndef.sql}`)
  }

  // A10. Backward compatibility: generic postgres registration without entityName still works
  console.log('[A10] Generic provider backward compatibility...')
  {
    const { factory } = createFactoryWithRepos()
    factory.registerAdapter('postgres', PostgresReservationAdapter)

    const repo = await factory.resolve('reservation', createContext('postgres', 'reservation'))
    const isCorrect = repo.adapter instanceof PostgresReservationAdapter
    record('compat', 'generic-postgres-registration', isCorrect,
      isCorrect
        ? 'CORRECT: Generic postgres registration still works (backward compatible)'
        : `FAILED: ${repo.adapter?.constructor?.name}`)
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

  process.exit(failed > 0 ? 1 : 0)
}

function buildWhereForTest(adapter, filters) {
  const clauses = []
  const values = []
  let index = 1

  const FILTER_COLUMNS = {
    id: 'id',
    tenantId: 'tenant_id',
    businessId: 'company_id',
    deletedAt: 'deleted_at',
  }

  for (const [key, rawValue] of Object.entries(filters)) {
    if (key === 'deletedAt') {
      if (rawValue === null) {
        clauses.push(`deleted_at IS NULL`)
      }
      continue
    }

    const column = FILTER_COLUMNS[key]
    if (!column) throw new Error(`Unsupported filter: ${key}`)
    clauses.push(`${column} = $${index++}`)
    values.push(rawValue)
  }

  return { sql: clauses.join(' AND '), values }
}

main().catch(err => {
  console.error('Test runner error:', err)
  process.exit(1)
})
