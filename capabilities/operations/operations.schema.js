export const DESTINATION_STAGE = Object.freeze({
  REGISTERED: 'registered',
  ACTIVATED: 'activated',
  GROWING: 'growing',
  MATURE: 'mature',
  LIVING: 'living'
});

export const OPERATIONAL_STATUS = Object.freeze({
  ACTIVE: 'active',
  PAUSED: 'paused',
  MAINTENANCE: 'maintenance',
  SUSPENDED: 'suspended'
});

export const HEALTH_LEVEL = Object.freeze({
  CRITICAL: 'critical',
  NEEDS_ATTENTION: 'needs_attention',
  HEALTHY: 'healthy',
  THRIVING: 'thriving',
  EXCEPTIONAL: 'exceptional'
});

export const SEASON = Object.freeze({
  SPRING: 'spring',
  SUMMER: 'summer',
  AUTUMN: 'autumn',
  WINTER: 'winter',
  MIGRATION: 'migration'
});

export const CAMPAIGN_STATUS = Object.freeze({
  DRAFT: 'draft',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  ARCHIVED: 'archived'
});

export const CAMPAIGN_TYPE = Object.freeze({
  DISCOVERY: 'discovery',
  CONSERVATION: 'conservation',
  COMMUNITY: 'community',
  BUSINESS: 'business',
  SEASONAL: 'seasonal'
});

export const ALERT_TYPE = Object.freeze({
  HEALTH_DECLINE: 'health_decline',
  CAPACITY_ISSUE: 'capacity_issue',
  SEASONAL_TRANSITION: 'seasonal_transition',
  CAMPAIGN_MILESTONE: 'campaign_milestone',
  OPERATIONAL_ANOMALY: 'operational_anomaly'
});

export const HEALTH_COMPONENT = Object.freeze({
  TOURISM: 'tourism',
  COMMUNITY: 'community',
  ECOLOGY: 'ecology',
  ECONOMY: 'economy',
  GOVERNANCE: 'governance'
});

export const DESTINATION_LIFECYCLE = Object.freeze({
  id: 'string',
  destinationId: 'string',
  stage: 'string',
  status: 'string',
  healthScore: 'number',
  healthBreakdown: 'object',
  activatedAt: 'date',
  lastHealthCheck: 'date',
  alerts: 'array',
  config: 'object'
});

export const CAMPAIGN = Object.freeze({
  id: 'string',
  destinationId: 'string',
  type: 'string',
  name: 'string',
  description: 'string',
  goal: 'object',
  progress: 'object',
  rewards: 'array',
  status: 'string',
  startDate: 'date',
  endDate: 'date',
  createdBy: 'string',
  createdAt: 'date'
});

export const SEASON_PROFILE = Object.freeze({
  id: 'string',
  destinationId: 'string',
  season: 'string',
  activities: 'array',
  recommendations: 'array',
  campaigns: 'array',
  species: 'array',
  weather: 'object',
  activeFrom: 'date',
  activeUntil: 'date'
});

export const OPERATIONAL_ALERT = Object.freeze({
  id: 'string',
  destinationId: 'string',
  type: 'string',
  severity: 'string',
  message: 'string',
  data: 'object',
  acknowledged: 'boolean',
  createdAt: 'date',
  resolvedAt: 'date'
});

export const DESTINATION_REPORT = Object.freeze({
  id: 'string',
  destinationId: 'string',
  period: 'string',
  health: 'object',
  activity: 'object',
  recommendations: 'array',
  generatedAt: 'date'
});
