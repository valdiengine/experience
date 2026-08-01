import { DrizzleError } from './drizzle.errors.js'

export class DrizzleHealth {
  constructor(drizzleClient, postgresProvider, options = {}) {
    this.client = drizzleClient
    this.postgres = postgresProvider
    this.eventBus = options.eventBus || null
    this._status = 'unknown'
    this._healthy = false
    this._lastCheck = null
  }

  get status() { return this._status }
  get healthy() { return this._healthy }

  async initialize() { }

  async ping() {
    try {
      const result = await this.client.db.query('SELECT 1 AS ping')
      return result?.rows?.[0]?.ping === 1
    } catch {
      return false
    }
  }

  async check() {
    const result = {
      status: 'unknown',
      timestamp: Date.now(),
      drizzleInitialized: this.client.initialized,
      postgresConnected: this.postgres?.connection?.connected || false,
      latency: null,
      error: null,
    }
    try {
      const start = Date.now()
      const pingOk = await this.ping()
      result.latency = Date.now() - start
      if (pingOk) {
        result.status = 'healthy'
        this._healthy = true
      } else {
        result.status = 'unhealthy'
        this._healthy = false
        result.error = 'Ping failed'
      }
    } catch (err) {
      result.status = 'unhealthy'
      result.error = err.message
      this._healthy = false
    }
    this._status = result.status
    this._lastCheck = result
    return result
  }

  async destroy() {
    this._status = 'destroyed'
    this._healthy = false
  }
}

export default DrizzleHealth
