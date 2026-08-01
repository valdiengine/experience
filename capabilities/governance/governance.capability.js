import { BaseCapability } from '../core/base.capability.js';
import GovernanceManager from './governance.manager.js';
import GovernanceRoleManager from './roles/role.manager.js';
import WorkflowManager from './workflows/workflow.manager.js';
import ModerationManager from './moderation/moderation.manager.js';
import AuditManager from './audit/audit.manager.js';
import GovernanceAnalytics from './dashboards/governance.analytics.js';

export class GovernanceCapability extends BaseCapability {
  static id = 'governance';
  static name = 'Governance';
  static version = '1.0.0';
  static dependencies = [];

  constructor() {
    super();
    this.governance = null;
    this.roles = null;
    this.workflows = null;
    this.moderation = null;
    this.audit = null;
    this.analytics = null;
    this._listeners = null;
  }

  async init(context) {
    await super.init(context);
    this.governance = new GovernanceManager(context);
    this.roles = new GovernanceRoleManager(context);
    this.workflows = new WorkflowManager(context);
    this.moderation = new ModerationManager(context);
    this.audit = new AuditManager(context);
    this.analytics = new GovernanceAnalytics(context);
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

  get governanceManager() { return this.governance; }
  get roleManager() { return this.roles; }
  get workflowManager() { return this.workflows; }
  get moderationManager() { return this.moderation; }
  get auditManager() { return this.audit; }
  get analyticsManager() { return this.analytics; }

  _setupEventListeners() {
    const bus = this.context.eventBus;
    if (!bus) return;
    this._listeners = {
      onPlaceSubmitted: (data) => this._handlePlaceSubmitted(data),
      onObservationCreated: (data) => this._handleObservationCreated(data),
      onBusinessRegistered: (data) => this._handleBusinessRegistered(data),
      onContentReported: (data) => this._handleContentReported(data),
      onBadgeEarned: (data) => this._handleBadgeEarned(data)
    };
    bus.on('exploration.place.discovered', this._listeners.onPlaceSubmitted);
    bus.on('ecology.observation.created', this._listeners.onObservationCreated);
    bus.on('economy.partner.registered', this._listeners.onBusinessRegistered);
    bus.on('community.content.reported', this._listeners.onContentReported);
    bus.on('engagement.badge.earned', this._listeners.onBadgeEarned);
  }

  _removeEventListeners() {
    const bus = this.context.eventBus;
    if (!bus || !this._listeners) return;
    bus.off('exploration.place.discovered', this._listeners.onPlaceSubmitted);
    bus.off('ecology.observation.created', this._listeners.onObservationCreated);
    bus.off('economy.partner.registered', this._listeners.onBusinessRegistered);
    bus.off('community.content.reported', this._listeners.onContentReported);
    bus.off('engagement.badge.earned', this._listeners.onBadgeEarned);
  }

  async _handlePlaceSubmitted(data) {
    if (data.placeId) {
      await this.workflows.startWorkflow('content_approval', data.placeId, 'place', data.submittedBy || 'system');
      await this.analytics.incrementCounter('destination:' + (data.destinationId || 'default') + ':places_submitted');
    }
  }

  async _handleObservationCreated(data) {
    if (data.observationId) {
      await this.workflows.startWorkflow('ecological_validation', data.observationId, 'observation', data.observerId || 'system');
      await this.audit.recordAudit(data.observerId || 'system', 'observation_submitted', 'observation', data.observationId);
    }
  }

  async _handleBusinessRegistered(data) {
    if (data.businessId) {
      await this.workflows.startWorkflow('business_verification', data.businessId, 'business', data.ownerId || 'system');
      await this.analytics.incrementCounter('platform:businesses_registered');
    }
  }

  async _handleContentReported(data) {
    if (data.contentId) {
      await this.moderation.reportContent(data.contentType, data.contentId, data.reportedBy, data.reason);
    }
  }

  async _handleBadgeEarned(data) {
    if (data.visitorId && data.badgeType) {
      await this.audit.recordBadgeAwarded(data.visitorId, data.badgeType, 'system');
    }
  }
}
