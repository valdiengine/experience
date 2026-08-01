/**
 * Automation Engine — Events
 */
export const AUTOMATION_EVENTS = {
  // Rule management
  RULE_CREATED: 'automation:rule_created',
  RULE_UPDATED: 'automation:rule_updated',
  RULE_DELETED: 'automation:rule_deleted',
  RULE_ACTIVATED: 'automation:rule_activated',
  RULE_PAUSED: 'automation:rule_paused',

  // Execution
  RULE_TRIGGERED: 'automation:rule_triggered',
  RULE_MATCHED: 'automation:rule_matched',
  RULE_SKIPPED: 'automation:rule_skipped',
  RULE_EXECUTED: 'automation:rule_executed',
  RULE_FAILED: 'automation:rule_failed',

  // Actions
  ACTION_STARTED: 'automation:action_started',
  ACTION_COMPLETED: 'automation:action_completed',
  ACTION_FAILED: 'automation:action_failed',

  // Cooldown
  COOLDOWN_ACTIVE: 'automation:cooldown_active',
  MAX_EXECUTIONS_REACHED: 'automation:max_executions_reached',
}
