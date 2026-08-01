import { INTELLIGENCE_EVENTS, createIntelligenceEvent } from './intelligence.events.js';
import * as schemas from './intelligence.schema.js';

export default class IntelligenceManager {
  constructor(context) {
    this.context = context;
    this.profiles = new Map();
    this.recommendations = new Map();
    this.insights = new Map();
    this.predictions = new Map();
    this.graphConnections = new Map();
    this.offlineQueue = [];
  }

  async buildVisitorProfile(visitorId, data) {
    const existing = this.profiles.get(visitorId) || {};
    const profile = {
      id: visitorId,
      interests: data.interests || existing.interests || [],
      travelStyle: data.travelStyle || existing.travelStyle || 'solo',
      experienceLevel: data.experienceLevel || existing.experienceLevel || 'beginner',
      sportsProfile: data.sportsProfile || existing.sportsProfile || {},
      ecologicalProfile: data.ecologicalProfile || existing.ecologicalProfile || {},
      preferredActivities: data.preferredActivities || existing.preferredActivities || [],
      visitedDestinations: data.visitedDestinations || existing.visitedDestinations || [],
      discoveredSpecies: data.discoveredSpecies || existing.discoveredSpecies || [],
      completedChallenges: data.completedChallenges || existing.completedChallenges || [],
      favoriteBusinesses: data.favoriteBusinesses || existing.favoriteBusinesses || [],
      budgetRange: data.budgetRange || existing.budgetRange || { min: 0, max: 1000 },
      travelSeason: data.travelSeason || existing.travelSeason || 'any',
      accessibilityNeeds: data.accessibilityNeeds || existing.accessibilityNeeds || [],
      personalityProfile: data.personalityProfile || existing.personalityProfile || {},
      lastUpdated: new Date()
    };
    this.profiles.set(visitorId, profile);
    this.context.eventBus?.emit(createIntelligenceEvent(INTELLIGENCE_EVENTS.VISITOR_PROFILE_UPDATED, { visitorId, profile }));
    return profile;
  }

  async detectInterest(visitorId, activityData) {
    const profile = this.profiles.get(visitorId);
    if (!profile) return null;
    const detected = [];
    for (const [, value] of Object.entries(activityData)) {
      if (!profile.interests.includes(value) && Object.values(schemas.INTEREST_DOMAINS).includes(value)) {
        profile.interests.push(value);
        detected.push(value);
      }
    }
    if (detected.length > 0) {
      this.context.eventBus?.emit(createIntelligenceEvent(INTELLIGENCE_EVENTS.VISITOR_INTEREST_DETECTED, { visitorId, interests: detected }));
    }
    return detected;
  }

  async generateRecommendations(visitorId, destinationContext) {
    const profile = this.profiles.get(visitorId);
    if (!profile) return [];
    const recs = [];
    const { experiences = [], businesses = [], species = [] } = destinationContext;

    for (const exp of experiences) {
      const score = this._scoreExperience(profile, exp);
      if (score > 0.3) {
        recs.push({
          id: 'rec-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
          visitorId, type: schemas.RECOMMENDATION_TYPE.EXPERIENCE,
          entityId: exp.id, entityType: 'experience', score,
          reasons: this._explainExperience(profile, exp),
          context: { destination: destinationContext.destinationId },
          generatedAt: new Date(), viewed: false, accepted: false
        });
      }
    }

    for (const biz of businesses) {
      const score = this._scoreBusiness(profile, biz);
      if (score > 0.3) {
        recs.push({
          id: 'rec-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
          visitorId, type: schemas.RECOMMENDATION_TYPE.BUSINESS,
          entityId: biz.id, entityType: 'business', score,
          reasons: this._explainBusiness(profile, biz),
          context: { destination: destinationContext.destinationId },
          generatedAt: new Date(), viewed: false, accepted: false
        });
      }
    }

    for (const sp of species) {
      if (!profile.discoveredSpecies.includes(sp.id)) {
        recs.push({
          id: 'rec-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
          visitorId, type: schemas.RECOMMENDATION_TYPE.SPECIES,
          entityId: sp.id, entityType: 'species', score: 0.7,
          reasons: ['You have not discovered ' + sp.name + ' yet'],
          context: { destination: destinationContext.destinationId },
          generatedAt: new Date(), viewed: false, accepted: false
        });
      }
    }

    recs.sort((a, b) => b.score - a.score);
    this.recommendations.set('recs-' + visitorId, recs);
    this.context.eventBus?.emit(createIntelligenceEvent(INTELLIGENCE_EVENTS.RECOMMENDATION_GENERATED, { visitorId, count: recs.length }));
    return recs;
  }

