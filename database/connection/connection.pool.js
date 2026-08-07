/**
 * Connection Pool Manager
 *
 * Manages connection pool lifecycle and configuration.
 *
 * @version 4.1
 */

import { createPool, getPool, closePool, getPoolStats } from './postgres.connection.js'

/**
 * Pool states
 */
export const PoolState = {
  UNINITIALIZED: 'uninitialized',
  INITIALIZING: 'initializing',
  READY: 'ready',
  ERROR: 'error',
  CLOSED: 'closed',
}

let poolState = PoolState.UNINITIALIZED
let initializationPromise = null

/**
 * Initialize the connection pool
 */
export async function initializePool() {
  if (poolState === PoolState.READY) {
    return getPool()
  }

  if (poolState === PoolState.INITIALIZING && initializationPromise) {
    return initializationPromise
  }

  poolState = PoolState.INITIALIZING
  console.log('[PoolManager] Initializing connection pool...')

  initializationPromise = (async () => {
    try {
      const pool = createPool()

      // Test connection
      await pool.query('SELECT 1')

      poolState = PoolState.READY
      console.log('[PoolManager] Connection pool ready')

      return pool
    } catch (error) {
      poolState = PoolState.ERROR
      console.error('[PoolManager] Pool initialization failed:', error.message)
      throw error
    } finally {
      initializationPromise = null
    }
  })()

  return initializationPromise
}

/**
 * Get the pool (initialize if needed)
 */
export async function getPoolConnection() {
  if (poolState !== PoolState.READY) {
    return initializePool()
  }
  return getPool()
}

/**
 * Close the connection pool
 */
export async function shutdownPool() {
  if (poolState === PoolState.CLOSED) {
    return
  }

  console.log('[PoolManager] Shutting down connection pool...')
  await closePool()
  poolState = PoolState.CLOSED
  console.log('[PoolManager] Connection pool shut down')
}

/**
 * Get pool state
 */
export function getState() {
  return poolState
}

/**
 * Check if pool is ready
 */
export function isReady() {
  return poolState === PoolState.READY
}

/**
 * Get pool statistics
 */
export async function getStats() {
  const pool = await getPoolConnection().catch(() => null)

  if (!pool) {
    return {
      state: poolState,
      stats: null,
    }
  }

  return {
    state: poolState,
    stats: getPoolStats(),
  }
}

/**
 * Pool health status
 */
export function getHealthStatus() {
  const state = getState()

  return {
    state,
    ready: state === PoolState.READY,
    canAcceptConnections: state === PoolState.READY,
    status: state === PoolState.READY ? 'healthy' : 'unhealthy',
  }
}

export default {
  PoolState,
  initializePool,
  getPoolConnection,
  shutdownPool,
  getState,
  isReady,
  getStats,
  getHealthStatus,
}
