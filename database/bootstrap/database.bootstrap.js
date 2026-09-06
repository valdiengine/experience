/**
 * Database Bootstrap
 *
 * Initializes the database layer for Valdi Platform.
 * This module should only be imported during application startup.
 *
 * @version 4.1
 */

import { loadEnv } from '../config/environment.loader.js'
import { validateConfig, getEnvironment } from '../config/database.config.js'
import { initializePool, shutdownPool, getStats, getState as getPoolState } from '../connection/connection.pool.js'
import { checkConnection, getExtendedHealth, checkTables } from '../connection/connection.health.js'
import { initializeClient, closeClient, getSchemaRegistry } from '../client.js'
import { MIGRATION_REGISTRY, getMigrationsInOrder } from '../index.js'
import { writeFileSync, existsSync, mkdirSync } from 'fs'
import { resolve } from 'path'

let isBootstrapped = false
let bootstrapError = null

/**
 * Bootstrap the database layer
 */
export async function bootstrap(options = {}) {
  const {
    loadEnvironment = true,
    runMigrations = false,
    validateSchema = true,
    generateStatus = true,
  } = options

  console.log('[DatabaseBootstrap] Starting bootstrap...')

  try {
    // Step 1: Load environment
    if (loadEnvironment) {
      console.log('[DatabaseBootstrap] Loading environment...')
      loadEnv({ silent: false })
    }

    // Step 2: Validate configuration
    console.log('[DatabaseBootstrap] Validating configuration...')
    const configValidation = validateConfig()
    if (!configValidation.valid) {
      console.warn('[DatabaseBootstrap] Configuration warnings:', configValidation.errors)
    }

    // Step 3: Initialize connection pool
    console.log('[DatabaseBootstrap] Initializing connection pool...')
    await initializePool()

    // Step 4: Check connection
    console.log('[DatabaseBootstrap] Checking connection...')
    const connectionHealth = await checkConnection()
    if (connectionHealth.status !== 'healthy') {
      throw new Error(`Database connection failed: ${connectionHealth.error}`)
    }
    console.log(`[DatabaseBootstrap] Connected to PostgreSQL ${connectionHealth.databaseVersion} (${connectionHealth.latency}ms)`)

    // Step 5: Initialize Drizzle client
    console.log('[DatabaseBootstrap] Initializing Drizzle client...')
    initializeClient()

    // Step 6: Validate schema tables
    if (validateSchema) {
      console.log('[DatabaseBootstrap] Validating schema...')
      const allTables = MIGRATION_REGISTRY.flatMap(m => m.tables)
      const tableCheck = await checkTables(allTables)
      if (!tableCheck.complete) {
        console.warn('[DatabaseBootstrap] Missing tables:', tableCheck.missingTables)
      }
    }

    // Step 7: Get migration status
    if (generateStatus) {
      console.log('[DatabaseBootstrap] Generating migration status...')
      await generateMigrationStatus()
    }

    isBootstrapped = true
    bootstrapError = null

    console.log('[DatabaseBootstrap] Bootstrap complete')

    return {
      success: true,
      environment: getEnvironment(),
      connection: connectionHealth,
      pool: await getStats(),
    }
  } catch (error) {
    bootstrapError = error
    isBootstrapped = false
    console.error('[DatabaseBootstrap] Bootstrap failed:', error.message)
    throw error
  }
}

/**
 * Shutdown the database layer
 */
export async function shutdown() {
  console.log('[DatabaseBootstrap] Shutting down...')

  try {
    await closeClient()
    await shutdownPool()
    isBootstrapped = false
    console.log('[DatabaseBootstrap] Shutdown complete')
  } catch (error) {
    console.error('[DatabaseBootstrap] Shutdown error:', error.message)
    throw error
  }
}

/**
 * Check if bootstrap was successful
 */
export function isReady() {
  return isBootstrapped && bootstrapError === null
}

/**
 * Get bootstrap error if any
 */
export function getBootstrapError() {
  return bootstrapError
}

/**
 * Get bootstrap status
 */
export async function getStatus() {
  const poolState = getPoolState()
  const connectionHealth = await checkConnection().catch(() => ({
    status: 'unknown',
    error: 'Connection check failed',
  }))

  return {
    bootstrapped: isBootstrapped,
    error: bootstrapError?.message || null,
    environment: getEnvironment(),
    poolState,
    connection: connectionHealth,
    pool: await getStats(),
    schema: getSchemaRegistry() ? 'loaded' : 'not_loaded',
  }
}

/**
 * Generate migration status file
 */
async function generateMigrationStatus() {
  const migrationsDir = resolve(process.cwd(), 'database', 'migrations')
  const statusPath = resolve(migrationsDir, 'migration.status.json')

  const migrations = getMigrationsInOrder()

  // Check which migrations are applied
  const appliedMigrations = []
  const pendingMigrations = []

  try {
    const { query } = await import('../connection/postgres.connection.js')
    const result = await query(
      'SELECT name FROM _drizzle_migrations ORDER BY executed_at'
    ).catch(() => ({ rows: [] }))

    const appliedSet = new Set(result.rows.map(r => r.name))

    for (const migration of migrations) {
      if (appliedSet.has(migration.name)) {
        appliedMigrations.push(migration.name)
      } else {
        pendingMigrations.push(migration.name)
      }
    }
  } catch {
    // Table might not exist yet
    for (const migration of migrations) {
      pendingMigrations.push(migration.name)
    }
  }

  const status = {
    generated: new Date().toISOString(),
    environment: getEnvironment(),
    totalMigrations: migrations.length,
    appliedMigrations: migrations.length - pendingMigrations.length,
    pendingMigrations: pendingMigrations.length,
    migrations: migrations.map(m => ({
      name: m.name,
      layer: m.layer,
      order: m.order,
      tables: m.tables,
      applied: appliedMigrations.includes(m.name),
    })),
    applied: appliedMigrations,
    pending: pendingMigrations,
  }

  // Ensure directory exists
  if (!existsSync(migrationsDir)) {
    mkdirSync(migrationsDir, { recursive: true })
  }

  writeFileSync(statusPath, JSON.stringify(status, null, 2))
  console.log(`[DatabaseBootstrap] Migration status written to ${statusPath}`)

  return status
}

export default {
  bootstrap,
  shutdown,
  isReady,
  getBootstrapError,
  getStatus,
  generateMigrationStatus,
}
