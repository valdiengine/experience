/**
 * Capability Composer
 *
 * P15.8.2 - Capability Registry & Composition Architecture
 *
 * Composes resolved capabilities for an Application Instance.
 * Produces immutable composition objects.
 * Framework-free implementation.
 */

import { createCapabilityResolver } from './capability.resolver.js'

export class CapabilityComposer {
  #registry
  #resolver

  constructor(registry) {
    this.#registry = registry
    this.#resolver = createCapabilityResolver(registry)
  }

  compose(applicationInstance, capabilityNames, options = {}) {
    if (!applicationInstance || typeof applicationInstance !== 'object') {
      throw new Error('Application Instance is required')
    }

    if (!Array.isArray(capabilityNames)) {
      throw new Error('Capability names must be an array')
    }

    const applicationType = options.applicationType || applicationInstance.experience?.type || null
    const skipValidation = options.skipValidation === true

    if (!skipValidation) {
      const validation = this.#resolver.validateCapabilities(capabilityNames, applicationType)
      if (!validation.valid) {
        return {
          success: false,
          errors: validation.errors,
          application: applicationInstance,
          capabilities: []
        }
      }
    }

    let resolved
    if (applicationType) {
      resolved = this.#resolver.resolveForApplication(capabilityNames, applicationType)
    } else {
      resolved = this.#resolver.resolveAllDependencies(capabilityNames)
    }

    if (!resolved.success) {
      return {
        success: false,
        errors: resolved.errors,
        application: applicationInstance,
        capabilities: []
      }
    }

    const sortedCapabilities = this.#sortByPriority(resolved.capabilities)
    const frozenCapabilities = Object.freeze(sortedCapabilities.map(cap => this.#freezeCapability(cap)))

    const composition = {
      application: this.#freezeApplication(applicationInstance),
      capabilities: frozenCapabilities,
      metadata: Object.freeze({
        applicationType,
        totalCapabilities: sortedCapabilities.length,
        resolvedAt: new Date().toISOString()
      })
    }

    return {
      success: true,
      errors: [],
      application: composition.application,
      capabilities: composition.capabilities,
      metadata: composition.metadata
    }
  }

  #freezeApplication(app) {
    if (!app) return null
    const frozen = {
      identity: app.identity ? Object.freeze({ ...app.identity }) : null,
      destination: app.destination ? Object.freeze({ ...app.destination }) : null,
      company: app.company ? Object.freeze({ ...app.company }) : null,
      experience: app.experience ? Object.freeze({ ...app.experience }) : null,
      migration: app.migration ? Object.freeze({ ...app.migration }) : null,
      content: app.content ? Object.freeze({ ...app.content }) : null,
      seo: app.seo ? Object.freeze({ ...app.seo }) : null,
      theme: app.theme ? Object.freeze({ ...app.theme }) : null,
      integrations: app.integrations ? Object.freeze({ ...app.integrations }) : null,
      capabilities: app.capabilities ? Object.freeze({ ...app.capabilities }) : null
    }
    return Object.freeze(frozen)
  }

  #freezeCapability(cap) {
    return Object.freeze({
      name: cap.name,
      version: cap.version,
      type: cap.type,
      dependencies: Object.freeze([...cap.dependencies]),
      optionalDependencies: Object.freeze([...cap.optionalDependencies]),
      priority: cap.priority,
      configuration: cap.configuration ? Object.freeze({ ...cap.configuration }) : null
    })
  }

  #sortByPriority(capabilities) {
    return [...capabilities].sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority
      }
      return a.name.localeCompare(b.name)
    })
  }

  getRegistry() {
    return this.#registry
  }

  getResolver() {
    return this.#resolver
  }
}

export function createCapabilityComposer(registry) {
  return new CapabilityComposer(registry)
}

export default {
  CapabilityComposer,
  createCapabilityComposer
}