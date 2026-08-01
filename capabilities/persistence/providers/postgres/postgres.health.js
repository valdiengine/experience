import { POSTGRES_EVENTS, createPostgresEvent } from './postgres.events.js'

export class PostgresHealth {
  constructor(connection, pool, options = {}) {
    this.connection = connection
    this.pool = pool
    this.eventBus = options.eventBus || null
    this._status = 'unknown'
    this._lastCheck = null
    this._consecutiveFailures = 0
    this._consecutiveSuccesses = 0
    this._checkInterval = null
    this._healthy = false
  }

  get status() { return this._status }
  get healthy() { return this._healthy }
  get lastCheck() { return this._lastCheck }

  startAutoCheck(interval = null) {
    const ms = interval || this.connection.config.health.interval
    if (this._checkInterval) clearInterval(this._checkInterval)
    this._checkInterval = setInterval(() => this.check(), ms)
  }

  stopAutoCheck() {
    if (this._checkInterval) { clearInterval(this._checkInterval); this._checkInterval = null }
  }

  async ping() {
    try {
      if (!this.connection.connected) return false
      const client = this.connection.getClient()
      const result = await client.query('SELECT 1 AS ping')
      return result?.rows?.[0]?.ping === 1
    } catch {
      return false
    }
  }

  async check() {
    const result = {
      status: 'unknown',
      timestamp: Date.now(),
      connected: this.connection.connected,
      database: this.connection.config.database,
      host: this.connection.config.host,
      pool: null,
      latency: null,
      error: null,
    }
    try {
      const start = Date.now()
      const pingOk = await this.ping()
      result.latency = Date.now() - start
      if (pingOk) {
        result.status = 'healthy'
        this._consecutiveSuccesses++
        this._consecutiveFailures = 0
        if (this._consecutiveSuccesses >= this.connection.config.health.recoveryThreshold) {
          this._healthy = true
        }
      } else {
        result.status = 'unhealthy'
        this._consecutiveFailures++
        this._consecutiveSuccesses = 0
        if (this._consecutiveFailures >= this.connection.config.health.unhealthyThreshold) {
          this._healthy = false
        }
      }
      result.pool = await this.pool.health()
    } catch (err) {
      result.status = 'unhealthy'
      result.error = err.message
      this._consecutiveFailures++
      this._consecutiveSuccesses = 0
      if (this._consecutiveFailures >= this.connection.config.health.unhealthyThreshold) {
        this._healthy = false
      }
    }
    const prevStatus = this._status
    this._status = result.status
    this._lastCheck = result
    if (prevStatus !== result.status) {
      this.#emit(POSTGRES_EVENTS.POSTGRES_HEALTH_CHANGED, { from: prevStatus, to: result.status, ...result })
    }
    return result
  }

  async destroy() {
    this.stopAutoCheck()
    this._status = 'destroyed'
    this._healthy = false
  }

  #emit(event, data) {
    if (this.eventBus) this.eventBus.emit(event, createPostgresEvent(event, data))
  }
}

export default PostgresHealth
