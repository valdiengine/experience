/**
 * Scheduler Events
 */
export const SCHEDULER_EVENTS = {
  // Job lifecycle
  JOB_CREATED: 'scheduler:job_created',
  JOB_EXECUTED: 'scheduler:job_executed',
  JOB_COMPLETED: 'scheduler:job_completed',
  JOB_FAILED: 'scheduler:job_failed',
  JOB_CANCELLED: 'scheduler:job_cancelled',
  JOB_EXPIRED: 'scheduler:job_expired',
  TICK: 'scheduler:tick',

  // Execution events
  EXECUTION_STARTED: 'scheduler:started',
  EXECUTION_COMPLETED: 'scheduler:completed',
  EXECUTION_FAILED: 'scheduler:failed',
  EXECUTION_DUPLICATE: 'scheduler:duplicate',
  EXECUTION_BLOCKED: 'scheduler:blocked',

  // Retry events
  RETRY_SCHEDULED: 'scheduler:retry',
  RETRY_EXHAUSTED: 'scheduler:retry_exhausted',

  // Lock events
  LOCK_ACQUIRED: 'scheduler:locked',
  LOCK_RELEASED: 'scheduler:unlocked',
  LOCK_EXPIRED: 'scheduler:lock_expired',

  // Cleanup events
  CLEANUP_COMPLETED: 'scheduler:cleanup',

  // Circuit breaker events
  CIRCUIT_BREAKER_OPEN: 'scheduler:circuit_breaker_open',
  CIRCUIT_BREAKER_CLOSED: 'scheduler:circuit_breaker_closed',
  CIRCUIT_BREAKER_HALF_OPEN: 'scheduler:circuit_breaker_half_open',
}
