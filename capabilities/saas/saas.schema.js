/**
 * SaaS Schema — Product, Plan, Subscription, Entitlement, Feature, Limits
 *
 * Business-agnostic: defines commercial structures for any tenant type
 */

export const PRODUCT_CATEGORIES = {
  DIGITAL_PRESENCE: 'digital_presence',
  WEB_APPLICATION: 'web_application',
  SAAS_PLATFORM: 'saas_platform',
  ECOSYSTEM_PARTNER: 'ecosystem_partner',
}

export const SUBSCRIPTION_STATUSES = {
  PENDING: 'pending',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
}

export const LIMIT_TYPES = {
  COUNT: 'count',
  UNLIMITED: 'unlimited',
  NONE: 'none',
}

export const PRODUCT_SCHEMA = {
  id: null,
  category: null,
  name: null,
  description: null,
  capabilities: [],
  features: [],
  defaultPlan: null,
}

export const PLAN_SCHEMA = {
  id: null,
  name: null,
  category: null,
  description: null,
  features: [],
  capabilities: [],
  limits: {},
  recommendedUpgrade: null,
  price: null,
  billing: null,
}

export const SUBSCRIPTION_SCHEMA = {
  tenantId: null,
  productId: null,
  planId: null,
  status: SUBSCRIPTION_STATUSES.ACTIVE,
  startedAt: null,
  expiresAt: null,
  metadata: {},
}

export const ENTITLEMENT_SCHEMA = {
  tenantId: null,
  capabilities: {},
  features: {},
  limits: {},
}

export const LIMIT_SCHEMA = {
  resource: null,
  type: LIMIT_TYPES.COUNT,
  max: 0,
  used: 0,
  period: null,
}

export const FEATURE_FLAGS = {
  BOOKING: 'booking.enabled',
  RESERVATION: 'reservation.enabled',
  NOTIFICATIONS: 'notifications.enabled',
  PWA: 'pwa.enabled',
  SEO_INTELLIGENCE: 'seo.intelligence.enabled',
  OWNER_PORTAL: 'owner.portal.enabled',
  AUTOMATION: 'automation.enabled',
  ANALYTICS: 'analytics.enabled',
  ENGAGEMENT: 'engagement.enabled',
  CONVERSION: 'conversion.enabled',
  INTELLIGENCE: 'intelligence.enabled',
  SCHEDULER: 'scheduler.enabled',
  OBSERVABILITY: 'observability.enabled',
  CMS: 'cms.enabled',
  PUBLIC: 'public.enabled',
  COMMUNICATION: 'communication.enabled',
  AVAILABILITY: 'availability.enabled',
}

export function validateProduct(data) {
  const errors = []
  if (!data?.id) errors.push('Product id is required')
  if (!data?.name) errors.push('Product name is required')
  if (!data?.category) errors.push('Product category is required')
  if (!PRODUCT_CATEGORIES[data?.category?.toUpperCase()?.replace(/ /g, '_')]) {
    errors.push(`Invalid product category: ${data?.category}`)
  }
  return { valid: errors.length === 0, errors }
}

export function validatePlan(data) {
  const errors = []
  if (!data?.id) errors.push('Plan id is required')
  if (!data?.name) errors.push('Plan name is required')
  if (!data?.category) errors.push('Plan category is required')
  return { valid: errors.length === 0, errors }
}

export function validateSubscription(data) {
  const errors = []
  if (!data?.tenantId) errors.push('Tenant ID is required')
  if (!data?.productId) errors.push('Product ID is required')
  if (!data?.planId) errors.push('Plan ID is required')
  if (data?.status && !Object.values(SUBSCRIPTION_STATUSES).includes(data.status)) {
    errors.push(`Invalid subscription status: ${data.status}`)
  }
  return { valid: errors.length === 0, errors }
}
