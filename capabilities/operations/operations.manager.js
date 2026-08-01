import { DESTINATION_STAGE, OPERATIONAL_STATUS, HEALTH_LEVEL } from './operations.schema.js';
import { OPERATIONS_EVENTS, createOperationsEvent } from './operations.events.js';

export default class OperationsManager {
  constructor(context) {
    this.context = context;
    this.destinations = new Map();
    this.alerts = new Map();
  }

  async activateDestination(destinationId, config = {}) {
    const existing = this.destinations.get(destinationId);
    if (existing && existing.stage !== DESTINATION_STAGE.REGISTERED) return existing;
    const lifecycle = {
      destinationId,
      stage: DESTINATION_STAGE.ACTIVATED,
      status: OPERATIONAL_STATUS.ACTIVE,
      healthScore: 50,
      healthBreakdown: { tourism: 0.5, community: 0.5, ecology: 0.5, economy: 0.5, governance: 0.5 },
      activatedAt: new Date(),
      lastHealthCheck: new Date(),
      alerts: [],
      config
    };
    this.destinations.set(destinationId, lifecycle);
    this.context.eventBus?.emit(createOperationsEvent(OPERATIONS_EVENTS.DESTINATION_ACTIVATED, { destinationId }));
    return lifecycle;
  }

  async pauseDestination(destinationId, reason) {
    const lifecycle = this.destinations.get(destinationId);
    if (!lifecycle) return null;
    lifecycle.status = OPERATIONAL_STATUS.PAUSED;
    lifecycle.alerts.push({ type: 'paused', reason, timestamp: new Date() });
    this.context.eventBus?.emit(createOperationsEvent(OPERATIONS_EVENTS.DESTINATION_PAUSED, { destinationId, reason }));
    return lifecycle;
  }

  async updateStage(destinationId, stage) {
    const lifecycle = this.destinations.get(destinationId);
    if (!lifecycle) return null;
    const previousStage = lifecycle.stage;
    lifecycle.stage = stage;
    this.context.eventBus?.emit(createOperationsEvent(OPERATIONS_EVENTS.DESTINATION_STAGE_CHANGED, { destinationId, previousStage, newStage: stage }));
    return lifecycle;
  }

  async getDestinationHealth(destinationId) {
    const lifecycle = this.destinations.get(destinationId);
    if (!lifecycle) return null;
    return {
      destinationId,
      score: lifecycle.healthScore,
      level: this._scoreToLevel(lifecycle.healthScore),
      breakdown: lifecycle.healthBreakdown,
      lastChecked: lifecycle.lastHealthCheck
    };
  }

  async updateHealthScore(destinationId, components) {
    const lifecycle = this.destinations.get(destinationId);
    if (!lifecycle) return null;
    const weights = { tourism: 0.25, community: 0.2, ecology: 0.2, economy: 0.2, governance: 0.15 };
    let totalScore = 0;
    for (const [key, weight] of Object.entries(weights)) {
      const value = components[key] || 0;
      lifecycle.healthBreakdown[key] = value;
      totalScore += value * weight * 100;
    }
    lifecycle.healthScore = Math.round(totalScore);
    lifecycle.lastHealthCheck = new Date();
    if (lifecycle.healthScore < 30) {
      this._createAlert(destinationId, HEALTH_LEVEL.CRITICAL, 'Destination health is critical');
    } else if (lifecycle.healthScore < 50) {
      this._createAlert(destinationId, HEALTH_LEVEL.NEEDS_ATTENTION, 'Destination health needs attention');
    }
    this.context.eventBus?.emit(createOperationsEvent(OPERATIONS_EVENTS.HEALTH_UPDATED, { destinationId, score: lifecycle.healthScore }));
    return lifecycle.healthScore;
  }

  async runOperationalCheck(destinationId) {
    const lifecycle = this.destinations.get(destinationId);
    if (!lifecycle) return null;
    const issues = [];
    if (lifecycle.status !== OPERATIONAL_STATUS.ACTIVE) issues.push('Destination not active');
    if (lifecycle.healthScore < 30) issues.push('Health score critical');
    if (lifecycle.stage === DESTINATION_STAGE.REGISTERED) issues.push('Destination not activated');
    this.context.eventBus?.emit(createOperationsEvent(OPERATIONS_EVENTS.OPERATIONAL_CHECK_COMPLETED, { destinationId, issues }));
    return { destinationId, issues, checkedAt: new Date() };
  }

  async generateDestinationReport(destinationId, period = 'monthly') {
    const lifecycle = this.destinations.get(destinationId);
    if (!lifecycle) return null;
    const report = {
      id: 'report-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      destinationId, period,
      health: { score: lifecycle.healthScore, breakdown: lifecycle.healthBreakdown },
      activity: this._getActivitySummary(destinationId),
      recommendations: this._generateRecommendations(lifecycle),
      generatedAt: new Date()
    };
    this.context.eventBus?.emit(createOperationsEvent(OPERATIONS_EVENTS.REPORT_GENERATED, { destinationId, reportId: report.id }));
    return report;
  }

  async createAlert(destinationId, type, severity, message, data = {}) {
    return this._createAlert(destinationId, severity, message, type, data);
  }

  async resolveAlert(alertId) {
    const alert = this.alerts.get(alertId);
    if (!alert) return null;
    alert.resolved = true;
    alert.resolvedAt = new Date();
    this.context.eventBus?.emit(createOperationsEvent(OPERATIONS_EVENTS.OPERATIONAL_ALERT_RESOLVED, { alertId }));
    return alert;
  }

  getDestination(destinationId) {
    return this.destinations.get(destinationId) || null;
  }

  getActiveDestinations() {
    return Array.from(this.destinations.values()).filter(d => d.status === OPERATIONAL_STATUS.ACTIVE);
  }

  getAlertsByDestination(destinationId, unresolvedOnly = true) {
    return Array.from(this.alerts.values()).filter(a => {
      if (a.destinationId !== destinationId) return false;
      if (unresolvedOnly && a.resolved) return false;
      return true;
    });
  }

  _scoreToLevel(score) {
    if (score <= 30) return HEALTH_LEVEL.CRITICAL;
    if (score <= 50) return HEALTH_LEVEL.NEEDS_ATTENTION;
    if (score <= 70) return HEALTH_LEVEL.HEALTHY;
    if (score <= 85) return HEALTH_LEVEL.THRIVING;
    return HEALTH_LEVEL.EXCEPTIONAL;
  }

  _createAlert(destinationId, severity, message, type = 'operational_anomaly', data = {}) {
    const id = 'alert-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    const alert = {
      id, destinationId, type, severity, message, data,
      acknowledged: false, resolved: false, createdAt: new Date(), resolvedAt: null
    };
    this.alerts.set(id, alert);
    const lifecycle = this.destinations.get(destinationId);
    if (lifecycle) lifecycle.alerts.push(alert);
    this.context.eventBus?.emit(createOperationsEvent(OPERATIONS_EVENTS.OPERATIONAL_ALERT_CREATED, { alertId: id, destinationId, severity }));
    return alert;
  }

  _getActivitySummary(destinationId) {
    return { visitors: 0, memories: 0, observations: 0, bookings: 0 };
  }

  _generateRecommendations(lifecycle) {
    const recs = [];
    if (lifecycle.healthScore < 50) recs.push('Focus on improving community engagement');
    if (lifecycle.stage === DESTINATION_STAGE.ACTIVATED) recs.push('Work toward Growing stage requirements');
    return recs;
  }
}
