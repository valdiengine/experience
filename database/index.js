/**
 * Database Module
 *
 * Central entry point for database infrastructure.
 * Provides schema registry, migrations, and seeding capabilities.
 *
 * @version 4.1
 */

import { SCHEMA_REGISTRY, getSchemaGroupsInOrder, getAllTableNames, getSchemaGroupByTable } from './schema/index.js'
import { ENVIRONMENT_CONFIG, getEnvironment, getConfig, validateConfig } from './env.config.js'
import { SeedRunner } from './seeds/seed.runner.js'
import { SEED_ORDER, PLATFORM_SEEDS, ECOSYSTEM_SEEDS, COMPANY_SEEDS, getSeedsByPhase, getAllSeeds } from './seeds/seed.registry.js'

export { SCHEMA_REGISTRY, getSchemaGroupsInOrder, getAllTableNames, getSchemaGroupByTable }
export { ENVIRONMENT_CONFIG, getEnvironment, getConfig, validateConfig }
export { SeedRunner }
export { SEED_ORDER, PLATFORM_SEEDS, ECOSYSTEM_SEEDS, COMPANY_SEEDS, getSeedsByPhase, getAllSeeds }

/**
 * Migration Registry
 * Ordered list of migrations for execution
 */
export const MIGRATION_REGISTRY = [
  {
    name: '0001_platform_foundation',
    layer: 'platform',
    order: 1,
    description: 'Platform infrastructure tables',
    tables: ['tenants', 'countries', 'regions', 'destinations', 'domains', 'themes', 'languages'],
  },
  {
    name: '0002_ecosystem_layer',
    layer: 'ecosystem',
    order: 2,
    description: 'Ecosystem tables',
    tables: ['ecosystems', 'categories', 'modules', 'experiences'],
  },
  {
    name: '0003_company_layer',
    layer: 'company',
    order: 3,
    description: 'Company tables',
    tables: ['companies', 'company_profiles', 'company_modules', 'company_settings'],
  },
  {
    name: '0004_identity_layer',
    layer: 'identity',
    order: 4,
    description: 'Identity and authentication tables',
    tables: ['users', 'roles', 'permissions', 'user_roles', 'user_sessions'],
  },
  {
    name: '0005_business_layer',
    layer: 'business',
    order: 5,
    description: 'Business domain tables',
    tables: [
      'accommodations',
      'accommodation_units',
      'availability',
      'availability_rules',
      'reservations',
      'reservation_activities',
      'payments',
      'invoices',
      'reviews',
      'review_helpfulness',
      'business_notifications',
      'notification_preferences',
    ],
  },
  {
    name: '0006_reservation_lines',
    layer: 'business',
    order: 6,
    description: 'Reservation lines for generic multi-line booking support',
    tables: ['reservation_lines'],
  },
]

/**
 * Get migrations in execution order
 */
export function getMigrationsInOrder() {
  return [...MIGRATION_REGISTRY].sort((a, b) => a.order - b.order)
}

/**
 * Get migration by name
 */
export function getMigration(name) {
  return MIGRATION_REGISTRY.find((m) => m.name === name) || null
}

/**
 * Get migrations by layer
 */
export function getMigrationsByLayer(layer) {
  return MIGRATION_REGISTRY.filter((m) => m.layer === layer)
}

export default {
  schema: {
    registry: SCHEMA_REGISTRY,
    getSchemaGroupsInOrder,
    getAllTableNames,
    getSchemaGroupByTable,
  },
  config: {
    environment: getEnvironment(),
    config: getConfig(),
    validate: validateConfig,
  },
  seeds: {
    SeedRunner,
    registry: { SEED_ORDER, PLATFORM_SEEDS, ECOSYSTEM_SEEDS, COMPANY_SEEDS },
  },
  migrations: {
    registry: MIGRATION_REGISTRY,
    getMigrationsInOrder,
    getMigration,
    getMigrationsByLayer,
  },
}
