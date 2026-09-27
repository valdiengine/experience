/**
 * Platform Seed — Tenants
 *
 * P12.3.1.5 — Initial Platform Seed Data
 *
 * Creates initial tenant configurations for the platform.
 * The platform tenant serves as the root tenant for all companies.
 */

export const TENANTS_SEED = [
  {
    name: 'Valdi Platform',
    slug: 'valdi-platform',
    type: 'platform',
    status: 'active',
    domain: 'valdi.app',
    config: {
      platform: true,
      multiEcosystem: true,
    },
    plan: 'enterprise',
    isActive: true,
  },
  {
    name: 'Complejo Ensueño Curiñanco',
    slug: 'ensueno-curinanco',
    type: 'company',
    status: 'active',
    isActive: true,
  },
]

export const ENSUENO_TENANT = TENANTS_SEED.find((tenant) => tenant.slug === 'ensueno-curinanco')

export default TENANTS_SEED
