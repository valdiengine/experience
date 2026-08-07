/**
 * Connection Health Check
 *
 * Provides health check functionality for PostgreSQL connections.
 *
 * @version 4.1
 */

import { query, isConnected, getPoolStats } from './postgres.connection.js'
import { getState, isReady } from './connection.pool.js'

/**
 * Check database connection health
 */
export async function checkConnection() {
  const start = Date.now()
  const state = getState()

  if (state !== 'ready') {
    return {
      status: 'unhealthy',
      state,
      latency: null,
      databaseVersion: null,
      timestamp: new Date().toISOString(),
      error: `Pool state is ${state}`,
    }
  }

  try {
    const result = await query('SELECT version()')
    const latency = Date.now() - start
    const versionMatch = result.rows[0]?.version?.match(/PostgreSQL (\d+\.\d+)/)
    const databaseVersion = versionMatch ? versionMatch[1] : result.rows[0]?.version

    return {
      status: 'healthy',
      state: 'ready',
      latency,
      databaseVersion,
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      state,
      latency: null,
      databaseVersion: null,
      timestamp: new Date().toISOString(),
      error: error.message,
    }
  }
}

/**
 * Extended health check with pool statistics
 */
export async function getExtendedHealth() {
  const connectionHealth = await checkConnection()

  if (!isReady()) {
    return {
      ...connectionHealth,
      pool: null,
      recommendations: ['Initialize connection pool before performing health checks'],
    }
  }

  const stats = getPoolStats()

  const pool = {
    totalCount: stats?.totalCount || 0,
    idleCount: stats?.idleCount || 0,
    waitingCount: stats?.waitingCount || 0,
    utilization: stats?.totalCount
      ? ((stats.totalCount - stats.idleCount) / stats.totalCount * 100).toFixed(2) + '%'
      : '0%',
  }

  const recommendations = []

  if (pool.waitingCount > 10) {
    recommendations.push('High query queue depth. Consider increasing pool size.')
  }

  if (pool.utilization > 80) {
    recommendations.push('High pool utilization. Consider increasing pool size.')
  }

  if (connectionHealth.latency > 100) {
    recommendations.push('High connection latency. Check network conditions.')
  }

  return {
    ...connectionHealth,
    pool,
    recommendations,
  }
}

/**
 * Simple ping check
 */
export async function ping() {
  const start = Date.now()

  try {
    await query('SELECT 1')
    return {
      success: true,
      latency: Date.now() - start,
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    return {
      success: false,
      latency: null,
      timestamp: new Date().toISOString(),
      error: error.message,
    }
  }
}

/**
 * Check database existence
 */
export async function checkDatabase(databaseName) {
  try {
    const result = await query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [databaseName]
    )

    return {
      exists: result.rows.length > 0,
      databaseName,
    }
  } catch (error) {
    return {
      exists: false,
      databaseName,
      error: error.message,
    }
  }
}

/**
 * Check required tables exist
 */
export async function checkTables(requiredTables) {
  const missingTables = []

  for (const table of requiredTables) {
    try {
      const result = await query(
        'SELECT 1 FROM information_schema.tables WHERE table_name = $1',
        [table]
      )
      if (result.rows.length === 0) {
        missingTables.push(table)
      }
    } catch {
      missingTables.push(table)
    }
  }

  return {
    complete: missingTables.length === 0,
    requiredTables,
    missingTables,
  }
}

export default {
  checkConnection,
  getExtendedHealth,
  ping,
  checkDatabase,
  checkTables,
}
