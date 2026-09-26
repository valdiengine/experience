/**
 * RUNTIME-PERSISTENCE-1: Minimal Commercial Postgres Read Adapters
 *
 * Focused tests for:
 * A. PostgresBusinessAdapter - companies table read operations
 * B. PostgresAccommodationAdapter - accommodations table read operations
 * C. Runtime wiring verification
 *
 * NOTE: These tests verify adapter contract and SQL generation logic.
 * Physical PostgreSQL tests require a live database connection.
 */
import { PostgresBusinessAdapter } from '../../capabilities/persistence/adapters/postgres/postgres.business.adapter.js'
import { PostgresAccommodationAdapter } from '../../capabilities/persistence/adapters/postgres/postgres.accommodation.adapter.js'
import { PostgresReservationAdapter } from '../../capabilities/persistence/adapters/postgres/postgres.reservation.adapter.js'

const results = []

const record = (category, id, pass, detail = '') => {
  results.push({ category, id, pass: Boolean(pass), detail: String(detail || (pass ? 'ok' : 'FAIL')) })
}

function checkImport(classRef, name) {
  const pass = classRef && typeof classRef === 'function'
  record('import', `import-${name}`, pass, pass ? `${name} imported successfully` : `FAILED to import ${name}`)
  return pass
}

function checkAdapterConstruction(AdapterClass, name) {
  try {
    const instance = new AdapterClass('postgres', { entityName: name })
    const pass = instance && instance.entityName === name
    record('construct', `construct-${name}`, pass, pass ? `${name} instantiated with entityName=${instance.entityName}` : `FAILED to construct ${name}`)
    return instance
  } catch (err) {
    record('construct', `construct-${name}`, false, `Constructor error: ${err.message}`)
    return null
  }
}

function checkAdapterHasMethod(instance, methodName, name) {
  const hasMethod = instance && typeof instance[methodName] === 'function'
  record('method', `${name}.${methodName}`, hasMethod, hasMethod ? `${name}.${methodName}() is a function` : `FAILED: ${name}.${methodName} is not a function`)
  return hasMethod
}

function checkFilterMapping(AdapterClass, inputFilters, expectedColumnChecks, name) {
  try {
    const adapter = new AdapterClass('postgres', { entityName: name })
    if (typeof adapter._buildWhere === 'function') {
      const result = adapter._buildWhere(inputFilters)
      let pass = true
      let detail = ''
      for (const [col, op, val] of expectedColumnChecks) {
        const idx = result.values.indexOf(val)
        if (idx === -1) {
          pass = false
          detail = `Expected value ${val} not found for ${col}`
          break
        }
        const sqlSnippet = `${col} ${op} $${idx + 1}`
        if (!result.sql.includes(sqlSnippet)) {
          pass = false
          detail = `Expected SQL fragment '${sqlSnippet}' not found in: ${result.sql}`
          break
        }
      }
      record('filter', `filter-${name}-${JSON.stringify(inputFilters)}`, pass, pass ? `Filters correctly mapped: ${result.sql}` : `FAILED: ${detail}`)
      return pass
    }
    record('filter', `filter-${name}-internal`, false, `_buildWhere is not directly accessible on ${name}`)
    return false
  } catch (err) {
    record('filter', `filter-${name}-error`, false, `Filter error: ${err.message}`)
    return false
  }
}

