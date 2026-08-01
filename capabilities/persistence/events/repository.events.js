export const REPOSITORY_EVENTS = {
  REPOSITORY_REGISTERED: 'repository:registered',
  REPOSITORY_CREATED: 'repository:created',
  REPOSITORY_DESTROYED: 'repository:destroyed',
  REPOSITORY_ERROR: 'repository:error',
  TRANSACTION_STARTED: 'repository:transaction_started',
  TRANSACTION_COMMITTED: 'repository:transaction_committed',
  TRANSACTION_ROLLED_BACK: 'repository:transaction_rolled_back',
  ENTITY_CREATED: 'repository:entity_created',
  ENTITY_UPDATED: 'repository:entity_updated',
  ENTITY_DELETED: 'repository:entity_deleted',
  ENTITY_READ: 'repository:entity_read',
}

export function createRepositoryEvent(event, payload = {}) {
  return { event, timestamp: Date.now(), source: 'repository', payload }
}

export default REPOSITORY_EVENTS
