/**
 * Feature Flag Manager — Dynamic feature activation per tenant
 *
 * Business-agnostic: tenant-scoped, no business logic, only access control
 */

import { FEATURE_FLAGS } from './saas.schema.js'
import { SAAS_EVENTS } from './saas.events.js'

export class FeatureFlagManager {
  #overrides = new Map()
  #entitlementManager = null
  #eventBus = null

  constructor(entitlementManager, eventBus) {
    this.#entitlementManager = entitlementManager
    this.#eventBus = eventBus
  }

  /**
   * Check if feature is enabled for tenant
   * @param {string} tenantId
   * @param {string} feature
   * @returns {boolean}
   */
  isEnabled(tenantId, feature) {
    const key = `${tenantId}:${feature}`
    if (this.#overrides.has(key)) return this.#overrides.get(key)

    return this.#entitlementManager?.hasFeature(tenantId, feature) || false
  }

  /**
   * Enable feature for tenant (override)
   * @param {string} tenantId
   * @param {string} feature
   * @returns {object}
   */
  enable(tenantId, feature) {
    const key = `${tenantId}:${feature}`
    this.#overrides.set(key, true)
    this.#eventBus?.emit(SAAS_EVENTS.FEATURE_ENABLED, { tenantId, feature })
    return { success: true, tenantId, feature, enabled: true }
  }

  /**
   * Disable feature for tenant (override)
   * @param {string} tenantId
   * @param {string} feature
   * @returns {object}
   */
  disable(tenantId, feature) {
    const key = `${tenantId}:${feature}`
    this.#overrides.set(key, false)
    this.#eventBus?.emit(SAAS_EVENTS.FEATURE_DISABLED, { tenantId, feature })
    return { success: true, tenantId, feature, enabled: false }
  }

  /**
   * Remove override (revert to plan default)
   * @param {string} tenantId
   * @param {string} feature
   */
  clearOverride(tenantId, feature) {
    this.#overrides.delete(`${tenantId}:${feature}`)
  }

  /**
   * Clear all overrides for a tenant
   * @param {string} tenantId
   */
  clearAllOverrides(tenantId) {
    for (const key of this.#overrides.keys()) {
      if (key.startsWith(`${tenantId}:`)) {
        this.#overrides.delete(key)
      }
    }
  }

  /**
   * Get all features for a tenant with their status
   * @param {string} tenantId
   * @returns {object} - { feature: boolean }
   */
  getAllFeatures(tenantId) {
    const features = {}
    for (const flag of Object.values(FEATURE_FLAGS)) {
      features[flag] = this.isEnabled(tenantId, flag)
    }
    return features
  }

  /**
   * Get enabled features for a tenant
   * @param {string} tenantId
   * @returns {string[]}
   */
  getEnabledFeatures(tenantId) {
    const all = this.getAllFeatures(tenantId)
    return Object.keys(all).filter(f => all[f])
  }

  /**
   * Get disabled features for a tenant
   * @param {string} tenantId
   * @returns {string[]}
   */
  getDisabledFeatures(tenantId) {
    const all = this.getAllFeatures(tenantId)
    return Object.keys(all).filter(f => !all[f])
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
      if (this.isEnabled(tenantId, feat)) {
        enabled.push(feat)
      } else {
        disabled.push(feat)
      }
    }

    return { enabled, disabled }
  }
}
