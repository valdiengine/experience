export const DRIZZLE_EVENTS = {
  DRIZZLE_INITIALIZED: 'drizzle:initialized',
  DRIZZLE_QUERY_EXECUTED: 'drizzle:query_executed',
  DRIZZLE_TRANSACTION_STARTED: 'drizzle:transaction_started',
  DRIZZLE_TRANSACTION_COMMITTED: 'drizzle:transaction_committed',
  DRIZZLE_TRANSACTION_ROLLED_BACK: 'drizzle:transaction_rolled_back',
  DRIZZLE_MIGRATION_STARTED: 'drizzle:migration_started',
  DRIZZLE_MIGRATION_COMPLETED: 'drizzle:migration_completed',
  DRIZZLE_ERROR: 'drizzle:error',
}

export function createDrizzleEvent(event, payload = {}) {
  return { event, timestamp: Date.now(), source: 'drizzle', payload }
}

export default DRIZZLE_EVENTS
