/**
 * Ensueño Curiñanco — Persisted Booking Registry Resolution (ENSUEÑO POSTGRES M5)
 *
 * PostgreSQL is the source of identity. The process-local BookingRegistry is
 * only a runtime index reconstructed at startup by READING the persisted rows.
 *
 * This module NEVER writes:
 *   1. INSERT / UPDATE / DELETE — every query is a parameterized SELECT.
 *   2. NO seed invocation — PostgreSQL rows are an operator/deployment concern.
 *   3. NO Mock fallback — postgres runtime fails closed when a persisted
 *      identity is missing or its ownership chain is broken.
 *
 * Resolved chain (validated ownership):
 *   tenant     ensueno-curinanco      ─┐
 *     ├ company.tenant_id == tenant.id │
 *   company    ensueno-curinanco      ─┤
 *     ├ accommodation.tenant_id == tenant.id
 *     └ accommodation.company_id == company.id
 *   accommodation cabina-ensueno     ─┘
 *
 * The BookingRegistry target for en- sueno-curinanco carries the REAL persisted
 * PostgreSQL UUIDs (tenantId / businessId / accommodationId). The legacy logical
 * aliases (ensueno, biz-ensueno-cabina, acc-ensueno-cabina) are NEVER used.
 *
 * The legacy provisionEnsueñoBooking() path (in-memory/mock tests) remains
 * untouched and independent of this module.
 */
import { createBookingRegistry } from './booking.registry.js'
import { setBookingRegistry } from '../../api/routes/booking.routes.js'
import { query as pgQuery } from '../../database/connection/postgres.connection.js'

export const ENSUENO_SLUG = 'ensueno-curinanco'
export const ENSUENO_TENANT_SLUG = ENSUENO_SLUG
export const ENSUENO_COMPANY_SLUG = ENSUENO_SLUG
export const ENSUENO_ACCOMMODATION_SLUG = 'cabina-ensueno'

/**
 * Excluded legacy logical aliases — the BookingRegistry target for a postgres
 * runtime must NEVER carry these as PostgreSQL identities.
 */
export const ENSUENO_LEGACY_IDS = Object.freeze({
  tenantId: 'ensueno',
  businessId: 'biz-ensueno-cabina',
  accommodationId: 'acc-ensueno-cabina',
})

export const ENSUENO_BOOKING_RESOLVER_ERRORS = Object.freeze({
  TENANT_NOT_FOUND: 'ENSUENO_TENANT_NOT_FOUND',
  COMPANY_NOT_FOUND: 'ENSUENO_COMPANY_NOT_FOUND',
  ACCOMMODATION_NOT_FOUND: 'ENSUENO_ACCOMMODATION_NOT_FOUND',
  OWNERSHIP_MISMATCH: 'ENSUENO_OWNERSHIP_MISMATCH',
})

/**
 * Fail-closed resolver error. `code` identifies only the missing/invalid
 * logical entity — never credentials or connection data.
 */
export class EnsueñoBookingResolverError extends Error {
  constructor(code, message, options = {}) {
    super(message)
    this.name = 'EnsueñoBookingResolverError'
    this.code = code
    this.entity = options.entity || null
    this.relation = options.relation || null
  }
}

/**
 * Semantic (non-identity) target values. PostgreSQL provides the UUIDs; these
 * surface the existing Ensueño company configuration. Kept as explicit
 * constants (mirroring companies/cl/los-rios/valdi/ensueno-curinanco/config.js
 * booking configuration) so runtime startup has no cross-layer import; the M5
 * test gates parity with that configuration file.
 */
export const ENSUENO_BOOKING_SEMANTICS = Object.freeze({
  tenantName: 'Complejo Ensueño Curiñanco',
  title: 'Reserva tu cabaña en el Complejo Ensueño',
  description:
    'Reserva online tu cabaña en Curiñanco: tinaja, piscina de temporada y sauna frente al bosque costero.',
  currency: 'CLP',
})

function fail(code, message, options) {
  throw new EnsueñoBookingResolverError(code, message, options)
}

async function resolveTenant(query, entitySlug) {
  const result = await query(
    'SELECT id, name FROM tenants WHERE slug = $1 LIMIT 1',
    [entitySlug]
  )
  if (!Array.isArray(result?.rows) || result.rows.length === 0) {
    fail(
      ENSUENO_BOOKING_RESOLVER_ERRORS.TENANT_NOT_FOUND,
      `Persisted tenant '${entitySlug}' not found`,
      { entity: 'tenant' }
    )
  }
  return result.rows[0]
}

async function resolveCompany(query, tenant) {
  const result = await query(
    'SELECT id, tenant_id FROM companies WHERE slug = $1 LIMIT 1',
    [tenant.slug]
  )
  if (!Array.isArray(result?.rows) || result.rows.length === 0) {
    fail(
      ENSUENO_BOOKING_RESOLVER_ERRORS.COMPANY_NOT_FOUND,
      `Persisted company '${tenant.slug}' not found`,
      { entity: 'company' }
    )
  }
  const company = result.rows[0]
  if (String(company.tenant_id) !== String(tenant.id)) {
    fail(
      ENSUENO_BOOKING_RESOLVER_ERRORS.OWNERSHIP_MISMATCH,
      `Company '${tenant.slug}' tenant_id does not match resolved tenant`,
      { entity: 'company', relation: 'company.tenant_id' }
    )
  }
  return company
}

