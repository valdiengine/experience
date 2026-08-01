import { INTELLIGENCE_EVENTS, createIntelligenceEvent } from '../intelligence.events.js';

export default class KnowledgeGraphManager {
  constructor(context) {
    this.context = context;
    this.entities = new Map();
    this.connections = new Map();
  }

  async addEntity(type, id, data) {
    const entity = { type, id, data, createdAt: new Date(), connections: [] };
    this.entities.set(type + ':' + id, entity);
    return entity;
  }

  async addConnection(sourceType, sourceId, targetType, targetId, relation, weight = 1.0, metadata = {}) {
    const key = sourceType + ':' + sourceId + '->' + targetType + ':' + targetId + ':' + relation;
    const connection = { sourceType, sourceId, targetType, targetId, relation, weight, metadata, createdAt: new Date() };
    this.connections.set(key, connection);
    const sourceKey = sourceType + ':' + sourceId;
    const sourceEntity = this.entities.get(sourceKey);
    if (sourceEntity) sourceEntity.connections.push(key);
    this.context.eventBus?.emit(createIntelligenceEvent(INTELLIGENCE_EVENTS.CONNECTION_DISCOVERED, { sourceType, sourceId, targetType, targetId, relation }));
    return connection;
  }

  async findConnections(entityType, entityId, direction = 'both') {
    const results = [];
    for (const [, conn] of this.connections) {
      if (direction === 'outgoing' && conn.sourceType === entityType && conn.sourceId === entityId) results.push(conn);
      else if (direction === 'incoming' && conn.targetType === entityType && conn.targetId === entityId) results.push(conn);
      else if (direction === 'both' && ((conn.sourceType === entityType && conn.sourceId === entityId) || (conn.targetType === entityType && conn.targetId === entityId))) results.push(conn);
    }
    return results.sort((a, b) => b.weight - a.weight);
  }

  async findPath(sourceType, sourceId, targetType, targetId, maxDepth = 3) {
    const visited = new Set();
    const queue = [{ type: sourceType, id: sourceId, path: [] }];
    while (queue.length > 0) {
      const current = queue.shift();
      if (current.type === targetType && current.id === targetId) return current.path;
      if (current.path.length >= maxDepth) continue;
      const nodeKey = current.type + ':' + current.id;
      if (visited.has(nodeKey)) continue;
      visited.add(nodeKey);
      const connections = await this.findConnections(current.type, current.id, 'outgoing');
      for (const conn of connections) {
        const nextKey = conn.targetType + ':' + conn.targetId;
        if (!visited.has(nextKey)) {
          queue.push({ type: conn.targetType, id: conn.targetId, path: [...current.path, { from: conn.sourceType + ':' + conn.sourceId, to: nextKey, relation: conn.relation }] });
        }
      }
    }
    return null;
  }

  async getEntityContext(entityType, entityId) {
    const entity = this.entities.get(entityType + ':' + entityId);
    if (!entity) return null;
    const connections = await this.findConnections(entityType, entityId, 'both');
    const relatedEntities = [];
    for (const conn of connections) {
      const otherKey = conn.sourceType === entityType && conn.sourceId === entityId ? conn.targetType + ':' + conn.targetId : conn.sourceType + ':' + conn.sourceId;
      const otherEntity = this.entities.get(otherKey);
      if (otherEntity) relatedEntities.push({ entity: otherEntity, connection: conn });
    }
    return { entity, connections, relatedEntities };
  }

  async getVisitorKnowledgeGraph(visitorId) {
    const connections = await this.findConnections('visitor', visitorId, 'both');
    const entities = new Map();
    for (const conn of connections) {
      const sourceKey = conn.sourceType + ':' + conn.sourceId;
      const targetKey = conn.targetType + ':' + conn.targetId;
      if (!entities.has(sourceKey)) {
        const e = this.entities.get(sourceKey);
        if (e) entities.set(sourceKey, e);
      }
      if (!entities.has(targetKey)) {
        const e = this.entities.get(targetKey);
        if (e) entities.set(targetKey, e);
      }
    }
    return { entities: Array.from(entities.values()), connections };
  }

  getEntity(type, id) {
    return this.entities.get(type + ':' + id) || null;
  }

  getStats() {
    return { totalEntities: this.entities.size, totalConnections: this.connections.size };
  }
}
