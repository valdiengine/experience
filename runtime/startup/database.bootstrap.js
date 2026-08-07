/**
 * Database Bootstrap — integrates database layer into runtime startup
 *
 * P12.3.1.4 (PostgreSQL Connection & Environment Configuration):
 * Initializes PostgreSQL connection, Drizzle ORM, and validates schema.
 *
 * Startup order: Environment → Database → Repository → Capability → Application
 *
 * Architecture boundary: Runtime → Repository → Drizzle ORM → PostgreSQL
 * Database must NOT be imported directly by API, BusinessService, Capabilities,
 * or Experience Engine. All access must remain behind Repository boundaries.
 */
import { bootstrapDatabase } from '../../database/bootstrap/database.bootstrap.js'
import { DatabaseBootstrapError } from './startup.errors.js'
import { STARTUP_EVENTS, createStartupEvent } from './startup.events.js'

export const BOOTSTRAP_PHASES = {
  ENVIRONMENT: 'environment',
  CONNECTION: 'connection',
  DRIZZLE: 'drizzle',
  SCHEMA: 'schema',
  READY: 'ready'
}

let databaseInstance = null

/**
 * Bootstrap the database layer.
 * @param {object} [options]
 * @param {string} [options.environment] - NODE_ENV (development, test, production)
 * @param {object} [options.eventBus] - Shared event bus for emitting startup events
 * @returns {Promise<object>} - Bootstrap result with connection, drizzle, schemas
 */
export async function bootstrapDatabaseLayer(options = {}) {
  const environment = options.environment || process.env.NODE_ENV || 'development'
  const eventBus = options.eventBus

  try {
    if (eventBus) {
      eventBus.emit(STARTUP_EVENTS.BOOTSTRAP_STARTING, createStartupEvent(STARTUP_EVENTS.BOOTSTRAP_STARTING, {
        layer: 'database',
        environment
      }))
    }

    const result = await bootstrapDatabase({ environment })

    databaseInstance = result

    if (eventBus) {
      eventBus.emit(STARTUP_EVENTS.BOOTSTRAP_COMPLETE, createStartupEvent(STARTUP_EVENTS.BOOTSTRAP_COMPLETE, {
        layer: 'database',
        phase: BOOTSTRAP_PHASES.READY,
        connection: Boolean(result.connection),
        drizzle: Boolean(result.drizzle),
        schemas: result.schemas ? Object.keys(result.schemas).length : 0
      }))
    }

    return result
  } catch (err) {
    const error = new DatabaseBootstrapError(`Database bootstrap failed: ${err.message}`, {
      error: err,
      environment
    })

    if (eventBus) {
      eventBus.emit(STARTUP_EVENTS.FAILED, createStartupEvent(STARTUP_EVENTS.FAILED, {
        layer: 'database',
        error: err.message
      }))
    }

    throw error
  }
}

/**
 * Get the current database instance.
 * @returns {object|null}
 */
export function getDatabaseInstance() {
  return databaseInstance
}

/**
 * Shutdown the database layer gracefully.
 * @returns {Promise<void>}
 */
export async function shutdownDatabaseLayer() {
  if (databaseInstance && databaseInstance.shutdown) {
    await databaseInstance.shutdown()
    databaseInstance = null
  }
}

export default bootstrapDatabaseLayer
