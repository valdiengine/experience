import { GOVERNANCE_EVENTS, createGovernanceEvent } from '../governance.events.js';

export default class GovernanceAnalytics {
  constructor(context) {
    this.context = context;
    this.metrics = new Map();
    this.counters = new Map();
  }

  async recordMetric(category, name, value, tags = {}) {
    const key = category + ':' + name;
    const history = this.metrics.get(key) || [];
    history.push({ value, tags, recordedAt: new Date() });
    if (history.length > 5000) history.splice(0, history.length - 5000);
    this.metrics.set(key, history);
  }

  async incrementCounter(category, name, amount = 1) {
    const key = category + ':' + name;
    this.counters.set(key, (this.counters.get(key) || 0) + amount);
  }

  async getPlatformDashboard() {
    return {
      activeDestinations: this._getCounter('platform:destinations'),
      totalUsers: this._getCounter('platform:users'),
      ecosystemGrowth: this._getGrowthRate('platform:users'),
      globalHealth: this._getAverageMetric('platform:health'),
      capabilityUtilization: this._getCounter('platform:capabilities_active'),
      securityAlerts: this._getCounter('platform:security_alerts')
    };
  }

  async getDestinationDashboard(destinationId) {
    return {
      destinationId,
      visitors: this._getCounter('destination:' + destinationId + ':visitors'),
      businesses: this._getCounter('destination:' + destinationId + ':businesses'),
      experiences: this._getCounter('destination:' + destinationId + ':experiences'),
      ecology: {
        observations: this._getCounter('destination:' + destinationId + ':observations'),
        species: this._getCounter('destination:' + destinationId + ':species')
      },
      communityActivity: this._getCounter('destination:' + destinationId + ':community'),
      healthScore: this._getAverageMetric('destination:' + destinationId + ':health')
    };
  }

  async getLocalityDashboard(localityId) {
    return {
      localityId,
      places: this._getCounter('locality:' + localityId + ':places'),
      memories: this._getCounter('locality:' + localityId + ':memories'),
      species: this._getCounter('locality:' + localityId + ':species'),
      challenges: this._getCounter('locality:' + localityId + ':challenges'),
      localEconomy: this._getCounter('locality:' + localityId + ':transactions'),
      communityParticipation: this._getCounter('locality:' + localityId + ':participation')
    };
  }

  async getPartnerDashboard(partnerId) {
    return {
      partnerId,
      views: this._getCounter('partner:' + partnerId + ':views'),
      interactions: this._getCounter('partner:' + partnerId + ':interactions'),
      reservations: this._getCounter('partner:' + partnerId + ':reservations'),
      reputation: this._getAverageMetric('partner:' + partnerId + ':reputation'),
      ecoParticipation: this._getCounter('partner:' + partnerId + ':eco_actions'),
      suggestions: this._generateSuggestions(partnerId)
    };
  }

  async getScientificDashboard(destinationId) {
    return {
      destinationId,
      observationVolume: this._getCounter('destination:' + destinationId + ':observations'),
      validationQueue: this._getCounter('destination:' + destinationId + ':validation_pending'),
      conservationProgress: this._getAverageMetric('destination:' + destinationId + ':conservation'),
      habitatHealth: this._getAverageMetric('destination:' + destinationId + ':habitat_health'),
      researchContributions: this._getCounter('destination:' + destinationId + ':research')
    };
  }

  getMetricHistory(category, name) {
    return this.metrics.get(category + ':' + name) || [];
  }

  _getCounter(key) {
    return this.counters.get(key) || 0;
  }

  _getAverageMetric(key) {
    const history = this.metrics.get(key) || [];
    if (history.length === 0) return 0;
    const sum = history.reduce((acc, m) => acc + m.value, 0);
    return sum / history.length;
  }

  _getGrowthRate(key) {
    const history = this.metrics.get(key) || [];
    if (history.length < 2) return 0;
    const recent = history.slice(-10);
    const older = history.slice(-20, -10);
    const recentAvg = recent.reduce((a, m) => a + m.value, 0) / (recent.length || 1);
    const olderAvg = older.reduce((a, m) => a + m.value, 0) / (older.length || 1);
    return olderAvg > 0 ? (recentAvg - olderAvg) / olderAvg : 0;
  }

  _generateSuggestions(partnerId) {
    const suggestions = [];
    const views = this._getCounter('partner:' + partnerId + ':views');
    const reservations = this._getCounter('partner:' + partnerId + ':reservations');
    if (views > 100 && reservations < 10) suggestions.push('Consider improving profile completeness');
    const reputation = this._getAverageMetric('partner:' + partnerId + ':reputation');
    if (reputation < 4.0) suggestions.push('Focus on improving service quality');
    return suggestions;
  }
}
