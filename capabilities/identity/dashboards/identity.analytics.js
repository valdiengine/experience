import { IDENTITY_EVENTS, createIdentityEvent } from '../identity.events.js';

export default class IdentityAnalytics {
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

  async getIdentityDashboard(destinationId) {
    return {
      destinationId,
      identity: {
        completeness: this._getIdentityCompleteness(destinationId),
        keywords: this._getCounter('dest:' + destinationId + ':identity_keywords'),
        values: this._getCounter('dest:' + destinationId + ':identity_values')
      },
      stories: {
        total: this._getCounter('dest:' + destinationId + ':stories'),
        published: this._getCounter('dest:' + destinationId + ':published_stories'),
        validated: this._getCounter('dest:' + destinationId + ':validated_stories')
      },
      heritage: {
        total: this._getCounter('dest:' + destinationId + ':heritage_items'),
        tangible: this._getCounter('dest:' + destinationId + ':tangible_heritage'),
        intangible: this._getCounter('dest:' + destinationId + ':intangible_heritage')
      },
      heroes: {
        total: this._getCounter('dest:' + destinationId + ':heroes'),
        verified: this._getCounter('dest:' + destinationId + ':verified_heroes')
      },
      culturalMemories: {
        total: this._getCounter('dest:' + destinationId + ':cultural_memories'),
        validated: this._getCounter('dest:' + destinationId + ':validated_memories')
      }
    };
  }

  async getCulturalEngagementDashboard(destinationId) {
    return {
      destinationId,
      discoveries: this._getCounter('dest:' + destinationId + ':cultural_discoveries'),
      pokedexEntries: this._getCounter('dest:' + destinationId + ':pokedex_entries'),
      storyReads: this._getCounter('dest:' + destinationId + ':story_reads'),
      heritageVisits: this._getCounter('dest:' + destinationId + ':heritage_visits'),
      heroEncounters: this._getCounter('dest:' + destinationId + ':hero_encounters')
    };
  }

  getMetricHistory(category, name) {
    return this.metrics.get(category + ':' + name) || [];
  }

  _getCounter(key) {
    return this.counters.get(key) || 0;
  }

  _getIdentityCompleteness(destinationId) {
    const keywords = this._getCounter('dest:' + destinationId + ':identity_keywords');
    const values = this._getCounter('dest:' + destinationId + ':identity_values');
    return Math.min(100, (keywords * 10) + (values * 15));
  }
}
