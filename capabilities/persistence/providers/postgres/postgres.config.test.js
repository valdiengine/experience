import test, { beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'

import { PostgresConfig } from './postgres.config.js'

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

beforeEach(() => {
  restoreAmbient()
  clearManagedEnv()
})

afterEach(() => {
  restoreAmbient()
})

test('DATABASE_URL takes precedence when present', () => {
  const url = 'postgresql://stage_app:secret@db.example.com:5432/valdi_test'
  process.env.DATABASE_URL = url
  const config = new PostgresConfig({})
  assert.equal(config.connectionString, url)
  assert.equal(config.connectionUri, url)
})

test('explicit config.connectionString takes precedence over environment DATABASE_URL', () => {
  process.env.DATABASE_URL = 'postgresql://env:env@env.example.com:5432/env_db'
  const explicit = 'postgresql://explicit:explicit@explicit.example.com:5432/explicit_db'
  const config = new PostgresConfig({ connectionString: explicit })
  assert.equal(config.connectionString, explicit)
  assert.equal(config.connectionUri, explicit)
})

test('DATABASE_URL-only configuration passes validation without POSTGRES_* fields', () => {
  process.env.DATABASE_URL = 'postgresql://stage_app:secret@db.example.com:5432/valdi_test'
  assert.doesNotThrow(() => new PostgresConfig({}))
})

test('component-based fallback is preserved when no connection string is available', () => {
  process.env.POSTGRES_HOST = 'legacy.example.com'
  process.env.POSTGRES_PORT = '6543'
  process.env.POSTGRES_DB = 'legacy_db'
  process.env.POSTGRES_USER = 'legacy_user'
  process.env.POSTGRES_PASSWORD = 'legacy_pass'
  const config = new PostgresConfig({})
  assert.equal(config.connectionString, null)
  assert.equal(config.host, 'legacy.example.com')
  assert.equal(config.port, 6543)
  assert.equal(config.database, 'legacy_db')
  assert.equal(config.user, 'legacy_user')
  assert.equal(config.password, 'legacy_pass')
  assert.equal(
    config.connectionUri,
    'postgresql://legacy_user:legacy_pass@legacy.example.com:6543/legacy_db',
  )
})

test('explicit component config still takes precedence over POSTGRES_* env in the fallback path', () => {
  process.env.POSTGRES_HOST = 'env.example.com'
  process.env.POSTGRES_USER = 'env_user'
  const config = new PostgresConfig({ host: 'explicit.example.com', user: 'explicit_user' })
  assert.equal(config.connectionString, null)
  assert.equal(config.host, 'explicit.example.com')
  assert.equal(config.user, 'explicit_user')
})

test('toJSON does not disclose password or connection string', () => {
  const password = 'super-secret-password'
  const url = `postgresql://stage_app:${password}@db.example.com:5432/valdi_test`
  process.env.DATABASE_URL = url
  const config = new PostgresConfig({})
  const json = JSON.stringify(config.toJSON())
  assert.ok(!json.includes(password), 'password must not appear in toJSON output')
  assert.ok(!json.includes(url), 'connection string must not appear in toJSON output')
  assert.ok(!json.includes('connectionString'), 'connectionString key must not appear in toJSON output')
  assert.ok(!json.includes('password'), 'password key must not appear in toJSON output')
})

test('managed environment variables are mutated by a test', () => {
  process.env.DATABASE_URL = 'postgresql://leak:leak@leak.example.com:5432/leak'
  assert.equal(process.env.DATABASE_URL, 'postgresql://leak:leak@leak.example.com:5432/leak')
})

test('managed environment variables are restored between tests', () => {
  assert.equal(process.env.DATABASE_URL, undefined)
  assert.equal(process.env.POSTGRES_HOST, undefined)
})