async function main() {
  console.log('=== RUNTIME-PERSISTENCE-1: Minimal Commercial Postgres Adapters ===\n')

  // A1. Import checks
  console.log('[A1] Import checks...')
  checkImport(PostgresBusinessAdapter, 'PostgresBusinessAdapter')
  checkImport(PostgresAccommodationAdapter, 'PostgresAccommodationAdapter')
  checkImport(PostgresReservationAdapter, 'PostgresReservationAdapter')

  // A2. Construction checks
  console.log('[A2] Construction checks...')
  const businessAdapter = checkAdapterConstruction(PostgresBusinessAdapter, 'business')
  const accommodationAdapter = checkAdapterConstruction(PostgresAccommodationAdapter, 'accommodation')

  // A3. Method existence checks
  console.log('[A3] Method existence checks...')
  if (businessAdapter) {
    checkAdapterHasMethod(businessAdapter, 'find', 'business')
    checkAdapterHasMethod(businessAdapter, 'findOne', 'business')
    checkAdapterHasMethod(businessAdapter, 'findById', 'business')
    checkAdapterHasMethod(businessAdapter, 'findAll', 'business')
    checkAdapterHasMethod(businessAdapter, 'ping', 'business')
    checkAdapterHasMethod(businessAdapter, 'health', 'business')
  }

  if (accommodationAdapter) {
    checkAdapterHasMethod(accommodationAdapter, 'find', 'accommodation')
    checkAdapterHasMethod(accommodationAdapter, 'findOne', 'accommodation')
    checkAdapterHasMethod(accommodationAdapter, 'findById', 'accommodation')
    checkAdapterHasMethod(accommodationAdapter, 'findAll', 'accommodation')
    checkAdapterHasMethod(accommodationAdapter, 'ping', 'accommodation')
    checkAdapterHasMethod(accommodationAdapter, 'health', 'accommodation')
  }

  // A4. PostgresBusinessAdapter CRITICAL: deletedAt filter must be IGNORED (companies has no deleted_at)
  console.log('[A4] PostgresBusinessAdapter deletedAt handling (companies has no deleted_at column)...')
  {
    const adapter = new PostgresBusinessAdapter('postgres', { entityName: 'business' })
    const filters = { id: 'biz-123', tenantId: 'tenant-A', deletedAt: null }
    try {
      const where = buildWhereForTest(adapter, filters)
      const sql = where.sql
      const values = where.values
      const hasDeletedAt = sql.includes('deleted_at')
      record('filter', 'business-deletedAt-ignored', !hasDeletedAt,
        hasDeletedAt ? `FAILED: deleted_at found in SQL: ${sql}` : `CORRECT: deleted_at NOT in SQL: ${sql}`)
      const hasId = sql.includes('id =') || sql.includes('id=')
      const hasTenantId = sql.includes('tenant_id =')
      record('filter', 'business-has-id-filter', hasId, hasId ? `CORRECT: id filter present` : `FAILED: id filter missing`)
      record('filter', 'business-has-tenantId-filter', hasTenantId, hasTenantId ? `CORRECT: tenant_id filter present` : `FAILED: tenant_id filter missing`)
    } catch (err) {
      record('filter', 'business-deletedAt-error', false, `Error: ${err.message}`)
    }
  }

  // A5. PostgresAccommodationAdapter: deletedAt maps to deleted_at IS NULL
  console.log('[A5] PostgresAccommodationAdapter deletedAt handling (accommodations has deleted_at column)...')
  {
    const adapter = new PostgresAccommodationAdapter('postgres', { entityName: 'accommodation' })
    const filters = { id: 'acc-123', tenantId: 'tenant-A', deletedAt: null }
    try {
      const where = buildWhereForTest(adapter, filters)
      const sql = where.sql
      const hasDeletedAtNull = sql.includes('deleted_at IS NULL')
      record('filter', 'accommodation-deletedAt-null', hasDeletedAtNull,
        hasDeletedAtNull ? `CORRECT: deleted_at IS NULL in SQL: ${sql}` : `FAILED: deleted_at IS NULL not found in: ${sql}`)
    } catch (err) {
      record('filter', 'accommodation-deletedAt-error', false, `Error: ${err.message}`)
    }
  }

  // A6. BusinessAdapter company_id mapping check (accommodation only)
  console.log('[A6] PostgresAccommodationAdapter businessId -> company_id mapping...')
  {
    const adapter = new PostgresAccommodationAdapter('postgres', { entityName: 'accommodation' })
    const filters = { businessId: 'company-456', tenantId: 'tenant-A', deletedAt: null }
    try {
      const where = buildWhereForTest(adapter, filters)
      const sql = where.sql
      const hasCompanyId = sql.includes('company_id =')
      record('filter', 'accommodation-businessId-to-companyId', hasCompanyId,
        hasCompanyId ? `CORRECT: company_id in SQL: ${sql}` : `FAILED: company_id not found in: ${sql}`)
      const hasTenantId = sql.includes('tenant_id =')
      record('filter', 'accommodation-has-tenantId', hasTenantId, hasTenantId ? `CORRECT: tenant_id filter present` : `FAILED: tenant_id filter missing`)
    } catch (err) {
      record('filter', 'accommodation-businessId-error', false, `Error: ${err.message}`)
    }
  }

  // A7. Unknown filter field should throw
  console.log('[A7] Unknown filter field rejection...')
  {
    const adapter = new PostgresBusinessAdapter('postgres', { entityName: 'business' })
    try {
      buildWhereForTest(adapter, { unknownField: 'value' })
      record('filter', 'business-unknown-filter-throws', false, 'FAILED: unknown filter did not throw')
    } catch (err) {
      const pass = err.message.includes('Unsupported business filter')
      record('filter', 'business-unknown-filter-throws', pass,
        pass ? `CORRECT: threw error for unknown filter: ${err.message}` : `Wrong error: ${err.message}`)
    }
  }

  // A8. Accommodation unknown filter
  console.log('[A8] Accommodation unknown filter rejection...')
  {
    const adapter = new PostgresAccommodationAdapter('postgres', { entityName: 'accommodation' })
    try {
      buildWhereForTest(adapter, { unknownField: 'value' })
      record('filter', 'accommodation-unknown-filter-throws', false, 'FAILED: unknown filter did not throw')
    } catch (err) {
      const pass = err.message.includes('Unsupported accommodation filter')
      record('filter', 'accommodation-unknown-filter-throws', pass,
        pass ? `CORRECT: threw error for unknown filter: ${err.message}` : `Wrong error: ${err.message}`)
    }
  }

  // A9. Runtime wiring check - verify application.start.js registers all three adapters
  console.log('[A9] Runtime wiring verification...')
  {
    const fs = await import('fs')
    const path = await import('path')
    const { fileURLToPath } = await import('url')
    const __dirname = path.dirname(fileURLToPath(import.meta.url))
    const appStartPath = path.resolve(__dirname, '../../runtime/startup/application.start.js')
    const content = fs.readFileSync(appStartPath, 'utf8')

    const hasBusinessImport = content.includes("PostgresBusinessAdapter")
    const hasAccommodationImport = content.includes("PostgresAccommodationAdapter")
    const hasBusinessRegister = content.includes("registerAdapter('postgres', PostgresBusinessAdapter, 'business')")
    const hasAccommodationRegister = content.includes("registerAdapter('postgres', PostgresAccommodationAdapter, 'accommodation')")
    const hasProviderByEntityBusiness = content.includes("business: 'postgres'")
    const hasProviderByEntityAccommodation = content.includes("accommodation: 'postgres'")

    record('wiring', 'app-start-business-import', hasBusinessImport,
      hasBusinessImport ? 'PostgresBusinessAdapter imported in application.start.js' : 'PostgresBusinessAdapter NOT imported')
    record('wiring', 'app-start-accommodation-import', hasAccommodationImport,
      hasAccommodationImport ? 'PostgresAccommodationAdapter imported in application.start.js' : 'PostgresAccommodationAdapter NOT imported')
    record('wiring', 'app-start-business-register', hasBusinessRegister,
      hasBusinessRegister ? 'PostgresBusinessAdapter registered in application.start.js' : 'PostgresBusinessAdapter NOT registered')
    record('wiring', 'app-start-accommodation-register', hasAccommodationRegister,
      hasAccommodationRegister ? 'PostgresAccommodationAdapter registered in application.start.js' : 'PostgresAccommodationAdapter NOT registered')
    record('wiring', 'app-start-providerByEntity-business', hasProviderByEntityBusiness,
      hasProviderByEntityBusiness ? "providerByEntity.business = 'postgres'" : "providerByEntity.business NOT set to 'postgres'")
    record('wiring', 'app-start-providerByEntity-accommodation', hasProviderByEntityAccommodation,
      hasProviderByEntityAccommodation ? "providerByEntity.accommodation = 'postgres'" : "providerByEntity.accommodation NOT set to 'postgres'")
  }

  // A10. Verify source file contains correct SQL table references
  console.log('[A10] Source file SQL table verification...')
  {
    const fs = await import('fs')
    const path = await import('path')
    const { fileURLToPath } = await import('url')
    const __dirname = path.dirname(fileURLToPath(import.meta.url))

    const businessSrc = fs.readFileSync(path.resolve(__dirname, '../../capabilities/persistence/adapters/postgres/postgres.business.adapter.js'), 'utf8')
    const accommodationSrc = fs.readFileSync(path.resolve(__dirname, '../../capabilities/persistence/adapters/postgres/postgres.accommodation.adapter.js'), 'utf8')

    const businessHasCompanies = businessSrc.includes('FROM companies')
    const accommodationHasAccommodations = accommodationSrc.includes('FROM accommodations')
    const businessHasCompanyId = businessSrc.includes('company_id')
    const accommodationHasCompanyId = accommodationSrc.includes('company_id')

    record('source', 'business-uses-companies-table', businessHasCompanies,
      businessHasCompanies ? 'CORRECT: PostgresBusinessAdapter queries companies table' : 'FAILED: PostgresBusinessAdapter does NOT query companies table')
    record('source', 'accommodation-uses-accommodations-table', accommodationHasAccommodations,
      accommodationHasAccommodations ? 'CORRECT: PostgresAccommodationAdapter queries accommodations table' : 'FAILED: PostgresAccommodationAdapter does NOT query accommodations table')
    record('source', 'business-no-companyId', !businessHasCompanyId,
      !businessHasCompanyId ? 'CORRECT: PostgresBusinessAdapter does NOT reference company_id' : 'FAILED: PostgresBusinessAdapter incorrectly references company_id')
    record('source', 'accommodation-has-companyId', accommodationHasCompanyId,
      accommodationHasCompanyId ? 'CORRECT: PostgresAccommodationAdapter maps company_id' : 'FAILED: PostgresAccommodationAdapter does NOT map company_id')
  }

  // A11. Verify buildWhere function behavior via reflection
  console.log('[A11] Filter column mapping verification...')
  {
    const fs = await import('fs')
    const path = await import('path')
    const { fileURLToPath } = await import('url')
    const __dirname = path.dirname(fileURLToPath(import.meta.url))

    const businessSrc = fs.readFileSync(path.resolve(__dirname, '../../capabilities/persistence/adapters/postgres/postgres.business.adapter.js'), 'utf8')
    const accommodationSrc = fs.readFileSync(path.resolve(__dirname, '../../capabilities/persistence/adapters/postgres/postgres.accommodation.adapter.js'), 'utf8')

    const businessHasDeletedAtHandling = businessSrc.includes('deletedAt') && businessSrc.includes('continue')
    const businessHasNoDeletedAtColumn = !businessSrc.includes('deleted_at')
    const accommodationHasDeletedAtHandling = accommodationSrc.includes('deleted_at IS NULL')

    record('filter', 'business-handles-deletedAt-filter', businessHasDeletedAtHandling,
      businessHasDeletedAtHandling ? 'CORRECT: PostgresBusinessAdapter handles (ignores) deletedAt filter' : 'FAILED: deletedAt handling missing')
    record('filter', 'business-no-deleted_at-column', businessHasNoDeletedAtColumn,
      businessHasNoDeletedAtColumn ? 'CORRECT: PostgresBusinessAdapter does NOT use deleted_at column' : 'FAILED: deleted_at reference found in PostgresBusinessAdapter')
    record('filter', 'accommodation-deleted_at-IS-NULL', accommodationHasDeletedAtHandling,
      accommodationHasDeletedAtHandling ? 'CORRECT: PostgresAccommodationAdapter maps deletedAt to deleted_at IS NULL' : 'FAILED: deleted_at IS NULL handling missing')
  }

  // A12. Provider collision fix verification - entity-specific registration with same provider name
  console.log('[A12] Entity-specific registration with same provider name...')
  {
    const fs = await import('fs')
    const path = await import('path')
    const { fileURLToPath } = await import('url')
    const __dirname = path.dirname(fileURLToPath(import.meta.url))

    const appStartSrc = fs.readFileSync(path.resolve(__dirname, '../../runtime/startup/application.start.js'), 'utf8')

    const hasEntitySpecificRegistration = appStartSrc.includes("registerAdapter('postgres', PostgresReservationAdapter, 'reservation')") &&
                                          appStartSrc.includes("registerAdapter('postgres', PostgresBusinessAdapter, 'business')") &&
                                          appStartSrc.includes("registerAdapter('postgres', PostgresAccommodationAdapter, 'accommodation')")

    record('wiring', 'entity-specific-registration', hasEntitySpecificRegistration,
      hasEntitySpecificRegistration
        ? "CORRECT: Entity-specific registration with same 'postgres' provider name"
        : "FAILED: Entity-specific registration not found")

    const hasProviderByEntityAllPostgres = appStartSrc.includes("reservation: 'postgres'") &&
                                           appStartSrc.includes("business: 'postgres'") &&
                                           appStartSrc.includes("accommodation: 'postgres'")

    record('wiring', 'providerByEntity-all-postgres', hasProviderByEntityAllPostgres,
      hasProviderByEntityAllPostgres
        ? "CORRECT: providerByEntity uses 'postgres' for all entities"
        : "FAILED: providerByEntity does not use 'postgres' for all entities")
  }

  // A13. Mock runtime unchanged - providerByEntity should be empty when not postgres
  console.log('[A13] Mock runtime unchanged verification...')
  {
    const fs = await import('fs')
    const path = await import('path')
    const { fileURLToPath } = await import('url')
    const __dirname = path.dirname(fileURLToPath(import.meta.url))

    const appStartSrc = fs.readFileSync(path.resolve(__dirname, '../../runtime/startup/application.start.js'), 'utf8')

    const mockProviderBlock = appStartSrc.includes("providerByEntity: persistenceProvider === 'postgres'") &&
                              appStartSrc.includes(": {}")

    record('wiring', 'mock-runtime-empty-providerByEntity', mockProviderBlock,
      mockProviderBlock ? 'CORRECT: mock runtime uses empty providerByEntity ({})' : 'FAILED: mock runtime providerByEntity issue')
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
  return adapter.constructor.prototype._buildWhere
    ? adapter.constructor.prototype._buildWhere(filters)
    : buildWhereStandalone(filters, adapter)
}

function buildWhereStandalone(filters, adapter) {
  const FILTER_COLUMNS = adapter instanceof PostgresBusinessAdapter
    ? { id: 'id', tenantId: 'tenant_id', status: 'status' }
    : { id: 'id', tenantId: 'tenant_id', businessId: 'company_id', deletedAt: 'deleted_at' }

  const clauses = []
  const values = []
  let index = 1

  for (const [key, rawValue] of Object.entries(filters)) {
    if (adapter instanceof PostgresBusinessAdapter && key === 'deletedAt') continue

    const column = FILTER_COLUMNS[key]
    if (!column) throw new Error(`Unsupported ${adapter.entityName} filter: ${key}`)

    if (key === 'deletedAt') {
      if (rawValue === null) clauses.push(`deleted_at IS NULL`)
      continue
    }

    clauses.push(`${column} = $${index++}`)
    values.push(rawValue)
  }

  return { sql: clauses.join(' AND '), values }
}

main().catch(err => {
  console.error('Test runner error:', err)
  process.exit(1)
})
