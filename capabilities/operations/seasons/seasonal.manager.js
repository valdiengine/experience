import { SEASON } from '../operations.schema.js';
import { OPERATIONS_EVENTS, createOperationsEvent } from '../operations.events.js';

export default class SeasonalManager {
  constructor(context) {
    this.context = context;
    this.profiles = new Map();
    this.recommendations = new Map();
  }

  async createSeasonProfile(destinationId, season, config = {}) {
    const id = destinationId + ':' + season;
    const profile = {
      id, destinationId, season,
      activities: config.activities || [],
      recommendations: config.recommendations || [],
      campaigns: config.campaigns || [],
      species: config.species || [],
      weather: config.weather || {},
      activeFrom: config.activeFrom || null,
      activeUntil: config.activeUntil || null
    };
    this.profiles.set(id, profile);
    return profile;
  }

  async activateSeason(destinationId, season) {
    const profile = this.profiles.get(destinationId + ':' + season);
    if (!profile) return null;
    this.context.eventBus?.emit(createOperationsEvent(OPERATIONS_EVENTS.SEASON_ACTIVATED, { destinationId, season }));
    return profile;
  }

  async deactivateSeason(destinationId, season) {
    const profile = this.profiles.get(destinationId + ':' + season);
    if (!profile) return null;
    this.context.eventBus?.emit(createOperationsEvent(OPERATIONS_EVENTS.SEASON_DEACTIVATED, { destinationId, season }));
    return profile;
  }

  async generateSeasonalRecommendations(destinationId, season, visitorProfile = {}) {
    const profile = this.profiles.get(destinationId + ':' + season);
    if (!profile) return [];
    const recs = [];
    for (const activity of profile.activities) {
      const score = this._scoreActivity(activity, visitorProfile);
      if (score > 0.3) {
        recs.push({
          type: 'activity', entity: activity, score,
          reason: 'Available in ' + season
        });
      }
    }
    for (const species of profile.species) {
      if (!visitorProfile.discoveredSpecies?.includes(species.id)) {
        recs.push({
          type: 'species', entity: species, score: 0.7,
          reason: 'Best time to observe ' + species.name
        });
      }
    }
    recs.sort((a, b) => b.score - a.score);
    this.recommendations.set(destinationId + ':' + season, recs);
    this.context.eventBus?.emit(createOperationsEvent(OPERATIONS_EVENTS.SEASONAL_RECOMMENDATION_GENERATED, { destinationId, season, count: recs.length }));
    return recs;
  }

  getCurrentSeason(destinationId) {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return SEASON.SPRING;
    if (month >= 5 && month <= 7) return SEASON.SUMMER;
    if (month >= 8 && month <= 10) return SEASON.AUTUMN;
    return SEASON.WINTER;
  }

  getSeasonProfile(destinationId, season) {
    return this.profiles.get(destinationId + ':' + season) || null;
  }

  getSeasonRecommendations(destinationId, season) {
    return this.recommendations.get(destinationId + ':' + season) || [];
  }

  getAllSeasonProfiles(destinationId) {
    return Array.from(this.profiles.values()).filter(p => p.destinationId === destinationId);
  }

  _scoreActivity(activity, visitorProfile) {
    let score = 0.5;
    if (visitorProfile.interests && activity.category) {
      if (visitorProfile.interests.includes(activity.category)) score += 0.3;
    }
    if (visitorProfile.experienceLevel && activity.difficulty) {
      if (activity.difficulty === visitorProfile.experienceLevel) score += 0.2;
    }
    return Math.min(score, 1.0);
  }
}
