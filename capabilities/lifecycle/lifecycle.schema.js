/**
 * Lifecycle Schema — Customer, Segment, Trial, Health
 *
 * Business-agnostic: customer lifecycle data structures
 */

export const CUSTOMER_STATUSES = {
  NEW: 'new',
  ACTIVE: 'active',
  TRIAL: 'trial',
  INACTIVE: 'inactive',
  CHURNED: 'churned',
  RECOVERED: 'recovered',
}

export const CUSTOMER_SEGMENTS = {
  NEW_CUSTOMER: 'new_customer',
  ACTIVE_FREE: 'active_free',
  GROWING_BUSINESS: 'growing_business',
  PREMIUM_CUSTOMER: 'premium_customer',
  INACTIVE_CUSTOMER: 'inactive_customer',
  CHURN_RISK: 'churn_risk',
  TRIAL_ACTIVE: 'trial_active',
  TRIAL_CONVERTED: 'trial_converted',
  ECOSYSTEM_PARTNER: 'ecosystem_partner',
}

export const TRIAL_STATUSES = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
  CONVERTED: 'converted',
  CANCELLED: 'cancelled',
}

export const HEALTH_RISK_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
}

export const CUSTOMER_LIFECYCLE_SCHEMA = {
  tenantId: null,
  businessId: null,
  plan: null,
  status: CUSTOMER_STATUSES.NEW,
  segment: CUSTOMER_SEGMENTS.NEW_CUSTOMER,
  createdAt: null,
  activatedAt: null,
  lastActivity: null,
  healthScore: 0,
  metadata: {},
}

export const CUSTOMER_SEGMENT_SCHEMA = {
  tenantId: null,
  segment: null,
  score: 0,
  factors: [],
  lastEvaluated: null,
}

export const TRIAL_SCHEMA = {
  tenantId: null,
  planId: null,
  startDate: null,
  endDate: null,
  status: TRIAL_STATUSES.ACTIVE,
  convertedAt: null,
  metadata: {},
}

export const HEALTH_SCHEMA = {
  tenantId: null,
  usageScore: 0,
  engagementScore: 0,
  revenueScore: 0,
  supportScore: 0,
  overallScore: 0,
  riskLevel: HEALTH_RISK_LEVELS.LOW,
  factors: [],
  lastCalculated: null,
}

export const ACTIVATION_STEPS = {
  accommodation: [
    { id: 'registered', name: 'Business registered', weight: 10 },
    { id: 'profile_complete', name: 'Profile completed', weight: 15 },
    { id: 'photos_uploaded', name: 'Photos uploaded', weight: 15 },
    { id: 'availability_configured', name: 'Availability configured', weight: 20 },
    { id: 'reservation_activated', name: 'Reservation activated', weight: 20 },
    { id: 'pwa_installed', name: 'PWA installed', weight: 10 },
    { id: 'first_reservation', name: 'First reservation received', weight: 10 },
  ],
  tourism: [
    { id: 'registered', name: 'Business registered', weight: 15 },
    { id: 'profile_complete', name: 'Profile completed', weight: 20 },
    { id: 'services_added', name: 'Services added', weight: 25 },
    { id: 'contact_enabled', name: 'Contact channels enabled', weight: 20 },
    { id: 'first_booking', name: 'First booking received', weight: 20 },
  ],
  restaurant: [
    { id: 'registered', name: 'Business registered', weight: 15 },
    { id: 'profile_complete', name: 'Profile completed', weight: 20 },
    { id: 'menu_uploaded', name: 'Menu uploaded', weight: 25 },
    { id: 'hours_configured', name: 'Hours configured', weight: 20 },
    { id: 'first_order', name: 'First order received', weight: 20 },
  ],
  service: [
    { id: 'registered', name: 'Business registered', weight: 20 },
    { id: 'profile_complete', name: 'Profile completed', weight: 25 },
    { id: 'services_defined', name: 'Services defined', weight: 25 },
    { id: 'contact_enabled', name: 'Contact channels enabled', weight: 15 },
    { id: 'first_inquiry', name: 'First inquiry received', weight: 15 },
  ],
}

export function validateCustomer(data) {
  const errors = []
  if (!data?.tenantId) errors.push('Tenant ID is required')
  if (!data?.businessId) errors.push('Business ID is required')
  return { valid: errors.length === 0, errors }
}

export function validateTrial(data) {
  const errors = []
  if (!data?.tenantId) errors.push('Tenant ID is required')
  if (!data?.planId) errors.push('Plan ID is required')
  if (!data?.startDate) errors.push('Start date is required')
  if (!data?.endDate) errors.push('End date is required')
  return { valid: errors.length === 0, errors }
}
