/**
 * Observability Events — Event definitions for observability system
 */
export const OBSERVABILITY_EVENTS = {
  // Reserved: Internal observability events — no external consumers yet
  // Metrics
  METRIC_CREATED: 'observability:metric_created',
  METRIC_AGGREGATED: 'observability:metric_aggregated',

  // Health
  HEALTH_CHECKED: 'observability:health_checked',
  HEALTH_DEGRADED: 'observability:health_degraded',
  HEALTH_RECOVERED: 'observability:health_recovered',

  // Alerts
  ALERT_CREATED: 'observability:alert_created',
  ALERT_RESOLVED: 'observability:alert_resolved',
  ALERT_ESCALATED: 'observability:alert_escalated',

  // System
  OBSERVABILITY_STARTED: 'observability:started',
  OBSERVABILITY_STOPPED: 'observability:stopped',
}

export const ALERT_SEVERITY = {
  CRITICAL: 'critical',
  WARNING: 'warning',
  INFO: 'info',
}

export const HEALTH_STATUS = {
  HEALTHY: 'healthy',
  DEGRADED: 'degraded',
  UNHEALTHY: 'unhealthy',
}
