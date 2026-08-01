/**
 * Lifecycle Events — Customer, Trial, Growth, Retention
 */

export const LIFECYCLE_EVENTS = {
  CUSTOMER_CREATED: 'lifecycle:customer_created',
  CUSTOMER_ACTIVATED: 'lifecycle:customer_activated',
  CUSTOMER_UPDATED: 'lifecycle:customer_updated',
  CUSTOMER_SEGMENT_CHANGED: 'lifecycle:customer_segment_changed',
  CUSTOMER_HEALTH_UPDATED: 'lifecycle:customer_health_updated',

  TRIAL_STARTED: 'lifecycle:trial_started',
  TRIAL_ENDING: 'lifecycle:trial_ending',
  TRIAL_EXPIRED: 'lifecycle:trial_expired',
  TRIAL_CONVERTED: 'lifecycle:trial_converted',
  TRIAL_CANCELLED: 'lifecycle:trial_cancelled',

  UPGRADE_RECOMMENDED: 'lifecycle:upgrade_recommended',
  UPGRADE_REQUESTED: 'lifecycle:upgrade_requested',
  PLAN_CHANGED: 'lifecycle:plan_changed',

  CUSTOMER_INACTIVE: 'lifecycle:customer_inactive',
  CUSTOMER_CHURN_RISK: 'lifecycle:customer_churn_risk',
  CUSTOMER_RECOVERED: 'lifecycle:customer_recovered',
  CUSTOMER_RENEWED: 'lifecycle:customer_renewed',

  ACTIVATION_STEP_COMPLETED: 'lifecycle:activation_step_completed',
  ACTIVATION_COMPLETED: 'lifecycle:activation_completed',
}
