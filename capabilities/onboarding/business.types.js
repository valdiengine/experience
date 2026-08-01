/**
 * Business Types — Supported business models and their default capabilities
 *
 * Business-agnostic: defines types and capabilities, no business logic
 * Each type maps to a set of default capabilities
 */

export const BUSINESS_TYPES = {
  ACCOMMODATION: 'accommodation',
  TOURISM: 'tourism',
  RESTAURANT: 'restaurant',
  SERVICE: 'service',
  DIRECTORY: 'directory',
}

export const BUSINESS_TYPE_DEFINITIONS = {
  [BUSINESS_TYPES.ACCOMMODATION]: {
    id: BUSINESS_TYPES.ACCOMMODATION,
    name: 'Accommodation',
    description: 'Hotels, cabins, hostels, lodges, vacation rentals',
    examples: ['cabins', 'hotels', 'hostels', 'lodges', 'vacation rentals'],
    capabilities: [
      'cms',
      'booking',
      'availability',
      'reservation',
      'communication',
      'notifications',
      'pwa',
      'intelligence',
    ],
    defaultPlan: 'saas',
  },

  [BUSINESS_TYPES.TOURISM]: {
    id: BUSINESS_TYPES.TOURISM,
    name: 'Tourism',
    description: 'Tours, excursions, activities, experiences',
    examples: ['tours', 'excursions', 'activities', 'adventure tours'],
    capabilities: [
      'cms',
      'booking',
      'availability',
      'reservation',
      'communication',
      'notifications',
      'pwa',
      'intelligence',
    ],
    defaultPlan: 'saas',
  },

  [BUSINESS_TYPES.RESTAURANT]: {
    id: BUSINESS_TYPES.RESTAURANT,
    name: 'Restaurant',
    description: 'Restaurants, cafes, food services',
    examples: ['restaurants', 'cafes', 'food trucks', 'catering'],
    capabilities: [
      'cms',
      'booking',
      'availability',
      'communication',
      'notifications',
      'pwa',
    ],
    defaultPlan: 'business',
  },

  [BUSINESS_TYPES.SERVICE]: {
    id: BUSINESS_TYPES.SERVICE,
    name: 'Service',
    description: 'Professional services, technicians, consultants',
    examples: ['electricians', 'mechanics', 'plumbers', 'consultants'],
    capabilities: [
      'cms',
      'communication',
      'pwa',
    ],
    defaultPlan: 'business',
  },

  [BUSINESS_TYPES.DIRECTORY]: {
    id: BUSINESS_TYPES.DIRECTORY,
    name: 'Directory',
    description: 'Basic company presence and information',
    examples: ['local businesses', 'company profiles'],
    capabilities: [
      'cms',
      'pwa',
    ],
    defaultPlan: 'free',
  },
}

/**
 * Get business type definition
 * @param {string} type - Business type ID
 * @returns {object|null}
 */
export function getBusinessType(type) {
  return BUSINESS_TYPE_DEFINITIONS[type] || null
}

/**
 * Get default capabilities for a business type
 * @param {string} type - Business type ID
 * @returns {string[]}
 */
export function getCapabilitiesForType(type) {
  const definition = getBusinessType(type)
  return definition?.capabilities || []
}

/**
 * Get default plan for a business type
 * @param {string} type - Business type ID
 * @returns {string}
 */
export function getDefaultPlanForType(type) {
  const definition = getBusinessType(type)
  return definition?.defaultPlan || 'free'
}

/**
 * Get all business types
 * @returns {object[]}
 */
export function getAllBusinessTypes() {
  return Object.values(BUSINESS_TYPE_DEFINITIONS)
}

/**
 * Check if business type exists
 * @param {string} type
 * @returns {boolean}
 */
export function isValidBusinessType(type) {
  return BUSINESS_TYPE_DEFINITIONS[type] !== undefined
}
