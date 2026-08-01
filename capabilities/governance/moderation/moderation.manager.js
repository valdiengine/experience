import { MODERATION_LEVEL, MODERATION_ACTION, CONTENT_TYPE } from '../governance.schema.js';
import { GOVERNANCE_EVENTS, createGovernanceEvent } from '../governance.events.js';

export default class ModerationManager {
  constructor(context) {
    this.context = context;
    this.cases = new Map();
    this.flags = new Map();
    this.appeals = new Map();
  }

  async reportContent(contentType, contentId, reportedBy, reason) {
    const id = 'mod-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    const modCase = {
      id, contentType, contentId, reportedBy, reason,
      level: MODERATION_LEVEL.AI_FILTER,
      status: 'open',
      decision: null,
      decidedBy: null,
      createdAt: new Date(),
      resolvedAt: null
    };
    this.cases.set(id, modCase);
    this.context.eventBus?.emit(createGovernanceEvent(GOVERNANCE_EVENTS.CONTENT_FLAGGED, {
      caseId: id, contentType, contentId, reportedBy
    }));
    return modCase;
  }

  async runAIFilter(caseId) {
    const modCase = this.cases.get(caseId);
    if (!modCase || modCase.level !== MODERATION_LEVEL.AI_FILTER) return null;
    const flags = this._analyzeContent(modCase);
    if (flags.length === 0) {
      modCase.decision = MODERATION_ACTION.APPROVE;
      modCase.decidedBy = 'ai_filter';
      modCase.status = 'resolved';
      modCase.resolvedAt = new Date();
      this.context.eventBus?.emit(createGovernanceEvent(GOVERNANCE_EVENTS.MODERATION_COMPLETED, { caseId, decision: 'approve' }));
    } else {
      modCase.level = MODERATION_LEVEL.COMMUNITY;
      this.flags.set(caseId, flags);
    }
    return modCase;
  }

  async escalateToManager(caseId, escalatedBy) {
    const modCase = this.cases.get(caseId);
    if (!modCase) return null;
    modCase.level = MODERATION_LEVEL.MANAGER_REVIEW;
    modCase.status = 'escalated';
    this.context.eventBus?.emit(createGovernanceEvent(GOVERNANCE_EVENTS.MODERATION_ESCALATED, { caseId, escalatedBy }));
    return modCase;
  }

  async escalateToAdmin(caseId, escalatedBy) {
    const modCase = this.cases.get(caseId);
    if (!modCase) return null;
    modCase.level = MODERATION_LEVEL.ADMIN_DECISION;
    modCase.status = 'escalated';
    this.context.eventBus?.emit(createGovernanceEvent(GOVERNANCE_EVENTS.MODERATION_ESCALATED, { caseId, escalatedBy, level: 'admin' }));
    return modCase;
  }

  async resolveCase(caseId, decision, decidedBy, reason = '') {
    const modCase = this.cases.get(caseId);
    if (!modCase) return null;
    modCase.decision = decision;
    modCase.decidedBy = decidedBy;
    modCase.reason = reason;
    modCase.status = 'resolved';
    modCase.resolvedAt = new Date();
    if (decision === MODERATION_ACTION.SUSPEND) {
      this.context.eventBus?.emit(createGovernanceEvent(GOVERNANCE_EVENTS.ACCOUNT_SUSPENDED, { contentId: modCase.contentId, decidedBy }));
    } else if (decision === MODERATION_ACTION.BAN) {
      this.context.eventBus?.emit(createGovernanceEvent(GOVERNANCE_EVENTS.ACCOUNT_BANNED, { contentId: modCase.contentId, decidedBy }));
    }
    this.context.eventBus?.emit(createGovernanceEvent(GOVERNANCE_EVENTS.MODERATION_COMPLETED, { caseId, decision, decidedBy }));
    return modCase;
  }

  async appealCase(caseId, appellantId, reason) {
    const modCase = this.cases.get(caseId);
    if (!modCase) return null;
    const appeal = {
      id: 'appeal-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      caseId, appellantId, reason,
      status: 'pending',
      createdAt: new Date()
    };
    this.appeals.set(appeal.id, appeal);
    modCase.status = 'under_appeal';
    return appeal;
  }

  getCase(caseId) {
    return this.cases.get(caseId) || null;
  }

  getOpenCases() {
    return Array.from(this.cases.values()).filter(c => c.status === 'open' || c.status === 'escalated');
  }

  getCasesByLevel(level) {
    return Array.from(this.cases.values()).filter(c => c.level === level);
  }

  getCasesByContentType(contentType) {
    return Array.from(this.cases.values()).filter(c => c.contentType === contentType);
  }

  getStats() {
    const cases = Array.from(this.cases.values());
    return {
      total: cases.length,
      open: cases.filter(c => c.status === 'open').length,
      resolved: cases.filter(c => c.status === 'resolved').length,
      escalated: cases.filter(c => c.status === 'escalated').length,
      byDecision: {
        approve: cases.filter(c => c.decision === MODERATION_ACTION.APPROVE).length,
        reject: cases.filter(c => c.decision === MODERATION_ACTION.REJECT).length,
        suspend: cases.filter(c => c.decision === MODERATION_ACTION.SUSPEND).length,
        ban: cases.filter(c => c.decision === MODERATION_ACTION.BAN).length
      }
    };
  }

  _analyzeContent(modCase) {
    const flags = [];
    const reason = modCase.reason?.toLowerCase() || '';
    if (reason.includes('spam')) flags.push('spam');
    if (reason.includes('inappropriate')) flags.push('inappropriate');
    if (reason.includes('fake')) flags.push('misinformation');
    if (reason.includes('harassment')) flags.push('harassment');
    return flags;
  }
}
