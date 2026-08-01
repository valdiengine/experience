export const SYNC_EVENTS = {
  SYNC_STARTED: 'cms:sync_started',
  SYNC_COMPLETED: 'cms:sync_completed',
  SYNC_FAILED: 'cms:sync_failed',
  SYNC_CANCELLED: 'cms:sync_cancelled',

  SYNC_CONFLICT_DETECTED: 'cms:sync_conflict_detected',
  SYNC_CONFLICT_RESOLVED: 'cms:sync_conflict_resolved',
  SYNC_CONFLICT_ESCALATED: 'cms:sync_conflict_escalated',

  SYNC_RETRY: 'cms:sync_retry',
  SYNC_RETRY_EXHAUSTED: 'cms:sync_retry_exhausted',

  SYNC_CHECKPOINT_CREATED: 'cms:sync_checkpoint_created',
  SYNC_CHECKPOINT_RESTORED: 'cms:sync_checkpoint_restored',

  SYNC_JOB_CREATED: 'cms:sync_job_created',
  SYNC_JOB_PROGRESS: 'cms:sync_job_progress',
  SYNC_JOB_COMPLETED: 'cms:sync_job_completed',
  SYNC_JOB_FAILED: 'cms:sync_job_failed',

  SYNC_PROVIDER_SYNCING: 'cms:sync_provider_syncing',
  SYNC_PROVIDER_ERROR: 'cms:sync_provider_error',

  SYNC_QUEUE_BACKPRESSURE: 'cms:sync_queue_backpressure',
  SYNC_QUEUE_DRAINED: 'cms:sync_queue_drained',

  SYNC_ERROR: 'cms:sync_error',
}

export function createSyncEvent(event, payload = {}) {
  return { event, timestamp: Date.now(), source: 'cms-sync-engine', payload }
}

export default SYNC_EVENTS
