import * as schemas from '../intelligence.schema.js';
import { INTELLIGENCE_EVENTS, createIntelligenceEvent } from '../intelligence.events.js';

export default class VisitorIntelligenceManager {
  constructor(context) {
    this.context = context;
    this.profiles = new Map();
    this.behaviors = new Map();
  }

  async trackBehavior(visitorId, action) {
    const history = this.behaviors.get(visitorId) || [];
    history.push({
      action: action.type,
      entity: action.entityId,
      entityType: action.entityType,
      context: action.context || {},
      timestamp: new Date()
    });
    if (history.length > 500) history.splice(0, history.length - 500);
    this.behaviors.set(visitorId, history);
    this.context.eventBus?.emit(createIntelligenceEvent(INTELLIGENCE_EVENTS.VISITOR_BEHAVIOR_TRACKED, { visitorId, action: action.type }));
  }

  async analyzePreferences(visitorId) {
    const history = this.behaviors.get(visitorId) || [];
    if (history.length < 5) return null;
    const interestCounts = {};
    const activityCounts = {};
    for (const entry of history) {
      interestCounts[entry.entityType] = (interestCounts[entry.entityType] || 0) + 1;
      if (entry.context.activityType) {
        activityCounts[entry.context.activityType] = (activityCounts[entry.context.activityType] || 0) + 1;
      }
    }
    return {
      visitorId,
      topInterests: Object.entries(interestCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k]) => k),
      topActivities: Object.entries(activityCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k]) => k),
      totalActions: history.length,
      lastActivity: history[history.length - 1]?.timestamp
    };
  }

  async buildPersonalityProfile(visitorId) {
    const history = this.behaviors.get(visitorId) || [];
    const prefs = await this.analyzePreferences(visitorId);
    if (!prefs) return null;
    return {
      visitorId,
      patterns: {
        adventureSeeker: prefs.topInterests.includes('adventure') || prefs.topInterests.includes('sports'),
        natureLover: prefs.topInterests.includes('nature') || prefs.topInterests.includes('ecology'),
        socialButterfly: history.filter(h => h.action === 'community').length > history.length * 0.2,
        solitaryExplorer: history.filter(h => h.action === 'solo').length > history.length * 0.3,
        cultureEnthusiast: prefs.topInterests.includes('culture'),
        comfortSeeker: prefs.topActivities.includes('relaxation') || prefs.topActivities.includes('wellness')
      },
      preferences: prefs
    };
  }

  getBehaviorHistory(visitorId) {
    return this.behaviors.get(visitorId) || [];
  }
}
