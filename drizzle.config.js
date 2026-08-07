/**
 * Drizzle ORM Configuration
 *
 * Configuration for Drizzle ORM with PostgreSQL.
 * Supports: development, testing, production environments.
 *
 * @version 4.1
 */

import { defineConfig } from 'drizzle-kit'

const env = process.env.NODE_ENV || 'development'

/**
 * Environment-specific database URLs
 */
const databaseUrls = {
  development: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/valdi_dev',
  testing: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/valdi_test',
  production: process.env.DATABASE_URL || 'postgresql://user:password@host:5432/valdi_prod',
}

/**
 * Migration configuration per environment
 */
const migrationSettings = {
  development: {
    runOnStartup: false,
    tableName: '_drizzle_migrations',
    schemaFilter: ['public'],
  },
  testing: {
    runOnStartup: false,
    tableName: '_drizzle_migrations',
    schemaFilter: ['public'],
  },
  production: {
    runOnStartup: false,
    tableName: '_drizzle_migrations',
    schemaFilter: ['public'],
  },
}

/**
 * Pool configuration per environment
 */
const poolSettings = {
  development: {
    min: 2,
    max: 10,
    acquireTimeout: 30000,
    idleTimeout: 600000,
  },
  testing: {
    min: 1,
    max: 5,
    acquireTimeout: 10000,
    idleTimeout: 30000,
  },
  production: {
    min: 10,
    max: 50,
    acquireTimeout: 30000,
    idleTimeout: 300000,
    maxQueue: 100,
  },
}

export default defineConfig({
  /**
   * Database connection schema
   */
  schema: './database/schema/index.js',

  /**
   * Migration directory
   */
  out: './database/migrations',

  /**
   * Database dialect
   */
  dialect: 'postgresql',

  /**
   * Connection configuration
   */
  dbCredentials: {
    url: databaseUrls[env],
    ssl: env === 'production' ? { mode: 'require', rejectUnauthorized: true } : false,
  },

  /**
   * Migration table name (for tracking applied migrations)
   */
  migrationsSchema: migrationSettings[env].schema,
  migrationsTable: migrationSettings[env].tableName,

  /**
   * Schema filter (useful for multi-tenant databases)
   */
  schemaFilter: migrationSettings[env].schemaFilter,

  /**
   * verbose logging in development
   */
  verbose: env === 'development',

  /**
   * Driver configuration
   */
  driver: 'pg',

  /**
   * Pool settings (used by the connection pool)
   */
  pool: poolSettings[env],

  /**
   * SSL configuration
   */
  ssl: env === 'production',

  /**
   * Strict mode (raises error on ambiguous column names)
   */
  strict: true,

  /**
   * Type generation settings
   */
  types: {
    enumName: 'custom_enum_name',
  },
})

/**
 * Environment variable requirements:
 *
 * DATABASE_URL - Full PostgreSQL connection string
 * NODE_ENV - Environment (development|testing|production)
 *
 * Optional:
 * TEST_DATABASE_URL - Override for testing environment
 */
