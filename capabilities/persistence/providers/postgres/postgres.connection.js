import { PostgresConnectionError, PostgresTimeoutError } from './postgres.errors.js'
import { POSTGRES_EVENTS, createPostgresEvent } from './postgres.events.js'

export class PostgresConnection {
  constructor(config, pool, options = {}) {
    this.config = config
    this.pool = pool
    this.eventBus = options.eventBus || null
    this._client = null
    this._connected = false
    this._connecting = false
    this._connectionAttempts = 0
    this._lastError = null
    this._destroyed = false
  }

  get connected() { return this._connected }
  get connecting() { return this._connecting }
  get lastError() { return this._lastError }

  async connect() {
    if (this._connected) return this._client
    if (this._destroyed) throw new PostgresConnectionError('Connection has been destroyed', { operation: 'connect' })
    if (this._connecting) {
      return new Promise((resolve, reject) => {
        const check = () => {
          if (this._connected) resolve(this._client)
          else if (this._lastError) reject(this._lastError)
          else setTimeout(check, 50)
        }
        check()
      })
    }
    this._connecting = true
    this._connectionAttempts++
    try {
      this._client = await this.#connectWithRetry()
      this._connected = true
      this._connecting = false
      this._lastError = null
      this.#emit(POSTGRES_EVENTS.POSTGRES_CONNECTED, { host: this.config.host, database: this.config.database })
      return this._client
    } catch (err) {
      this._connected = false
      this._connecting = false
      this._lastError = err
      throw err
    }
  }

  async #connectWithRetry() {
    const maxAttempts = this.config.retry.maxAttempts
    const baseDelay = this.config.retry.baseDelay
    const maxDelay = this.config.retry.maxDelay
    const factor = this.config.retry.factor
    const jitter = this.config.retry.jitter
    const timeout = this.config.timeout.connection
    let lastErr = null
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const client = await this.#connectOne(timeout)
        this.#emit(POSTGRES_EVENTS.POSTGRES_RETRY, { attempt, status: 'success', totalAttempts: maxAttempts })
        return client
      } catch (err) {
        lastErr = err
        this.#emit(POSTGRES_EVENTS.POSTGRES_RETRY, { attempt, status: 'failed', error: err.message, totalAttempts: maxAttempts })
        if (attempt < maxAttempts) {
          const delay = Math.min(baseDelay * Math.pow(factor, attempt - 1), maxDelay)
          const jitterAmount = delay * jitter * (Math.random() * 2 - 1)
          await this.#sleep(delay + jitterAmount)
        }
      }
    }
    throw new PostgresConnectionError(`Connection failed after ${maxAttempts} attempts: ${lastErr?.message}`, {
      operation: 'connect', attempts: maxAttempts, cause: lastErr,
    })
  }

  async #connectOne(timeout) {
    const poolClient = await this.pool.acquire(timeout)
    if (!poolClient) throw new PostgresConnectionError('Pool returned null client', { operation: 'connect' })
    try {
      const queryTimeout = this.config.timeout.query
      await poolClient.query(`SET statement_timeout = ${queryTimeout}`)
      await poolClient.query(`SET lock_timeout = ${this.config.timeout.lock}`)
      await poolClient.query(`SET application_name = '${this.config.applicationName}'`)
      if (this.config.schema !== 'public') {
        await poolClient.query(`SET search_path TO "${this.config.schema}"`)
      }
    } catch (err) {
      this.pool.release(poolClient)
      throw err
    }
    return poolClient
  }

  async disconnect() {
    if (!this._connected) return
    this.#emit(POSTGRES_EVENTS.POSTGRES_DISCONNECTED, { host: this.config.host })
    if (this._client) {
      try { this.pool.release(this._client) } catch {}
      this._client = null
    }
    this._connected = false
    this._connecting = false
  }

  async destroy() {
    this._destroyed = true
    await this.disconnect()
  }

  getClient() {
    if (!this._connected) throw new PostgresConnectionError('Not connected', { operation: 'getClient' })
    return this._client
  }

  async executeQuery(text, params = []) {
    if (!this._connected) await this.connect()
    const client = this._client
    try {
      const result = await client.query(text, params)
      return result
    } catch (err) {
      this.#emit(POSTGRES_EVENTS.POSTGRES_ERROR, { operation: 'query', error: err.message })
      if (err.message?.includes('timeout')) throw new PostgresTimeoutError(`Query timeout: ${err.message}`, { operation: 'executeQuery', query: text.substring(0, 100) })
      throw new PostgresConnectionError(`Query failed: ${err.message}`, { operation: 'executeQuery', cause: err })
    }
  }

  #sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

  #emit(event, data) {
    if (this.eventBus) this.eventBus.emit(event, createPostgresEvent(event, data))
  }
}

export default PostgresConnection
