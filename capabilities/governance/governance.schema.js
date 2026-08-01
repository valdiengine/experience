export const GOVERNANCE_ROLES = Object.freeze({
  PLATFORM_ADMIN: 'platform_admin',
  DESTINATION_MANAGER: 'destination_manager',
  LOCALITY_MANAGER: 'locality_manager',
  PARTNER_MANAGER: 'partner_manager',
  ECOLOGICAL_VALIDATOR: 'ecological_validator',
  COMMUNITY_LEADER: 'community_leader',
  VISITOR: 'visitor'
});

export const WORKFLOW_STATE = Object.freeze({
  PENDING: 'pending',
  IN_REVIEW: 'in_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  REVISION_NEEDED: 'revision_needed'
});

export const WORKFLOW_TYPE = Object.freeze({
  CONTENT_APPROVAL: 'content_approval',
  ECOLOGICAL_VALIDATION: 'ecological_validation',
  BUSINESS_VERIFICATION: 'business_verification',
  CAMPAIGN_APPROVAL: 'campaign_approval',
  MODERATION_DECISION: 'moderation_decision'
});

export const MODERATION_LEVEL = Object.freeze({
  AI_FILTER: 'ai_filter',
  COMMUNITY: 'community',
  MANAGER_REVIEW: 'manager_review',
  ADMIN_DECISION: 'admin_decision'
});

export const MODERATION_ACTION = Object.freeze({
  APPROVE: 'approve',
  REJECT: 'reject',
  FLAG: 'flag',
  REQUEST_REVISION: 'request_revision',
  SUSPEND: 'suspend',
  BAN: 'ban'
});

export const CONTENT_TYPE = Object.freeze({
  MEMORY: 'memory',
  REVIEW: 'review',
  PHOTO: 'photo',
  OBSERVATION: 'observation',
  BUSINESS: 'business',
  EXPERIENCE: 'experience',
  COMMUNITY_POST: 'community_post',
  PLACE: 'place'
});

export const HEALTH_LEVEL = Object.freeze({
  CRITICAL: 'critical',
  NEEDS_ATTENTION: 'needs_attention',
  HEALTHY: 'healthy',
  THRIVING: 'thriving'
});

export const GOVERNANCE_SCOPE = Object.freeze({
  PLATFORM: 'platform',
  DESTINATION: 'destination',
  LOCALITY: 'locality',
  PARTNER: 'partner',
  SCIENTIFIC: 'scientific',
  COMMUNITY: 'community',
  VISITOR: 'visitor'
});

export const AUDIT_ACTION = Object.freeze({
  BUSINESS_APPROVED: 'business_approved',
  SPECIES_VALIDATED: 'species_validated',
  PLACE_EDITED: 'place_edited',
  BADGE_AWARDED: 'badge_awarded',
  REPUTATION_CHANGED: 'reputation_changed',
  MODERATION_ACTION: 'moderation_action',
  WORKFLOW_STATE_CHANGED: 'workflow_state_changed',
  PERMISSION_CHANGED: 'permission_changed'
});

export const ROLE_PERMISSIONS = Object.freeze({
  [GOVERNANCE_ROLES.PLATFORM_ADMIN]: [
    'destination:create', 'destination:edit', 'destination:delete',
    'capability:configure', 'policy:manage', 'analytics:access_all',
    'override:emergency'
  ],
  [GOVERNANCE_ROLES.DESTINATION_MANAGER]: [
    'destination:edit', 'place:approve', 'locality:assign_manager',
    'analytics:view_destination', 'campaign:create', 'partner:manage'
  ],
  [GOVERNANCE_ROLES.LOCALITY_MANAGER]: [
    'locality:edit', 'place:approve_local', 'event:create',
    'business:validate_local', 'analytics:view_locality'
  ],
  [GOVERNANCE_ROLES.PARTNER_MANAGER]: [
    'business:edit', 'experience:create', 'experience:edit',
    'availability:manage', 'analytics:view_business',
    'review:respond', 'team:manage'
  ],
  [GOVERNANCE_ROLES.ECOLOGICAL_VALIDATOR]: [
    'observation:validate', 'species:edit', 'habitat:approve',
    'analytics:view_ecology', 'conservation:manage'
  ],
  [GOVERNANCE_ROLES.COMMUNITY_LEADER]: [
    'event:create', 'mission:create', 'content:moderate',
    'analytics:view_community', 'contributor:recognize'
  ],
  [GOVERNANCE_ROLES.VISITOR]: [
    'memory:create', 'observation:submit', 'challenge:participate',
    'ecotokens:spend', 'reputation:build'
  ]
});

export const GOVERNANCE_ENTITY = Object.freeze({
  id: 'string',
  scope: 'string',
  parentId: 'string',
  name: 'string',
  config: 'object',
  healthScore: 'number',
  createdAt: 'date',
  updatedAt: 'date'
});

export const WORKFLOW_INSTANCE = Object.freeze({
  id: 'string',
  type: 'string',
  entityId: 'string',
  entityType: 'string',
  state: 'string',
  steps: 'array',
  currentStep: 'number',
  createdBy: 'string',
  createdAt: 'date',
  updatedAt: 'date'
});

export const AUDIT_EVENT = Object.freeze({
  id: 'string',
  actorId: 'string',
  action: 'string',
  entityType: 'string',
  entityId: 'string',
  timestamp: 'date',
  previousValue: 'object',
  newValue: 'object',
  reason: 'string'
});

export const MODERATION_CASE = Object.freeze({
  id: 'string',
  contentType: 'string',
  contentId: 'string',
  reportedBy: 'string',
  reason: 'string',
  level: 'string',
  status: 'string',
  decision: 'string',
  decidedBy: 'string',
  createdAt: 'date',
  resolvedAt: 'date'
});