async function resolveAccommodation(query, tenant, company, accommodationSlug) {
  const result = await query(
    'SELECT id, tenant_id, company_id FROM accommodations WHERE slug = $1 LIMIT 1',
    [accommodationSlug]
  )
  if (!Array.isArray(result?.rows) || result.rows.length === 0) {
    fail(
      ENSUENO_BOOKING_RESOLVER_ERRORS.ACCOMMODATION_NOT_FOUND,
      `Persisted accommodation '${accommodationSlug}' not found`,
      { entity: 'accommodation' }
    )
  }
  const accommodation = result.rows[0]
  if (String(accommodation.tenant_id) !== String(tenant.id)) {
    fail(
      ENSUENO_BOOKING_RESOLVER_ERRORS.OWNERSHIP_MISMATCH,
      `Accommodation '${accommodationSlug}' tenant_id does not match resolved tenant`,
      { entity: 'accommodation', relation: 'accommodation.tenant_id' }
    )
  }
  if (String(accommodation.company_id) !== String(company.id)) {
    fail(
      ENSUENO_BOOKING_RESOLVER_ERRORS.OWNERSHIP_MISMATCH,
      `Accommodation '${accommodationSlug}' company_id does not match resolved company`,
      { entity: 'accommodation', relation: 'accommodation.company_id' }
    )
  }
  return accommodation
}

/**
 * READ-ONLY resolution of the persisted Ensueño identities.
 *
 * @param {object} [options]
 * @param {Function} [options.query] - (text, params) => Promise<{rows}>.
 *   Defaults to the established PostgreSQL pool query infrastructure.
 * @param {object} [options.semantics] - Non-identity target values.
 * @param {string} [options.tenantSlug]
 * @param {string} [options.companySlug]
 * @param {string} [options.accommodationSlug]
 * @returns {Promise<object>} BookingRegistry target carrying persisted UUIDs.
 */
export async function resolveEnsueñoBookingTarget(options = {}) {
  const query = options.query || pgQuery
  const semantics = { ...ENSUENO_BOOKING_SEMANTICS, ...(options.semantics || {}) }
  const tenantSlug = options.tenantSlug || ENSUENO_TENANT_SLUG
  const companySlug = options.companySlug || ENSUENO_COMPANY_SLUG
  const accommodationSlug = options.accommodationSlug || ENSUENO_ACCOMMODATION_SLUG

  const tenant = await resolveTenant(query, tenantSlug)
  const company = await resolveCompany(query, {
    id: tenant.id,
    slug: companySlug,
  })
  const accommodation = await resolveAccommodation(query, tenant, company, accommodationSlug)

  return {
    tenantId: String(tenant.id),
    tenantName: semantics.tenantName,
    tenantSlug,
    businessId: String(company.id),
    accommodationId: String(accommodation.id),
    currency: semantics.currency,
    title: semantics.title,
    description: semantics.description,
  }
}

/**
 * Build a new process-local BookingRegistry installing the resolved Ensueño
 * target. Pure construction — no global wiring.
 */
export function createEnsueñoBookingRegistry(target) {
  return createBookingRegistry({
    provision: {
      targets: {
        [ENSUENO_SLUG]: target,
      },
      noBooking: [],
    },
  })
}

/**
 * Reconstruct the process-local BookingRegistry from persisted identities.
 * READ-ONLY; NONE of the write paths exist on this call chain.
 *
 * @returns {Promise<{registry: object, target: object}>}
 */
export async function reconstructEnsueñoBookingRegistry(options = {}) {
  const target = await resolveEnsueñoBookingTarget(options)
  const registry = createEnsueñoBookingRegistry(target)
  return { registry, target }
}

/**
 * Startup wiring for PostgreSQL runtime only. Installs the reconstructed
 * registry as the shared process-local BookingRegistry used by the Booking API.
 * Each Passenger worker performs its own identical READ-ONLY reconstruction;
 * no filesystem state, no locks, no cross-process memory.
 */
export async function bootstrapEnsueñoBookingRegistry(options = {}) {
  const { registry } = await reconstructEnsueñoBookingRegistry(options)
  setBookingRegistry(registry)
  return registry
}

/**
 * Provider guard: persisted resolution applies exclusively to the PostgreSQL
 * runtime. Mock/in-memory behavior keeps the legacy provisionEnsueñoBooking()
 * path untouched.
 */
export function isEnsueñoBookingRegistryProvider(persistenceProvider) {
  return persistenceProvider === 'postgres'
}

export default {
  ENSUENO_SLUG,
  ENSUENO_TENANT_SLUG,
  ENSUENO_COMPANY_SLUG,
  ENSUENO_ACCOMMODATION_SLUG,
  ENSUENO_LEGACY_IDS,
  ENSUENO_BOOKING_SEMANTICS,
  ENSUENO_BOOKING_RESOLVER_ERRORS,
  EnsueñoBookingResolverError,
  resolveEnsueñoBookingTarget,
  createEnsueñoBookingRegistry,
  reconstructEnsueñoBookingRegistry,
  bootstrapEnsueñoBookingRegistry,
  isEnsueñoBookingRegistryProvider,
}