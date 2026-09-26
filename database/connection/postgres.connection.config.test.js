import test from 'node:test'
import assert from 'node:assert/strict'

const ENV_KEYS = [
  'NODE_ENV',
  'TURISTIC_ENV',
  'DATABASE_URL',
  'POSTGRES_HOST',
  'POSTGRES_PORT',
  'POSTGRES_DB',
  'POSTGRES_USER',
  'POSTGRES_PASSWORD',
  'DATABASE_SSL',
]

function snapshotEnv() {
  return Object.fromEntries(ENV_KEYS.map(key => [key, process.env[key]]))
}

function restoreEnv(snapshot) {
  for (const key of ENV_KEYS) {
    if (snapshot[key] === undefined) delete process.env[key]
    else process.env[key] = snapshot[key]
  }
}

test('database config accepts DATABASE_URL as complete staging configuration', async () => {
  const previous = snapshotEnv()

  try {
    process.env.TURISTIC_ENV = 'staging'
    process.env.DATABASE_URL = 'postgresql://test_user:test_pass@example.invalid:5432/valdi_test'

    delete process.env.POSTGRES_HOST
    delete process.env.POSTGRES_DB
    delete process.env.POSTGRES_USER
    delete process.env.POSTGRES_PASSWORD

    const mod = await import(`../config/database.config.js?test=${Date.now()}`)

    const config = mod.getDatabaseConfig()
    const validation = mod.validateConfig()

    assert.equal(config.url, process.env.DATABASE_URL)
    assert.equal(validation.valid, true)
    assert.deepEqual(validation.errors, [])
  } finally {
    restoreEnv(previous)
  }
})

test('database config keeps component-based configuration when DATABASE_URL is absent', async () => {
  const previous = snapshotEnv()

  try {
    process.env.TURISTIC_ENV = 'staging'
    delete process.env.DATABASE_URL

    process.env.POSTGRES_HOST = 'localhost'
    process.env.POSTGRES_PORT = '5432'
    process.env.POSTGRES_DB = 'valdi_test'
    process.env.POSTGRES_USER = 'postgres'
    process.env.POSTGRES_PASSWORD = 'postgres'

    const mod = await import(`../config/database.config.js?components=${Date.now()}`)

    const config = mod.getDatabaseConfig()
    const validation = mod.validateConfig()

    assert.equal(config.host, 'localhost')
    assert.equal(config.database, 'valdi_test')
    assert.equal(config.user, 'postgres')
    assert.equal(validation.valid, true)
    assert.deepEqual(validation.errors, [])
  } finally {
    restoreEnv(previous)
  }
})

test('DATABASE_SSL=verify keeps strict certificate verification', async () => {
  const previous = snapshotEnv()

  try {
    process.env.TURISTIC_ENV = 'staging'
    process.env.DATABASE_URL = 'postgresql://test_user:test_pass@example.invalid:5432/valdi_test'
    process.env.DATABASE_SSL = 'verify'

    const mod = await import(`../config/database.config.js?ssl=${Date.now()}`)

assert.deepEqual(mod.getSslConfig(), {
      mode: 'verify-full',
      rejectUnauthorized: true,
    })
  } finally {
    restoreEnv(previous)
  }
})
