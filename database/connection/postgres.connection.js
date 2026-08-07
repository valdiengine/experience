/**
 * PostgreSQL Connection Manager
 *
 * Manages PostgreSQL client connections for Valdi Platform.
 *
 * @version 4.1
 */

import pg from 'pg'
import { getDatabaseConfig, getPoolConfig, getSslConfig } from '../config/database.config.js'

const { Pool } = pg

let pool = null

/**
 * Create or get PostgreSQL connection pool
 */
export function createPool() {
  if (pool) {
    return pool
  }

  const config = getDatabaseConfig()
  const poolConfig = getPoolConfig()
  const sslConfig = getSslConfig()

  pool = new Pool({
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
    ssl: sslConfig,
    min: poolConfig.min,
    max: poolConfig.max,
    acquireTimeout: poolConfig.acquireTimeout,
    idleTimeout: poolConfig.idleTimeout,
    connectionTimeout: 5000,
    statements: {
      max: 1000,
    },
  })

  pool.on('error', (err) => {
    console.error('[PostgreSQL] Unexpected pool error:', err)
  })

  pool.on('connect', () => {
    console.log('[PostgreSQL] New client connected')
  })

  return pool
}

/**
 * Get existing pool or create new one
 */
export function getPool() {
  if (!pool) {
    return createPool()
  }
  return pool
}

/**
 * Execute a query using the pool
 */
export async function query(text, params) {
  const p = getPool()
  const start = Date.now()

  try {
    const result = await p.query(text, params)
    const duration = Date.now() - start

    if (process.env.DATABASE_LOGGING === 'true') {
      console.log('[PostgreSQL] Query:', { text, duration: `${duration}ms`, rows: result.rowCount })
    }

    return result
  } catch (error) {
    console.error('[PostgreSQL] Query error:', { text, error: error.message })
    throw error
  }
}

/**
 * Get a client from the pool
 */
export async function getClient() {
  const p = getPool()

  try {
    const client = await p.connect()
    return client
  } catch (error) {
    console.error('[PostgreSQL] Client acquisition error:', error.message)
    throw error
  }
}

/**
 * Execute a transaction
 */
export async function transaction(callback) {
  const client = await getClient()

  try {
    await client.query('BEGIN')
    const result = await callback(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

/**
 * Check if pool is connected
 */
export async function isConnected() {
  if (!pool) {
    return false
  }

  try {
    await pool.query('SELECT 1')
    return true
  } catch {
    return false
  }
}

/**
 * Close the pool
 */
export async function closePool() {
  if (pool) {
    await pool.end()
    pool = null
    console.log('[PostgreSQL] Pool closed')
  }
}

/**
 * Get pool statistics
 */
export function getPoolStats() {
  if (!pool) {
    return null
  }

  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  }
}

export default {
  createPool,
  getPool,
  query,
  getClient,
  transaction,
  isConnected,
  closePool,
  getPoolStats,
}
