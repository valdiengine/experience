import { BootstrapConfigurationError } from './bootstrap.errors.js'

export class BootstrapConfig {
  #raw = {}
  #resolved = null

  constructor() {
    this.#raw = {}
  }

  get(key) {
    if (!this.#resolved) throw new BootstrapConfigurationError('Configuration has not been loaded', { key })
    return this.#resolved[key]
  }

  has(key) {
    if (!this.#resolved) return false
    return key in this.#resolved
  }

  getAll() {
    if (!this.#resolved) throw new BootstrapConfigurationError('Configuration has not been loaded', {})
    return { ...this.#resolved }
  }

  getOr(key, defaultValue) {
    const value = this.get(key)
    return value !== undefined ? value : defaultValue
  }

  getDatabaseConfig() {
    return {
      host: this.get('POSTGRES_HOST'),
      port: this.get('POSTGRES_PORT'),
      database: this.get('POSTGRES_DATABASE'),
      user: this.get('POSTGRES_USER'),
      password: this.get('POSTGRES_PASSWORD'),
      ssl: this.get('POSTGRES_SSL'),
      poolMin: this.get('POSTGRES_POOL_MIN'),
      poolMax: this.get('POSTGRES_POOL_MAX'),
      connectionString: this.get('DATABASE_URL'),
      lazy: this.get('DATABASE_LAZY'),
    }
  }

  getAuthConfig() {
    return {
      issuer: this.get('JWT_ISSUER'),
      audience: this.get('JWT_AUDIENCE'),
      accessTokenTTL: this.get('JWT_ACCESS_TTL'),
      refreshTokenTTL: this.get('JWT_REFRESH_TTL'),
      secret: this.get('JWT_SECRET'),
      algorithm: this.get('JWT_ALGORITHM'),
    }
  }

  getRuntimeConfig() {
    return {
      environment: this.get('NODE_ENV'),
      defaultProvider: this.get('DEFAULT_PROVIDER'),
      fallbackOnFailure: this.get('FALLBACK_ON_FAILURE'),
      cacheInstances: this.get('CACHE_INSTANCES'),
      debug: this.get('DEBUG'),
    }
  }

  getFeatureFlags() {
    return {
      database: this.get('FEATURE_DATABASE'),
      auth: this.get('FEATURE_AUTH'),
      cms: this.get('FEATURE_CMS'),
      repositories: this.get('FEATURE_REPOSITORIES'),
      storage: this.get('FEATURE_STORAGE'),
      mail: this.get('FEATURE_MAIL'),
      queue: this.get('FEATURE_QUEUE'),
      cache: this.get('FEATURE_CACHE'),
      payment: this.get('FEATURE_PAYMENT'),
      search: this.get('FEATURE_SEARCH'),
      media: this.get('FEATURE_MEDIA'),
      maps: this.get('FEATURE_MAPS'),
      analytics: this.get('FEATURE_ANALYTICS'),
      ai: this.get('FEATURE_AI'),
    }
  }

  async load(sources = {}) {
    const layers = [
      { name: 'defaults', data: this.#getDefaults() },
      { name: 'env-file', data: await this.#loadEnvFile(sources.envFile) },
      { name: 'environment', data: this.#loadEnvironment() },
      { name: 'tenant', data: sources.tenant || {} },
      { name: 'destination', data: sources.destination || {} },
      { name: 'overrides', data: sources.overrides || {} },
      { name: 'secrets', data: await this.#loadSecrets(sources.secrets) },
    ]

    this.#resolved = {}
    for (const layer of layers) {
      if (layer.data && typeof layer.data === 'object') {
        Object.assign(this.#resolved, layer.data)
        this.#raw[layer.name] = layer.data
      }
    }

    this.#validate()

    return this.#resolved
  }

  #getDefaults() {
    return {
      NODE_ENV: 'development',
      POSTGRES_HOST: 'localhost',
      POSTGRES_PORT: 5432,
      POSTGRES_DATABASE: 'valdi',
      POSTGRES_USER: 'postgres',
      POSTGRES_PASSWORD: '',
      POSTGRES_SSL: false,
      POSTGRES_POOL_MIN: 2,
      POSTGRES_POOL_MAX: 10,
      DATABASE_LAZY: true,
      JWT_ISSUER: 'valdi-engine',
      JWT_AUDIENCE: 'valdi-platform',
      JWT_ACCESS_TTL: 900,
      JWT_REFRESH_TTL: 604800,
      JWT_ALGORITHM: 'HS256',
      DEFAULT_PROVIDER: 'postgresql',
      FALLBACK_ON_FAILURE: true,
      CACHE_INSTANCES: true,
      DEBUG: false,
      FEATURE_DATABASE: true,
      FEATURE_AUTH: true,
      FEATURE_CMS: true,
      FEATURE_REPOSITORIES: true,
      FEATURE_STORAGE: false,
      FEATURE_MAIL: false,
      FEATURE_QUEUE: false,
      FEATURE_CACHE: false,
      FEATURE_PAYMENT: false,
      FEATURE_SEARCH: false,
      FEATURE_MEDIA: false,
      FEATURE_MAPS: false,
      FEATURE_ANALYTICS: false,
      FEATURE_AI: false,
    }
  }

  #loadEnvironment() {
    const env = {}
    const keys = [
      'NODE_ENV', 'DEBUG',
      'POSTGRES_HOST', 'POSTGRES_PORT', 'POSTGRES_DATABASE', 'POSTGRES_USER', 'POSTGRES_PASSWORD', 'POSTGRES_SSL',
      'POSTGRES_POOL_MIN', 'POSTGRES_POOL_MAX',
      'DATABASE_URL', 'DATABASE_LAZY',
      'JWT_ISSUER', 'JWT_AUDIENCE', 'JWT_ACCESS_TTL', 'JWT_REFRESH_TTL', 'JWT_SECRET', 'JWT_ALGORITHM',
      'DEFAULT_PROVIDER', 'FALLBACK_ON_FAILURE', 'CACHE_INSTANCES',
      'FEATURE_DATABASE', 'FEATURE_AUTH', 'FEATURE_CMS', 'FEATURE_REPOSITORIES',
      'FEATURE_STORAGE', 'FEATURE_MAIL', 'FEATURE_QUEUE', 'FEATURE_CACHE',
      'FEATURE_PAYMENT', 'FEATURE_SEARCH', 'FEATURE_MEDIA', 'FEATURE_MAPS',
      'FEATURE_ANALYTICS', 'FEATURE_AI',
    ]
    for (const key of keys) {
      const value = typeof process !== 'undefined' ? process.env[key] : undefined
      if (value !== undefined) {
        env[key] = this.#coerce(key, value)
      }
    }
    return env
  }

  async #loadEnvFile(filePath) {
    if (!filePath) return {}
    try {
      const fs = await import('fs/promises')
      const content = await fs.readFile(filePath, 'utf-8')
      const env = {}
      for (const line of content.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue
        const eqIndex = trimmed.indexOf('=')
        const key = trimmed.slice(0, eqIndex).trim()
        let value = trimmed.slice(eqIndex + 1).trim()
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1)
        }
        env[key] = this.#coerce(key, value)
      }
      return env
    } catch {
      return {}
    }
  }

  async #loadSecrets(secretsProvider) {
    if (!secretsProvider) return {}
    try {
      if (typeof secretsProvider.get === 'function') {
        return await secretsProvider.get()
      }
      return secretsProvider
    } catch {
      return {}
    }
  }

  #coerce(key, value) {
    if (typeof value !== 'string') return value
    if (value === 'true') return true
    if (value === 'false') return false
    if (value === 'null') return null
    if (value === 'undefined') return undefined
    if (/^\d+$/.test(value) && !key.includes('_PASSWORD') && !key.includes('_SECRET')) return parseInt(value, 10)
    if (/^\d+\.\d+$/.test(value)) return parseFloat(value)
    return value
  }

  #validate() {
    const errors = []

    if (this.#resolved.FEATURE_DATABASE && !this.#resolved.POSTGRES_HOST) {
      errors.push('POSTGRES_HOST is required when database feature is enabled')
    }
    if (this.#resolved.FEATURE_AUTH && this.#resolved.JWT_ALGORITHM === 'HS256' && !this.#resolved.JWT_SECRET) {
      errors.push('JWT_SECRET is required when using HS256 algorithm')
    }

    if (errors.length > 0) {
      throw new BootstrapConfigurationError(`Configuration validation failed: ${errors.join('; ')}`, { errors })
    }
  }

  toJSON() {
    if (!this.#resolved) return { loaded: false }
    const safe = { ...this.#resolved }
    if (safe.POSTGRES_PASSWORD) safe.POSTGRES_PASSWORD = '***'
    if (safe.JWT_SECRET) safe.JWT_SECRET = '***'
    return safe
  }
}

export default BootstrapConfig
