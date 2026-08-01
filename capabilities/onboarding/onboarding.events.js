/**
 * Onboarding Events — Event definitions for business onboarding
 */
export const ONBOARDING_EVENTS = {
  // Business events
  BUSINESS_REGISTERED: 'business:registered',
  BUSINESS_CREATED: 'business:created',
  BUSINESS_UPDATED: 'business:updated',
  BUSINESS_ACTIVATED: 'business:activated',

  // Tenant events
  TENANT_CREATED: 'tenant:created',
  TENANT_CONFIGURED: 'tenant:configured',

  // Plan events
  PLAN_ASSIGNED: 'plan:assigned',
  PLAN_CHANGED: 'plan:changed',

  // Capability events
  CAPABILITIES_ASSIGNED: 'capabilities:activated',
}

export const BUSINESS_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  INACTIVE: 'inactive',
}
