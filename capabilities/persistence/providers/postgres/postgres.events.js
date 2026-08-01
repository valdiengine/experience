export const POSTGRES_EVENTS = {
  POSTGRES_CONNECTED: 'postgres:connected',
  POSTGRES_DISCONNECTED: 'postgres:disconnected',
  POSTGRES_RETRY: 'postgres:retry',
  POSTGRES_HEALTH_CHANGED: 'postgres:health_changed',
  POSTGRES_POOL_READY: 'postgres:pool_ready',
  POSTGRES_MIGRATION_STARTED: 'postgres:migration_started',
  POSTGRES_MIGRATION_COMPLETED: 'postgres:migration_completed',
  POSTGRES_ERROR: 'postgres:error',
}

export function createPostgresEvent(event, payload = {}) {
  return { event, timestamp: Date.now(), source: 'postgres-provider', payload }
}

export default POSTGRES_EVENTS
