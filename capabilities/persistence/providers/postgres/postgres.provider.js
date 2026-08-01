import { PostgresConnection } from './postgres.connection.js'
import { PostgresPool } from './postgres.pool.js'
import { PostgresHealth } from './postgres.health.js'
import { PostgresLifecycle } from './postgres.lifecycle.js'
import { PostgresMigrations } from './postgres.migrations.js'
import { PostgresConfig } from './postgres.config.js'
import { POSTGRES_EVENTS, createPostgresEvent } from './postgres.events.js'

export class PostgresProvider {
  constructor(config = {}) {
    this.config = config
    this.name = 'postgresql'
    this.initialized = false
    this.eventBus = config.eventBus || null
    this.connection = null
    this.pool = null
    this.health = null
    this.lifecycle = null
    this.migrations = null
    this._resolvedConfig = null
  }

  async initialize() {
    if (this.initialized) return
    this._resolvedConfig = new PostgresConfig(this.config)
    this.pool = new PostgresPool(this._resolvedConfig, { eventBus: this.eventBus })
    this.connection = new PostgresConnection(this._resolvedConfig, this.pool, { eventBus: this.eventBus })
    this.health = new PostgresHealth(this.connection, this.pool, { eventBus: this.eventBus })
    this.lifecycle = new PostgresLifecycle(this.connection, this.pool, { eventBus: this.eventBus })
    this.migrations = new PostgresMigrations(this.connection, { eventBus: this.eventBus })
    await this.pool.initialize()
    await this.connection.initialize()
    this.initialized = true
    this.#emit(POSTGRES_EVENTS.POSTGRES_CONNECTED, { provider: 'postgresql', lazy: this._resolvedConfig.lazy })
  }

  async destroy() {
    if (!this.initialized) return
    await this.lifecycle.shutdown()
    if (this.migrations) { try { this.migrations.destroy() } catch {} }
    if (this.connection) { try { await this.connection.destroy() } catch {} }
    if (this.pool) { try { await this.pool.destroy() } catch {} }
    this.initialized = false
    this.#emit(POSTGRES_EVENTS.POSTGRES_DISCONNECTED, { provider: 'postgresql' })
  }

  async connect() {
    if (!this.initialized) await this.initialize()
    return this.connection.connect()
  }

  async disconnect() {
    await this.connection.disconnect()
  }

  async ping() {
    return this.health.ping()
  }

  async healthCheck() {
    return this.health.check()
  }

  getPool() { return this.pool }
  getConnection() { return this.connection }
  getConfig() { return this._resolvedConfig }
  getClient() { return this.connection.getClient() }

  async runMigrations(options = {}) {
    return this.migrations.run(options)
  }

  async getModel(entityName) {
    return { entityName, provider: this }
  }

  setEventBus(eventBus) {
    this.eventBus = eventBus
    if (this.pool) this.pool.eventBus = eventBus
    if (this.connection) this.connection.eventBus = eventBus
    if (this.health) this.health.eventBus = eventBus
    if (this.lifecycle) this.lifecycle.eventBus = eventBus
    if (this.migrations) this.migrations.eventBus = eventBus
  }

  #emit(event, data) {
    if (this.eventBus) this.eventBus.emit(event, createPostgresEvent(event, data))
  }
}

export default PostgresProvider
