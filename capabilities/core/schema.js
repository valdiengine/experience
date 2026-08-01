/**
 * CapabilitySchema — Schema definition for capability contracts
 *
 * Defines the structure and validation for capability modules.
 * Does NOT know about specific capabilities or business logic.
 */

/**
 * Capability states
 */
export const CAPABILITY_STATES = {
  REGISTERED: 'registered',
  LOADED: 'loaded',
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ERROR: 'error',
}

/**
 * Default capability properties
 */
export const DEFAULT_CAPABILITY = {
  id: null,
  name: null,
  version: '1.0.0',
  dependencies: [],
  state: CAPABILITY_STATES.REGISTERED,
}

/**
 * Required fields for a valid capability
 */
export const REQUIRED_FIELDS = ['id', 'name']

/**
 * Validate capability definition
 * @param {object} capability - Capability definition
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateCapability(capability) {
  const errors = []

  if (!capability || typeof capability !== 'object') {
    return { valid: false, errors: ['Capability must be an object'] }
  }

  for (const field of REQUIRED_FIELDS) {
    if (!capability[field]) {
      errors.push(`Missing required field: ${field}`)
    }
  }

  if (capability.id && !/^[a-z0-9-]+$/.test(capability.id)) {
    errors.push('ID must contain only lowercase letters, numbers, and hyphens')
  }

  if (capability.version && !/^\d+\.\d+\.\d+$/.test(capability.version)) {
    errors.push('Version must follow semver format (x.y.z)')
  }

  if (capability.dependencies && !Array.isArray(capability.dependencies)) {
    errors.push('Dependencies must be an array')
  }

  if (capability.init && typeof capability.init !== 'function') {
    errors.push('init must be a function')
  }

  if (capability.activate && typeof capability.activate !== 'function') {
    errors.push('activate must be a function')
  }

  if (capability.deactivate && typeof capability.deactivate !== 'function') {
    errors.push('deactivate must be a function')
  }

  if (capability.destroy && typeof capability.destroy !== 'function') {
    errors.push('destroy must be a function')
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Create capability from definition
 * @param {object} definition - Capability definition
 * @returns {object} - Full capability with defaults
 */
export function createCapability(definition) {
  return {
    ...DEFAULT_CAPABILITY,
    ...definition,
    state: CAPABILITY_STATES.REGISTERED,
  }
}

/**
 * Create a data schema with validation
 *
 * Used by capabilities to define entity schemas (bookings, notifications, etc.)
 * Does NOT contain business logic — only structural validation.
 *
 * @param {object} definition - Schema definition
 * @param {string} definition.id - Schema identifier
 * @param {string} definition.name - Human-readable name
 * @param {string} [definition.description] - Schema description
 * @param {object} definition.fields - Field definitions keyed by field name
 * @returns {{ id: string, name: string, description: string, fields: object, validate: Function }}
 */
export function createSchema(definition) {
  const schema = {
    id: definition.id,
    name: definition.name,
    description: definition.description || '',
    fields: definition.fields || {},

    /**
     * Validate data against this schema
     * @param {object} data - Data to validate
     * @returns {{ valid: boolean, errors: string[] }}
     */
    validate(data) {
      const errors = []

      if (!data || typeof data !== 'object') {
        return { valid: false, errors: ['Data must be an object'] }
      }

      for (const [fieldName, rules] of Object.entries(schema.fields)) {
        const value = data[fieldName]
        const fieldPath = fieldName

        // Required check
        if (rules.required && (value === undefined || value === null)) {
          errors.push(`${fieldPath} is required`)
          continue
        }

        // Skip further checks if value is not present and not required
        if (value === undefined || value === null) continue

        // Type check
        if (rules.type) {
          const actualType = Array.isArray(value) ? 'array' : typeof value
          if (actualType !== rules.type) {
            errors.push(`${fieldPath} must be of type ${rules.type}, got ${actualType}`)
            continue
          }
        }

        // Enum check
        if (rules.values && !rules.values.includes(value)) {
          errors.push(`${fieldPath} must be one of: ${rules.values.join(', ')}`)
        }

        // Min check (numbers)
        if (rules.min !== undefined && typeof value === 'number' && value < rules.min) {
          errors.push(`${fieldPath} must be at least ${rules.min}`)
        }

        // Max check (numbers)
        if (rules.max !== undefined && typeof value === 'number' && value > rules.max) {
          errors.push(`${fieldPath} must be at most ${rules.max}`)
        }

        // Nested object validation
        if (rules.type === 'object' && rules.fields && typeof value === 'object') {
          for (const [nestedName, nestedRules] of Object.entries(rules.fields)) {
            const nestedValue = value[nestedName]
            const nestedPath = `${fieldPath}.${nestedName}`

            if (nestedRules.required && (nestedValue === undefined || nestedValue === null)) {
              errors.push(`${nestedPath} is required`)
              continue
            }

            if (nestedValue === undefined || nestedValue === null) continue

            if (nestedRules.type) {
              const actualType = Array.isArray(nestedValue) ? 'array' : typeof nestedValue
              if (actualType !== nestedRules.type) {
                errors.push(`${nestedPath} must be of type ${nestedRules.type}, got ${actualType}`)
              }
            }
          }
        }
      }

      return { valid: errors.length === 0, errors }
    },
  }

  return schema
}
