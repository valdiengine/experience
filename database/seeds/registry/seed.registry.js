/**
 * Seed Registry
 *
 * P12.3.1.5 — Initial Platform Seed Data
 *
 * Central registry for all seed data with dependency ordering.
 * Ensures seeds are executed in the correct order.
 */

export const SEED_REGISTRY = {
  order: [
    {
      name: 'tenants',
      layer: 'platform',
      file: './platform/tenants.seed.js',
      description: 'Platform tenants (root entities)',
      dependencies: [],
    },
    {
      name: 'countries',
      layer: 'platform',
      file: './platform/countries.seed.js',
      description: 'Country configurations',
      dependencies: [],
    },
    {
      name: 'regions',
      layer: 'platform',
      file: './platform/regions.seed.js',
      description: 'Region configurations',
      dependencies: ['countries'],
    },
    {
      name: 'languages',
      layer: 'platform',
      file: './platform/languages.seed.js',
      description: 'Language configurations',
      dependencies: [],
    },
    {
      name: 'destinations',
      layer: 'ecosystem',
      file: './ecosystem/destinations.seed.js',
      description: 'Tourism destinations',
      dependencies: ['regions'],
    },
    {
      name: 'ecosystems',
      layer: 'ecosystem',
      file: './ecosystem/ecosystems.seed.js',
      description: 'Ecosystem configurations per destination',
      dependencies: ['destinations'],
    },
    {
      name: 'categories',
      layer: 'ecosystem',
      file: './ecosystem/categories.seed.js',
      description: 'Business categories',
      dependencies: ['ecosystems'],
    },
    {
      name: 'modules',
      layer: 'ecosystem',
      file: './ecosystem/modules.seed.js',
      description: 'Platform modules',
      dependencies: ['ecosystems'],
    },
    {
      name: 'experiences',
      layer: 'ecosystem',
      file: './ecosystem/experiences.seed.js',
      description: 'Experience Engine configurations',
      dependencies: ['ecosystems', 'categories'],
    },
    {
      name: 'themes',
      layer: 'platform',
      file: './platform/themes.seed.js',
      description: 'Theme configurations',
      dependencies: ['destinations', 'tenants'],
    },
    {
      name: 'companies',
      layer: 'company',
      file: './company/companies.seed.js',
      description: 'Sample companies',
      dependencies: ['tenants', 'destinations', 'categories', 'modules'],
    },
    {
      name: 'companySettings',
      layer: 'company',
      file: './company/company.settings.seed.js',
      description: 'Company settings',
      dependencies: ['companies'],
    },
  ],

  layers: {
    platform: ['tenants', 'countries', 'regions', 'languages', 'themes'],
    ecosystem: ['destinations', 'ecosystems', 'categories', 'modules', 'experiences'],
    company: ['companies', 'companySettings'],
  },

  entities: {
    tenants: { table: 'tenants', count: 3 },
    countries: { table: 'countries', count: 1 },
    regions: { table: 'regions', count: 4 },
    languages: { table: 'languages', count: 3 },
    destinations: { table: 'destinations', count: 5 },
    ecosystems: { table: 'ecosystems', count: 5 },
    categories: { table: 'categories', count: 17 },
    modules: { table: 'modules', count: 18 },
    experiences: { table: 'experiences', count: 4 },
    themes: { table: 'themes', count: 3 },
    companies: { table: 'companies', count: 6 },
    companySettings: { table: 'company_settings', count: 3 },
  },
}

export function getSeedByName(name) {
  return SEED_REGISTRY.order.find((s) => s.name === name)
}

export function getSeedsByLayer(layer) {
  return SEED_REGISTRY.order.filter((s) => s.layer === layer)
}

export function getSeedDependencies(name) {
  const seed = getSeedByName(name)
  return seed ? seed.dependencies : []
}

export function validateSeedOrder() {
  const errors = []
  const executed = new Set()

  for (const seed of SEED_REGISTRY.order) {
    for (const dep of seed.dependencies) {
      if (!executed.has(dep)) {
        errors.push(
          `Seed "${seed.name}" depends on "${dep}" which has not been executed yet`
        )
      }
    }
    executed.add(seed.name)
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

export default SEED_REGISTRY
