export const OPERATIONS_EVENTS = Object.freeze({
  DESTINATION_ACTIVATED: 'operations.destination.activated',
  DESTINATION_PAUSED: 'operations.destination.paused',
  DESTINATION_STAGE_CHANGED: 'operations.destination.stage.changed',
  DESTINATION_STATUS_CHANGED: 'operations.destination.status.changed',

  HEALTH_UPDATED: 'operations.health.updated',
  HEALTH_ALERT_CREATED: 'operations.health.alert.created',
  HEALTH_CHECK_COMPLETED: 'operations.health.check.completed',

  CAMPAIGN_CREATED: 'operations.campaign.created',
  CAMPAIGN_STARTED: 'operations.campaign.started',
  CAMPAIGN_COMPLETED: 'operations.campaign.completed',
  CAMPAIGN_ARCHIVED: 'operations.campaign.archived',
  CAMPAIGN_MILESTONE_REACHED: 'operations.campaign.milestone.reached',

  SEASON_ACTIVATED: 'operations.season.activated',
  SEASON_DEACTIVATED: 'operations.season.deactivated',
  SEASONAL_RECOMMENDATION_GENERATED: 'operations.seasonal.recommendation.generated',

  OPERATIONAL_CHECK_COMPLETED: 'operations.check.completed',
  OPERATIONAL_ALERT_CREATED: 'operations.alert.created',
  OPERATIONAL_ALERT_RESOLVED: 'operations.alert.resolved',

  REPORT_GENERATED: 'operations.report.generated',

  AGENT_RECOMMENDATION_CREATED: 'operations.agent.recommendation.created',
  AGENT_ALERT_TRIGGERED: 'operations.agent.alert.triggered'
});

export function createOperationsEvent(type, data) {
  return {
    type,
    data,
    timestamp: new Date().toISOString(),
    source: 'operations-capability'
  };
}
