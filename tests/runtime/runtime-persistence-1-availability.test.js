/**
 * RUNTIME-PERSISTENCE-1 (ENS): ENSÜEÑO POSTGRES — M1-M4 Verification Gate
 *
 * Static/contract-level verification for the ENSUEÑO POSTGRES implementation:
 *   M1: ensueno-curinanco tenant + company seeds
 *   M2: cabina-ensueno accommodation seed + runner branch
 *   M3: 90-night availability seed + runner branch
 *   M4: PostgresAvailabilityAdapter + repository registration
 *
 * NOTE: Physical PostgreSQL round-trip tests require a live database; this
 * suite verifies seed data shape, registry ordering, runner dispatch, SQL
 * generation logic and startup wiring (same approach as
 * runtime-persistence-1-adapters.test.js).
 */
import { TENANTS_SEED } from '../../database/seeds/platform/tenants.seed.js'
import { COMPANIES_SEED } from '../../database/seeds/company/companies.seed.js'
import { ENSUENO_ACCOMMODATION } from '../../database/seeds/accommodation/accommodations.seed.js'
import { AVAILABILITY_SEED, ENSUENO_AVAILABILITY_START_DATE, ENSUENO_AVAILABILITY_END_DATE, ENSUENO_AVAILABILITY_NIGHT_COUNT } from '../../database/seeds/availability/availability.seed.js'
import { SEED_REGISTRY, validateSeedOrder } from '../../database/seeds/registry/seed.registry.js'
import { PostgresAvailabilityAdapter } from '../../capabilities/persistence/adapters/postgres/postgres.availability.adapter.js'

const results = []

const record = (category, id, pass, detail = '') => {
  results.push({ category, id, pass: Boolean(pass), detail: String(detail || (pass ? 'ok' : 'FAIL')) })
}

async function readFileText(relativePath) {
  const fs = await import('fs')
  const path = await import('path')
  const { fileURLToPath } = await import('url')
  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  const root = path.resolve(__dirname, '..', '..')
  return fs.readFileSync(path.resolve(root, relativePath), 'utf8')
}

const asyncRecords = []

function recordFromFile(relativePath, checks, category) {
  asyncRecords.push(
    readFileText(relativePath)
      .then((content) => {
        for (const { id, condition, detail } of checks) {
          record(category, id, !!condition(content), detail(content))
        }
      })
      .catch((err) => record(category, 'read-error', false, `${relativePath}: ${err.message}`))
  )
}

