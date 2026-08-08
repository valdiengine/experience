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
]

export default TENANTS_SEED
