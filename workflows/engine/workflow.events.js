/**
 * Workflow Engine — Events
 *
 * Events for workflow lifecycle and execution
 */
export const WORKFLOW_EVENTS = {
  // Workflow management
  CREATED: 'workflow:created',
  UPDATED: 'workflow:updated',
  DELETED: 'workflow:deleted',
  ACTIVATED: 'workflow:activated',
  PAUSED: 'workflow:paused',

  // Execution
  EXECUTION_STARTED: 'workflow:execution_started',
  EXECUTION_COMPLETED: 'workflow:execution_completed',
  EXECUTION_FAILED: 'workflow:execution_failed',
  EXECUTION_CANCELLED: 'workflow:execution_cancelled',
  EXECUTION_PAUSED: 'workflow:execution_paused',
  EXECUTION_RESUMED: 'workflow:execution_resumed',

  // Node execution
  NODE_STARTED: 'workflow:node_started',
  NODE_COMPLETED: 'workflow:node_completed',
  NODE_FAILED: 'workflow:node_failed',
  NODE_SKIPPED: 'workflow:node_skipped',

  // Delays
  DELAY_SCHEDULED: 'workflow:delay_scheduled',
  DELAY_COMPLETED: 'workflow:delay_completed',

  // Errors
  ERROR: 'workflow:error',
}
