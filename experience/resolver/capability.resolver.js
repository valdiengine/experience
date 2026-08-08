/**
 * Capability Resolver
 * 
 * Resolves and validates capabilities for enabled modules.
 * Uses the platform's capability registry.
 */

import { CapabilityResolutionError } from '../experience.errors.js'

export class CapabilityResolver {
  #config = null
  #capabilityRegistry = null

  constructor(config = {}) {
    this.#config = { ...config }
    this.#capabilityRegistry = new Map()
  }

  get name() {
    return 'capability'
  }

  async initialize(config) {
    this.#config = { ...this.#config, ...config }
    this.#initializeCapabilityRegistry()
    return true
  }

  #initializeCapabilityRegistry() {
    this.#capabilityRegistry.clear()

    const capabilities = [
      'reservation',
      'booking',
      'availability',
      'notifications',
      'communication',
      'cms',
      'content',
      'media',
      'storage',
      'payment',
      'billing',
      'auth',
      'identity',
      'persistence',
      'intelligence',
      'seo-intelligence',
      'engagement',
      'conversion',
      'scheduler',
      'owner',
      'visitor',
      'pwa-engine',
      'pwa',
      'maps',
      'admin',
      'saas',
      'lifecycle',
      'community',
      'exploration',
      'governance',
      'operations',
      'public',
      'onboarding',
      'observation'
    ]

    for (const capability of capabilities) {
      this.#capabilityRegistry.set(capability, {
        id: capability,
        registered: true
      })
    }
  }

  async resolve(context) {
    if (!context || !context.modules) {
      throw new CapabilityResolutionError('Invalid context', { context })
    }

    try {
      const requestedCapabilities = context.capabilities || []
      const validatedCapabilities = this.#validateCapabilities(requestedCapabilities)

      const activeCapabilities = this.#resolveActiveCapabilities(validatedCapabilities, context.modules)

      return {
        ...context,
        capabilities: activeCapabilities,
        capabilityDetails: this.#buildCapabilityDetails(activeCapabilities),
        resolvedAt: new Date().toISOString()
      }
    } catch (error) {
      throw new CapabilityResolutionError(`Failed to resolve capabilities: ${error.message}`, {
        error: error.message,
        context
      })
    }
  }

  #validateCapabilities(capabilities) {
    return capabilities.filter(cap => {
      if (!this.#capabilityRegistry.has(cap)) {
        console.warn(`[CapabilityResolver] Unknown capability: ${cap}`)
        return false
      }
      return true
    })
  }

  #resolveActiveCapabilities(capabilities, modules) {
    const active = new Set()

    active.add('persistence')
    active.add('media')
    active.add('storage')

    for (const capability of capabilities) {
      active.add(capability)
    }

    for (const module of modules) {
      const moduleCapabilities = this.#getModuleCapabilities(module)
      for (const cap of moduleCapabilities) {
        active.add(cap)
      }
    }

    return Array.from(active)
  }

  #getModuleCapabilities(moduleId) {
    const mapping = {
      'reservations': ['reservation', 'booking'],
      'availability': ['availability'],
      'ecommerce': ['booking', 'payment'],
      'quotations': ['reservation'],
      'blog': ['cms', 'content'],
      'tickets': ['booking'],
      'agenda': ['scheduler'],
      'crm': ['engagement', 'conversion'],
      'chat': ['communication', 'notifications'],
      'payments': ['payment', 'billing'],
      'inventory': ['persistence'],
      'notifications': ['notifications', 'communication'],
      'analytics': ['intelligence', 'seo-intelligence'],
      'maps': ['maps'],
      'gallery': ['cms', 'media'],
      'media': ['media'],
      'seo': ['seo-intelligence'],
      'pwa': ['pwa-engine', 'pwa'],
      'owner-portal': ['owner'],
      'visitor-portal': ['visitor']
    }

    return mapping[moduleId] || []
  }

  #buildCapabilityDetails(capabilities) {
    const details = {}

    for (const capability of capabilities) {
      details[capability] = {
        id: capability,
        active: true,
        available: this.#capabilityRegistry.has(capability)
      }
    }

    return details
  }

  async healthCheck() {
    return {
      status: 'ok',
      name: 'CapabilityResolver',
      capabilitiesRegistered: this.#capabilityRegistry.size
    }
  }

  async stop() {
    this.#capabilityRegistry.clear()
    return true
  }

  registerCapability(capability) {
    this.#capabilityRegistry.set(capability, {
      id: capability,
      registered: true
    })
  }

  getCapabilities() {
    return new Map(this.#capabilityRegistry)
  }
}

export default CapabilityResolver
