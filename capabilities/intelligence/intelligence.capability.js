import { BaseCapability } from '../core/base.capability.js';
import IntelligenceManager from './intelligence.manager.js';
import VisitorIntelligenceManager from './visitor/visitor-intelligence.manager.js';
import RecommendationManager from './recommendation/recommendation.manager.js';
import PredictionManager from './prediction/prediction.manager.js';
import KnowledgeGraphManager from './knowledge/knowledge-graph.manager.js';
import DestinationAIManager from './assistant/destination-ai.manager.js';
import IntelligenceAnalytics from './analytics/intelligence.analytics.js';

export class IntelligenceCapability extends BaseCapability {
  static id = 'intelligence';
  static name = 'Intelligence';
  static version = '1.0.0';
  static dependencies = [];

  constructor() {
    super();
    this.intelligence = null;
    this.visitorIntelligence = null;
    this.recommendations = null;
    this.predictions = null;
    this.knowledgeGraph = null;
    this.ai = null;
    this.analytics = null;
    this._listeners = null;
  }

  async init(context) {
    await super.init(context);
    this.intelligence = new IntelligenceManager(context);
    this.visitorIntelligence = new VisitorIntelligenceManager(context);
    this.recommendations = new RecommendationManager(context);
    this.predictions = new PredictionManager(context);
    this.knowledgeGraph = new KnowledgeGraphManager(context);
    this.ai = new DestinationAIManager(context);
    this.analytics = new IntelligenceAnalytics(context);
    return this;
  }

  async activate() {
    await super.activate();
    this._setupEventListeners();
    return this;
  }

  async deactivate() {
    this._removeEventListeners();
    await super.deactivate();
    return this;
  }

  async destroy() {
    this._removeEventListeners();
    await super.destroy();
    return this;
  }

  get intelligenceManager() { return this.intelligence; }
  get visitorIntelligenceManager() { return this.visitorIntelligence; }
  get recommendationManager() { return this.recommendations; }
  get predictionManager() { return this.predictions; }
  get knowledgeGraphManager() { return this.knowledgeGraph; }
  get aiManager() { return this.ai; }
  get analyticsManager() { return this.analytics; }

  _setupEventListeners() {
    const bus = this.context.eventBus;
    if (!bus) return;
    this._listeners = {
      onVisitorAction: (data) => this._handleVisitorAction(data),
      onDestinationUpdate: (data) => this._handleDestinationUpdate(data),
      onEcologyUpdate: (data) => this._handleEcologyUpdate(data),
      onBookingUpdate: (data) => this._handleBookingUpdate(data)
    };
    bus.on('exploration.place.discovered', this._listeners.onVisitorAction);
    bus.on('exploration.species.observed', this._listeners.onVisitorAction);
    bus.on('exploration.activity.completed', this._listeners.onVisitorAction);
    bus.on('destination.data.updated', this._listeners.onDestinationUpdate);
    bus.on('ecology.observation.created', this._listeners.onEcologyUpdate);
    bus.on('reservation.confirmed', this._listeners.onBookingUpdate);
  }

  _removeEventListeners() {
    const bus = this.context.eventBus;
    if (!bus || !this._listeners) return;
    bus.off('exploration.place.discovered', this._listeners.onVisitorAction);
    bus.off('exploration.species.observed', this._listeners.onVisitorAction);
    bus.off('exploration.activity.completed', this._listeners.onVisitorAction);
    bus.off('destination.data.updated', this._listeners.onDestinationUpdate);
    bus.off('ecology.observation.created', this._listeners.onEcologyUpdate);
    bus.off('reservation.confirmed', this._listeners.onBookingUpdate);
  }

  async _handleVisitorAction(data) {
    if (data.visitorId) {
      await this.visitorIntelligence.trackBehavior(data.visitorId, {
        type: data.type || 'action',
        entityId: data.placeId || data.speciesId || data.activityId,
        entityType: data.placeId ? 'place' : data.speciesId ? 'species' : 'activity',
        context: data.context || {}
      });
      await this.analytics.incrementCounter('visitor:' + data.visitorId + ':actions');
    }
  }

  async _handleDestinationUpdate(data) {
    if (data.destinationId) {
      await this.predictions.recordHistoricalData(data.destinationId, 'tourism_flow', 'current', data.metrics || {});
    }
  }

  async _handleEcologyUpdate(data) {
    if (data.destinationId) {
      await this.predictions.recordHistoricalData(data.destinationId, 'ecological_health', 'current', data.observation || {});
    }
  }

  async _handleBookingUpdate(data) {
    if (data.destinationId) {
      await this.predictions.recordHistoricalData(data.destinationId, 'economic_health', 'current', data.booking || {});
    }
  }
}
