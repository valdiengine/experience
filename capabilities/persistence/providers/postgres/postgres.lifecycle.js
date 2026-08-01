import { POSTGRES_EVENTS, createPostgresEvent } from './postgres.events.js'

export class PostgresLifecycle {
  constructor(connection, pool, options = {}) {
    this.connection = connection
    this.pool = pool
    this.eventBus = options.eventBus || null
    this._state = 'created'
    this._startedAt = null
  }

  get state() { return this._state }
  get uptime() { return this._startedAt ? Date.now() - this._startedAt : 0 }

  async startup() {
    if (this._state === 'started') return
    this._state = 'starting'
    this._startedAt = Date.now()
    try {
      await this.connection.connect()
      this._state = 'started'
      return true
    } catch (err) {
      this._state = 'failed'
      throw err
    }
  }

  async shutdown() {
    if (this._state === 'stopped') return
    this._state = 'stopping'
    try {
      await this.connection.disconnect()
      await this.pool.destroy()
      this._state = 'stopped'
      return true
    } catch (err) {
      this._state = 'failed'
      throw err
    }
  }

  async restart() {
    await this.shutdown()
    return this.startup()
  }

  async reconnect() {
    this.#emit(POSTGRES_EVENTS.POSTGRES_RETRY, { operation: 'reconnect', state: this._state })
    await this.connection.disconnect()
    return this.connection.connect()
  }

  async health() {
    return {
      state: this._state,
      uptime: this.uptime,
      connected: this.connection.connected,
      startedAt: this._startedAt,
    }
  }

  #emit(event, data) {
    if (this.eventBus) this.eventBus.emit(event, createPostgresEvent(event, data))
  }
}

export default PostgresLifecycle
