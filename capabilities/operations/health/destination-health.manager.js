import { HEALTH_COMPONENT, HEALTH_LEVEL } from '../operations.schema.js';
import { OPERATIONS_EVENTS, createOperationsEvent } from '../operations.events.js';

export default class DestinationHealthManager {
  constructor(context) {
    this.context = context;
    this.healthRecords = new Map();
    this.history = new Map();
  }

  async calculateHealthScore(destinationId, metrics) {
    const components = {
      tourism: this._calculateTourismHealth(metrics.tourism || {}),
      community: this._calculateCommunityHealth(metrics.community || {}),
      ecology: this._calculateEcologyHealth(metrics.ecology || {}),
      economy: this._calculateEconomyHealth(metrics.economy || {}),
      governance: this._calculateGovernanceHealth(metrics.governance || {})
    };
    const weights = { tourism: 0.25, community: 0.2, ecology: 0.2, economy: 0.2, governance: 0.15 };
    let totalScore = 0;
    for (const [key, weight] of Object.entries(weights)) {
      totalScore += components[key] * weight;
    }
    const score = Math.round(totalScore * 100);
    const level = this._scoreToLevel(score);
    const record = {
      destinationId, score, level, components,
      calculatedAt: new Date(), metrics
    };
    this.healthRecords.set(destinationId, record);
    const history = this.history.get(destinationId) || [];
    history.push({ score, level, calculatedAt: new Date() });
    if (history.length > 365) history.splice(0, history.length - 365);
    this.history.set(destinationId, history);
    this.context.eventBus?.emit(createOperationsEvent(OPERATIONS_EVENTS.HEALTH_UPDATED, { destinationId, score, level }));
    return record;
  }

  async getHealthTrend(destinationId, days = 30) {
    const history = this.history.get(destinationId) || [];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const recent = history.filter(h => h.calculatedAt >= cutoff);
    if (recent.length === 0) return { trend: 'unknown', average: 0, dataPoints: 0 };
    const avg = recent.reduce((sum, h) => sum + h.score, 0) / recent.length;
    const firstHalf = recent.slice(0, Math.floor(recent.length / 2));
    const secondHalf = recent.slice(Math.floor(recent.length / 2));
    const firstAvg = firstHalf.reduce((sum, h) => sum + h.score, 0) / (firstHalf.length || 1);
    const secondAvg = secondHalf.reduce((sum, h) => sum + h.score, 0) / (secondHalf.length || 1);
    const trend = secondAvg > firstAvg + 2 ? 'improving' : secondAvg < firstAvg - 2 ? 'declining' : 'stable';
    return { trend, average: Math.round(avg), dataPoints: recent.length };
  }

  async getHealthComparison(destinationIds) {
    const results = [];
    for (const destId of destinationIds) {
      const record = this.healthRecords.get(destId);
      if (record) {
        results.push({ destinationId: destId, score: record.score, level: record.level });
      }
    }
    return results.sort((a, b) => b.score - a.score);
  }

  getHealthRecord(destinationId) {
    return this.healthRecords.get(destinationId) || null;
  }

  _calculateTourismHealth(tourism) {
    let score = 0;
    if (tourism.visitorActivity) score += tourism.visitorActivity * 0.3;
    if (tourism.experienceCompletion) score += tourism.experienceCompletion * 0.25;
    if (tourism.bookingActivity) score += tourism.bookingActivity * 0.25;
    if (tourism.reviewQuality) score += tourism.reviewQuality * 0.2;
    return Math.min(score, 1.0);
  }

  _calculateCommunityHealth(community) {
    let score = 0;
    if (community.participation) score += community.participation * 0.3;
    if (community.memories) score += community.memories * 0.25;
    if (community.validations) score += community.validations * 0.25;
    if (community.engagement) score += community.engagement * 0.2;
    return Math.min(score, 1.0);
  }

  _calculateEcologyHealth(ecology) {
    let score = 0;
    if (ecology.observations) score += ecology.observations * 0.3;
    if (ecology.conservation) score += ecology.conservation * 0.3;
    if (ecology.reputation) score += ecology.reputation * 0.2;
    if (ecology.habitatHealth) score += ecology.habitatHealth * 0.2;
    return Math.min(score, 1.0);
  }

  _calculateEconomyHealth(economy) {
    let score = 0;
    if (economy.partnerActivity) score += economy.partnerActivity * 0.3;
    if (economy.transactions) score += economy.transactions * 0.3;
    if (economy.experienceCreation) score += economy.experienceCreation * 0.2;
    if (economy.bookingConversion) score += economy.bookingConversion * 0.2;
    return Math.min(score, 1.0);
  }

  _calculateGovernanceHealth(governance) {
    let score = 1.0;
    if (governance.pendingApprovals) score -= governance.pendingApprovals * 0.05;
    if (governance.moderationBacklog) score -= governance.moderationBacklog * 0.03;
    if (governance.auditCompleteness) score += governance.auditCompleteness * 0.3;
    return Math.max(0, Math.min(score, 1.0));
  }

  _scoreToLevel(score) {
    if (score <= 30) return HEALTH_LEVEL.CRITICAL;
    if (score <= 50) return HEALTH_LEVEL.NEEDS_ATTENTION;
    if (score <= 70) return HEALTH_LEVEL.HEALTHY;
    if (score <= 85) return HEALTH_LEVEL.THRIVING;
    return HEALTH_LEVEL.EXCEPTIONAL;
  }
}
