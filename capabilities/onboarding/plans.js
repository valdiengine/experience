/**
 * SaaS Plans — Plan definitions and capability mappings
 *
 * Business-agnostic: plans only describe enabled capabilities
 * No payment integration yet
 */

export const PLAN_TYPES = {
  FREE: 'free',
  BUSINESS: 'business',
  SAAS: 'saas',
}

export const PLAN_DEFINITIONS = {
  [PLAN_TYPES.FREE]: {
    id: PLAN_TYPES.FREE,
    name: 'Free',
    description: 'Basic directory presence',
    capabilities: [
      'cms',
      'pwa',
    ],
    limits: {
      maxResources: 5,
      maxBookings: 0,
      maxNotifications: 0,
      maxUsers: 1,
    },
  },

  [PLAN_TYPES.BUSINESS]: {
    id: PLAN_TYPES.BUSINESS,
    name: 'Business',
    description: 'Professional digital presence',
    capabilities: [
      'cms',
      'communication',
      'pwa',
    ],
    limits: {
      maxResources: 50,
      maxBookings: 100,
      maxNotifications: 500,
      maxUsers: 5,
    },
  },

  [PLAN_TYPES.SAAS]: {
    id: PLAN_TYPES.SAAS,
    name: 'SaaS',
    description: 'Complete operational platform',
    capabilities: [
      'cms',
      'booking',
      'availability',
      'reservation',
      'communication',
      'notifications',
      'pwa',
      'intelligence',
      'observability',
    ],
    limits: {
      maxResources: -1,
      maxBookings: -1,
      maxNotifications: -1,
      maxUsers: -1,
    },
  },
}

/**
 * Get plan definition
 * @param {string} planId - Plan ID
 * @returns {object|null}
 */
export function getPlan(planId) {
  return PLAN_DEFINITIONS[planId] || null
}

/**
 * Get capabilities for a plan
 * @param {string} planId - Plan ID
 * @returns {string[]}
 */
export function getCapabilitiesForPlan(planId) {
  const plan = getPlan(planId)
  return plan?.capabilities || []
}

/**
 * Get plan limits
 * @param {string} planId - Plan ID
 * @returns {object|null}
 */
export function getPlanLimits(planId) {
  const plan = getPlan(planId)
  return plan?.limits || null
}

/**
 * Check if plan includes a capability
 * @param {string} planId - Plan ID
 * @param {string} capabilityId - Capability ID
 * @returns {boolean}
 */
export function planIncludesCapability(planId, capabilityId) {
  const capabilities = getCapabilitiesForPlan(planId)
  return capabilities.includes(capabilityId)
}

/**
 * Get all plans
 * @returns {object[]}
 */
export function getAllPlans() {
  return Object.values(PLAN_DEFINITIONS)
}

/**
 * Check if plan exists
 * @param {string} planId
 * @returns {boolean}
 */
export function isValidPlan(planId) {
  return PLAN_DEFINITIONS[planId] !== undefined
}
