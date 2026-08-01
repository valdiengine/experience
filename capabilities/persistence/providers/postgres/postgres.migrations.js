import { PostgresMigrationError } from './postgres.errors.js'
import { POSTGRES_EVENTS, createPostgresEvent } from './postgres.events.js'

export class PostgresMigrations {
  constructor(connection, options = {}) {
    this.connection = connection
    this.eventBus = options.eventBus || null
    this._migrationsTable = options.migrationsTable || '_migrations'
    this._schema = options.schema || connection?.config?.schema || 'public'
    this._applied = new Map()
    this._initialized = false
  }

  async initialize() {
    if (this._initialized) return
    await this.#ensureMigrationsTable()
    await this.#loadApplied()
    this._initialized = true
  }

  async run(options = {}) {
    await this.initialize()
    const direction = options.direction || 'up'
    const migrations = options.migrations || []
    const target = options.target || null
    if (migrations.length === 0) return { applied: 0, skipped: 0, errors: [] }
    this.#emit(POSTGRES_EVENTS.POSTGRES_MIGRATION_STARTED, { count: migrations.length, direction, target })
    const result = { applied: 0, skipped: 0, errors: [] }
    const sorted = this.#sortMigrations(migrations, direction)

    for (const migration of sorted) {
      const alreadyApplied = this._applied.has(migration.name)
      if (direction === 'up') {
        if (alreadyApplied) { result.skipped++; continue }
        if (target && migration.name > target) { result.skipped++; continue }
        try {
          await this.#applyUp(migration)
          result.applied++
        } catch (err) {
          result.errors.push({ name: migration.name, error: err.message })
          this.#emit(POSTGRES_EVENTS.POSTGRES_ERROR, { operation: 'migration_up', migration: migration.name, error: err.message })
          break
        }
      } else {
        if (!alreadyApplied) { result.skipped++; continue }
        if (target && migration.name < target) { result.skipped++; continue }
        try {
          await this.#applyDown(migration)
          result.applied++
        } catch (err) {
          result.errors.push({ name: migration.name, error: err.message })
          break
        }
      }
    }
    this.#emit(POSTGRES_EVENTS.POSTGRES_MIGRATION_COMPLETED, result)
    return result
  }

  async #ensureMigrationsTable() {
    const client = this.connection.getClient()
    await client.query(`
      CREATE TABLE IF NOT EXISTS "${this._schema}"."${this._migrationsTable}" (
        name VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        checksum VARCHAR(64),
        duration_ms INTEGER
      )
    `)
  }

  async #loadApplied() {
    const client = this.connection.getClient()
    try {
      const result = await client.query(`SELECT name, applied_at, checksum FROM "${this._schema}"."${this._migrationsTable}" ORDER BY name`)
      for (const row of result.rows) this._applied.set(row.name, row)
    } catch { }
  }

  async #applyUp(migration) {
    const start = Date.now()
    const client = this.connection.getClient()
    try {
      const text = typeof migration.up === 'function' ? await migration.up(client) : migration.up
      if (text) await client.query(text)
      const duration = Date.now() - start
      const checksum = this.#checksum(migration.up?.toString() || '')
      await client.query(
        `INSERT INTO "${this._schema}"."${this._migrationsTable}" (name, checksum, duration_ms) VALUES ($1, $2, $3)`,
        [migration.name, checksum, duration]
      )
      this._applied.set(migration.name, { name: migration.name, applied_at: new Date(), checksum, duration_ms: duration })
    } catch (err) {
      throw new PostgresMigrationError(`Migration "${migration.name}" failed: ${err.message}`, {
        operation: 'up', migration: migration.name, cause: err,
      })
    }
  }

  async #applyDown(migration) {
    const start = Date.now()
    const client = this.connection.getClient()
    try {
      const text = typeof migration.down === 'function' ? await migration.down(client) : (migration.down || '')
      if (text) await client.query(text)
      await client.query(
        `DELETE FROM "${this._schema}"."${this._migrationsTable}" WHERE name = $1`, [migration.name]
      )
      this._applied.delete(migration.name)
    } catch (err) {
      throw new PostgresMigrationError(`Migration rollback "${migration.name}" failed: ${err.message}`, {
        operation: 'down', migration: migration.name, cause: err,
      })
    }
  }

  #sortMigrations(migrations, direction) {
    const sorted = [...migrations].sort((a, b) => a.name.localeCompare(b.name))
    return direction === 'down' ? sorted.reverse() : sorted
  }

  #checksum(text) {
    let hash = 0
    for (let i = 0; i < text.length; i++) { const chr = text.charCodeAt(i); hash = ((hash << 5) - hash) + chr; hash |= 0 }
    return Math.abs(hash).toString(16)
  }

  #emit(event, data) {
    if (this.eventBus) {
      this.eventBus.emit(event, createPostgresEvent(event, data))
    }
  }

  async destroy() {
    this._applied.clear()
    this._initialized = false
  }
}

export default PostgresMigrations
