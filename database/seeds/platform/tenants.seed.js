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
    name: 'Valdivia Ecosystem',
    slug: 'valdivia-ecosystem',
    type: 'ecosystem',
    status: 'active',
    domain: 'valdivia.app',
    config: {
      platform: false,
      ecosystem: true,
      destination: 'valdivia',
    },
    plan: 'business',
    isActive: true,
  },
  {
    name: 'Patagonia Ecosystem',
    slug: 'patagonia-ecosystem',
    type: 'ecosystem',
    status: 'active',
    domain: 'patagonia.app',
    config: {
      platform: false,
      ecosystem: true,
      destination: 'patagonia',
    },
    plan: 'business',
    isActive: true,
  },
]

export default TENANTS_SEED
