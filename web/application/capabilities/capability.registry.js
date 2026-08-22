/**
 * Capability Registry
 *
 * P15.8.2 - Capability Registry & Composition Architecture
 *
 * Central registry for managing available capabilities.
 * Capabilities are registered during bootstrap/configuration phase.
 * Framework-free implementation.
 */

export const CAPABILITY_TYPES = Object.freeze({
  PRESENTATION: 'presentation',
  CONTENT: 'content',
  NAVIGATION: 'navigation',
  SEO: 'seo',
  MEDIA: 'media',
  COMMERCE: 'commerce',
  BOOKING: 'booking',
  SOCIAL: 'social',
  MAP: 'map',
  EDITORIAL: 'editorial',
  ANALYTICS: 'analytics',
  PLATFORM: 'platform'
})

export const DEFAULT_CAPABILITIES = Object.freeze([
  {
    name: 'hero',
    version: '1.0.0',
    type: CAPABILITY_TYPES.PRESENTATION,
    dependencies: [],
    optionalDependencies: [],
    compatibleApplicationTypes: ['company-profile', 'tourism-destination', 'accommodation', 'restaurant', 'tour', 'real-estate', 'boat', 'professional-service'],
    configurationSchema: null,
    priority: 100
  },
  {
    name: 'services',
    version: '1.0.0',
    type: CAPABILITY_TYPES.PRESENTATION,
    dependencies: [],
    optionalDependencies: [],
    compatibleApplicationTypes: ['company-profile', 'professional-service'],
    configurationSchema: null,
    priority: 90
  },
  {
    name: 'gallery',
    version: '1.0.0',
    type: CAPABILITY_TYPES.MEDIA,
    dependencies: [],
    optionalDependencies: ['media'],
    compatibleApplicationTypes: ['company-profile', 'tourism-destination', 'accommodation', 'restaurant', 'tour', 'real-estate', 'boat'],
    configurationSchema: null,
    priority: 80
  },
  {
    name: 'contact',
    version: '1.0.0',
    type: CAPABILITY_TYPES.PRESENTATION,
    dependencies: [],
    optionalDependencies: [],
    compatibleApplicationTypes: ['company-profile', 'tourism-destination', 'accommodation', 'restaurant', 'tour', 'real-estate', 'boat', 'professional-service'],
    configurationSchema: null,
    priority: 70
  },
  {
    name: 'location',
    version: '1.0.0',
    type: CAPABILITY_TYPES.MAP,
    dependencies: [],
    optionalDependencies: [],
    compatibleApplicationTypes: ['company-profile', 'tourism-destination', 'accommodation', 'restaurant', 'tour'],
    configurationSchema: null,
    priority: 60
  },
  {
    name: 'whatsapp',
    version: '1.0.0',
    type: CAPABILITY_TYPES.SOCIAL,
    dependencies: ['contact'],
    optionalDependencies: [],
    compatibleApplicationTypes: ['company-profile', 'tourism-destination', 'accommodation', 'restaurant', 'tour'],
    configurationSchema: null,
    priority: 55
  },
  {
    name: 'seo',
    version: '1.0.0',
    type: CAPABILITY_TYPES.SEO,
    dependencies: [],
    optionalDependencies: [],
    compatibleApplicationTypes: ['company-profile', 'tourism-destination', 'accommodation', 'restaurant', 'tour', 'real-estate', 'boat', 'professional-service'],
    configurationSchema: null,
    priority: 50
  },
  {
    name: 'destinations',
    version: '1.0.0',
    type: CAPABILITY_TYPES.CONTENT,
    dependencies: [],
    optionalDependencies: ['media'],
    compatibleApplicationTypes: ['tourism-destination'],
    configurationSchema: null,
    priority: 95
  },
  {
    name: 'attractions',
    version: '1.0.0',
    type: CAPABILITY_TYPES.CONTENT,
    dependencies: [],
    optionalDependencies: ['media'],
    compatibleApplicationTypes: ['tourism-destination'],
    configurationSchema: null,
    priority: 90
  },
  {
    name: 'activities',
    version: '1.0.0',
    type: CAPABILITY_TYPES.CONTENT,
    dependencies: [],
    optionalDependencies: ['media'],
    compatibleApplicationTypes: ['tourism-destination'],
    configurationSchema: null,
    priority: 85
  },
  {
    name: 'map',
    version: '1.0.0',
    type: CAPABILITY_TYPES.MAP,
    dependencies: [],
    optionalDependencies: [],
    compatibleApplicationTypes: ['tourism-destination', 'accommodation', 'restaurant'],
    configurationSchema: null,
    priority: 75
  },
  {
    name: 'weather',
    version: '1.0.0',
    type: CAPABILITY_TYPES.CONTENT,
    dependencies: [],
    optionalDependencies: [],
    compatibleApplicationTypes: ['tourism-destination'],
    configurationSchema: null,
    priority: 65
  },
  {
    name: 'events',
    version: '1.0.0',
    type: CAPABILITY_TYPES.CONTENT,
    dependencies: [],
    optionalDependencies: ['media'],
    compatibleApplicationTypes: ['tourism-destination'],
    configurationSchema: null,
    priority: 60
  },
  {
    name: 'businesses',
    version: '1.0.0',
    type: CAPABILITY_TYPES.CONTENT,
    dependencies: [],
    optionalDependencies: [],
    compatibleApplicationTypes: ['tourism-destination'],
    configurationSchema: null,
    priority: 55
  },
  {
    name: 'rooms',
    version: '1.0.0',
    type: CAPABILITY_TYPES.PRESENTATION,
    dependencies: [],
    optionalDependencies: ['media'],
    compatibleApplicationTypes: ['accommodation'],
    configurationSchema: null,
    priority: 95
  },
  {
    name: 'booking',
    version: '1.0.0',
    type: CAPABILITY_TYPES.BOOKING,
    dependencies: ['contact'],
    optionalDependencies: [],
    compatibleApplicationTypes: ['accommodation', 'tour', 'restaurant'],
    configurationSchema: null,
    priority: 85
  },
  {
    name: 'reviews',
    version: '1.0.0',
    type: CAPABILITY_TYPES.CONTENT,
    dependencies: [],
    optionalDependencies: ['media'],
    compatibleApplicationTypes: ['accommodation', 'restaurant', 'tour'],
    configurationSchema: null,
    priority: 70
  },
  {
    name: 'menu',
    version: '1.0.0',
    type: CAPABILITY_TYPES.PRESENTATION,
    dependencies: [],
    optionalDependencies: ['media'],
    compatibleApplicationTypes: ['restaurant'],
    configurationSchema: null,
    priority: 95
  },
  {
    name: 'hours',
    version: '1.0.0',
    type: CAPABILITY_TYPES.CONTENT,
    dependencies: [],
    optionalDependencies: [],
    compatibleApplicationTypes: ['restaurant'],
    configurationSchema: null,
    priority: 80
  },
  {
    name: 'reservation',
    version: '1.0.0',
    type: CAPABILITY_TYPES.BOOKING,
    dependencies: ['contact'],
    optionalDependencies: [],
    compatibleApplicationTypes: ['restaurant'],
    configurationSchema: null,
    priority: 85
  },
  {
    name: 'itinerary',
    version: '1.0.0',
    type: CAPABILITY_TYPES.PRESENTATION,
    dependencies: [],
    optionalDependencies: ['media'],
    compatibleApplicationTypes: ['tour'],
    configurationSchema: null,
    priority: 95
  },
  {
    name: 'specs',
    version: '1.0.0',
    type: CAPABILITY_TYPES.PRESENTATION,
    dependencies: [],
    optionalDependencies: ['media'],
    compatibleApplicationTypes: ['boat', 'real-estate'],
    configurationSchema: null,
    priority: 90
  },
  {
    name: 'about',
    version: '1.0.0',
    type: CAPABILITY_TYPES.CONTENT,
    dependencies: [],
    optionalDependencies: ['media'],
    compatibleApplicationTypes: ['professional-service'],
    configurationSchema: null,
    priority: 90
  },
  {
    name: 'credentials',
    version: '1.0.0',
    type: CAPABILITY_TYPES.CONTENT,
    dependencies: [],
    optionalDependencies: [],
    compatibleApplicationTypes: ['professional-service'],
    configurationSchema: null,
    priority: 85
  },
  {
    name: 'appointment',
    version: '1.0.0',
    type: CAPABILITY_TYPES.BOOKING,
    dependencies: ['contact'],
    optionalDependencies: [],
    compatibleApplicationTypes: ['professional-service'],
    configurationSchema: null,
    priority: 80
  },
  {
    name: 'listings',
    version: '1.0.0',
    type: CAPABILITY_TYPES.PRESENTATION,
    dependencies: [],
    optionalDependencies: ['media'],
    compatibleApplicationTypes: ['real-estate'],
    configurationSchema: null,
    priority: 95
  },
  {
    name: 'quote',
    version: '1.0.0',
    type: CAPABILITY_TYPES.COMMERCE,
    dependencies: ['contact'],
    optionalDependencies: [],
    compatibleApplicationTypes: ['boat', 'company-profile', 'professional-service'],
    configurationSchema: null,
    priority: 82
  },
  {
    name: 'installableApp',
    version: '1.0.0',
    type: CAPABILITY_TYPES.PLATFORM,
    dependencies: [],
    optionalDependencies: [],
    compatibleApplicationTypes: ['company-profile', 'tourism-destination', 'accommodation', 'restaurant', 'tour', 'real-estate', 'boat', 'professional-service'],
    configurationSchema: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean', default: true },
        name: { type: 'string' },
        shortName: { type: 'string' },
        description: { type: 'string' },
        startUrl: { type: 'string' },
        display: { type: 'string', enum: ['standalone', 'fullscreen', 'minimal-ui'], default: 'standalone' },
        themeColor: { type: 'string' },
        backgroundColor: { type: 'string' },
        icons: { type: 'array' },
        scope: { type: 'string' },
        offlineFallback: { type: 'string' }
      }
    },
    priority: 95
  },
  {
    name: 'pushNotifications',
    version: '1.0.0',
    type: CAPABILITY_TYPES.PLATFORM,
    dependencies: [],
    optionalDependencies: [],
    compatibleApplicationTypes: ['company-profile', 'tourism-destination', 'accommodation', 'restaurant', 'tour', 'real-estate', 'boat', 'professional-service'],
    configurationSchema: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean', default: true },
        vapidPublicKey: { type: 'string' }
      }
    },
    priority: 94
  }
])

