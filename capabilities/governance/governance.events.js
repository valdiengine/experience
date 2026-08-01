export const GOVERNANCE_EVENTS = Object.freeze({
  DESTINATION_CREATED: 'governance.destination.created',
  DESTINATION_APPROVED: 'governance.destination.approved',
  DESTINATION_UPDATED: 'governance.destination.updated',
  DESTINATION_SUSPENDED: 'governance.destination.suspended',

  LOCALITY_CREATED: 'governance.locality.created',
  LOCALITY_MANAGER_ASSIGNED: 'governance.locality.manager.assigned',
  LOCALITY_MANAGER_REMOVED: 'governance.locality.manager.removed',
  LOCALITY_UPDATED: 'governance.locality.updated',

  PLACE_SUBMITTED: 'governance.place.submitted',
  PLACE_APPROVED: 'governance.place.approved',
  PLACE_REJECTED: 'governance.place.rejected',
  EXPERIENCE_SUBMITTED: 'governance.experience.submitted',
  EXPERIENCE_APPROVED: 'governance.experience.approved',

  BUSINESS_REGISTERED: 'governance.business.registered',
  BUSINESS_VERIFIED: 'governance.business.verified',
  BUSINESS_SUSPENDED: 'governance.business.suspended',
  PARTNER_CERTIFIED: 'governance.partner.certified',
  PARTNER_LEVEL_CHANGED: 'governance.partner.level.changed',

  OBSERVATION_SUBMITTED: 'governance.observation.submitted',
  OBSERVATION_VALIDATED: 'governance.observation.validated',
  OBSERVATION_REJECTED: 'governance.observation.rejected',
  SCIENTIFIC_RECORD_APPROVED: 'governance.scientific.record.approved',

  CONTENT_FLAGGED: 'governance.content.flagged',
  MODERATION_COMPLETED: 'governance.moderation.completed',
  MODERATION_ESCALATED: 'governance.moderation.escalated',
  ACCOUNT_SUSPENDED: 'governance.account.suspended',
  ACCOUNT_BANNED: 'governance.account.banned',

  AUDIT_CREATED: 'governance.audit.created',
  PERMISSION_CHANGED: 'governance.permission.changed',
  WORKFLOW_STATE_CHANGED: 'governance.workflow.state.changed',
  REPUTATION_CHANGED: 'governance.reputation.changed',
  BADGE_AWARDED: 'governance.badge.awarded',

  HEALTH_CALCULATED: 'governance.health.calculated',
  HEALTH_REPORTED: 'governance.health.reported'
});

export function createGovernanceEvent(type, data) {
  return {
    type,
    data,
    timestamp: new Date().toISOString(),
    source: 'governance-capability'
  };
}
