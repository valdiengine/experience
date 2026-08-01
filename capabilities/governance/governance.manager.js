import { GOVERNANCE_EVENTS, createGovernanceEvent } from './governance.events.js';
import * as schemas from './governance.schema.js';

export default class GovernanceManager {
  constructor(context) {
    this.context = context;
    this.entities = new Map();
    this.workflows = new Map();
    this.healthScores = new Map();
  }

  async createGovernanceEntity(scope, name, parentId = null, config = {}) {
    const id = 'gov-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    const entity = {
      id, scope, name, parentId, config,
      healthScore: 0.5, createdAt: new Date(), updatedAt: new Date()
    };
    this.entities.set(id, entity);
    this.context.eventBus?.emit(createGovernanceEvent(GOVERNANCE_EVENTS.DESTINATION_CREATED, { entityId: id, scope, name }));
    return entity;
  }

  async updateGovernanceEntity(entityId, updates) {
    const entity = this.entities.get(entityId);
    if (!entity) return null;
    Object.assign(entity, updates, { updatedAt: new Date() });
    this.context.eventBus?.emit(createGovernanceEvent(GOVERNANCE_EVENTS.DESTINATION_UPDATED, { entityId }));
    return entity;
  }

  async calculateHealthScore(entityId, metrics) {
    const weights = { content: 0.2, engagement: 0.25, ecology: 0.2, business: 0.15, community: 0.2 };
    let score = 0;
    for (const [key, weight] of Object.entries(weights)) {
      score += (metrics[key] || 0) * weight;
    }
    const level = score < 0.3 ? schemas.HEALTH_LEVEL.CRITICAL :
                  score < 0.6 ? schemas.HEALTH_LEVEL.NEEDS_ATTENTION :
                  score < 0.8 ? schemas.HEALTH_LEVEL.HEALTHY : schemas.HEALTH_LEVEL.THRIVING;
    this.healthScores.set(entityId, { score, level, metrics, calculatedAt: new Date() });
    this.context.eventBus?.emit(createGovernanceEvent(GOVERNANCE_EVENTS.HEALTH_CALCULATED, { entityId, score, level }));
    return { score, level };
  }

  getHealthScore(entityId) {
    return this.healthScores.get(entityId) || null;
  }

  getEntity(entityId) {
    return this.entities.get(entityId) || null;
  }

  getEntitiesByScope(scope) {
    return Array.from(this.entities.values()).filter(e => e.scope === scope);
  }

  getEntitiesByParent(parentId) {
    return Array.from(this.entities.values()).filter(e => e.parentId === parentId);
  }
}
