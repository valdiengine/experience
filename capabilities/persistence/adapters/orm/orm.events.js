export const ORM_EVENTS = {
  ADAPTER_REGISTERED: 'orm:adapter_registered',
  ADAPTER_INITIALIZED: 'orm:adapter_initialized',
  ADAPTER_DESTROYED: 'orm:adapter_destroyed',
  ADAPTER_ERROR: 'orm:adapter_error',
  TRANSACTION_STARTED: 'orm:transaction_started',
  TRANSACTION_COMMITTED: 'orm:transaction_committed',
  TRANSACTION_ROLLED_BACK: 'orm:transaction_rolled_back',
  TRANSACTION_SAVEPOINT_CREATED: 'orm:transaction_savepoint_created',
  TRANSACTION_SAVEPOINT_RELEASED: 'orm:transaction_savepoint_released',
  TRANSACTION_SAVEPOINT_ROLLED_BACK: 'orm:transaction_savepoint_rolled_back',
  QUERY_EXECUTED: 'orm:query_executed',
  QUERY_FAILED: 'orm:query_failed',
  MAPPING_FAILED: 'orm:mapping_failed',
  MAPPING_REGISTERED: 'orm:mapping_registered',
  CONNECTION_ESTABLISHED: 'orm:connection_established',
  CONNECTION_FAILED: 'orm:connection_failed',
  CONNECTION_CLOSED: 'orm:connection_closed',
  SCHEMA_SYNC_STARTED: 'orm:schema_sync_started',
  SCHEMA_SYNC_COMPLETED: 'orm:schema_sync_completed',
  SCHEMA_SYNC_FAILED: 'orm:schema_sync_failed',
  PROVIDER_REGISTERED: 'orm:provider_registered',
  PROVIDER_RESOLVED: 'orm:provider_resolved',
  PROVIDER_ERROR: 'orm:provider_error',
}

export function createOrmEvent(event, payload = {}) {
  return { event, timestamp: Date.now(), payload }
}

export default ORM_EVENTS
