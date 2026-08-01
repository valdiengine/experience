import { WORKFLOW_STATE, WORKFLOW_TYPE } from '../governance.schema.js';
import { GOVERNANCE_EVENTS, createGovernanceEvent } from '../governance.events.js';

export default class WorkflowManager {
  constructor(context) {
    this.context = context;
    this.workflows = new Map();
    this.templates = new Map();
    this._initDefaultTemplates();
  }

  _initDefaultTemplates() {
    this.templates.set(WORKFLOW_TYPE.CONTENT_APPROVAL, {
      type: WORKFLOW_TYPE.CONTENT_APPROVAL,
      steps: ['auto_quality_check', 'pending_review', 'manager_review', 'publish']
    });
    this.templates.set(WORKFLOW_TYPE.ECOLOGICAL_VALIDATION, {
      type: WORKFLOW_TYPE.ECOLOGICAL_VALIDATION,
      steps: ['ai_analysis', 'community_validation', 'scientific_validation', 'official_record']
    });
    this.templates.set(WORKFLOW_TYPE.BUSINESS_VERIFICATION, {
      type: WORKFLOW_TYPE.BUSINESS_VERIFICATION,
      steps: ['identity_verification', 'documentation_review', 'destination_approval', 'partner_status']
    });
    this.templates.set(WORKFLOW_TYPE.CAMPAIGN_APPROVAL, {
      type: WORKFLOW_TYPE.CAMPAIGN_APPROVAL,
      steps: ['proposal_review', 'manager_approval', 'resource_allocation', 'launch']
    });
  }

  async startWorkflow(type, entityId, entityType, createdBy) {
    const template = this.templates.get(type);
    if (!template) return null;
    const id = 'wf-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    const workflow = {
      id, type, entityId, entityType,
      state: WORKFLOW_STATE.PENDING,
      steps: template.steps.map((step, i) => ({ name: step, state: i === 0 ? WORKFLOW_STATE.IN_REVIEW : WORKFLOW_STATE.PENDING })),
      currentStep: 0,
      createdBy, createdAt: new Date(), updatedAt: new Date()
    };
    this.workflows.set(id, workflow);
    this.context.eventBus?.emit(createGovernanceEvent(GOVERNANCE_EVENTS.WORKFLOW_STATE_CHANGED, { workflowId: id, state: WORKFLOW_STATE.PENDING, type }));
    return workflow;
  }

  async advanceWorkflow(workflowId, decision, decidedBy, notes = '') {
    const wf = this.workflows.get(workflowId);
    if (!wf) return null;
    const currentStep = wf.steps[wf.currentStep];
    if (!currentStep) return null;

    if (decision === 'approve') {
      currentStep.state = WORKFLOW_STATE.APPROVED;
      currentStep.decidedBy = decidedBy;
      currentStep.notes = notes;
      currentStep.decidedAt = new Date();
      if (wf.currentStep < wf.steps.length - 1) {
        wf.currentStep++;
        wf.steps[wf.currentStep].state = WORKFLOW_STATE.IN_REVIEW;
        wf.state = WORKFLOW_STATE.IN_REVIEW;
      } else {
        wf.state = WORKFLOW_STATE.APPROVED;
      }
    } else if (decision === 'reject') {
      currentStep.state = WORKFLOW_STATE.REJECTED;
      currentStep.decidedBy = decidedBy;
      currentStep.notes = notes;
      currentStep.decidedAt = new Date();
      wf.state = WORKFLOW_STATE.REJECTED;
    } else if (decision === 'revision') {
      currentStep.state = WORKFLOW_STATE.REVISION_NEEDED;
      currentStep.decidedBy = decidedBy;
      currentStep.notes = notes;
      currentStep.decidedAt = new Date();
      wf.state = WORKFLOW_STATE.REVISION_NEEDED;
    }

    wf.updatedAt = new Date();
    this.context.eventBus?.emit(createGovernanceEvent(GOVERNANCE_EVENTS.WORKFLOW_STATE_CHANGED, {
      workflowId, state: wf.state, step: currentStep.name, decision, decidedBy
    }));
    return wf;
  }

  getWorkflow(workflowId) {
    return this.workflows.get(workflowId) || null;
  }

  getWorkflowsByState(state) {
    return Array.from(this.workflows.values()).filter(w => w.state === state);
  }

  getWorkflowsByEntity(entityId) {
    return Array.from(this.workflows.values()).filter(w => w.entityId === entityId);
  }

  getPendingWorkflows() {
    return this.getWorkflowsByState(WORKFLOW_STATE.PENDING).concat(
      this.getWorkflowsByState(WORKFLOW_STATE.IN_REVIEW)
    );
  }

  addWorkflowTemplate(type, steps) {
    this.templates.set(type, { type, steps });
  }
}
