/**
 * Module Resolver
 * 
 * Resolves which modules are enabled for an experience.
 * Modules are configuration-driven, not hardcoded.
 */

import { ModuleResolutionError } from '../experience.errors.js'

export class ModuleResolver {
  #config = null
  #moduleRegistry = null
  #capabilityMapping = null

  constructor(config = {}) {
    this.#config = { ...config }
    this.#moduleRegistry = new Map()
    this.#capabilityMapping = new Map()
  }

  get name() {
    return 'module'
  }

  async initialize(config) {
    this.#config = { ...this.#config, ...config }
    this.#initializeModuleRegistry()
    this.#initializeCapabilityMapping()
    return true
  }

  #initializeModuleRegistry() {
    this.#moduleRegistry.clear()

    const modules = [
      { id: 'reservations', name: 'Reservations', description: 'Booking and reservation management' },
      { id: 'availability', name: 'Availability', description: 'Calendar and availability management' },
      { id: 'ecommerce', name: 'E-commerce', description: 'Product catalog and transactions' },
      { id: 'quotations', name: 'Quotations', description: 'Quote generation and management' },
      { id: 'blog', name: 'Blog', description: 'Content publishing and management' },
      { id: 'tickets', name: 'Tickets', description: 'Ticket sales and management' },
      { id: 'agenda', name: 'Agenda', description: 'Event scheduling and calendars' },
      { id: 'crm', name: 'CRM', description: 'Customer relationship management' },
      { id: 'chat', name: 'Chat', description: 'Live chat and messaging' },
      { id: 'payments', name: 'Payments', description: 'Payment processing' },
      { id: 'inventory', name: 'Inventory', description: 'Stock and inventory management' },
      { id: 'notifications', name: 'Notifications', description: 'Email, SMS, push notifications' },
      { id: 'analytics', name: 'Analytics', description: 'Reporting and analytics' },
      { id: 'maps', name: 'Maps', description: 'Geographic mapping and directions' },
      { id: 'gallery', name: 'Gallery', description: 'Media gallery and albums' },
      { id: 'media', name: 'Media', description: 'Media processing and CDN' },
      { id: 'seo', name: 'SEO', description: 'Search engine optimization' },
      { id: 'pwa', name: 'PWA', description: 'Progressive web app features' },
      { id: 'owner-portal', name: 'Owner Portal', description: 'Business owner dashboard' },
      { id: 'visitor-portal', name: 'Visitor Portal', description: 'Visitor-facing interface' }
    ]

    for (const module of modules) {
      this.#moduleRegistry.set(module.id, module)
    }
  }

  #initializeCapabilityMapping() {
    this.#capabilityMapping.clear()

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

    for (const [moduleId, capabilities] of Object.entries(mapping)) {
      this.#capabilityMapping.set(moduleId, capabilities)
    }
  }

  async resolve(context) {
    if (!context || !context.destination) {
      throw new ModuleResolutionError('Invalid context', { context })
    }

    try {
      const destinationConfig = context.destination
      const companyConfig = context.company

      const enabledModules = this.#resolveEnabledModules(destinationConfig, companyConfig)

      const resolvedModules = enabledModules.map(moduleId => {
        const module = this.#moduleRegistry.get(moduleId)
        return module || { id: moduleId, name: moduleId, description: 'Custom module' }
      })

      const capabilities = this.#resolveCapabilities(enabledModules)

      return {
        ...context,
        modules: enabledModules,
        modulesConfig: this.#buildModulesConfig(enabledModules),
        capabilities,
        resolvedAt: new Date().toISOString()
      }
    } catch (error) {
      throw new ModuleResolutionError(`Failed to resolve modules: ${error.message}`, {
        error: error.message,
        context
      })
    }
  }

  #resolveEnabledModules(destinationConfig, companyConfig) {
    const defaultModules = [
      'reservations',
      'availability',
      'notifications',
      'gallery',
      'media'
    ]

    if (!destinationConfig) {
      return defaultModules
    }

    if (destinationConfig.enabledModules && Array.isArray(destinationConfig.enabledModules)) {
      return destinationConfig.enabledModules
    }

    if (destinationConfig.modules && Array.isArray(destinationConfig.modules)) {
      return destinationConfig.modules
    }

    return defaultModules
  }

  #resolveCapabilities(modules) {
    const capabilities = new Set()

    for (const moduleId of modules) {
      const moduleCapabilities = this.#capabilityMapping.get(moduleId)
      if (moduleCapabilities) {
        for (const cap of moduleCapabilities) {
          capabilities.add(cap)
        }
      }
    }

    return Array.from(capabilities)
  }

  #buildModulesConfig(modules) {
    const config = {}

    for (const moduleId of modules) {
      config[moduleId] = {
        enabled: true,
        moduleId,
        capabilities: this.#capabilityMapping.get(moduleId) || []
      }
    }

    return config
  }

  async healthCheck() {
    return {
      status: 'ok',
      name: 'ModuleResolver',
      modulesRegistered: this.#moduleRegistry.size,
      capabilityMappings: this.#capabilityMapping.size
    }
  }

  async stop() {
    this.#moduleRegistry.clear()
    this.#capabilityMapping.clear()
    return true
  }

  registerModule(module) {
    this.#moduleRegistry.set(module.id, module)
  }

  registerCapabilityMapping(moduleId, capabilities) {
    this.#capabilityMapping.set(moduleId, capabilities)
  }

  getModules() {
    return new Map(this.#moduleRegistry)
  }

  getCapabilityMapping() {
    return new Map(this.#capabilityMapping)
  }
}

export default ModuleResolver
