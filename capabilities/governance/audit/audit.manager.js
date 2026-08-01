import { AUDIT_ACTION } from '../governance.schema.js';
import { GOVERNANCE_EVENTS, createGovernanceEvent } from '../governance.events.js';

export default class AuditManager {
  constructor(context) {
    this.context = context;
    this.events = new Map();
    this.indexes = {
      actor: new Map(),
      entity: new Map(),
      action: new Map()
    };
  }

  async recordAudit(actorId, action, entityType, entityId, previousValue = null, newValue = null, reason = '') {
    const id = 'audit-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    const event = {
      id, actorId, action, entityType, entityId,
      timestamp: new Date(), previousValue, newValue, reason
    };
    this.events.set(id, event);
    this._indexEvent(event);
    this.context.eventBus?.emit(createGovernanceEvent(GOVERNANCE_EVENTS.AUDIT_CREATED, { auditId: id, action, entityType, entityId }));
    return event;
  }

  async recordBusinessApproved(entityId, decidedBy) {
    return this.recordAudit(decidedBy, AUDIT_ACTION.BUSINESS_APPROVED, 'business', entityId, { status: 'pending' }, { status: 'approved' }, 'Business verification completed');
  }

  async recordSpeciesValidated(entityId, validatedBy, species) {
    return this.recordAudit(validatedBy, AUDIT_ACTION.SPECIES_VALIDATED, 'species', entityId, { validated: false }, { validated: true, species }, 'Species observation validated');
  }

  async recordPlaceEdited(entityId, editedBy, changes) {
    return this.recordAudit(editedBy, AUDIT_ACTION.PLACE_EDITED, 'place', entityId, changes.previous, changes.current, changes.reason || 'Place updated');
  }

  async recordBadgeAwarded(entityId, badgeType, awardedBy) {
    return this.recordAudit(awardedBy, AUDIT_ACTION.BADGE_AWARDED, 'visitor', entityId, { badges: [] }, { badge: badgeType }, 'Badge awarded');
  }

  async recordReputationChanged(entityId, changedBy, previousRep, newRep) {
    return this.recordAudit(changedBy, AUDIT_ACTION.REPUTATION_CHANGED, 'visitor', entityId, { reputation: previousRep }, { reputation: newRep }, 'Reputation updated');
  }

  async recordModerationAction(entityId, moderatedBy, action, details) {
    return this.recordAudit(moderatedBy, AUDIT_ACTION.MODERATION_ACTION, 'content', entityId, details.previous, details.current, details.reason);
  }

  async recordWorkflowStateChanged(workflowId, changedBy, previousState, newState) {
    return this.recordAudit(changedBy, AUDIT_ACTION.WORKFLOW_STATE_CHANGED, 'workflow', workflowId, { state: previousState }, { state: newState }, 'Workflow state changed');
  }

  async recordPermissionChanged(entityId, changedBy, role, scope, previousRole) {
    return this.recordAudit(changedBy, AUDIT_ACTION.PERMISSION_CHANGED, 'permission', entityId, { role: previousRole, scope }, { role, scope }, 'Permission updated');
  }

  getAuditEvent(auditId) {
    return this.events.get(auditId) || null;
  }

  getAuditByActor(actorId) {
    return this.indexes.actor.get(actorId) || [];
  }

  getAuditByEntity(entityType, entityId) {
    const key = entityType + ':' + entityId;
    return this.indexes.entity.get(key) || [];
  }

  getAuditByAction(action) {
    return this.indexes.action.get(action) || [];
  }

  getRecentAudits(limit = 50) {
    return Array.from(this.events.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  getAuditTimeline(entityType, entityId, startDate, endDate) {
    const entityAudit = this.getAuditByEntity(entityType, entityId);
    return entityAudit.filter(a => {
      if (startDate && a.timestamp < startDate) return false;
      if (endDate && a.timestamp > endDate) return false;
      return true;
    });
  }

  getAuditStats() {
    const events = Array.from(this.events.values());
    const actionCounts = {};
    for (const event of events) {
      actionCounts[event.action] = (actionCounts[event.action] || 0) + 1;
    }
    return { total: events.length, byAction: actionCounts };
  }

  _indexEvent(event) {
    const actorList = this.indexes.actor.get(event.actorId) || [];
    actorList.push(event);
    this.indexes.actor.set(event.actorId, actorList);

    const entityKey = event.entityType + ':' + event.entityId;
    const entityList = this.indexes.entity.get(entityKey) || [];
    entityList.push(event);
    this.indexes.entity.set(entityKey, entityList);

    const actionList = this.indexes.action.get(event.action) || [];
    actionList.push(event);
    this.indexes.action.set(event.action, actionList);
  }
}
