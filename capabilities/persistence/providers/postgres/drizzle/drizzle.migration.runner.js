import { DRIZZLE_EVENTS, createDrizzleEvent } from './drizzle.events.js'
import { DrizzleError } from './drizzle.errors.js'

export class DrizzleMigrationRunner {
  constructor(drizzleClient, postgresProvider, options = {}) {
    this.client = drizzleClient
    this.postgres = postgresProvider
    this.eventBus = options.eventBus || null
    this._migrationsTable = options.migrationsTable || '_drizzle_migrations'
    this._applied = new Map()
    this._initialized = false
  }

  async initialize() {
    if (this._initialized) return
    await this.#ensureMigrationsTable()
    await this.#loadApplied()
    this._initialized = true
  }

  async run(migrations, options = {}) {
    await this.initialize()
    const direction = options.direction || 'up'
    const target = options.target || null
    if (!migrations || migrations.length === 0) return { applied: 0, skipped: 0, errors: [] }
    const result = { applied: 0, skipped: 0, errors: [] }
    const sorted = this.#sort(migrations, direction)
    for (const migration of sorted) {
      const already = this._applied.has(migration.name)
      if (direction === 'up') {
        if (already) { result.skipped++; continue }
        if (target && migration.name > target) { result.skipped++; continue }
        try { await this.#apply(migration, 'up'); result.applied++ }
        catch (err) { result.errors.push({ name: migration.name, error: err.message }); break }
      } else {
        if (!already) { result.skipped++; continue }
        if (target && migration.name < target) { result.skipped++; continue }
        try { await this.#apply(migration, 'down'); result.applied++ }
        catch (err) { result.errors.push({ name: migration.name, error: err.message }); break }
      }
    }
    this.#emit(DRIZZLE_EVENTS.DRIZZLE_QUERY_EXECUTED, { operation: 'migration_run', direction, applied: result.applied })
    return result
  }

  async #apply(migration, direction) {
    const client = this.postgres.getConnection().getClient()
    try {
      if (direction === 'up') {
        if (typeof migration.up === 'function') await migration.up(client, this.client.db)
        await client.query(`INSERT INTO "${this._migrationsTable}" (name) VALUES ($1)`, [migration.name])
        this._applied.set(migration.name, { name: migration.name, applied_at: new Date() })
      } else {
        if (typeof migration.down === 'function') await migration.down(client, this.client.db)
        await client.query(`DELETE FROM "${this._migrationsTable}" WHERE name = $1`, [migration.name])
        this._applied.delete(migration.name)
      }
    } catch (err) {
      throw new DrizzleError(`Migration "${migration.name}" ${direction} failed: ${err.message}`, {
        operation: 'migration', migration: migration.name, direction, cause: err,
      })
    }
  }

  async #ensureMigrationsTable() {
    const client = this.postgres.getConnection().getClient()
    await client.query(`
      CREATE TABLE IF NOT EXISTS "${this._migrationsTable}" (
        name VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)
  }

  async #loadApplied() {
    const client = this.postgres.getConnection().getClient()
    try {
      const result = await client.query(`SELECT name FROM "${this._migrationsTable}" ORDER BY name`)
      for (const row of result.rows) this._applied.set(row.name, row)
    } catch { }
  }

  #sort(migrations, direction) {
    const sorted = [...migrations].sort((a, b) => a.name.localeCompare(b.name))
    return direction === 'down' ? sorted.reverse() : sorted
  }

  #emit(event, data) {
    if (this.eventBus) {
      this.eventBus.emit(event, createDrizzleEvent(event, data))
    }
  }

  async destroy() {
    this._applied.clear()
    this._initialized = false
  }
}

export default DrizzleMigrationRunner
