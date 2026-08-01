import { DRIZZLE_EVENTS, createDrizzleEvent } from './drizzle.events.js'
import { DrizzleError } from './drizzle.errors.js'

export class DrizzleClient {
  constructor(postgresProvider, options = {}) {
    this.postgres = postgresProvider
    this.eventBus = options.eventBus || null
    this._db = null
    this._drizzle = null
    this._initialized = false
  }

  get db() { return this._db }
  get drizzle() { return this._drizzle }
  get initialized() { return this._initialized }

  async initialize() {
    if (this._initialized) return
    try {
      this._drizzle = this.#getDrizzleModule()
      if (this._drizzle) {
        this._db = this._drizzle.drizzle(this.postgres.getPool(), {
          logger: this.config?.logger || false,
        })
      } else {
        this._db = await this.#createFallbackClient()
      }
      this._initialized = true
    } catch (err) {
      throw new DrizzleError(`Drizzle client initialization failed: ${err.message}`, { cause: err })
    }
  }

  #getDrizzleModule() {
    try {
      return require('drizzle-orm/node-postgres')
    } catch {
      try {
        return require('drizzle-orm/pg-core')
      } catch {
        return null
      }
    }
  }

  async #createFallbackClient() {
    const pool = this.postgres.getPool()
    return {
      pool,
      async query(text, params) {
        const client = await pool.acquire(30000)
        try {
          const result = await client.query(text, params)
          return result
        } finally {
          pool.release(client)
        }
      },
      async transaction(fn) {
        const client = await pool.acquire(30000)
        try {
          await client.query('BEGIN')
          const result = await fn(client)
          await client.query('COMMIT')
          return result
        } catch (err) {
          await client.query('ROLLBACK').catch(() => {})
          throw err
        } finally {
          pool.release(client)
        }
      },
      async select() { return { from: () => ({ where: () => ({ limit: () => ({ offset: () => Promise.resolve([]) }) }) }) } },
      async insert(table) { return { values: () => ({ returning: () => Promise.resolve([]) }) } },
      async update(table) { return { set: () => ({ where: () => ({ returning: () => Promise.resolve([]) }) }) } },
      async delete(table) { return { where: () => ({ returning: () => Promise.resolve([]) }) } },
    }
  }

  async destroy() {
    this._db = null
    this._drizzle = null
    this._initialized = false
  }
}

export default DrizzleClient
