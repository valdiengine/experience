import { DRIZZLE_EVENTS, createDrizzleEvent } from './drizzle.events.js'
import { DrizzleError } from './drizzle.errors.js'

export class DrizzleConnection {
  constructor(drizzleClient, postgresProvider, options = {}) {
    this.client = drizzleClient
    this.postgres = postgresProvider
    this.eventBus = options.eventBus || null
    this._connected = false
    this._connectionAttempts = 0
  }

  get connected() { return this._connected }

  async connect() {
    if (this._connected) return true
    this._connectionAttempts++
    try {
      await this.postgres.connect()
      await this.client.initialize()
      this._connected = true
      return true
    } catch (err) {
      throw new DrizzleError(`Drizzle connection failed: ${err.message}`, { operation: 'connect', cause: err })
    }
  }

  async disconnect() {
    if (!this._connected) return
    await this.postgres.disconnect()
    this._connected = false
  }

  async reconnect() {
    await this.disconnect()
    return this.connect()
  }

  getClient() {
    if (!this._connected) throw new DrizzleError('Drizzle not connected', { operation: 'getClient' })
    return this.client.db
  }

  async ping() {
    try {
      const result = await this.client.db.query('SELECT 1 AS ping')
      return result?.rows?.[0]?.ping === 1
    } catch { return false }
  }

  async destroy() {
    await this.disconnect()
  }
}

export default DrizzleConnection
