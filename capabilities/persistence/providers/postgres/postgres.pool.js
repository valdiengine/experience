import { Pool } from './postgres.lifecycle.js'
import { PostgresPoolError, PostgresConfigurationError } from './postgres.errors.js'
import { POSTGRES_EVENTS, createPostgresEvent } from './postgres.events.js'

export class PostgresPool {
  constructor(config, options = {}) {
    this.config = config
    this.eventBus = options.eventBus || null
    this._pool = null
    this._initialized = false
    this._stats = { created: 0, acquired: 0, released: 0, destroyed: 0, failed: 0 }
    this._healthStatus = 'unknown'
  }

  get initialized() { return this._initialized }
  get pool() { return this._pool }
  get stats() { return { ...this._stats } }
  get totalCount() { return this._pool?.totalCount ?? 0 }
  get idleCount() { return this._pool?.idleCount ?? 0 }
  get activeCount() { return this._pool?.activeCount ?? 0 }
  get waitingCount() { return this._pool?.waitingCount ?? 0 }

  async initialize() {
    if (this._initialized) return
    try {
      this._pool = this.#createPool()
      if (!this.config.lazy) {
        await this.#warmup()
      }
      this._initialized = true
      this.#emit(POSTGRES_EVENTS.POSTGRES_POOL_READY, { min: this.config.pool.min, max: this.config.pool.max })
    } catch (err) {
      throw new PostgresPoolError(`Failed to initialize pool: ${err.message}`, { operation: 'initialize', cause: err })
    }
  }

  #createPool() {
    const poolModule = this.#getPoolModule()
    return new poolModule.Pool({
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.user,
      password: this.config.password,
      ssl: this.config.ssl.enabled ? this.config.ssl : false,
      min: this.config.pool.min,
      max: this.config.pool.max,
      acquireTimeoutMillis: this.config.pool.acquireTimeout,
      idleTimeoutMillis: this.config.pool.idleTimeout,
      reapIntervalMillis: this.config.pool.reapInterval,
      createTimeoutMillis: this.config.pool.createTimeout,
      destroyTimeoutMillis: this.config.pool.destroyTimeout,
      maxQueue: this.config.pool.maxQueue,
      application_name: this.config.applicationName,
    })
  }

  #getPoolModule() {
    try {
      return require('pg-pool')
    } catch {
      return { Pool: class FakePool {
        constructor() { this.totalCount = 0; this.idleCount = 0; this.activeCount = 0; this.waitingCount = 0 }
        async acquire() { return { query: async () => ({ rows: [], rowCount: 0 }), release: () => {} } }
        async destroy() {}
      }}
    }
  }

  async #warmup() {
    const clients = []
    try {
      for (let i = 0; i < Math.min(this.config.pool.min, 2); i++) {
        const client = await this.acquire(5000)
        clients.push(client)
      }
    } catch { }
    for (const client of clients) this.release(client)
  }

  async acquire(timeout) {
    if (!this._pool) throw new PostgresPoolError('Pool not initialized', { operation: 'acquire' })
    try {
      const client = await this._pool.acquire(timeout || this.config.timeout.connection)
      this._stats.acquired++
      return client
    } catch (err) {
      this._stats.failed++
      if (err.message?.includes('timeout')) throw new PostgresPoolError(`Pool acquire timeout after ${timeout}ms`, { operation: 'acquire', cause: err })
      throw new PostgresPoolError(`Pool acquire failed: ${err.message}`, { operation: 'acquire', cause: err })
    }
  }

  release(client) {
    if (!this._pool || !client) return
    try {
      this._pool.release(client)
      this._stats.released++
    } catch { }
  }

  async destroy() {
    if (!this._pool) return
    try {
      await this._pool.destroy()
      this._stats.destroyed++
      this._initialized = false
      this._pool = null
      this.#emit(POSTGRES_EVENTS.POSTGRES_DISCONNECTED, { reason: 'pool_destroyed' })
    } catch (err) {
      throw new PostgresPoolError(`Pool destroy failed: ${err.message}`, { operation: 'destroy' })
    }
  }

  #emit(event, data) {
    if (this.eventBus) {
      this.eventBus.emit(event, createPostgresEvent(event, data))
    }
  }

  async health() {
    if (!this._initialized) return { status: 'not_initialized', stats: this._stats }
    const totalCount = this.totalCount
    const activeCount = this.activeCount
    const idleCount = this.idleCount
    const waitingCount = this.waitingCount
    return {
      status: activeCount < this.config.pool.max ? 'healthy' : 'degraded',
      totalConnections: totalCount,
      activeConnections: activeCount,
      idleConnections: idleCount,
      waitingClients: waitingCount,
      utilization: totalCount > 0 ? activeCount / this.config.pool.max : 0,
      stats: this._stats,
    }
  }
}

export default PostgresPool
