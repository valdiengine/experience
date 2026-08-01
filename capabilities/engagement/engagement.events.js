/**
 * Engagement Events — Event definitions for engagement system
 */
export const ENGAGEMENT_EVENTS = {
  // Core
  CREATED: 'engagement:created',
  TRIGGERED: 'engagement:triggered',
  MESSAGE_SENT: 'engagement:message_sent',
  RESPONSE_RECEIVED: 'engagement:response_received',

  // Campaigns
  CAMPAIGN_CREATED: 'engagement:campaign_created',
  CAMPAIGN_STARTED: 'engagement:campaign_started',
  CAMPAIGN_COMPLETED: 'engagement:campaign_completed',
  CAMPAIGN_PAUSED: 'engagement:campaign_paused',

  // Availability
  AVAILABILITY_REQUESTED: 'engagement:availability_requested',
  AVAILABILITY_RECEIVED: 'engagement:availability_received',

  // Intelligence
  OPPORTUNITY_DETECTED: 'engagement:opportunity_detected',
  RECOMMENDATION_RECEIVED: 'engagement:recommendation_received',

  // Journey
  JOURNEY_UPDATED: 'engagement:journey_updated',
  JOURNEY_STAGE_CHANGED: 'engagement:journey_stage_changed',

  // Triggers
  TRIGGER_ACTIVATED: 'engagement:trigger_activated',
  TRIGGER_DEACTIVATED: 'engagement:trigger_deactivated',

  // Analytics
  METRIC_RECORDED: 'engagement:metric_recorded',
}
