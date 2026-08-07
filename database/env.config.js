/**
 * Database Environment Configuration
 *
 * Environment-based configuration for database connections.
 * Supports: development, staging, production
 */

export const ENVIRONMENT_CONFIG = {
  /**
   * Development environment
   */
  development: {
    postgres: {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
      database: process.env.POSTGRES_DB || 'valdi_dev',
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'postgres',
      ssl: false,
      pool: {
        min: 2,
        max: 10,
        acquireTimeout: 30000,
        idleTimeout: 600000,
      },
      retry: {
        maxAttempts: 3,
        baseDelay: 1000,
        maxDelay: 10000,
      },
    },
    drizzle: {
      logger: true,
      schemaFilter: ['public'],
    },
    migrations: {
      runOnStartup: false,
      tableName: '_drizzle_migrations',
    },
    seeds: {
      runOnStartup: true,
      verbose: true,
    },
  },

  /**
   * Staging environment
   */
  staging: {
    postgres: {
      host: process.env.POSTGRES_HOST || 'staging-db.example.com',
      port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
      database: process.env.POSTGRES_DB || 'valdi_staging',
      user: process.env.POSTGRES_USER || 'valdi_user',
      password: process.env.POSTGRES_PASSWORD || '',
      ssl: { mode: 'require', rejectUnauthorized: true },
      pool: {
        min: 5,
        max: 20,
        acquireTimeout: 30000,
        idleTimeout: 300000,
      },
      retry: {
        maxAttempts: 5,
        baseDelay: 1000,
        maxDelay: 30000,
      },
    },
    drizzle: {
      logger: true,
      schemaFilter: ['public'],
    },
    migrations: {
      runOnStartup: true,
      tableName: '_drizzle_migrations',
    },
    seeds: {
      runOnStartup: false,
      verbose: false,
    },
  },

  /**
   * Production environment
   */
  production: {
    postgres: {
      host: process.env.POSTGRES_HOST || 'prod-db.example.com',
      port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
      database: process.env.POSTGRES_DB || 'valdi_prod',
      user: process.env.POSTGRES_USER || 'valdi_user',
      password: process.env.POSTGRES_PASSWORD || '',
      ssl: { mode: 'require', rejectUnauthorized: true },
      pool: {
        min: 10,
        max: 50,
        acquireTimeout: 30000,
        idleTimeout: 300000,
        maxQueue: 100,
      },
      retry: {
        maxAttempts: 5,
        baseDelay: 1000,
        maxDelay: 30000,
        jitter: 0.1,
      },
      health: {
        interval: 30000,
        unhealthyThreshold: 3,
        recoveryThreshold: 2,
      },
    },
    drizzle: {
      logger: false,
      schemaFilter: ['public'],
    },
    migrations: {
      runOnStartup: false,
      tableName: '_drizzle_migrations',
    },
    seeds: {
      runOnStartup: false,
      verbose: false,
    },
  },
}

/**
 * Get environment name
 */
export function getEnvironment() {
  return process.env.NODE_ENV || 'development'
}

/**
 * Get configuration for current environment
 */
export function getConfig() {
  const env = getEnvironment()
  const config = ENVIRONMENT_CONFIG[env]

  if (!config) {
    console.warn(`Unknown environment "${env}", falling back to development`)
    return ENVIRONMENT_CONFIG.development
  }

  return config
}

/**
 * Validate environment configuration
 */
export function validateConfig() {
  const env = getEnvironment()
  const config = getConfig()
  const errors = []

  if (!config.postgres?.host) {
    errors.push('POSTGRES_HOST is required')
  }

  if (!config.postgres?.database) {
    errors.push('POSTGRES_DATABASE is required')
  }

  if (!config.postgres?.user) {
    errors.push('POSTGRES_USER is required')
  }

  if (config.postgres?.ssl === true && env === 'development') {
    console.warn('SSL enabled in development - this may cause connection issues')
  }

  return {
    valid: errors.length === 0,
    errors,
    environment: env,
  }
}

export default {
  ENVIRONMENT_CONFIG,
  getEnvironment,
  getConfig,
  validateConfig,
}
