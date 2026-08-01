import { PostgresConfigurationError } from './postgres.errors.js'

export class PostgresConfig {
  constructor(config = {}) {
    this.host = config.host || process.env.POSTGRES_HOST || 'localhost'
    this.port = parseInt(config.port || process.env.POSTGRES_PORT || '5432', 10)
    this.database = config.database || process.env.POSTGRES_DATABASE || process.env.POSTGRES_DB || 'valdi'
    this.user = config.user || config.username || process.env.POSTGRES_USER || process.env.POSTGRES_USERNAME || 'postgres'
    this.password = config.password || process.env.POSTGRES_PASSWORD || ''
    this.ssl = this.#resolveSsl(config.ssl)
    this.pool = {
      min: config.poolMin ?? config.pool?.min ?? 2,
      max: config.poolMax ?? config.pool?.max ?? 10,
      acquireTimeout: config.poolAcquireTimeout ?? config.pool?.acquireTimeout ?? 30000,
      idleTimeout: config.poolIdleTimeout ?? config.pool?.idleTimeout ?? 600000,
      reapInterval: config.poolReapInterval ?? config.pool?.reapInterval ?? 1000,
      createTimeout: config.poolCreateTimeout ?? config.pool?.createTimeout ?? 30000,
      destroyTimeout: config.poolDestroyTimeout ?? config.pool?.destroyTimeout ?? 5000,
      maxQueue: config.poolMaxQueue ?? config.pool?.maxQueue ?? 50,
    }
    this.timeout = {
      query: config.queryTimeout ?? config.timeout?.query ?? 30000,
      connection: config.connectionTimeout ?? config.timeout?.connection ?? 10000,
      statement: config.statementTimeout ?? config.timeout?.statement ?? 30000,
      lock: config.lockTimeout ?? config.timeout?.lock ?? 1000,
    }
    this.retry = {
      maxAttempts: config.retryMaxAttempts ?? config.retry?.maxAttempts ?? 5,
      baseDelay: config.retryBaseDelay ?? config.retry?.baseDelay ?? 1000,
      maxDelay: config.retryMaxDelay ?? config.retry?.maxDelay ?? 30000,
      factor: config.retryFactor ?? config.retry?.factor ?? 2,
      jitter: config.retryJitter ?? config.retry?.jitter ?? 0.1,
    }
    this.health = {
      interval: config.healthInterval ?? config.health?.interval ?? 30000,
      unhealthyThreshold: config.healthUnhealthyThreshold ?? config.health?.unhealthyThreshold ?? 3,
      recoveryThreshold: config.healthRecoveryThreshold ?? config.health?.recoveryThreshold ?? 2,
    }
    this.lazy = config.lazy !== false
    this.schema = config.schema || 'public'
    this.applicationName = config.applicationName || 'valdi-engine'
    this.connectionString = config.connectionString || null
    this.validate()
  }

  get connectionUri() {
    if (this.connectionString) return this.connectionString
    const sslParam = this.ssl.enabled ? '?sslmode=require' : ''
    return `postgresql://${this.user}:${this.password}@${this.host}:${this.port}/${this.database}${sslParam}`
  }

  get poolConfig() {
    return {
      min: this.pool.min,
      max: this.pool.max,
      acquireTimeoutMillis: this.pool.acquireTimeout,
      idleTimeoutMillis: this.pool.idleTimeout,
      reapIntervalMillis: this.pool.reapInterval,
      createTimeoutMillis: this.pool.createTimeout,
      destroyTimeoutMillis: this.pool.destroyTimeout,
      maxQueue: this.pool.maxQueue,
    }
  }

  validate() {
    const errors = []
    if (!this.host) errors.push('host is required')
    if (!this.port || this.port < 1 || this.port > 65535) errors.push('port must be between 1 and 65535')
    if (!this.database) errors.push('database is required')
    if (!this.user) errors.push('user is required')
    if (this.pool.min < 0) errors.push('poolMin cannot be negative')
    if (this.pool.max < 1) errors.push('poolMax must be at least 1')
    if (this.pool.min > this.pool.max) errors.push('poolMin cannot exceed poolMax')
    if (this.retry.maxAttempts < 1) errors.push('retryMaxAttempts must be at least 1')
    if (this.timeout.connection < 1000) errors.push('connectionTimeout must be at least 1000ms')
    if (this.health.interval < 5000) errors.push('healthInterval must be at least 5000ms')
    if (errors.length > 0) {
      throw new PostgresConfigurationError(`PostgreSQL configuration validation failed: ${errors.join(', ')}`, { errors })
    }
    return true
  }

  #resolveSsl(ssl) {
    if (ssl === true || ssl === 'require') return { enabled: true, rejectUnauthorized: true, mode: 'require' }
    if (ssl === 'prefer') return { enabled: true, rejectUnauthorized: false, mode: 'prefer' }
    if (ssl === 'disable' || ssl === false || !ssl) return { enabled: false, mode: 'disable' }
    if (typeof ssl === 'object') return { enabled: true, ...ssl, mode: ssl.mode || 'custom' }
    return { enabled: false, mode: 'disable' }
  }

  toJSON() {
    return {
      host: this.host, port: this.port, database: this.database, user: this.user,
      ssl: this.ssl, schema: this.schema, pool: this.pool, timeout: this.timeout,
      retry: this.retry, health: this.health, lazy: this.lazy,
    }
  }
}

export default PostgresConfig
