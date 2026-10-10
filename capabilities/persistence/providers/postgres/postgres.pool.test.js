import test, { beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'

import { PostgresConfig } from './postgres.config.js'
import { buildPostgresPoolOptions } from './postgres.pool.js'

const ENV_KEYS = [
  'DATABASE_URL',
  'POSTGRES_HOST',
  'POSTGRES_PORT',
  'POSTGRES_DB',
  'POSTGRES_DATABASE',
  'POSTGRES_USER',
  'POSTGRES_USERNAME',
  'POSTGRES_PASSWORD',
  'POSTGRES_SSL',
  'PGSSLMODE',
]

const AMBIENT = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]))

function restoreAmbient() {
  for (const key of ENV_KEYS) {
    const value = AMBIENT[key]
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
}

function clearManagedEnv() {
  for (const key of ENV_KEYS) delete process.env[key]
}

const TUNING = {
  min: 2,
  max: 10,
  acquireTimeoutMillis: 30000,
  idleTimeoutMillis: 600000,
  reapIntervalMillis: 1000,
  createTimeoutMillis: 30000,
  destroyTimeoutMillis: 5000,
  maxQueue: 50,
  application_name: 'valdi-engine',
}

beforeEach(() => {
  restoreAmbient()
  clearManagedEnv()
})

afterEach(() => {
  restoreAmbient()
})

test('pool options prefer the connection string when present', () => {
  const url = 'postgresql://stage_app:secret@db.example.com:5432/valdi_test'
  process.env.DATABASE_URL = url
  const config = new PostgresConfig({})
  const options = buildPostgresPoolOptions(config)
  assert.equal(options.connectionString, url)
  assert.ok(!('host' in options), 'host must not be set when a connection string is present')
  assert.ok(!('port' in options), 'port must not be set when a connection string is present')
  assert.ok(!('database' in options), 'database must not be set when a connection string is present')
  assert.ok(!('user' in options), 'user must not be set when a connection string is present')
  assert.ok(!('password' in options), 'password must not be set when a connection string is present')
})

test('pool options use components when no connection string is available', () => {
  process.env.POSTGRES_HOST = 'legacy.example.com'
  process.env.POSTGRES_PORT = '6543'
  process.env.POSTGRES_DB = 'legacy_db'
  process.env.POSTGRES_USER = 'legacy_user'
  process.env.POSTGRES_PASSWORD = 'legacy_pass'
  const config = new PostgresConfig({})
  const options = buildPostgresPoolOptions(config)
  assert.equal(options.connectionString, undefined)
  assert.equal(options.host, 'legacy.example.com')
  assert.equal(options.port, 6543)
  assert.equal(options.database, 'legacy_db')
  assert.equal(options.user, 'legacy_user')
  assert.equal(options.password, 'legacy_pass')
})

test('pool tuning parameters are preserved in the connection-string branch', () => {
  process.env.DATABASE_URL = 'postgresql://stage_app:secret@db.example.com:5432/valdi_test'
  const options = buildPostgresPoolOptions(new PostgresConfig({}))
  assert.deepEqual(
    {
      min: options.min,
      max: options.max,
      acquireTimeoutMillis: options.acquireTimeoutMillis,
      idleTimeoutMillis: options.idleTimeoutMillis,
      reapIntervalMillis: options.reapIntervalMillis,
      createTimeoutMillis: options.createTimeoutMillis,
      destroyTimeoutMillis: options.destroyTimeoutMillis,
      maxQueue: options.maxQueue,
      application_name: options.application_name,
    },
    TUNING,
  )
})

test('pool tuning parameters are preserved in the component fallback branch', () => {
  process.env.POSTGRES_HOST = 'legacy.example.com'
  const options = buildPostgresPoolOptions(new PostgresConfig({}))
  assert.deepEqual(
    {
      min: options.min,
      max: options.max,
      acquireTimeoutMillis: options.acquireTimeoutMillis,
      idleTimeoutMillis: options.idleTimeoutMillis,
      reapIntervalMillis: options.reapIntervalMillis,
      createTimeoutMillis: options.createTimeoutMillis,
      destroyTimeoutMillis: options.destroyTimeoutMillis,
      maxQueue: options.maxQueue,
      application_name: options.application_name,
    },
    TUNING,
  )
})

test('ssl defaults to false when not configured (both branches)', () => {
  process.env.DATABASE_URL = 'postgresql://stage_app:secret@db.example.com:5432/valdi_test'
  assert.equal(buildPostgresPoolOptions(new PostgresConfig({})).ssl, false)

  clearManagedEnv()
  process.env.POSTGRES_HOST = 'legacy.example.com'
  assert.equal(buildPostgresPoolOptions(new PostgresConfig({})).ssl, false)
})

test('explicit ssl=require is preserved in the connection-string branch', () => {
  process.env.DATABASE_URL = 'postgresql://stage_app:secret@db.example.com:5432/valdi_test'
  const options = buildPostgresPoolOptions(new PostgresConfig({ ssl: 'require' }))
  assert.deepEqual(options.ssl, { enabled: true, rejectUnauthorized: true, mode: 'require' })
})

test('explicit ssl=require is preserved in the component fallback branch', () => {
  process.env.POSTGRES_HOST = 'legacy.example.com'
  const config = new PostgresConfig({ host: 'legacy.example.com', ssl: 'require' })
  const options = buildPostgresPoolOptions(config)
  assert.deepEqual(options.ssl, { enabled: true, rejectUnauthorized: true, mode: 'require' })
})

test('managed environment variables are restored between pool tests', () => {
  assert.equal(process.env.DATABASE_URL, undefined)
  assert.equal(process.env.POSTGRES_SSL, undefined)
})
