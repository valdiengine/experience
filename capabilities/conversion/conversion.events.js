/**
 * Conversion Events — Event definitions for conversion system
 */
export const CONVERSION_EVENTS = {
  // Scoring
  LEAD_CREATED: 'conversion:lead_created',
  SCORE_UPDATED: 'conversion:score_updated',
  CUSTOMER_SCORED: 'conversion:customer_scored',

  // Opportunities
  OPPORTUNITY_DETECTED: 'conversion:opportunity_detected',
  OPPORTUNITY_ACTIONED: 'conversion:opportunity_actioned',

  // Recovery
  RECOVERY_STARTED: 'conversion:recovery_started',
  RECOVERED: 'conversion:recovered',
  RECOVERY_FAILED: 'conversion:recovery_failed',

  // Follow-up
  FOLLOWUP_SENT: 'conversion:followup_sent',
  FOLLOWUP_COMPLETED: 'conversion:followup_completed',
  FOLLOWUP_FAILED: 'conversion:followup_failed',

  // Retention
  RETURNING_CUSTOMER_DETECTED: 'conversion:returning_customer_detected',
  RETENTION_ACTION: 'conversion:retention_action',

  // Analytics
  METRIC_RECORDED: 'conversion:metric_recorded',
}