export class CapabilityRegistry {
  #capabilities
  #locked

  constructor() {
    this.#capabilities = new Map()
    this.#locked = false
  }

  register(capability) {
    if (this.#locked) {
      throw new Error('CapabilityRegistry is locked and cannot be modified')
    }

    if (!capability || typeof capability !== 'object') {
      throw new Error('Capability must be a non-null object')
    }

    if (!capability.name || typeof capability.name !== 'string') {
      throw new Error('Capability must have a valid name')
    }

    if (this.#capabilities.has(capability.name)) {
      throw new Error(`Capability "${capability.name}" is already registered`)
    }

    const validated = this.#validateMetadata(capability)
    this.#capabilities.set(validated.name, validated)
  }

  #validateMetadata(capability) {
    return {
      name: capability.name,
      version: capability.version || '1.0.0',
      type: capability.type || CAPABILITY_TYPES.PRESENTATION,
      dependencies: Array.isArray(capability.dependencies) ? [...capability.dependencies] : [],
      optionalDependencies: Array.isArray(capability.optionalDependencies) ? [...capability.optionalDependencies] : [],
      compatibleApplicationTypes: Array.isArray(capability.compatibleApplicationTypes)
        ? [...capability.compatibleApplicationTypes]
        : [],
      configurationSchema: capability.configurationSchema || null,
      enabled: capability.enabled !== false,
      priority: typeof capability.priority === 'number' ? capability.priority : 0
    }
  }

  get(name) {
    const capability = this.#capabilities.get(name)
    if (!capability) {
      return null
    }
    return { ...capability }
  }

  has(name) {
    return this.#capabilities.has(name)
  }

  list() {
    const result = []
    for (const [, capability] of this.#capabilities) {
      result.push({ ...capability })
    }
    return result
  }

  listByType(type) {
    const result = []
    for (const [, capability] of this.#capabilities) {
      if (capability.type === type) {
        result.push({ ...capability })
      }
    }
    return result
  }

  listByApplicationType(appType) {
    const result = []
    for (const [, capability] of this.#capabilities) {
      if (capability.compatibleApplicationTypes.includes(appType)) {
        result.push({ ...capability })
      }
    }
    return result.sort((a, b) => b.priority - a.priority)
  }

  resolve(names) {
    const result = []
    for (const name of names) {
      const capability = this.get(name)
      if (capability) {
        result.push(capability)
      }
    }
    return result
  }

  validate(name) {
    const capability = this.get(name)
    if (!capability) {
      return { valid: false, error: `Unknown capability: ${name}` }
    }
    if (!capability.enabled) {
      return { valid: false, error: `Capability ${name} is disabled` }
    }
    return { valid: true, capability }
  }

  lock() {
    this.#locked = true
  }

  isLocked() {
    return this.#locked
  }

  clear() {
    if (this.#locked) {
      throw new Error('CapabilityRegistry is locked and cannot be cleared')
    }
    this.#capabilities.clear()
  }

  get size() {
    return this.#capabilities.size
  }

  static createDefault() {
    const registry = new CapabilityRegistry()
    for (const capability of DEFAULT_CAPABILITIES) {
      registry.register({ ...capability })
    }
    registry.lock()
    return registry
  }
}

export function createCapabilityRegistry() {
  return new CapabilityRegistry()
}

export default {
  CapabilityRegistry,
  createCapabilityRegistry,
  CAPABILITY_TYPES,
  DEFAULT_CAPABILITIES
}