function main() {
  console.log('=== RUNTIME-PERSISTENCE-1 (ENS): Ensueño Postgres M1-M4 Gate ===\n')

  // ── M1: tenant + company seeds ──
  console.log('[M1] Tenant + company seeds...')
  {
    const tenant = TENANTS_SEED.find((t) => t.slug === 'ensueno-curinanco')
    record('M1', 'tenant-slug', tenant?.slug === 'ensueno-curinanco', `tenant.slug=${tenant?.slug}`)
    record('M1', 'tenant-name', tenant?.name === 'Complejo Ensueño Curiñanco', `tenant.name=${tenant?.name}`)
    record('M1', 'tenant-status-active', tenant?.status === 'active', `tenant.status=${tenant?.status}`)
    record('M1', 'tenant-isActive-true', tenant?.isActive === true, `tenant.isActive=${tenant?.isActive}`)

    const company = COMPANIES_SEED.find((c) => c.slug === 'ensueno-curinanco')
    record('M1', 'company-slug', company?.slug === 'ensueno-curinanco', `company.slug=${company?.slug}`)
    record('M1', 'company-tenantSlug', company?.tenantSlug === 'ensueno-curinanco', `company.tenantSlug=${company?.tenantSlug}`)
    record('M1', 'company-destinationSlug', company?.destinationSlug === 'valdi', `company.destinationSlug=${company?.destinationSlug}`)
    record('M1', 'company-type', company?.type === 'business', `company.type=${company?.type}`)
    record('M1', 'company-status-active', company?.status === 'active', `company.status=${company?.status}`)
  }

  // ── M2: accommodation seed ──
  console.log('[M2] Cabaña Ensueño accommodation seed...')
  {
    record('M2', 'acc-slug', ENSUENO_ACCOMMODATION?.slug === 'cabina-ensueno', `acc.slug=${ENSUENO_ACCOMMODATION?.slug}`)
    record('M2', 'acc-name', ENSUENO_ACCOMMODATION?.name === 'Cabaña Ensueño', `acc.name=${ENSUENO_ACCOMMODATION?.name}`)
    record('M2', 'acc-companySlug', ENSUENO_ACCOMMODATION?.companySlug === 'ensueno-curinanco', `acc.companySlug=${ENSUENO_ACCOMMODATION?.companySlug}`)
    record('M2', 'acc-type-cabins', ENSUENO_ACCOMMODATION?.type === 'cabins', `acc.type=${ENSUENO_ACCOMMODATION?.type}`)
    record('M2', 'acc-status-active', ENSUENO_ACCOMMODATION?.status === 'active', `acc.status=${ENSUENO_ACCOMMODATION?.status}`)
    const pricing = ENSUENO_ACCOMMODATION?.pricing || {}
    record('M2', 'acc-pricing-base-90000', pricing.basePrice === 90000, `pricing.basePrice=${pricing.basePrice}`)
    record('M2', 'acc-pricing-night-90000', pricing.pricePerNight === 90000, `pricing.pricePerNight=${pricing.pricePerNight}`)
    record('M2', 'acc-pricing-currency-CLP', pricing.currency === 'CLP', `pricing.currency=${pricing.currency}`)
    record('M2', 'acc-inventory-capacity-4', ENSUENO_ACCOMMODATION?.inventory?.capacity === 4, `inventory.capacity=${ENSUENO_ACCOMMODATION?.inventory?.capacity}`)
    record('M2', 'acc-metadata-capacity-2', ENSUENO_ACCOMMODATION?.metadata?.sleepingCapacity === 2, `metadata.sleepingCapacity=${ENSUENO_ACCOMMODATION?.metadata?.sleepingCapacity}`)
    record('M2', 'acc-metadata-maxGuests-4', ENSUENO_ACCOMMODATION?.metadata?.maxGuests === 4, `metadata.maxGuests=${ENSUENO_ACCOMMODATION?.metadata?.maxGuests}`)
    record('M2', 'acc-uses-existing-schema', !('capacity' in ENSUENO_ACCOMMODATION) && !('maxGuests' in ENSUENO_ACCOMMODATION), 'capacity/maxGuests mapped to jsonb metadata (no invented columns)')
  }

  // ── M3: availability seed (90 nights) ──
  console.log('[M3] 90-night availability seed...')
  {
    record('M3', 'avail-count-90', AVAILABILITY_SEED.length === 90, `count=${AVAILABILITY_SEED.length}`)
    record('M3', 'avail-night-count-const', ENSUENO_AVAILABILITY_NIGHT_COUNT === 90, `ENSUENO_AVAILABILITY_NIGHT_COUNT=${ENSUENO_AVAILABILITY_NIGHT_COUNT}`)
    record('M3', 'avail-first-date', AVAILABILITY_SEED[0]?.date === '2026-10-01', `first=${AVAILABILITY_SEED[0]?.date}`)
    record('M3', 'avail-last-date', AVAILABILITY_SEED[89]?.date === '2026-12-29', `last=${AVAILABILITY_SEED[89]?.date}`)
    record('M3', 'avail-start-const', ENSUENO_AVAILABILITY_START_DATE === '2026-10-01', `start=${ENSUENO_AVAILABILITY_START_DATE}`)
    record('M3', 'avail-end-const', ENSUENO_AVAILABILITY_END_DATE === '2026-12-29', `end=${ENSUENO_AVAILABILITY_END_DATE}`)
    const unique = new Set(AVAILABILITY_SEED.map((r) => r.date)).size
    record('M3', 'avail-unique-dates', unique === 90, `uniqueDates=${unique}`)

    const correct = AVAILABILITY_SEED.every((r) =>
      r.accommodationSlug === 'cabina-ensueno' &&
      r.tenantSlug === 'ensueno-curinanco' &&
      r.status === 'available' &&
      r.isBlocked === false &&
      r.isReserved === false &&
      r.inventory === 4 &&
      r.reservedCount === 0 &&
      r.targetType === 'accommodation' &&
      r.price?.raw === 90000 &&
      r.price?.currency === 'CLP' &&
      r.metadata?.capacity === 4
    )
    record('M3', 'avail-all-rows-valid', correct, correct ? 'all 90 rows comply with the persisted-row contract' : 'FAILED: one or more rows deviate')

    const noConceptualIds = AVAILABILITY_SEED.every(
      (r) => !('id' in r) && !('tenantId' in r) && !('accommodationId' in r) && !('targetId' in r)
    )
    record('M3', 'avail-no-persisted-string-ids', noConceptualIds, noConceptualIds ? 'seed uses slugs; UUIDs are resolved/persisted by the runner' : 'FAILED: string/conceptual IDs would be persisted')
  }

  // ── Registry & order ──
  console.log('[REG] Seed registry integration...')
  {
    const acc = SEED_REGISTRY.order.find((s) => s.name === 'accommodations')
    const avail = SEED_REGISTRY.order.find((s) => s.name === 'availability')
    record('REG', 'acc-registered', Boolean(acc), acc ? `file=${acc.file}` : 'accommodations NOT registered')
    record('REG', 'avail-registered', Boolean(avail), avail ? `file=${avail.file}` : 'availability NOT registered')
    record('REG', 'acc-after-companySettings', SEED_REGISTRY.order.indexOf(acc) > SEED_REGISTRY.order.findIndex((s) => s.name === 'companySettings'), 'accommodations ordered after companySettings')
    record('REG', 'avail-after-acc', SEED_REGISTRY.order.indexOf(avail) > SEED_REGISTRY.order.indexOf(acc), 'availability ordered after accommodations')
    record('REG', 'acc-depends-companies', acc?.dependencies?.includes('companies'), `acc.dependencies=${JSON.stringify(acc?.dependencies)}`)
    record('REG', 'avail-depends-acc', avail?.dependencies?.includes('accommodations'), `avail.dependencies=${JSON.stringify(avail?.dependencies)}`)
    record('REG', 'business-layer', JSON.stringify(SEED_REGISTRY.layers.business) === JSON.stringify(['accommodations', 'availability']), `layers.business=${JSON.stringify(SEED_REGISTRY.layers.business)}`)
    record('REG', 'acc-entity-count-1', SEED_REGISTRY.entities.accommodations?.count === 1, `entities.accommodations.count=${SEED_REGISTRY.entities.accommodations?.count}`)
    record('REG', 'avail-entity-count-90', SEED_REGISTRY.entities.availability?.count === 90, `entities.availability.count=${SEED_REGISTRY.entities.availability?.count}`)
    const validation = validateSeedOrder()
    record('REG', 'seed-order-valid', validation.valid, validation.valid ? 'seed order valid' : `FAILED: ${validation.errors.join('; ')}`)
  }

  // ── Runner dispatch (source-level) ──
  console.log('[RUN] SeedRunner dispatch...')
  recordFromFile('./database/seeds/seed.runner.js', [
    { id: 'acc-branch', condition: (c) => c.includes("seed.name === 'accommodations'"), detail: () => "processRecord dispatches 'accommodations'" },
    { id: 'avail-branch', condition: (c) => c.includes("seed.name === 'availability'"), detail: () => "processRecord dispatches 'availability'" },
    { id: 'acc-processor', condition: (c) => c.includes('async processAccommodation'), detail: () => 'processAccommodation exists' },
    { id: 'avail-processor', condition: (c) => c.includes('async processAvailability'), detail: () => 'processAvailability exists' },
    { id: 'avail-immutable-reseed', condition: (c) => c.includes('availability is immutable on reseed'), detail: () => 'existing availability rows are skipped on reseed (no overwrite of operational state)' },
    { id: 'avail-resolves-slugs', condition: (c) => c.includes('record.tenantSlug') && c.includes('record.accommodationSlug'), detail: () => 'availability resolves tenantSlug/accommodationSlug to UUIDs' },
    { id: 'avail-targetId-accommodation', condition: (c) => c.includes('record.targetId || accommodation[0].id'), detail: () => 'target_id defaults to the resolved accommodation UUID' },
    { id: 'avail-unique-accommodation-date', condition: (c) => c.includes('eq(availability.accommodationId') && c.includes('eq(availability.date'), detail: () => 'existing check is by (accommodation_id, date)' },
  ], 'RUN')

  // ── M4: PostgresAvailabilityAdapter ──
  console.log('[M4] PostgresAvailabilityAdapter...')
  {
    record('M4', 'adapter-import', typeof PostgresAvailabilityAdapter === 'function', 'PostgresAvailabilityAdapter imported')
    const adapter = new PostgresAvailabilityAdapter('postgres', { entityName: 'availability' })
    record('M4', 'adapter-construct', adapter.entityName === 'availability', `entityName=${adapter.entityName}`)
    for (const method of ['find', 'findOne', 'findById', 'findAll', 'create', 'update', 'delete', 'count', 'exists', 'ping', 'health']) {
      record('M4', `method-${method}`, typeof adapter[method] === 'function', `availability.${method}()`)
    }

    // Filter mapping: id, tenantId, accommodationId, date operators, status/isBlocked/isReserved/targetType/targetId
    {
      const w = adapter._buildWhere({
        id: 'avail-1',
        tenantId: 'tenant-1',
        accommodationId: 'room-1',
        date: { gte: '2026-10-01', lte: '2026-12-29' },
        status: 'available',
        isBlocked: false,
        isReserved: false,
        targetType: 'accommodation',
        targetId: 'room-1',
      })
      const sql = w.sql
      record('M4', 'filter-id', sql.includes('id = $1'), `id mapped (${sql})`)
      record('M4', 'filter-tenantId', sql.includes('tenant_id = $2'), 'tenant_id mapped')
      record('M4', 'filter-accommodationId', sql.includes('accommodation_id = $3'), 'accommodation_id mapped')
      record('M4', 'filter-date-gte', sql.includes('date >= $4'), 'date >= operator supported')
      record('M4', 'filter-date-lte', sql.includes('date <= $5'), 'date <= operator supported')
      record('M4', 'filter-status', sql.includes('status = $6'), 'status mapped')
      record('M4', 'filter-isBlocked', sql.includes('is_blocked = $7'), 'is_blocked mapped')
      record('M4', 'filter-isReserved', sql.includes('is_reserved = $8'), 'is_reserved mapped')
      record('M4', 'filter-targetType', sql.includes('target_type = $9'), 'target_type mapped')
      record('M4', 'filter-targetId', sql.includes('target_id = $10'), 'target_id mapped')

      // Operator set eq/ne/lt/lte/gt/gte
      const allOps = adapter._buildWhere({
        date: { eq: 'd', ne: 'd', lt: 'd', lte: 'd', gt: 'd', gte: 'd' },
      })
      record('M4', 'all-operators-supported',
        allOps.sql.includes('date = $1') &&
        allOps.sql.includes('date <> $2') &&
        allOps.sql.includes('date < $3') &&
        allOps.sql.includes('date <= $4') &&
        allOps.sql.includes('date > $5') &&
        allOps.sql.includes('date >= $6'),
        `operators: ${allOps.sql}`)
    }

    // deletedAt must be ignored (availability has no deleted_at column)
    {
      const w = adapter._buildWhere({ id: 'avail-1', tenantId: 'tenant-1', deletedAt: null })
      record('M4', 'deletedAt-ignored', !w.sql.includes('deleted_at'), `deleted_at NOT in SQL: ${w.sql}`)
      record('M4', 'deletedAt-others-kept', w.sql.includes('id = $1') && w.sql.includes('tenant_id = $2'), 'id + tenant_id filters retained')
    }

    // Unknown filter / operator rejection
    {
      let threw = false
      try { adapter._buildWhere({ unknownField: 'x' }) } catch (e) { threw = e.message.includes('Unsupported availability filter') }
      record('M4', 'unknown-filter-throws', threw, 'unsupported filter rejected')
      let threwOp = false
      try { adapter._buildWhere({ date: { contains: '2026' } }) } catch (e) { threwOp = e.message.includes('Unsupported availability filter operator') }
      record('M4', 'unknown-operator-throws', threwOp, 'unsupported operator rejected')
    }

    // mapRow: price jsonb → number; available derivation; capacity/notes from metadata
    {
      const row = adapter._mapRow({
        id: 'avail-1',
        tenant_id: 'tenant-1',
        accommodation_id: 'room-1',
        date: '2026-10-01',
        status: 'available',
        is_blocked: false,
        is_reserved: false,
        price: { raw: 90000, currency: 'CLP' },
        inventory: 4,
        reserved_count: 1,
        metadata: { capacity: 4, notes: 'tinaja maintenance' },
        target_type: 'accommodation',
        target_id: 'room-1',
      })
      record('M4', 'maprow-price-number', row.price === 90000 && typeof row.price === 'number', `price=${row.price} (${typeof row.price})`)
      record('M4', 'maprow-currency', row.currency === 'CLP', `currency=${row.currency}`)
      record('M4', 'maprow-available', row.available === 3, `available=${row.available} (max(0, inventory-reservedCount))`)
      record('M4', 'maprow-capacity', row.capacity === 4, `capacity=${row.capacity} (metadata.capacity)`),
      record('M4', 'maprow-notes', row.notes === 'tinaja maintenance', `notes=${row.notes}`)
      record('M4', 'maprow-targetId', row.targetId === 'room-1' && row.targetType === 'accommodation', `target={${row.targetType},${row.targetId}}`)

      const rowEmpty = adapter._mapRow({ id: 'x', tenant_id: 't', accommodation_id: 'r', date: 'd', price: {}, inventory: 4, reserved_count: 0, metadata: {}, target_type: 'accommodation', target_id: 'r' })
      record('M4', 'maprow-price-null-default', rowEmpty.price === null && rowEmpty.currency === null, `empty price jsonb -> price=${rowEmpty.price}, currency=${rowEmpty.currency}`)
    }

    // Adapter source semantics
    recordFromFile('./capabilities/persistence/adapters/postgres/postgres.availability.adapter.js', [
      { id: 'delete-hard-documented', condition: (c) => c.includes('DELETE FROM availability') && c.toLowerCase().includes('hard delete'), detail: () => 'delete() is a hard DELETE (documented)' },
      { id: 'update-updated-at-now', condition: (c) => c.includes('updated_at = NOW()'), detail: () => 'update sets updated_at = NOW()' },
      { id: 'update-metadata-merge', condition: (c) => c.includes('COALESCE(metadata') && c.includes('::jsonb'), detail: () => 'metadata merges via COALESCE || jsonb' },
      { id: 'update-price-merge', condition: (c) => c.includes('COALESCE(price') && c.includes('::jsonb'), detail: () => 'price merges via COALESCE || jsonb' },
      { id: 'update-is_blocked-derivation', condition: (c) => c.includes("data.status === 'blocked' ? true"), detail: () => 'block derives is_blocked=true' },
      { id: 'create-inventory-from-capacity', condition: (c) => c.includes('data.inventory ?? data.capacity'), detail: () => 'create inventory defaults from capacity' },
      { id: 'create-target_id-from-accommodation', condition: (c) => c.includes('data.targetId || data.accommodationId'), detail: () => 'create target_id defaults from accommodationId' },
      { id: 'no-deleted_at-column', condition: (c) => !c.includes("deletedAt: 'deleted_at'"), detail: () => 'deletedAt is not mapped to a deleted_at column (filter is skipped instead)' },
    ], 'M4')
  }

  // ── Startup wiring (application.start.js) ──
  console.log('[WIRING] Application startup registration...')
  recordFromFile('./runtime/startup/application.start.js', [
    { id: 'import-adapter', condition: (c) => c.includes('PostgresAvailabilityAdapter'), detail: () => 'PostgresAvailabilityAdapter imported' },
    { id: 'register-adapter', condition: (c) => c.includes("registerAdapter('postgres', PostgresAvailabilityAdapter, 'availability')"), detail: () => "registerAdapter('postgres', PostgresAvailabilityAdapter, 'availability') present" },
    { id: 'providerByEntity-availability', condition: (c) => c.includes("availability: 'postgres'"), detail: () => "providerByEntity.availability = 'postgres' (no mock fallback)" },
    { id: 'fail-closed', condition: (c) => c.includes("availability: 'postgres'") && c.includes("persistenceProvider === 'postgres'"), detail: () => 'fail-closed: availability resolves to postgres when postgres is active' },
  ], 'WIRING')

  // ── Fail-closed: no conceptual string IDs in the new seed layer ──
  console.log('[GATE] No conceptual string IDs persisted...')
  recordFromFile('./database/seeds/accommodation/accommodations.seed.js', [
    { id: 'acc-no-conceptual-ids', condition: (c) => !/['"](?:acc-|biz-|tenant-)[A-Za-z0-9-]*['"]/.test(c), detail: () => 'accommodation seed contains no conceptual acc-/biz- IDs' },
  ], 'GATE')
  recordFromFile('./database/seeds/availability/availability.seed.js', [
    { id: 'avail-no-conceptual-ids', condition: (c) => !/['"](?:acc-|biz-|tenant-)[A-Za-z0-9-]*['"]/.test(c), detail: () => 'availability seed contains no conceptual acc-/biz- IDs' },
  ], 'GATE')

  Promise.all(asyncRecords.map((p) => p.catch(() => {}))).then(() => finalize())
}

function finalize() {
  console.log('\n=== RESULTS ===')
  const passed = results.filter((r) => r.pass).length
  const failed = results.filter((r) => !r.pass).length
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`)

  if (failed > 0) {
    console.log('\n=== FAILED ===')
    for (const r of results.filter((r) => !r.pass)) {
      console.log(`  [${r.category}] ${r.id}: ${r.detail}`)
    }
  }

  process.exit(failed > 0 ? 1 : 0)
}

try {
  main()
} catch (err) {
  console.error('Test runner error:', err)
  process.exit(1)
}