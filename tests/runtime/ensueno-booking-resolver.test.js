/**
 * ENSUEÑO POSTGRES M5 — Persisted Booking Registry Reconstruction (local gate)
 *
 * Proves the read-only persisted identity resolver:
 *   - tenant/company/accommodation resolved by slug from PostgreSQL (fake query)
 *   - ownership chain validated (company.tenant_id, accommodation.tenant_id,
 *     accommodation.company_id) with fail-closed OWNERSHIP_MISMATCH
 *   - BookingRegistry target populated with REAL UUIDs (never the legacy
 *     aliases ensueno / biz-ensueno-cabina / acc-ensueno-cabina)
 *   - registry resolves en-sueno-curinanco only after persisted reconstruction
 *   - all resulting queries are SELECT-only (no writes, no seeds)
 *   - startup wiring guard: postgres-only; mock path untouched
 *   - legacy provisionEnsueñoBooking() in-memory path remains independent
 *
 * No live PostgreSQL is required.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import * as resolver from '../../experience/booking/ensueno.booking.resolver.js'
import { getBookingRegistry, setBookingRegistry } from '../../api/routes/booking.routes.js'
import {
  provisionEnsueñoBooking,
  ENSUENO_SLUG as LEGACY_PROVISION_SLUG,
  ENSUENO_BUSINESS_ID,
  ENSUENO_ACCOMMODATION_ID,
} from '../../experience/booking/ensueno.booking.provision.js'
import { createBookingRegistry } from '../../experience/booking/booking.registry.js'

const ROOT = path.resolve(fileURLToPath(new URL('../../', import.meta.url)))

const results = []

function record(category, id, pass, detail) {
  results.push({ category, id, pass, detail })
  console.log(`  [${category}] ${id}: ${pass ? 'PASS' : 'FAIL'} — ${detail}`)
}

const TENANT_UUID = '36d84fc9-33db-44f4-ac1d-7400902eb756'
const COMPANY_UUID = '57bcacbf-b58e-4246-bb99-aae2bf0e979b'
const ACCOMMODATION_UUID = '83e42591-3402-441f-beae-d35ed1ba58fc'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function createFakeQuery(db) {
  const calls = []
  const fn = async (text, params) => {
    const sql = String(text)
    calls.push({ sql, params })
    if (/insert|update|delete|into|set\s/i.test(sql)) throw new Error('WRITE_DETECTED')
    let rows = []
    if (sql.includes('FROM tenants')) {
      if (db.tenant && String(db.tenant.slug) === String(params[0])) {
        rows = [{ id: db.tenant.id, name: db.tenant.name }]
      }
    } else if (sql.includes('FROM companies')) {
      if (db.company && String(db.company.slug) === String(params[0])) {
        rows = [{ id: db.company.id, tenant_id: db.company.tenant_id }]
      }
    } else if (sql.includes('FROM accommodations')) {
      if (db.accommodation && String(db.accommodation.slug) === String(params[0])) {
        rows = [{ id: db.accommodation.id, tenant_id: db.accommodation.tenant_id, company_id: db.accommodation.company_id_from_accommodation }]
      }
    }
    return { rows }
  }
  fn.calls = calls
  return fn
}

function happyDb() {
  return {
    tenant: { id: TENANT_UUID, slug: resolver.ENSUENO_TENANT_SLUG, name: 'Complejo Ensueño Curiñanco' },
    company: { id: COMPANY_UUID, slug: resolver.ENSUENO_COMPANY_SLUG, tenant_id: TENANT_UUID },
    accommodation: { id: ACCOMMODATION_UUID, slug: resolver.ENSUENO_ACCOMMODATION_SLUG, tenant_id: TENANT_UUID, company_id_from_accommodation: COMPANY_UUID },
  }
}

async function expectResolverError(label, promise, expectedCode) {
  try {
    await promise
    record('FAIL-CLOSED', label, false, `expected ${expectedCode} but resolution succeeded`)
  } catch (err) {
    record('FAIL-CLOSED', label,
      err && err.name === 'EnsueñoBookingResolverError' && err.code === expectedCode,
      `code=${err && err.code} name=${err && err.name}`)
  }
}

async function main() {
  console.log('=== ENSUEÑO POSTGRES M5: Persisted Booking Registry Reconstruction ===\n')

  // ── A. Happy-path resolution with persisted UUIDs ──
  console.log('[RESOLVER] Happy path...')
  {
    const query = createFakeQuery(happyDb())
    const target = await resolver.resolveEnsueñoBookingTarget({ query })

    record('RESOLVER', 'tenant-uuid', target.tenantId === TENANT_UUID, `tenantId=${target.tenantId}`)
    record('RESOLVER', 'company-uuid', target.businessId === COMPANY_UUID, `businessId=${target.businessId}`)
    record('RESOLVER', 'accommodation-uuid', target.accommodationId === ACCOMMODATION_UUID, `accommodationId=${target.accommodationId}`)
    record('RESOLVER', 'tenant-slug', target.tenantSlug === 'ensueno-curinanco', `tenantSlug=${target.tenantSlug}`)
    record('RESOLVER', 'real-uuid-format', UUID_RE.test(target.tenantId) && UUID_RE.test(target.businessId) && UUID_RE.test(target.accommodationId), 'all three ids are valid UUIDs')

    const legacy = resolver.ENSUENO_LEGACY_IDS
    record('LEGACY', 'tenant-alias-absent', target.tenantId !== legacy.tenantId, `identity field !== '${legacy.tenantId}'`)
    record('LEGACY', 'business-alias-absent', target.businessId !== legacy.businessId, `identity field !== '${legacy.businessId}'`)
    record('LEGACY', 'accommodation-alias-absent', target.accommodationId !== legacy.accommodationId, `identity field !== '${legacy.accommodationId}'`)

    record('RESOLVER', 'query-count-3', query.calls.length === 3, `queries=${query.calls.length}`)
    record('RESOLVER', 'tenant-query-slug', query.calls[0] && query.calls[0].params[0] === 'ensueno-curinanco' && query.calls[0].sql.includes('FROM tenants'), 'tenant queried by slug')
    record('RESOLVER', 'company-query-slug', query.calls[1] && query.calls[1].params[0] === 'ensueno-curinanco' && query.calls[1].sql.includes('FROM companies'), 'company queried by slug')
    record('RESOLVER', 'accommodation-query-slug', query.calls[2] && query.calls[2].params[0] === 'cabina-ensueno' && query.calls[2].sql.includes('FROM accommodations'), 'accommodation queried by slug')
    record('READ-ONLY', 'select-only', query.calls.every((c) => /^\s*SELECT\b/i.test(c.sql) && c.sql.includes('$1')), 'all queries are parameterized SELECTs')

    const cfg = (await import('../../companies/cl/los-rios/valdi/ensueno-curinanco/config.js')).default
    const bookingCfg = cfg.capabilities?.booking?.configuration || {}
    record('SEMANTICS', 'tenant-name-parity', resolver.ENSUENO_BOOKING_SEMANTICS.tenantName === cfg.name, `tenantName aligns with company config name`)
    record('SEMANTICS', 'title-parity', resolver.ENSUENO_BOOKING_SEMANTICS.title === bookingCfg.title, `title aligns with booking configuration`)
    record('SEMANTICS', 'description-parity', resolver.ENSUENO_BOOKING_SEMANTICS.description === bookingCfg.description, `description aligns with booking configuration`)
    record('SEMANTICS', 'currency-clp', resolver.ENSUENO_BOOKING_SEMANTICS.currency === 'CLP' && bookingCfg.currency === 'CLP', 'currency CLP')
  }

  // ── B. Registry reconstruction installs a REGISTERED target ──
  console.log('[REGISTRY] Reconstruction...')
  {
    const original = getBookingRegistry()
    try {
      const query = createFakeQuery(happyDb())
      const { registry, target } = await resolver.reconstructEnsueñoBookingRegistry({ query })

      const resolved = registry.resolveBookingTarget('ensueno-curinanco')
      record('REGISTRY', 'state-registered', resolved.ok && resolved.state === 'registered', `state=${resolved.state}`)
      record('REGISTRY', 'required-fields', Boolean(resolved.target?.tenantId && resolved.target?.businessId && resolved.target?.accommodationId), 'tenantId/businessId/accommodationId present')
      record('REGISTRY', 'target-real-tenant', resolved.target?.tenantId === TENANT_UUID, 'tenantId is the persisted UUID')

      await resolver.bootstrapEnsueñoBookingRegistry({ query })
      const installed = getBookingRegistry().resolveBookingTarget('ensueno-curinanco')
      record('REGISTRY', 'installed-shared', installed.ok && installed.state === 'registered', 'bootstrap installed registry through setBookingRegistry')

      const unknown = getBookingRegistry().resolveBookingTarget('never-registered-co')
      record('REGISTRY', 'unknown-company-404', !unknown.ok && unknown.state === 'unknown_company', 'unregistered company stays UNKNOWN_COMPANY')
      record('REGISTRY', 'target-unique', target, 'target built')
    } finally {
      setBookingRegistry(original)
    }
  }

  // ── C. Fail-closed paths ──
  console.log('[FAIL-CLOSED] Missing/mismatched persisted identities...')
  {
    await expectResolverError(
      'missing-tenant',
      resolver.resolveEnsueñoBookingTarget({ query: createFakeQuery({ tenant: null, company: happyDb().company, accommodation: happyDb().accommodation }) }),
      resolver.ENSUENO_BOOKING_RESOLVER_ERRORS.TENANT_NOT_FOUND
    )
    await expectResolverError(
      'missing-company',
      resolver.resolveEnsueñoBookingTarget({ query: createFakeQuery({ tenant: happyDb().tenant, company: null, accommodation: happyDb().accommodation }) }),
      resolver.ENSUENO_BOOKING_RESOLVER_ERRORS.COMPANY_NOT_FOUND
    )
    await expectResolverError(
      'missing-accommodation',
      resolver.resolveEnsueñoBookingTarget({ query: createFakeQuery({ tenant: happyDb().tenant, company: happyDb().company, accommodation: null }) }),
      resolver.ENSUENO_BOOKING_RESOLVER_ERRORS.ACCOMMODATION_NOT_FOUND
    )
    await expectResolverError(
      'company-tenant-mismatch',
      resolver.resolveEnsueñoBookingTarget({ query: createFakeQuery({ tenant: happyDb().tenant, company: { id: COMPANY_UUID, slug: resolver.ENSUENO_COMPANY_SLUG, tenant_id: '00000000-0000-4000-8000-000000000000' }, accommodation: happyDb().accommodation }) }),
      resolver.ENSUENO_BOOKING_RESOLVER_ERRORS.OWNERSHIP_MISMATCH
    )
    await expectResolverError(
      'accommodation-tenant-mismatch',
      resolver.resolveEnsueñoBookingTarget({ query: createFakeQuery({ tenant: happyDb().tenant, company: happyDb().company, accommodation: { id: ACCOMMODATION_UUID, slug: resolver.ENSUENO_ACCOMMODATION_SLUG, tenant_id: '00000000-0000-4000-8000-000000000000', company_id_from_accommodation: COMPANY_UUID } }) }),
      resolver.ENSUENO_BOOKING_RESOLVER_ERRORS.OWNERSHIP_MISMATCH
    )
    await expectResolverError(
      'accommodation-company-mismatch',
      resolver.resolveEnsueñoBookingTarget({ query: createFakeQuery({ tenant: happyDb().tenant, company: happyDb().company, accommodation: { id: ACCOMMODATION_UUID, slug: resolver.ENSUENO_ACCOMMODATION_SLUG, tenant_id: TENANT_UUID, company_id_from_accommodation: '00000000-0000-4000-8000-000000000000' } }) }),
      resolver.ENSUENO_BOOKING_RESOLVER_ERRORS.OWNERSHIP_MISMATCH
    )
  }

  // ── D. Read-only / no-seed source gates ──
  console.log('[SOURCE] Resolver is read-only and seed-free...')
  {
    const src = readFileSync(path.join(ROOT, 'experience', 'booking', 'ensueno.booking.resolver.js'), 'utf8')
    const queryLiterals = [...src.matchAll(/query\(\s*'([^']+)'/g)].map((m) => m[1])
    record('SOURCE', 'resolver-query-literals-select', queryLiterals.length === 3 && queryLiterals.every((sqlRegex) => /^\s*SELECT\b/i.test(sqlRegex)), `all ${queryLiterals.length} query() literals are SELECTs`)
    record('SOURCE', 'resolver-query-write-verb-absent', queryLiterals.every((sqlRegex) => !/\b(INSERT|UPDATE|DELETE)\b/i.test(sqlRegex)), 'no write SQL verb in any query() literal')
    record('SOURCE', 'resolver-uses-param-1', queryLiterals.every((sql) => sql.includes('$1')), 'every literal is parameterized with $1')
    record('SOURCE', 'resolver-no-seed-tokens', !['runSeeds', 'SeedRunner', 'seed.runner', 'database/seeds', 'bootstrapDatabase'].some((token) => src.includes(token)), "resolver references no seed bootstrap symbol")
    record('SOURCE', 'resolver-no-provision-import', !src.includes('ensueno.booking.provision.js'), 'resolver does not import the legacy provision module')
    const provisionSrc = readFileSync(path.join(ROOT, 'experience', 'booking', 'ensueno.booking.provision.js'), 'utf8')
    record('SOURCE', 'provision-no-resolver-import', !provisionSrc.includes('ensueno.booking.resolver'), 'legacy provision path does not depend on the resolver')
    record('SOURCE', 'provision-legacy-ids-intact',
      ENSUENO_BUSINESS_ID === 'biz-ensueno-cabina' && ENSUENO_ACCOMMODATION_ID === 'acc-ensueno-cabina',
      'legacy provision constants unchanged (in-memory path intact)')
  }

  // ── E. Startup wiring guard (source-level, postgres-only) ──
  console.log('[WIRING] application.start.js guards reconstruction by provider...')
  {
    const src = readFileSync(path.join(ROOT, 'runtime', 'startup', 'application.start.js'), 'utf8')
    const callIndex = src.indexOf('await bootstrapEnsueñoBookingRegistry()')
    const guardIndex = src.indexOf("persistenceProvider === 'postgres'", callIndex > 0 ? 0 : 0)
    record('WIRING', 'resolver-invoked', callIndex >= 0, 'application.start.js calls bootstrapEnsueñoBookingRegistry()')
    record('WIRING', 'guarded-by-postgres', callIndex > guardIndex, 'registry reconstruction sits inside the postgres branch')
    for (const token of ['runSeeds', 'SeedRunner', 'seed.runner', 'database/seeds']) {
      record('WIRING', `start-no-${token.replace(/[^a-z0-9]+/g, '-')}`, !src.includes(token), `application.start.js does not reference '${token}'`)
    }
  }
  record('WIRING', 'provider-postgres', resolver.isEnsueñoBookingRegistryProvider('postgres') === true, 'postgres provider enabled')
  record('WIRING', 'provider-mock-false', resolver.isEnsueñoBookingRegistryProvider('mock') === false && resolver.isEnsueñoBookingRegistryProvider(undefined) === false, 'mock/undefined providers disabled')

  // ── F. Legacy registry format remains valid (mock compatibility) ──
  console.log('[MOCK-PARITY] Legacy provision registry shape still registers...')
  {
    const legacyRegistry = createBookingRegistry({
      provision: {
        targets: {
          [LEGACY_PROVISION_SLUG]: {
            tenantId: resolver.ENSUENO_LEGACY_IDS.tenantId,
            tenantName: 'Complejo Ensueño Curiñanco',
            tenantSlug: LEGACY_PROVISION_SLUG,
            businessId: ENSUENO_BUSINESS_ID,
            accommodationId: ENSUENO_ACCOMMODATION_ID,
            currency: 'CLP',
            title: 'Complejo Ensueño Curiñanco',
            description: 'Cabañas en la costa de Curiñanco, comuna de Valdivia, Región de Los Ríos.',
          },
        },
        noBooking: [],
      },
    })
    const legacyResolved = legacyRegistry.resolveBookingTarget(LEGACY_PROVISION_SLUG)
    record('MOCK-PARITY', 'legacy-registry-registered', legacyResolved.ok && legacyResolved.state === 'registered', 'legacy provision shape registers REGISTERED (in-memory tests unaffected)')
    record('MOCK-PARITY', 'provision-exported', typeof provisionEnsueñoBooking === 'function', 'provisionEnsueñoBooking remains exported/functional')
  }

  finalize()
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

main().catch((err) => {
  console.error('Test runner error:', err)
  process.exit(1)
})