  async createDestinationInsight(destinationId, type, metrics) {
    const insight = {
      id: 'insight-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      destinationId, type, period: 'current', metrics,
      trends: this._calculateTrends(metrics), recommendations: [],
      generatedAt: new Date(), confidence: this._calculateConfidence(metrics)
    };
    this.insights.set(insight.id, insight);
    this.context.eventBus?.emit(createIntelligenceEvent(INTELLIGENCE_EVENTS.DESTINATION_INSIGHT_CREATED, { destinationId, insightId: insight.id, type }));
    return insight;
  }

  async createPrediction(destinationId, type, horizon, forecast) {
    const prediction = {
      id: 'pred-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      destinationId, type, horizon, forecast,
      confidence: forecast.confidence || 0.5,
      basedOn: forecast.basedOn || [],
      generatedAt: new Date(), validUntil: this._calculateValidity(horizon)
    };
    this.predictions.set(prediction.id, prediction);
    this.context.eventBus?.emit(createIntelligenceEvent(INTELLIGENCE_EVENTS.DEMAND_PREDICTED, { destinationId, predictionId: prediction.id, type }));
    return prediction;
  }

  async addGraphConnection(sourceId, sourceType, targetId, targetType, relation, weight = 1.0) {
    const connection = { sourceId, sourceType, targetId, targetType, relation, weight, metadata: {}, createdAt: new Date() };
    this.graphConnections.set(sourceType + ':' + sourceId + '-' + targetType + ':' + targetId, connection);
    this.context.eventBus?.emit(createIntelligenceEvent(INTELLIGENCE_EVENTS.CONNECTION_DISCOVERED, { sourceId, sourceType, targetId, targetType, relation }));
    return connection;
  }

  async queueOfflineAction(action) {
    this.offlineQueue.push({ ...action, queuedAt: new Date() });
  }

  async syncOfflineQueue() {
    const queue = [...this.offlineQueue];
    this.offlineQueue = [];
    if (queue.length > 0) {
      this.context.eventBus?.emit(createIntelligenceEvent(INTELLIGENCE_EVENTS.INTELLIGENCE_SYNC_COMPLETED, { count: queue.length }));
    }
    return queue;
  }

  getVisitorRecommendations(visitorId) {
    return this.recommendations.get('recs-' + visitorId) || [];
  }

  getDestinationInsight(insightId) {
    return this.insights.get(insightId) || null;
  }

  getPrediction(predictionId) {
    return this.predictions.get(predictionId) || null;
  }

  getGraphConnections(entityType, entityId) {
    const connections = [];
    for (const [, conn] of this.graphConnections) {
      if ((conn.sourceType === entityType && conn.sourceId === entityId) ||
          (conn.targetType === entityType && conn.targetId === entityId)) {
        connections.push(conn);
      }
    }
    return connections;
  }

  _scoreExperience(profile, experience) {
    let score = 0;
    if (experience.category && profile.interests.includes(experience.category)) score += 0.4;
    if (experience.difficulty === profile.experienceLevel) score += 0.3;
    if (experience.season === profile.travelSeason || profile.travelSeason === 'any') score += 0.1;
    if (profile.preferredActivities.includes(experience.type)) score += 0.2;
    return Math.min(score, 1.0);
  }

  _scoreBusiness(profile, business) {
    let score = 0;
    if (business.category && profile.interests.includes(business.category)) score += 0.3;
    if (business.ecoSeal) score += 0.2;
    if (business.rating >= 4.0) score += 0.2;
    if (profile.budgetRange && business.priceRange) {
      if (business.priceRange >= profile.budgetRange.min && business.priceRange <= profile.budgetRange.max) score += 0.3;
    }
    return Math.min(score, 1.0);
  }

  _explainExperience(profile, experience) {
    const reasons = [];
    if (experience.category && profile.interests.includes(experience.category)) reasons.push('Matches your interest in ' + experience.category);
    if (experience.difficulty === profile.experienceLevel) reasons.push('Fits your ' + profile.experienceLevel + ' level');
    return reasons;
  }

  _explainBusiness(profile, business) {
    const reasons = [];
    if (business.ecoSeal) reasons.push('Eco-certified partner');
    if (business.rating >= 4.5) reasons.push('Highly rated by visitors');
    return reasons;
  }

  _calculateTrends(metrics) {
    return Object.entries(metrics).map(([key, value]) => ({ metric: key, direction: value > 0 ? 'up' : value < 0 ? 'down' : 'stable', value }));
  }

  _calculateConfidence(metrics) {
    const values = Object.values(metrics).filter(v => typeof v === 'number');
    if (values.length === 0) return 0.5;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  _calculateValidity(horizon) {
    const now = new Date();
    switch (horizon) {
      case 'today': now.setDate(now.getDate() + 1); break;
      case 'this_week': now.setDate(now.getDate() + 7); break;
      case 'this_month': now.setMonth(now.getMonth() + 1); break;
      case 'this_season': now.setMonth(now.getMonth() + 3); break;
      case 'this_year': now.setFullYear(now.getFullYear() + 1); break;
    }
    return now;
  }
}
