/**
 * Database Configuration
 *
 * PostgreSQL database configuration for Valdi Platform v4.1
 *
 * @version 4.1
 */

/**
 * Default configuration by environment
 */
const DEFAULTS = {
  development: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    database: process.env.POSTGRES_DB || 'valdi_dev',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    ssl: false,
    pool: {
      max: 10,
      idleTimeoutMillis: 600000,
      connectionTimeoutMillis: 30000,
    },
    logging: true,
    schema: 'public',
  },
  testing: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    database: process.env.POSTGRES_DB || 'valdi_test',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    ssl: false,
    pool: {
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    },
    logging: false,
    schema: 'public',
  },
  production: {
    host: process.env.POSTGRES_HOST || '',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    database: process.env.POSTGRES_DB || 'valdi_prod',
    user: process.env.POSTGRES_USER || '',
    password: process.env.POSTGRES_PASSWORD || '',
    ssl: { mode: 'require', rejectUnauthorized: false },
    pool: {
      max: 50,
      idleTimeoutMillis: 300000,
      connectionTimeoutMillis: 30000,
    },
    logging: false,
    schema: 'public',
  },
  staging: {
    host: process.env.POSTGRES_HOST,
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    database: process.env.POSTGRES_DB,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    ssl: { rejectUnauthorized: true },
    pool: {
      max: 2,
      idleTimeoutMillis: 60000,
      connectionTimeoutMillis: 10000,
    },
    logging: false,
    schema: 'public',
  },
}

/**
 * Environment variable mappings
 */
const ENV_MAPPINGS = {
  host: 'POSTGRES_HOST',
  port: 'POSTGRES_PORT',
  database: 'POSTGRES_DB',
  user: 'POSTGRES_USER',
  password: 'POSTGRES_PASSWORD',
  ssl: 'DATABASE_SSL',
  poolSize: 'DATABASE_POOL_SIZE',
  logging: 'DATABASE_LOGGING',
  schema: 'DATABASE_SCHEMA',
}

/**
 * Get current environment
 * TURISTIC_ENV takes precedence for environment-specific config
 */
export function getEnvironment() {
  if (process.env.TURISTIC_ENV === 'staging') {
    return 'staging'
  }
  return process.env.NODE_ENV || 'development'
}

/**
 * Get database configuration for current environment
 */
export function getDatabaseConfig() {
  const env = getEnvironment()
  const defaults = DEFAULTS[env] || DEFAULTS.development

  return {
    ...defaults,
    url: process.env.DATABASE_URL || buildConnectionUrl(defaults),
  }
}

/**
 * Build connection URL from components
 */
function buildConnectionUrl(config) {
  const { user, password, host, port, database } = config
  return `postgresql://${user}:${password}@${host}:${port}/${database}`
}

/**
 * Get pool configuration
 */
export function getPoolConfig() {
  const config = getDatabaseConfig()
  const poolSize = parseInt(process.env.DATABASE_POOL_SIZE || '10', 10)

  return {
    max: Math.min(config.pool.max, poolSize),
    idleTimeoutMillis: config.pool.idleTimeoutMillis,
    connectionTimeoutMillis: config.pool.connectionTimeoutMillis,
  }
}

/**
 * Get SSL configuration
 */
export function getSslConfig() {
  const config = getDatabaseConfig()
  const sslEnv = process.env.DATABASE_SSL

  if (sslEnv === 'verify') {
    return { mode: 'require', rejectUnauthorized: true }
  }

  if (sslEnv === 'true' || sslEnv === '1') {
    throw new Error('DATABASE_SSL=true is not supported. Use DATABASE_SSL=verify or omit.')
  }

  return config.ssl || false
}

/**
 * Get schema configuration
 */
export function getSchemaConfig() {
  return {
    schema: process.env.DATABASE_SCHEMA || 'public',
    searchPath: [process.env.DATABASE_SCHEMA || 'public'],
  }
}

/**
 * Get logging configuration
 */
export function getLoggingConfig() {
  const env = getEnvironment()
  const envLogging = process.env.DATABASE_LOGGING

  if (envLogging === 'true' || envLogging === '1') return true
  if (envLogging === 'false' || envLogging === '0') return false

  return env === 'development'
}

/**
 * Validate configuration
 */
export function validateConfig() {
  const config = getDatabaseConfig()
  const env = getEnvironment()
  const errors = []

  if (env === 'staging') {
    if (!config.host) {
      errors.push('POSTGRES_HOST is required in staging')
    }
    if (!config.database) {
      errors.push('POSTGRES_DB is required in staging')
    }
    if (!config.user) {
      errors.push('POSTGRES_USER is required in staging')
    }
    if (!config.password) {
      errors.push('POSTGRES_PASSWORD is required in staging')
    }
  } else if (env === 'production') {
    if (!config.host) {
      errors.push('POSTGRES_HOST is required in production')
    }
    if (!config.database) {
      errors.push('POSTGRES_DB is required')
    }
    if (!config.user) {
      errors.push('POSTGRES_USER is required')
    }
    if (!config.password) {
      errors.push('POSTGRES_PASSWORD is required in production')
    }
  } else {
    if (!config.database) {
      errors.push('POSTGRES_DB is required')
    }
    if (!config.user) {
      errors.push('POSTGRES_USER is required')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    environment: env,
  }
}

/**
 * Database configuration object for Drizzle
 */
export const drizzleConfig = {
  schema: './database/schema/index.js',
  out: './database/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
}

export default {
  getEnvironment,
  getDatabaseConfig,
  getPoolConfig,
  getSslConfig,
  getSchemaConfig,
  getLoggingConfig,
  validateConfig,
  drizzleConfig,
}
