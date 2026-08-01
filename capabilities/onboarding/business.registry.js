/**
 * Business Registry — Central registry for business types and capabilities
 *
 * Business-agnostic: registers types, not business logic
 * Uses DataManager for persistence
 */
import { BUSINESS_TYPE_DEFINITIONS, getCapabilitiesForType, getDefaultPlanForType, isValidBusinessType } from './business.types.js'
import { getCapabilitiesForPlan, isValidPlan } from './plans.js'

export class BusinessRegistry {
  #context = null
  #customTypes = new Map()

  constructor(context) {
    this.#context = context
  }

  /**
   * Register a custom business type
   * @param {string} typeId - Unique type ID
   * @param {object} definition - { name, description, examples, capabilities, defaultPlan }
   * @returns {{ success: boolean, error?: string }}
   */
  registerType(typeId, definition) {
    if (BUSINESS_TYPE_DEFINITIONS[typeId]) {
      return { success: false, error: 'Type already exists in built-in definitions' }
    }

    if (this.#customTypes.has(typeId)) {
      return { success: false, error: 'Type already registered' }
    }

    if (!definition?.name || !definition?.capabilities) {
      return { success: false, error: 'Missing required fields: name, capabilities' }
    }

    this.#customTypes.set(typeId, {
      id: typeId,
      name: definition.name,
      description: definition.description || '',
      examples: definition.examples || [],
      capabilities: definition.capabilities || [],
      defaultPlan: definition.defaultPlan || 'free',
    })

    return { success: true }
  }

  /**
   * Get business type definition
   * @param {string} typeId
   * @returns {object|null}
   */
  getType(typeId) {
    if (BUSINESS_TYPE_DEFINITIONS[typeId]) {
      return BUSINESS_TYPE_DEFINITIONS[typeId]
    }
    return this.#customTypes.get(typeId) || null
  }

  /**
   * Get capabilities for a business type
   * @param {string} typeId
   * @returns {string[]}
   */
  getCapabilities(typeId) {
    if (BUSINESS_TYPE_DEFINITIONS[typeId]) {
      return getCapabilitiesForType(typeId)
    }
    const custom = this.#customTypes.get(typeId)
    return custom?.capabilities || []
  }

  /**
   * Get default plan for a business type
   * @param {string} typeId
   * @returns {string}
   */
  getDefaultPlan(typeId) {
    if (BUSINESS_TYPE_DEFINITIONS[typeId]) {
      return getDefaultPlanForType(typeId)
    }
    const custom = this.#customTypes.get(typeId)
    return custom?.defaultPlan || 'free'
  }

  /**
   * Get effective capabilities for a type + plan combination
   * @param {string} typeId
   * @param {string} planId
   * @returns {string[]}
   */
  getEffectiveCapabilities(typeId, planId) {
    const typeCapabilities = this.getCapabilities(typeId)
    const planCapabilities = getCapabilitiesForPlan(planId)

    return typeCapabilities.filter(cap => planCapabilities.includes(cap))
  }

  /**
   * Check if business type exists
   * @param {string} typeId
   * @returns {boolean}
   */
  isValidType(typeId) {
    return isValidBusinessType(typeId) || this.#customTypes.has(typeId)
  }

  /**
   * Get all business types (built-in + custom)
   * @returns {object[]}
   */
  getAllTypes() {
    const builtIn = Object.values(BUSINESS_TYPE_DEFINITIONS)
    const custom = Array.from(this.#customTypes.values())
    return [...builtIn, ...custom]
  }

  /**
   * Generate tenant configuration for a business
   * @param {object} businessData - { name, type, plan, id }
   * @returns {object}
   */
  generateTenantConfig(businessData) {
    const typeId = businessData.type
    const planId = businessData.plan || this.getDefaultPlan(typeId)
    const capabilities = this.getEffectiveCapabilities(typeId, planId)

    return {
      id: businessData.id || this.#generateId(businessData.name),
      name: businessData.name,
      type: typeId,
      plan: planId,
      capabilities,
      config: {},
      createdAt: new Date().toISOString(),
      status: 'active',
    }
  }

  /**
   * Generate a slug-style ID from a name
   * @private
   */
  #generateId(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }
}
