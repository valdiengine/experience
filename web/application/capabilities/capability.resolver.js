/**
 * Capability Resolver
 *
 * P15.8.2 - Capability Registry & Composition Architecture
 *
 * Resolves capabilities for an Application Instance.
 * Framework-free implementation.
 */

import { CapabilityValidator } from './capability.validator.js'
import { DependencyResolver } from './dependency.resolver.js'

export class CapabilityResolver {
  #registry
  #validator
  #dependencyResolver

  constructor(registry) {
    this.#registry = registry
    this.#validator = new CapabilityValidator(registry)
    this.#dependencyResolver = new DependencyResolver(registry, this.#validator)
  }

  getRegistry() {
    return this.#registry
  }

  getValidator() {
    return this.#validator
  }

  getDependencyResolver() {
    return this.#dependencyResolver
  }

  listAvailable() {
    return this.#registry.list()
  }

  listByType(type) {
    return this.#registry.listByType(type)
  }

  listByApplicationType(appType) {
    return this.#registry.listByApplicationType(appType)
  }

  validateCapabilities(capabilityNames, applicationType = null) {
    const listValidation = this.#validator.validateCapabilityList(capabilityNames, applicationType)
    if (!listValidation.valid) {
      return {
        valid: false,
        errors: listValidation.errors,
        phase: 'list-validation'
      }
    }

    const graphValidation = this.#validator.validateDependencyGraph(capabilityNames)
    if (!graphValidation.valid) {
      return {
        valid: false,
        errors: graphValidation.errors,
        phase: 'dependency-graph'
      }
    }

    return {
      valid: true,
      errors: []
    }
  }

  resolveForApplication(capabilityNames, applicationType) {
    const validation = this.validateCapabilities(capabilityNames, applicationType)
    if (!validation.valid) {
      return {
        success: false,
        errors: validation.errors,
        capabilities: []
      }
    }

    const result = this.#dependencyResolver.resolveForApplicationType(applicationType, capabilityNames)

    return {
      success: result.isValid,
      errors: [...result.missing, ...result.circular],
      capabilities: result.resolved
    }
  }

  resolveAllDependencies(capabilityNames) {
    const result = this.#dependencyResolver.resolve(capabilityNames, {
      includeOptional: true,
      failOnMissing: true,
      failOnCircular: true
    })

    return {
      success: result.isValid,
      errors: [...result.missing, ...result.circular],
      capabilities: result.resolved
    }
  }
}

export function createCapabilityResolver(registry) {
  return new CapabilityResolver(registry)
}

export default {
  CapabilityResolver,
  createCapabilityResolver
}