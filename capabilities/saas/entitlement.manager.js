/**
 * Entitlement Manager — Central access control layer
 *
 * Business-agnostic: Tenant → Subscription → Entitlement → Capability Access
 */

import { FEATURE_FLAGS } from './saas.schema.js'
import { SAAS_EVENTS } from './saas.events.js'

export class EntitlementManager {
  #planManager = null
  #eventBus = null
  #cache = new Map()

  constructor(planManager, eventBus) {
    this.#planManager = planManager
    this.#eventBus = eventBus
  }

  /**
   * Check if tenant can access a capability
   * @param {string} tenantId
   * @param {string} capabilityId
   * @returns {boolean}
   */
  canAccessCapability(tenantId, capabilityId) {
    const entitlements = this.#getEntitlements(tenantId)
    return entitlements.capabilities[capabilityId] === true
  }

  /**
   * Check if tenant has a feature
   * @param {string} tenantId
   * @param {string} feature
   * @returns {boolean}
   */
  hasFeature(tenantId, feature) {
    const entitlements = this.#getEntitlements(tenantId)
    return entitlements.features[feature] === true
  }

  /**
   * Get all available features for a tenant
   * @param {string} tenantId
   * @returns {string[]}
   */
  getAvailableFeatures(tenantId) {
    const entitlements = this.#getEntitlements(tenantId)
    return Object.keys(entitlements.features).filter(f => entitlements.features[f])
  }

  /**
   * Get all accessible capabilities for a tenant
   * @param {string} tenantId
   * @returns {string[]}
   */
  getAccessibleCapabilities(tenantId) {
    const entitlements = this.#getEntitlements(tenantId)
    return Object.keys(entitlements.capabilities).filter(c => entitlements.capabilities[c])
  }

  /**
   * Get full entitlements for a tenant
   * @param {string} tenantId
   * @returns {object}
   */
  getEntitlements(tenantId) {
    return this.#getEntitlements(tenantId)
  }

  /**
   * Invalidate cache for a tenant
   * @param {string} tenantId
   */
  invalidate(tenantId) {
    this.#cache.delete(tenantId)
  }

  /**
   * Check multiple capabilities at once
   * @param {string} tenantId
   * @param {string[]} capabilities
   * @returns {object} - { allowed: string[], denied: string[] }
   */
  checkCapabilities(tenantId, capabilities) {
    const allowed = []
    const denied = []

    for (const cap of capabilities) {
      if (this.canAccessCapability(tenantId, cap)) {
        allowed.push(cap)
      } else {
        denied.push(cap)
      }
    }

    return { allowed, denied }
  }

  /**
   * Check multiple features at once
   * @param {string} tenantId
   * @param {string[]} features
   * @returns {object} - { enabled: string[], disabled: string[] }
   */
  checkFeatures(tenantId, features) {
    const enabled = []
    const disabled = []

    for (const feat of features) {
      if (this.hasFeature(tenantId, feat)) {
        enabled.push(feat)
      } else {
        disabled.push(feat)
      }
    }

    return { enabled, disabled }
  }

  // ── Private ──

  #getEntitlements(tenantId) {
    if (this.#cache.has(tenantId)) return this.#cache.get(tenantId)

    const subscription = this.#planManager.getSubscription(tenantId)
    if (!subscription) {
      const empty = { tenantId, capabilities: {}, features: {}, limits: {} }
      this.#cache.set(tenantId, empty)
      return empty
    }

    const plan = this.#planManager.get(subscription.planId)
    if (!plan) {
      const empty = { tenantId, capabilities: {}, features: {}, limits: {} }
      this.#cache.set(tenantId, empty)
      return empty
    }

    const capabilities = {}
    const allCapabilities = [
      'cms', 'public', 'pwa', 'communication', 'seo-intelligence',
      'booking', 'availability', 'reservation', 'notifications',
      'engagement', 'conversion', 'intelligence', 'owner',
      'observability', 'scheduler', 'admin', 'saas',
    ]

    for (const cap of allCapabilities) {
      capabilities[cap] = plan.capabilities.includes(cap)
    }

    const features = {}
    for (const feat of plan.features) {
      features[feat] = true
    }
    features[FEATURE_FLAGS.BOOKING] = plan.capabilities.includes('booking')
    features[FEATURE_FLAGS.RESERVATION] = plan.capabilities.includes('reservation')
    features[FEATURE_FLAGS.NOTIFICATIONS] = plan.capabilities.includes('notifications')
    features[FEATURE_FLAGS.PWA] = plan.capabilities.includes('pwa')
    features[FEATURE_FLAGS.SEO_INTELLIGENCE] = plan.capabilities.includes('seo-intelligence')
    features[FEATURE_FLAGS.OWNER_PORTAL] = plan.capabilities.includes('owner')
    features[FEATURE_FLAGS.AUTOMATION] = plan.capabilities.includes('scheduler')
    features[FEATURE_FLAGS.ANALYTICS] = plan.capabilities.includes('observability')
    features[FEATURE_FLAGS.ENGAGEMENT] = plan.capabilities.includes('engagement')
    features[FEATURE_FLAGS.CONVERSION] = plan.capabilities.includes('conversion')
    features[FEATURE_FLAGS.INTELLIGENCE] = plan.capabilities.includes('intelligence')
    features[FEATURE_FLAGS.SCHEDULER] = plan.capabilities.includes('scheduler')
    features[FEATURE_FLAGS.OBSERVABILITY] = plan.capabilities.includes('observability')
    features[FEATURE_FLAGS.CMS] = plan.capabilities.includes('cms')
    features[FEATURE_FLAGS.PUBLIC] = plan.capabilities.includes('public')
    features[FEATURE_FLAGS.COMMUNICATION] = plan.capabilities.includes('communication')
    features[FEATURE_FLAGS.AVAILABILITY] = plan.capabilities.includes('availability')

    const entitlements = {
      tenantId,
      planId: subscription.planId,
      productId: subscription.productId,
      capabilities,
      features,
      limits: plan.limits || {},
    }

    this.#cache.set(tenantId, entitlements)
    return entitlements
  }
}
