/**
 * Database Schema Registry
 *
 * Central registry for all Drizzle ORM schemas following the Platform hierarchy.
 * This is the bridge between the conceptual schema definitions and actual Drizzle tables.
 *
 * Migration Order (Layer by Layer):
 * 1. Platform (tenants, countries, regions, destinations, domains, themes, languages)
 * 2. Ecosystem (ecosystems, categories, modules, experiences)
 * 3. Company (companies, companyProfiles, companyModules, companySettings)
 * 4. Identity (users, roles, permissions, userRoles, userSessions)
 * 5. Business (accommodations, availability, reservations, payments, reviews, notifications)
 * 6. Storage (storageProviders, storageLocations, assets, assetMetadata, assetVersions, assetPermissions)
 */

export { platformSchemas, tenants, countries, regions, destinations, domains, themes, languages } from './platform/index.js'
export { ecosystemSchemas, ecosystems, categories, modules, experiences } from './ecosystem/index.js'
export { companySchemas, companies, companyProfiles, companyModules, companySettings } from './company/index.js'
export { identitySchemas, users, roles, permissions, userRoles, userSessions } from './identity/index.js'
export { businessSchemas, accommodations, accommodationUnits, availability, availabilityRules, reservations, reservationActivities, payments, invoices, reviews, reviewHelpfulness, notifications, notificationPreferences } from './business/index.js'
export { storageSchemas, storageProviders, storageLocations, assets, assetMetadata, assetVersions, assetPermissions } from './storage/index.js'

/**
 * Schema registry for documentation and validation purposes
 */
export const SCHEMA_REGISTRY = {
  platform: {
    name: 'platform',
    description: 'Platform infrastructure schemas',
    order: 1,
    tables: ['tenants', 'countries', 'regions', 'destinations', 'domains', 'themes', 'languages'],
  },
  ecosystem: {
    name: 'ecosystem',
    description: 'Ecosystem hierarchy schemas',
    order: 2,
    tables: ['ecosystems', 'categories', 'modules', 'experiences'],
  },
  company: {
    name: 'company',
    description: 'Company and business schemas',
    order: 3,
    tables: ['companies', 'company_profiles', 'company_modules', 'company_settings'],
  },
  identity: {
    name: 'identity',
    description: 'Identity and authentication schemas',
    order: 4,
    tables: ['users', 'roles', 'permissions', 'user_roles', 'user_sessions'],
  },
  business: {
    name: 'business',
    description: 'Business domain schemas',
    order: 5,
    tables: ['accommodations', 'accommodation_units', 'availability', 'availability_rules', 'reservations', 'reservation_activities', 'payments', 'invoices', 'reviews', 'review_helpfulness', 'business_notifications', 'notification_preferences'],
  },
  storage: {
    name: 'storage',
    description: 'Storage and asset management schemas',
    order: 6,
    tables: ['storage_providers', 'storage_locations', 'assets', 'asset_metadata', 'asset_versions', 'asset_permissions'],
  },
}

/**
 * Get all schema groups ordered for migration
 */
export function getSchemaGroupsInOrder() {
  return Object.values(SCHEMA_REGISTRY).sort((a, b) => a.order - b.order)
}

/**
 * Get all table names
 */
export function getAllTableNames() {
  return Object.values(SCHEMA_REGISTRY).flatMap(group => group.tables)
}

/**
 * Get schema group by table name
 */
export function getSchemaGroupByTable(tableName) {
  return Object.values(SCHEMA_REGISTRY).find(group => group.tables.includes(tableName)) || null
}

export default {
  SCHEMA_REGISTRY,
  getSchemaGroupsInOrder,
  getAllTableNames,
  getSchemaGroupByTable,
}
