/**
 * Drizzle ORM Client
 *
 * Central Drizzle ORM client for Valdi Platform.
 * Provides database access through the ORM layer.
 *
 * @version 4.1
 *
 * IMPORTANT: This module should only be imported by:
 * - Repository layer
 * - Migration scripts
 * - Database bootstrap
 *
 * Other layers MUST use the Repository layer for database access.
 */

import { drizzle } from 'drizzle-orm/node-postgres'
import { getPool } from './connection/postgres.connection.js'

// Import schema registry
import * as schema from './schema/index.js'

let db = null
let isInitialized = false

/**
 * Initialize Drizzle client
 */
export function initializeClient() {
  if (isInitialized && db) {
    return db
  }

  const pool = getPool()

  db = drizzle(pool, {
    schema,
    logger: process.env.DATABASE_LOGGING === 'true',
  })

  isInitialized = true
  console.log('[DrizzleClient] Client initialized')

  return db
}

/**
 * Get Drizzle client (initialize if needed)
 */
export function getClient() {
  if (!isInitialized || !db) {
    return initializeClient()
  }
  return db
}

/**
 * Check if client is initialized
 */
export function isClientInitialized() {
  return isInitialized && db !== null
}

/**
 * Get schema registry
 */
export function getSchemaRegistry() {
  return schema
}

/**
 * Execute raw SQL query
 */
export async function executeRaw(sql, params) {
  const client = getClient()
  return client.execute(sql, params)
}

/**
 * Transaction helper
 */
export async function transaction(callback) {
  const client = getClient()
  return client.transaction(callback)
}

/**
 * Close Drizzle client
 */
export async function closeClient() {
  if (db) {
    db = null
    isInitialized = false
    console.log('[DrizzleClient] Client closed')
  }
}

/**
 * Get client status
 */
export function getStatus() {
  return {
    initialized: isInitialized,
    hasClient: db !== null,
  }
}

// Schema exports for type inference
export { schema }

// Named exports for schema tables
export const {
  // Platform schemas
  tenants,
  countries,
  regions,
  destinations,
  domains,
  themes,
  languages,

  // Ecosystem schemas
  ecosystems,
  categories,
  modules,
  experiences,

  // Company schemas
  companies,
  companyProfiles,
  companyModules,
  companySettings,

  // Identity schemas
  users,
  roles,
  permissions,
  userRoles,
  userSessions,

  // Business schemas
  accommodations,
  accommodationUnits,
  availability,
  availabilityRules,
  reservations,
  reservationActivities,
  payments,
  invoices,
  reviews,
  reviewHelpfulness,
  businessNotifications,
  notificationPreferences,
} = schema

export default {
  initializeClient,
  getClient,
  isClientInitialized,
  getSchemaRegistry,
  executeRaw,
  transaction,
  closeClient,
  getStatus,
  schema,
}
