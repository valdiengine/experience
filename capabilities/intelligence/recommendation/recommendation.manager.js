import * as schemas from '../intelligence.schema.js';
import { INTELLIGENCE_EVENTS, createIntelligenceEvent } from '../intelligence.events.js';

export default class RecommendationManager {
  constructor(context) {
    this.context = context;
    this.recommendations = new Map();
    this.feedback = new Map();
  }

  async generateExperienceRecommendations(visitorProfile, destinationData) {
    const recs = [];
    const { experiences = [] } = destinationData;
    for (const exp of experiences) {
      const score = this._scoreByProfile(visitorProfile, exp);
      const reasons = this._buildReasons(visitorProfile, exp, 'experience');
      if (score > 0.2) {
        recs.push(this._createRecommendation(visitorProfile.id, schemas.RECOMMENDATION_TYPE.EXPERIENCE, exp.id, 'experience', score, reasons, destinationData.destinationId));
      }
    }
    return recs.sort((a, b) => b.score - a.score);
  }

  async generateEcologicalRecommendations(visitorProfile, destinationData) {
    const recs = [];
    const { species = [] } = destinationData;
    const discovered = new Set(visitorProfile.discoveredSpecies || []);
    for (const sp of species) {
      if (!discovered.has(sp.id)) {
        const score = 0.6 + (sp.rarity === 'rare' ? 0.2 : 0) + (sp.season === visitorProfile.travelSeason ? 0.1 : 0);
        recs.push(this._createRecommendation(visitorProfile.id, schemas.RECOMMENDATION_TYPE.ECOLOGICAL, sp.id, 'species', score, ['New species for your collection', sp.habitat ? 'Found in ' + sp.habitat : ''], destinationData.destinationId));
      }
    }
    return recs.sort((a, b) => b.score - a.score);
  }

  async generateSportsRecommendations(visitorProfile, destinationData) {
    const recs = [];
    const { routes = [] } = destinationData;
    const preferred = visitorProfile.preferredActivities || [];
    for (const route of routes) {
      if (preferred.includes(route.sportType) || preferred.includes('all')) {
        const score = 0.5 + (route.difficulty === visitorProfile.experienceLevel ? 0.3 : 0);
        recs.push(this._createRecommendation(visitorProfile.id, schemas.RECOMMENDATION_TYPE.SPORTS, route.id, 'route', score, ['Matches your ' + route.sportType + ' profile'], destinationData.destinationId));
      }
    }
    return recs.sort((a, b) => b.score - a.score);
  }

  async generateCommunityRecommendations(visitorProfile, destinationData) {
    const recs = [];
    const { memories = [], events = [] } = destinationData;
    for (const mem of memories) {
      if (mem.rating >= 4) {
        recs.push(this._createRecommendation(visitorProfile.id, schemas.RECOMMENDATION_TYPE.COMMUNITY, mem.id, 'memory', 0.6, ['Highly rated visitor memory'], destinationData.destinationId));
      }
    }
    for (const evt of events) {
      if (evt.active) {
        recs.push(this._createRecommendation(visitorProfile.id, schemas.RECOMMENDATION_TYPE.COMMUNITY, evt.id, 'event', 0.5, ['Active community event'], destinationData.destinationId));
      }
    }
    return recs.sort((a, b) => b.score - a.score);
  }

  async generateSeasonalRecommendations(visitorProfile, destinationData) {
    const recs = [];
    const { seasonalEvents = [], seasonalSpecies = [] } = destinationData;
    for (const evt of seasonalEvents) {
      recs.push(this._createRecommendation(visitorProfile.id, schemas.RECOMMENDATION_TYPE.SEASONAL, evt.id, 'seasonal_event', 0.7, ['Happening now in this season'], destinationData.destinationId));
    }
    for (const sp of seasonalSpecies) {
      recs.push(this._createRecommendation(visitorProfile.id, schemas.RECOMMENDATION_TYPE.SEASONAL, sp.id, 'seasonal_species', 0.65, ['Best time to observe ' + sp.name], destinationData.destinationId));
    }
    return recs.sort((a, b) => b.score - a.score);
  }

  async recordFeedback(recommendationId, accepted) {
    const existing = this.feedback.get(recommendationId) || { views: 0, accepts: 0 };
    existing.views++;
    if (accepted) existing.accepts++;
    this.feedback.set(recommendationId, existing);
    this.context.eventBus?.emit(createIntelligenceEvent(INTELLIGENCE_EVENTS.AI_ASSISTANT_FEEDBACK, { recommendationId, accepted }));
  }

  getFeedbackStats() {
    const stats = { totalViews: 0, totalAccepts: 0 };
    for (const [, f] of this.feedback) {
      stats.totalViews += f.views;
      stats.totalAccepts += f.accepts;
    }
    stats.conversionRate = stats.totalViews > 0 ? stats.totalAccepts / stats.totalViews : 0;
    return stats;
  }

  _createRecommendation(visitorId, type, entityId, entityType, score, reasons, destinationId) {
    return {
      id: 'rec-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      visitorId, type, entityId, entityType, score, reasons,
      context: { destination: destinationId },
      generatedAt: new Date(), viewed: false, accepted: false
    };
  }

  _scoreByProfile(profile, entity) {
    let score = 0;
    if (entity.category && profile.interests && profile.interests.includes(entity.category)) score += 0.4;
    if (entity.difficulty && entity.difficulty === profile.experienceLevel) score += 0.2;
    if (entity.season && (entity.season === profile.travelSeason || profile.travelSeason === 'any')) score += 0.1;
    if (profile.preferredActivities && profile.preferredActivities.includes(entity.type)) score += 0.2;
    if (entity.rating) score += entity.rating / 10;
    return Math.min(score, 1.0);
  }

  _buildReasons(profile, entity) {
    const reasons = [];
    if (entity.category && profile.interests && profile.interests.includes(entity.category)) reasons.push('Matches your interest in ' + entity.category);
    if (entity.difficulty && entity.difficulty === profile.experienceLevel) reasons.push('Fits your ' + profile.experienceLevel + ' level');
    if (entity.rating && entity.rating >= 4.5) reasons.push('Highly rated by visitors');
    if (reasons.length === 0) reasons.push('Recommended based on your profile');
    return reasons;
  }
}
