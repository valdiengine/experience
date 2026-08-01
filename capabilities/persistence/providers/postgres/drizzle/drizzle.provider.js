import { DrizzleClient } from './drizzle.client.js'
import { DrizzleConnection } from './drizzle.connection.js'
import { DrizzleSchemaLoader } from './drizzle.schema.loader.js'
import { DrizzleRepositoryAdapter } from './drizzle.repository.adapter.js'
import { DrizzleTransactionAdapter } from './drizzle.transaction.adapter.js'
import { DrizzleQueryBuilder } from './drizzle.query.builder.js'
import { DrizzleMigrationRunner } from './drizzle.migration.runner.js'
import { DrizzleHealth } from './drizzle.health.js'
import { DRIZZLE_EVENTS, createDrizzleEvent } from './drizzle.events.js'
import { DrizzleError } from './drizzle.errors.js'

export class DrizzleProvider {
  constructor(postgresProvider, config = {}) {
    this.postgres = postgresProvider
    this.config = config
    this.name = 'drizzle'
    this.initialized = false
    this.eventBus = config.eventBus || postgresProvider.eventBus || null
    this.client = null
    this.connection = null
    this.schemaLoader = null
    this.queryBuilder = null
    this.transactionAdapter = null
    this.migrationRunner = null
    this.health = null
    this._adapters = new Map()
    this._entitySchemas = new Map()
  }

  async initialize() {
    if (this.initialized) return
    try {
      this.client = new DrizzleClient(this.postgres, { eventBus: this.eventBus })
      await this.client.initialize()
      this.connection = new DrizzleConnection(this.client, this.postgres, { eventBus: this.eventBus })
      this.schemaLoader = new DrizzleSchemaLoader({ eventBus: this.eventBus })
      this.queryBuilder = new DrizzleQueryBuilder({ eventBus: this.eventBus })
      this.transactionAdapter = new DrizzleTransactionAdapter(this.client, this.postgres, { eventBus: this.eventBus })
      this.migrationRunner = new DrizzleMigrationRunner(this.client, this.postgres, { eventBus: this.eventBus })
      this.health = new DrizzleHealth(this.client, this.postgres, { eventBus: this.eventBus })
      await this.health.initialize()
      this.initialized = true
      this.#emit(DRIZZLE_EVENTS.DRIZZLE_INITIALIZED, { provider: 'drizzle' })
    } catch (err) {
      throw new DrizzleError(`DrizzleProvider initialization failed: ${err.message}`, { cause: err })
    }
  }

  async destroy() {
    if (!this.initialized) return
    if (this.health) await this.health.destroy()
    if (this.client) await this.client.destroy()
    this._adapters.clear()
    this._entitySchemas.clear()
    this.initialized = false
  }

  async getModel(entityName) {
    const schema = this._entitySchemas.get(entityName)
    if (!schema) return null
    return this.client.db[schema.tableName || entityName]
  }

  registerSchema(entityName, schemaDef) {
    this._entitySchemas.set(entityName, schemaDef)
    this.schemaLoader.register(entityName, schemaDef)
  }

  async createAdapter(entityName, options = {}) {
    if (this._adapters.has(entityName)) return this._adapters.get(entityName)
    const schema = this._entitySchemas.get(entityName)
    if (!schema) throw new DrizzleError(`No schema registered for "${entityName}"`, { entityName })
    const adapter = new DrizzleRepositoryAdapter(entityName, this.client, this.queryBuilder, schema, {
      eventBus: this.eventBus,
      ...options,
    })
    await adapter.initialize()
    this._adapters.set(entityName, adapter)
    return adapter
  }

  getAdapter(entityName) { return this._adapters.get(entityName) || null }
  hasAdapter(entityName) { return this._adapters.has(entityName) }

  async getClient() { return this.client }
  async ping() { return this.health.ping() }
  async healthCheck() { return this.health.check() }

  async beginTransaction(options = {}) {
    return this.transactionAdapter.begin(options)
  }

  async commitTransaction(handle) {
    return this.transactionAdapter.commit(handle)
  }

  async rollbackTransaction(handle, reason) {
    return this.transactionAdapter.rollback(handle, reason)
  }

  async runMigrations(migrations) {
    return this.migrationRunner.run(migrations)
  }

  setEventBus(eventBus) {
    this.eventBus = eventBus
    if (this.client) this.client.eventBus = eventBus
    if (this.connection) this.connection.eventBus = eventBus
    if (this.transactionAdapter) this.transactionAdapter.eventBus = eventBus
    if (this.health) this.health.eventBus = eventBus
  }

  #emit(event, data) {
    if (this.eventBus) this.eventBus.emit(event, createDrizzleEvent(event, data))
  }
}

export default DrizzleProvider
