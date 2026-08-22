/**
 * Capability Schema
 *
 * P15.8.2 - Capability Registry & Composition Architecture
 *
 * Schema definitions for capability validation.
 * Framework-free implementation.
 */

export const COMPATIBLE_APPLICATION_TYPES = Object.freeze([
  'company-profile',
  'tourism-destination',
  'accommodation',
  'restaurant',
  'tour',
  'real-estate',
  'boat',
  'professional-service'
])

export function createCapabilitySchema(capability = {}) {
  return {
    name: capability.name || null,
    version: capability.version || '1.0.0',
    type: capability.type || 'presentation',
    dependencies: Array.isArray(capability.dependencies) ? capability.dependencies : [],
    optionalDependencies: Array.isArray(capability.optionalDependencies) ? capability.optionalDependencies : [],
    compatibleApplicationTypes: Array.isArray(capability.compatibleApplicationTypes)
      ? capability.compatibleApplicationTypes
      : [],
    configurationSchema: capability.configurationSchema || null,
    enabled: capability.enabled !== false,
    priority: typeof capability.priority === 'number' ? capability.priority : 0
  }
}

export function validateCapabilityName(name) {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Capability name must be a non-empty string' }
  }
  if (name.length < 1 || name.length > 100) {
    return { valid: false, error: 'Capability name must be 1-100 characters' }
  }
  if (!/^[a-z][a-z0-9-]*$/.test(name)) {
    return { valid: false, error: 'Capability name must start with lowercase letter and contain only lowercase letters, numbers, and hyphens' }
  }
  return { valid: true, name }
}

export function validateCapabilityVersion(version) {
  if (!version || typeof version !== 'string') {
    return { valid: false, error: 'Capability version must be a string' }
  }
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    return { valid: false, error: 'Capability version must be in semver format (x.y.z)' }
  }
  return { valid: true, version }
}

export function validateApplicationType(type) {
  if (!type || typeof type !== 'string') {
    return { valid: false, error: 'Application type must be a string' }
  }
  if (!COMPATIBLE_APPLICATION_TYPES.includes(type)) {
    return { valid: false, error: `Invalid application type: ${type}` }
  }
  return { valid: true, type }
}

export function validateCapability(capability) {
  if (!capability || typeof capability !== 'object') {
    return { valid: false, errors: ['Capability must be an object'] }
  }

  const errors = []

  const nameResult = validateCapabilityName(capability.name)
  if (!nameResult.valid) {
    errors.push(nameResult.error)
  }

  if (capability.version) {
    const versionResult = validateCapabilityVersion(capability.version)
    if (!versionResult.valid) {
      errors.push(versionResult.error)
    }
  }

  if (capability.type && typeof capability.type !== 'string') {
    errors.push('Capability type must be a string')
  }

  if (capability.dependencies) {
    if (!Array.isArray(capability.dependencies)) {
      errors.push('Capability dependencies must be an array')
    } else {
      for (const dep of capability.dependencies) {
        const depResult = validateCapabilityName(dep)
        if (!depResult.valid) {
          errors.push(`Invalid dependency: ${dep}`)
        }
      }
    }
  }

  if (capability.optionalDependencies) {
    if (!Array.isArray(capability.optionalDependencies)) {
      errors.push('Capability optionalDependencies must be an array')
    } else {
      for (const dep of capability.optionalDependencies) {
        const depResult = validateCapabilityName(dep)
        if (!depResult.valid) {
          errors.push(`Invalid optional dependency: ${dep}`)
        }
      }
    }
  }

  if (capability.compatibleApplicationTypes) {
    if (!Array.isArray(capability.compatibleApplicationTypes)) {
      errors.push('Capability compatibleApplicationTypes must be an array')
    } else {
      for (const type of capability.compatibleApplicationTypes) {
        const typeResult = validateApplicationType(type)
        if (!typeResult.valid) {
          errors.push(`Invalid application type: ${type}`)
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

export default {
  COMPATIBLE_APPLICATION_TYPES,
  createCapabilitySchema,
  validateCapabilityName,
  validateCapabilityVersion,
  validateApplicationType,
  validateCapability
}