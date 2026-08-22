/**
 * Capability Validator
 *
 * P15.8.2 - Capability Registry & Composition Architecture
 *
 * Validates capability configurations and compositions.
 * Framework-free implementation.
 */

import {
  validateCapability,
  validateCapabilityName,
  COMPATIBLE_APPLICATION_TYPES
} from './capability.schema.js'

export class CapabilityValidator {
  #registry

  constructor(registry) {
    this.#registry = registry
  }

  validateCapabilityConfig(config) {
    if (!config || typeof config !== 'object') {
      return { valid: false, errors: ['Capability config must be an object'] }
    }

    const errors = []

    if (config.name) {
      const nameResult = validateCapabilityName(config.name)
      if (!nameResult.valid) {
        errors.push(nameResult.error)
      }
    }

    if (config.enabled !== undefined && typeof config.enabled !== 'boolean') {
      errors.push('Capability enabled must be a boolean')
    }

    if (config.configuration) {
      if (typeof config.configuration !== 'object') {
        errors.push('Capability configuration must be an object')
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  validateCapabilityList(capabilityNames, applicationType) {
    if (!Array.isArray(capabilityNames)) {
      return { valid: false, errors: ['Capability list must be an array'] }
    }

    const errors = []
    const seen = new Set()

    for (const name of capabilityNames) {
      if (typeof name !== 'string') {
        errors.push(`Capability name must be a string: ${name}`)
        continue
      }

      if (seen.has(name)) {
        errors.push(`Duplicate capability: ${name}`)
        seen.add(name)
        continue
      }
      seen.add(name)

      const result = this.#registry.validate(name)
      if (!result.valid) {
        errors.push(result.error)
      }
    }

    if (applicationType) {
      for (const name of capabilityNames) {
        const capability = this.#registry.get(name)
        if (capability && !capability.compatibleApplicationTypes.includes(applicationType)) {
          errors.push(`Capability "${name}" is not compatible with application type "${applicationType}"`)
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  validateDependencyGraph(capabilityNames) {
    const errors = []
    const resolved = new Set()
    const visiting = new Set()

    const resolveDeps = (name, path = []) => {
      if (resolved.has(name)) {
        return
      }

      if (visiting.has(name)) {
        errors.push(`Circular dependency detected: ${[...path, name].join(' -> ')}`)
        return
      }

      const capability = this.#registry.get(name)
      if (!capability) {
        errors.push(`Unknown capability in dependency chain: ${name}`)
        return
      }

      visiting.add(name)

      for (const dep of capability.dependencies) {
        resolveDeps(dep, [...path, name])
      }

      for (const dep of capability.optionalDependencies) {
        if (capabilityNames.includes(dep)) {
          resolveDeps(dep, [...path, name])
        }
      }

      visiting.delete(name)
      resolved.add(name)
    }

    for (const name of capabilityNames) {
      resolveDeps(name)
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  validateApplicationType(type) {
    if (!type || typeof type !== 'string') {
      return { valid: false, error: 'Application type must be a string' }
    }
    if (!COMPATIBLE_APPLICATION_TYPES.includes(type)) {
      return { valid: false, error: `Invalid application type: ${type}` }
    }
    return { valid: true, type }
  }
}

export function createCapabilityValidator(registry) {
  return new CapabilityValidator(registry)
}

export default {
  CapabilityValidator,
  createCapabilityValidator
}